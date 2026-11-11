import {
  buildSafeQueryUrl,
  isPlainRecord,
  validateSafeHttpsBaseUrl,
  type IslamPluginSettings,
  type NisabStandardId,
  type QuranFoundationConfig,
  type QuranFoundationEnvironment,
  type SupportedCurrency,
} from "../../../shared";
import {
  fetchSafeTimeout,
  resolveExternalNisabSpotPricesWithCache,
  resolveExternalPrayerTimesOverrideWithCache,
  tryFetchUpstreamJson,
} from "./islamicApiUpstream";

export { tryFetchUpstreamJson };

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

interface QfTokenCache {
  accessToken: string;
  clientId: string;
  environment: QuranFoundationEnvironment;
  expiresAt: number;
}

export interface QfTokenBundle {
  accessToken: string;
  clientId: string;
  apiBaseUrl: string;
  environment: QuranFoundationEnvironment;
}

export interface QfCredentials {
  clientId: string;
  clientSecret: string;
  environment: QuranFoundationEnvironment;
  oauth2BaseUrl: string;
  apiBaseUrl: string;
}

export interface QfUpstreamPayload {
  data: Record<string, unknown>;
  source: "quran_foundation_oauth2" | "quran_foundation_public_v4";
}

export const MAX_CACHE_ENTRIES = 500;

const upstreamCache = new Map<string, CacheEntry<unknown>>();
const qfTokenCacheByKey = new Map<string, QfTokenCache>();
const inFlightTokenPromises = new Map<string, Promise<QfTokenBundle | null>>();

export function clearQuranFoundationCaches(): void {
  qfTokenCacheByKey.clear();
  inFlightTokenPromises.clear();
  upstreamCache.clear();
}

export function getUpstreamCacheSize(): number {
  return upstreamCache.size;
}

export function getCached<T>(key: string): T | null {
  const entry = upstreamCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    upstreamCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function evictCacheIfNeeded(): void {
  if (upstreamCache.size < MAX_CACHE_ENTRIES) return;
  const now = Date.now();
  for (const [k, entry] of upstreamCache.entries()) {
    if (now > entry.expiresAt) {
      upstreamCache.delete(k);
    }
  }
  while (upstreamCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = upstreamCache.keys().next().value;
    if (oldestKey === undefined) break;
    upstreamCache.delete(oldestKey);
  }
}

export function setCached<T>(key: string, value: T, ttlSeconds: number): void {
  if (upstreamCache.has(key)) {
    upstreamCache.delete(key);
  }
  evictCacheIfNeeded();
  const numericTtl = Number(ttlSeconds);
  const safeSec = Number.isFinite(numericTtl)
    ? Math.max(60, Math.min(86400, numericTtl))
    : 3600;
  upstreamCache.set(key, {
    expiresAt: Date.now() + safeSec * 1000,
    value,
  });
}

function readFirstEnv(...keys: string[]): string {
  for (const key of keys) {
    const val = process.env[key];
    if (val && val.trim()) {
      return val.trim();
    }
  }
  return "";
}

export function resolveQuranFoundationCredentials(
  qfConfig: QuranFoundationConfig
): QfCredentials {
  const clientId = readFirstEnv("QF_CLIENT_ID", "QURAN_FOUNDATION_CLIENT_ID");
  const clientSecret = readFirstEnv(
    "QF_CLIENT_SECRET",
    "QURAN_FOUNDATION_CLIENT_SECRET"
  );
  const envOverride = readFirstEnv("QF_ENV", "QURAN_FOUNDATION_ENV");
  const envRaw = (
    envOverride ||
    qfConfig.environment ||
    "production"
  ).toLowerCase();
  const environment: QuranFoundationEnvironment =
    envRaw === "prelive" ? "prelive" : "production";

  const isPrelive = environment === "prelive";
  const oauth2BaseUrl = isPrelive
    ? qfConfig.oauth2BaseUrlPrelive
    : qfConfig.oauth2BaseUrlProduction;
  const apiBaseUrl = isPrelive
    ? qfConfig.apiBaseUrlPrelive
    : qfConfig.apiBaseUrlProduction;

  return {
    clientId,
    clientSecret,
    environment,
    oauth2BaseUrl,
    apiBaseUrl,
  };
}

function buildTokenKey(creds: QfCredentials): string {
  return `${creds.environment}:${creds.clientId}`;
}

async function requestOAuth2Token(
  creds: QfCredentials,
  tokenKey: string
): Promise<QfTokenBundle | null> {
  const safeApiBase = validateSafeHttpsBaseUrl(creds.apiBaseUrl, {
    service: "quran",
    requireTrustedHost: true,
  });
  const tokenEndpoint = buildSafeQueryUrl(
    creds.oauth2BaseUrl,
    "oauth2/token",
    {},
    { service: "quran", requireTrustedHost: true }
  );
  if (!tokenEndpoint || !safeApiBase) {
    return null;
  }

  const basicAuth = Buffer.from(
    `${creds.clientId}:${creds.clientSecret}`
  ).toString("base64");

  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: "grant_type=client_credentials&scope=content",
      redirect: "error",
      signal: AbortSignal.timeout(3500),
    });

    if (!response.ok) {
      qfTokenCacheByKey.delete(tokenKey);
      return null;
    }

    const json = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!json?.access_token || typeof json.access_token !== "string") {
      return null;
    }

    const rawExp = Number(json.expires_in);
    const expiresInSec = Number.isFinite(rawExp) && rawExp > 0 ? rawExp : 3600;
    const safeLifetimeMs =
      Math.max(0, Math.min(86400, expiresInSec) - 30) * 1000;

    if (safeLifetimeMs > 0) {
      qfTokenCacheByKey.set(tokenKey, {
        accessToken: json.access_token,
        clientId: creds.clientId,
        environment: creds.environment,
        expiresAt: Date.now() + safeLifetimeMs,
      });
    } else {
      qfTokenCacheByKey.delete(tokenKey);
    }

    return {
      accessToken: json.access_token,
      clientId: creds.clientId,
      apiBaseUrl: safeApiBase,
      environment: creds.environment,
    };
  } catch {
    return null;
  }
}

