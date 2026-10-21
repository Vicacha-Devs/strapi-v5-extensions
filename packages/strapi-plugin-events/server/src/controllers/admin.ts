import type { Core } from '@strapi/strapi';
import type { EventsPluginSettings, RsvpStatus } from '../../../shared/types';
import {
  type StrapiKoaContext,
  getErrorMessage,
  getOccurrenceService,
  getRsvpService,
  getSettingsService,
} from '../types';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async getSettings(ctx: StrapiKoaContext) {
      const data = await getSettingsService(strapi).getSettings();
      ctx.body = { data };
    },

    async updateSettings(ctx: StrapiKoaContext) {
      const payload = (ctx.request?.body ?? {}) as Partial<EventsPluginSettings>;
      const data = await getSettingsService(strapi).updateSettings(payload);
      ctx.body = { data };
    },

    async getCalendar(ctx: StrapiKoaContext) {
      const { from, to, category, sourceId, locale } = ctx.query ?? {};
      const settings = await getSettingsService(strapi).getSettings();
      const occurrences = await getOccurrenceService(strapi).getOccurrences({
        from: typeof from === 'string' ? from : undefined,
        to: typeof to === 'string' ? to : undefined,
        category: typeof category === 'string' ? category : undefined,
        sourceId: typeof sourceId === 'string' ? sourceId : undefined,
        locale: typeof locale === 'string' ? locale : undefined,
        includeDrafts: true,
      });

      ctx.body = {
        data: {
          occurrences,
          settings,
        },
      };
    },

    async reschedule(ctx: StrapiKoaContext) {
      try {
        const body = ctx.request?.body ?? {};
        const updated = await getOccurrenceService(strapi).rescheduleOccurrence({
          sourceId: typeof body.sourceId === 'string' ? body.sourceId : undefined,
          uid: typeof body.uid === 'string' ? body.uid : undefined,
          documentId: String(body.documentId ?? ''),
          occurrenceDate: String(body.occurrenceDate ?? ''),
          newStartDate: String(body.newStartDate ?? ''),
          newEndDate: body.newEndDate ? String(body.newEndDate) : undefined,
          applyToSeries: Boolean(body.applyToSeries),
          cancelOccurrence: Boolean(body.cancelOccurrence),
        });
        ctx.body = { data: updated };
      } catch (err: unknown) {
        ctx.badRequest(getErrorMessage(err, 'Unable to reschedule event occurrence.'));
      }
    },

    async quickCreate(ctx: StrapiKoaContext) {
      try {
        const body = ctx.request?.body ?? {};
        const created = await getOccurrenceService(strapi).quickCreateEvent({
          sourceId: typeof body.sourceId === 'string' ? body.sourceId : undefined,
          title: String(body.title ?? ''),
          startDate: String(body.startDate ?? ''),
          endDate: body.endDate ? String(body.endDate) : undefined,
          location: body.location ? String(body.location) : undefined,
          category: body.category ? String(body.category) : undefined,
          summary: body.summary ? String(body.summary) : undefined,
          rrule: body.rrule ? String(body.rrule) : undefined,
          rsvpEnabled: Boolean(body.rsvpEnabled),
          capacity: typeof body.capacity === 'number' ? body.capacity : undefined,
        });
        ctx.status = 201;
        ctx.body = { data: created };
      } catch (err: unknown) {
        ctx.badRequest(getErrorMessage(err, 'Unable to create event.'));
      }
    },

    async getEventStats(ctx: StrapiKoaContext) {
      const { documentId } = ctx.params ?? {};
      const { occurrenceDate, eventUid } = ctx.query ?? {};
      const data = await getRsvpService(strapi).getEventStats({
        eventUid: typeof eventUid === 'string' ? eventUid : undefined,
        eventDocumentId: String(documentId ?? ''),
        occurrenceDate: typeof occurrenceDate === 'string' ? occurrenceDate : null,
      });
      ctx.body = { data };
    },

    async listRegistrations(ctx: StrapiKoaContext) {
      const { eventDocumentId, occurrenceDate, status, search } = ctx.query ?? {};
      const data = await getRsvpService(strapi).listRegistrations({
        eventDocumentId: typeof eventDocumentId === 'string' ? eventDocumentId : undefined,
        occurrenceDate: typeof occurrenceDate === 'string' ? occurrenceDate : undefined,
        status: typeof status === 'string' ? (status as RsvpStatus) : undefined,
        search: typeof search === 'string' ? search : undefined,
      });
      ctx.body = { data };
    },

    async updateRegistrationStatus(ctx: StrapiKoaContext) {
      try {
        const { documentId } = ctx.params ?? {};
        const { status } = ctx.request?.body ?? {};
        const result = await getRsvpService(strapi).updateRegistrationStatus(
          String(documentId ?? ''),
          status as RsvpStatus
        );
        ctx.body = { data: result };
      } catch (err: unknown) {
        ctx.badRequest(getErrorMessage(err, 'Failed to update registration status.'));
      }
    },

    async checkIn(ctx: StrapiKoaContext) {
      try {
        const { documentId } = ctx.params ?? {};
        const { token } = ctx.request?.body ?? {};
        const data = await getRsvpService(strapi).checkInAttendee({
          documentId: documentId ? String(documentId) : undefined,
          token: typeof token === 'string' ? token : undefined,
        });
        ctx.body = { data };
      } catch (err: unknown) {
        ctx.badRequest(getErrorMessage(err, 'Check-in failed.'));
      }
    },

    async exportRegistrationsCsv(ctx: StrapiKoaContext) {
      const { eventDocumentId, occurrenceDate, status } = ctx.query ?? {};
      const csv = await getRsvpService(strapi).exportRegistrationsCsv({
        eventDocumentId: typeof eventDocumentId === 'string' ? eventDocumentId : undefined,
        occurrenceDate: typeof occurrenceDate === 'string' ? occurrenceDate : undefined,
        status: typeof status === 'string' ? (status as RsvpStatus) : undefined,
      });

      ctx.set('Content-Type', 'text/csv; charset=utf-8');
      ctx.set('Content-Disposition', 'attachment; filename="event-registrations.csv"');
      ctx.set('X-Content-Type-Options', 'nosniff');
      ctx.body = csv;
    },
  };
};
