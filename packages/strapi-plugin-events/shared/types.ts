export type RRuleFrequency = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type RRuleWeekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

export type EventLifecycleStatus =
  | "scheduled"
  | "cancelled"
  | "postponed"
  | "rescheduled";

export type EventLocationType = "in_person" | "online" | "hybrid";

export type RsvpStatus =
  | "confirmed"
  | "waitlisted"
  | "cancelled"
  | "checked_in";

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
  /** Optional note for attendees on this occurrence */
  note?: string;
}

export interface RRuleFieldValue {
  /** RFC 5545 RRULE string (e.g. "FREQ=WEEKLY;INTERVAL=1;BYDAY=FR") or empty string for non-recurring */
  rrule: string;
  /** IANA timezone identifier (e.g. "UTC", "America/New_York", "America/Bogota") */
  timezone: string;
  /** Whether the event spans full days */
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
  byMonthDay?: number;
  count?: number;
  until?: string;
}

export interface TimeSlotWindow {
  /** Start time in HH:mm:ss format (e.g. "09:00:00") */
  start: string;
  /** End time in HH:mm:ss format (e.g. "11:00:00") */
  end: string;
}

export interface CalendarSystemConfig {
  /** Unique identifier for this calendar system (e.g. "hijri", "hebrew", "persian", "fiscal") */
  id: string;
  /** Human-readable display label (e.g. "Hijri (Umm al-Qura)", "Hebrew", "Persian") */
  label: string;
  /** Unicode BCP 47 calendar identifier (e.g. "islamic-umalqura", "hebrew", "persian", "buddhist", "chinese") or custom formatter ID */
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
  isOverridden?: boolean;
}

export interface EventPosterAsset {
  /** Safe relative or https/http URL to the poster image or document */
  url: string;
  /** Accessible alt text for the poster */
  alt?: string;
  /** MIME type (e.g., "image/webp", "image/jpeg", "application/pdf") */
  mime?: string;
  /** Intrinsic width in pixels if available */
  width?: number;
  /** Intrinsic height in pixels if available */
  height?: number;
}

export type EventActionLinkVariant = "primary" | "secondary" | "outline";

export interface EventActionLink {
  /** Human-readable CTA button or resource link label */
  label: string;
  /** Safe destination URL (https://, http://, mailto:, or relative /path) */
  url: string;
  /** Visual button style variant */
  variant?: EventActionLinkVariant;
  /** Whether the link opens in a new tab with rel="noopener noreferrer" */
  external?: boolean;
  /** Optional icon identifier */
  icon?: string;
}

export type EventSpotlightPosition = "bottom-end" | "bottom-start";

export interface EventSpotlightConfig {
  /** Whether this event is promoted in the floating Spotlight corner dock */
  enabled: boolean;
  /** Optional generic badge label (e.g. "Open Registration", "Featured", "Convocatoria") */
  badgeText?: string;
  /** Sorting priority in the dock when multiple spotlights are active (higher = first) */
  priority?: number;
  /** Logical corner placement (supports LTR and RTL layouts) */
  position?: EventSpotlightPosition;
  /** Whether to display a live remaining-days countdown badge until endAt/endDate */
  showCountdown?: boolean;
  /** Optional ISO date/datetime when the spotlight starts appearing (defaults to startDate) */
  startAt?: string;
  /** Optional ISO date/datetime when the spotlight stops appearing (defaults to endDate) */
  endAt?: string;
}

export interface EventSourceMapping {
  /** Unique identifier for this source mapping (e.g. "builtin-events", "workshops", "bookings") */
  id: string;
  /** Human-readable label shown in Calendar filter pills */
  label: string;
  /** Strapi Content-Type UID (e.g. "plugin::events.event", "api::event.event") */
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
    capacity?: string;
    rsvpEnabled?: string;
    timeSlot?: string;
    /** Optional field name for the event poster media or asset object */
    poster?: string;
    /** Optional field name for structured CTA / resource links JSON array */
    actionLinks?: string;
    /** Optional field name for floating corner spotlight configuration JSON */
    spotlightConfig?: string;
    /** Optional mapping of calendar system IDs to document override fields (e.g. { hijri: "hijriDate" }) */
    alternateDateFields?: Record<string, string>;
    /** Optional list of custom document attributes to pass through onto each ExpandedOccurrence */
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
  /** Unique identifier for the preset (e.g. "daily", "weekly-fri") */
  id: string;
  /** Human-readable preset label */
  label: string;
  /** RFC 5545 RRULE string */
  rrule: string;
}

