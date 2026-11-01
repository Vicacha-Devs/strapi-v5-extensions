import {
  extractCalendarParts,
  formatDateInCalendarSystem,
  type AlternateDateValue,
  type CalendarSystemConfig,
} from "@vicacha-devs/strapi-plugin-calendar/shared";

export type { AlternateDateValue, CalendarSystemConfig };

function readOverrideDateString(
  sys: CalendarSystemConfig,
  rawDoc?: Record<string, unknown>,
  alternateDateFields?: Record<string, string>
): string {
  const overrideFieldName = alternateDateFields?.[sys.id] || sys.overrideField;
  if (
    !overrideFieldName ||
    !rawDoc ||
    typeof rawDoc[overrideFieldName] !== "string"
  ) {
    return "";
  }
  return String(rawDoc[overrideFieldName]).trim();
}

function computeSingleCalendarEntry(
  sys: CalendarSystemConfig,
  safeDate: Date,
  dateStr: string,
  rawOverride: string,
  locale: string
): AlternateDateValue | null {
  const parts = extractCalendarParts(
    safeDate,
    sys.intlCalendar,
    sys.dayOffset ?? 0
  );
  const label = sys.label || sys.id;

  if (rawOverride) {
    return {
      calendarId: sys.id,
      label,
      formatted: rawOverride,
      compact: rawOverride,
      intlCalendar: sys.intlCalendar,
      year: parts?.year,
      month: parts?.month,
      day: parts?.day,
      isOverridden: true,
    };
  }

  const formatted = formatDateInCalendarSystem(dateStr, sys, locale, {
    compact: false,
  });
  if (!formatted) return null;

  const compact = formatDateInCalendarSystem(dateStr, sys, locale, {
    compact: true,
  });

  return {
    calendarId: sys.id,
    label,
    formatted,
    compact: compact || formatted,
    intlCalendar: sys.intlCalendar,
    year: parts?.year,
    month: parts?.month,
    day: parts?.day,
    isOverridden: false,
  };
}

export function computeSecondaryDates(
  isoOrDateKey: string,
  systems: CalendarSystemConfig[] = [],
  rawDoc?: Record<string, unknown>,
  alternateDateFields?: Record<string, string>,
  locale = "en"
): Record<string, AlternateDateValue> {
  const result: Record<string, AlternateDateValue> = {};
  const parsedDate = new Date(isoOrDateKey);
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const dateStr = safeDate.toISOString().slice(0, 10);

  for (const sys of systems) {
    if (!sys || !sys.enabled || !sys.id) continue;
    const rawOverride = readOverrideDateString(
      sys,
      rawDoc,
      alternateDateFields
    );
    const entry = computeSingleCalendarEntry(
      sys,
      safeDate,
      dateStr,
      rawOverride,
      locale
    );
    if (entry) {
      result[sys.id] = entry;
    }
  }

  return result;
}
