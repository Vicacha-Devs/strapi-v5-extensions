import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../shared/pluginId";
import type {
  CalendarSystemConfig,
  CalendarSystemFormatterFn,
  EventsPluginSettings,
  ExpandedOccurrence,
  RsvpRegistrationInput,
  RsvpRegistrationRecord,
  RsvpStats,
  RsvpStatus,
} from "../../shared/types";

export class PluginValidationError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "PluginValidationError";
  }
}

export class PluginNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(message: string) {
    super(message);
    this.name = "PluginNotFoundError";
  }
}

export interface StrapiKoaContext {
  query?: Record<string, unknown>;
  params?: Record<string, string | undefined>;
  request?: {
    body?: Record<string, unknown>;
  };
  status?: number;
  body?: unknown;
  set: (header: string, value: string) => void;
  badRequest: (message: string, details?: unknown) => unknown;
  notFound?: (message?: string, details?: unknown) => unknown;
}

export interface PaginationParams {
  limit?: number;
  page?: number;
  pageSize?: number;
}

export interface StrapiDocumentQueryOptions {
  filters?: Record<string, unknown>;
  sort?: string | string[] | Record<string, "asc" | "desc">;
  limit?: number;
  locale?: string;
  status?: "draft" | "published";
  populate?: Record<string, unknown> | string[];
}

export interface StrapiDocumentServiceClient {
  findMany: (
    options?: StrapiDocumentQueryOptions
  ) => Promise<Array<Record<string, unknown>>>;
  findOne: (options: {
    documentId: string;
    locale?: string;
    status?: "draft" | "published";
  }) => Promise<Record<string, unknown> | null>;
  create: (options: {
    data: Record<string, unknown>;
    locale?: string;
    status?: "draft" | "published";
  }) => Promise<Record<string, unknown>>;
  update: (options: {
    documentId: string;
    data: Record<string, unknown>;
    locale?: string;
    status?: "draft" | "published";
  }) => Promise<Record<string, unknown>>;
}

export interface EventsSettingsService {
  ensureInitialized: () => Promise<EventsPluginSettings>;
  getSettings: () => Promise<EventsPluginSettings>;
  updateSettings: (
    patch: Partial<EventsPluginSettings>
  ) => Promise<EventsPluginSettings>;
}

export interface EventsOccurrenceService {
  registerCalendarFormatter: (
    calendarId: string,
    formatter: CalendarSystemFormatterFn
  ) => void;
  unregisterCalendarFormatter: (calendarId: string) => void;
  formatDateInCalendarSystem: (
    isoOrDateKey: string,
    system: CalendarSystemConfig,
    locale?: string,
    options?: { compact?: boolean }
  ) => string;
  getOccurrences: (
    params: {
      from?: string;
      to?: string;
      locale?: string;
      category?: string;
      sourceId?: string;
      documentId?: string;
      includeDrafts?: boolean;
      onlySpotlights?: boolean;
    } & PaginationParams
  ) => Promise<ExpandedOccurrence[]>;
  getActiveSpotlights: (
    params?: {
      date?: string;
      locale?: string;
      sourceId?: string;
      category?: string;
      includeDrafts?: boolean;
    } & PaginationParams
  ) => Promise<ExpandedOccurrence[]>;
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
    includeDrafts?: boolean;
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
  listRegistrations: (
    filters?: {
      eventDocumentId?: string;
      occurrenceDate?: string;
      status?: RsvpStatus;
      search?: string;
    } & PaginationParams
  ) => Promise<RsvpRegistrationRecord[]>;
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
  return strapi.documents(
    uid as never
  ) as unknown as StrapiDocumentServiceClient;
}

export function getSettingsService(strapi: Core.Strapi): EventsSettingsService {
  return strapi
    .plugin(PLUGIN_ID)
    .service("settings") as unknown as EventsSettingsService;
}

export function getOccurrenceService(
  strapi: Core.Strapi
): EventsOccurrenceService {
  return strapi
    .plugin(PLUGIN_ID)
    .service("occurrence") as unknown as EventsOccurrenceService;
}

export function getRsvpService(strapi: Core.Strapi): EventsRsvpService {
  return strapi
    .plugin(PLUGIN_ID)
    .service("rsvp") as unknown as EventsRsvpService;
}

export function getIcalService(strapi: Core.Strapi): EventsIcalService {
  return strapi
    .plugin(PLUGIN_ID)
    .service("ical") as unknown as EventsIcalService;
}

export function clampPaginatedSlice<T>(
  items: T[],
  params?: PaginationParams & { defaultLimit?: number; maxLimit?: number }
): T[] {
  const maxLimit = params?.maxLimit ?? 500;
  const defaultLimit = params?.defaultLimit ?? maxLimit;

  if (params?.page !== undefined || params?.pageSize !== undefined) {
    const rawPage = Number(params.page);
    const page =
      Number.isFinite(rawPage) && rawPage >= 1
        ? Math.min(1000, Math.floor(rawPage))
        : 1;
    const rawSize = Number(params.pageSize ?? params.limit);
    const pageSize =
      Number.isFinite(rawSize) && rawSize >= 1
        ? Math.min(maxLimit, Math.floor(rawSize))
        : Math.min(50, maxLimit);
    const offset = (page - 1) * pageSize;
    return items.slice(offset, offset + pageSize);
  }

  if (params?.limit !== undefined) {
    const rawLimit = Number(params.limit);
    const safeLimit =
      Number.isFinite(rawLimit) && rawLimit >= 1
        ? Math.min(maxLimit, Math.floor(rawLimit))
        : Math.min(defaultLimit, maxLimit);
    return items.slice(0, safeLimit);
  }

  return items.slice(0, defaultLimit);
}

export function handleControllerError(
  strapi: Core.Strapi,
  ctx: StrapiKoaContext,
  err: unknown,
  fallbackMessage: string
): unknown {
  if (err instanceof PluginNotFoundError) {
    if (typeof ctx.notFound === "function") {
      return ctx.notFound(err.message);
    }
    ctx.status = 404;
    ctx.body = { error: { status: 404, message: err.message } };
    return undefined;
  }
  if (err instanceof PluginValidationError) {
    return ctx.badRequest(err.message);
  }
  const detail = err instanceof Error ? err.message : String(err);
  strapi.log?.error?.(`[events] ${fallbackMessage}: ${detail}`);
  return ctx.badRequest(fallbackMessage);
}
