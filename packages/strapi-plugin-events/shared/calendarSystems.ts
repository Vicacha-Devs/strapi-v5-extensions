/**
 * Re-exports multi-calendar systems (CLDR + custom formatters) from
 * @vicacha-devs/strapi-plugin-calendar so strapi-plugin-events shares a single
 * calendar engine across the monorepo.
 */
export {
  SUPPORTED_INTL_CALENDARS,
  applyDayOffset,
  extractCalendarParts,
  formatDateInCalendarSystem,
  getRegisteredCalendarFormatters,
  registerCalendarSystemFormatter,
  resolveOccurrenceAlternateDates,
  unregisterCalendarSystemFormatter,
} from '@vicacha-devs/strapi-plugin-calendar/shared';
