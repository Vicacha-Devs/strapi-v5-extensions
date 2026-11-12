/**
 * Shared Unicode CLDR calendar registry and secondary liturgical/civil date
 * formatting helpers across @vicacha-devs Strapi v5 plugins.
 */

export interface SupportedIntlCalendar {
  readonly id: string;
  readonly intlCalendar: string;
  readonly defaultLabel: string;
}

export const SUPPORTED_INTL_CALENDARS: ReadonlyArray<SupportedIntlCalendar> =
  Object.freeze([
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
  ]);

export const SECONDARY_CALENDAR_IDS: readonly string[] = Object.freeze([
  "none",
  ...SUPPORTED_INTL_CALENDARS.map((item) => item.id),
]);

export type CalendarSystemId = string;
export type SecondaryCalendarId = string;

export interface SecondaryDateDisplay {
  calendar: string;
  formatted: string;
  year?: number;
  month?: number;
  day?: number;
}

const BASE_BCP47_REGEX = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/;

export function isSupportedCalendar(
  cal: unknown,
  options?: { allowNone?: boolean }
): cal is CalendarSystemId {
  if (typeof cal !== "string") return false;
  const trimmed = cal.trim();
  if (!trimmed) return false;
  if (options?.allowNone !== false && trimmed === "none") return true;
  return SUPPORTED_INTL_CALENDARS.some((item) => item.id === trimmed);
}

export function sanitizeCalendarBaseLocale(
  locale: unknown,
  fallbackLocale = "es"
): string {
  if (typeof locale !== "string" || !locale.trim()) {
    return fallbackLocale;
  }
  const trimmed = locale.trim();
  const uIdx = trimmed.toLowerCase().indexOf("-u-");
  let stripped = uIdx >= 0 ? trimmed.slice(0, uIdx) : trimmed;
  while (stripped.endsWith("-")) {
    stripped = stripped.slice(0, -1);
  }
  if (!stripped || stripped.length > 35 || !BASE_BCP47_REGEX.test(stripped)) {
    return fallbackLocale;
  }
  return stripped;
}

export function formatSecondaryDate(
  isoDateString: string | null | undefined,
  calendar = "islamic-umalqura",
  locale = "es"
): SecondaryDateDisplay {
  if (!isoDateString || calendar === "none") {
    return { calendar, formatted: "" };
  }
  const date = new Date(isoDateString);
  if (Number.isNaN(date.getTime())) {
    return { calendar, formatted: isoDateString };
  }

  try {
    const baseLocale = sanitizeCalendarBaseLocale(locale);
    const formatter = new Intl.DateTimeFormat(
      `${baseLocale}-u-ca-${calendar}`,
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
    const parts = formatter.formatToParts(date);
    const year =
      Number(parts.find((p) => p.type === "year")?.value) || undefined;
    const month =
      Number(parts.find((p) => p.type === "month")?.value) || undefined;
    const day = Number(parts.find((p) => p.type === "day")?.value) || undefined;

    return {
      calendar,
      formatted: formatter.format(date),
      year,
      month,
      day,
    };
  } catch {
    return {
      calendar,
      formatted: date.toISOString().slice(0, 10),
    };
  }
}

export function formatSecondaryCalendarDate(
  isoDateString: string | null | undefined,
  calendar = "islamic-umalqura",
  locale = "es"
): string {
  return formatSecondaryDate(isoDateString, calendar, locale).formatted;
}
