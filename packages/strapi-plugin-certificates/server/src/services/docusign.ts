import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  verifyDocuSignWebhookHmac,
  type CertificateRecord,
  type CertificatesPluginSettings,
  type ESignEnvelopeStatus,
} from "../../../shared";
import { normalizeCertificateRecord } from "./issuanceHelpers";
import { stripTrailingSlashes } from "./urlHelpers";

const CERTIFICATE_UID = "plugin::certificates.certificate";

export interface DocuSignSignerTab {
  anchorString: string;
  anchorUnits: "pixels";
  anchorXOffset: string;
  anchorYOffset: string;
}

export interface DocuSignSignerRecipient {
  email: string;
  name: string;
  recipientId: string;
  routingOrder: string;
  roleName?: string;
  tabs: { signHereTabs: DocuSignSignerTab[] };
}

export interface DocuSignEnvelopePayload {
  emailSubject: string;
  status: "sent" | "created";
  documents: Array<{
    documentBase64: string;
    name: string;
    fileExtension: "html";
    documentId: "1";
  }>;
  recipients: { signers: DocuSignSignerRecipient[] };
  customFields: {
    textCustomFields: Array<{ name: string; value: string; show: "false" }>;
  };
}

const PRIVATE_HOST_PREFIXES = ["127.", "10.", "192.168.", "169.254."];

function isPrivateOrLoopbackHost(host: string): boolean {
  if (!host || host === "localhost") return true;
  if (PRIVATE_HOST_PREFIXES.some((prefix) => host.startsWith(prefix))) {
    return true;
  }
  return /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);
}

export function validateDocuSignBaseUrl(rawUrl: string): string {
  const cleaned = stripTrailingSlashes(String(rawUrl || "").trim());
  if (!cleaned.startsWith("https://")) {
    throw new Error("DocuSign baseUrl must use HTTPS");
  }
  const withoutScheme = cleaned.slice("https://".length);
  const host = withoutScheme.split("/")[0].split(":")[0].toLowerCase();

  if (isPrivateOrLoopbackHost(host)) {
    throw new Error("DocuSign baseUrl cannot target private or loopback hosts");
  }

  const isOfficialDocuSign =
    host.endsWith(".docusign.net") || host.endsWith(".docusign.com");
  if (!isOfficialDocuSign) {
    throw new Error(
      "DocuSign baseUrl must belong to *.docusign.net or *.docusign.com"
    );
  }

  return cleaned;
}

export function buildDocuSignEnvelopePayload(params: {
  certificate: CertificateRecord;
  htmlDocument: string;
  emailSubjectPrefix?: string;
}): DocuSignEnvelopePayload {
  const { certificate, htmlDocument, emailSubjectPrefix } = params;
  const signers: DocuSignSignerRecipient[] = [];
  let recipientIdSeq = 1;

  // 1. Add Official Witnesses with email (routingOrder 1 by default)
  (certificate.witnesses || []).forEach((w, idx) => {
    if (!w.email) return;
    signers.push({
      email: w.email,
      name: w.fullName,
      recipientId: String(recipientIdSeq++),
      routingOrder: String(w.routingOrder ?? 1),
      roleName: w.role || `Witness ${idx + 1}`,
      tabs: {
        signHereTabs: [
          {
            anchorString: `/wit_${idx + 1}/`,
            anchorUnits: "pixels",
            anchorXOffset: "0",
            anchorYOffset: "-6",
          },
        ],
      },
    });
  });

  // 2. Add Authorized Signatories with email (routingOrder 2 by default, after witnesses)
  (certificate.signatories || []).forEach((s, idx) => {
    if (!s.email) return;
    signers.push({
      email: s.email,
      name: s.name,
      recipientId: String(recipientIdSeq++),
      routingOrder: String(s.routingOrder ?? 2),
      roleName: s.role || s.title,
      tabs: {
        signHereTabs: [
          {
            anchorString: `/sig_${idx + 1}/`,
            anchorUnits: "pixels",
            anchorXOffset: "0",
            anchorYOffset: "-6",
          },
        ],
      },
    });
  });

  if (signers.length === 0) {
    throw new Error(
      "At least one signatory or witness must have an email address to send a DocuSign envelope"
    );
  }

  const subjectPrefix =
    emailSubjectPrefix || "Official Certificate Signature Request";
  const documentBase64 = Buffer.from(htmlDocument, "utf8").toString("base64");

  return {
    emailSubject: `${subjectPrefix} — ${certificate.serialNumber} (${certificate.recipientFullName})`,
    status: "sent",
    documents: [
      {
        documentBase64,
        name: `${certificate.serialNumber}.html`,
        fileExtension: "html",
        documentId: "1",
      },
    ],
    recipients: { signers },
    customFields: {
      textCustomFields: [
        {
          name: "serialNumber",
          value: certificate.serialNumber,
          show: "false",
        },
        {
          name: "certificateDocumentId",
          value: certificate.documentId,
          show: "false",
        },
      ],
    },
  };
}

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

