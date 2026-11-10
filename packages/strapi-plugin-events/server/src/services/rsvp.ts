import type { Core } from "@strapi/strapi";

import { generateRegistrationsCsv } from "../../../shared/icalGenerator";
import {
  EVENT_CONTENT_TYPE_UID,
  REGISTRATION_CONTENT_TYPE_UID,
} from "../../../shared/pluginId";
import type {
  RsvpRegistrationInput,
  RsvpRegistrationRecord,
  RsvpStats,
  RsvpStatus,
} from "../../../shared/types";
import {
  type PaginationParams,
  PluginNotFoundError,
  PluginValidationError,
  clampPaginatedSlice,
  getDocumentsClient,
} from "../types";
import {
  aggregateRsvpCounts,
  buildRegistrationCreateData,
  formatRegistrationRecord,
  maskEmail,
  resolveAssignedRsvpStatus,
  resolveTargetEvent,
  trySendNotificationEmail,
  validateRegistrationInputAndEvent,
} from "./rsvpHelpers";
import {
  executeCancelByToken,
  executeCheckInAttendee,
  executeUpdateRegistrationStatus,
  fetchRegistrationRecordsSafe,
  promoteFromWaitlistUnlocked,
} from "./rsvpMutations";
import {
  generateRawRsvpToken,
  hashRsvpToken,
  resolveValidatedOccurrenceDate,
  withOccurrenceLock,
} from "./rsvpSecurity";

export { maskEmail };

function buildListRegistrationsQueryFilters(filters?: {
  eventDocumentId?: string;
  occurrenceDate?: string;
  status?: RsvpStatus;
  search?: string;
}): Record<string, unknown> {
  const queryFilters: Record<string, unknown> = {};
  if (filters?.eventDocumentId) {
    queryFilters.eventDocumentId = { $eq: filters.eventDocumentId };
  }
  if (filters?.occurrenceDate) {
    queryFilters.occurrenceDate = { $eq: filters.occurrenceDate };
  }
  if (filters?.status) {
    queryFilters.status = { $eq: filters.status };
  }
  const q = filters?.search?.trim();
  if (q) {
    queryFilters.$or = [
      { attendeeName: { $containsi: q } },
      { attendeeEmail: { $containsi: q } },
      { eventTitle: { $containsi: q } },
    ];
  }
  return queryFilters;
}

