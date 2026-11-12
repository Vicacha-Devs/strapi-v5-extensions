import {
  buildSafeQueryUrl,
  isPlainRecord,
  validateSafeHttpsBaseUrl,
  type IslamPluginSettings,
  type NisabStandardId,
  type SupportedCurrency,
  type TrustedUpstreamService,
} from "../../../shared";

export async function fetchSafeTimeout(
  url: string | null,
  headers: Record<string, string>,
  timeoutMs: number,
  service: TrustedUpstreamService
): Promise<Response | null> {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const baseOnly = `${parsed.origin}${parsed.pathname}`;
  if (
    !validateSafeHttpsBaseUrl(baseOnly, {
      service,
      requireTrustedHost: true,
    })
  ) {
    return null;
  }

  try {
    return await fetch(url, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return null;
  }
}

export async function tryFetchUpstreamJson(
  baseUrl: string,
  path: string,
  params: Record<string, string | number | undefined>
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.ISLAMIC_API_KEY?.trim();
  if (!apiKey) return null;

  const url = buildSafeQueryUrl(
    baseUrl,
    path,
    { ...params, api_key: apiKey },
    { service: "islamic_api", requireTrustedHost: true }
  );
  const res = await fetchSafeTimeout(
    url,
    { Accept: "application/json" },
    2000,
    "islamic_api"
  );
  if (!res?.ok) return null;
  const contentLength = Number(res.headers?.get?.("content-length") ?? 0);
  if (contentLength > 2 * 1024 * 1024) return null;
  try {
    if (typeof res.text === "function") {
      const rawText = await res.text();
      if (rawText.length > 2 * 1024 * 1024) return null;
      const parsed = JSON.parse(rawText);
      return isPlainRecord(parsed) ? parsed : null;
    }
    const parsed = await res.json();
    return isPlainRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function extractUpstreamPrayerTimes(
  upstream: Record<string, unknown> | null
): Record<string, string> | undefined {
  const dataObj = upstream?.data;
  if (!isPlainRecord(dataObj)) return undefined;
  const times = dataObj.times;
  if (!isPlainRecord(times)) return undefined;
  return times as Record<string, string>;
}

export async function resolveExternalPrayerTimesOverrideWithCache(
  settings: IslamPluginSettings,
  date: string,
  lat: number,
  lon: number,
  cacheOps: {
    getCached: <T>(key: string) => T | null;
    setCached: <T>(key: string, value: T, ttlSeconds: number) => void;
  }
): Promise<Partial<Record<string, string>> | undefined> {
  if (!settings.externalApiEnabled || !process.env.ISLAMIC_API_KEY) {
    return undefined;
  }
  const cacheKey = `prayer:${date}:${lat}:${lon}:${settings.method}:${settings.school}:${settings.calender}:${settings.shifting}`;
  const cached = cacheOps.getCached<Record<string, string>>(cacheKey);
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
    cacheOps.setCached(cacheKey, times, settings.cacheTtlSeconds || 3600);
  }
  return times;
}

function extractUpstreamNisabSpotPrices(
  upstream: Record<string, unknown> | null
): { goldUnit: number; silverUnit: number } | null {
  const dataObj = isPlainRecord(upstream?.data) ? upstream.data : undefined;
  const thresholds = isPlainRecord(dataObj?.nisab_thresholds)
    ? dataObj.nisab_thresholds
    : undefined;
  const goldObj = isPlainRecord(thresholds?.gold) ? thresholds.gold : undefined;
  const silverObj = isPlainRecord(thresholds?.silver)
    ? thresholds.silver
    : undefined;
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

export async function resolveExternalNisabSpotPricesWithCache(
  settings: IslamPluginSettings,
  currency: SupportedCurrency,
  standard: NisabStandardId,
  cacheOps: {
    getCached: <T>(key: string) => T | null;
    setCached: <T>(key: string, value: T, ttlSeconds: number) => void;
  }
): Promise<{ goldUnit: number; silverUnit: number } | null> {
  if (!settings.externalApiEnabled || !process.env.ISLAMIC_API_KEY) {
    return null;
  }
  const cacheKey = `nisab:${currency}:${standard}`;
  const cached = cacheOps.getCached<{ goldUnit: number; silverUnit: number }>(
    cacheKey
  );
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
    cacheOps.setCached(cacheKey, prices, settings.cacheTtlSeconds || 3600);
  }
  return prices;
}
