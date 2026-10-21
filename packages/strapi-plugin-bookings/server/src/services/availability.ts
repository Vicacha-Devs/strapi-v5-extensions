import type { Core } from '@strapi/strapi';
import type { ExpandedCalendarOccurrence as CalendarOccurrence } from '@vicacha-devs/strapi-plugin-calendar/shared';
import { formatSecondaryCalendars } from '../../../shared/calendarSystems';
import { PLUGIN_ID } from '../../../shared/pluginId';
import {
  computeAvailableSlots,
  DEFAULT_WEEKLY_SCHEDULE,
} from '../../../shared/slotEngine';
import type {
  AssignableHost,
  AvailableSlot,
  BlackoutPeriod,
  BookingFilterQuery,
  BookingRecord,
  BookingResource,
  BookingResourceType,
  BookingStats,
  BookingStatus,
  HolidayScheduleRule,
  SeasonalScheduleOverride,
  WeeklyScheduleConfig,
} from '../../../shared/types';
import type {
  AvailabilityService,
  ReservationService,
  SettingsService,
} from '../types';

const RESOURCE_UID = 'plugin::bookings.resource';

const STATUS_COLORS: Record<BookingStatus, string> = {
  confirmed: '#059669',
  pending: '#d97706',
  completed: '#4f46e5',
  cancelled: '#64748b',
  no_show: '#e11d48',
};