export type FetchLikeFn = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<Record<string, unknown>>;
}>;

function resolveDocuSignCredentials(
  settings: CertificatesPluginSettings,
  options?: { fetchImpl?: FetchLikeFn; accessToken?: string }
): {
  safeBaseUrl: string;
  accountId: string;
  accessToken: string;
  fetchFn: FetchLikeFn;
} {
  if (!settings.esign?.enabled || settings.esign.provider !== "docusign") {
    throw new Error(
      "DocuSign eSignature provider is not enabled in Certificates settings"
    );
  }
  const safeBaseUrl = validateDocuSignBaseUrl(settings.esign.baseUrl);
  const accountId = firstNonEmptyString(
    settings.esign.accountId,
    process.env.DOCUSIGN_ACCOUNT_ID
  );
  if (!accountId) {
    throw new Error("DocuSign accountId is required");
  }
  const accessToken = firstNonEmptyString(
    options?.accessToken,
    process.env.DOCUSIGN_ACCESS_TOKEN
  );
  if (!accessToken) {
    throw new Error(
      "DOCUSIGN_ACCESS_TOKEN environment variable is required to dispatch DocuSign envelopes"
    );
  }
  const fetchFn =
    options?.fetchImpl ??
    (globalThis as unknown as { fetch?: FetchLikeFn }).fetch;
  if (!fetchFn) {
    throw new Error("Fetch implementation unavailable");
  }
  return { safeBaseUrl, accountId, accessToken, fetchFn };
}

async function dispatchDocuSignEnvelopeRequest(
  fetchFn: FetchLikeFn,
  endpoint: string,
  accessToken: string,
  envelopePayload: DocuSignEnvelopePayload
): Promise<string> {
  const response = await fetchFn(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(envelopePayload),
  });
  if (!response.ok) {
    throw new Error(
      `DocuSign API returned HTTP ${response.status} when creating envelope`
    );
  }
  const responseJson = await response.json();
  const envelopeId = String(responseJson.envelopeId || "").trim();
  if (!envelopeId) {
    throw new Error("DocuSign API did not return an envelopeId");
  }
  return envelopeId;
}

function asRecord(
  val: unknown,
  fallback: Record<string, unknown>
): Record<string, unknown> {
  return val && typeof val === "object"
    ? (val as Record<string, unknown>)
    : fallback;
}

const ALLOWED_ENVELOPE_STATUSES: ESignEnvelopeStatus[] = [
  "sent",
  "delivered",
  "completed",
  "declined",
  "voided",
];

function firstNonEmptyString(...values: unknown[]): string {
  for (const val of values) {
    if (typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }
  }
  return "";
}

