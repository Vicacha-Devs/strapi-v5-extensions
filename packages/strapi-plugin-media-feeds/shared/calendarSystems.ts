import {
  extractCalendarParts,
  formatDateInCalendarSystem,
  type AlternateDateValue,
  type CalendarSystemConfig,
} from '@vicacha-devs/strapi-plugin-calendar/shared';

export type { AlternateDateValue, CalendarSystemConfig };

export function computeSecondaryDates(
  isoOrDateKey: string,
  systems: CalendarSystemConfig[] = [],
  rawDoc?: Record<string, unknown>,
  alternateDateFields?: Record<string, string>,
  locale = 'en'
): Record<string, AlternateDateValue> {
  const result: Record<string, AlternateDateValue> = {};
  const parsedDate = new Date(isoOrDateKey);
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const dateStr = safeDate.toISOString().slice(0, 10);

  for (const sys of systems) {
    if (!sys || !sys.enabled || !sys.id) continue;
    const overrideFieldName =
      alternateDateFields?.[sys.id] || sys.overrideField;
    const rawOverride =
      overrideFieldName && rawDoc && typeof rawDoc[overrideFieldName] === 'string'
        ? String(rawDoc[overrideFieldName]).trim()
        : '';

    const parts = extractCalendarParts(
      safeDate,
      sys.intlCalendar,
      sys.dayOffset ?? 0
    );

    if (rawOverride) {
      result[sys.id] = {
        calendarId: sys.id,
        label: sys.label || sys.id,
        formatted: rawOverride,
        compact: rawOverride,
        intlCalendar: sys.intlCalendar,
        year: parts?.year,
        month: parts?.month,
        day: parts?.day,
        isOverridden: true,
      };
      continue;
    }

    const formatted = formatDateInCalendarSystem(dateStr, sys, locale, {
      compact: false,
    });
    const compact = formatDateInCalendarSystem(dateStr, sys, locale, {
      compact: true,
    });

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
