import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  type CertificateIssueInput,
  type CertificateRecord,
  type CertificateStats,
  type CertificateTemplate,
  type CertificatesPluginSettings,
  type ESignEnvelopeStatus,
} from "../../../shared";

interface SettingsServiceContract {
  getSettings(): Promise<CertificatesPluginSettings>;
  updateSettings(partial: Partial<CertificatesPluginSettings>): Promise<CertificatesPluginSettings>;
  rotateKeyPair(): Promise<{
    publicKeyPem: string;
    publicKeyFingerprint: string;
  }>;
}

interface IssuanceServiceContract {
  listTemplates(activeOnly?: boolean): Promise<CertificateTemplate[]>;
  createTemplate(data: Partial<CertificateTemplate>): Promise<CertificateTemplate>;
  seedDefaultTemplates(): Promise<number>;
  listCertificates(filters?: {
    status?: string;
    templateSlug?: string;
    search?: string;
  }): Promise<{ records: CertificateRecord[]; stats: CertificateStats }>;
  issueCertificate(input: CertificateIssueInput): Promise<CertificateRecord>;
  approveCertificate(
    documentId: string,
    options?: Record<string, unknown>
  ): Promise<CertificateRecord>;
  revokeCertificate(documentId: string, reason: string): Promise<CertificateRecord>;
  renderCertificateDocument(
    identifier: { documentId?: string; serialNumber?: string },
    options?: { token?: string; isAdmin?: boolean }
  ): Promise<{ html: string; serialNumber: string } | null>;
  exportCsv(filters?: { status?: string; templateSlug?: string }): Promise<string>;
}

interface DocuSignServiceContract {
  sendEnvelopeForCertificate(documentId: string): Promise<{
    envelopeId: string;
    envelopeStatus: ESignEnvelopeStatus;
    certificate: CertificateRecord;
  }>;
}

interface KoaContext {
  query: Record<string, string | undefined>;
  params: Record<string, string | undefined>;
  request: {
    body?: Record<string, unknown>;
  };
  body: unknown;
  status: number;
  set(header: string, value: string): void;
  badRequest(message: string): void;
  notFound(message: string): void;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettings = () => strapi.plugin(PLUGIN_ID).service<SettingsServiceContract>("settings");
  const getIssuance = () => strapi.plugin(PLUGIN_ID).service<IssuanceServiceContract>("issuance");
  const getDocuSign = () => strapi.plugin(PLUGIN_ID).service<DocuSignServiceContract>("docusign");

  return {
    async getSettings(ctx: KoaContext) {
      const data = await getSettings().getSettings();
      ctx.body = { data };
    },

    async updateSettings(ctx: KoaContext) {
      const payload = (ctx.request.body || {}) as Partial<CertificatesPluginSettings>;
      const data = await getSettings().updateSettings(payload);
      ctx.body = { data };
    },

    async rotateKeys(ctx: KoaContext) {
      const data = await getSettings().rotateKeyPair();
      ctx.body = { data };
    },

    async listTemplates(ctx: KoaContext) {
      const data = await getIssuance().listTemplates(false);
      ctx.body = { data };
    },

    async createTemplate(ctx: KoaContext) {
      try {
        const payload = (ctx.request.body || {}) as Partial<CertificateTemplate>;
        const data = await getIssuance().createTemplate(payload);
        ctx.body = { data };
      } catch (err) {
        return ctx.badRequest((err as Error).message || "Failed to create template");
      }
    },

    async seedTemplates(ctx: KoaContext) {
      const seededCount = await getIssuance().seedDefaultTemplates();
      const templates = await getIssuance().listTemplates(false);
      ctx.body = { data: { seededCount, templates } };
    },

    async listCertificates(ctx: KoaContext) {
      const { status, templateSlug, search } = ctx.query;
      const result = await getIssuance().listCertificates({
        status,
        templateSlug,
        search,
      });
      ctx.body = { data: result.records, meta: { stats: result.stats } };
    },

    async issueCertificate(ctx: KoaContext) {
      try {
        const body = (ctx.request.body || {}) as unknown as CertificateIssueInput;
        const autoApprove = body.sendViaESign === true ? false : body.autoApprove !== false;
        let data = await getIssuance().issueCertificate({
          ...body,
          autoApprove,
        });
        if (body.sendViaESign === true) {
          const sent = await getDocuSign().sendEnvelopeForCertificate(data.documentId);
          data = sent.certificate;
        }
        ctx.body = { data };
      } catch (err) {
        return ctx.badRequest((err as Error).message || "Failed to issue certificate");
      }
    },

    async sendDocuSignEnvelope(ctx: KoaContext) {
      const documentId = ctx.params.documentId;
      if (!documentId) {
        return ctx.badRequest("documentId is required");
      }
      try {
        const result = await getDocuSign().sendEnvelopeForCertificate(documentId);
        ctx.body = { data: result };
      } catch (err) {
        return ctx.badRequest((err as Error).message || "Failed to dispatch DocuSign envelope");
      }
    },

    async approveCertificate(ctx: KoaContext) {
      const documentId = ctx.params.documentId;
      if (!documentId) {
        return ctx.badRequest("documentId is required");
      }
      try {
        const body = (ctx.request.body || {}) as Record<string, unknown>;
        const data = await getIssuance().approveCertificate(documentId, body);
        ctx.body = { data };
      } catch (err) {
        return ctx.badRequest((err as Error).message || "Failed to approve certificate");
      }
    },

    async revokeCertificate(ctx: KoaContext) {
      const documentId = ctx.params.documentId;
      if (!documentId) {
        return ctx.badRequest("documentId is required");
      }
      try {
        const reason = String((ctx.request.body || {}).reason || "Revoked by administrator");
        const data = await getIssuance().revokeCertificate(documentId, reason);
        ctx.body = { data };
      } catch (err) {
        return ctx.badRequest((err as Error).message || "Failed to revoke certificate");
      }
    },

    async printCertificate(ctx: KoaContext) {
      const documentId = ctx.params.documentId;
      if (!documentId) {
        return ctx.badRequest("documentId is required");
      }
      const rendered = await getIssuance().renderCertificateDocument(
        { documentId },
        { isAdmin: true }
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
    },

    async exportCsv(ctx: KoaContext) {
      const { status, templateSlug } = ctx.query;
      const csv = await getIssuance().exportCsv({ status, templateSlug });
      ctx.set("Content-Type", "text/csv; charset=utf-8");
      ctx.set("Content-Disposition", 'attachment; filename="certificates-registry.csv"');
      ctx.set("X-Content-Type-Options", "nosniff");
      ctx.set("Cache-Control", "no-store");
      ctx.body = csv;
    },
  };
};
