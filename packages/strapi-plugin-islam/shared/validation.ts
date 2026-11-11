import {
  ALLOWED_ASR_SCHOOLS,
  ALLOWED_CALENDAR_METHODS,
  ALLOWED_CURRENCIES,
  ALLOWED_HIJRI_SHIFTS,
  ALLOWED_LOCALES,
  ALLOWED_METHOD_IDS,
} from "./constants";
import type {
  AsrSchoolId,
  CalendarMethodId,
  HijriShiftId,
  IslamPluginSettings,
  NisabStandardId,
  QuranScriptType,
  SupportedCurrency,
  SupportedLocale,
} from "./types";

const DANGEROUS_OBJECT_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);
const SAFE_API_UID_REGEX = /^api::[a-z0-9-]+(\.[a-z0-9-]+)?$/;
const SAFE_FIELD_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;

export function isPlainRecord(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return false;
  }
  const proto = Object.getPrototypeOf(raw);
  return proto === null || proto === Object.prototype;
}

export function stripDangerousKeysDeep<T>(value: T, depth = 0): T {
  if (depth > 12 || value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      stripDangerousKeysDeep(item, depth + 1)
    ) as unknown as T;
  }
  if (!isPlainRecord(value)) {
    return value;
  }
  const cleaned: Record<string, unknown> = {};
  for (const [key, entryVal] of Object.entries(value)) {
    if (DANGEROUS_OBJECT_KEYS.has(key)) {
      continue;
    }
    cleaned[key] = stripDangerousKeysDeep(entryVal, depth + 1);
  }
  return cleaned as T;
}

export function isValidApiContentTypeUid(rawUid: unknown): rawUid is string {
  return typeof rawUid === "string" && SAFE_API_UID_REGEX.test(rawUid.trim());
}

export function sanitizeSafeFieldName(
  rawField: unknown,
  fallback: string
): string {
  if (typeof rawField !== "string") return fallback;
  const trimmed = rawField.trim();
  if (
    !SAFE_FIELD_NAME_REGEX.test(trimmed) ||
    DANGEROUS_OBJECT_KEYS.has(trimmed)
  ) {
    return fallback;
  }
  return trimmed;
}

export function sanitizeCoordinates(
  rawLat: unknown,
  rawLon: unknown,
  fallbackLat = 4.6685,
  fallbackLon = -74.0758
): { lat: number; lon: number } {
  const latNum = typeof rawLat === "number" ? rawLat : Number(rawLat);
  const lonNum = typeof rawLon === "number" ? rawLon : Number(rawLon);

  const validLat =
    Number.isFinite(latNum) && latNum >= -90 && latNum <= 90
      ? latNum
      : fallbackLat;
  const validLon =
    Number.isFinite(lonNum) && lonNum >= -180 && lonNum <= 180
      ? lonNum
      : fallbackLon;

  return {
    lat: Math.round(validLat * 1_000_000) / 1_000_000,
    lon: Math.round(validLon * 1_000_000) / 1_000_000,
  };
}

export function isValidTimezone(rawTz: unknown): rawTz is string {
  if (typeof rawTz !== "string") return false;
  const trimmed = rawTz.trim();
  if (!trimmed || trimmed.length > 100) return false;
  try {
    // The constructor throws a RangeError for unknown time zones.
    return (
      typeof new Intl.DateTimeFormat("en-US", {
        timeZone: trimmed,
      }).resolvedOptions().timeZone === "string"
    );
  } catch {
    return false;
  }
}

export function sanitizeTimezone(rawTz: unknown, fallback = "UTC"): string {
  if (isValidTimezone(rawTz)) {
    return rawTz.trim();
  }
  return isValidTimezone(fallback) ? fallback.trim() : "UTC";
}

export function sanitizeLocale(
  rawLocale: unknown,
  fallback: SupportedLocale = "es"
): SupportedLocale {
  if (typeof rawLocale !== "string") return fallback;
  const clean = rawLocale.trim().toLowerCase().slice(0, 2) as SupportedLocale;
  return (ALLOWED_LOCALES as readonly string[]).includes(clean)
    ? clean
    : fallback;
}

