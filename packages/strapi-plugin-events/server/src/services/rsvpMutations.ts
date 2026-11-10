import type { Core } from "@strapi/strapi";

import {
  EVENT_CONTENT_TYPE_UID,
  REGISTRATION_CONTENT_TYPE_UID,
} from "../../../shared/pluginId";
import type { RsvpRegistrationRecord, RsvpStatus } from "../../../shared/types";
import {
  PluginNotFoundError,
  PluginValidationError,
  getDocumentsClient,
} from "../types";
import {
  type ResolvedTargetEvent,
  aggregateRsvpCounts,
  formatRegistrationRecord,
  readStoredGuestsCount,
  resolveTargetEvent,
  trySendNotificationEmail,
} from "./rsvpHelpers";
import {
  assertScheduledOccurrence,
  findRegistrationByRawToken,
  hashRsvpToken,
  verifyTokenHashConstantTime,
  withOccurrenceLock,
} from "./rsvpSecurity";

export interface EmailQueueItem {
  to: string;
  attendeeName: string;
  eventTitle: string;
  occurrenceDate: string;
  guestsCount: number;
  status: RsvpStatus;
  promotedFromWaitlist?: boolean;
}

export async function fetchRegistrationRecordsSafe(
  strapi: Core.Strapi,
  eventDocumentId: string,
  occurrenceDate: string | null
): Promise<Array<Record<string, unknown>>> {
  const filters: Record<string, unknown> = {
    eventDocumentId: { $eq: eventDocumentId },
    ...(occurrenceDate ? { occurrenceDate: { $eq: occurrenceDate } } : {}),
  };
  try {
    return await getDocumentsClient(
      strapi,
      REGISTRATION_CONTENT_TYPE_UID
    ).findMany({
      filters,
      limit: 5000,
    });
  } catch {
    return [];
  }
}

export async function promoteFromWaitlistUnlocked(
  strapi: Core.Strapi,
  params: {
    eventUid: string;
    eventDocumentId: string;
    occurrenceDate: string;
    targetEventOverride?: ResolvedTargetEvent | null;
  }
): Promise<{
  promoted: RsvpRegistrationRecord[];
  emails: EmailQueueItem[];
}> {
  const targetEvent =
    params.targetEventOverride !== undefined
      ? params.targetEventOverride
      : await resolveTargetEvent(
          strapi,
          params.eventDocumentId,
          params.eventUid,
          { includeDrafts: true }
        );
  if (
    !targetEvent ||
    targetEvent.capacity === null ||
    targetEvent.eventStatus === "cancelled"
  ) {
    return { promoted: [], emails: [] };
  }

  const slotRecords = await fetchRegistrationRecordsSafe(
    strapi,
    params.eventDocumentId,
    params.occurrenceDate
  );
  const counts = aggregateRsvpCounts(slotRecords);
  let availableSeats = Math.max(
    0,
    targetEvent.capacity - counts.confirmedSeats
  );
  if (availableSeats <= 0) {
    return { promoted: [], emails: [] };
  }

  const client = getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID);
  const waitlisted = await client.findMany({
    filters: {
      eventDocumentId: { $eq: params.eventDocumentId },
      occurrenceDate: { $eq: params.occurrenceDate },
      status: { $eq: "waitlisted" },
    },
    sort: "createdAt:asc",
    limit: 200,
  });

  const promoted: RsvpRegistrationRecord[] = [];
  const emails: EmailQueueItem[] = [];

  for (const candidate of waitlisted) {
    if (availableSeats <= 0) break;
    if (candidate.status !== "waitlisted") continue;
    const needed = readStoredGuestsCount(candidate.guestsCount);
    if (needed > availableSeats) continue;

    const updated = await client.update({
      documentId: String(candidate.documentId),
      data: { status: "confirmed" },
    });
    availableSeats -= needed;
    promoted.push(formatRegistrationRecord(updated));
    emails.push({
      to: String(candidate.attendeeEmail),
      attendeeName: String(candidate.attendeeName),
      eventTitle: String(candidate.eventTitle ?? targetEvent.title),
      occurrenceDate: params.occurrenceDate,
      guestsCount: needed,
      status: "confirmed",
      promotedFromWaitlist: true,
    });
  }

  return { promoted, emails };
}

