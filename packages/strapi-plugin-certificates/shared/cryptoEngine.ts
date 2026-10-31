import {
  createHash,
  createHmac,
  generateKeyPairSync,
  randomBytes,
  sign,
  timingSafeEqual,
  verify,
} from "node:crypto";

import type { CanonicalCertificatePayload } from "./types";

export interface Ed25519KeyPairMaterial {
  publicKeyPem: string;
  privateKeyPem: string;
  fingerprint: string;
}

export function computePublicKeyFingerprint(publicKeyPem: string): string {
  const normalized = String(publicKeyPem || "").trim();
  if (!normalized) return "";
  const digest = createHash("sha256").update(normalized, "utf8").digest("hex");
  return `SHA256:${digest.slice(0, 32).toUpperCase()}`;
}

export function generateEd25519KeyPair(): Ed25519KeyPairMaterial {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    fingerprint: computePublicKeyFingerprint(publicKey),
  };
}

export function sanitizeSerialPrefix(prefix?: string): string {
  const cleaned = String(prefix || "CERT")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  return cleaned || "CERT";
}

export function generateSerialNumber(prefix = "CERT", year?: number): string {
  const safePrefix = sanitizeSerialPrefix(prefix);
  const targetYear =
    typeof year === "number" && Number.isFinite(year) ? year : new Date().getUTCFullYear();
  const entropy = randomBytes(4).toString("hex").toUpperCase();
  return `${safePrefix}-${targetYear}-${entropy}`;
}

export function generateVerificationToken(): string {
  return randomBytes(24).toString("hex");
}

export function normalizeNationalId(rawId?: string): string {
  return String(rawId || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function maskNationalId(rawId?: string): string {
  const normalized = normalizeNationalId(rawId);
  if (!normalized) return "";
  if (normalized.length <= 4) {
    return `***-${normalized}`;
  }
  const tail = normalized.slice(-4);
  return `***-***-${tail}`;
}

export function hashNationalId(rawId: string, serialNumber: string): string {
  const normalized = normalizeNationalId(rawId);
  if (!normalized) return "";
  const cleanSerial = String(serialNumber || "")
    .trim()
    .toUpperCase();
  return createHash("sha256").update(`${cleanSerial}:${normalized}`, "utf8").digest("hex");
}

export function verifyNationalIdHash(
  rawId: string,
  serialNumber: string,
  expectedHash?: string
): boolean {
  if (!expectedHash || !rawId) return false;
  const computed = hashNationalId(rawId, serialNumber);
  if (!computed) return false;
  return verifyTokenConstantTime(computed, expectedHash);
}

export function maskRecipientName(fullName: string): string {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "***";
  if (parts.length === 1) {
    const word = parts[0];
    return word.length <= 2 ? `${word[0]}*` : `${word.slice(0, 2)}***`;
  }
  const first = parts[0];
  const initials = parts
    .slice(1)
    .map((part) => `${part.charAt(0).toUpperCase()}.`)
    .join(" ");
  return `${first} ${initials}`;
}

function cleanStr(val?: string): string {
  return String(val ?? "").trim();
}

export function serializeCanonicalPayload(payload: CanonicalCertificatePayload): string {
  const signatories = payload.signatories ?? [];
  const witnesses = payload.witnesses ?? [];
  const ordered = {
    version: "1.0",
    serialNumber: cleanStr(payload.serialNumber),
    templateSlug: cleanStr(payload.templateSlug),
    organizationName: cleanStr(payload.organizationName),
    recipientFullName: cleanStr(payload.recipientFullName),
    recipientChosenName: cleanStr(payload.recipientChosenName),
    nationalIdHash: cleanStr(payload.nationalIdHash),
    issuedAt: cleanStr(payload.issuedAt),
    expiresAt: cleanStr(payload.expiresAt),
    signatories: signatories.map((s) => ({
      name: cleanStr(s.name),
      title: cleanStr(s.title),
    })),
    witnesses: witnesses.map((w) => ({
      fullName: cleanStr(w.fullName),
      role: cleanStr(w.role),
    })),
  };
  return JSON.stringify(ordered);
}

export function computeCanonicalPayloadHash(payload: CanonicalCertificatePayload): string {
  const canonicalJson = serializeCanonicalPayload(payload);
  return createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

export function signCanonicalPayload(
  payload: CanonicalCertificatePayload,
  privateKeyPem: string
): {
  canonicalJson: string;
  payloadHash: string;
  signature: string;
} {
  const canonicalJson = serializeCanonicalPayload(payload);
  const payloadHash = createHash("sha256").update(canonicalJson, "utf8").digest("hex");
  const dataBuffer = Buffer.from(canonicalJson, "utf8");
  const signature = sign(null, dataBuffer, privateKeyPem).toString("base64url");
  return {
    canonicalJson,
    payloadHash,
    signature,
  };
}

export function verifyCanonicalPayloadSignature(
  payload: CanonicalCertificatePayload,
  signatureBase64Url: string,
  publicKeyPem: string
): boolean {
  try {
    if (!signatureBase64Url || !publicKeyPem) return false;
    const canonicalJson = serializeCanonicalPayload(payload);
    const dataBuffer = Buffer.from(canonicalJson, "utf8");
    const sigBuffer = Buffer.from(signatureBase64Url, "base64url");
    return verify(null, dataBuffer, publicKeyPem, sigBuffer);
  } catch {
    return false;
  }
}

export function verifyTokenConstantTime(providedToken?: string, expectedToken?: string): boolean {
  if (!providedToken || !expectedToken) return false;
  const a = Buffer.from(String(providedToken), "utf8");
  const b = Buffer.from(String(expectedToken), "utf8");
  if (a.length !== b.length || a.length === 0) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function computeDocuSignWebhookHmac(rawPayload: string, webhookSecret: string): string {
  return createHmac("sha256", webhookSecret).update(rawPayload, "utf8").digest("base64");
}

export function verifyDocuSignWebhookHmac(
  rawPayload: string,
  signatureHeaderBase64?: string,
  webhookSecret?: string
): boolean {
  if (!rawPayload || !signatureHeaderBase64 || !webhookSecret) {
    return false;
  }
  const computedBase64 = computeDocuSignWebhookHmac(rawPayload, webhookSecret);
  return verifyTokenConstantTime(String(signatureHeaderBase64).trim(), computedBase64);
}
