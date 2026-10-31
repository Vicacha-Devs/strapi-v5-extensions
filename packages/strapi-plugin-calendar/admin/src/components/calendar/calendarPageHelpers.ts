import {
  formatDateInCalendarSystem,
  SUPPORTED_INTL_CALENDARS,
} from '../../../../shared/calendarSystems';
import { getLocalizedCalendarBundle } from '../../../../shared/localization';
import type {
  CalendarPluginSettings,
  CalendarSourceMapping,
  CalendarSystemConfig,
  CalendarViewMode,
  ExpandedCalendarOccurrence,
  RecurrencePreset,
  RRuleWeekday,
  SecondaryCalendarLanguageMode,
} from '../../../../shared/types';

export const FALLBACK_RECURRENCE_PRESETS: RecurrencePreset[] = [
  { id: 'daily', label: 'Daily', rrule: 'FREQ=DAILY;INTERVAL=1' },
  { id: 'weekly-mon', label: 'Weekly on Mondays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO' },
  { id: 'weekly-tue', label: 'Weekly on Tuesdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=TU' },
  { id: 'weekly-wed', label: 'Weekly on Wednesdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=WE' },
  { id: 'weekly-thu', label: 'Weekly on Thursdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=TH' },
  { id: 'weekly-fri', label: 'Weekly on Fridays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=FR' },
  { id: 'weekly-sat', label: 'Weekly on Saturdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=SA' },
  { id: 'weekly-sun', label: 'Weekly on Sundays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=SU' },
  { id: 'monthly', label: 'Monthly', rrule: 'FREQ=MONTHLY;INTERVAL=1' },
  { id: 'yearly', label: 'Yearly', rrule: 'FREQ=YEARLY;INTERVAL=1' },
];

export const WEEKDAYS: Array<{
  code: RRuleWeekday;
  label: string;
  fullName: string;
  jsDay: number;
}> = [
  { code: 'MO', label: 'Mon', fullName: 'Monday', jsDay: 1 },
  { code: 'TU', label: 'Tue', fullName: 'Tuesday', jsDay: 2 },
  { code: 'WE', label: 'Wed', fullName: 'Wednesday', jsDay: 3 },
  { code: 'TH', label: 'Thu', fullName: 'Thursday', jsDay: 4 },
  { code: 'FR', label: 'Fri', fullName: 'Friday', jsDay: 5 },
  { code: 'SA', label: 'Sat', fullName: 'Saturday', jsDay: 6 },
  { code: 'SU', label: 'Sun', fullName: 'Sunday', jsDay: 0 },
];

