import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../../shared/pluginId";
import type {
  BookingRecord,
  BookingsPluginSettings,
  BookingStatus,
  CancelBookingInput,
  RescheduleBookingInput,
} from "../../../shared/types";
import {
  BookingForbiddenError,
  BookingNotFoundError,
  BookingValidationError,
  withResourceLock,
} from "../errors";
import type {
  AvailabilityService,
  ReservationService,
  SettingsService,
} from "../types";
import {
  buildCapacityWindowQuery,
  computeRescheduleWindow,
  normalizeBookingRecord,
  normalizeStatus,
  parseStrictBookingStatus,
  trimOrUndefined,
  verifyCancelToken,
} from "./reservationHelpers";
import {
  parseStrictPartySize,
  resolveEffectiveMaxPartySize,
  validateBookingOperatingWindow,
  verifySlotCapacityAndResolveHost,
} from "./reservationValidators";

const BOOKING_UID = "plugin::bookings.booking";

export function resolveBookingLockKey(
  resourceDocumentId: string | undefined
): string {
  return `resource:${resourceDocumentId || "__unassigned__"}`;
}

export async function findRawBookingOrThrow(
  strapi: Core.Strapi,
  key: string | undefined
): Promise<Record<string, unknown>> {
  const trimmedKey = trimOrUndefined(key);
  if (!trimmedKey) {
    throw new BookingValidationError(
      "bookingDocumentId or bookingCode is required"
    );
  }
  const rawRows = await strapi.documents(BOOKING_UID).findMany({
    filters: {
      $or: [
        { documentId: { $eq: trimmedKey } },
        { bookingCode: { $eq: trimmedKey } },
      ],
    },
    populate: ["resource"],
    limit: 20,
  });

  const targetRaw = (Array.isArray(rawRows) ? rawRows : []).find(
    (r) =>
      String(r.documentId ?? r.id) === trimmedKey ||
      String(r.bookingCode) === trimmedKey
  );
  if (!targetRaw) {
    throw new BookingNotFoundError("Booking not found");
  }
  return targetRaw;
}

function assertBookingActiveAndNotEnded(
  raw: Record<string, unknown>,
  action: "cancel" | "reschedule",
  isAdmin: boolean,
  referenceNow?: Date
): void {
  const currentStatus = normalizeStatus(raw.status);
  if (currentStatus !== "pending" && currentStatus !== "confirmed") {
    throw new BookingValidationError(
      `Cannot ${action} a booking with status '${currentStatus}'`
    );
  }
  if (!isAdmin) {
    const now =
      referenceNow instanceof Date && !Number.isNaN(referenceNow.getTime())
        ? referenceNow
        : new Date();
    const endMs = Date.parse(String(raw.endDate ?? raw.startDate ?? ""));
    if (!Number.isNaN(endMs) && endMs <= now.getTime()) {
      throw new BookingValidationError(
        `Cannot ${action} a booking that has already ended`
      );
    }
  }
}

