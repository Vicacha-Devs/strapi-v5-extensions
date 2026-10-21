export interface SecondaryCalendarDate {
  calendar: string;
  formatted: string;
}

export function computeSecondaryDates(
  isoDateString: string | null | undefined,
  calendars: string[] = [],
  locale = 'en'
): SecondaryCalendarDate[] {
  if (!isoDateString || !Array.isArray(calendars) || calendars.length === 0) {
    return [];
  }
  const date = new Date(isoDateString);
  if (Number.isNaN(date.getTime())) {
    return [];
  }

  return calendars.map((calendar) => {
    try {
      const formatter = new Intl.DateTimeFormat(`${locale}-u-ca-${calendar}`, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      return {
        calendar,
        formatted: formatter.format(date),
      };
    } catch {
      return {
        calendar,
        formatted: date.toISOString().slice(0, 10),
      };
    }
  });
}
