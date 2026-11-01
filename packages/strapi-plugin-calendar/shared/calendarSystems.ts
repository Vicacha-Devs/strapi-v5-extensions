import type {
  AlternateDateValue,
  CalendarSourceMapping,
  CalendarSystemConfig,
  CalendarSystemFormatterFn,
} from "./types";

/**
 * Standard Unicode CLDR / @internationalized/date calendar identifiers.
 * Covers global solar, lunar, and lunisolar calendar systems.
 */
export const SUPPORTED_INTL_CALENDARS: ReadonlyArray<{
  id: string;
  intlCalendar: string;
  defaultLabel: string;
}> = [
  { id: "gregory", intlCalendar: "gregory", defaultLabel: "Gregorian" },
  { id: "iso8601", intlCalendar: "iso8601", defaultLabel: "ISO 8601" },
  {
    id: "islamic-umalqura",
    intlCalendar: "islamic-umalqura",
    defaultLabel: "Hijri (Umm al-Qura)",
  },
  {
    id: "islamic-civil",
    intlCalendar: "islamic-civil",
    defaultLabel: "Hijri (Civil)",
  },
  {
    id: "islamic-tbla",
    intlCalendar: "islamic-tbla",
    defaultLabel: "Hijri (Tabular)",
  },
  { id: "hebrew", intlCalendar: "hebrew", defaultLabel: "Hebrew" },
  {
    id: "persian",
    intlCalendar: "persian",
    defaultLabel: "Persian (Solar Hijri)",
  },
  { id: "buddhist", intlCalendar: "buddhist", defaultLabel: "Buddhist" },
  { id: "japanese", intlCalendar: "japanese", defaultLabel: "Japanese" },
  { id: "chinese", intlCalendar: "chinese", defaultLabel: "Chinese Lunar" },
  { id: "indian", intlCalendar: "indian", defaultLabel: "Indian National" },
  { id: "coptic", intlCalendar: "coptic", defaultLabel: "Coptic" },
  { id: "ethiopic", intlCalendar: "ethiopic", defaultLabel: "Ethiopic" },
];

const customFormatters = new Map<string, CalendarSystemFormatterFn>();

export function registerCalendarSystemFormatter(
  calendarId: string,
  formatter: CalendarSystemFormatterFn
): void {
  if (!calendarId || typeof formatter !== "function") {
    throw new Error("Both calendarId and formatter function are required.");
  }
  customFormatters.set(calendarId, formatter);
}

export function unregisterCalendarSystemFormatter(calendarId: string): void {
  customFormatters.delete(calendarId);
}

export function getRegisteredCalendarFormatters(): ReadonlyMap<
  string,
  CalendarSystemFormatterFn
> {
  return customFormatters;
}

export function applyDayOffset(date: Date, dayOffset?: number): Date {
  if (!dayOffset || !Number.isFinite(dayOffset)) {
    return date;
  }
  const offsetDays = Math.trunc(dayOffset);
  return new Date(date.getTime() + offsetDays * 86_400_000);
}

