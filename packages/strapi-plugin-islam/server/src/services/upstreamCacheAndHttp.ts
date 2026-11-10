import { stripTrailingSlashes } from "@vicacha-devs/plugin-shared";

import type {
  IslamPluginSettings,
  NisabStandardId,
  QuranFoundationConfig,
  QuranFoundationEnvironment,
  SupportedCurrency,
} from "../../../shared";

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

const upstreamCache = new Map<string, CacheEntry<unknown>>();
let qfTokenCache: QfTokenCache | null = null;
let inFlightTokenPromise: Promise<QfTokenBundle | null> | null = null;

export function clearQuranFoundationCaches(): void {
  qfTokenCache = null;
  inFlightTokenPromise = null;
  upstreamCache.clear();
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

export function setCached<T>(key: string, value: T, ttlSeconds: number): void {
  const safeTtlMs = Math.max(60, Math.min(86400, ttlSeconds)) * 1000;
  upstreamCache.set(key, {
    expiresAt: Date.now() + safeTtlMs,
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

function isTokenCacheValid(creds: QfCredentials): boolean {
  if (!qfTokenCache) return false;
  return (
    qfTokenCache.clientId === creds.clientId &&
    qfTokenCache.environment === creds.environment &&
    Date.now() < qfTokenCache.expiresAt
  );
}

async function requestOAuth2Token(
  creds: QfCredentials
): Promise<QfTokenBundle | null> {
  const tokenEndpoint = `${stripTrailingSlashes(creds.oauth2BaseUrl)}/oauth2/token`;
  const basicAuth = Buffer.from(
    `${creds.clientId}:${creds.clientSecret}`
  ).toString("base64");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: "grant_type=client_credentials&scope=content",
      signal: controller.signal,
    });

    if (!response.ok) {
      qfTokenCache = null;
      return null;
    }

    const json = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!json?.access_token) return null;

    const expiresInSec = Number(json.expires_in) || 3600;
    const safeLifetimeMs = Math.max(60, expiresInSec - 60) * 1000;
    qfTokenCache = {
      accessToken: json.access_token,
      clientId: creds.clientId,
      environment: creds.environment,
      expiresAt: Date.now() + safeLifetimeMs,
    };

    return {
      accessToken: json.access_token,
      clientId: creds.clientId,
      apiBaseUrl: creds.apiBaseUrl,
      environment: creds.environment,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    inFlightTokenPromise = null;
  }
}

export async function getQuranFoundationAccessToken(
  qfConfig: QuranFoundationConfig,
  forceRefresh = false
): Promise<QfTokenBundle | null> {
  const creds = resolveQuranFoundationCredentials(qfConfig);
  if (!creds.clientId || !creds.clientSecret) return null;

  if (forceRefresh) {
    qfTokenCache = null;
  } else if (isTokenCacheValid(creds) && qfTokenCache) {
    return {
      accessToken: qfTokenCache.accessToken,
      clientId: qfTokenCache.clientId,
      apiBaseUrl: creds.apiBaseUrl,
      environment: creds.environment,
    };
  }

  if (inFlightTokenPromise) return inFlightTokenPromise;
  inFlightTokenPromise = requestOAuth2Token(creds);
  return inFlightTokenPromise;
}

function buildQueryUrl(
  base: string,
  subPath: string,
  queryParams: Record<string, string | number | boolean | undefined>
): string {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const url = new URL(subPath.replace(/^\/+/, ""), normalizedBase);
  for (const [k, v] of Object.entries(queryParams)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function fetchWithTimeout(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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
  const res = await fetchWithTimeout(
    url,
    {
      "Accept": "application/json",
      "x-auth-token": tokenBundle.accessToken,
      "x-client-id": tokenBundle.clientId,
    },
    3500
  );
  if (!res) return null;
  if (res.ok) {
    const payload = (await res.json()) as Record<string, unknown>;
    return { status: res.status, payload };
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

  const url = buildQueryUrl(tokenBundle.apiBaseUrl, subPath, queryParams);
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
  const fallbackRes = await fetchWithTimeout(
    buildQueryUrl(qfConfig.publicFallbackBaseUrl, subPath, queryParams),
    { Accept: "application/json" },
    3500
  );
  if (fallbackRes?.ok) {
    const payload = (await fallbackRes.json()) as Record<string, unknown>;
    return { data: payload, source: "quran_foundation_public_v4" };
  }
  return null;
}

export async function tryFetchUpstreamJson(
  baseUrl: string,
  path: string,
  params: Record<string, string | number | undefined>
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.ISLAMIC_API_KEY?.trim();
  if (!apiKey) return null;

  const url = buildQueryUrl(baseUrl, path, { ...params, api_key: apiKey });
  const res = await fetchWithTimeout(url, { Accept: "application/json" }, 2000);
  if (!res?.ok) return null;
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractUpstreamPrayerTimes(
  upstream: Record<string, unknown> | null
): Record<string, string> | undefined {
  const dataObj = upstream?.data;
  if (!dataObj || typeof dataObj !== "object") return undefined;
  const times = (dataObj as Record<string, unknown>).times;
  if (!times || typeof times !== "object") return undefined;
  return times as Record<string, string>;
}

export async function resolveExternalPrayerTimesOverride(
  settings: IslamPluginSettings,
  date: string,
  lat: number,
  lon: number
): Promise<Partial<Record<string, string>> | undefined> {
  if (!settings.externalApiEnabled || !process.env.ISLAMIC_API_KEY) {
    return undefined;
  }
  const cacheKey = `prayer:${date}:${lat}:${lon}:${settings.method}:${settings.school}:${settings.shifting}`;
  const cached = getCached<Record<string, string>>(cacheKey);
  if (cached) return cached;

  const upstream = await tryFetchUpstreamJson(
    settings.externalApiBaseUrl,
    "prayer-time/",
    {
      lat,
      lon,
      method: settings.method,
      school: settings.school,
      calender: settings.calender,
      shifting: settings.shifting,
      date,
    }
  );

  const times = extractUpstreamPrayerTimes(upstream);
  if (times) {
    setCached(cacheKey, times, settings.cacheTtlSeconds || 3600);
  }
  return times;
}

function extractUpstreamNisabSpotPrices(
  upstream: Record<string, unknown> | null
): { goldUnit: number; silverUnit: number } | null {
  const dataObj = upstream?.data as Record<string, unknown> | undefined;
  const thresholds = dataObj?.nisab_thresholds as
    | Record<string, unknown>
    | undefined;
  const goldObj = thresholds?.gold as Record<string, unknown> | undefined;
  const silverObj = thresholds?.silver as Record<string, unknown> | undefined;
  const gPrice = Number(goldObj?.unit_price);
  const sPrice = Number(silverObj?.unit_price);
  if (
    Number.isFinite(gPrice) &&
    gPrice > 0 &&
    Number.isFinite(sPrice) &&
    sPrice > 0
  ) {
    return { goldUnit: gPrice, silverUnit: sPrice };
  }
  return null;
}

export async function resolveExternalNisabSpotPrices(
  settings: IslamPluginSettings,
  currency: SupportedCurrency,
  standard: NisabStandardId
): Promise<{ goldUnit: number; silverUnit: number } | null> {
  if (!settings.externalApiEnabled || !process.env.ISLAMIC_API_KEY) {
    return null;
  }
  const cacheKey = `nisab:${currency}:${standard}`;
  const cached = getCached<{ goldUnit: number; silverUnit: number }>(cacheKey);
  if (cached) return cached;

  const upstream = await tryFetchUpstreamJson(
    settings.externalApiBaseUrl,
    "zakat-nisab/",
    {
      standard,
      currency: currency.toLowerCase(),
      unit: "g",
    }
  );

  const prices = extractUpstreamNisabSpotPrices(upstream);
  if (prices) {
    setCached(cacheKey, prices, settings.cacheTtlSeconds || 3600);
  }
  return prices;
}
