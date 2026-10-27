export type RRuleFrequency = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type RRuleWeekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';
export type CalendarItemStatus =
  | 'scheduled'
  | 'cancelled'
  | 'postponed'
  | 'rescheduled';
export type CalendarViewMode =
  | 'dayGridMonth'
  | 'timeGridWeek'
  | 'timeGridDay'
  | 'listMonth'
  | 'multiMonthYear'
  | 'multiMonthYearStacked'
  | 'dayGridYear';

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

export type CalendarDirection = 'ltr' | 'rtl';
export type CalendarDirectionSetting = 'auto' | 'ltr' | 'rtl';
export type WeekNumberCalculationMode = 'local' | 'ISO';
export type CalendarThemePreset =
  | 'breeze'
  | 'monarch'
  | 'forma'
  | 'pulse'
  | 'classic'
  | 'shadcn'
  | 'mui'
  | 'emerald'
  | 'sand'
  | 'midnight';
export type CalendarColorScheme = 'auto' | 'light' | 'dark';
export type CalendarColorPaletteId =
  | 'default'
  | 'purple'
  | 'blue'
  | 'indigo'
  | 'emerald'
  | 'rose'
  | 'amber';
export type SecondaryCalendarLanguageMode = 'local' | 'ar' | 'off';

export interface CalendarColorPaletteDefinition {
  id: CalendarColorPaletteId;
  label: string;
  lightPrimary: string;
  darkPrimary: string;
  lightHeaderBg: string;
  lightHeaderText: string;
  lightTodayBg: string;
  lightBadgeBg: string;
  lightBadgeText: string;
  lightBadgeBorder: string;
  darkHeaderBg: string;
  darkHeaderText: string;
  darkTodayBg: string;
  darkBadgeBg: string;
  darkBadgeText: string;
  darkBadgeBorder: string;
}

export const CALENDAR_COLOR_PALETTES: Record<
  CalendarColorPaletteId,
  CalendarColorPaletteDefinition
