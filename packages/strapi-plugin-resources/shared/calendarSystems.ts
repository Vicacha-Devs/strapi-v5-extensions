import { SUPPORTED_INTL_CALENDARS } from "@vicacha-devs/strapi-plugin-calendar/shared";

export { SUPPORTED_INTL_CALENDARS };

export type CalendarSystemId = string;
export type SecondaryCalendarId = string;

const BASE_BCP47_REGEX = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/;

export const SECONDARY_CALENDAR_IDS: readonly string[] = [
  "none",
  ...SUPPORTED_INTL_CALENDARS.map((item) => item.id),
];

export interface SecondaryDateDisplay {
  calendar: string;
  formatted: string;
  year?: number;
  month?: number;
  day?: number;
}

export function isSupportedCalendar(cal: unknown): cal is CalendarSystemId {
  if (typeof cal !== "string" || !cal.trim()) return false;
  if (cal.trim() === "none") return true;
  return SUPPORTED_INTL_CALENDARS.some((item) => item.id === cal.trim());
}

function sanitizeCalendarBaseLocale(locale: unknown): string {
  if (typeof locale !== "string" || !locale.trim()) {
    return "es";
  }
  const trimmed = locale.trim();
  const uIdx = trimmed.toLowerCase().indexOf("-u-");
  let stripped = uIdx >= 0 ? trimmed.slice(0, uIdx) : trimmed;
  while (stripped.endsWith("-")) {
    stripped = stripped.slice(0, -1);
  }
  if (!stripped || stripped.length > 35 || !BASE_BCP47_REGEX.test(stripped)) {
    return "es";
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