function parseDigits(raw: string): number {
  const n = Number.parseInt(raw.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

const INTL_PART_FIELD_MAP: Record<string, "year" | "month" | "day"> = {
  year: "year",
  relatedYear: "year",
  month: "month",
  day: "day",
};

function parseIntlPartsToYmd(
  parts: Intl.DateTimeFormatPart[]
): { year: number; month: number; day: number } | null {
  const ymd = { year: 0, month: 0, day: 0 };
  for (const part of parts) {
    const key = INTL_PART_FIELD_MAP[String(part.type)];
    if (!key) continue;
    const val = parseDigits(part.value);
    if (val > 0) ymd[key] = val;
  }
  return ymd.month >= 1 && ymd.day >= 1 ? ymd : null;
}

/**
 * Extracts numeric { year, month, day } parts for any Date in any Unicode CLDR calendar
 * (e.g. "islamic-umalqura", "hebrew", "persian", "gregory").
 */
export function extractCalendarParts(
  date: Date,
  intlCalendar: string,
  dayOffset = 0
): { year: number; month: number; day: number } | null {
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const effectiveDate = applyDayOffset(date, dayOffset);
  const calendarTag = (intlCalendar || "gregory").trim().toLowerCase();

  try {
    const formatter = new Intl.DateTimeFormat(
      `en-u-ca-${calendarTag}-nu-latn`,
      {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        timeZone: "UTC",
      }
    );
    const parsed = parseIntlPartsToYmd(formatter.formatToParts(effectiveDate));
    if (parsed) return parsed;
  } catch {
    // Fallback to UTC Gregorian parts below
  }

  return {
    year: effectiveDate.getUTCFullYear(),
    month: effectiveDate.getUTCMonth() + 1,
    day: effectiveDate.getUTCDate(),
  };
}

function resolveCalendarLocaleTag(
  systemLocale: string | undefined,
  fallbackLocale: string
): string {
  const rawLocale =
    systemLocale && systemLocale !== "auto"
      ? systemLocale
      : fallbackLocale && fallbackLocale !== "auto"
        ? fallbackLocale
        : "en";
  return rawLocale.split("-u-")[0];
}

function tryFormatWithCustomFormatter(
  effectiveDate: Date,
  system: CalendarSystemConfig,
  effectiveLocale: string,
  compact: boolean
): string | null {
  const customFn =
    customFormatters.get(system.id) ??
    customFormatters.get(system.intlCalendar);
  if (!customFn) return null;
  try {
    return customFn(effectiveDate, {
      locale: effectiveLocale,
      system,
      compact,
    });
  } catch {
    return null;
  }
}

function formatWithIntlFallback(
  effectiveDate: Date,
  isoOrDateKey: string,
  intlLocale: string,
  compact: boolean
): string {
  try {
    const formatter = new Intl.DateTimeFormat(
      intlLocale,
      compact
        ? { day: "numeric", month: "short", timeZone: "UTC" }
        : { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
    );
    return formatter.format(effectiveDate);
  } catch {
    try {
      const fallback = new Intl.DateTimeFormat("en-u-ca-gregory", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
      return fallback.format(effectiveDate);
    } catch {
      return isoOrDateKey.slice(0, 10);
    }
  }
}

/**
 * Formats an ISO date or YYYY-MM-DD string into a target CalendarSystemConfig.
 */
export function formatDateInCalendarSystem(
  isoOrDateKey: string,
  system: CalendarSystemConfig,
  locale = "en",
  options?: { compact?: boolean }
): string {
  const rawDate = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDateKey)
    ? new Date(`${isoOrDateKey}T12:00:00.000Z`)
    : new Date(isoOrDateKey);
  if (Number.isNaN(rawDate.getTime())) {
    return "";
  }

  const effectiveDate = applyDayOffset(rawDate, system.dayOffset);
  const effectiveLocale = resolveCalendarLocaleTag(system.locale, locale);
  const compact = Boolean(options?.compact);

  const customResult = tryFormatWithCustomFormatter(
    effectiveDate,
    system,
    effectiveLocale,
    compact
  );
  if (customResult !== null) {
    return customResult;
  }

  const calendarTag = (system.intlCalendar || "gregory").trim();
  return formatWithIntlFallback(
    effectiveDate,
    isoOrDateKey,
    `${effectiveLocale}-u-ca-${calendarTag}`,
    compact
  );
}

function readTrimmedString(val: unknown): string {
  return typeof val === "string" ? val.trim() : "";
}

function extractDocAltDatesMap(
  doc: Record<string, unknown>
): Record<string, unknown> | null {
  if (
    doc.alternateDates &&
    typeof doc.alternateDates === "object" &&
    !Array.isArray(doc.alternateDates)
  ) {
    return doc.alternateDates as Record<string, unknown>;
  }
  return null;
}

function resolveSystemOverrideText(
  sys: CalendarSystemConfig,
  doc: Record<string, unknown>,
  sourceAltFields: Record<string, string>,
  docAltDatesMap: Record<string, unknown> | null
): string {
  const fieldName = sourceAltFields[sys.id] || sys.overrideField;
  const rawFieldOverride = fieldName ? readTrimmedString(doc[fieldName]) : "";
  const rawJsonOverride = docAltDatesMap
    ? readTrimmedString(docAltDatesMap[sys.id])
    : "";
  return rawFieldOverride || rawJsonOverride;
}

function buildSingleSecondaryCalendarEntry(args: {
  sys: CalendarSystemConfig;
  occurrenceDate: string;
  rawDateObj: Date;
  isBaseOccurrence: boolean;
  doc: Record<string, unknown>;
  sourceAltFields: Record<string, string>;
  docAltDatesMap: Record<string, unknown> | null;
  locale: string;
}): AlternateDateValue | null {
  const {
    sys,
    occurrenceDate,
    rawDateObj,
    isBaseOccurrence,
    doc,
    sourceAltFields,
    docAltDatesMap,
    locale,
  } = args;
  const rawOverride = resolveSystemOverrideText(
    sys,
    doc,
    sourceAltFields,
    docAltDatesMap
  );
  const parts = extractCalendarParts(
    rawDateObj,
    sys.intlCalendar,
    sys.dayOffset ?? 0
  );
  const label = sys.label || sys.id;

  if (rawOverride && isBaseOccurrence) {
    return {
      calendarId: sys.id,
      label,
      formatted: rawOverride,
      compact: rawOverride,
      intlCalendar: sys.intlCalendar,
      year: parts?.year,
      month: parts?.month,
      day: parts?.day,
      isOverridden: true,
    };
  }

  const formatted = formatDateInCalendarSystem(occurrenceDate, sys, locale, {
    compact: false,
  });
  if (!formatted) return null;
  const compact = formatDateInCalendarSystem(occurrenceDate, sys, locale, {
    compact: true,
  });

  return {
    calendarId: sys.id,
    label,
    formatted,
    compact: compact || formatted,
    intlCalendar: sys.intlCalendar,
    year: parts?.year,
    month: parts?.month,
    day: parts?.day,
    isOverridden: false,
  };
}

function appendDirectSourceFieldOverrides(
  result: Record<string, AlternateDateValue>,
  sourceAltFields: Record<string, string>,
  doc: Record<string, unknown>
): void {
  for (const [calendarId, fieldName] of Object.entries(sourceAltFields)) {
    if (result[calendarId] || !fieldName) continue;
    const rawVal = readTrimmedString(doc[fieldName]);
    if (rawVal) {
      result[calendarId] = {
        calendarId,
        label: calendarId,
        formatted: rawVal,
        compact: rawVal,
        isOverridden: true,
      };
    }
  }
}

function appendJsonMapOverrides(
  result: Record<string, AlternateDateValue>,
  docAltDatesMap: Record<string, unknown>
): void {
  for (const [calendarId, val] of Object.entries(docAltDatesMap)) {
    if (result[calendarId]) continue;
    const trimmed = readTrimmedString(val);
    if (trimmed) {
      result[calendarId] = {
        calendarId,
        label: calendarId,
        formatted: trimmed,
        compact: trimmed,
        isOverridden: true,
      };
    }
  }
}

function populateSecondarySystems(args: {
  result: Record<string, AlternateDateValue>;
  secondaryCalendars: CalendarSystemConfig[];
  occurrenceDate: string;
  rawDateObj: Date;
  isBaseOccurrence: boolean;
  doc: Record<string, unknown>;
  sourceAltFields: Record<string, string>;
  docAltDatesMap: Record<string, unknown> | null;
  locale: string;
}): void {
  for (const sys of args.secondaryCalendars) {
    if (!sys?.enabled || !sys.id) continue;
    const entry = buildSingleSecondaryCalendarEntry({ ...args, sys });
    if (entry) args.result[sys.id] = entry;
  }
}

/**
 * Computes all alternate calendar representations for a calendar occurrence.
 */
export function resolveOccurrenceAlternateDates(params: {
  occurrenceDate: string;
  baseDateKey: string;
  isRecurring: boolean;
  doc: Record<string, unknown>;
  source: CalendarSourceMapping;
  secondaryCalendars?: CalendarSystemConfig[];
  locale?: string;
}): Record<string, AlternateDateValue> {
  const { occurrenceDate, baseDateKey, isRecurring, doc, source } = params;
  const result: Record<string, AlternateDateValue> = {};
  const sourceAltFields = source.fields.alternateDateFields ?? {};
  const isBaseOccurrence = !isRecurring || occurrenceDate === baseDateKey;
  const docAltDatesMap = extractDocAltDatesMap(doc);

  populateSecondarySystems({
    result,
    secondaryCalendars: params.secondaryCalendars ?? [],
    occurrenceDate,
    rawDateObj: new Date(`${occurrenceDate}T12:00:00.000Z`),
    isBaseOccurrence,
    doc,
    sourceAltFields,
    docAltDatesMap,
    locale: params.locale ?? "en",
  });

  if (isBaseOccurrence) {
    appendDirectSourceFieldOverrides(result, sourceAltFields, doc);
    if (docAltDatesMap) appendJsonMapOverrides(result, docAltDatesMap);
  }

  return result;
}