> = {
  default: {
    id: 'default',
    label: 'Theme Default',
    lightPrimary: '#0284C7',
    darkPrimary: '#38BDF8',
    lightHeaderBg: '#E0F2FE',
    lightHeaderText: '#0C4A6E',
    lightTodayBg: '#F0F9FF',
    lightBadgeBg: '#E0F2FE',
    lightBadgeText: '#0369A1',
    lightBadgeBorder: '#7DD3FC',
    darkHeaderBg: '#1E293B',
    darkHeaderText: '#E2E8F0',
    darkTodayBg: '#172554',
    darkBadgeBg: '#1E293B',
    darkBadgeText: '#7DD3FC',
    darkBadgeBorder: '#0369A1',
  },
  purple: {
    id: 'purple',
    label: 'Monarch Purple',
    lightPrimary: '#6750A4',
    darkPrimary: '#D0BCFF',
    lightHeaderBg: '#F3EDF7',
    lightHeaderText: '#381E72',
    lightTodayBg: '#F7F2FA',
    lightBadgeBg: '#EADDFF',
    lightBadgeText: '#4F378B',
    lightBadgeBorder: '#D0BCFF',
    darkHeaderBg: '#211F26',
    darkHeaderText: '#E6E0E9',
    darkTodayBg: '#2B223C',
    darkBadgeBg: '#381E72',
    darkBadgeText: '#EADDFF',
    darkBadgeBorder: '#4F378B',
  },
  blue: {
    id: 'blue',
    label: 'Forma / Pulse Blue',
    lightPrimary: '#0F6CBD',
    darkPrimary: '#60A5FA',
    lightHeaderBg: '#EFF6FC',
    lightHeaderText: '#0A4478',
    lightTodayBg: '#F0F7FF',
    lightBadgeBg: '#DBEAFE',
    lightBadgeText: '#1E40AF',
    lightBadgeBorder: '#93C5FD',
    darkHeaderBg: '#172130',
    darkHeaderText: '#DBEAFE',
    darkTodayBg: '#172554',
    darkBadgeBg: '#1E3A8A',
    darkBadgeText: '#BFDBFE',
    darkBadgeBorder: '#2563EB',
  },
  indigo: {
    id: 'indigo',
    label: 'Breezy Indigo',
    lightPrimary: '#4F46E5',
    darkPrimary: '#818CF8',
    lightHeaderBg: '#EEF2FF',
    lightHeaderText: '#312E81',
    lightTodayBg: '#EEF2FF',
    lightBadgeBg: '#E0E7FF',
    lightBadgeText: '#3730A3',
    lightBadgeBorder: '#A5B4FC',
    darkHeaderBg: '#1E1B4B',
    darkHeaderText: '#E0E7FF',
    darkTodayBg: '#1E1B4B',
    darkBadgeBg: '#312E81',
    darkBadgeText: '#C7D2FE',
    darkBadgeBorder: '#4F46E5',
  },
  emerald: {
    id: 'emerald',
    label: 'Emerald Green',
    lightPrimary: '#059669',
    darkPrimary: '#34D399',
    lightHeaderBg: '#ECFDF5',
    lightHeaderText: '#065F46',
    lightTodayBg: '#F0FDF4',
    lightBadgeBg: '#D1FAE5',
    lightBadgeText: '#065F46',
    lightBadgeBorder: '#6EE7B7',
    darkHeaderBg: '#064E3B',
    darkHeaderText: '#D1FAE5',
    darkTodayBg: '#064E3B',
    darkBadgeBg: '#065F46',
    darkBadgeText: '#A7F3D0',
    darkBadgeBorder: '#059669',
  },
  rose: {
    id: 'rose',
    label: 'Pulse Rose',
    lightPrimary: '#E11D48',
    darkPrimary: '#FB7185',
    lightHeaderBg: '#FFF1F2',
    lightHeaderText: '#881337',
    lightTodayBg: '#FFF1F2',
    lightBadgeBg: '#FFE4E6',
    lightBadgeText: '#9F1239',
    lightBadgeBorder: '#FDA4AF',
    darkHeaderBg: '#3B0A19',
    darkHeaderText: '#FFE4E6',
    darkTodayBg: '#4C0519',
    darkBadgeBg: '#881337',
    darkBadgeText: '#FECDD3',
    darkBadgeBorder: '#E11D48',
  },
  amber: {
    id: 'amber',
    label: 'Monarch Amber',
    lightPrimary: '#D97706',
    darkPrimary: '#FBBF24',
    lightHeaderBg: '#FFFBEB',
    lightHeaderText: '#78350F',
    lightTodayBg: '#FEF3C7',
    lightBadgeBg: '#FEF3C7',
    lightBadgeText: '#92400E',
    lightBadgeBorder: '#FCD34D',
    darkHeaderBg: '#3B2506',
    darkHeaderText: '#FEF3C7',
    darkTodayBg: '#451A03',
    darkBadgeBg: '#78350F',
    darkBadgeText: '#FDE68A',
    darkBadgeBorder: '#D97706',
  },
};

