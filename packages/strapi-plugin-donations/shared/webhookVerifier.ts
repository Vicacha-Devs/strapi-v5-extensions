import { createHmac, timingSafeEqual } from 'node:crypto';

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
  const expectedHex = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

  try {
    const a = Buffer.from(cleanSig, 'hex');
    const b = Buffer.from(expectedHex, 'hex');
    if (a.length !== b.length || a.length === 0) {
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Normalizes payment gateway webhook payloads (Wompi, Stripe, PayU, or generic JSON)
 * into a unified NormalizedWebhookEvent.
 */
export function parseGatewayWebhookPayload(payload: Record<string, any>): NormalizedWebhookEvent | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  // Generic direct format
  if (payload.referenceCode && payload.status) {
    const rawStatus = String(payload.status).toLowerCase();
    const status =
      rawStatus === 'approved' || rawStatus === 'succeeded' || rawStatus === 'verified' || rawStatus === 'paid'
        ? 'verified'
        : rawStatus === 'declined' || rawStatus === 'failed' || rawStatus === 'rejected'
          ? 'rejected'
          : 'pending';

    return {
      provider: String(payload.provider || 'gateway'),
      referenceCode: String(payload.referenceCode),
      transactionReference: String(payload.transactionReference || payload.transactionId || payload.referenceCode),
      status,
      amount: payload.amount !== undefined ? Number(payload.amount) : undefined,
      currency: payload.currency ? String(payload.currency).toUpperCase() : undefined,
    };
  }

  // Wompi-style event.data.transaction
  const wompiTx = payload?.data?.transaction;
  if (wompiTx && wompiTx.reference) {
    const rawStatus = String(wompiTx.status || '').toUpperCase();
    const status =
      rawStatus === 'APPROVED'
        ? 'verified'
        : rawStatus === 'DECLINED' || rawStatus === 'ERROR' || rawStatus === 'VOIDED'
          ? 'rejected'
          : 'pending';
    return {
      provider: 'wompi',
      referenceCode: String(wompiTx.reference),
      transactionReference: String(wompiTx.id || wompiTx.reference),
      status,
      amount:
        typeof wompiTx.amount_in_cents === 'number'
          ? Number((wompiTx.amount_in_cents / 100).toFixed(2))
          : undefined,
      currency: wompiTx.currency ? String(wompiTx.currency).toUpperCase() : undefined,
    };
  }

  // Stripe-style data.object
  const stripeObj = payload?.data?.object;
  if (stripeObj && (stripeObj.client_reference_id || stripeObj.metadata?.referenceCode)) {
    const refCode = String(stripeObj.client_reference_id || stripeObj.metadata?.referenceCode);
    const rawStatus = String(stripeObj.status || stripeObj.payment_status || '').toLowerCase();
    const status =
      rawStatus === 'succeeded' || rawStatus === 'paid' || rawStatus === 'complete'
        ? 'verified'
        : rawStatus === 'canceled' || rawStatus === 'failed'
          ? 'rejected'
          : 'pending';
    return {
      provider: 'stripe',
      referenceCode: refCode,
      transactionReference: String(stripeObj.id || refCode),
      status,
      amount:
        typeof stripeObj.amount_total === 'number'
          ? Number((stripeObj.amount_total / 100).toFixed(2))
          : undefined,
      currency: stripeObj.currency ? String(stripeObj.currency).toUpperCase() : undefined,
    };
  }

  return null;
}