export async function executeCancelByToken(
  strapi: Core.Strapi,
  token: string
): Promise<{
  cancelled: RsvpRegistrationRecord;
  promotedCount: number;
}> {
  const cleanedToken = (token ?? "").trim();
  if (!cleanedToken || cleanedToken.length < 16) {
    throw new PluginValidationError("Invalid cancellation token.");
  }

  const initialMatch = await findRegistrationByRawToken(strapi, cleanedToken);
  if (!initialMatch) {
    throw new PluginNotFoundError(
      "Registration not found for the provided token."
    );
  }

  const regDocId = String(initialMatch.record.documentId);
  const eventDocId = String(initialMatch.record.eventDocumentId);
  const occDate = String(initialMatch.record.occurrenceDate);
  const eventUid = String(
    initialMatch.record.eventUid ?? EVENT_CONTENT_TYPE_UID
  );

  const targetEvent = await resolveTargetEvent(strapi, eventDocId, eventUid, {
    includeDrafts: true,
  });
  if (targetEvent) {
    try {
      const endMs = assertScheduledOccurrence(targetEvent, occDate);
      if (endMs !== null && Number.isFinite(endMs) && Date.now() > endMs) {
        throw new PluginValidationError(
          "Cannot cancel registration after the event has ended."
        );
      }
    } catch (err: unknown) {
      if (
        err instanceof PluginValidationError &&
        err.message.includes("ended")
      ) {
        throw err;
      }
    }
  }

  const { cancelledRecord, emails, promotedCount } = await withOccurrenceLock(
    strapi,
    eventDocId,
    occDate,
    async () => {
      const client = getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID);
      const fresh = await client.findOne({ documentId: regDocId });
      if (
        !fresh ||
        !verifyTokenHashConstantTime(initialMatch.tokenHash, fresh.checkInToken)
      ) {
        throw new PluginValidationError(
          "Invalid or already used cancellation token."
        );
      }
      if (fresh.status === "cancelled") {
        throw new PluginValidationError(
          "Registration has already been cancelled."
        );
      }
      if (fresh.status === "checked_in") {
        throw new PluginValidationError(
          "Checked-in registrations cannot be cancelled."
        );
      }

      const wasConfirmed = fresh.status === "confirmed";
      const updated = await client.update({
        documentId: regDocId,
        data: { status: "cancelled", checkInToken: null },
      });

      const promo = wasConfirmed
        ? await promoteFromWaitlistUnlocked(strapi, {
            eventUid,
            eventDocumentId: eventDocId,
            occurrenceDate: occDate,
            targetEventOverride: targetEvent,
          })
        : { promoted: [], emails: [] };

      return {
        cancelledRecord: formatRegistrationRecord(updated),
        promotedCount: promo.promoted.length,
        emails: promo.emails,
      };
    }
  );

  for (const email of emails) {
    await trySendNotificationEmail(strapi, email);
  }

  return {
    cancelled: cancelledRecord,
    promotedCount,
  };
}

