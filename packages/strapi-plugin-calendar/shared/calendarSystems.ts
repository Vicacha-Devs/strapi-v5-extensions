import type {
  AlternateDateValue,
  CalendarSourceMapping,
  CalendarSystemConfig,
  CalendarSystemFormatterFn,
} from './types';

/**
 * Standard Unicode CLDR / @internationalized/date calendar identifiers.
 * Covers global solar, lunar, and lunisolar calendar systems.
 */
export const SUPPORTED_INTL_CALENDARS: ReadonlyArray<{
  id: string;
  intlCalendar: string;
  defaultLabel: string;
}> = [
  { id: 'gregory', intlCalendar: 'gregory', defaultLabel: 'Gregorian' },
  { id: 'iso8601', intlCalendar: 'iso8601', defaultLabel: 'ISO 8601' },
  { id: 'islamic-umalqura', intlCalendar: 'islamic-umalqura', defaultLabel: 'Hijri (Umm al-Qura)' },
  { id: 'islamic-civil', intlCalendar: 'islamic-civil', defaultLabel: 'Hijri (Civil)' },
  { id: 'islamic-tbla', intlCalendar: 'islamic-tbla', defaultLabel: 'Hijri (Tabular)' },
  { id: 'hebrew', intlCalendar: 'hebrew', defaultLabel: 'Hebrew' },
  { id: 'persian', intlCalendar: 'persian', defaultLabel: 'Persian (Solar Hijri)' },
  { id: 'buddhist', intlCalendar: 'buddhist', defaultLabel: 'Buddhist' },
  { id: 'japanese', intlCalendar: 'japanese', defaultLabel: 'Japanese' },
  { id: 'chinese', intlCalendar: 'chinese', defaultLabel: 'Chinese Lunar' },
  { id: 'indian', intlCalendar: 'indian', defaultLabel: 'Indian National' },
  { id: 'coptic', intlCalendar: 'coptic', defaultLabel: 'Coptic' },
  { id: 'ethiopic', intlCalendar: 'ethiopic', defaultLabel: 'Ethiopic' },
];

const customFormatters = new Map<string, CalendarSystemFormatterFn>();

export function registerCalendarSystemFormatter(
  calendarId: string,
  formatter: CalendarSystemFormatterFn
): void {
  if (!calendarId || typeof formatter !== 'function') {
    throw new Error('Both calendarId and formatter function are required.');
  }
  customFormatters.set(calendarId, formatter);
}

export function unregisterCalendarSystemFormatter(calendarId: string): void {
  customFormatters.delete(calendarId);
}

export function getRegisteredCalendarFormatters(): ReadonlyMap<string, CalendarSystemFormatterFn> {
  return customFormatters;
}

export function applyDayOffset(date: Date, dayOffset?: number): Date {
  if (!dayOffset || !Number.isFinite(dayOffset)) {
    return date;
  }
  const offsetDays = Math.trunc(dayOffset);
  return new Date(date.getTime() + offsetDays * 86_400_000);
}

/**
 * Extracts numeric { year, month, day } parts for any Date in any Unicode CLDR calendar
 * (e.g. "islamic-umalqura", "hebrew", "persian", "gregory").
 * Used both for structured AlternateDateValue metadata and for RFC 7529 RSCALE
 * non-Gregorian recurrence matching!
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
  const calendarTag = (intlCalendar || 'gregory').trim().toLowerCase();

  try {
    const formatter = new Intl.DateTimeFormat(`en-u-ca-${calendarTag}-nu-latn`, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const parts = formatter.formatToParts(effectiveDate);
    let year = 0;
    let month = 0;
    let day = 0;
    for (const part of parts) {
      if (part.type === 'year' || (part.type as string) === 'relatedYear') {
        const parsedY = Number.parseInt(part.value.replace(/[^0-9]/g, ''), 10);
        if (Number.isFinite(parsedY)) year = parsedY;
      } else if (part.type === 'month') {
        const parsedM = Number.parseInt(part.value.replace(/[^0-9]/g, ''), 10);
        if (Number.isFinite(parsedM)) month = parsedM;
      } else if (part.type === 'day') {
        const parsedD = Number.parseInt(part.value.replace(/[^0-9]/g, ''), 10);
        if (Number.isFinite(parsedD)) day = parsedD;
      }
    }
    if (month >= 1 && day >= 1) {
      return { year, month, day };
    }
  } catch {
    // Fall back to UTC Gregorian parts
  }

  return {
    year: effectiveDate.getUTCFullYear(),
    month: effectiveDate.getUTCMonth() + 1,
    day: effectiveDate.getUTCDate(),
  };
}

/**
 * Formats an ISO date or YYYY-MM-DD string into a target CalendarSystemConfig.
 */