function parseOptionalStartDate(startDate?: Date | string | null): Date | undefined {
  if (typeof startDate === 'string' && startDate.trim()) {
    const d = new Date(startDate);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (startDate instanceof Date && !Number.isNaN(startDate.getTime())) {
    return startDate;
  }
  return undefined;
}

export function buildOrderedRecurrencePresets(
  recurrencePresets: RecurrencePreset[],
  startDate?: Date | string | null
): RecurrencePreset[] {
  const byRRule = new Map<string, RecurrencePreset>();
  for (const def of FALLBACK_RECURRENCE_PRESETS) {
    byRRule.set(def.rrule, def);
  }
  for (const p of recurrencePresets) {
    if (p?.rrule) byRRule.set(p.rrule, p);
  }

  const parsedDate = parseOptionalStartDate(startDate);
  const activeWeekday = parsedDate
    ? WEEKDAYS.find((w) => w.jsDay === parsedDate.getDay())
    : undefined;

  const result: RecurrencePreset[] = [];
  if (activeWeekday) {
    const activeWeeklyRRule = `FREQ=WEEKLY;INTERVAL=1;BYDAY=${activeWeekday.code}`;
    result.push({
      id: `every-${activeWeekday.code.toLowerCase()}`,
      label: `Every ${activeWeekday.fullName}`,
      rrule: activeWeeklyRRule,
    });
    byRRule.delete(activeWeeklyRRule);
  }

  for (const coreRRule of [
    'FREQ=DAILY;INTERVAL=1',
    'FREQ=MONTHLY;INTERVAL=1',
    'FREQ=YEARLY;INTERVAL=1',
  ]) {
    const preset = byRRule.get(coreRRule);
    if (preset) {
      result.push(preset);
      byRRule.delete(coreRRule);
    }
  }

  for (const preset of byRRule.values()) {
    result.push(preset);
  }

  return result;
}

export function extractByDays(rrule: string): RRuleWeekday[] {
  const match = rrule.match(/BYDAY=([A-Z,]+)/i);
  if (!match?.[1]) return [];
  const validCodes = new Set<RRuleWeekday>(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);
  return match[1]
    .toUpperCase()
    .split(',')
    .map((d) => d.trim() as RRuleWeekday)
    .filter((d) => validCodes.has(d));
}

export function formatCategoryLabel(category: string): string {
  const trimmed = category.trim();
  if (!trimmed) return '';
  return trimmed
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function parseDateTimePickerValue(raw?: string): Date | undefined {
  if (!raw || !raw.trim()) return undefined;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    const localDt = new Date(y, m - 1, d, 9, 0, 0, 0);
    return Number.isNaN(localDt.getTime()) ? undefined : localDt;
  }
  const dt = new Date(trimmed);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

export function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function alignStartDateToWeekday(
  startStr: string,
  targetCode: RRuleWeekday
): string {
  if (!startStr) return startStr;
  const target = WEEKDAYS.find((w) => w.code === targetCode);
  if (!target) return startStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(startStr)) {
    const dt = new Date(`${startStr}T00:00:00.000Z`);
    if (Number.isNaN(dt.getTime())) return startStr;
    const currentDay = dt.getUTCDay();
    const diff = (target.jsDay - currentDay + 7) % 7;
    if (diff === 0) return startStr;
    dt.setUTCDate(dt.getUTCDate() + diff);
    return dt.toISOString().slice(0, 10);
  }
  const dt = new Date(startStr);
  if (Number.isNaN(dt.getTime())) return startStr;
  const currentDay = dt.getDay();
  const diff = (target.jsDay - currentDay + 7) % 7;
  if (diff === 0) return startStr;
  dt.setDate(dt.getDate() + diff);
  return dt.toISOString();
}

export function buildInitialDateWindow(): { from: string; to: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  return {
    from: new Date(Date.UTC(y, 0, 1, 0, 0, 0)).toISOString(),
    to: new Date(Date.UTC(y, 11, 31, 23, 59, 59)).toISOString(),
  };
}

export function expandDateWindowToYear(
  currentStart: Date,
  fromIso: string,
  toIso: string
): { from: string; to: string } {
  const year = currentStart.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();
  return {
    from: fromIso < yearStart ? fromIso : yearStart,
    to: toIso > yearEnd ? toIso : yearEnd,
  };
}

export function matchLoadedSourceId(
  loadedSources: CalendarSourceMapping[],
  sourceFilter: string
): string | null {
  if (!sourceFilter || sourceFilter === 'all') return null;
  if (loadedSources.some((s) => s.id === sourceFilter)) return sourceFilter;
  const matched = loadedSources.find(
    (s) =>
      s.uid === sourceFilter ||
      (sourceFilter === 'events' &&
        (s.id.includes('event') || s.uid.includes('event'))) ||
      (sourceFilter === 'bookings' &&
        (s.id.includes('booking') || s.uid.includes('booking')))
  );
  return matched ? matched.id : null;
}

export function normalizeSelectedEndSlot(startStr: string, endStr: string): string {
  if (!endStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(startStr) && /^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
    const startMs = new Date(`${startStr}T00:00:00.000Z`).getTime();
    const endMs = new Date(`${endStr}T00:00:00.000Z`).getTime();
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs - startMs <= 86400000) {
      return '';
    }
  }
  return endStr;
}

