import {
  SUPPORTED_INTL_CALENDARS,
  formatSecondaryDate,
  type CalendarSystemId,
  type SecondaryDateDisplay,
} from "@vicacha-devs/plugin-shared";

export { SUPPORTED_INTL_CALENDARS, type CalendarSystemId };

export type ConvertedCalendarDate = SecondaryDateDisplay;

export function convertIsoDateToCalendar(
  isoDateString: string | null | undefined,
  calendar = "islamic-umalqura",
  locale = "en"
): ConvertedCalendarDate {
  return formatSecondaryDate(isoDateString, calendar, locale);
}