function parseWebhookEnvelopeInfo(payload: Record<string, unknown>): {
  envelopeId: string;
  envelopeStatus: ESignEnvelopeStatus;
} {
  const dataObj = asRecord(payload.data, payload);
  const summaryObj = asRecord(dataObj.envelopeSummary, dataObj);
  const envelopeId = firstNonEmptyString(
    dataObj.envelopeId,
    summaryObj.envelopeId,
    payload.envelopeId
  );
  if (!envelopeId) {
    throw new Error("Missing envelopeId in DocuSign webhook payload");
  }
  const rawStatus = firstNonEmptyString(
    summaryObj.status,
    payload.status,
    "sent"
  ).toLowerCase() as ESignEnvelopeStatus;
  const envelopeStatus = ALLOWED_ENVELOPE_STATUSES.includes(rawStatus)
    ? rawStatus
    : "sent";
  return { envelopeId, envelopeStatus };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsService = () =>
    strapi.plugin(PLUGIN_ID).service<SettingsServiceContract>("settings");
  const getIssuanceService = () =>
    strapi.plugin(PLUGIN_ID).service<IssuanceServiceContract>("issuance");

  const completeWebhookEnvelope = async (
    existing: CertificateRecord,
    fallbackDoc: Record<string, unknown>,
    envelopeId: string
  ) => {
    const nowIso = new Date().toISOString();
    const stampedWitnesses = existing.witnesses.map((w) => ({
      ...w,
      signedAt: w.signedAt || nowIso,
    }));
    const stampedSignatories = existing.signatories.map((s) => ({
      ...s,
      signedAt: s.signedAt || nowIso,
    }));

    await getIssuanceService().approveCertificate(existing.documentId, {
      witnesses: stampedWitnesses,
      signatories: stampedSignatories,
    });

    const updatedCompleted = await strapi.documents(CERTIFICATE_UID).update({
      documentId: existing.documentId,
      data: {
        esignProvider: "docusign",
        esignEnvelopeStatus: "completed",
        esignCompletedAt: nowIso,
      },
    });

    const finalRecord = normalizeCertificateRecord(
      updatedCompleted || fallbackDoc,
      true
    );
    strapi.eventHub?.emit("certificates.docusign.completed", {
      serialNumber: finalRecord.serialNumber,
      envelopeId,
    });

    return {
      envelopeId,
      envelopeStatus: "completed" as const,
      certificate: finalRecord,
    };
  };

  return {
    async sendEnvelopeForCertificate(
      documentId: string,
      options?: {
        fetchImpl?: FetchLikeFn;
        accessToken?: string;
      }
    ): Promise<{
      envelopeId: string;
      envelopeStatus: ESignEnvelopeStatus;
      certificate: CertificateRecord;
    }> {
      const settings = await getSettingsService().getSettings();
      const { safeBaseUrl, accountId, accessToken, fetchFn } =
        resolveDocuSignCredentials(settings, options);

      const rawDoc = await strapi
        .documents(CERTIFICATE_UID)
        .findOne({ documentId });
      if (!rawDoc) {
        throw new Error("Certificate record not found");
      }
      const cert = normalizeCertificateRecord(rawDoc, true);

      const rendered = await getIssuanceService().renderCertificateDocument(
        { documentId },
        { isAdmin: true }
      );
      if (!rendered) {
        throw new Error(
          "Failed to render certificate HTML for DocuSign envelope"
        );
      }

      const envelopePayload = buildDocuSignEnvelopePayload({
        certificate: cert,
        htmlDocument: rendered.html,
        emailSubjectPrefix: settings.esign.emailSubjectPrefix,
      });

      const endpoint = `${safeBaseUrl}/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes`;
      const envelopeId = await dispatchDocuSignEnvelopeRequest(
        fetchFn,
        endpoint,
        accessToken,
        envelopePayload
      );

      const updated = await strapi.documents(CERTIFICATE_UID).update({
        documentId,
        data: {
          esignProvider: "docusign",
          esignEnvelopeId: envelopeId,
          esignEnvelopeStatus: "sent",
        },
      });

      const updatedRecord = normalizeCertificateRecord(updated || rawDoc, true);
      strapi.eventHub?.emit("certificates.docusign.sent", {
        serialNumber: updatedRecord.serialNumber,
        envelopeId,
      });

      return {
        envelopeId,
        envelopeStatus: "sent",
        certificate: updatedRecord,
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
        process.env.DOCUSIGN_WEBHOOK_SECRET
      );
      if (!secret) {
        throw new Error("DOCUSIGN_WEBHOOK_SECRET is not configured");
      }

      if (
        !verifyDocuSignWebhookHmac(
          params.rawBody,
          params.signatureHeader,
          secret
        )
      ) {
        throw new Error("Invalid DocuSign webhook HMAC-SHA256 signature");
      }

      const { envelopeId, envelopeStatus } = parseWebhookEnvelopeInfo(
        params.payload
      );

      const matches = await strapi.documents(CERTIFICATE_UID).findMany({
        filters: { esignEnvelopeId: envelopeId },
        limit: 1,
      });
      if (matches.length === 0) {
        throw new Error(
          `No certificate found for DocuSign envelopeId ${envelopeId}`
        );
      }

      const existing = normalizeCertificateRecord(matches[0], true);
      if (envelopeStatus === "completed") {
        return completeWebhookEnvelope(existing, matches[0], envelopeId);
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
