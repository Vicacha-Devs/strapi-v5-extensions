import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  verifyDocuSealWebhookHmac,
  type CertificateRecord,
  type CertificatesPluginSettings,
  type DocuSealSignerLink,
  type ESignEmailDeliveryMode,
  type ESignEnvelopeStatus,
} from "../../../shared";
import {
  buildBrandedSigningInviteEmail,
  dispatchBrandedSigningInvites,
} from "./docusealEmail";
import {
  buildDocuSealHtmlSubmissionPayload,
  extractDocuSealSubmissionResult,
  firstNonEmptyString,
  parseDocuSealWebhookInfo,
  validateDocuSealBaseUrl,
  validateDocuSealSigningUrl,
  type DocuSealHtmlSubmissionPayload,
  type DocuSealSubmitterPayload,
} from "./docusealHelpers";
import type { FetchLikeFn } from "./docusign";
import { normalizeCertificateRecord } from "./issuanceHelpers";

export {
  buildBrandedSigningInviteEmail,
  buildDocuSealHtmlSubmissionPayload,
  extractDocuSealSubmissionResult,
  validateDocuSealBaseUrl,
  validateDocuSealSigningUrl,
  type DocuSealHtmlSubmissionPayload,
  type DocuSealSubmitterPayload,
};

const CERTIFICATE_UID = "plugin::certificates.certificate";

interface SettingsServiceContract {
  getSettings(): Promise<CertificatesPluginSettings>;
}

interface IssuanceServiceContract {
  renderCertificateDocument(
    identifier: { documentId?: string; serialNumber?: string },
    options?: { isAdmin?: boolean }
  ): Promise<{ html: string; serialNumber: string } | null>;
  approveCertificate(
    documentId: string,
    options?: Record<string, unknown>
  ): Promise<CertificateRecord>;
}

