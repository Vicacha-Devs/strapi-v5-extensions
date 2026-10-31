const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function sha256Bytes(msg: Uint8Array): Uint8Array {
  const len = msg.length;
  const bitLenHi = Math.floor((len * 8) / 0x100000000);
  const bitLenLo = (len * 8) >>> 0;
  const padLen = ((len + 9 + 63) >> 6) << 6;
  const padded = new Uint8Array(padLen);
  padded.set(msg);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 8, bitLenHi, false);
  view.setUint32(padLen - 4, bitLenLo, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let offset = 0; offset < padLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

function hmacSha256Hex(keyStr: string, messageStr: string): string {
  let keyBytes = utf8ToBytes(keyStr);
  if (keyBytes.length > 64) {
    keyBytes = sha256Bytes(keyBytes);
  }
  const blockKey = new Uint8Array(64);
  blockKey.set(keyBytes);

  const oKeyPad = new Uint8Array(64);
  const iKeyPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oKeyPad[i] = blockKey[i] ^ 0x5c;
    iKeyPad[i] = blockKey[i] ^ 0x36;
  }

  const msgBytes = utf8ToBytes(messageStr);
  const innerInput = new Uint8Array(64 + msgBytes.length);
  innerInput.set(iKeyPad, 0);
  innerInput.set(msgBytes, 64);
  const innerHash = sha256Bytes(innerInput);

  const outerInput = new Uint8Array(64 + 32);
  outerInput.set(oKeyPad, 0);
  outerInput.set(innerHash, 64);
  const digest = sha256Bytes(outerInput);

  return Array.from(digest)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeHexEqual(hexA: string, hexB: string): boolean {
  if (hexA.length !== hexB.length || hexA.length === 0 || hexA.length % 2 !== 0) {
    return false;
  }
  if (!/^[0-9a-fA-F]+$/.test(hexA) || !/^[0-9a-fA-F]+$/.test(hexB)) {
    return false;
  }
  const a = hexA.toLowerCase();
  const b = hexB.toLowerCase();
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export interface NormalizedWebhookEvent {
  provider: string;
  referenceCode: string;
  transactionReference: string;
  status: 'verified' | 'rejected' | 'pending';
  amount?: number;
  currency?: string;
}

/**
 * Verifies an HMAC-SHA256 webhook signature against a raw payload string.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined | null,
  secret: string | undefined | null
): boolean {
  if (!secret || !signatureHeader || !rawBody) {
    return false;
  }

  const cleanSig = signatureHeader.replace(/^sha256=/i, '').trim();
  const expectedHex = hmacSha256Hex(secret, rawBody);
  return constantTimeHexEqual(cleanSig, expectedHex);
}

const DIRECT_VERIFIED_STATUSES = new Set([
  'approved',
  'succeeded',
  'verified',
  'paid',
  'complete',
]);
const DIRECT_REJECTED_STATUSES = new Set([
  'declined',
  'failed',
  'rejected',
  'canceled',
  'error',
  'voided',
]);

function mapWebhookStatus(
  rawStatus: unknown
): 'verified' | 'rejected' | 'pending' {
  const lower = String(rawStatus ?? '').toLowerCase();
  if (DIRECT_VERIFIED_STATUSES.has(lower)) return 'verified';
  if (DIRECT_REJECTED_STATUSES.has(lower)) return 'rejected';
  return 'pending';
}

function normalizeUpperString(val: unknown): string | undefined {
  return val ? String(val).toUpperCase() : undefined;
}

function centsToMajorAmount(cents: unknown): number | undefined {
  return typeof cents === 'number'
    ? Number((cents / 100).toFixed(2))
    : undefined;
}

function parseDirectWebhookPayload(
  payload: Record<string, unknown>
): NormalizedWebhookEvent | null {
  if (!payload.referenceCode || !payload.status) return null;
  const txRef =
    payload.transactionReference ??
    payload.transactionId ??
    payload.referenceCode;
  return {
    provider: String(payload.provider || 'gateway'),
    referenceCode: String(payload.referenceCode),
    transactionReference: String(txRef),
    status: mapWebhookStatus(payload.status),
    amount: payload.amount !== undefined ? Number(payload.amount) : undefined,
    currency: normalizeUpperString(payload.currency),
  };
}

function parseWompiWebhookPayload(
  dataObj: Record<string, unknown> | undefined
): NormalizedWebhookEvent | null {
  const wompiTx = dataObj?.transaction as Record<string, unknown> | undefined;
  if (!wompiTx?.reference) return null;
  return {
    provider: 'wompi',
    referenceCode: String(wompiTx.reference),
    transactionReference: String(wompiTx.id || wompiTx.reference),
    status: mapWebhookStatus(wompiTx.status),
    amount: centsToMajorAmount(wompiTx.amount_in_cents),
    currency: normalizeUpperString(wompiTx.currency),
  };
}

function parseStripeWebhookPayload(
  dataObj: Record<string, unknown> | undefined
): NormalizedWebhookEvent | null {
  const stripeObj = dataObj?.object as Record<string, unknown> | undefined;
  if (!stripeObj) return null;
  const metadata = stripeObj.metadata as Record<string, unknown> | undefined;
  const rawRef = stripeObj.client_reference_id ?? metadata?.referenceCode;
  if (!rawRef) return null;
  const refCode = String(rawRef);
  return {
    provider: 'stripe',
    referenceCode: refCode,
    transactionReference: String(stripeObj.id || refCode),
    status: mapWebhookStatus(stripeObj.status ?? stripeObj.payment_status),
    amount: centsToMajorAmount(stripeObj.amount_total),
    currency: normalizeUpperString(stripeObj.currency),
  };
}

/**
 * Normalizes payment gateway webhook payloads (Wompi, Stripe, PayU, or generic JSON)
 * into a unified NormalizedWebhookEvent.
 */
export function parseGatewayWebhookPayload(
  payload: Record<string, unknown>
): NormalizedWebhookEvent | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const dataObj = payload.data as Record<string, unknown> | undefined;
  return (
    parseDirectWebhookPayload(payload) ??
    parseWompiWebhookPayload(dataObj) ??
    parseStripeWebhookPayload(dataObj)
  );
}
