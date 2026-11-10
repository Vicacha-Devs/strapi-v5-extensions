import type { Core } from "@strapi/strapi";
import type { ExpandedCalendarOccurrence as CalendarOccurrence } from "@vicacha-devs/strapi-plugin-calendar/shared";

import { formatSecondaryCalendars } from "../../../shared/calendarSystems";
import { PLUGIN_ID } from "../../../shared/pluginId";
import {
  computeAvailableSlots,
  DEFAULT_WEEKLY_SCHEDULE,
  normalizeTimeZone,
} from "../../../shared/slotEngine";
import type {
  AssignableHost,
  AvailableSlot,
  BlackoutPeriod,
  BookingFilterQuery,
  BookingRecord,
  BookingResource,
  BookingResourceType,
  BookingsPluginSettings,
  BookingStats,
  BookingStatus,
  HolidayScheduleRule,
  SeasonalScheduleOverride,
  WeeklyScheduleConfig,
} from "../../../shared/types";
import { BookingNotFoundError, sanitizePlainRecord } from "../errors";
import type {
  AvailabilityService,
  ReservationService,
  SettingsService,
} from "../types";
import { parseBoundaryMs } from "./reservationSources";

const RESOURCE_UID = "plugin::bookings.resource";

const STATUS_COLORS: Record<BookingStatus, string> = {
  confirmed: "#059669",
  pending: "#d97706",
  completed: "#4f46e5",
  cancelled: "#64748b",
  no_show: "#e11d48",
};

function slugifyName(value: string): string {
  let slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "");
  while (slug.endsWith("-")) {
    slug = slug.slice(0, -1);
  }
  return slug;
}

function asArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

function asOptionalString(val: unknown): string | undefined {
  return val ? String(val) : undefined;
}

function clampNumber(
  val: unknown,
  fallback: number,
  min: number,
  max?: number
): number {
  const num = typeof val === "number" ? val : Number(val);
  const safe = Number.isFinite(num) ? Math.trunc(num) : fallback;
  const clampedMin = Math.max(min, safe);
  return max !== undefined ? Math.min(max, clampedMin) : clampedMin;
}

function resolveWeeklySchedule(val: unknown): WeeklyScheduleConfig {
  if (
    val &&
    typeof val === "object" &&
    !Array.isArray(val) &&
    "days" in (val as Record<string, unknown>)
  ) {
    return val as WeeklyScheduleConfig;
  }
  return DEFAULT_WEEKLY_SCHEDULE;
}

function normalizeResourceLimits(raw: Record<string, unknown>) {
  return {
    slotDurationMinutes: clampNumber(raw.slotDurationMinutes, 60, 5, 1440),
    bufferBeforeMinutes: clampNumber(raw.bufferBeforeMinutes, 0, 0, 720),
    bufferAfterMinutes: clampNumber(raw.bufferAfterMinutes, 0, 0, 720),
    capacityPerSlot: clampNumber(raw.capacityPerSlot, 1, 1),
    maxPartySize: clampNumber(raw.maxPartySize, 50, 1),
    minLeadTimeHours: clampNumber(raw.minLeadTimeHours, 2, 0),
    maxAdvanceDays: clampNumber(raw.maxAdvanceDays, 90, 1),
    requiresApproval: Boolean(raw.requiresApproval ?? false),
  };
}

function normalizeResourceDetails(raw: Record<string, unknown>) {
  const supportedLanguages = asArray<unknown>(raw.supportedLanguages).map((l) =>
    String(l)
  );
  const metadata = sanitizePlainRecord(raw.metadata);
  const rawPrice = raw.price !== undefined ? Number(raw.price) : undefined;
  const price =
    rawPrice !== undefined && Number.isFinite(rawPrice)
      ? Math.max(0, rawPrice)
      : undefined;

  return {
    description: asOptionalString(raw.description),
    recurrenceRule: asOptionalString(raw.recurrenceRule),
    supportedLanguages,
    assignedHosts: asArray<AssignableHost>(raw.assignedHosts),
    location: asOptionalString(raw.location),
    price,
    currency: raw.currency ? String(raw.currency) : "USD",
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
    metadata,
  };
}

