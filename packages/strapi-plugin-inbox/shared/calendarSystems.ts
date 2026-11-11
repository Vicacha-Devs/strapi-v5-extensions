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

export type CalendarSystemId = string;

export interface ConvertedCalendarDate {
  calendar: string;
  formatted: string;
  year?: number;
  month?: number;
  day?: number;
}

export function convertIsoDateToCalendar(
  isoDateString: string | null | undefined,
  calendar = "islamic-umalqura",
  locale = "en"
): ConvertedCalendarDate {
  if (!isoDateString) {
    return { calendar, formatted: "" };
  }
  const date = new Date(isoDateString);
  if (Number.isNaN(date.getTime())) {
    return { calendar, formatted: isoDateString };
  }

  try {
    const formatter = new Intl.DateTimeFormat(`${locale}-u-ca-${calendar}`, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
