import crypto from 'node:crypto';
import type { Core } from '@strapi/strapi';
import { generateRegistrationsCsv } from '../../../shared/icalGenerator';
import {
  EVENT_CONTENT_TYPE_UID,
  REGISTRATION_CONTENT_TYPE_UID,
} from '../../../shared/pluginId';
import { toDateKey } from '../../../shared/rruleEngine';
import type {
  RsvpRegistrationInput,
  RsvpRegistrationRecord,
  RsvpStats,
  RsvpStatus,
} from '../../../shared/types';
import { getDocumentsClient } from '../types';
import {
  type ResolvedTargetEvent,
  aggregateRsvpCounts,
  formatRegistrationRecord,
  maskEmail,
  resolveAssignedRsvpStatus,
  resolveTargetEvent,
  trySendNotificationEmail,
  validateRegistrationInputAndEvent,
} from './rsvpHelpers';

export { maskEmail };

async function resolveStatsEventConfig(
  strapi: Core.Strapi,
  params: {
    eventUid?: string;
    eventDocumentId: string;
    capacityOverride?: number | null;
    waitlistOverride?: boolean;
    rsvpEnabledOverride?: boolean;
  }
): Promise<{
  eventUid: string;
  capacity: number | null;
  waitlistEnabled: boolean;
  rsvpEnabled: boolean;
}> {
  if (params.capacityOverride === undefined) {
    const resolved = await resolveTargetEvent(strapi, params.eventDocumentId, params.eventUid);
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
    rsvpEnabled: params.rsvpEnabledOverride ?? true,
  };
}

async function fetchRegistrationRecordsSafe(
  strapi: Core.Strapi,
  eventDocumentId: string,
  occurrenceDate: string | null
): Promise<Array<Record<string, unknown>>> {
  const filters: Record<string, unknown> = {
    eventDocumentId: { $eq: eventDocumentId },
    ...(occurrenceDate ? { occurrenceDate: { $eq: occurrenceDate } } : {}),
  };
  try {
    return await getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID).findMany({
      filters,
      limit: 5000,
    });
  } catch {
    return [];
  }
}

function resolveOccurrenceDateForInput(
  inputDate: string | undefined,
  eventStartDate: string
): string {
  if (inputDate && /^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
    return inputDate;
  }
  return toDateKey(eventStartDate) || new Date().toISOString().slice(0, 10);
}