export function resolveActiveSecondaryCalendars(
  secondaryLangMode: SecondaryCalendarLanguageMode,
  configuredCalendars?: CalendarSystemConfig[]
): CalendarSystemConfig[] {
  if (secondaryLangMode === 'off') {
    return [];
  }
  const configured = (configuredCalendars ?? []).filter((c) => c.enabled);
  if (configured.length > 0) {
    return configured;
  }
  const hijriMatch = SUPPORTED_INTL_CALENDARS.find(
    (c) => c.id === 'islamic-umalqura'
  );
  return hijriMatch
    ? [
        {
          id: 'hijri',
          label: hijriMatch.defaultLabel,
          intlCalendar: hijriMatch.intlCalendar,
          enabled: true,
        },
      ]
    : [];
}

export function filterVisibleOccurrences(
  occurrences: ExpandedCalendarOccurrence[],
  sourceFilter: string
): ExpandedCalendarOccurrence[] {
  if (sourceFilter === 'all') return occurrences;
  return occurrences.filter(
    (occ) =>
      occ.sourceId === sourceFilter ||
      occ.uid === sourceFilter ||
      (sourceFilter === 'events' &&
        (occ.sourceId.includes('event') || occ.uid.includes('event'))) ||
      (sourceFilter === 'bookings' &&
        (occ.sourceId.includes('booking') || occ.uid.includes('booking')))
  );
}

export function computeSourceCounts(
  occurrences: ExpandedCalendarOccurrence[],
  sources?: CalendarSourceMapping[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const src of sources ?? []) {
    counts[src.id] = 0;
  }
  for (const occ of occurrences) {
    counts[occ.sourceId] = (counts[occ.sourceId] ?? 0) + 1;
  }
  return counts;
}

export function buildSecondaryHeaderLabel(
  activeSecondaryCalendars: CalendarSystemConfig[],
  anchorDate: Date,
  effectiveLocale: string,
  secondaryLangMode: SecondaryCalendarLanguageMode
): string {
  if (activeSecondaryCalendars.length === 0 || secondaryLangMode === 'off') return '';
  const anchorIso = anchorDate.toISOString().slice(0, 10);
  const targetLoc = secondaryLangMode === 'ar' ? 'ar-SA' : effectiveLocale;
  return activeSecondaryCalendars
    .map((sys) => {
      const formatted = formatDateInCalendarSystem(
        anchorIso,
        { ...sys, locale: targetLoc },
        targetLoc,
        { compact: false }
      );
      return formatted ? `${sys.label}: ${formatted}` : '';
    })
    .filter(Boolean)
    .join(' • ');
}

export function buildEnabledCalendarViews(
  settings: CalendarPluginSettings | null,
  effectiveLocale: string
): Array<{ mode: CalendarViewMode; label: string }> {
  const b = getLocalizedCalendarBundle(effectiveLocale).buttonText;
  const list: Array<{ mode: CalendarViewMode; label: string }> = [];
  if (settings?.monthView !== false) list.push({ mode: 'dayGridMonth', label: b.month });
  if (settings?.weekView !== false) list.push({ mode: 'timeGridWeek', label: b.week });
  if (settings?.dayView !== false) list.push({ mode: 'timeGridDay', label: b.day });
  if (settings?.agendaView !== false) list.push({ mode: 'listMonth', label: b.list });
  if (settings?.yearView !== false) list.push({ mode: 'multiMonthYear', label: b.year });
  return list;
}

export function mapOccurrencesToFullCalendarEvents(
  occurrences: ExpandedCalendarOccurrence[],
  primaryColor?: string
): Array<Record<string, unknown>> {
  const fallbackColor = primaryColor || '#0284C7';
  return occurrences.map((occ) => ({
    id: occ.occurrenceId,
    title: occ.title,
    start: occ.startDate,
    end: occ.endDate,
    allDay: occ.allDay,
    backgroundColor: occ.color || fallbackColor,
    borderColor: occ.color || fallbackColor,
    extendedProps: { occurrence: occ },
  }));
}