export interface SchemaExtensionsConfig {
  /** Additional Strapi attributes merged into `plugin::events.event` during register() */
  event?: Record<string, Record<string, unknown>>;
  /** Additional Strapi attributes merged into `plugin::events.registration` during register() */
  registration?: Record<string, Record<string, unknown>>;
}

export interface EventsPluginSettings {
  /** Default IANA timezone (e.g. "UTC") */
  defaultTimezone: string;
  /** Optional default locale for querying localized event sources (e.g. "es", "en", "auto") */
  defaultLocale?: string;
  /** Default seat capacity when RSVP is enabled on an event */
  defaultCapacity: number;
  /** Automatically place excess registrations on the waitlist when capacity is full */
  waitlistEnabledByDefault: boolean;
  /** Maximum party size per single registration */
  defaultMaxGuestsPerRegistration: number;
  /** Send confirmation / waitlist promotion emails via Strapi email plugin */
  sendRsvpEmails: boolean;
  /** Public iCal feed calendar name */
  feedTitle: string;
  /** Configured event collection sources */
  sources: EventSourceMapping[];
  /** Optional secondary/alternative calendar systems (e.g. Hijri, Hebrew, Persian, Buddhist, or custom) */
  secondaryCalendars?: CalendarSystemConfig[];
  /** Configurable RRULE recurrence presets shown in Quick-Create & RRuleInput */
  recurrencePresets?: RecurrencePreset[];
  /** Declarative attribute extensions merged into built-in plugin schemas during register() */
  schemaExtensions?: SchemaExtensionsConfig;
}

export interface CalendarLinkSet {
  google: string;
  outlook: string;
  yahoo: string;
  icsPath: string;
}

export interface RsvpStats {
  eventUid: string;
  eventDocumentId: string;
  occurrenceDate: string | null;
  rsvpEnabled: boolean;
  capacity: number | null;
  waitlistEnabled: boolean;
  confirmedCount: number;
  confirmedSeats: number;
  checkedInSeats: number;
  waitlistedCount: number;
  waitlistedSeats: number;
  cancelledCount: number;
  remainingSeats: number | null;
  isFull: boolean;
}

export interface ExpandedOccurrence {
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
  /** Event title */
  title: string;
  /** Optional slug */
  slug?: string;
  /** Optional summary */
  summary?: string;
  /** Physical location or venue */
  location?: string;
  /** Virtual meeting URL */
  virtualUrl?: string;
  /** Category string */
  category?: string;
  /** Lifecycle status */
  status: EventLifecycleStatus;
  /** Hex badge color */
  color: string;
  /** Whether generated from an RRULE recurrence */
  isRecurring: boolean;
  /** Raw RRULE string if recurring */
  rrule?: string;
  /** Whether this specific occurrence has an override applied */
  isOverridden?: boolean;
  /** RSVP availability stats */
  rsvp?: RsvpStats;
  /** Add-to-calendar links */
  calendarLinks: CalendarLinkSet;
  /** Alternate calendar representations (e.g., Hijri, Hebrew, Persian, or custom date systems) */
  alternateDates?: Record<string, AlternateDateValue>;
  /** Normalized poster media or asset if configured on the event */
  poster?: EventPosterAsset;
  /** Normalized CTA / resource action links */
  actionLinks?: EventActionLink[];
  /** Normalized floating corner spotlight configuration */
  spotlightConfig?: EventSpotlightConfig;
  /** Custom fields extracted from the source document via `source.fields.customFields` */
  customFields?: Record<string, unknown>;
}

export interface RsvpRegistrationInput {
  eventUid?: string;
  occurrenceDate?: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  guestsCount?: number;
  locale?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface RsvpRegistrationRecord {
  documentId: string;
  eventUid: string;
  eventDocumentId: string;
  eventTitle?: string;
  occurrenceDate: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  guestsCount: number;
  status: RsvpStatus;
  checkInToken?: string;
  checkedInAt?: string | null;
  locale: string;
  notes?: string;
  createdAt?: string;
}
