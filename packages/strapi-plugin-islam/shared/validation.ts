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
  NisabStandardId,
  QuranScriptType,
  SupportedCurrency,
  SupportedLocale,
} from "./types";

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

export function sanitizeNonNegativeNumber(
  rawVal: unknown,
  maxAllowed = 1_000_000_000_000
): number {
  const num = typeof rawVal === "number" ? rawVal : Number(rawVal);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(num, maxAllowed);
}

export function sanitizeIsoDateYmd(
  rawDate: unknown,
  fallbackDate = new Date()
): string {
  if (
    typeof rawDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())
  ) {
    const parsed = new Date(`${rawDate.trim()}T12:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) {
      return rawDate.trim();
    }
  }
  return fallbackDate.toISOString().slice(0, 10);
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