export async function executeUpdateRegistrationStatus(
  strapi: Core.Strapi,
  registrationDocumentId: string,
  newStatus: RsvpStatus
): Promise<{
  registration: RsvpRegistrationRecord;
  promotedCount: number;
}> {
  const validStatuses: RsvpStatus[] = [
    "confirmed",
    "waitlisted",
    "cancelled",
    "checked_in",
  ];
  if (!validStatuses.includes(newStatus)) {
    throw new PluginValidationError(`Invalid status: ${String(newStatus)}`);
  }

  const client = getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID);
  const initial = await client.findOne({
    documentId: registrationDocumentId,
  });
  if (!initial) {
    throw new PluginNotFoundError(
      `Registration ${registrationDocumentId} not found.`
    );
  }

  const eventDocId = String(initial.eventDocumentId);
  const occDate = String(initial.occurrenceDate);
  const eventUid = String(initial.eventUid ?? EVENT_CONTENT_TYPE_UID);

  const { registration, promotedCount, emails } = await withOccurrenceLock(
    strapi,
    eventDocId,
    occDate,
    async () => {
      const existing = await client.findOne({
        documentId: registrationDocumentId,
      });
      if (!existing) {
        throw new PluginNotFoundError(
          `Registration ${registrationDocumentId} not found.`
        );
      }

      const wasOccupyingSeat =
        existing.status === "confirmed" || existing.status === "checked_in";
      const nowOccupyingSeat =
        newStatus === "confirmed" || newStatus === "checked_in";

      const targetEvent = await resolveTargetEvent(
        strapi,
        eventDocId,
        eventUid,
        { includeDrafts: true }
      );

      if (nowOccupyingSeat && targetEvent?.eventStatus === "cancelled") {
        throw new PluginValidationError(
          "Cannot confirm or check in registration for a cancelled event."
        );
      }

      if (
        !wasOccupyingSeat &&
        nowOccupyingSeat &&
        targetEvent &&
        targetEvent.capacity !== null
      ) {
        const slotRecords = await fetchRegistrationRecordsSafe(
          strapi,
          eventDocId,
          occDate
        );
        const counts = aggregateRsvpCounts(slotRecords);
        const neededSeats = readStoredGuestsCount(existing.guestsCount);
        if (counts.confirmedSeats + neededSeats > targetEvent.capacity) {
          throw new PluginValidationError(
            "Cannot confirm registration: event has reached maximum capacity."
          );
        }
      }

      const dataPatch: Record<string, unknown> = {
        status: newStatus,
        ...(newStatus === "checked_in" && !existing.checkedInAt
          ? { checkedInAt: new Date().toISOString() }
          : {}),
        ...(newStatus === "cancelled" ? { checkInToken: null } : {}),
      };

      const updated = await client.update({
        documentId: registrationDocumentId,
        data: dataPatch,
      });

      const promo =
        wasOccupyingSeat && !nowOccupyingSeat
          ? await promoteFromWaitlistUnlocked(strapi, {
              eventUid,
              eventDocumentId: eventDocId,
              occurrenceDate: occDate,
              targetEventOverride: targetEvent,
            })
          : { promoted: [], emails: [] };

      return {
        registration: formatRegistrationRecord(updated),
        promotedCount: promo.promoted.length,
        emails: promo.emails,
      };
    }
  );

  for (const email of emails) {
    await trySendNotificationEmail(strapi, email);
  }

  return { registration, promotedCount };
}

export async function executeCheckInAttendee(
  strapi: Core.Strapi,
  identifier: {
    documentId?: string;
    token?: string;
  }
): Promise<RsvpRegistrationRecord> {
  let targetDocId = identifier.documentId?.trim();
  let providedTokenHash: string | null = null;

  if (identifier.token !== undefined) {
    const cleanedToken = String(identifier.token).trim();
    if (cleanedToken.length < 16 || cleanedToken.length > 256) {
      throw new PluginValidationError("Invalid check-in token.");
    }
    providedTokenHash = hashRsvpToken(cleanedToken);
    if (!targetDocId) {
      const match = await findRegistrationByRawToken(strapi, cleanedToken);
      if (!match) {
        throw new PluginValidationError("Invalid check-in token.");
      }
      targetDocId = String(match.record.documentId);
    }
  }

  if (!targetDocId) {
    throw new PluginNotFoundError("Registration not found for check-in.");
  }

  const client = getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID);
  const initial = await client.findOne({ documentId: targetDocId });
  if (!initial) {
    throw new PluginNotFoundError("Registration not found for check-in.");
  }

  const eventDocId = String(initial.eventDocumentId);
  const occDate = String(initial.occurrenceDate);
  const eventUid = String(initial.eventUid ?? EVENT_CONTENT_TYPE_UID);

  return withOccurrenceLock(strapi, eventDocId, occDate, async () => {
    const existing = await client.findOne({ documentId: targetDocId });
    if (!existing) {
      throw new PluginNotFoundError("Registration not found for check-in.");
    }
    if (
      providedTokenHash !== null &&
      !verifyTokenHashConstantTime(providedTokenHash, existing.checkInToken)
    ) {
      throw new PluginValidationError("Invalid check-in token.");
    }

    const targetEvent = await resolveTargetEvent(strapi, eventDocId, eventUid, {
      includeDrafts: true,
    });
    if (targetEvent?.eventStatus === "cancelled") {
      throw new PluginValidationError(
        "Cannot check in attendee for a cancelled event."
      );
    }

    if (existing.status === "checked_in") {
      return formatRegistrationRecord(existing);
    }
    if (existing.status !== "confirmed") {
      throw new PluginValidationError(
        `Cannot check in attendee with status "${String(existing.status)}": only confirmed registrations can be checked in.`
      );
    }

    const updated = await client.update({
      documentId: targetDocId,
      data: {
        status: "checked_in",
        checkedInAt: existing.checkedInAt || new Date().toISOString(),
      },
    });
    return formatRegistrationRecord(updated);
  });
}
