import { formatSecondaryDate } from "@vicacha-devs/plugin-shared";

export interface SecondaryCalendarDate {
  calendar: string;
  formatted: string;
}

export function computeSecondaryDates(
  isoDateString: string | null | undefined,
  calendars: string[] = [],
  locale = "en"
): SecondaryCalendarDate[] {
  if (!isoDateString || !Array.isArray(calendars) || calendars.length === 0) {
    return [];
  }
  const date = new Date(isoDateString);
  if (Number.isNaN(date.getTime())) {
    return [];
  }

  return calendars.map((calendar) => {
    const res = formatSecondaryDate(isoDateString, calendar, locale);
    return {
      calendar,
      formatted: res.formatted,
    };
  });
}
