export type RRuleFrequency = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type RRuleWeekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";
export type CalendarItemStatus = "scheduled" | "cancelled" | "postponed" | "rescheduled";
export type CalendarViewMode =
  | "dayGridMonth"
  | "timeGridWeek"
  | "timeGridDay"
  | "listMonth"
  | "multiMonthYear"
  | "multiMonthYearStacked"
  | "dayGridYear";

export interface OccurrenceOverride {
  /** Original occurrence ISO date (YYYY-MM-DD) */
  originalDate: string;
  /** Whether this specific occurrence is cancelled */
  cancelled?: boolean;
  /** Optional overridden start ISO datetime */
  startDate?: string;
  /** Optional overridden end ISO datetime */
  endDate?: string;
  /** Optional overridden title for this occurrence */
  title?: string;
  /** Optional overridden location for this occurrence */
  location?: string;
  /** Optional note for this occurrence */
  note?: string;
}

export interface RRuleFieldValue {
  /**
   * RFC 5545 / RFC 7529 RRULE string
   * e.g. "FREQ=WEEKLY;INTERVAL=1;BYDAY=FR"
   * or "RSCALE=ISLAMIC-UMALQURA;FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=1"
   */
  rrule: string;
  /** IANA timezone identifier (e.g. "UTC", "America/New_York", "America/Bogota") */
  timezone: string;
  /** Optional RFC 7529 non-Gregorian recurrence scale (e.g. "islamic-umalqura", "hebrew", "persian") */
  rscale?: string;
  /** Whether the entry spans full days */
  allDay?: boolean;
  /** Excluded occurrence dates in YYYY-MM-DD format */
  exdates?: string[];
  /** Per-occurrence overrides keyed by YYYY-MM-DD */
  overrides?: Record<string, OccurrenceOverride>;
}

export interface ParsedRRule {
  freq: RRuleFrequency;
  interval: number;
  byDay: RRuleWeekday[];
  byMonth?: number;
  byMonthDay?: number;
  rscale?: string;
  count?: number;
  until?: string;
}

export interface TimeSlotWindow {
  /** Start time in HH:mm:ss format (e.g. "09:00:00") */
  start: string;
  /** End time in HH:mm:ss format (e.g. "11:00:00") */
  end: string;
}

export interface BusinessHoursWindow {
  /** Days of week (0 = Sunday .. 6 = Saturday) */
  daysOfWeek: number[];
  /** Start time in HH:mm format (e.g. "08:00") */
  startTime: string;
  /** End time in HH:mm format (e.g. "18:00") */
  endTime: string;
}

export interface CalendarSystemConfig {
  /** Unique identifier for this calendar system (e.g. "hijri", "hebrew", "persian", "fiscal") */
  id: string;
  /** Human-readable display label (e.g. "Hijri (Umm al-Qura)", "Hebrew", "Persian") */
  label: string;
  /** Unicode BCP 47 / @internationalized/date calendar identifier or custom formatter ID */
  intlCalendar: string;
  /** Optional BCP 47 locale tag for formatting (defaults to current request/UI locale) */
  locale?: string;
  /** Optional day offset (-2 to +2) for lunar sighting or regional adjustments */
  dayOffset?: number;
  /** Optional document field name that overrides the auto-computed date when non-empty (e.g. "hijriDate") */
  overrideField?: string;
  /** Whether this calendar system is active in the Admin Calendar & Occurrence APIs */
  enabled: boolean;
}

export type CalendarSystemFormatterFn = (
  date: Date,
  context: {
    locale: string;
    system: CalendarSystemConfig;
    compact: boolean;
  }
) => string;

export interface AlternateDateValue {
  calendarId: string;
  label: string;
  formatted: string;
  compact?: string;
  intlCalendar?: string;
  year?: number;
  month?: number;
  day?: number;
  isOverridden?: boolean;
}