export function sanitizeCurrency(
  rawCurrency: unknown,
  fallback: SupportedCurrency = "COP"
): SupportedCurrency {
  if (typeof rawCurrency !== "string") return fallback;
  const clean = rawCurrency.trim().toUpperCase() as SupportedCurrency;
  return (ALLOWED_CURRENCIES as readonly string[]).includes(clean)
    ? clean
    : fallback;
}

export function sanitizeNisabStandard(
  rawStandard: unknown,
  fallback: NisabStandardId = "common"
): NisabStandardId {
  if (rawStandard === "classical" || rawStandard === "common") {
    return rawStandard;
  }
  return fallback;
}

export function sanitizeMethodId(rawMethod: unknown, fallback = "3"): string {
  const str = String(rawMethod ?? "").trim();
  return ALLOWED_METHOD_IDS.includes(str) ? str : fallback;
}

export function sanitizeAsrSchool(
  rawSchool: unknown,
  fallback: AsrSchoolId = "1"
): AsrSchoolId {
  const str = String(rawSchool ?? "").trim() as AsrSchoolId;
  return (ALLOWED_ASR_SCHOOLS as readonly string[]).includes(str)
    ? str
    : fallback;
}

export function sanitizeCalendarMethod(
  rawCal: unknown,
  fallback: CalendarMethodId = "MATHEMATICAL"
): CalendarMethodId {
  const str = String(rawCal ?? "")
    .trim()
    .toUpperCase() as CalendarMethodId;
  return (ALLOWED_CALENDAR_METHODS as readonly string[]).includes(str)
    ? str
    : fallback;
}

export function sanitizeHijriShift(
  rawShift: unknown,
  fallback: HijriShiftId = "0"
): HijriShiftId {
  const str = String(rawShift ?? "").trim() as HijriShiftId;
  return (ALLOWED_HIJRI_SHIFTS as readonly string[]).includes(str)
    ? str
    : fallback;
}

export function sanitizeHighLatitudeRule(
  rawRule: unknown,
  fallback: IslamPluginSettings["highLatitudeRule"] = "AngleBased"
): IslamPluginSettings["highLatitudeRule"] {
  if (
    rawRule === "AngleBased" ||
    rawRule === "MiddleOfTheNight" ||
    rawRule === "OneSeventh"
  ) {
    return rawRule;
  }
  return fallback;
}

function clampFiniteInt(
  rawVal: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const num = typeof rawVal === "number" ? rawVal : Number(rawVal);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(num)));
}

export function sanitizeMinuteAdjustments(
  rawAdj: unknown,
  fallback: IslamPluginSettings["minuteAdjustments"] = {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  }
): IslamPluginSettings["minuteAdjustments"] {
  const src = isPlainRecord(rawAdj) ? rawAdj : {};
  return {
    fajr: clampFiniteInt(src.fajr, fallback.fajr ?? 0, -120, 120),
    sunrise: clampFiniteInt(src.sunrise, fallback.sunrise ?? 0, -120, 120),
    dhuhr: clampFiniteInt(src.dhuhr, fallback.dhuhr ?? 0, -120, 120),
    asr: clampFiniteInt(src.asr, fallback.asr ?? 0, -120, 120),
    maghrib: clampFiniteInt(src.maghrib, fallback.maghrib ?? 0, -120, 120),
    isha: clampFiniteInt(src.isha, fallback.isha ?? 0, -120, 120),
  };
}

export function sanitizeElevationMeters(rawVal: unknown, fallback = 0): number {
  const num = typeof rawVal === "number" ? rawVal : Number(rawVal);
  if (!Number.isFinite(num)) {
    return Math.max(0, Math.min(9000, fallback));
  }
  return Math.max(0, Math.min(9000, num));
}

export function sanitizeImsakOffsetMinutes(
  rawVal: unknown,
  fallback = 10
): number {
  return clampFiniteInt(rawVal, fallback, 0, 120);
}

export function sanitizeHijriYear(rawVal: unknown, fallback = 1448): number {
  const num = typeof rawVal === "number" ? rawVal : Number(rawVal);
  if (!Number.isFinite(num) || num === 0) return fallback;
  return Math.max(1300, Math.min(1700, Math.trunc(num)));
}

export function sanitizeHijriMonth(rawVal: unknown, fallback = 1): number {
  const num = typeof rawVal === "number" ? rawVal : Number(rawVal);
  if (!Number.isFinite(num) || num === 0) return fallback;
  return Math.max(1, Math.min(12, Math.trunc(num)));
}