function buildRegistrationCreateData(args: {
  targetEvent: ResolvedTargetEvent;
  eventDocumentId: string;
  occurrenceDate: string;
  attendeeName: string;
  attendeeEmail: string;
  guestsCount: number;
  assignedStatus: RsvpStatus;
  checkInToken: string;
  input: RsvpRegistrationInput;
}): Record<string, unknown> {
  const {
    targetEvent,
    eventDocumentId,
    occurrenceDate,
    attendeeName,
    attendeeEmail,
    guestsCount,
    assignedStatus,
    checkInToken,
    input,
  } = args;
  return {
    eventUid: targetEvent.uid,
    eventDocumentId,
    eventTitle: targetEvent.title,
    occurrenceDate,
    attendeeName,
    attendeeEmail,
    attendeePhone: input.attendeePhone ? String(input.attendeePhone).trim().slice(0, 50) : '',
    guestsCount,
    status: assignedStatus,
    checkInToken,
    locale: input.locale ? String(input.locale).slice(0, 10) : 'es',
    notes: input.notes ? String(input.notes).trim().slice(0, 2000) : '',
    metadata: input.metadata ?? null,
  };
}

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

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async getEventStats(params: {
      eventUid?: string;
      eventDocumentId: string;
      occurrenceDate?: string | null;
      capacityOverride?: number | null;
      waitlistOverride?: boolean;
      rsvpEnabledOverride?: boolean;
    }): Promise<RsvpStats> {
      const { eventDocumentId, occurrenceDate = null } = params;
      const { eventUid, capacity, waitlistEnabled, rsvpEnabled } =
        await resolveStatsEventConfig(strapi, params);
      const records = await fetchRegistrationRecordsSafe(strapi, eventDocumentId, occurrenceDate);
      const counts = aggregateRsvpCounts(records);
      const remainingSeats =
        capacity !== null ? Math.max(0, capacity - counts.confirmedSeats) : null;
      const isFull = capacity !== null ? counts.confirmedSeats >= capacity : false;

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
      const targetEvent = await resolveTargetEvent(strapi, eventDocumentId, input.eventUid);
      if (!targetEvent) {
        throw new Error(`Event not found for documentId: ${eventDocumentId}`);
      }

      const { attendeeName, attendeeEmail, guestsCount } =
        validateRegistrationInputAndEvent(input, targetEvent);
      const occurrenceDate = resolveOccurrenceDateForInput(
        input.occurrenceDate,
        targetEvent.startDate
      );

      const client = getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID);
      const existing = await client.findMany({
        filters: {
          eventDocumentId: { $eq: eventDocumentId },
          occurrenceDate: { $eq: occurrenceDate },
          attendeeEmail: { $eq: attendeeEmail },
          status: { $in: ['confirmed', 'waitlisted', 'checked_in'] },
        },
        limit: 1,
      });

      if (existing.length > 0) {
        throw new Error('An active registration already exists for this email and date.');
      }

      const stats = await this.getEventStats({
        eventUid: targetEvent.uid,
        eventDocumentId,
        occurrenceDate,
        capacityOverride: targetEvent.capacity,
        waitlistOverride: targetEvent.waitlistEnabled,
        rsvpEnabledOverride: targetEvent.rsvpEnabled,
      });

      const assignedStatus = resolveAssignedRsvpStatus(
        targetEvent,
        stats.confirmedSeats,
        guestsCount
      );
      const checkInToken = crypto.randomBytes(24).toString('hex');

      const created = await client.create({
        data: buildRegistrationCreateData({
          targetEvent,
          eventDocumentId,
          occurrenceDate,
          attendeeName,
          attendeeEmail,
          guestsCount,
          assignedStatus,
          checkInToken,
          input,
        }),
      });

      await trySendNotificationEmail(strapi, {
        to: attendeeEmail,
        attendeeName,
        eventTitle: targetEvent.title,
        occurrenceDate,
        guestsCount,
        status: assignedStatus,
      });

      const formatted = formatRegistrationRecord({
        ...created,
        eventUid: targetEvent.uid,
        eventDocumentId,
        eventTitle: targetEvent.title,
        occurrenceDate,
        attendeeName,
        attendeeEmail,
        guestsCount,
        status: assignedStatus,
      });

      return {
        ...formatted,
        attendeePhone: formatted.attendeePhone ?? '',
        notes: formatted.notes ?? '',
        cancellationToken: checkInToken,
      };
    },

    async promoteFromWaitlist(params: {
      eventUid: string;
      eventDocumentId: string;
      occurrenceDate: string;
    }): Promise<RsvpRegistrationRecord[]> {
      const targetEvent = await resolveTargetEvent(
        strapi,
        params.eventDocumentId,
        params.eventUid
      );
      if (!targetEvent || targetEvent.capacity === null) {
        return [];
      }

      const stats = await this.getEventStats({
        eventUid: targetEvent.uid,
        eventDocumentId: params.eventDocumentId,
        occurrenceDate: params.occurrenceDate,
        capacityOverride: targetEvent.capacity,
        waitlistOverride: targetEvent.waitlistEnabled,
        rsvpEnabledOverride: targetEvent.rsvpEnabled,
      });

      let availableSeats = stats.remainingSeats ?? 0;
      if (availableSeats <= 0) return [];

      const client = getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID);
      const waitlisted = await client.findMany({
        filters: {
          eventDocumentId: { $eq: params.eventDocumentId },
          occurrenceDate: { $eq: params.occurrenceDate },
          status: { $eq: 'waitlisted' },
        },
        sort: 'createdAt:asc',
        limit: 200,
      });

      const promoted: RsvpRegistrationRecord[] = [];
      for (const candidate of waitlisted) {
        if (availableSeats <= 0) break;
        const needed = formatRegistrationRecord(candidate).guestsCount;
        if (needed > availableSeats) continue;

        const updated = await client.update({
          documentId: String(candidate.documentId),
          data: { status: 'confirmed' },
        });
        availableSeats -= needed;
        promoted.push(formatRegistrationRecord(updated));

        await trySendNotificationEmail(strapi, {
          to: String(candidate.attendeeEmail),
          attendeeName: String(candidate.attendeeName),
          eventTitle: String(candidate.eventTitle ?? targetEvent.title),
          occurrenceDate: params.occurrenceDate,
          guestsCount: needed,
          status: 'confirmed',
          promotedFromWaitlist: true,
        });
      }

      return promoted;
    },

    async cancelByToken(token: string): Promise<{
      cancelled: RsvpRegistrationRecord;
      promotedCount: number;
    }> {
      const cleanedToken = (token ?? '').trim();
      if (!cleanedToken || cleanedToken.length < 16) {
        throw new Error('Invalid cancellation token.');
      }

      const client = getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID);
      const matches = await client.findMany({
        filters: { checkInToken: { $eq: cleanedToken } },
        limit: 1,
      });

      if (matches.length === 0) {
        throw new Error('Registration not found for the provided token.');
      }

      const record = matches[0];
      const wasConfirmed = record.status === 'confirmed' || record.status === 'checked_in';
      const updated = await client.update({
        documentId: String(record.documentId),
        data: { status: 'cancelled' },
      });

      const promoted = wasConfirmed
        ? await this.promoteFromWaitlist({
            eventUid: String(record.eventUid ?? EVENT_CONTENT_TYPE_UID),
            eventDocumentId: String(record.eventDocumentId),
            occurrenceDate: String(record.occurrenceDate),
          })
        : [];

      return {
        cancelled: formatRegistrationRecord(updated),
        promotedCount: promoted.length,
      };
    },

    async updateRegistrationStatus(
      registrationDocumentId: string,
      newStatus: RsvpStatus
    ): Promise<{
      registration: RsvpRegistrationRecord;
      promotedCount: number;
    }> {
      const validStatuses: RsvpStatus[] = ['confirmed', 'waitlisted', 'cancelled', 'checked_in'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      const client = getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID);
      const existing = await client.findOne({ documentId: registrationDocumentId });
      if (!existing) {
        throw new Error(`Registration ${registrationDocumentId} not found.`);
      }

      const wasOccupyingSeat =
        existing.status === 'confirmed' || existing.status === 'checked_in';
      const nowOccupyingSeat = newStatus === 'confirmed' || newStatus === 'checked_in';

      const dataPatch: Record<string, unknown> = {
        status: newStatus,
        ...(newStatus === 'checked_in' && !existing.checkedInAt
          ? { checkedInAt: new Date().toISOString() }
          : {}),
      };

      const updated = await client.update({
        documentId: registrationDocumentId,
        data: dataPatch,
      });

      const promoted =
        wasOccupyingSeat && !nowOccupyingSeat
          ? await this.promoteFromWaitlist({
              eventUid: String(existing.eventUid ?? EVENT_CONTENT_TYPE_UID),
              eventDocumentId: String(existing.eventDocumentId),
              occurrenceDate: String(existing.occurrenceDate),
            })
          : [];

      return {
        registration: formatRegistrationRecord(updated),
        promotedCount: promoted.length,
      };
    },

    async checkInAttendee(identifier: {
      documentId?: string;
      token?: string;
    }): Promise<RsvpRegistrationRecord> {
      let targetDocId = identifier.documentId;

      if (!targetDocId && identifier.token) {
        const matches = await getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID).findMany({
          filters: { checkInToken: { $eq: identifier.token.trim() } },
          limit: 1,
        });
        if (matches.length > 0) {
          targetDocId = String(matches[0].documentId);
        }
      }

      if (!targetDocId) {
        throw new Error('Registration not found for check-in.');
      }

      const { registration } = await this.updateRegistrationStatus(targetDocId, 'checked_in');
      return registration;
    },

    async listRegistrations(filters?: {
      eventDocumentId?: string;
      occurrenceDate?: string;
      status?: RsvpStatus;
      search?: string;
    }): Promise<RsvpRegistrationRecord[]> {
      const rows = await getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID).findMany({
        filters: buildListRegistrationsQueryFilters(filters),
        sort: 'createdAt:desc',
        limit: 1000,
      });

      return rows.map((r) => formatRegistrationRecord(r));
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