export interface CalendarSourceMapping {
  /** Unique identifier for this source mapping (e.g. "events", "bookings", "articles") */
  id: string;
  /** Human-readable label shown in Calendar filter pills */
  label: string;
  /** Strapi Content-Type UID (e.g. "api::event.event", "api::booking.booking") */
  uid: string;
  /** Hex color used on the calendar grid (e.g. "#0D9488") */
  color: string;
  /** Whether this source is enabled on the calendar & occurrence APIs */
  enabled: boolean;
  /** Field mapping on the target collection type */
  fields: {
    title: string;
    startDate: string;
    endDate?: string;
    rrule?: string;
    location?: string;
    category?: string;
    status?: string;
    summary?: string;
    slug?: string;
    color?: string;
    timeSlot?: string;
    /** Optional mapping of calendar system IDs to document override fields (e.g. { hijri: "hijriDate" }) */
    alternateDateFields?: Record<string, string>;
    /** Optional list of custom document attributes to pass through onto each ExpandedCalendarOccurrence */
    customFields?: string[];
  };
  /** Optional custom mapping from timeSlot enum values to start/end times */
  timeSlotMap?: Record<string, TimeSlotWindow>;
  /** Optional category-to-color overrides */
  categoryColors?: Record<string, string>;
  /** Default allDay flag when endDate is omitted and startDate is date-only */
  defaultAllDay?: boolean;
}

export interface RecurrencePreset {
  /** Unique identifier for the preset */
  id: string;
  /** Human-readable preset label */
  label: string;
  /** RFC 5545 / RFC 7529 RRULE string */
  rrule: string;
}

export interface DiscoveredContentTypeField {
  name: string;
  type: string;
}

export interface DiscoveredContentType {
  uid: string;
  displayName: string;
  kind: string;
  fields: DiscoveredContentTypeField[];
}

export type CalendarDirection = "ltr" | "rtl";
export type CalendarDirectionSetting = "auto" | "ltr" | "rtl";
export type WeekNumberCalculationMode = "local" | "ISO";
export type CalendarThemePreset =
  | "breeze"
  | "monarch"
  | "forma"
  | "pulse"
  | "classic"
  | "shadcn"
  | "mui"
  | "emerald"
  | "sand"
  | "midnight";
export type CalendarColorScheme = "auto" | "light" | "dark";
export type CalendarColorPaletteId =
  | "default"
  | "purple"
  | "blue"
  | "indigo"
  | "emerald"
  | "rose"
  | "amber";
export type SecondaryCalendarLanguageMode = "local" | "ar" | "off";

export * from "./themePalettes";
export * from "./themePresets";

export interface FullCalendarLocaleDefinition {
  /** BCP 47 locale code (e.g. "en", "es", "fr", "ar") */
  code: string;
  /** English display name */
  label: string;
  /** Native display name */
  nativeName: string;
  /** Default text direction for this locale */
  direction: CalendarDirection;
  /** Default week parameters (dow: 0=Sun..6=Sat, doy: min days in first week) */
  week: {
    dow: number;
    doy: number;
  };
  /** Localized button labels for FullCalendar */
  buttonText: {
    prev: string;
    next: string;
    today: string;
    year: string;
    month: string;
    week: string;
    day: string;
    list: string;
  };
  /** Week number column prefix (e.g. "Wk", "Sm", "KW", "أسبوع") */
  weekText: string;
  /** Label for all-day slot in TimeGrid */
  allDayText: string;
  /** Label for "+N more" popover link */
  moreLinkText: string;
  /** Empty state message in List / Agenda view */
  noEventsText: string;
}