export function formatDateInCalendarSystem(
  isoOrDateKey: string,
  system: CalendarSystemConfig,
  locale = 'en',
  options?: { compact?: boolean }
): string {
  const rawDate = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDateKey)
    ? new Date(`${isoOrDateKey}T12:00:00.000Z`)
    : new Date(isoOrDateKey);

  if (Number.isNaN(rawDate.getTime())) {
    return '';
  }

  const effectiveDate = applyDayOffset(rawDate, system.dayOffset);
  const effectiveLocale = (system.locale || locale || 'en').split('-u-')[0];

  const customFn =
    customFormatters.get(system.id) ?? customFormatters.get(system.intlCalendar);
  if (customFn) {
    try {
      return customFn(effectiveDate, {
        locale: effectiveLocale,
        system,
        compact: Boolean(options?.compact),
      });
    } catch {
      // Fall back to Intl.DateTimeFormat if custom formatter throws
    }
  }

  const calendarTag = (system.intlCalendar || 'gregory').trim();
  try {
    const intlLocale = `${effectiveLocale}-u-ca-${calendarTag}`;
    const formatter = new Intl.DateTimeFormat(
      intlLocale,
      options?.compact
        ? {
            day: 'numeric',
            month: 'short',
            timeZone: 'UTC',
          }
        : {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }
    );
    return formatter.format(effectiveDate);
  } catch {
    try {
      const fallback = new Intl.DateTimeFormat('en-u-ca-gregory', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
      return fallback.format(effectiveDate);
    } catch {
      return isoOrDateKey.slice(0, 10);
    }
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
  const {
    occurrenceDate,
    baseDateKey,
    isRecurring,
    doc,
    source,
    secondaryCalendars = [],
    locale = 'en',
  } = params;

  const result: Record<string, AlternateDateValue> = {};
  const sourceAltFields = source.fields.alternateDateFields ?? {};
  const isBaseOccurrence = !isRecurring || occurrenceDate === baseDateKey;
  const docAltDatesMap =
    doc.alternateDates && typeof doc.alternateDates === 'object' && !Array.isArray(doc.alternateDates)
      ? (doc.alternateDates as Record<string, unknown>)
      : null;

  const rawDateObj = new Date(`${occurrenceDate}T12:00:00.000Z`);

  for (const sys of secondaryCalendars) {
    if (!sys || !sys.enabled || !sys.id) continue;

    const fieldName = sourceAltFields[sys.id] || sys.overrideField;
    const rawFieldVal = fieldName ? doc[fieldName] : undefined;
    const rawFieldOverride =
      typeof rawFieldVal === 'string' ? rawFieldVal.trim() : '';
    const rawJsonOverride =
      docAltDatesMap && typeof docAltDatesMap[sys.id] === 'string'
        ? String(docAltDatesMap[sys.id]).trim()
        : '';
    const rawOverride = rawFieldOverride || rawJsonOverride;

    const parts = extractCalendarParts(rawDateObj, sys.intlCalendar, sys.dayOffset ?? 0);

    if (rawOverride && isBaseOccurrence) {
      result[sys.id] = {
        calendarId: sys.id,
        label: sys.label || sys.id,
        formatted: rawOverride,
        compact: rawOverride,
        intlCalendar: sys.intlCalendar,
        year: parts?.year,
        month: parts?.month,
        day: parts?.day,
        isOverridden: true,
      };
      continue;
    }

    const formatted = formatDateInCalendarSystem(occurrenceDate, sys, locale, {
      compact: false,
    });
    const compact = formatDateInCalendarSystem(occurrenceDate, sys, locale, {
      compact: true,
    });

    if (formatted) {
      result[sys.id] = {
        calendarId: sys.id,
        label: sys.label || sys.id,
        formatted,
        compact: compact || formatted,
        intlCalendar: sys.intlCalendar,
        year: parts?.year,
        month: parts?.month,
        day: parts?.day,
        isOverridden: false,
      };
    }
  }

  for (const [calendarId, fieldName] of Object.entries(sourceAltFields)) {
    if (result[calendarId] || !fieldName) continue;
    const fieldVal = doc[fieldName];
    const rawVal = typeof fieldVal === 'string' ? fieldVal.trim() : '';
    if (rawVal && isBaseOccurrence) {
      result[calendarId] = {
        calendarId,
        label: calendarId,
        formatted: rawVal,
        compact: rawVal,
        isOverridden: true,
      };
    }
  }

  if (docAltDatesMap && isBaseOccurrence) {
    for (const [calendarId, val] of Object.entries(docAltDatesMap)) {
      if (result[calendarId]) continue;
      if (typeof val === 'string' && val.trim()) {
        result[calendarId] = {
          calendarId,
          label: calendarId,
          formatted: val.trim(),
          compact: val.trim(),
          isOverridden: true,
        };
      }
    }
  }

  return result;
}
