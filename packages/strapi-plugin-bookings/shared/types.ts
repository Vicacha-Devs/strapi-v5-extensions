import type {
  AlternateDateValue as SecondaryCalendarDateBadge,
  CalendarSystemConfig as SecondaryCalendarConfig,
  CalendarThemePreset,
  SecondaryCalendarLanguageMode,
} from "@vicacha-devs/strapi-plugin-calendar/shared";

export type {
  SecondaryCalendarConfig,
  SecondaryCalendarDateBadge,
  CalendarThemePreset,
  SecondaryCalendarLanguageMode,
};

export type BookingResourceType =
  | "service"
  | "appointment"
  | "room"
  | "staff"
  | "equipment"
  | "other";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export interface DailyTimeWindow {
  /** Start time in HH:mm (24h), e.g. '09:00' */
  start: string;
  /** End time in HH:mm (24h), e.g. '12:00' */
  end: string;
  /** Optional named slot label, e.g. 'morning' or 'afternoon' */
  label?: string;
  /** Optional slot-specific capacity override */
  capacity?: number;
}

export type DayOfWeekKey = "0" | "1" | "2" | "3" | "4" | "5" | "6";

export interface WeeklyScheduleConfig {
  /**
   * Mode of slot generation:
   * - 'interval': slices each daily window into `slotDurationMinutes` intervals (e.g. 09:00-10:00, 10:00-11:00)
   * - 'window': treats each daily window as a single bookable block (e.g. 'morning' 09:00-12:00, 'afternoon' 14:00-17:00)
   */
  mode?: "interval" | "window";
  /** Operating windows keyed by JS UTC day of week ('0'=Sunday ... '6'=Saturday) */
  days: Partial<Record<DayOfWeekKey, DailyTimeWindow[]>>;
}

export interface BlackoutPeriod {
  /** ISO date ('YYYY-MM-DD'), month-day ('MM-DD' when yearless=true), or ISO datetime string */
  start: string;
  /** ISO date ('YYYY-MM-DD'), month-day ('MM-DD' when yearless=true), or ISO datetime string */
  end: string;
  /** When true, applies every year on the same MM-DD range (supports cross-year ranges like 12-20 to 01-05) */
  yearless?: boolean;
  reason?: string;
}

export interface SeasonalScheduleOverride {
  id?: string;
  /** Human-readable schedule label, e.g. 'Summer Hours', 'Ramadan Schedule', 'Holiday Season' */
  label: string;
  /** ISO date ('YYYY-MM-DD') or month-day ('MM-DD') when yearless=true */
  startDate: string;
  /** ISO date ('YYYY-MM-DD') or month-day ('MM-DD') when yearless=true */
  endDate: string;
  /** When true, repeats every year on the same month-day range */
  yearless?: boolean;
  /** Optional priority when multiple seasonal schedules overlap (higher number wins) */
  priority?: number;
  /** Optional slot duration override (in minutes) while this seasonal schedule is active */
  slotDurationMinutes?: number;
  /** Weekly schedule active during this date range */
  schedule: WeeklyScheduleConfig;
}

export interface HolidayScheduleRule {
  id?: string;
  /** Holiday name, e.g. 'New Year', 'Eid al-Fitr', 'National Holiday' */
  name: string;
  /** ISO date ('YYYY-MM-DD') or month-day ('MM-DD') when yearless=true */
  date: string;
  /** When true, repeats every year on the same month-day */
  yearless?: boolean;
  /** When true (or when windows is empty/omitted), the resource is closed on this holiday */
  isClosed?: boolean;
  /** Optional slot generation mode when custom holiday windows are provided */
  mode?: "interval" | "window";
  /** Optional reduced/special operating windows when open on a holiday */
  windows?: DailyTimeWindow[];
}

export interface AssignableHost {
  id: string;
  name: string;
  email?: string;
  languages?: string[];
  role?: string;
}