async function resolveStatsEventConfig(
  strapi: Core.Strapi,
  params: {
    eventUid?: string;
    eventDocumentId: string;
    capacityOverride?: number | null;
    waitlistOverride?: boolean;
    rsvpEnabledOverride?: boolean;
    includeDrafts?: boolean;
  }
): Promise<{
  eventUid: string;
  capacity: number | null;
  waitlistEnabled: boolean;
  rsvpEnabled: boolean;
}> {
  if (params.capacityOverride === undefined) {
    const resolved = await resolveTargetEvent(
      strapi,
      params.eventDocumentId,
      params.eventUid,
      { includeDrafts: params.includeDrafts ?? false }
    );
    if (resolved) {
      return {
        eventUid: resolved.uid,
        capacity: resolved.capacity,
        waitlistEnabled: resolved.waitlistEnabled,
        rsvpEnabled: resolved.rsvpEnabled,
      };
    }
  }
  return {
    eventUid: params.eventUid ?? EVENT_CONTENT_TYPE_UID,
    capacity: params.capacityOverride ?? null,
    waitlistEnabled: params.waitlistOverride ?? true,
    rsvpEnabled: params.rsvpEnabledOverride ?? false,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async getEventStats(params: {
      eventUid?: string;
      eventDocumentId: string;
      occurrenceDate?: string | null;
      capacityOverride?: number | null;
      waitlistOverride?: boolean;
      rsvpEnabledOverride?: boolean;
      includeDrafts?: boolean;
    }): Promise<RsvpStats> {
      const { eventDocumentId, occurrenceDate = null } = params;
      const { eventUid, capacity, waitlistEnabled, rsvpEnabled } =
        await resolveStatsEventConfig(strapi, params);
      const records = await fetchRegistrationRecordsSafe(
        strapi,
        eventDocumentId,
        occurrenceDate
      );
      const counts = aggregateRsvpCounts(records);
      const remainingSeats =
        capacity !== null
          ? Math.max(0, capacity - counts.confirmedSeats)
          : null;
      const isFull =
        capacity !== null ? counts.confirmedSeats >= capacity : false;

      return {
        eventUid,
        eventDocumentId,
        occurrenceDate,
        rsvpEnabled,
        capacity,
        waitlistEnabled,
        ...counts,
        remainingSeats,
        isFull,
      };
    },

    async registerAttendee(
      eventDocumentId: string,
      input: RsvpRegistrationInput
    ): Promise<RsvpRegistrationRecord & { cancellationToken: string }> {
      const docId = (eventDocumentId ?? "").trim();
      if (!docId) {
        throw new PluginValidationError("Event documentId is required.");
      }

      const targetEvent = await resolveTargetEvent(
        strapi,
        docId,
        input.eventUid,
        { includeDrafts: false }
      );
      if (!targetEvent) {
        throw new PluginNotFoundError(
          `Event not found for documentId: ${docId}`
        );
      }

      const { attendeeName, attendeeEmail, guestsCount } =
        validateRegistrationInputAndEvent(input, targetEvent);
      const occurrenceDate = resolveValidatedOccurrenceDate(
        input.occurrenceDate,
        targetEvent
      );

      const rawToken = generateRawRsvpToken();
      const tokenHash = hashRsvpToken(rawToken);

      const { formatted, assignedStatus } = await withOccurrenceLock(
        strapi,
        docId,
        occurrenceDate,
        async () => {
          const client = getDocumentsClient(
            strapi,
            REGISTRATION_CONTENT_TYPE_UID
          );
          const existing = await client.findMany({
            filters: {
              eventDocumentId: { $eq: docId },
              occurrenceDate: { $eq: occurrenceDate },
              attendeeEmail: { $eq: attendeeEmail },
              status: { $in: ["confirmed", "waitlisted", "checked_in"] },
            },
            limit: 1,
          });

          if (existing.length > 0) {
            throw new PluginValidationError(
              "An active registration already exists for this email and date."
            );
          }

          const slotRecords = await fetchRegistrationRecordsSafe(
            strapi,
            docId,
            occurrenceDate
          );
          const counts = aggregateRsvpCounts(slotRecords);
          const status = resolveAssignedRsvpStatus(
            targetEvent,
            counts.confirmedSeats,
            guestsCount
          );

          const created = await client.create({
            data: buildRegistrationCreateData({
              targetEvent,
              eventDocumentId: docId,
              occurrenceDate,
              attendeeName,
              attendeeEmail,
              guestsCount,
              assignedStatus: status,
              tokenHash,
              input,
            }),
          });

          return {
            assignedStatus: status,
            formatted: formatRegistrationRecord({
              ...created,
              eventUid: targetEvent.uid,
              eventDocumentId: docId,
              eventTitle: targetEvent.title,
              occurrenceDate,
              attendeeName,
              attendeeEmail,
              guestsCount,
              status,
            }),
          };
        }
      );

      await trySendNotificationEmail(strapi, {
        to: attendeeEmail,
        attendeeName,
        eventTitle: targetEvent.title,
        occurrenceDate,
        guestsCount,
        status: assignedStatus,
      });

      return {
        ...formatted,
        attendeePhone: formatted.attendeePhone ?? "",
        notes: formatted.notes ?? "",
        cancellationToken: rawToken,
      };
    },

    async promoteFromWaitlist(params: {
      eventUid: string;
      eventDocumentId: string;
      occurrenceDate: string;
    }): Promise<RsvpRegistrationRecord[]> {
      const { promoted, emails } = await withOccurrenceLock(
        strapi,
        params.eventDocumentId,
        params.occurrenceDate,
        () => promoteFromWaitlistUnlocked(strapi, params)
      );

      for (const email of emails) {
        await trySendNotificationEmail(strapi, email);
      }
      return promoted;
    },

    cancelByToken(token: string) {
      return executeCancelByToken(strapi, token);
    },

    updateRegistrationStatus(
      registrationDocumentId: string,
      newStatus: RsvpStatus
    ) {
      return executeUpdateRegistrationStatus(
        strapi,
        registrationDocumentId,
        newStatus
      );
    },

    checkInAttendee(identifier: { documentId?: string; token?: string }) {
      return executeCheckInAttendee(strapi, identifier);
    },

    async listRegistrations(
      filters?: {
        eventDocumentId?: string;
        occurrenceDate?: string;
        status?: RsvpStatus;
        search?: string;
      } & PaginationParams
    ): Promise<RsvpRegistrationRecord[]> {
      const rows = await getDocumentsClient(
        strapi,
        REGISTRATION_CONTENT_TYPE_UID
      ).findMany({
        filters: buildListRegistrationsQueryFilters(filters),
        sort: "createdAt:desc",
        limit: 1000,
      });

      const formatted = rows.map((r) => formatRegistrationRecord(r));
      return clampPaginatedSlice(formatted, {
        limit: filters?.limit,
        page: filters?.page,
        pageSize: filters?.pageSize,
        defaultLimit: 1000,
        maxLimit: 1000,
      });
    },

    async exportRegistrationsCsv(filters?: {
      eventDocumentId?: string;
      occurrenceDate?: string;
      status?: RsvpStatus;
    }): Promise<string> {
      const records = await this.listRegistrations(filters);
      return generateRegistrationsCsv(records);
    },

    formatRegistrationRecord,
  };
};