export async function executeUpdateBookingStatus(params: {
  strapi: Core.Strapi;
  reservationService: ReservationService;
  documentId: string;
  status: BookingStatus;
  options?: { assignedHost?: string; internalNotes?: string };
}): Promise<BookingRecord> {
  const { strapi, reservationService, documentId, status, options } = params;
  const normalizedStatus = parseStrictBookingStatus(status);
  const availabilityService = strapi
    .plugin(PLUGIN_ID)
    .service<AvailabilityService>("availability");
  const settingsService = strapi
    .plugin(PLUGIN_ID)
    .service<SettingsService>("settings");

  const [resources, settings, initialRaw] = await Promise.all([
    availabilityService.listResources(false),
    settingsService.getSettings(),
    findRawBookingOrThrow(strapi, documentId),
  ]);
  const resourceMap = new Map(resources.map((r) => [r.documentId, r]));
  const initialBooking = normalizeBookingRecord(initialRaw, resourceMap);
  const lockKey = resolveBookingLockKey(initialBooking.resourceDocumentId);

  return withResourceLock(strapi, lockKey, async () => {
    const freshRaw = await findRawBookingOrThrow(strapi, documentId);
    const currentBooking = normalizeBookingRecord(freshRaw, resourceMap);
    const prevStatus = currentBooking.status;
    const isReactivating =
      (prevStatus === "cancelled" || prevStatus === "no_show") &&
      (normalizedStatus === "confirmed" || normalizedStatus === "pending");

    let resolvedReactivationHost: string | undefined;
    if (isReactivating) {
      const resource = currentBooking.resourceDocumentId
        ? (resourceMap.get(currentBooking.resourceDocumentId) ?? null)
        : null;
      const startMs = Date.parse(currentBooking.startDate);
      const endMs = Date.parse(currentBooking.endDate);
      const existing = await reservationService.listBookings(
        buildCapacityWindowQuery(resource?.documentId, startMs, endMs)
      );
      resolvedReactivationHost = verifySlotCapacityAndResolveHost({
        existing,
        startMs,
        endMs,
        partySize: currentBooking.partySize,
        resource,
        settings,
        explicitHostRaw: options?.assignedHost ?? currentBooking.assignedHost,
        isAdmin: true,
        excludeDocumentId: currentBooking.documentId,
      });
    }

    const data: Record<string, unknown> = { status: normalizedStatus };
    if (normalizedStatus === "cancelled") {
      data.cancelTokenHash = null;
    }
    if (options?.assignedHost !== undefined) {
      data.assignedHost = resolvedReactivationHost ?? options.assignedHost;
    }
    if (options?.internalNotes !== undefined) {
      data.internalNotes = options.internalNotes;
    }

    const updated = await strapi.documents(BOOKING_UID).update({
      documentId: currentBooking.documentId,
      data,
      populate: ["resource"],
    });
    if (!updated) {
      throw new BookingNotFoundError("Booking not found");
    }

    const booking = normalizeBookingRecord(
      { ...updated, resource: updated.resource ?? freshRaw.resource },
      resourceMap
    );
    strapi.eventHub?.emit(`bookings.${normalizedStatus}`, { booking });
    return booking;
  });
}

export async function executeRescheduleBooking(params: {
  strapi: Core.Strapi;
  reservationService: ReservationService;
  input: RescheduleBookingInput;
  options?: { isAdmin?: boolean; referenceNow?: Date };
}): Promise<BookingRecord> {
  const { strapi, reservationService, input, options } = params;
  const isAdmin = Boolean(options?.isAdmin);
  const key = input.bookingDocumentId || input.bookingCode;
  const availabilityService = strapi
    .plugin(PLUGIN_ID)
    .service<AvailabilityService>("availability");
  const settingsService = strapi
    .plugin(PLUGIN_ID)
    .service<SettingsService>("settings");

  const [resources, settings, initialRaw] = await Promise.all([
    availabilityService.listResources(false),
    settingsService.getSettings(),
    findRawBookingOrThrow(strapi, key),
  ]);
  const resourceMap = new Map(resources.map((r) => [r.documentId, r]));
  const initialBooking = normalizeBookingRecord(initialRaw, resourceMap);
  const lockKey = resolveBookingLockKey(initialBooking.resourceDocumentId);

  return withResourceLock(strapi, lockKey, async () => {
    const targetRaw = await findRawBookingOrThrow(strapi, key);
    if (
      !isAdmin &&
      !verifyCancelToken(
        input.cancelToken,
        String(targetRaw.cancelTokenHash ?? "")
      )
    ) {
      throw new BookingForbiddenError(
        "Invalid or missing cancelToken for rescheduling"
      );
    }

    assertBookingActiveAndNotEnded(
      targetRaw,
      "reschedule",
      isAdmin,
      options?.referenceNow
    );

    const { newStartMs, newEndMs } = computeRescheduleWindow(targetRaw, input);
    const currentBooking = normalizeBookingRecord(targetRaw, resourceMap);
    const documentId = currentBooking.documentId;
    const resource = currentBooking.resourceDocumentId
      ? (resourceMap.get(currentBooking.resourceDocumentId) ?? null)
      : null;

    if (!isAdmin && resource && !resource.isActive) {
      throw new BookingValidationError(
        "Requested booking resource is inactive"
      );
    }

    const partySize = parseStrictPartySize(
      input.partySize,
      currentBooking.partySize
    );
    const maxParty = resolveEffectiveMaxPartySize(
      resource,
      settings as BookingsPluginSettings
    );
    if (partySize > maxParty) {
      throw new BookingValidationError(
        `Requested partySize (${partySize}) exceeds maximum allowed (${maxParty})`
      );
    }

    const windowCapacityOverride = validateBookingOperatingWindow({
      resource,
      settings,
      startMs: newStartMs,
      endMs: newEndMs,
      isAdmin,
      referenceNow: options?.referenceNow,
    });

    const existing = await reservationService.listBookings(
      buildCapacityWindowQuery(resource?.documentId, newStartMs, newEndMs)
    );
    const resolvedHost = verifySlotCapacityAndResolveHost({
      existing,
      startMs: newStartMs,
      endMs: newEndMs,
      partySize,
      resource,
      settings,
      preferredLanguage: currentBooking.preferredLanguage,
      explicitHostRaw: currentBooking.assignedHost,
      isAdmin,
      hostResolutionMode: "reschedule",
      windowCapacityOverride,
      excludeDocumentId: documentId,
    });

    const updated = await strapi.documents(BOOKING_UID).update({
      documentId,
      data: {
        startDate: new Date(newStartMs).toISOString(),
        endDate: new Date(newEndMs).toISOString(),
        slotLabel: input.newSlotLabel ?? currentBooking.slotLabel,
        partySize,
        assignedHost: resolvedHost ?? null,
      },
      populate: ["resource"],
    });
    if (!updated) {
      throw new BookingNotFoundError("Booking not found");
    }

    const booking = normalizeBookingRecord(
      { ...updated, resource: updated.resource ?? targetRaw.resource },
      resourceMap
    );
    strapi.eventHub?.emit("bookings.rescheduled", { booking });
    return booking;
  });
}

