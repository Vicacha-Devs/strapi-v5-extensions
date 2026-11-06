import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  type CertificateIssueInput,
  type CertificateRecord,
  type CertificateTemplate,
  type CertificateVerificationResult,
  type CertificatesPluginSettings,
  type ESignEnvelopeStatus,
} from "../../../shared";
import { checkRateLimit } from "../services/issuanceHelpers";

interface SettingsServiceContract {
  getSettings(): Promise<CertificatesPluginSettings>;
}

interface IssuanceServiceContract {
  listTemplates(activeOnly?: boolean): Promise<CertificateTemplate[]>;
  issueCertificate(input: CertificateIssueInput): Promise<CertificateRecord>;
  verifyCertificateBySerial(
    serialNumber: string,
    options?: { token?: string; nationalId?: string }
  ): Promise<CertificateVerificationResult | null>;
  renderCertificateDocument(
    identifier: { documentId?: string; serialNumber?: string },
    options?: { token?: string; isAdmin?: boolean }
  ): Promise<{ html: string; serialNumber: string } | null>;
}

interface DocuSignServiceContract {
  handleWebhookEvent(params: {
    rawBody: string;
    signatureHeader?: string;
    payload: Record<string, unknown>;
  }): Promise<{
    envelopeId: string;
    envelopeStatus: ESignEnvelopeStatus;
    certificate: CertificateRecord;
  }>;
}

export interface KoaContext {
  ip?: string;
  query: Record<string, string | undefined>;
  params: Record<string, string | undefined>;
  headers?: Record<string, string | undefined>;
  request: {
    body?: Record<string, unknown>;
    rawBody?: string;
  };
  body: unknown;
  status: number;
  set(header: string, value: string): void;
  badRequest(message: string): void;
  notFound(message: string): void;
  forbidden(message: string): void;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettings = () =>
    strapi.plugin(PLUGIN_ID).service<SettingsServiceContract>("settings");
  const getIssuance = () =>
    strapi.plugin(PLUGIN_ID).service<IssuanceServiceContract>("issuance");
  const getDocuSign = () =>
    strapi.plugin(PLUGIN_ID).service<DocuSignServiceContract>("docusign");

  return {
    async listPublicTemplates(ctx: KoaContext) {
      const templates = await getIssuance().listTemplates(true);
      const sanitized = templates.map((t) => ({
        documentId: t.documentId,
        name: t.name,
        slug: t.slug,
        description: t.description,
        requiresWitnesses: t.requiresWitnesses,
        minWitnesses: t.minWitnesses,
        organizationName: t.organizationName,
        titleText: t.titleText,
        customFieldsSchema: t.customFieldsSchema || [],
      }));
      ctx.body = { data: sanitized };
    },

    async getPublicKey(ctx: KoaContext) {
      const settings = await getSettings().getSettings();
      ctx.body = {
        data: {
          organizationName: settings.organizationName,
          algorithm: "Ed25519",
          publicKeyFingerprint: settings.publicKeyFingerprint,
          publicKeyPem: settings.publicKeyPem,
        },
      };
    },

    async applyCertificate(ctx: KoaContext) {
      const ipKey = `apply:${ctx.ip || "unknown"}`;
      if (!checkRateLimit(ipKey, 10, 60_000)) {
        ctx.status = 429;
        ctx.body = {
          error: { message: "Too many certificate requests. Please wait." },
        };
        return;
      }

      const settings = await getSettings().getSettings();
      if (!settings.allowPublicApplications) {
        return ctx.forbidden("Public certificate applications are disabled");
      }

      try {
        const body = (ctx.request.body ||
          {}) as unknown as CertificateIssueInput;
        const created = await getIssuance().issueCertificate({
          ...body,
          autoApprove: false,
        });
        ctx.body = {
          data: {
            serialNumber: created.serialNumber,
            status: created.status,
            templateSlug: created.templateSlug,
            templateName: created.templateName,
            recipientFullName: created.recipientFullName,
            recipientChosenName: created.recipientChosenName,
            issuedAt: created.issuedAt,
            verificationToken: created.verificationToken,
          },
        };
      } catch (err) {
        return ctx.badRequest(
          (err as Error).message || "Invalid certificate application"
        );
      }
    },

    async verifyBySerial(ctx: KoaContext) {
      const ipKey = `verify:${ctx.ip || "unknown"}`;
      if (!checkRateLimit(ipKey, 30, 60_000)) {
        ctx.status = 429;
        ctx.body = {
          error: { message: "Rate limit exceeded for verification." },
        };
        return;
      }

      const serial = ctx.params.serial;
      if (!serial) {
        return ctx.badRequest("Certificate serial number is required");
      }

      const result = await getIssuance().verifyCertificateBySerial(serial, {
        token: ctx.query.token,
        nationalId: ctx.query.nationalId,
      });

      if (!result) {
        return ctx.notFound(
          "Certificate serial number not found in official registry"
        );
      }

      ctx.set("Cache-Control", "no-store");
      ctx.body = { data: result };
    },

    async downloadPrintableHtml(ctx: KoaContext) {
      const serial = ctx.params.serial;
      const token = ctx.query.token;
      if (!serial || !token) {
        return ctx.badRequest(
          "Both serial and verification token are required"
        );
      }

      try {
        const rendered = await getIssuance().renderCertificateDocument(
          { serialNumber: serial },
          { token, isAdmin: false }
        );
        if (!rendered) {
          return ctx.notFound("Certificate not found");
        }
        ctx.set("Content-Type", "text/html; charset=utf-8");
        ctx.set(
          "Content-Security-Policy",
          "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:;"
        );
        ctx.set("X-Content-Type-Options", "nosniff");
        ctx.set("X-Frame-Options", "SAMEORIGIN");
        ctx.set("Cache-Control", "no-store");
        ctx.body = rendered.html;
      } catch (err) {
        return ctx.forbidden(
          (err as Error).message || "Invalid verification token"
        );
      }
    },

    async docusignWebhook(ctx: KoaContext) {
      const ipKey = `webhook:${ctx.ip || "unknown"}`;
      if (!checkRateLimit(ipKey, 60, 60_000)) {
        ctx.status = 429;
        ctx.body = { error: { message: "Webhook rate limit exceeded." } };
        return;
      }

      const payload = (ctx.request.body || {}) as Record<string, unknown>;
      const rawBody =
        typeof ctx.request.rawBody === "string" && ctx.request.rawBody
          ? ctx.request.rawBody
          : JSON.stringify(payload);
      const signatureHeader =
        ctx.headers?.["x-docusign-signature-1"] ||
        ctx.headers?.["X-DocuSign-Signature-1"];

      try {
        const result = await getDocuSign().handleWebhookEvent({
          rawBody,
          signatureHeader,
          payload,
        });
        ctx.body = {
          data: {
            envelopeId: result.envelopeId,
            envelopeStatus: result.envelopeStatus,
            serialNumber: result.certificate.serialNumber,
            status: result.certificate.status,
          },
        };
      } catch (err) {
        return ctx.forbidden(
          (err as Error).message || "DocuSign webhook verification failed"
        );
      }
    },
  };
};
