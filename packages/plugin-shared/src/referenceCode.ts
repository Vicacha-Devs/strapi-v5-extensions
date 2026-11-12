/**
 * Cryptographically strong human-readable reference code generator
 * (`${PREFIX}-${YYYYMMDD}-${RANDOM}`) using Web Crypto CSPRNG.
 */

const REF_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface GlobalWithWebCrypto {
  crypto?: {
    getRandomValues<T extends Uint32Array>(array: T): T;
  };
}

export function generateReferenceCode(
  prefix = "REF",
  options?: { nowMs?: number; randomLength?: number }
): string {
  const dateObj =
    options?.nowMs !== undefined ? new Date(options.nowMs) : new Date();
  const safeDate = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;
  const datePart = safeDate.toISOString().slice(0, 10).replace(/-/g, "");
  const length = Math.max(1, Math.min(options?.randomLength ?? 5, 32));
  const bytes = new Uint32Array(length);
  const webCrypto = (globalThis as unknown as GlobalWithWebCrypto).crypto;
  if (!webCrypto?.getRandomValues) {
    throw new Error("Web Crypto API getRandomValues is required");
  }
  webCrypto.getRandomValues(bytes);
  let randomPart = "";
  for (const b of bytes) {
    randomPart += REF_ALPHABET[b % REF_ALPHABET.length];
  }
  const cleanPrefix = prefix.trim().toUpperCase() || "REF";
  return `${cleanPrefix}-${datePart}-${randomPart}`;
}
