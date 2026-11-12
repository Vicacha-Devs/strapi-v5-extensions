import { createHmac, randomBytes } from "node:crypto";

const SECRET_MASK_ONLY_RE = /^[•*]+$/;

const IDEMPOTENCY_NAMESPACE = [
  "vicacha",
  "broadcasts",
  "idempotency",
  "v1",
].join("-");

export function computeIdempotencyKey(
  campaignSlug: string,
  channel: string,
  recipient: string,
  options: { isTest?: boolean } = {}
): string {
  const normalizedRecipient = String(recipient || "")
    .trim()
    .toLowerCase();
  const digest = createHmac("sha256", IDEMPOTENCY_NAMESPACE)
    .update(`${campaignSlug}:${channel}:${normalizedRecipient}`, "utf8")
    .digest("hex")
    .slice(0, 24);
  const baseKey = `${campaignSlug}:${channel}:${digest}`;
  return options.isTest ? `test:${baseKey}` : baseKey;
}

export function generateUniqueSlugSuffix(): string {
  return `${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

export function redactSecretsFromMessage(
  rawMessage: string,
  secrets: Array<string | undefined> = []
): string {
  let sanitized = String(rawMessage || "");
  if (!sanitized) return "";

  for (const candidate of secrets) {
    const trimmed = typeof candidate === "string" ? candidate.trim() : "";
    if (trimmed.length < 4 || SECRET_MASK_ONLY_RE.test(trimmed)) continue;
    sanitized = sanitized.split(trimmed).join("[REDACTED]");
    const encoded = encodeURIComponent(trimmed);
    if (encoded !== trimmed && encoded.length >= 4) {
      sanitized = sanitized.split(encoded).join("[REDACTED]");
    }
  }

  sanitized = sanitized.replace(/bot\d+:[A-Za-z0-9_-]+/g, "bot[REDACTED]");
  sanitized = sanitized.replace(/\b\d{6,}:[A-Za-z0-9_-]{16,}\b/g, "[REDACTED]");
  sanitized = sanitized.replace(
    /Bearer\s+[A-Z0-9._~+/=-]+/gi,
    "Bearer [REDACTED]"
  );
  sanitized = sanitized.replace(
    /((?:api[_-]?key|access[_-]?token|token)=)[^&\s"']+/gi,
    "$1[REDACTED]"
  );

  return sanitized;
}