export interface BookingResource {
  documentId: string;
  name: string;
  slug: string;
  resourceType: BookingResourceType;
  description?: string;
  color: string;
  timezone: string;
  slotDurationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  capacityPerSlot: number;
  maxPartySize: number;
  minLeadTimeHours: number;
  maxAdvanceDays: number;
  requiresApproval: boolean;
  weeklySchedule: WeeklyScheduleConfig;
  seasonalSchedules?: SeasonalScheduleOverride[];
  holidayRules?: HolidayScheduleRule[];
  blackoutDates: BlackoutPeriod[];
  recurrenceRule?: string;
  supportedLanguages: string[];
  assignedHosts: AssignableHost[];
  location?: string;
  price?: number;
  currency?: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export interface AvailableSlot {
  slotId: string;
  resourceDocumentId: string;
  resourceName: string;
  resourceSlug: string;
  start: string;
  end: string;
  date: string;
  slotLabel: string;
  scheduleLabel?: string;
  capacity: number;
  bookedCount: number;
  remainingCapacity: number;
  isAvailable: boolean;
  availableHosts: AssignableHost[];
  secondaryDates?: Record<string, SecondaryCalendarDateBadge>;
}

export interface BookingRecord {
  documentId: string;
  bookingCode: string;
  title: string;
  resourceDocumentId?: string;
  resourceName?: string;
  resourceColor?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  organization?: string;
  startDate: string;
  endDate: string;
  slotLabel?: string;
  timezone: string;
  partySize: number;
  status: BookingStatus;
  preferredLanguage?: string;
  assignedHost?: string;
  notes?: string;
  internalNotes?: string;
  sourceCollection?: string;
  secondaryDates?: Record<string, SecondaryCalendarDateBadge>;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReservationInput {
  resourceDocumentId?: string;
  resourceSlug?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  organization?: string;
  startDate: string;
  endDate?: string;
  slotLabel?: string;
  timezone?: string;
  partySize?: number;
  preferredLanguage?: string;
  assignedHost?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateReservationResult {
  booking: BookingRecord;
  cancelToken: string;
  waitlisted: boolean;
}

export interface RescheduleBookingInput {
  bookingDocumentId?: string;
  bookingCode?: string;
  cancelToken?: string;
  newStartDate: string;
  newEndDate?: string;
  newSlotLabel?: string;
  partySize?: number;
}

export interface CancelBookingInput {
  bookingDocumentId?: string;
  bookingCode?: string;
  cancelToken?: string;
  reason?: string;
}

export interface BookingSourceMapping {
  id: string;
  uid: string;
  label: string;
  color: string;
  enabled: boolean;
  customerNameField: string;
  customerEmailField?: string;
  customerPhoneField?: string;
  organizationField?: string;
  dateField: string;
  endDateField?: string;
  slotLabelField?: string;
  partySizeField?: string;
  statusField?: string;
  languageField?: string;
  notesField?: string;
  slotWindows?: Record<string, { start: string; end: string }>;
}

export interface BookingsPluginSettings {
  theme?: CalendarThemePreset;
  defaultLocale?: string;
  secondaryCalendarLanguage?: SecondaryCalendarLanguageMode;
  defaultTimezone: string;
  defaultSlotDurationMinutes: number;
  defaultBufferBeforeMinutes: number;
  defaultBufferAfterMinutes: number;
  defaultCapacityPerSlot: number;
  defaultMinLeadTimeHours: number;
  defaultMaxAdvanceDays: number;
  defaultRequiresApproval: boolean;
  sendEmailNotifications: boolean;
  secondaryCalendars: SecondaryCalendarConfig[];
  defaultSeasonalSchedules?: SeasonalScheduleOverride[];
  holidays?: HolidayScheduleRule[];
  icalFeedToken?: string;
  sources: BookingSourceMapping[];
}

export interface BookingFilterQuery {
  from?: string;
  to?: string;
  resourceDocumentId?: string;
  resourceSlug?: string;
  status?: BookingStatus | "";
  preferredLanguage?: string;
  search?: string;
  source?: string;
  activeOnly?: boolean;
  limit?: number;
}

export interface BookingStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  totalGuests: number;
  activeResources: number;
}