function resolveDocuSealCredentials(
  settings: CertificatesPluginSettings,
  options?: {
    fetchImpl?: FetchLikeFn;
    apiKey?: string;
    allowLocalhost?: boolean;
  }
) {
  if (!settings.esign?.enabled || settings.esign.provider !== "docuseal") {
    throw new Error(
      "DocuSeal eSignature provider is not enabled in Certificates settings"
    );
  }
  const allowLocalhost =
    options?.allowLocalhost ?? process.env.DOCUSEAL_ALLOW_LOCALHOST === "true";
  const safeBaseUrl = validateDocuSealBaseUrl(
    firstNonEmptyString(settings.esign.baseUrl, process.env.DOCUSEAL_BASE_URL),
    { allowLocalhost }
  );
  const apiKey = firstNonEmptyString(
    options?.apiKey,
    process.env.DOCUSEAL_API_KEY
  );
  if (!apiKey) {
    throw new Error(
      "DOCUSEAL_API_KEY environment variable is required to dispatch DocuSeal submissions"
    );
  }
  const fetchFn =
    options?.fetchImpl ??
    (globalThis as unknown as { fetch?: FetchLikeFn }).fetch;
  if (!fetchFn) {
    throw new Error("Fetch implementation unavailable");
  }
  return { safeBaseUrl, apiKey, fetchFn, allowLocalhost };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsService = () =>
    strapi.plugin(PLUGIN_ID).service<SettingsServiceContract>("settings");
  const getIssuanceService = () =>
    strapi.plugin(PLUGIN_ID).service<IssuanceServiceContract>("issuance");

  const completeWebhookSubmission = async (
    existing: CertificateRecord,
    fallbackDoc: Record<string, unknown>,
    envelopeId: string
  ) => {
    const nowIso = new Date().toISOString();
    const stampedSignatories = (existing.signatories || []).map((s) => ({
      ...s,
      signedAt: s.signedAt || nowIso,
    }));
    await getIssuanceService().approveCertificate(existing.documentId, {
      signatories: stampedSignatories,
    });
    const updatedCompleted = await strapi.documents(CERTIFICATE_UID).update({
      documentId: existing.documentId,
      data: {
        esignProvider: "docuseal",
        esignEnvelopeStatus: "completed",
        esignCompletedAt: nowIso,
      },
    });
    const finalRecord = normalizeCertificateRecord(
      updatedCompleted || fallbackDoc,
      true
    );
    strapi.eventHub?.emit("certificates.docuseal.completed", {
      serialNumber: finalRecord.serialNumber,
      envelopeId,
      completedAt: nowIso,
    });
    return {
      envelopeId,
      envelopeStatus: "completed" as ESignEnvelopeStatus,
      certificate: finalRecord,
    };
  };

  return {
    async sendSubmissionForCertificate(
      documentId: string,
      options?: {
        fetchImpl?: FetchLikeFn;
        apiKey?: string;
        allowLocalhost?: boolean;
        emailDeliveryMode?: ESignEmailDeliveryMode;
        skipEmailDispatch?: boolean;
      }
    ): Promise<{
      envelopeId: string;
      envelopeStatus: ESignEnvelopeStatus;
      certificate: CertificateRecord;
      signers: DocuSealSignerLink[];
      emailDeliveryMode: ESignEmailDeliveryMode;
      invitesSent: number;
    }> {
      const settings = await getSettingsService().getSettings();
      const { safeBaseUrl, apiKey, fetchFn, allowLocalhost } =
        resolveDocuSealCredentials(settings, options);
      const rawDoc = await strapi
        .documents(CERTIFICATE_UID)
        .findOne({ documentId });
      if (!rawDoc) throw new Error("Certificate record not found");
      const cert = normalizeCertificateRecord(rawDoc, true);
      const rendered = await getIssuanceService().renderCertificateDocument(
        { documentId },
        { isAdmin: true }
      );
      if (!rendered) {
        throw new Error(
          "Failed to render certificate HTML for DocuSeal submission"
        );
      }

      const emailDeliveryMode: ESignEmailDeliveryMode =
        options?.emailDeliveryMode ??
        settings.esign.emailDeliveryMode ??
        "strapi";
      const useBrandedStrapiEmail = emailDeliveryMode === "strapi";

      const submissionPayload = buildDocuSealHtmlSubmissionPayload({
        certificate: cert,
        htmlDocument: rendered.html,
        emailSubjectPrefix: settings.esign.emailSubjectPrefix,
        sendEmail: !useBrandedStrapiEmail,
      });
      const baseApi = safeBaseUrl.endsWith("/api")
        ? safeBaseUrl
        : `${safeBaseUrl}/api`;
      const endpoint = `${baseApi}/submissions/html`;
      const response = await fetchFn(endpoint, {
        method: "POST",
        headers: {
          "X-Auth-Token": apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(submissionPayload),
      });
      if (!response.ok) {
        throw new Error(
          `DocuSeal API returned HTTP ${response.status} when creating submission`
        );
      }
      const { envelopeId, signers } = extractDocuSealSubmissionResult(
        await response.json(),
        safeBaseUrl,
        { allowLocalhost }
      );

      let invitesSent = 0;
      if (
        useBrandedStrapiEmail &&
        !options?.skipEmailDispatch &&
        signers.length > 0
      ) {
        const dispatchResult = await dispatchBrandedSigningInvites(strapi, {
          settings,
          certificate: cert,
          signers,
        });
        invitesSent = dispatchResult.invitesSent;
      }

      const updated = await strapi.documents(CERTIFICATE_UID).update({
        documentId,
        data: {
          esignProvider: "docuseal",
          esignEnvelopeId: envelopeId,
          esignEnvelopeStatus: "sent",
        },
      });
      const updatedRecord = normalizeCertificateRecord(updated || rawDoc, true);
      strapi.eventHub?.emit("certificates.docuseal.sent", {
        serialNumber: updatedRecord.serialNumber,
        envelopeId,
        emailDeliveryMode,
        invitesSent,
        signers,
      });
      return {
        envelopeId,
        envelopeStatus: "sent",
        certificate: updatedRecord,
        signers,
        emailDeliveryMode,
        invitesSent,
      };
    },

    async handleWebhookEvent(params: {
      rawBody: string;
      signatureHeader?: string;
      payload: Record<string, unknown>;
      webhookSecret?: string;
    }): Promise<{
      envelopeId: string;
      envelopeStatus: ESignEnvelopeStatus;
      certificate: CertificateRecord;
    }> {
      const secret = firstNonEmptyString(
        params.webhookSecret,
        process.env.DOCUSEAL_WEBHOOK_SECRET
      );
      if (!secret) throw new Error("DOCUSEAL_WEBHOOK_SECRET is not configured");
      if (
        !verifyDocuSealWebhookHmac(
          params.rawBody,
          params.signatureHeader,
          secret
        )
      ) {
        throw new Error("Invalid DocuSeal webhook HMAC-SHA256 signature");
      }
      const { envelopeId, envelopeStatus } = parseDocuSealWebhookInfo(
        params.payload
      );
      const matches = await strapi.documents(CERTIFICATE_UID).findMany({
        filters: { esignEnvelopeId: envelopeId },
        limit: 1,
      });
      if (matches.length === 0) {
        throw new Error(
          `No certificate found for DocuSeal submission ${envelopeId}`
        );
      }
      const existing = normalizeCertificateRecord(matches[0], true);
      if (envelopeStatus === "completed") {
        return completeWebhookSubmission(existing, matches[0], envelopeId);
      }
      const updated = await strapi.documents(CERTIFICATE_UID).update({
        documentId: existing.documentId,
        data: { esignEnvelopeStatus: envelopeStatus },
      });
      return {
        envelopeId,
        envelopeStatus,
        certificate: normalizeCertificateRecord(updated || matches[0], true),
      };
    },
  };
};