export function normalizeResourceRecord(
  raw: Record<string, unknown>
): BookingResource {
  const name = String(raw.name ?? "Unnamed Resource");
  return {
    documentId: String(raw.documentId ?? raw.id ?? ""),
    name,
    slug: String(raw.slug ?? slugifyName(String(raw.name ?? "resource"))),
    resourceType: (raw.resourceType as BookingResourceType) ?? "service",
    color: String(raw.color ?? "#0d9488"),
    timezone: normalizeTimeZone(
      raw.timezone !== undefined ? String(raw.timezone) : "UTC"
    ),
    ...normalizeResourceLimits(raw),
    weeklySchedule: resolveWeeklySchedule(raw.weeklySchedule),
    seasonalSchedules: asArray<SeasonalScheduleOverride>(raw.seasonalSchedules),
    holidayRules: asArray<HolidayScheduleRule>(raw.holidayRules),
    blackoutDates: asArray<BlackoutPeriod>(raw.blackoutDates),
    ...normalizeResourceDetails(raw),
  };
}

function buildResourceScheduleData(
  payload: Partial<BookingResource>,
  settings: BookingsPluginSettings
): Record<string, unknown> {
  return {
    timezone: normalizeTimeZone(payload.timezone ?? settings.defaultTimezone),
    slotDurationMinutes: clampNumber(
      payload.slotDurationMinutes,
      settings.defaultSlotDurationMinutes,
      5,
      1440
    ),
    bufferBeforeMinutes: clampNumber(
      payload.bufferBeforeMinutes,
      settings.defaultBufferBeforeMinutes,
      0,
      720
    ),
    bufferAfterMinutes: clampNumber(
      payload.bufferAfterMinutes,
      settings.defaultBufferAfterMinutes,
      0,
      720
    ),
    capacityPerSlot: clampNumber(
      payload.capacityPerSlot,
      settings.defaultCapacityPerSlot,
      1
    ),
    maxPartySize: clampNumber(payload.maxPartySize, 50, 1),
    minLeadTimeHours: clampNumber(
      payload.minLeadTimeHours,
      settings.defaultMinLeadTimeHours,
      0
    ),
    maxAdvanceDays: clampNumber(
      payload.maxAdvanceDays,
      settings.defaultMaxAdvanceDays,
      1
    ),
    requiresApproval:
      payload.requiresApproval ?? settings.defaultRequiresApproval,
  };
}

function buildResourceMetaData(
  payload: Partial<BookingResource> & { name: string }
): Record<string, unknown> {
  return {
    name: payload.name.trim(),
    slug: payload.slug || slugifyName(payload.name),
    resourceType: payload.resourceType ?? "service",
    description: payload.description ?? "",
    color: payload.color ?? "#0d9488",
    weeklySchedule: payload.weeklySchedule ?? DEFAULT_WEEKLY_SCHEDULE,
    seasonalSchedules: payload.seasonalSchedules ?? [],
    holidayRules: payload.holidayRules ?? [],
    blackoutDates: payload.blackoutDates ?? [],
  };
}

function buildResourceExtrasData(
  payload: Partial<BookingResource>
): Record<string, unknown> {
  return {
    recurrenceRule: payload.recurrenceRule ?? undefined,
    supportedLanguages: payload.supportedLanguages ?? [],
    assignedHosts: payload.assignedHosts ?? [],
    location: payload.location ?? undefined,
    price: payload.price ?? 0,
    currency: payload.currency ?? "USD",
    isActive: payload.isActive ?? true,
    metadata: sanitizePlainRecord(payload.metadata),
  };
}

