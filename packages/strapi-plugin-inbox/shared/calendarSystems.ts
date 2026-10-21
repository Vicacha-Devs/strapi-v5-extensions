import { SUPPORTED_INTL_CALENDARS } from '@vicacha-devs/strapi-plugin-calendar/shared';

export { SUPPORTED_INTL_CALENDARS };

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
  calendar = 'islamic-umalqura',
  locale = 'en'
): ConvertedCalendarDate {
  if (!isoDateString) {
    return { calendar, formatted: '' };
  }
  const date = new Date(isoDateString);
  if (Number.isNaN(date.getTime())) {
    return { calendar, formatted: isoDateString };
  }

  try {
    const formatter = new Intl.DateTimeFormat(`${locale}-u-ca-${calendar}`, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    const year = Number(parts.find((p) => p.type === 'year')?.value) || undefined;
    const month = Number(parts.find((p) => p.type === 'month')?.value) || undefined;
    const day = Number(parts.find((p) => p.type === 'day')?.value) || undefined;

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
