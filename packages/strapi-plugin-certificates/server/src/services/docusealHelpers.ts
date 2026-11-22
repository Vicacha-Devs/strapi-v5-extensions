import { stripTrailingSlashes } from "@vicacha-devs/plugin-shared";

import type {
  CertificateRecord,
  DocuSealSignerLink,
  ESignEnvelopeStatus,
} from "../../../shared";

export interface DocuSealSubmitterPayload {
  role: string;
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

export interface DocuSealHtmlSubmissionPayload {
  name: string;
  send_email: boolean;
  order: "preserved" | "random";
  documents: Array<{
    name: string;
    html: string;
  }>;
  submitters: DocuSealSubmitterPayload[];
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
  /^\[?fc00:/i,
  /^\[?fd00:/i,
];

function isPrivateOrLoopbackHost(host: string): boolean {
  if (!host) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

export function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function sanitizeHeaderLine(value: unknown, maxLen = 180): string {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function firstNonEmptyString(...values: unknown[]): string {
  for (const val of values) {
    if (typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }
  }
  return "";
}

export function asRecord(
  val: unknown,
  fallback: Record<string, unknown> = {}
): Record<string, unknown> {
  return val && typeof val === "object"
    ? (val as Record<string, unknown>)
    : fallback;
}

/**
 * Validates a DocuSeal API base URL against SSRF (CWE-918).
 * Enforces HTTPS without embedded credentials/query/hash and blocks loopback/RFC1918 hosts
 * unless `allowLocalhost` is explicitly enabled for local development.
 */
export function validateDocuSealBaseUrl(
  rawUrl: string,
  options?: { allowLocalhost?: boolean }
): string {
  const cleaned = stripTrailingSlashes(String(rawUrl || "").trim());
  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new Error("DocuSeal baseUrl must be a valid HTTPS URL");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(
      "DocuSeal baseUrl must not contain credentials, query strings, or hashes"
    );
  }
  const host = parsed.hostname.toLowerCase();
  const isLoopback =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1";
  const allowLocal = Boolean(options?.allowLocalhost);

  if (parsed.protocol !== "https:") {
    if (!(allowLocal && parsed.protocol === "http:" && isLoopback)) {
      throw new Error("DocuSeal baseUrl must use HTTPS");
    }
  }
  if (isPrivateOrLoopbackHost(host)) {
    if (!(allowLocal && isLoopback)) {
      throw new Error(
        "DocuSeal baseUrl cannot target private or loopback hosts"
      );
    }
  }
  return cleaned;
}

/**
 * Validates a DocuSeal signer `embed_src` URL before embedding it in branded invite emails.
 * Blocks `javascript:`, `data:`, embedded credentials, and untrusted origins.
 */
export function validateDocuSealSigningUrl(
  rawUrl: string,
  allowedBaseUrl: string,
  options?: { allowLocalhost?: boolean }
): string {
  const cleaned = String(rawUrl || "").trim();
  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new Error("DocuSeal returned an invalid signing link URL");
  }
  if (parsed.username || parsed.password) {
    throw new Error(
      "DocuSeal signing URL must not contain embedded credentials"
    );
  }
  const allowedOrigin = new URL(allowedBaseUrl).origin;
  const host = parsed.hostname.toLowerCase();
  const isLoopback =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1";
  const allowLocal = Boolean(options?.allowLocalhost);

  if (parsed.protocol !== "https:") {
    if (
      !(
        allowLocal &&
        parsed.protocol === "http:" &&
        isLoopback &&
        parsed.origin === allowedOrigin
      )
    ) {
      throw new Error("DocuSeal signing URL must use HTTPS");
    }
  }
  if (
    parsed.origin !== allowedOrigin &&
    !host.endsWith(".docuseal.com") &&
    host !== "docuseal.com" &&
    host !== "docuseal.eu"
  ) {
    throw new Error(
      "DocuSeal signing URL origin does not match configured DocuSeal host"
    );
  }
  return parsed.toString();
}

/**
 * Replaces `/wit_N/` and `/sig_N/` anchor tags in rendered certificate HTML with
 * DocuSeal `<signature-field>` HTML tags for multi-party witness + signatory signing.
 */
export function buildDocuSealHtmlSubmissionPayload(params: {
  certificate: CertificateRecord;
  htmlDocument: string;
  emailSubjectPrefix?: string;
  sendEmail?: boolean;
}): DocuSealHtmlSubmissionPayload {
  const { certificate, emailSubjectPrefix } = params;
  let html = params.htmlDocument;
  const submitters: DocuSealSubmitterPayload[] = [];
  const meta = {
    serialNumber: certificate.serialNumber,
    certificateDocumentId: certificate.documentId,
  };

  (certificate.witnesses || []).forEach((w, idx) => {
    if (!w.email) return;
    const role = w.role || `Witness ${idx + 1}`;
    const safeRole = escapeHtml(role);
    const fieldTag = `<signature-field name="Witness ${idx + 1} Signature" role="${safeRole}" required="true" style="width: 180px; height: 48px; display: inline-block;"></signature-field>`;
    const anchor = `/wit_${idx + 1}/`;
    html = html.includes(anchor) ? html.replace(anchor, fieldTag) : html;
    submitters.push({
      role,
      email: w.email,
      name: w.fullName,
      metadata: meta,
    });
  });

  (certificate.signatories || []).forEach((s, idx) => {
    if (!s.email) return;
    const role = s.role || s.title || `Signatory ${idx + 1}`;
    const safeRole = escapeHtml(role);
    const fieldTag = `<signature-field name="Signatory ${idx + 1} Signature" role="${safeRole}" required="true" style="width: 180px; height: 48px; display: inline-block;"></signature-field>`;
    const anchor = `/sig_${idx + 1}/`;
    html = html.includes(anchor) ? html.replace(anchor, fieldTag) : html;
    submitters.push({
      role,
      email: s.email,
      name: s.name,
      metadata: meta,
    });
  });

  if (submitters.length === 0) {
    throw new Error(
      "At least one signatory or witness must have an email address to send a DocuSeal submission"
    );
  }

  const prefix = emailSubjectPrefix || "Official Certificate Signature Request";
  return {
    name: `${prefix} — ${certificate.serialNumber} (${certificate.recipientFullName})`,
    send_email: params.sendEmail !== false,
    order: "preserved",
    documents: [
      {
        name: `${certificate.serialNumber}.html`,
        html,
      },
    ],
    submitters,
  };
}

export function extractDocuSealSubmissionResult(
  responseJson: unknown,
  safeBaseUrl: string,
  options?: { allowLocalhost?: boolean }
): { envelopeId: string; signers: DocuSealSignerLink[] } {
  let envelopeId = "";
  let rawSubmitters: Array<Record<string, unknown>> = [];

  if (Array.isArray(responseJson) && responseJson.length > 0) {
    rawSubmitters = responseJson.map((item) => asRecord(item));
    const first = rawSubmitters[0];
    const id = first.submission_id ?? first.id;
    if (id !== undefined && id !== null && String(id).trim()) {
      envelopeId = String(id).trim();
    }
  } else {
    const obj = asRecord(responseJson);
    const id = obj.id ?? obj.submission_id;
    if (id !== undefined && id !== null && String(id).trim()) {
      envelopeId = String(id).trim();
    }
    if (Array.isArray(obj.submitters)) {
      rawSubmitters = obj.submitters.map((item) => asRecord(item));
    } else if (
      typeof obj.embed_src === "string" ||
      typeof obj.email === "string"
    ) {
      rawSubmitters = [obj];
    }
  }

  if (!envelopeId) {
    throw new Error("DocuSeal API did not return a submission id");
  }

  const signers: DocuSealSignerLink[] = [];
  for (const item of rawSubmitters) {
    const email = sanitizeHeaderLine(item.email, 180);
    const rawEmbed = firstNonEmptyString(item.embed_src, item.url);
    if (!email || !rawEmbed) continue;
    const embedSrc = validateDocuSealSigningUrl(rawEmbed, safeBaseUrl, options);
    signers.push({
      role: firstNonEmptyString(item.role, "Signer"),
      email,
      name: firstNonEmptyString(item.name, email),
      embedSrc,
      submitterId:
        item.id !== undefined && item.id !== null ? String(item.id) : undefined,
    });
  }

  return { envelopeId, signers };
}

export function mapDocuSealEventToStatus(
  eventType: string,
  dataStatus: string
): ESignEnvelopeStatus {
  const normalizedEvent = eventType.toLowerCase();
  const normalizedData = dataStatus.toLowerCase();
  if (
    normalizedEvent === "submission.completed" ||
    normalizedEvent === "form.completed" ||
    normalizedData === "completed"
  ) {
    return "completed";
  }
  if (normalizedEvent === "form.declined" || normalizedData === "declined") {
    return "declined";
  }
  if (
    normalizedEvent === "submission.expired" ||
    normalizedEvent === "submission.archived" ||
    normalizedData === "expired" ||
    normalizedData === "archived"
  ) {
    return "voided";
  }
  if (normalizedEvent === "form.viewed" || normalizedData === "opened") {
    return "delivered";
  }
  return "sent";
}

export function parseDocuSealWebhookInfo(payload: Record<string, unknown>): {
  envelopeId: string;
  envelopeStatus: ESignEnvelopeStatus;
} {
  const dataObj = asRecord(payload.data, payload);
  const submissionObj = asRecord(dataObj.submission);
  const rawId =
    dataObj.submission_id ??
    submissionObj.id ??
    dataObj.id ??
    payload.submission_id ??
    payload.id;
  const envelopeId =
    rawId !== undefined && rawId !== null ? String(rawId).trim() : "";
  if (!envelopeId) {
    throw new Error("Missing submission id in DocuSeal webhook payload");
  }
  const eventType = firstNonEmptyString(payload.event_type, payload.event);
  const dataStatus = firstNonEmptyString(dataObj.status, submissionObj.status);
  return {
    envelopeId,
    envelopeStatus: mapDocuSealEventToStatus(eventType, dataStatus),
  };
}