function resolveOccurrenceTitle(booking: BookingRecord): string {
  if (booking.title) return booking.title;
  const suffix = booking.partySize > 1 ? ` (${booking.partySize})` : "";
  return `${booking.customerName}${suffix}`;
}

function resolveOccurrenceStatus(
  status: BookingStatus
): "cancelled" | "scheduled" {
  return status === "cancelled" || status === "no_show"
    ? "cancelled"
    : "scheduled";
}

function mapBookingToOccurrence(
  booking: BookingRecord,
  settings: BookingsPluginSettings
): CalendarOccurrence {
  const secondaryDates =
    settings.secondaryCalendars.length > 0
      ? formatSecondaryCalendars(
          new Date(booking.startDate),
          settings.secondaryCalendars
        )
      : undefined;
  const uid = booking.sourceCollection || "plugin::bookings.booking";
  const datePart = booking.startDate.slice(0, 10);

  return {
    occurrenceId: `${uid}:${booking.documentId}:${datePart}`,
    documentId: booking.documentId,
    uid,
    sourceId: booking.resourceDocumentId || "bookings",
    sourceLabel: booking.resourceName || "Bookings",
    occurrenceDate: datePart,
    startDate: booking.startDate,
    endDate: booking.endDate,
    allDay: false,
    timezone: booking.timezone || settings.defaultTimezone || "UTC",
    title: resolveOccurrenceTitle(booking),
    color: STATUS_COLORS[booking.status] || booking.resourceColor || "#0d9488",
    category: booking.status,
    status: resolveOccurrenceStatus(booking.status),
    location: booking.assignedHost
      ? `Host: ${booking.assignedHost}`
      : booking.organization,
    summary: booking.notes,
    isRecurring: false,
    calendarLinks: {
      google: "",
      outlook: "",
      yahoo: "",
      icsPath: `/api/bookings/feed.ics`,
    },
    alternateDates: secondaryDates,
    customFields: {
      bookingCode: booking.bookingCode,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      organization: booking.organization,
      partySize: booking.partySize,
      status: booking.status,
      preferredLanguage: booking.preferredLanguage,
      assignedHost: booking.assignedHost,
      slotLabel: booking.slotLabel,
      resourceDocumentId: booking.resourceDocumentId,
      resourceName: booking.resourceName,
    },
  };
}

