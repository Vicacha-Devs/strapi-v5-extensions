import {
  SUPPORTED_INTL_CALENDARS,
  formatSecondaryDate,
  isSupportedCalendar as isSupportedCalendarShared,
  type CalendarSystemId,
  type SecondaryDateDisplay,
} from "@vicacha-devs/plugin-shared";

export {
  SUPPORTED_INTL_CALENDARS,
  formatSecondaryDate,
  type CalendarSystemId,
  type SecondaryDateDisplay,
};

export function isSupportedCalendar(cal: unknown): cal is CalendarSystemId {
  return isSupportedCalendarShared(cal, { allowNone: false });
}