export interface CalendarThemeDefinition {
  id: CalendarThemePreset;
  label: string;
  description: string;
  category?: 'modern' | 'design-system' | 'heritage';
  fontFamily?: string;
  containerRadius?: string;
  containerShadow?: string;
  eventRadius?: string;
  eventStyle?: 'solid' | 'tinted' | 'accent-bar';
  dayNumberAlign?: 'start' | 'center' | 'end';
  todayHeaderAccent?: 'pill' | 'top-bar' | 'tint';
  primaryColor: string;
  headerBg: string;
  headerText: string;
  cellBg: string;
  cellAltBg: string;
  cellHoverBg: string;
  cellText: string;
  cellMutedText: string;
  borderColor: string;
  todayBg: string;
  todayBorder: string;
  todayNumberBg: string;
  todayNumberText: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const CALENDAR_THEME_PRESETS: Record<
  CalendarThemePreset,
  CalendarThemeDefinition
> = {
  breeze: {
    id: 'breeze',
    label: 'Breezy (Modern Default)',
    description:
      'FullCalendar Breezy style — airy sky & slate grid, soft-tinted event pills, and rounded-lg container',
    category: 'modern',
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
    containerRadius: '10px',
    containerShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
    eventRadius: '6px',
    eventStyle: 'tinted',
    dayNumberAlign: 'start',
    todayHeaderAccent: 'pill',
    primaryColor: '#0284C7',
    headerBg: '#F8FAFC',
    headerText: '#0F172A',
    cellBg: '#FFFFFF',
    cellAltBg: '#F8FAFC',
    cellHoverBg: '#F0F9FF',
    cellText: '#111827',
    cellMutedText: '#6B7280',
    borderColor: '#E5E7EB',
    todayBg: '#F0F9FF',
    todayBorder: '#0284C7',
    todayNumberBg: '#0284C7',
    todayNumberText: '#FFFFFF',
    badgeBg: '#E0F2FE',
    badgeText: '#0369A1',
    badgeBorder: '#7DD3FC',
  },
  monarch: {
    id: 'monarch',
    label: 'Monarch (Material 3)',
    description:
      'FullCalendar Monarch style — pill-shaped headers, centered day badges, tonal surfaces & rounded-xl frame',
    category: 'modern',
    fontFamily: "'Roboto Variable', Roboto, system-ui, sans-serif",
    containerRadius: '14px',
    containerShadow: '0 2px 8px rgba(103, 80, 164, 0.08)',
    eventRadius: '6px',
    eventStyle: 'solid',
    dayNumberAlign: 'center',
    todayHeaderAccent: 'pill',
    primaryColor: '#6750A4',
    headerBg: '#F7F2FA',
    headerText: '#1D1B20',
    cellBg: '#FFFFFF',
    cellAltBg: '#FAF8FC',
    cellHoverBg: '#F3EDF7',
    cellText: '#0C090C',
    cellMutedText: '#79747E',
    borderColor: '#DEDCE1',
    todayBg: '#F7F2FA',
    todayBorder: '#6750A4',
    todayNumberBg: '#895264',
    todayNumberText: '#FFFFFF',
    badgeBg: '#EADDFF',
    badgeText: '#4F378B',
    badgeBorder: '#D0BCFF',
  },
  forma: {
    id: 'forma',
    label: 'Forma (Fluent Enterprise)',
    description:
      'FullCalendar Forma style — architectural 6px left-accent event bars, top-accent Today bar & crisp 4px corners',
    category: 'modern',
    fontFamily: "'Noto Sans Variable', 'Noto Sans', system-ui, sans-serif",
    containerRadius: '4px',
    containerShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
    eventRadius: '3px',
    eventStyle: 'accent-bar',
    dayNumberAlign: 'start',
    todayHeaderAccent: 'top-bar',
    primaryColor: '#0F6CBD',
    headerBg: '#FFFFFF',
    headerText: '#030712',
    cellBg: '#FFFFFF',
    cellAltBg: '#F9FAFB',
    cellHoverBg: '#EFF6FC',
    cellText: '#030712',
    cellMutedText: '#6B7280',
    borderColor: '#E0E0E0',
    todayBg: '#F5F9FF',
    todayBorder: '#0F6CBD',
    todayNumberBg: '#0F6CBD',
    todayNumberText: '#FFFFFF',
    badgeBg: '#EFF6FC',
    badgeText: '#0F6CBD',
    badgeBorder: '#B4D6FA',
  },
  pulse: {
    id: 'pulse',
    label: 'Pulse (Apple / macOS)',
    description:
      'FullCalendar Pulse style — right-aligned day numbers, crimson Today circle, elevated controls & dotted minor slots',
    category: 'modern',
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    containerRadius: '8px',
    containerShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
    eventRadius: '6px',
    eventStyle: 'solid',
    dayNumberAlign: 'end',
    todayHeaderAccent: 'pill',
    primaryColor: '#117AFF',
    headerBg: '#FFFFFF',
    headerText: '#232D3E',
    cellBg: '#FFFFFF',
    cellAltBg: '#F9FAFB',
    cellHoverBg: '#F0F7FF',
    cellText: '#232D3E',
    cellMutedText: '#545C6C',
    borderColor: '#E5E7EB',
    todayBg: '#FFF5F5',
    todayBorder: '#FD453B',
    todayNumberBg: '#FD453B',
    todayNumberText: '#FFFFFF',
    badgeBg: '#EFF6FF',
    badgeText: '#1D4ED8',
    badgeBorder: '#BFDBFE',
  },
  classic: {
    id: 'classic',
    label: 'Classic (FullCalendar Standard)',
    description:
      'Traditional FullCalendar v6/v7 studio grid with slate headers, warm yellow Today cell tint & solid events',
    category: 'modern',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    containerRadius: '6px',
    containerShadow: 'none',
    eventRadius: '4px',
    eventStyle: 'solid',
    dayNumberAlign: 'end',
    todayHeaderAccent: 'tint',
    primaryColor: '#3788D8',
    headerBg: '#F8FAFC',
    headerText: '#1E293B',
    cellBg: '#FFFFFF',
    cellAltBg: '#F8FAFC',
    cellHoverBg: '#F1F5F9',
    cellText: '#030712',
    cellMutedText: '#6B7280',
    borderColor: '#DDDDDD',
    todayBg: '#FEFCE8',
    todayBorder: '#EAB308',
    todayNumberBg: '#334155',
    todayNumberText: '#FFFFFF',
    badgeBg: '#F1F5F9',
    badgeText: '#334155',
    badgeBorder: '#CBD5E1',
  },
  shadcn: {
    id: 'shadcn',
    label: 'Shadcn UI (Zinc Minimal)',
    description:
      'Design-system theme matching Shadcn UI — ultra-clean 1px zinc borders, monochrome primary & tinted badges',
    category: 'design-system',
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
    containerRadius: '8px',
    containerShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    eventRadius: '5px',
    eventStyle: 'tinted',
    dayNumberAlign: 'start',
    todayHeaderAccent: 'pill',
    primaryColor: '#18181B',
    headerBg: '#FAFAFA',
    headerText: '#09090B',
    cellBg: '#FFFFFF',
    cellAltBg: '#FAFAFA',
    cellHoverBg: '#F4F4F5',
    cellText: '#09090B',
    cellMutedText: '#71717A',
    borderColor: '#E4E4E7',
    todayBg: '#F4F4F5',
    todayBorder: '#18181B',
    todayNumberBg: '#18181B',
    todayNumberText: '#FAFAFA',
    badgeBg: '#F4F4F5',
    badgeText: '#18181B',
    badgeBorder: '#D4D4D8',
  },
  mui: {
    id: 'mui',
    label: 'Material UI (MUI Paper)',
    description:
      'Design-system theme matching Material UI — Paper surface elevation, Roboto uppercase headers & Material blue',
    category: 'design-system',
    fontFamily: "'Roboto Variable', Roboto, Helvetica, Arial, sans-serif",
    containerRadius: '8px',
    containerShadow:
      '0px 2px 4px -1px rgba(0,0,0,0.08), 0px 4px 5px 0px rgba(0,0,0,0.05)',
    eventRadius: '4px',
    eventStyle: 'solid',
    dayNumberAlign: 'center',
    todayHeaderAccent: 'pill',
    primaryColor: '#1976D2',
    headerBg: '#F5F7FA',
    headerText: '#1E293B',
    cellBg: '#FFFFFF',
    cellAltBg: '#FAFAFA',
    cellHoverBg: '#E3F2FD',
    cellText: '#212121',
    cellMutedText: '#757575',
    borderColor: '#E0E0E0',
    todayBg: '#E3F2FD',
    todayBorder: '#1976D2',
    todayNumberBg: '#1976D2',
    todayNumberText: '#FFFFFF',
    badgeBg: '#E3F2FD',
    badgeText: '#1565C0',
    badgeBorder: '#90CAF9',
  },
  emerald: {
    id: 'emerald',
    label: 'Emerald Mosque',
    description:
      'Lush emerald & teal palette inspired by traditional Islamic architecture',
    category: 'heritage',
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
    containerRadius: '10px',
    containerShadow: '0 1px 3px rgba(13, 148, 136, 0.08)',
    eventRadius: '6px',
    eventStyle: 'solid',
    dayNumberAlign: 'start',
    todayHeaderAccent: 'pill',
    primaryColor: '#0D9488',
    headerBg: '#CCFBF1',
    headerText: '#115E59',
    cellBg: '#FFFFFF',
    cellAltBg: '#F0FDFA',
    cellHoverBg: '#CCFBF1',
    cellText: '#0F172A',
    cellMutedText: '#475569',
    borderColor: '#99F6E4',
    todayBg: '#F0FDFA',
    todayBorder: '#0D9488',
    todayNumberBg: '#0D9488',
    todayNumberText: '#FFFFFF',
    badgeBg: '#CCFBF1',
    badgeText: '#0F766E',
    badgeBorder: '#5EEAD4',
  },
  sand: {
    id: 'sand',
    label: 'Warm Sand & Gold',
    description: 'Warm parchment & amber tones for high-comfort reading',
    category: 'heritage',
    fontFamily: "'Noto Sans Variable', 'Noto Sans', system-ui, sans-serif",
    containerRadius: '10px',
    containerShadow: '0 1px 3px rgba(180, 83, 9, 0.08)',
    eventRadius: '6px',
    eventStyle: 'solid',
    dayNumberAlign: 'start',
    todayHeaderAccent: 'pill',
    primaryColor: '#B45309',
    headerBg: '#FEF3C7',
    headerText: '#78350F',
    cellBg: '#FFFBEB',
    cellAltBg: '#FEF9C3',
    cellHoverBg: '#FEF3C7',
    cellText: '#1C1917',
    cellMutedText: '#78716C',
    borderColor: '#FDE68A',
    todayBg: '#FEF3C7',
    todayBorder: '#D97706',
    todayNumberBg: '#B45309',
    todayNumberText: '#FFFFFF',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
    badgeBorder: '#FCD34D',
  },
  midnight: {
    id: 'midnight',
    label: 'Midnight Slate',
    description: 'Deep dark-mode slate grid with luminous sky accents',
    category: 'heritage',
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
    containerRadius: '10px',
    containerShadow: '0 4px 12px rgba(2, 6, 23, 0.35)',
    eventRadius: '6px',
    eventStyle: 'tinted',
    dayNumberAlign: 'start',
    todayHeaderAccent: 'pill',
    primaryColor: '#38BDF8',
    headerBg: '#1E293B',
    headerText: '#E2E8F0',
    cellBg: '#0F172A',
    cellAltBg: '#162032',
    cellHoverBg: '#1E293B',
    cellText: '#F8FAFC',
    cellMutedText: '#94A3B8',
    borderColor: '#334155',
    todayBg: '#172554',
    todayBorder: '#38BDF8',
    todayNumberBg: '#0284C7',
    todayNumberText: '#FFFFFF',
    badgeBg: '#1E293B',
    badgeText: '#7DD3FC',
    badgeBorder: '#0369A1',
  },
};

/**
 * Detects the active 'light' | 'dark' color scheme from:
 * 1. Explicit 'light' or 'dark' preference
 * 2. Strapi Design System theme's `colors.neutral0` hex luminance (e.g. #212134 in dark mode vs #ffffff in light mode)
 * 3. Strapi Admin localStorage `STRAPI_THEME` and browser `prefers-color-scheme: dark` media query
 */
export function detectEffectiveColorScheme(
  colorScheme: CalendarColorScheme = 'auto',
  strapiNeutral0?: string
): 'light' | 'dark' {
  if (colorScheme === 'dark') return 'dark';
  if (colorScheme === 'light') return 'light';

  if (typeof strapiNeutral0 === 'string' && strapiNeutral0.startsWith('#')) {
    const hex = strapiNeutral0.slice(1).trim();
    const r =
      hex.length === 3
        ? Number.parseInt(hex[0] + hex[0], 16)
        : Number.parseInt(hex.slice(0, 2), 16);
    if (!Number.isNaN(r)) {
      return r < 128 ? 'dark' : 'light';
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const storedTheme = window.localStorage?.getItem('STRAPI_THEME');
      if (storedTheme === 'dark') return 'dark';
      if (storedTheme === 'light') return 'light';
    } catch {
      // ignore storage errors
    }
    if (window.matchMedia?.('(prefers-color-scheme: dark)')?.matches) {
      return 'dark';
    }
  }

  return 'light';
}

/**
 * Resolves the effective CalendarThemeDefinition by combining:
 * 1. The base theme preset (breeze, monarch, forma, pulse, classic, shadcn, mui, emerald, sand, midnight)
 * 2. Optional Light / Dark / Auto color scheme ("auto" | "light" | "dark")
 * 3. Optional Color Palette swatch ("default" | "purple" | "blue" | "indigo" | "emerald" | "rose" | "amber")
 */
export function resolveCalendarTheme(
  themeKey: CalendarThemePreset = 'breeze',
  colorScheme: CalendarColorScheme = 'auto',
  paletteKey: CalendarColorPaletteId = 'default',
  strapiNeutral0?: string
): CalendarThemeDefinition {
  const base =
    CALENDAR_THEME_PRESETS[themeKey] ?? CALENDAR_THEME_PRESETS.breeze;
  const effectiveScheme = detectEffectiveColorScheme(
    colorScheme,
    strapiNeutral0
  );
  const isDark = effectiveScheme === 'dark' || themeKey === 'midnight';
  const palette =
    paletteKey !== 'default' ? CALENDAR_COLOR_PALETTES[paletteKey] : null;

  let resolved: CalendarThemeDefinition = { ...base };

  if (isDark && themeKey !== 'midnight') {
    resolved = {
      ...resolved,
      headerBg: themeKey === 'monarch' ? '#141218' : '#111827',
      headerText: '#F3F4F6',
      cellBg: '#030712',
      cellAltBg: '#0B0F19',
      cellHoverBg: '#1F2937',
      cellText: '#F9FAFB',
      cellMutedText: '#9CA3AF',
      borderColor: themeKey === 'forma' ? '#2A2A2A' : '#1F2937',
      todayBg: '#172554',
      todayBorder: base.primaryColor,
      todayNumberBg: base.primaryColor,
      todayNumberText: '#FFFFFF',
      badgeBg: '#1E293B',
      badgeText: '#E2E8F0',
      badgeBorder: '#334155',
    };
  }

  if (palette) {
    const primary = isDark ? palette.darkPrimary : palette.lightPrimary;
    resolved = {
      ...resolved,
      primaryColor: primary,
      headerBg: isDark ? palette.darkHeaderBg : palette.lightHeaderBg,
      headerText: isDark ? palette.darkHeaderText : palette.lightHeaderText,
      todayBg: isDark ? palette.darkTodayBg : palette.lightTodayBg,
      todayBorder: primary,
      todayNumberBg: primary,
      todayNumberText:
        isDark && paletteKey === 'purple' ? '#381E72' : '#FFFFFF',
      badgeBg: isDark ? palette.darkBadgeBg : palette.lightBadgeBg,
      badgeText: isDark ? palette.darkBadgeText : palette.lightBadgeText,
      badgeBorder: isDark ? palette.darkBadgeBorder : palette.lightBadgeBorder,
    };
  }

  return resolved;
}

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
