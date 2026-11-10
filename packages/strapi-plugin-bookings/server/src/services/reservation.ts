import type { Core } from "@strapi/strapi";

import {
  generateBookingsCsv,
  generateBookingsICalFeed,
} from "../../../shared/icalAndCsv";
import { PLUGIN_ID } from "../../../shared/pluginId";
import type {
  BookingFilterQuery,
  BookingRecord,
  BookingResource,
  BookingSourceMapping,
  BookingStatus,
  CancelBookingInput,
  CreateReservationInput,
  CreateReservationResult,
  RescheduleBookingInput,
} from "../../../shared/types";
import {
  BookingNotFoundError,
  BookingValidationError,
  isSafeObjectKey,
  withResourceLock,
} from "../errors";
import type {
  AvailabilityService,
  ReservationService,
  SettingsService,
} from "../types";
import {
  buildBookingCreatePayload,
  buildCapacityWindowQuery,
  computeOpaqueBookingUid,
  filterAndSortBookings,
  generateBookingCode,
  generateRawCancelToken,
  hashCancelToken,
  mapExternalSourceRowToBooking,
  normalizeBookingRecord,
  parseBoundaryMs,
  trimOrUndefined,
} from "./reservationHelpers";
import {
  executeCancelBooking,
  executeRescheduleBooking,
  executeUpdateBookingStatus,
  findRawBookingOrThrow,
  resolveBookingLockKey,
} from "./reservationMutations";
import {
  computeReservationTimingAndParty,
  validateBookingOperatingWindow,
  validateReservationCustomerAndStart,
  verifySlotCapacityAndResolveHost,
} from "./reservationValidators";
import { isDiscoverableCollectionUid } from "./settings";

const BOOKING_UID = "plugin::bookings.booking";

function buildDbBookingFilters(
  query: BookingFilterQuery
): Record<string, unknown> | undefined {
  const clauses: Record<string, unknown> = {};
  const fromMs = parseBoundaryMs(query.from, false);
  const toMs = parseBoundaryMs(query.to, true);
  if (fromMs !== null) {
    clauses.endDate = { $gte: new Date(fromMs).toISOString() };
  }
  if (toMs !== null) {
    clauses.startDate = { $lte: new Date(toMs).toISOString() };
  }
  if (query.activeOnly) {
    clauses.status = { $in: ["pending", "confirmed"] };
  } else if (query.status) {
    clauses.status = { $eq: query.status };
  }
  if (query.resourceDocumentId) {
    clauses.resource = { documentId: { $eq: query.resourceDocumentId } };
  }
  return Object.keys(clauses).length > 0 ? clauses : undefined;
}

function buildExternalDateFilters(
  dateField: string,
  query: BookingFilterQuery
): Record<string, unknown> | undefined {
  if (!isSafeObjectKey(dateField)) return undefined;
  const fromMs = parseBoundaryMs(query.from, false);
  const toMs = parseBoundaryMs(query.to, true);
  if (fromMs === null && toMs === null) return undefined;
  const bounds: Record<string, string> = {};
  if (fromMs !== null) {
    bounds.$gte = new Date(fromMs - 86_400_000).toISOString().slice(0, 10);
  }
  if (toMs !== null) {
    bounds.$lte = new Date(toMs + 86_400_000).toISOString();
  }
  return { [dateField]: bounds };
}

