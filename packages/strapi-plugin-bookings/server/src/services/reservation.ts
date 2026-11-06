import type { Core } from "@strapi/strapi";

import {
  generateBookingsCsv,
  generateBookingsICalFeed,
} from "../../../shared/icalAndCsv";
import { PLUGIN_ID } from "../../../shared/pluginId";
import {
  doesBookingOverlapSlot,
  isSlotBlackedOut,
  selectAvailableHostsForSlot,
} from "../../../shared/slotEngine";
import type {
  BookingFilterQuery,
  BookingRecord,
  BookingResource,
  BookingStatus,
  CancelBookingInput,
  CreateReservationInput,
  CreateReservationResult,
  RescheduleBookingInput,
  BookingsPluginSettings,
  BookingSourceMapping,
} from "../../../shared/types";
import type {
  AvailabilityService,
  ReservationService,
  SettingsService,
} from "../types";
import {
  buildBookingCreatePayload,
  computeRescheduleWindow,
  computeReservationTimingAndParty,
  filterAndSortBookings,
  generateBookingCode,
  generateRawCancelToken,
  hashCancelToken,
  mapExternalSourceRowToBooking,
  normalizeBookingRecord,
  normalizeStatus,
  trimOrUndefined,
  validateReservationCustomerAndStart,
  verifyCancelToken,
} from "./reservationHelpers";

const BOOKING_UID = "plugin::bookings.booking";

async function loadExternalSourceBookings(
  strapi: Core.Strapi,
  sources: BookingSourceMapping[]
): Promise<BookingRecord[]> {
  const results: BookingRecord[] = [];
  for (const source of sources) {
    if (!source.enabled || !source.uid || source.uid === BOOKING_UID) {
      continue;
    }
    try {
      const extRows = (await strapi.documents(source.uid as never).findMany({
        limit: 500,
      } as never)) as Array<Record<string, unknown>>;
      for (const extRow of Array.isArray(extRows) ? extRows : []) {
        const mapped = mapExternalSourceRowToBooking(extRow, source);
        if (mapped) results.push(mapped);
      }
    } catch {
      // Ignore unresolvable external source
    }
  }
  return results;
}

async function resolveTargetBookingResource(
  availabilityService: AvailabilityService,
  input: CreateReservationInput
): Promise<BookingResource | null> {
  const key = input.resourceDocumentId || input.resourceSlug;
  if (!key) return null;
  const resource = await availabilityService.getResource(key);
  if (!resource || !resource.isActive) {
    throw new Error("Requested booking resource is not found or inactive");
  }
  return resource;
}

