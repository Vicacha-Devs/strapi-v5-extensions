import type { ExpandedCalendarOccurrence as CalendarOccurrence } from "@vicacha-devs/strapi-plugin-calendar/shared";

import type { CalendarSystemFormatterFn as CalendarSystemFormatter } from "../../shared/calendarSystems";
import type {
  AvailableSlot,
  BookingFilterQuery,
  BookingRecord,
  BookingResource,
  BookingsPluginSettings,
  BookingSourceMapping,
  BookingStats,
  BookingStatus,
  CancelBookingInput,
  CreateReservationInput,
  CreateReservationResult,
  HolidayScheduleRule,
  RescheduleBookingInput,
  SeasonalScheduleOverride,
  SecondaryCalendarConfig,
} from "../../shared/types";

export interface CustomFieldRegistration {
  name: string;
  type:
    | "string"
    | "text"
    | "richtext"
    | "integer"
    | "biginteger"
    | "float"
    | "decimal"
    | "date"
    | "time"
    | "datetime"
    | "boolean"
    | "enumeration"
    | "json"
    | "email"
    | "password"
    | "uid";
}

export interface BookingsPluginConfig {
  defaultTimezone?: string;
  defaultLocale?: string;
  theme?: "breeze" | "emerald" | "sand" | "midnight" | "classic";
  secondaryCalendarLanguage?: "local" | "ar" | "off";
  defaultSlotDurationMinutes?: number;
  defaultBufferBeforeMinutes?: number;
  defaultBufferAfterMinutes?: number;
  defaultCapacityPerSlot?: number;
  defaultMinLeadTimeHours?: number;
  defaultMaxAdvanceDays?: number;
  defaultRequiresApproval?: boolean;
  sendEmailNotifications?: boolean;
  secondaryCalendars?: SecondaryCalendarConfig[];
  defaultSeasonalSchedules?: SeasonalScheduleOverride[];
  holidays?: HolidayScheduleRule[];
  sources?: BookingSourceMapping[];
  calendarSystems?: Record<string, CalendarSystemFormatter>;
  schemaExtensions?: {
    resource?: Record<string, Record<string, unknown>>;
    booking?: Record<string, Record<string, unknown>>;
  };
  customFields?: CustomFieldRegistration[];
}

export interface DiscoveredCollectionField {
  name: string;
  type: string;
}

export interface DiscoveredCollectionSchema {
  uid: string;
  displayName: string;
  singularName: string;
  pluralName: string;
  dateFields: string[];
  stringFields: string[];
  numberFields: string[];
  enumFields: string[];
  fields: DiscoveredCollectionField[];
}

export interface SettingsService {
  getSettings(): Promise<BookingsPluginSettings>;
  updateSettings(partial: Partial<BookingsPluginSettings>): Promise<BookingsPluginSettings>;
  discoverSchemas(): Promise<DiscoveredCollectionSchema[]>;
  registerSource(source: BookingSourceMapping): void;
}

export interface AvailabilityService {
  listResources(activeOnly?: boolean): Promise<BookingResource[]>;
  getResource(idOrSlug: string): Promise<BookingResource | null>;
  saveResource(payload: Partial<BookingResource> & { name: string }): Promise<BookingResource>;
  getAvailableSlots(params: {
    resourceDocumentId?: string;
    resourceSlug?: string;
    from: string;
    to: string;
    partySize?: number;
    preferredLanguage?: string;
    referenceNow?: Date;
  }): Promise<AvailableSlot[]>;
  getCalendarOccurrences(query: BookingFilterQuery): Promise<{
    occurrences: CalendarOccurrence[];
    bookings: BookingRecord[];
    stats: BookingStats;
  }>;
}

export interface ReservationService {
  listBookings(query?: BookingFilterQuery): Promise<BookingRecord[]>;
  getBooking(documentIdOrCode: string): Promise<BookingRecord | null>;
  createReservation(
    input: CreateReservationInput,
    options?: { skipLeadTimeCheck?: boolean; referenceNow?: Date }
  ): Promise<CreateReservationResult>;
  updateBookingStatus(
    documentId: string,
    status: BookingStatus,
    options?: { assignedHost?: string; internalNotes?: string }
  ): Promise<BookingRecord>;
  rescheduleBooking(
    input: RescheduleBookingInput,
    options?: { isAdmin?: boolean; referenceNow?: Date }
  ): Promise<BookingRecord>;
  cancelBooking(input: CancelBookingInput, options?: { isAdmin?: boolean }): Promise<BookingRecord>;
  exportCsv(query?: BookingFilterQuery): Promise<string>;
  exportICal(query?: BookingFilterQuery): Promise<string>;
}
