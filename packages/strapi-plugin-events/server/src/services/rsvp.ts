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
  formatRegistrationRecord,
  maskEmail,
  resolveTargetEvent,
  trySendNotificationEmail,
} from './rsvpHelpers';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export { maskEmail };

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
      let eventUid = params.eventUid ?? EVENT_CONTENT_TYPE_UID;
      let capacity = params.capacityOverride ?? null;
      let waitlistEnabled = params.waitlistOverride ?? true;
      let rsvpEnabled = params.rsvpEnabledOverride ?? true;

      if (params.capacityOverride === undefined) {
        const resolved = await resolveTargetEvent(strapi, eventDocumentId, params.eventUid);
        if (resolved) {
          eventUid = resolved.uid;
          capacity = resolved.capacity;
          waitlistEnabled = resolved.waitlistEnabled;
          rsvpEnabled = resolved.rsvpEnabled;
        }
      }

      const filters: Record<string, unknown> = {
        eventDocumentId: { $eq: eventDocumentId },
      };
      if (occurrenceDate) {
        filters.occurrenceDate = { $eq: occurrenceDate };
      }

      let records: Array<Record<string, unknown>> = [];
      try {
        records = await getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID).findMany({
          filters,
          limit: 5000,
        });
      } catch {
        records = [];
      }

      let confirmedCount = 0;
      let confirmedSeats = 0;
      let checkedInSeats = 0;
      let waitlistedCount = 0;
      let waitlistedSeats = 0;
      let cancelledCount = 0;

      for (const rec of records) {
        const guests =
          typeof rec.guestsCount === 'number' && rec.guestsCount > 0 ? rec.guestsCount : 1;
        const st = rec.status as RsvpStatus;
        if (st === 'confirmed' || st === 'checked_in') {
          confirmedCount++;
          confirmedSeats += guests;
          if (st === 'checked_in') {
            checkedInSeats += guests;
          }
        } else if (st === 'waitlisted') {
          waitlistedCount++;
          waitlistedSeats += guests;
        } else if (st === 'cancelled') {
          cancelledCount++;
        }
      }

      const remainingSeats =
        capacity !== null ? Math.max(0, capacity - confirmedSeats) : null;
      const isFull = capacity !== null ? confirmedSeats >= capacity : false;

      return {
        eventUid,
        eventDocumentId,
        occurrenceDate,
        rsvpEnabled,
        capacity,
        waitlistEnabled,
        confirmedCount,
        confirmedSeats,
        checkedInSeats,
        waitlistedCount,
        waitlistedSeats,
        cancelledCount,
        remainingSeats,
        isFull,
      };
    },

    async registerAttendee(
      eventDocumentId: string,
      input: RsvpRegistrationInput
    ): Promise<RsvpRegistrationRecord & { cancellationToken: string }> {
      const attendeeName = (input.attendeeName ?? '').trim();
      const attendeeEmail = (input.attendeeEmail ?? '').trim().toLowerCase();

      if (!attendeeName || attendeeName.length > 160) {
        throw new Error('Invalid attendeeName: must be between 1 and 160 characters.');
      }
      if (!attendeeEmail || !EMAIL_REGEX.test(attendeeEmail)) {
        throw new Error('Invalid attendeeEmail: must be a valid email address.');
      }

      const targetEvent = await resolveTargetEvent(strapi, eventDocumentId, input.eventUid);
      if (!targetEvent) {
        throw new Error(`Event not found for documentId: ${eventDocumentId}`);
      }

      if (!targetEvent.rsvpEnabled) {
        throw new Error('Registrations are closed for this event.');
      }

      if (targetEvent.registrationDeadline) {
        const deadlineMs = new Date(targetEvent.registrationDeadline).getTime();
        if (!Number.isNaN(deadlineMs) && Date.now() > deadlineMs) {
          throw new Error('The registration deadline for this event has passed.');
        }
      }

      const guestsCount =
        typeof input.guestsCount === 'number' && input.guestsCount >= 1
          ? Math.floor(input.guestsCount)
          : 1;

      if (guestsCount > targetEvent.maxGuestsPerRegistration) {
        throw new Error(
          `Maximum guests per registration is ${targetEvent.maxGuestsPerRegistration}.`
        );
      }

      const occurrenceDate =
        input.occurrenceDate && /^\d{4}-\d{2}-\d{2}$/.test(input.occurrenceDate)
          ? input.occurrenceDate
          : toDateKey(targetEvent.startDate) || new Date().toISOString().slice(0, 10);

      // Check duplicate active registration for same email + occurrence
      const existing = await getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID).findMany({
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

      let assignedStatus: RsvpStatus = 'confirmed';
      if (
        targetEvent.capacity !== null &&
        stats.confirmedSeats + guestsCount > targetEvent.capacity
      ) {
        if (targetEvent.waitlistEnabled) {
          assignedStatus = 'waitlisted';
        } else {
          throw new Error('Event has reached maximum capacity.');
        }
      }

      const checkInToken = crypto.randomBytes(24).toString('hex');

      const created = await getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID).create({
        data: {
          eventUid: targetEvent.uid,
          eventDocumentId,
          eventTitle: targetEvent.title,
          occurrenceDate,
          attendeeName,
          attendeeEmail,
          attendeePhone: input.attendeePhone
            ? String(input.attendeePhone).trim().slice(0, 50)
            : '',
          guestsCount,
          status: assignedStatus,
          checkInToken,
          locale: input.locale ? String(input.locale).slice(0, 10) : 'es',
          notes: input.notes ? String(input.notes).trim().slice(0, 2000) : '',
          metadata: input.metadata ?? null,
        },
      });

      await trySendNotificationEmail(strapi, {
        to: attendeeEmail,
        attendeeName,
        eventTitle: targetEvent.title,
        occurrenceDate,
        guestsCount,
        status: assignedStatus,
      });

      return {
        documentId: String(created.documentId),
        eventUid: targetEvent.uid,
        eventDocumentId,
        eventTitle: targetEvent.title,
        occurrenceDate,
        attendeeName,
        attendeeEmail,
        attendeePhone: created.attendeePhone ? String(created.attendeePhone) : '',
        guestsCount,
        status: assignedStatus,
        checkedInAt: null,
        locale: created.locale ? String(created.locale) : 'es',
        notes: created.notes ? String(created.notes) : '',
        createdAt: created.createdAt ? String(created.createdAt) : undefined,
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
      if (availableSeats <= 0) {
        return [];
      }

      const waitlisted = await getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID).findMany({
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
        const needed =
          typeof candidate.guestsCount === 'number' && candidate.guestsCount > 0
            ? candidate.guestsCount
            : 1;
        if (needed <= availableSeats) {
          const updated = await getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID).update({
            documentId: String(candidate.documentId),
            data: {
              status: 'confirmed',
            },
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

          if (availableSeats <= 0) {
            break;
          }
        }
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

      const matches = await getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID).findMany({
        filters: {
          checkInToken: { $eq: cleanedToken },
        },
        limit: 1,
      });

      if (matches.length === 0) {
        throw new Error('Registration not found for the provided token.');
      }

      const record = matches[0];
      const wasConfirmed = record.status === 'confirmed' || record.status === 'checked_in';

      const updated = await getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID).update({
        documentId: String(record.documentId),
        data: {
          status: 'cancelled',
        },
      });

      let promotedCount = 0;
      if (wasConfirmed) {
        const promoted = await this.promoteFromWaitlist({
          eventUid: String(record.eventUid ?? EVENT_CONTENT_TYPE_UID),
          eventDocumentId: String(record.eventDocumentId),
          occurrenceDate: String(record.occurrenceDate),
        });
        promotedCount = promoted.length;
      }

      return {
        cancelled: formatRegistrationRecord(updated),
        promotedCount,
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

      const existing = await getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID).findOne({
        documentId: registrationDocumentId,
      });

      if (!existing) {
        throw new Error(`Registration ${registrationDocumentId} not found.`);
      }

      const wasOccupyingSeat =
        existing.status === 'confirmed' || existing.status === 'checked_in';
      const nowOccupyingSeat = newStatus === 'confirmed' || newStatus === 'checked_in';

      const dataPatch: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'checked_in' && !existing.checkedInAt) {
        dataPatch.checkedInAt = new Date().toISOString();
      }

      const updated = await getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID).update({
        documentId: registrationDocumentId,
        data: dataPatch,
      });

      let promotedCount = 0;
      if (wasOccupyingSeat && !nowOccupyingSeat) {
        const promoted = await this.promoteFromWaitlist({
          eventUid: String(existing.eventUid ?? EVENT_CONTENT_TYPE_UID),
          eventDocumentId: String(existing.eventDocumentId),
          occurrenceDate: String(existing.occurrenceDate),
        });
        promotedCount = promoted.length;
      }

      return {
        registration: formatRegistrationRecord(updated),
        promotedCount,
      };
    },

    async checkInAttendee(identifier: {
      documentId?: string;
      token?: string;
    }): Promise<RsvpRegistrationRecord> {
      let targetDocId = identifier.documentId;

      if (!targetDocId && identifier.token) {
        const matches = await getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID).findMany({
          filters: {
            checkInToken: { $eq: identifier.token.trim() },
          },
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
      if (filters?.search && filters.search.trim()) {
        const q = filters.search.trim();
        queryFilters.$or = [
          { attendeeName: { $containsi: q } },
          { attendeeEmail: { $containsi: q } },
          { eventTitle: { $containsi: q } },
        ];
      }

      const rows = await getDocumentsClient(strapi, REGISTRATION_CONTENT_TYPE_UID).findMany({
        filters: queryFilters,
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