function slugifyName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeResourceRecord(
  raw: Record<string, unknown>
): BookingResource {
  const weeklySchedule =
    raw.weeklySchedule &&
    typeof raw.weeklySchedule === 'object' &&
    'days' in (raw.weeklySchedule as Record<string, unknown>)
      ? (raw.weeklySchedule as WeeklyScheduleConfig)
      : DEFAULT_WEEKLY_SCHEDULE;

  const seasonalSchedules = Array.isArray(raw.seasonalSchedules)
    ? (raw.seasonalSchedules as SeasonalScheduleOverride[])
    : [];

  const holidayRules = Array.isArray(raw.holidayRules)
    ? (raw.holidayRules as HolidayScheduleRule[])
    : [];

  const blackoutDates = Array.isArray(raw.blackoutDates)
    ? (raw.blackoutDates as BlackoutPeriod[])
    : [];

  const supportedLanguages = Array.isArray(raw.supportedLanguages)
    ? raw.supportedLanguages.map((l) => String(l))
    : [];

  const assignedHosts = Array.isArray(raw.assignedHosts)
    ? (raw.assignedHosts as AssignableHost[])
    : [];

  return {
    documentId: String(raw.documentId ?? raw.id ?? ''),
    name: String(raw.name ?? 'Unnamed Resource'),
    slug: String(raw.slug ?? slugifyName(String(raw.name ?? 'resource'))),
    resourceType: (raw.resourceType as BookingResourceType) ?? 'service',
    description: raw.description ? String(raw.description) : undefined,
    color: String(raw.color ?? '#0d9488'),
    timezone: String(raw.timezone ?? 'UTC'),
    slotDurationMinutes: Math.max(5, Number(raw.slotDurationMinutes ?? 60)),
    bufferBeforeMinutes: Math.max(0, Number(raw.bufferBeforeMinutes ?? 0)),
    bufferAfterMinutes: Math.max(0, Number(raw.bufferAfterMinutes ?? 0)),
    capacityPerSlot: Math.max(1, Number(raw.capacityPerSlot ?? 1)),
    maxPartySize: Math.max(1, Number(raw.maxPartySize ?? 50)),
    minLeadTimeHours: Math.max(0, Number(raw.minLeadTimeHours ?? 2)),
    maxAdvanceDays: Math.max(1, Number(raw.maxAdvanceDays ?? 90)),
    requiresApproval: Boolean(raw.requiresApproval ?? false),
    weeklySchedule,
    seasonalSchedules,
    holidayRules,
    blackoutDates,
    recurrenceRule: raw.recurrenceRule ? String(raw.recurrenceRule) : undefined,
    supportedLanguages,
    assignedHosts,
    location: raw.location ? String(raw.location) : undefined,
    price: raw.price !== undefined ? Number(raw.price) : undefined,
    currency: raw.currency ? String(raw.currency) : 'USD',
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
    metadata:
      raw.metadata && typeof raw.metadata === 'object'
        ? (raw.metadata as Record<string, unknown>)
        : undefined,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }): AvailabilityService => ({
  async listResources(activeOnly = false): Promise<BookingResource[]> {
    const filters = activeOnly ? { isActive: { $eq: true } } : undefined;
    const rows = (await strapi.documents(RESOURCE_UID as never).findMany({
      filters,
      sort: 'name:asc',
    } as never)) as Array<Record<string, unknown>>;

    return (Array.isArray(rows) ? rows : []).map(normalizeResourceRecord);
  },

  async getResource(idOrSlug: string): Promise<BookingResource | null> {
    if (!idOrSlug) return null;
    const all = await this.listResources(false);
    const match = all.find(
      (r) => r.documentId === idOrSlug || r.slug === idOrSlug
    );
    return match ?? null;
  },

  async saveResource(
    payload: Partial<BookingResource> & { name: string }
  ): Promise<BookingResource> {
    const settingsService = strapi
      .plugin(PLUGIN_ID)
      .service('settings') as SettingsService;
    const settings = await settingsService.getSettings();

    const slug = payload.slug || slugifyName(payload.name);
    const data: Record<string, unknown> = {
      name: payload.name.trim(),
      slug,
      resourceType: payload.resourceType ?? 'service',
      description: payload.description ?? '',
      color: payload.color ?? '#0d9488',
      timezone: payload.timezone ?? settings.defaultTimezone,
      slotDurationMinutes:
        payload.slotDurationMinutes ?? settings.defaultSlotDurationMinutes,
      bufferBeforeMinutes:
        payload.bufferBeforeMinutes ?? settings.defaultBufferBeforeMinutes,
      bufferAfterMinutes:
        payload.bufferAfterMinutes ?? settings.defaultBufferAfterMinutes,
      capacityPerSlot:
        payload.capacityPerSlot ?? settings.defaultCapacityPerSlot,
      maxPartySize: payload.maxPartySize ?? 50,
      minLeadTimeHours:
        payload.minLeadTimeHours ?? settings.defaultMinLeadTimeHours,
      maxAdvanceDays:
        payload.maxAdvanceDays ?? settings.defaultMaxAdvanceDays,
      requiresApproval:
        payload.requiresApproval ?? settings.defaultRequiresApproval,
      weeklySchedule: payload.weeklySchedule ?? DEFAULT_WEEKLY_SCHEDULE,
      seasonalSchedules: payload.seasonalSchedules ?? [],
      holidayRules: payload.holidayRules ?? [],
      blackoutDates: payload.blackoutDates ?? [],
      recurrenceRule: payload.recurrenceRule ?? undefined,
      supportedLanguages: payload.supportedLanguages ?? [],
      assignedHosts: payload.assignedHosts ?? [],
      location: payload.location ?? undefined,
      price: payload.price ?? 0,
      currency: payload.currency ?? 'USD',
      isActive: payload.isActive ?? true,
      metadata: payload.metadata ?? undefined,
    };

    if (payload.documentId) {
      const updated = (await strapi
        .documents(RESOURCE_UID as never)
        .update({
          documentId: payload.documentId,
          data,
        } as never)) as Record<string, unknown>;
      return normalizeResourceRecord(updated);
    }

    const created = (await strapi
      .documents(RESOURCE_UID as never)
      .create({
        data,
      } as never)) as Record<string, unknown>;
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
      .service('settings') as SettingsService;
    const reservationService = strapi
      .plugin(PLUGIN_ID)
      .service('reservation') as ReservationService;

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

    const existingBookings = await reservationService.listBookings({
      from,
      to,
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
      .service('settings') as SettingsService;
    const reservationService = strapi
      .plugin(PLUGIN_ID)
      .service('reservation') as ReservationService;

    const [settings, resources, bookings] = await Promise.all([
      settingsService.getSettings(),
      this.listResources(false),
      reservationService.listBookings(query),
    ]);

    const occurrences: CalendarOccurrence[] = bookings.map((booking) => {
      const secondaryDates =
        settings.secondaryCalendars.length > 0
          ? formatSecondaryCalendars(
              new Date(booking.startDate),
              settings.secondaryCalendars
            )
          : undefined;

      const color =
        STATUS_COLORS[booking.status] || booking.resourceColor || '#0d9488';

      return {
        occurrenceId: `${booking.sourceCollection || 'plugin::bookings.booking'}:${booking.documentId}:${booking.startDate.slice(0, 10)}`,
        documentId: booking.documentId,
        uid: booking.sourceCollection || 'plugin::bookings.booking',
        sourceId: booking.resourceDocumentId || 'bookings',
        sourceLabel: booking.resourceName || 'Bookings',
        occurrenceDate: booking.startDate.slice(0, 10),
        startDate: booking.startDate,
        endDate: booking.endDate,
        allDay: false,
        timezone: booking.timezone || settings.defaultTimezone || 'UTC',
        title:
          booking.title ||
          `${booking.customerName}${booking.partySize > 1 ? ` (${booking.partySize})` : ''}`,
        color,
        category: booking.status,
        status: booking.status === 'cancelled' || booking.status === 'no_show' ? 'cancelled' : 'scheduled',
        location: booking.assignedHost
          ? `Host: ${booking.assignedHost}`
          : booking.organization,
        summary: booking.notes,
        isRecurring: false,
        calendarLinks: {
          google: '',
          outlook: '',
          yahoo: '',
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
    });

    const stats: BookingStats = {
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter((b) => b.status === 'confirmed').length,
      pendingBookings: bookings.filter((b) => b.status === 'pending').length,
      cancelledBookings: bookings.filter(
        (b) => b.status === 'cancelled' || b.status === 'no_show'
      ).length,
      completedBookings: bookings.filter((b) => b.status === 'completed').length,
      totalGuests: bookings
        .filter((b) => b.status !== 'cancelled' && b.status !== 'no_show')
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