export default ({ strapi }: { strapi: Core.Strapi }): AvailabilityService => ({
  async listResources(
    activeOnly = false,
    limit = 200
  ): Promise<BookingResource[]> {
    const safeLimit = clampNumber(limit, 200, 1, 500);
    const filters = activeOnly ? { isActive: { $eq: true } } : undefined;
    const rows = await strapi.documents(RESOURCE_UID).findMany({
      filters,
      sort: "name:asc",
      limit: safeLimit,
    });

    const normalized = (Array.isArray(rows) ? rows : []).map(
      normalizeResourceRecord
    );
    const filtered = activeOnly
      ? normalized.filter((r) => r.isActive)
      : normalized;
    return filtered.slice(0, safeLimit);
  },

  async getResource(idOrSlug: string): Promise<BookingResource | null> {
    const trimmed = typeof idOrSlug === "string" ? idOrSlug.trim() : "";
    if (!trimmed) return null;
    const rows = await strapi.documents(RESOURCE_UID).findMany({
      filters: {
        $or: [{ documentId: { $eq: trimmed } }, { slug: { $eq: trimmed } }],
      },
      limit: 50,
    });
    const normalized = (Array.isArray(rows) ? rows : []).map(
      normalizeResourceRecord
    );
    const match = normalized.find(
      (r) => r.documentId === trimmed || r.slug === trimmed
    );
    return match ?? null;
  },

  async saveResource(
    payload: Partial<BookingResource> & { name: string }
  ): Promise<BookingResource> {
    const settingsService = strapi
      .plugin(PLUGIN_ID)
      .service<SettingsService>("settings");
    const settings = await settingsService.getSettings();

    const data: Record<string, unknown> = {
      ...buildResourceMetaData(payload),
      ...buildResourceScheduleData(payload, settings),
      ...buildResourceExtrasData(payload),
    };

    if (payload.documentId) {
      const updated = await strapi.documents(RESOURCE_UID).update({
        documentId: payload.documentId,
        data,
      });
      if (!updated) {
        throw new BookingNotFoundError("Booking resource not found");
      }
      return normalizeResourceRecord(updated);
    }

    const created = await strapi.documents(RESOURCE_UID).create({
      data,
    });
    return normalizeResourceRecord(created);
  },

  async getAvailableSlots(params): Promise<AvailableSlot[]> {
    const {
      resourceDocumentId,
      resourceSlug,
      from,
      to,
      partySize = 1,
      preferredLanguage,
      referenceNow,
    } = params;

    const settingsService = strapi
      .plugin(PLUGIN_ID)
      .service<SettingsService>("settings");
    const reservationService = strapi
      .plugin(PLUGIN_ID)
      .service<ReservationService>("reservation");

    const settings = await settingsService.getSettings();
    let targetResources: BookingResource[] = [];

    if (resourceDocumentId || resourceSlug) {
      const single = await this.getResource(
        (resourceDocumentId || resourceSlug) as string
      );
      if (single && single.isActive) {
        targetResources = [single];
      }
    } else {
      targetResources = await this.listResources(true);
    }

    if (targetResources.length === 0) {
      return [];
    }

    const fromMs = parseBoundaryMs(from, false);
    const toMs = parseBoundaryMs(to, true);
    if (fromMs === null || toMs === null || toMs < fromMs) {
      return [];
    }

    const existingBookings = await reservationService.listBookings({
      from: new Date(fromMs - 86_400_000).toISOString(),
      to: new Date(toMs + 86_400_000).toISOString(),
      activeOnly: true,
      limit: 1000,
      resourceDocumentId:
        targetResources.length === 1
          ? targetResources[0].documentId
          : undefined,
    });

    const allSlots: AvailableSlot[] = [];
    for (const resource of targetResources) {
      const resourceSlots = computeAvailableSlots({
        resource,
        from,
        to,
        existingBookings,
        partySize,
        preferredLanguage,
        secondaryCalendars: settings.secondaryCalendars,
        globalSeasonalSchedules: settings.defaultSeasonalSchedules,
        globalHolidays: settings.holidays,
        referenceNow,
      });
      allSlots.push(...resourceSlots);
    }

    return allSlots.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  },

  async getCalendarOccurrences(query: BookingFilterQuery) {
    const settingsService = strapi
      .plugin(PLUGIN_ID)
      .service<SettingsService>("settings");
    const reservationService = strapi
      .plugin(PLUGIN_ID)
      .service<ReservationService>("reservation");

    const [settings, resources, bookings] = await Promise.all([
      settingsService.getSettings(),
      this.listResources(false),
      reservationService.listBookings(query),
    ]);

    const occurrences: CalendarOccurrence[] = bookings.map((booking) =>
      mapBookingToOccurrence(booking, settings)
    );

    const stats: BookingStats = {
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter((b) => b.status === "confirmed")
        .length,
      pendingBookings: bookings.filter((b) => b.status === "pending").length,
      cancelledBookings: bookings.filter(
        (b) => b.status === "cancelled" || b.status === "no_show"
      ).length,
      completedBookings: bookings.filter((b) => b.status === "completed")
        .length,
      totalGuests: bookings
        .filter((b) => b.status !== "cancelled" && b.status !== "no_show")
        .reduce((sum, b) => sum + Math.max(1, b.partySize), 0),
      activeResources: resources.filter((r) => r.isActive).length,
    };

    return {
      occurrences,
      bookings,
      stats,
    };
  },
});
