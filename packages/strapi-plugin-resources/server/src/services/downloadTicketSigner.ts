import type { Core } from "@strapi/strapi";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { DEFAULT_DOWNLOAD_TICKET_TTL_MS, PLUGIN_ID } from "../../../shared";

export interface DownloadTicketPayload {
  documentId: string;
  slug: string;
  downloadUrl: string;
  expiresAt: number;
}

const ephemeralSecretsByInstance = new WeakMap<object, string>();

function serializeTicketBinding(payload: DownloadTicketPayload): string {
  return JSON.stringify([
    payload.documentId,
    payload.slug,
    payload.downloadUrl,
    payload.expiresAt,
  ]);
}

/**
 * Computes an HMAC-SHA256 hex signature bound to
 * `documentId + slug + downloadUrl + expiresAt`.
 */
export function signDownloadTicket(
  payload: DownloadTicketPayload,
  secret: string
): string {
  if (typeof secret !== "string" || !secret.trim()) {
    throw new Error("Download ticket signing secret is required");
  }
  if (
    typeof payload.documentId !== "string" ||
    !payload.documentId.trim() ||
    typeof payload.slug !== "string" ||
    !payload.slug.trim() ||
    typeof payload.downloadUrl !== "string" ||
    !payload.downloadUrl.trim() ||
    typeof payload.expiresAt !== "number" ||
    !Number.isFinite(payload.expiresAt)
  ) {
    throw new Error("Invalid download ticket payload for signing");
  }

  return createHmac("sha256", secret.trim())
    .update(serializeTicketBinding(payload), "utf8")
    .digest("hex");
}

/**
 * Verifies an HMAC-SHA256 download ticket in constant time, rejecting missing,
 * `NaN`, or expired timestamps and checking buffer byte length prior to
 * `crypto.timingSafeEqual`.
 */
export function verifyDownloadTicket(
  ticket: {
    documentId?: unknown;
    slug?: unknown;
    downloadUrl?: unknown;
    expiresAt?: unknown;
    signature?: unknown;
  },
  secret: string,
  nowMs: number = Date.now()
): boolean {
  if (typeof secret !== "string" || !secret.trim()) {
    return false;
  }
  if (!ticket || typeof ticket !== "object") {
    return false;
  }
  const { documentId, slug, downloadUrl, expiresAt, signature } = ticket;
  if (
    typeof documentId !== "string" ||
    !documentId.trim() ||
    typeof slug !== "string" ||
    !slug.trim() ||
    typeof downloadUrl !== "string" ||
    !downloadUrl.trim()
  ) {
    return false;
  }
  if (
    typeof expiresAt !== "number" ||
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(nowMs) ||
    expiresAt <= nowMs
  ) {
    return false;
  }
  if (typeof signature !== "string" || !/^[0-9a-f]{64}$/i.test(signature)) {
    return false;
  }

  const expectedHex = signDownloadTicket(
    { documentId, slug, downloadUrl, expiresAt },
    secret
  );
  const expectedBuf = Buffer.from(expectedHex, "hex");
  const providedBuf = Buffer.from(signature.toLowerCase(), "hex");
  if (expectedBuf.byteLength !== providedBuf.byteLength) {
    return false;
  }
  return timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Resolves the HMAC secret from `plugin::resources` config or
 * `RESOURCES_DOWNLOAD_SECRET`. Fails closed in `NODE_ENV === "production"` if
 * unconfigured; generates a per-boot 32-byte hex secret with a warning log in
 * non-production environments.
 */
export function resolveDownloadSecret(strapi: Core.Strapi): string {
  const pluginCfg = (strapi.config?.get?.(`plugin::${PLUGIN_ID}`) ?? {}) as {
    downloadSecret?: unknown;
  };
  const cfgSecret =
    typeof pluginCfg.downloadSecret === "string"
      ? pluginCfg.downloadSecret.trim()
      : "";
  if (cfgSecret) {
    return cfgSecret;
  }

  const envSecret =
    typeof process.env.RESOURCES_DOWNLOAD_SECRET === "string"
      ? process.env.RESOURCES_DOWNLOAD_SECRET.trim()
      : "";
  if (envSecret) {
    return envSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "RESOURCES_DOWNLOAD_SECRET or plugin::resources.downloadSecret must be configured in production"
    );
  }

  const cacheKey = (
    strapi && typeof strapi === "object" ? strapi : {}
  ) as object;
  const cached = ephemeralSecretsByInstance.get(cacheKey);
  if (cached) {
    return cached;
  }

  const generated = randomBytes(32).toString("hex");
  ephemeralSecretsByInstance.set(cacheKey, generated);
  strapi.log?.warn?.(
    "[strapi-plugin-resources] RESOURCES_DOWNLOAD_SECRET is not set; generated an ephemeral 32-byte download ticket secret for non-production runtime."
  );
  return generated;
}

export function computeTicketExpiryMs(
  nowMs: number = Date.now(),
  ttlMs: number = DEFAULT_DOWNLOAD_TICKET_TTL_MS
): number {
  const safeTtl =
    typeof ttlMs === "number" && Number.isFinite(ttlMs) && ttlMs > 0
      ? Math.round(ttlMs)
      : DEFAULT_DOWNLOAD_TICKET_TTL_MS;
  return nowMs + safeTtl;
}
