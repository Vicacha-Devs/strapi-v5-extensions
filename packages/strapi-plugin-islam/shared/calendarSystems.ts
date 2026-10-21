import { SUPPORTED_INTL_CALENDARS } from '@vicacha-devs/strapi-plugin-calendar/shared';

export { SUPPORTED_INTL_CALENDARS };

export type CalendarSystemId = string;

export interface SecondaryDateDisplay {
  calendar: string;
  formatted: string;
  year?: number;
  month?: number;
  day?: number;
}

export function isSupportedCalendar(cal: unknown): cal is CalendarSystemId {
  if (typeof cal !== 'string' || !cal.trim()) return false;
  return SUPPORTED_INTL_CALENDARS.some((item) => item.id === cal.trim());
}
