import {
  formatDateInCalendarSystem,
  SUPPORTED_INTL_CALENDARS,
} from "../../../../shared/calendarSystems";
import type {
  CalendarSystemConfig,
  EventsPluginSettings,
  ExpandedOccurrence,
  RecurrencePreset,
} from "../../../../shared/types";

export const DEFAULT_RECURRENCE_PRESETS: RecurrencePreset[] = [
  { id: "daily", label: "Daily", rrule: "FREQ=DAILY;INTERVAL=1" },
  {
    id: "weekly-mon",
    label: "Weekly on Mondays",
    rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO",
  },
  {
    id: "weekly-tue",
    label: "Weekly on Tuesdays",
    rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=TU",
  },
  {
    id: "weekly-wed",
    label: "Weekly on Wednesdays",
    rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=WE",
  },
  {
    id: "weekly-thu",
    label: "Weekly on Thursdays",
    rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=TH",
  },
  {
    id: "weekly-fri",
    label: "Weekly on Fridays",
    rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=FR",
  },
  {
    id: "weekly-sat",
    label: "Weekly on Saturdays",
    rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=SA",
  },
  {
    id: "weekly-sun",
    label: "Weekly on Sundays",
    rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=SU",
  },
  { id: "monthly", label: "Monthly", rrule: "FREQ=MONTHLY;INTERVAL=1" },
  { id: "yearly", label: "Yearly", rrule: "FREQ=YEARLY;INTERVAL=1" },
];

export function buildMonthGridDays(year: number, month: number): Date[] {
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  const startDayOfWeek = firstDayOfMonth.getUTCDay();
  const gridStart = new Date(Date.UTC(year, month, 1 - startDayOfWeek));
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getTime() + i * 86400000));
  }
  return days;
}

export function buildWeekDays(anchor: Date): Date[] {
  const dayOfWeek = anchor.getUTCDay();
  const start = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate() - dayOfWeek)
  );
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(start.getTime() + i * 86400000));
  }
  return days;
}

export function groupOccurrencesByDate(
  occurrences: ExpandedOccurrence[]
): Record<string, ExpandedOccurrence[]> {
  const map: Record<string, ExpandedOccurrence[]> = {};
  for (const occ of occurrences) {
    if (!map[occ.occurrenceDate]) {
      map[occ.occurrenceDate] = [];
    }
    map[occ.occurrenceDate].push(occ);
  }
  return map;
}

export function extractAvailableCategories(occurrences: ExpandedOccurrence[]): string[] {
  const cats = new Set<string>();
  for (const occ of occurrences) {
    if (occ.category) cats.add(occ.category);
  }
  return Array.from(cats);
}

export function resolveActiveSecondaryCalendars(
  calendarOverlayId: string,
  settings: EventsPluginSettings | null
): CalendarSystemConfig[] {
  if (calendarOverlayId === "none") {
    return [];
  }
  if (calendarOverlayId === "configured") {
    return (settings?.secondaryCalendars ?? []).filter((c) => c.enabled);
  }
  const configuredMatch = (settings?.secondaryCalendars ?? []).find(
    (c) => c.id === calendarOverlayId || c.intlCalendar === calendarOverlayId
  );
  if (configuredMatch) {
    return [{ ...configuredMatch, enabled: true }];
  }
  const intlMatch = SUPPORTED_INTL_CALENDARS.find(
    (c) => c.id === calendarOverlayId || c.intlCalendar === calendarOverlayId
  );
  if (intlMatch) {
    return [
      {
        id: intlMatch.id,
        label: intlMatch.defaultLabel,
        intlCalendar: intlMatch.intlCalendar,
        enabled: true,
      },
    ];
  }
  return [];
}

export function formatSecondaryHeaderLabel(
  activeSecondaryCalendars: CalendarSystemConfig[],
  anchorDate: Date,
  locale: string
): string {
  if (activeSecondaryCalendars.length === 0) return "";
  const anchorIso = anchorDate.toISOString().slice(0, 10);
  return activeSecondaryCalendars
    .map((sys) => {
      const formatted = formatDateInCalendarSystem(anchorIso, sys, locale || "en", {
        compact: false,
      });
      return formatted ? `${sys.label}: ${formatted}` : "";
    })
    .filter(Boolean)
    .join(" • ");
}