export function sanitizeNonNegativeNumber(
  rawVal: unknown,
  maxAllowed = 1_000_000_000_000
): number {
  const num = typeof rawVal === "number" ? rawVal : Number(rawVal);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(num, maxAllowed);
}

export function isValidIsoDateYmd(rawDate: unknown): rawDate is string {
  if (typeof rawDate !== "string") return false;
  const trimmed = rawDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const parsed = new Date(`${trimmed}T12:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === trimmed
  );
}

export function sanitizeIsoDateYmd(
  rawDate: unknown,
  fallbackDate = new Date()
): string {
  if (isValidIsoDateYmd(rawDate)) {
    return rawDate.trim();
  }
  const safeFallback = Number.isNaN(fallbackDate.getTime())
    ? new Date()
    : fallbackDate;
  return safeFallback.toISOString().slice(0, 10);
}

export function sanitizeIsoYearMonth(
  rawYm: unknown,
  fallbackDate = new Date()
): string {
  if (typeof rawYm === "string" && /^\d{4}-\d{2}$/.test(rawYm.trim())) {
    const [y, m] = rawYm.trim().split("-").map(Number);
    if (y >= 1900 && y <= 2200 && m >= 1 && m <= 12) {
      return rawYm.trim();
    }
  }
  return fallbackDate.toISOString().slice(0, 7);
}

export function sanitizePlainText(rawText: unknown, maxLength = 500): string {
  if (typeof rawText !== "string") return "";
  return rawText
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeIcsText(rawText: string): string {
  return rawText
    .replace(/[\r\n]+/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .trim();
}

export function sanitizeSurahNumber(rawSurah: unknown, fallback = 1): number {
  const num = typeof rawSurah === "number" ? rawSurah : Number(rawSurah);
  if (!Number.isFinite(num)) return fallback;
  const intVal = Math.trunc(num);
  if (intVal < 1 || intVal > 114) return fallback;
  return intVal;
}

export function sanitizeVerseKey(rawKey: unknown, fallback = "1:1"): string {
  if (typeof rawKey !== "string") return fallback;
  const trimmed = rawKey.trim();
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(trimmed);
  if (!match) return fallback;
  const surah = Number(match[1]);
  const ayah = Number(match[2]);
  if (surah < 1 || surah > 114 || ayah < 1 || ayah > 286) {
    return fallback;
  }
  return `${surah}:${ayah}`;
}

export function sanitizePositiveInt(
  rawVal: unknown,
  fallback: number,
  min = 1,
  max = 300
): number {
  const num = typeof rawVal === "number" ? rawVal : Number(rawVal);
  if (!Number.isFinite(num)) return fallback;
  const intVal = Math.trunc(num);
  return Math.max(min, Math.min(max, intVal));
}

export function sanitizeResourceIdsCsv(
  rawCsv: unknown,
  fallbackIds: readonly number[] = [],
  maxCount = 5
): string {
  const unique = new Set<number>();
  if (typeof rawCsv === "string" && rawCsv.trim()) {
    for (const part of rawCsv.split(",")) {
      const token = part.trim();
      if (!/^\d{1,4}$/.test(token)) continue;
      const id = Number(token);
      if (id >= 1 && id <= 9999) {
        unique.add(id);
        if (unique.size >= maxCount) break;
      }
    }
  }
  if (unique.size === 0) {
    for (const rawId of fallbackIds) {
      const id = Math.trunc(Number(rawId));
      if (Number.isFinite(id) && id >= 1 && id <= 9999) {
        unique.add(id);
        if (unique.size >= maxCount) break;
      }
    }
  }
  return Array.from(unique).slice(0, maxCount).join(",");
}

const ALLOWED_QURAN_SCRIPTS: readonly QuranScriptType[] = [
  "uthmani",
  "uthmani_tajweed",
  "uthmani_simple",
  "imlaei",
  "indopak_nastaleeq",
];

export function sanitizeQuranScript(
  rawScript: unknown,
  fallback: QuranScriptType = "uthmani"
): QuranScriptType {
  if (typeof rawScript !== "string") return fallback;
  const clean = rawScript.trim().toLowerCase() as QuranScriptType;
  return ALLOWED_QURAN_SCRIPTS.includes(clean) ? clean : fallback;
}