async function loadExternalSourceBookings(
  strapi: Core.Strapi,
  sources: BookingSourceMapping[],
  query: BookingFilterQuery
): Promise<BookingRecord[]> {
  const results: BookingRecord[] = [];
  for (const source of sources) {
    if (
      !source?.enabled ||
      !isDiscoverableCollectionUid(source.uid) ||
      source.uid === BOOKING_UID
    ) {
      continue;
    }
    try {
      const filters = buildExternalDateFilters(source.dateField, query);
      const extRows = await strapi.documents(source.uid).findMany({
        filters,
        limit: 500,
      });
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
  input: CreateReservationInput,
  isAdmin: boolean
): Promise<BookingResource | null> {
  const key =
    trimOrUndefined(input.resourceDocumentId) ||
    trimOrUndefined(input.resourceSlug);
  if (!key) {
    if (!isAdmin) {
      throw new BookingValidationError(
        "resourceDocumentId or resourceSlug is required"
      );
    }
    return null;
  }
  const resource = await availabilityService.getResource(key);
  if (!resource || !resource.isActive) {
    throw new BookingNotFoundError(
      "Requested booking resource is not found or inactive"
    );
  }
  return resource;
}

export default ({ strapi }: { strapi: Core.Strapi }): ReservationService => ({
  async listBookings(query: BookingFilterQuery = {}): Promise<BookingRecord[]> {
    const availabilityService = strapi
      .plugin(PLUGIN_ID)
      .service<AvailabilityService>("availability");
    const settingsService = strapi
      .plugin(PLUGIN_ID)
      .service<SettingsService>("settings");

    const rawLimit =
      typeof query.limit === "number" && Number.isFinite(query.limit)
        ? Math.min(1000, Math.max(1, Math.trunc(query.limit)))
        : 500;
    const filters = buildDbBookingFilters(query);

    const [resources, settings, rawRows] = await Promise.all([
      availabilityService.listResources(false),
      settingsService.getSettings(),
      strapi.documents(BOOKING_UID).findMany({
        filters,
        populate: ["resource"],
        sort: "startDate:asc",
        limit: rawLimit,
      }),
    ]);

    const resourceMap = new Map(resources.map((res) => [res.documentId, res]));
    const rows = Array.isArray(rawRows) ? rawRows : [];
    const allBookings = rows.map((row) =>
      normalizeBookingRecord(row, resourceMap)
    );
    const extBookings = await loadExternalSourceBookings(
      strapi,
      settings.sources,
      query
    );
    allBookings.push(...extBookings);

    return filterAndSortBookings(allBookings, resources, query);
  },

  async getBooking(documentIdOrCode: string): Promise<BookingRecord | null> {
    const trimmed = trimOrUndefined(documentIdOrCode);
    if (!trimmed) return null;
    try {
      const raw = await findRawBookingOrThrow(strapi, trimmed);
      const availabilityService = strapi
        .plugin(PLUGIN_ID)
        .service<AvailabilityService>("availability");
      const resources = await availabilityService.listResources(false);
      const resourceMap = new Map(resources.map((r) => [r.documentId, r]));
      return normalizeBookingRecord(raw, resourceMap);
    } catch (err) {
      if (err instanceof BookingNotFoundError) return null;
      throw err;
    }
  },

  async createReservation(
    input: CreateReservationInput,
    options?: {
      isAdmin?: boolean;
      skipLeadTimeCheck?: boolean;
      referenceNow?: Date;
    }
  ): Promise<CreateReservationResult> {
    const isAdmin = Boolean(options?.isAdmin);
    const { customerName, customerEmail, startMs } =
      validateReservationCustomerAndStart(input);

    const availabilityService = strapi
      .plugin(PLUGIN_ID)
      .service<AvailabilityService>("availability");
    const settingsService = strapi
      .plugin(PLUGIN_ID)
      .service<SettingsService>("settings");
    const settings = await settingsService.getSettings();
    const resource = await resolveTargetBookingResource(
      availabilityService,
      input,
      isAdmin
    );

    const lockKey = resolveBookingLockKey(resource?.documentId);

    return withResourceLock(strapi, lockKey, async () => {
      const { endMs, partySize } = computeReservationTimingAndParty(
        input,
        startMs,
        resource,
        settings
      );
      const windowCapacityOverride = validateBookingOperatingWindow({
        resource,
        settings,
        startMs,
        endMs,
        isAdmin,
        skipLeadTimeCheck: options?.skipLeadTimeCheck,
        referenceNow: options?.referenceNow,
      });

      const existing = await this.listBookings(
        buildCapacityWindowQuery(resource?.documentId, startMs, endMs)
      );
      const assignedHost = verifySlotCapacityAndResolveHost({
        existing,
        startMs,
        endMs,
        partySize,
        resource,
        settings,
        preferredLanguage: input.preferredLanguage,
        explicitHostRaw: input.assignedHost,
        isAdmin,
        windowCapacityOverride,
      });

      const requiresApproval =
        resource?.requiresApproval ?? settings.defaultRequiresApproval ?? false;
      const status: BookingStatus = requiresApproval ? "pending" : "confirmed";

      const bookingCode = generateBookingCode(options?.referenceNow);
      const cancelToken = generateRawCancelToken();
      const cancelTokenHash = hashCancelToken(cancelToken);

      const createdRaw = await strapi.documents(BOOKING_UID).create({
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
        populate: ["resource"],
      });

      const resourceMap = new Map<string, BookingResource>();
      if (resource) resourceMap.set(resource.documentId, resource);
      const booking = normalizeBookingRecord(
        {
          ...createdRaw,
          resource: createdRaw.resource ?? resource?.documentId,
        },
        resourceMap
      );

      strapi.eventHub?.emit("bookings.created", { booking });

      return {
        booking,
        cancelToken,
        waitlisted: false,
      };
    });
  },

  async updateBookingStatus(
    documentId: string,
    status: BookingStatus,
    options?: { assignedHost?: string; internalNotes?: string }
  ): Promise<BookingRecord> {
    return executeUpdateBookingStatus({
      strapi,
      reservationService: this,
      documentId,
      status,
      options,
    });
  },

  async rescheduleBooking(
    input: RescheduleBookingInput,
    options?: { isAdmin?: boolean; referenceNow?: Date }
  ): Promise<BookingRecord> {
    return executeRescheduleBooking({
      strapi,
      reservationService: this,
      input,
      options,
    });
  },

  async cancelBooking(
    input: CancelBookingInput,
    options?: { isAdmin?: boolean; referenceNow?: Date }
  ): Promise<BookingRecord> {
    return executeCancelBooking({
      strapi,
      input,
      options,
    });
  },

  async exportCsv(query: BookingFilterQuery = {}): Promise<string> {
    const bookings = await this.listBookings(query);
    return generateBookingsCsv(bookings);
  },

  async exportICal(
    query: BookingFilterQuery = {},
    options?: { anonymize?: boolean }
  ): Promise<string> {
    const bookings = await this.listBookings(query);
    if (options?.anonymize) {
      const opaqueUids: Record<string, string> = {};
      for (const b of bookings) {
        opaqueUids[b.documentId] = computeOpaqueBookingUid(b);
      }
      return generateBookingsICalFeed(bookings, undefined, {
        anonymize: true,
        opaqueUids,
      });
    }
    return generateBookingsICalFeed(bookings);
  },
});
