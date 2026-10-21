import type { Core } from '@strapi/strapi';
import {
  generateBookingsCsv,
  generateBookingsICalFeed,
} from '../../../shared/icalAndCsv';
import { PLUGIN_ID } from '../../../shared/pluginId';
import {
  doesBookingOverlapSlot,
  isSlotBlackedOut,
  selectAvailableHostsForSlot,
} from '../../../shared/slotEngine';
import type {
  BookingFilterQuery,
  BookingRecord,
  BookingResource,
  BookingStatus,
  CancelBookingInput,
  CreateReservationInput,
  CreateReservationResult,
  RescheduleBookingInput,
} from '../../../shared/types';
import type {
  AvailabilityService,
  ReservationService,
  SettingsService,
} from '../types';
import {
  filterAndSortBookings,
  generateBookingCode,
  generateRawCancelToken,
  hashCancelToken,
  mapExternalSourceRowToBooking,
  normalizeBookingRecord,
  normalizeStatus,
  verifyCancelToken,
} from './reservationHelpers';

const BOOKING_UID = 'plugin::bookings.booking';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default ({ strapi }: { strapi: Core.Strapi }): ReservationService => ({
  async listBookings(query: BookingFilterQuery = {}): Promise<BookingRecord[]> {
    const availabilityService = strapi
      .plugin(PLUGIN_ID)
      .service('availability') as AvailabilityService;
    const settingsService = strapi
      .plugin(PLUGIN_ID)
      .service('settings') as SettingsService;

    const [resources, settings, rawRows] = await Promise.all([
      availabilityService.listResources(false),
      settingsService.getSettings(),
      strapi.documents(BOOKING_UID as never).findMany({
        populate: ['resource'],
        sort: 'startDate:asc',
      } as never) as Promise<Array<Record<string, unknown>>>,
    ]);

    const resourceMap = new Map<string, BookingResource>();
    for (const res of resources) {
      resourceMap.set(res.documentId, res);
    }

    const allBookings: BookingRecord[] = (
      Array.isArray(rawRows) ? rawRows : []
    ).map((row) => normalizeBookingRecord(row, resourceMap));

    for (const source of settings.sources) {
      if (!source.enabled || !source.uid || source.uid === BOOKING_UID) {
        continue;
      }
      try {
        const extRows = (await strapi.documents(source.uid as never).findMany({
          limit: 500,
        } as never)) as Array<Record<string, unknown>>;
        for (const extRow of Array.isArray(extRows) ? extRows : []) {
          const mapped = mapExternalSourceRowToBooking(extRow, source);
          if (mapped) {
            allBookings.push(mapped);
          }
        }
      } catch {
        // Ignore unresolvable external source
      }
    }

    return filterAndSortBookings(allBookings, resources, query);
  },

  async getBooking(documentIdOrCode: string): Promise<BookingRecord | null> {
    if (!documentIdOrCode) return null;
    const all = await this.listBookings();
    return (
      all.find(
        (b) =>
          b.documentId === documentIdOrCode ||
          b.bookingCode === documentIdOrCode
      ) ?? null
    );
  },

  async createReservation(
    input: CreateReservationInput,
    options?: { skipLeadTimeCheck?: boolean; referenceNow?: Date }
  ): Promise<CreateReservationResult> {
    const customerName = input.customerName?.trim();
    const customerEmail = input.customerEmail?.trim().toLowerCase();
    if (!customerName) {
      throw new Error('customerName is required');
    }
    if (!customerEmail || !EMAIL_REGEX.test(customerEmail)) {
      throw new Error('A valid customerEmail is required');
    }

    const startMs = Date.parse(input.startDate);
    if (Number.isNaN(startMs)) {
      throw new Error('A valid ISO startDate is required');
    }

    const availabilityService = strapi
      .plugin(PLUGIN_ID)
      .service('availability') as AvailabilityService;
    const settingsService = strapi
      .plugin(PLUGIN_ID)
      .service('settings') as SettingsService;
    const settings = await settingsService.getSettings();

    let resource: BookingResource | null = null;
    if (input.resourceDocumentId || input.resourceSlug) {
      resource = await availabilityService.getResource(
        (input.resourceDocumentId || input.resourceSlug) as string
      );
      if (!resource || !resource.isActive) {
        throw new Error('Requested booking resource is not found or inactive');
      }
    }

    const durationMins =
      resource?.slotDurationMinutes ?? settings.defaultSlotDurationMinutes ?? 60;
    const endMs = input.endDate
      ? Date.parse(input.endDate)
      : startMs + durationMins * 60_000;

    if (Number.isNaN(endMs) || endMs <= startMs) {
      throw new Error('endDate must be after startDate');
    }

    const partySize = Math.max(1, Number(input.partySize ?? 1));
    const maxParty = resource?.maxPartySize ?? 50;
    if (partySize > maxParty) {
      throw new Error(
        `Requested partySize (${partySize}) exceeds maximum allowed (${maxParty})`
      );
    }

    if (resource) {
      if (isSlotBlackedOut(startMs, endMs, resource.blackoutDates || [])) {
        throw new Error('Requested time slot falls on a blackout period');
      }

      if (!options?.skipLeadTimeCheck && options?.referenceNow) {
        const minLeadMs =
          options.referenceNow.getTime() +
          Math.max(0, resource.minLeadTimeHours || 0) * 3_600_000;
        if (startMs < minLeadMs) {
          throw new Error(
            `Bookings require at least ${resource.minLeadTimeHours} hours advance notice`
          );
        }
      }
    }

    const existing = await this.listBookings({
      resourceDocumentId: resource?.documentId,
    });
    const bufferBefore =
      resource?.bufferBeforeMinutes ?? settings.defaultBufferBeforeMinutes ?? 0;
    const bufferAfter =
      resource?.bufferAfterMinutes ?? settings.defaultBufferAfterMinutes ?? 0;
    const overlapping = existing.filter((b) =>
      doesBookingOverlapSlot(b, startMs, endMs, bufferBefore, bufferAfter)
    );

    const capacity =
      resource?.capacityPerSlot ?? settings.defaultCapacityPerSlot ?? 1;
    const bookedCount = overlapping.reduce(
      (sum, b) => sum + Math.max(1, b.partySize),
      0
    );

    if (bookedCount + partySize > capacity) {
      throw new Error(
        `Insufficient slot capacity: ${Math.max(0, capacity - bookedCount)} remaining, ${partySize} requested`
      );
    }

    let assignedHost = input.assignedHost?.trim();
    if (!assignedHost && resource) {
      const candidates = selectAvailableHostsForSlot(
        resource,
        overlapping,
        input.preferredLanguage
      );
      if (candidates.length > 0) {
        assignedHost = candidates[0].name;
      }
    }

    const requiresApproval =
      resource?.requiresApproval ?? settings.defaultRequiresApproval ?? false;
    const status: BookingStatus = requiresApproval ? 'pending' : 'confirmed';

    const bookingCode = generateBookingCode(options?.referenceNow);
    const cancelToken = generateRawCancelToken();
    const cancelTokenHash = hashCancelToken(cancelToken);

    const startIso = new Date(startMs).toISOString();
    const endIso = new Date(endMs).toISOString();
    const title = `${customerName}${resource ? ` — ${resource.name}` : ''}${partySize > 1 ? ` (${partySize})` : ''}`;

    const createdRaw = (await strapi
      .documents(BOOKING_UID as never)
      .create({
        data: {
          bookingCode,
          title,
          resource: resource?.documentId ?? undefined,
          resourceDocumentId: resource?.documentId ?? undefined,
          customerName,
          customerEmail,
          customerPhone: input.customerPhone?.trim() || undefined,
          organization: input.organization?.trim() || undefined,
          startDate: startIso,
          endDate: endIso,
          slotLabel: input.slotLabel?.trim() || undefined,
          timezone:
            input.timezone ||
            resource?.timezone ||
            settings.defaultTimezone ||
            'UTC',
          partySize,
          status,
          preferredLanguage: input.preferredLanguage?.trim() || undefined,
          assignedHost: assignedHost || undefined,
          notes: input.notes?.trim() || undefined,
          cancelTokenHash,
          sourceCollection: BOOKING_UID,
          metadata: input.metadata ?? undefined,
        },
      } as never)) as Record<string, unknown>;

    const resourceMap = new Map<string, BookingResource>();
    if (resource) {
      resourceMap.set(resource.documentId, resource);
    }
    const booking = normalizeBookingRecord(createdRaw, resourceMap);

    strapi.eventHub?.emit('bookings.created', { booking });

    return {
      booking,
      cancelToken,
      waitlisted: false,
    };
  },

  async updateBookingStatus(
    documentId: string,
    status: BookingStatus,
    options?: { assignedHost?: string; internalNotes?: string }
  ): Promise<BookingRecord> {
    const normalizedStatus = normalizeStatus(status);
    const data: Record<string, unknown> = {
      status: normalizedStatus,
    };
    if (options?.assignedHost !== undefined) {
      data.assignedHost = options.assignedHost;
    }
    if (options?.internalNotes !== undefined) {
      data.internalNotes = options.internalNotes;
    }

    const updated = (await strapi.documents(BOOKING_UID as never).update({
      documentId,
      data,
    } as never)) as Record<string, unknown>;

    const availabilityService = strapi
      .plugin(PLUGIN_ID)
      .service('availability') as AvailabilityService;
    const resources = await availabilityService.listResources(false);
    const resourceMap = new Map(resources.map((r) => [r.documentId, r]));
    const booking = normalizeBookingRecord(updated, resourceMap);

    strapi.eventHub?.emit(`bookings.${normalizedStatus}`, { booking });
    return booking;
  },

  async rescheduleBooking(
    input: RescheduleBookingInput,
    options?: { isAdmin?: boolean; referenceNow?: Date }
  ): Promise<BookingRecord> {
    const key = input.bookingDocumentId || input.bookingCode;
    if (!key) {
      throw new Error('bookingDocumentId or bookingCode is required');
    }

    const rawRows = (await strapi.documents(BOOKING_UID as never).findMany({
      populate: ['resource'],
    } as never)) as Array<Record<string, unknown>>;

    const targetRaw = (Array.isArray(rawRows) ? rawRows : []).find(
      (r) =>
        String(r.documentId ?? r.id) === key || String(r.bookingCode) === key
    );
    if (!targetRaw) {
      throw new Error('Booking not found');
    }

    if (!options?.isAdmin) {
      const storedHash = String(targetRaw.cancelTokenHash ?? '');
      if (!verifyCancelToken(input.cancelToken, storedHash)) {
        throw new Error('Invalid or missing cancelToken for rescheduling');
      }
    }

    const newStartMs = Date.parse(input.newStartDate);
    if (Number.isNaN(newStartMs)) {
      throw new Error('A valid newStartDate is required');
    }

    const oldStartMs = Date.parse(String(targetRaw.startDate));
    const oldEndMs = Date.parse(String(targetRaw.endDate));
    const defaultDurationMs =
      !Number.isNaN(oldStartMs) && !Number.isNaN(oldEndMs) && oldEndMs > oldStartMs
        ? oldEndMs - oldStartMs
        : 3_600_000;

    const newEndMs = input.newEndDate
      ? Date.parse(input.newEndDate)
      : newStartMs + defaultDurationMs;

    if (Number.isNaN(newEndMs) || newEndMs <= newStartMs) {
      throw new Error('newEndDate must be after newStartDate');
    }

    const documentId = String(targetRaw.documentId ?? targetRaw.id);
    const availabilityService = strapi
      .plugin(PLUGIN_ID)
      .service('availability') as AvailabilityService;
    const resources = await availabilityService.listResources(false);
    const resourceMap = new Map(resources.map((r) => [r.documentId, r]));
    const currentBooking = normalizeBookingRecord(targetRaw, resourceMap);
    const resource = currentBooking.resourceDocumentId
      ? resourceMap.get(currentBooking.resourceDocumentId)
      : undefined;

    const partySize = Math.max(
      1,
      Number(input.partySize ?? currentBooking.partySize ?? 1)
    );

    if (resource) {
      if (isSlotBlackedOut(newStartMs, newEndMs, resource.blackoutDates || [])) {
        throw new Error('Requested new slot falls on a blackout period');
      }
      const existing = await this.listBookings({
        resourceDocumentId: resource.documentId,
      });
      const overlapping = existing.filter(
        (b) =>
          b.documentId !== documentId &&
          doesBookingOverlapSlot(
            b,
            newStartMs,
            newEndMs,
            resource.bufferBeforeMinutes,
            resource.bufferAfterMinutes
          )
      );
      const bookedCount = overlapping.reduce(
        (sum, b) => sum + Math.max(1, b.partySize),
        0
      );
      if (bookedCount + partySize > resource.capacityPerSlot) {
        throw new Error('Insufficient capacity in the target slot');
      }
    }

    const updated = (await strapi.documents(BOOKING_UID as never).update({
      documentId,
      data: {
        startDate: new Date(newStartMs).toISOString(),
        endDate: new Date(newEndMs).toISOString(),
        slotLabel: input.newSlotLabel ?? currentBooking.slotLabel,
        partySize,
      },
    } as never)) as Record<string, unknown>;

    const booking = normalizeBookingRecord(updated, resourceMap);
    strapi.eventHub?.emit('bookings.rescheduled', { booking });
    return booking;
  },

  async cancelBooking(
    input: CancelBookingInput,
    options?: { isAdmin?: boolean }
  ): Promise<BookingRecord> {
    const key = input.bookingDocumentId || input.bookingCode;
    if (!key) {
      throw new Error('bookingDocumentId or bookingCode is required');
    }

    const rawRows = (await strapi.documents(BOOKING_UID as never).findMany({
      populate: ['resource'],
    } as never)) as Array<Record<string, unknown>>;

    const targetRaw = (Array.isArray(rawRows) ? rawRows : []).find(
      (r) =>
        String(r.documentId ?? r.id) === key || String(r.bookingCode) === key
    );
    if (!targetRaw) {
      throw new Error('Booking not found');
    }

    if (!options?.isAdmin) {
      const storedHash = String(targetRaw.cancelTokenHash ?? '');
      if (!verifyCancelToken(input.cancelToken, storedHash)) {
        throw new Error('Invalid or missing cancelToken for cancellation');
      }
    }

    const documentId = String(targetRaw.documentId ?? targetRaw.id);
    return this.updateBookingStatus(documentId, 'cancelled', {
      internalNotes: input.reason
        ? `Cancelled: ${input.reason}`
        : undefined,
    });
  },

  async exportCsv(query: BookingFilterQuery = {}): Promise<string> {
    const bookings = await this.listBookings(query);
    return generateBookingsCsv(bookings);
  },

  async exportICal(query: BookingFilterQuery = {}): Promise<string> {
    const bookings = await this.listBookings(query);
    return generateBookingsICalFeed(bookings);
  },
});