function validateResourceBlackoutAndLeadTime(
  resource: BookingResource | null,
  startMs: number,
  endMs: number,
  options?: { skipLeadTimeCheck?: boolean; referenceNow?: Date }
): void {
  if (!resource) return;
  if (isSlotBlackedOut(startMs, endMs, resource.blackoutDates || [])) {
    throw new Error("Requested time slot falls on a blackout period");
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

function verifySlotCapacityAndResolveHost(
  existing: BookingRecord[],
  startMs: number,
  endMs: number,
  partySize: number,
  resource: BookingResource | null,
  settings: BookingsPluginSettings,
  input: CreateReservationInput
): string | undefined {
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

  const explicitHost = trimOrUndefined(input.assignedHost);
  if (explicitHost || !resource) return explicitHost;
  const candidates = selectAvailableHostsForSlot(
    resource,
    overlapping,
    input.preferredLanguage
  );
  return candidates[0]?.name;
}

async function findRawBookingOrThrow(
  strapi: Core.Strapi,
  key: string | undefined
): Promise<Record<string, unknown>> {
  if (!key) {
    throw new Error("bookingDocumentId or bookingCode is required");
  }
  const rawRows = (await strapi.documents(BOOKING_UID as never).findMany({
    populate: ["resource"],
  } as never)) as Array<Record<string, unknown>>;

  const targetRaw = (Array.isArray(rawRows) ? rawRows : []).find(
    (r) => String(r.documentId ?? r.id) === key || String(r.bookingCode) === key
  );
  if (!targetRaw) {
    throw new Error("Booking not found");
  }
  return targetRaw;
}

async function validateRescheduleResourceAvailability(
  reservationService: ReservationService,
  resource: BookingResource | undefined,
  documentId: string,
  newStartMs: number,
  newEndMs: number,
  partySize: number
): Promise<void> {
  if (!resource) return;
  if (isSlotBlackedOut(newStartMs, newEndMs, resource.blackoutDates || [])) {
    throw new Error("Requested new slot falls on a blackout period");
  }
  const existing = await reservationService.listBookings({
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
    throw new Error("Insufficient capacity in the target slot");
  }
}

export default ({ strapi }: { strapi: Core.Strapi }): ReservationService => ({
  async listBookings(query: BookingFilterQuery = {}): Promise<BookingRecord[]> {
    const availabilityService = strapi
      .plugin(PLUGIN_ID)
      .service("availability") as AvailabilityService;
    const settingsService = strapi
      .plugin(PLUGIN_ID)
      .service("settings") as SettingsService;

    const [resources, settings, rawRows] = await Promise.all([
      availabilityService.listResources(false),
      settingsService.getSettings(),
      strapi.documents(BOOKING_UID as never).findMany({
        populate: ["resource"],
        sort: "startDate:asc",
      } as never) as Promise<Array<Record<string, unknown>>>,
    ]);

    const resourceMap = new Map(resources.map((res) => [res.documentId, res]));
    const rows = Array.isArray(rawRows) ? rawRows : [];
    const allBookings = rows.map((row) =>
      normalizeBookingRecord(row, resourceMap)
    );
    const extBookings = await loadExternalSourceBookings(
      strapi,
      settings.sources
    );
    allBookings.push(...extBookings);

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
    const { customerName, customerEmail, startMs } =
      validateReservationCustomerAndStart(input);

    const availabilityService = strapi
      .plugin(PLUGIN_ID)
      .service("availability") as AvailabilityService;
    const settingsService = strapi
      .plugin(PLUGIN_ID)
      .service("settings") as SettingsService;
    const settings = await settingsService.getSettings();
    const resource = await resolveTargetBookingResource(
      availabilityService,
      input
    );

    const { endMs, partySize } = computeReservationTimingAndParty(
      input,
      startMs,
      resource,
      settings
    );
    validateResourceBlackoutAndLeadTime(resource, startMs, endMs, options);

    const existing = await this.listBookings({
      resourceDocumentId: resource?.documentId,
    });
    const assignedHost = verifySlotCapacityAndResolveHost(
      existing,
      startMs,
      endMs,
      partySize,
      resource,
      settings,
      input
    );

    const requiresApproval =
      resource?.requiresApproval ?? settings.defaultRequiresApproval ?? false;
    const status: BookingStatus = requiresApproval ? "pending" : "confirmed";

    const bookingCode = generateBookingCode(options?.referenceNow);
    const cancelToken = generateRawCancelToken();
    const cancelTokenHash = hashCancelToken(cancelToken);

    const createdRaw = (await strapi.documents(BOOKING_UID as never).create({
      data: buildBookingCreatePayload({
        bookingCode,
        customerName,
        customerEmail,
        startMs,
        endMs,
        partySize,
        status,
        assignedHost,
        cancelTokenHash,
        resource,
        settings,
        input,
      }),
    } as never)) as Record<string, unknown>;

    const resourceMap = new Map<string, BookingResource>();
    if (resource) resourceMap.set(resource.documentId, resource);
    const booking = normalizeBookingRecord(createdRaw, resourceMap);

    strapi.eventHub?.emit("bookings.created", { booking });

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
      .service("availability") as AvailabilityService;
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
    const targetRaw = await findRawBookingOrThrow(
      strapi,
      input.bookingDocumentId || input.bookingCode
    );

    if (
      !options?.isAdmin &&
      !verifyCancelToken(
        input.cancelToken,
        String(targetRaw.cancelTokenHash ?? "")
      )
    ) {
      throw new Error("Invalid or missing cancelToken for rescheduling");
    }

    const { newStartMs, newEndMs } = computeRescheduleWindow(targetRaw, input);
    const documentId = String(targetRaw.documentId ?? targetRaw.id);
    const availabilityService = strapi
      .plugin(PLUGIN_ID)
      .service("availability") as AvailabilityService;
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

    await validateRescheduleResourceAvailability(
      this,
      resource,
      documentId,
      newStartMs,
      newEndMs,
      partySize
    );

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
    strapi.eventHub?.emit("bookings.rescheduled", { booking });
    return booking;
  },

  async cancelBooking(
    input: CancelBookingInput,
    options?: { isAdmin?: boolean }
  ): Promise<BookingRecord> {
    const targetRaw = await findRawBookingOrThrow(
      strapi,
      input.bookingDocumentId || input.bookingCode
    );

    if (
      !options?.isAdmin &&
      !verifyCancelToken(
        input.cancelToken,
        String(targetRaw.cancelTokenHash ?? "")
      )
    ) {
      throw new Error("Invalid or missing cancelToken for cancellation");
    }

    const documentId = String(targetRaw.documentId ?? targetRaw.id);
    return this.updateBookingStatus(documentId, "cancelled", {
      internalNotes: input.reason ? `Cancelled: ${input.reason}` : undefined,
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