export async function executeCancelBooking(params: {
  strapi: Core.Strapi;
  input: CancelBookingInput;
  options?: { isAdmin?: boolean; referenceNow?: Date };
}): Promise<BookingRecord> {
  const { strapi, input, options } = params;
  const isAdmin = Boolean(options?.isAdmin);
  const key = input.bookingDocumentId || input.bookingCode;
  const availabilityService = strapi
    .plugin(PLUGIN_ID)
    .service<AvailabilityService>("availability");

  const [resources, initialRaw] = await Promise.all([
    availabilityService.listResources(false),
    findRawBookingOrThrow(strapi, key),
  ]);
  const resourceMap = new Map(resources.map((r) => [r.documentId, r]));
  const initialBooking = normalizeBookingRecord(initialRaw, resourceMap);
  const lockKey = resolveBookingLockKey(initialBooking.resourceDocumentId);

  return withResourceLock(strapi, lockKey, async () => {
    const targetRaw = await findRawBookingOrThrow(strapi, key);
    if (
      !isAdmin &&
      !verifyCancelToken(
        input.cancelToken,
        String(targetRaw.cancelTokenHash ?? "")
      )
    ) {
      throw new BookingForbiddenError(
        "Invalid or missing cancelToken for cancellation"
      );
    }

    assertBookingActiveAndNotEnded(
      targetRaw,
      "cancel",
      isAdmin,
      options?.referenceNow
    );

    const documentId = String(targetRaw.documentId ?? targetRaw.id);
    const existingNotes = trimOrUndefined(targetRaw.internalNotes);
    const reason = trimOrUndefined(input.reason);
    const cancelNote = reason ? `Cancelled: ${reason}` : undefined;
    const mergedNotes = cancelNote
      ? existingNotes
        ? `${existingNotes}\n${cancelNote}`
        : cancelNote
      : existingNotes;

    const updated = await strapi.documents(BOOKING_UID).update({
      documentId,
      data: {
        status: "cancelled",
        cancelTokenHash: null,
        ...(mergedNotes !== undefined ? { internalNotes: mergedNotes } : {}),
      },
      populate: ["resource"],
    });
    if (!updated) {
      throw new BookingNotFoundError("Booking not found");
    }

    const booking = normalizeBookingRecord(
      { ...updated, resource: updated.resource ?? targetRaw.resource },
      resourceMap
    );
    strapi.eventHub?.emit("bookings.cancelled", { booking });
    return booking;
  });
}