export async function getQuranFoundationAccessToken(
  qfConfig: QuranFoundationConfig,
  forceRefresh = false
): Promise<QfTokenBundle | null> {
  const creds = resolveQuranFoundationCredentials(qfConfig);
  if (!creds.clientId || !creds.clientSecret) return null;

  const safeApiBase = validateSafeHttpsBaseUrl(creds.apiBaseUrl, {
    service: "quran",
    requireTrustedHost: true,
  });
  if (!safeApiBase) return null;

  const tokenKey = buildTokenKey(creds);
  if (forceRefresh) {
    qfTokenCacheByKey.delete(tokenKey);
  } else {
    const cached = qfTokenCacheByKey.get(tokenKey);
    if (cached && Date.now() < cached.expiresAt) {
      return {
        accessToken: cached.accessToken,
        clientId: cached.clientId,
        apiBaseUrl: safeApiBase,
        environment: creds.environment,
      };
    }
  }

  const existingInFlight = inFlightTokenPromises.get(tokenKey);
  if (existingInFlight) return existingInFlight;

  const promise = requestOAuth2Token(creds, tokenKey).finally(() => {
    inFlightTokenPromises.delete(tokenKey);
  });
  inFlightTokenPromises.set(tokenKey, promise);
  return promise;
}

function isPreliveSurahSupported(
  creds: QfCredentials,
  targetSurah?: number
): boolean {
  return (
    creds.environment !== "prelive" ||
    targetSurah === undefined ||
    targetSurah <= 2
  );
}

async function executeSingleQfAttempt(
  url: string,
  tokenBundle: QfTokenBundle
): Promise<{ status: number; payload?: Record<string, unknown> } | null> {
  const res = await fetchSafeTimeout(
    url,
    {
      "Accept": "application/json",
      "x-auth-token": tokenBundle.accessToken,
      "x-client-id": tokenBundle.clientId,
    },
    3500,
    "quran"
  );
  if (!res) return null;
  if (res.ok) {
    try {
      const parsed = await res.json();
      if (isPlainRecord(parsed)) {
        return { status: res.status, payload: parsed };
      }
      return null;
    } catch {
      return null;
    }
  }
  return { status: res.status };
}

async function tryAuthenticatedQfFetch(
  qfConfig: QuranFoundationConfig,
  subPath: string,
  queryParams: Record<string, string | number | boolean | undefined>,
  targetSurah?: number
): Promise<QfUpstreamPayload | null> {
  const creds = resolveQuranFoundationCredentials(qfConfig);
  if (!creds.clientId || !creds.clientSecret) return null;
  if (!isPreliveSurahSupported(creds, targetSurah)) return null;

  let tokenBundle = await getQuranFoundationAccessToken(qfConfig, false);
  if (!tokenBundle) return null;

  const url = buildSafeQueryUrl(tokenBundle.apiBaseUrl, subPath, queryParams, {
    service: "quran",
    requireTrustedHost: true,
  });
  if (!url) return null;

  const first = await executeSingleQfAttempt(url, tokenBundle);
  if (first?.payload) {
    return { data: first.payload, source: "quran_foundation_oauth2" };
  }
  if (first?.status !== 401) return null;

  tokenBundle = await getQuranFoundationAccessToken(qfConfig, true);
  if (!tokenBundle) return null;
  const retry = await executeSingleQfAttempt(url, tokenBundle);
  return retry?.payload
    ? { data: retry.payload, source: "quran_foundation_oauth2" }
    : null;
}

export async function fetchQuranFoundationV4Json(
  qfConfig: QuranFoundationConfig,
  subPath: string,
  queryParams: Record<string, string | number | boolean | undefined>,
  options?: { targetSurah?: number }
): Promise<QfUpstreamPayload | null> {
  if (!qfConfig?.enabled) return null;

  const authenticated = await tryAuthenticatedQfFetch(
    qfConfig,
    subPath,
    queryParams,
    options?.targetSurah
  );
  if (authenticated) return authenticated;

  if (!qfConfig.publicFallbackBaseUrl) return null;
  const fallbackUrl = buildSafeQueryUrl(
    qfConfig.publicFallbackBaseUrl,
    subPath,
    queryParams,
    { service: "quran", requireTrustedHost: true }
  );
  const fallbackRes = await fetchSafeTimeout(
    fallbackUrl,
    { Accept: "application/json" },
    3500,
    "quran"
  );
  if (fallbackRes?.ok) {
    try {
      const parsed = await fallbackRes.json();
      if (isPlainRecord(parsed)) {
        return { data: parsed, source: "quran_foundation_public_v4" };
      }
    } catch {
      return null;
    }
  }
  return null;
}

export async function resolveExternalPrayerTimesOverride(
  settings: IslamPluginSettings,
  date: string,
  lat: number,
  lon: number
): Promise<Partial<Record<string, string>> | undefined> {
  return resolveExternalPrayerTimesOverrideWithCache(settings, date, lat, lon, {
    getCached,
    setCached,
  });
}

export async function resolveExternalNisabSpotPrices(
  settings: IslamPluginSettings,
  currency: SupportedCurrency,
  standard: NisabStandardId
): Promise<{ goldUnit: number; silverUnit: number } | null> {
  return resolveExternalNisabSpotPricesWithCache(settings, currency, standard, {
    getCached,
    setCached,
  });
}
