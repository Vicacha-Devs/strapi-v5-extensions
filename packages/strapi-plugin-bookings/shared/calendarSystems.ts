import {
  extractCalendarParts,
  formatDateInCalendarSystem,
  type AlternateDateValue,
  type CalendarSystemConfig,
} from "@vicacha-devs/strapi-plugin-calendar/shared";

export {
  SUPPORTED_INTL_CALENDARS,
  applyDayOffset,
  extractCalendarParts,
  formatDateInCalendarSystem,
  getRegisteredCalendarFormatters,
  registerCalendarSystemFormatter,
  resolveOccurrenceAlternateDates,
  unregisterCalendarSystemFormatter,
  type AlternateDateValue,
  type CalendarSystemConfig,
  type CalendarSystemFormatterFn,
} from "@vicacha-devs/strapi-plugin-calendar/shared";

export function formatSecondaryCalendars(
  date: Date,
  systems: CalendarSystemConfig[],
  locale = "en"
): Record<string, AlternateDateValue> {
  const result: Record<string, AlternateDateValue> = {};
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return result;
  }
  const dateStr = date.toISOString().slice(0, 10);
  for (const sys of systems) {
    if (!sys || !sys.enabled || !sys.id) continue;
    const formatted = formatDateInCalendarSystem(dateStr, sys, locale, {
      compact: false,
    });
    const compact = formatDateInCalendarSystem(dateStr, sys, locale, {
      compact: true,
    });
    const parts = extractCalendarParts(
      date,
      sys.intlCalendar,
      sys.dayOffset ?? 0
    );
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
  return result;
}
