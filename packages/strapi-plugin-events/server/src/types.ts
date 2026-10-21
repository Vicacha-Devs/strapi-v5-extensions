import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../shared/pluginId';
import type {
  CalendarSystemConfig,
  CalendarSystemFormatterFn,
  EventsPluginSettings,
  ExpandedOccurrence,
  RsvpRegistrationInput,
  RsvpRegistrationRecord,
  RsvpStats,
  RsvpStatus,
} from '../../shared/types';

export interface StrapiKoaContext {
  query?: Record<string, unknown>;
  params?: Record<string, string | undefined>;
  request?: {
    body?: Record<string, unknown>;
  };
  status?: number;
  body?: unknown;
  set: (header: string, value: string) => void;
  badRequest: (message: string, details?: unknown) => void;
}

export interface StrapiDocumentQueryOptions {
  filters?: Record<string, unknown>;
  sort?: string | string[] | Record<string, 'asc' | 'desc'>;
  limit?: number;
  locale?: string;
  status?: 'draft' | 'published';
  populate?: Record<string, unknown> | string[];
}

export interface StrapiDocumentServiceClient {
  findMany: (options?: StrapiDocumentQueryOptions) => Promise<Array<Record<string, unknown>>>;
  findOne: (options: {
    documentId: string;
    locale?: string;
  }) => Promise<Record<string, unknown> | null>;
  create: (options: {
    data: Record<string, unknown>;
    locale?: string;
    status?: 'draft' | 'published';
  }) => Promise<Record<string, unknown>>;
  update: (options: {
    documentId: string;
    data: Record<string, unknown>;
    locale?: string;
    status?: 'draft' | 'published';
  }) => Promise<Record<string, unknown>>;
}

export interface EventsSettingsService {
  ensureInitialized: () => Promise<EventsPluginSettings>;
  getSettings: () => Promise<EventsPluginSettings>;
  updateSettings: (patch: Partial<EventsPluginSettings>) => Promise<EventsPluginSettings>;
}

export interface EventsOccurrenceService {
  registerCalendarFormatter: (calendarId: string, formatter: CalendarSystemFormatterFn) => void;
  unregisterCalendarFormatter: (calendarId: string) => void;
  formatDateInCalendarSystem: (
    isoOrDateKey: string,
    system: CalendarSystemConfig,
    locale?: string,
    options?: { compact?: boolean }
  ) => string;
  getOccurrences: (params: {
    from?: string;
    to?: string;
    locale?: string;
    category?: string;
    sourceId?: string;
    documentId?: string;
    includeDrafts?: boolean;
  }) => Promise<ExpandedOccurrence[]>;
  getActiveSpotlights: (params?: {
    date?: string;
    locale?: string;
    sourceId?: string;
    category?: string;
    includeDrafts?: boolean;
  }) => Promise<ExpandedOccurrence[]>;
  rescheduleOccurrence: (params: {
    sourceId?: string;
    uid?: string;
    documentId: string;
    occurrenceDate: string;
    newStartDate: string;
    newEndDate?: string;
    applyToSeries?: boolean;
    cancelOccurrence?: boolean;
  }) => Promise<Record<string, unknown>>;
  quickCreateEvent: (params: {
    sourceId?: string;
    title: string;
    startDate: string;
    endDate?: string;
    location?: string;
    category?: string;
    summary?: string;
    rrule?: string;
    rsvpEnabled?: boolean;
    capacity?: number;
  }) => Promise<Record<string, unknown>>;
}

export interface EventsRsvpService {
  getEventStats: (params: {
    eventUid?: string;
    eventDocumentId: string;
    occurrenceDate?: string | null;
    capacityOverride?: number | null;
    waitlistOverride?: boolean;
    rsvpEnabledOverride?: boolean;
  }) => Promise<RsvpStats>;
  registerAttendee: (
    eventDocumentId: string,
    input: RsvpRegistrationInput
  ) => Promise<RsvpRegistrationRecord & { cancellationToken: string }>;
  promoteFromWaitlist: (params: {
    eventUid: string;
    eventDocumentId: string;
    occurrenceDate: string;
  }) => Promise<RsvpRegistrationRecord[]>;
  cancelByToken: (token: string) => Promise<{
    cancelled: RsvpRegistrationRecord;
    promotedCount: number;
  }>;
  updateRegistrationStatus: (
    registrationDocumentId: string,
    newStatus: RsvpStatus
  ) => Promise<{
    registration: RsvpRegistrationRecord;
    promotedCount: number;
  }>;
  checkInAttendee: (identifier: {
    documentId?: string;
    token?: string;
  }) => Promise<RsvpRegistrationRecord>;
  listRegistrations: (filters?: {
    eventDocumentId?: string;
    occurrenceDate?: string;
    status?: RsvpStatus;
    search?: string;
  }) => Promise<RsvpRegistrationRecord[]>;
  exportRegistrationsCsv: (filters?: {
    eventDocumentId?: string;
    occurrenceDate?: string;
    status?: RsvpStatus;
  }) => Promise<string>;
}

export interface EventsIcalService {
  generateFeedIcs: (params?: {
    from?: string;
    to?: string;
    category?: string;
    sourceId?: string;
    locale?: string;
  }) => Promise<string>;
  generateEventInviteIcs: (params: {
    documentId: string;
    occurrenceDate?: string;
    locale?: string;
  }) => Promise<string>;
}

export function getDocumentsClient(
  strapi: Core.Strapi,
  uid: string
): StrapiDocumentServiceClient {
  const docsFn = strapi.documents as unknown as (targetUid: string) => StrapiDocumentServiceClient;
  return docsFn(uid);
}

export function getSettingsService(strapi: Core.Strapi): EventsSettingsService {
  return strapi.plugin(PLUGIN_ID).service('settings') as unknown as EventsSettingsService;
}

export function getOccurrenceService(strapi: Core.Strapi): EventsOccurrenceService {
  return strapi.plugin(PLUGIN_ID).service('occurrence') as unknown as EventsOccurrenceService;
}

export function getRsvpService(strapi: Core.Strapi): EventsRsvpService {
  return strapi.plugin(PLUGIN_ID).service('rsvp') as unknown as EventsRsvpService;
}

export function getIcalService(strapi: Core.Strapi): EventsIcalService {
  return strapi.plugin(PLUGIN_ID).service('ical') as unknown as EventsIcalService;
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