function addSourceCategoryKeys(
  cats: Set<string>,
  src: CalendarSourceMapping,
  sourceFilter: string
): void {
  if (src.enabled === false) return;
  if (sourceFilter && src.id !== sourceFilter) return;
  for (const key of Object.keys(src.categoryColors ?? {})) {
    if (key) cats.add(key);
  }
}

export function collectAvailableCategories(
  sources: CalendarSourceMapping[] | undefined,
  sourceFilter: string,
  visibleOccurrences: ExpandedCalendarOccurrence[]
): string[] {
  const cats = new Set<string>();
  for (const src of sources ?? []) {
    addSourceCategoryKeys(cats, src, sourceFilter);
  }
  for (const occ of visibleOccurrences) {
    if (occ.category) cats.add(occ.category);
  }
  return Array.from(cats);
}

function computeStartEndIsoPair(
  quickStart: string,
  quickEnd: string
): { startIso: string; endIso: string } {
  const startIso = quickStart.includes('T')
    ? new Date(quickStart).toISOString()
    : `${quickStart}T10:00:00.000Z`;
  const hasValidEnd = Boolean(quickEnd) && !Number.isNaN(new Date(quickEnd).getTime());
  const endIso = hasValidEnd
    ? new Date(quickEnd).toISOString()
    : new Date(new Date(startIso).getTime() + 3600000).toISOString();
  return { startIso, endIso };
}

export function buildQuickCreateRequestPayload(args: {
  quickSourceId: string;
  sourceFilter: string;
  quickTitle: string;
  quickStart: string;
  quickEnd: string;
  quickLocation: string;
  quickCategory: string;
  quickRRule: string;
  quickCustomerName: string;
  quickCustomerEmail: string;
  quickPartySize: number;
}): Record<string, unknown> {
  const { startIso, endIso } = computeStartEndIsoPair(args.quickStart, args.quickEnd);
  const targetSource =
    args.quickSourceId || (args.sourceFilter !== 'all' ? args.sourceFilter : undefined);
  return {
    sourceId: targetSource,
    title: args.quickTitle.trim(),
    startDate: startIso,
    endDate: endIso,
    location: args.quickLocation.trim() || undefined,
    category: args.quickCategory,
    rrule: args.quickRRule || undefined,
    customerName: args.quickCustomerName.trim() || undefined,
    customerEmail: args.quickCustomerEmail.trim() || undefined,
    partySize: args.quickPartySize || 1,
  };
}

interface GlobalCmI18nWindow {
  __CM_I18N_MESSAGES__?: Record<string, Record<string, string>>;
}

export function resolveActiveContentLocale(fallbackLocale?: string): string {
  if (typeof window !== 'undefined') {
    const urlLoc = new URLSearchParams(window.location.search).get('plugins[i18n][locale]');
    if (urlLoc) return urlLoc;
  }
  return fallbackLocale || 'en';
}

export function formatPluginMessageWithUrlLocale(
  pluginId: string,
  id: string,
  defaultMessage: string,
  formatMessage: (descriptor: { id: string; defaultMessage: string }) => string
): string {
  const fullKey = `${pluginId}.${id}`;
  if (typeof window !== 'undefined') {
    const urlLoc = new URLSearchParams(window.location.search).get('plugins[i18n][locale]');
    const globalMessages = (globalThis as unknown as GlobalCmI18nWindow).__CM_I18N_MESSAGES__;
    const override = urlLoc ? globalMessages?.[urlLoc]?.[fullKey] : undefined;
    if (override) return override;
  }
  return formatMessage({ id: fullKey, defaultMessage });
}