export interface CalendarPluginSettings {
  /** Visual calendar theme preset ("breeze" by default) */
  theme?: CalendarThemePreset;
  /** Light or dark color scheme ("light" by default) */
  colorScheme?: CalendarColorScheme;
  /** Optional accent color palette override ("default" | "purple" | "blue" | "indigo" | "emerald" | "rose" | "amber") */
  themePalette?: CalendarColorPaletteId;
  /** Secondary calendar display language mode ("local" | "ar" | "off") */
  secondaryCalendarLanguage?: SecondaryCalendarLanguageMode;
  /** Default IANA timezone (e.g. "UTC") */
  defaultTimezone: string;
  /** Default FullCalendar locale ("auto" uses Strapi Admin locale, or explicit code e.g. "es", "ar") */
  defaultLocale?: string;
  /** Layout direction ("auto" derives from active locale, or explicit "ltr" | "rtl") */
  direction?: CalendarDirectionSetting;
  /** Default FullCalendar view mode */
  defaultView: CalendarViewMode;
  /** First day of week (0 = Sunday, 1 = Monday, 6 = Saturday) */
  firstDayOfWeek: number;
  /** Show week numbers on Month/Week grids */
  weekNumbers?: boolean;
  /** Week number calculation rule ("ISO" or "local") */
  weekNumberCalculation?: WeekNumberCalculationMode;
  /** Use 24-hour time formatting (true = 14:30, false = 2:30 PM) */
  timeFormat24h?: boolean;
  /** TimeGrid start time (e.g. "07:00:00") */
  startHour: string;
  /** TimeGrid end time (e.g. "21:00:00") */
  endHour: string;
  /** TimeGrid slot duration in HH:mm:ss (e.g. "00:30:00") */
  slotDuration: string;
  /** Primary accent color for the calendar */
  primaryColor: string;
  /** Show weekends on Month/Week grids */
  showWeekends: boolean;
  /** Show Today button in toolbar */
  showTodayButton: boolean;
  /** Show Quick-Create button in toolbar & allow slot selection */
  showCreateButton: boolean;
  /** Enable Month view tab */
  monthView: boolean;
  /** Enable Week TimeGrid view tab */
  weekView: boolean;
  /** Enable Day TimeGrid view tab */
  dayView: boolean;
  /** Enable Agenda List view tab */
  agendaView: boolean;
  /** Enable Multi-Month Year view tab */
  yearView: boolean;
  /** Business / Operating hours shaded on Week & Day TimeGrids */
  businessHours: BusinessHoursWindow[];
  /** Public iCal feed calendar name */
  feedTitle: string;
  /** Configured collection sources */
  sources: CalendarSourceMapping[];
  /** Optional secondary/alternative calendar systems (Hijri, Hebrew, Persian, Buddhist, or custom) */
  secondaryCalendars?: CalendarSystemConfig[];
  /** Configurable RRULE / RSCALE recurrence presets */
  recurrencePresets?: RecurrencePreset[];
}

export interface CalendarLinkSet {
  google: string;
  outlook: string;
  yahoo: string;
  icsPath: string;
}

export interface ExpandedCalendarOccurrence {
  /** Deterministic ID: `${sourceId}:${documentId}:${occurrenceDate}` */
  occurrenceId: string;
  /** Source mapping ID */
  sourceId: string;
  /** Source display label */
  sourceLabel: string;
  /** Strapi Content-Type UID */
  uid: string;
  /** Strapi v5 documentId */
  documentId: string;
  /** Document locale code when localized via Strapi i18n (e.g. "es", "en") */
  locale?: string;
  /** Occurrence date key (YYYY-MM-DD) */
  occurrenceDate: string;
  /** Effective start ISO timestamp */
  startDate: string;
  /** Effective end ISO timestamp */
  endDate: string;
  /** All-day flag */
  allDay: boolean;
  /** IANA timezone */
  timezone: string;
  /** Entry title */
  title: string;
  /** Optional slug */
  slug?: string;
  /** Optional summary */
  summary?: string;
  /** Physical location or venue */
  location?: string;
  /** Category string */
  category?: string;
  /** Lifecycle status */
  status: CalendarItemStatus;
  /** Hex badge color */
  color: string;
  /** Whether generated from an RRULE/RSCALE recurrence */
  isRecurring: boolean;
  /** Raw RRULE string if recurring */
  rrule?: string;
  /** Optional non-Gregorian RSCALE identifier */
  rscale?: string;
  /** Whether this specific occurrence has an override applied */
  isOverridden?: boolean;
  /** Add-to-calendar links */
  calendarLinks: CalendarLinkSet;
  /** Alternate calendar representations (e.g., Hijri, Hebrew, Persian, or custom date systems) */
  alternateDates?: Record<string, AlternateDateValue>;
  /** Custom fields extracted from the source document via `source.fields.customFields` */
  customFields?: Record<string, unknown>;
}
