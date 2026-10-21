import type { Core } from '@strapi/strapi';
import {
  type StrapiKoaContext,
  getErrorMessage,
  getIcalService,
  getOccurrenceService,
  getRsvpService,
} from '../types';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async listOccurrences(ctx: StrapiKoaContext) {
      const { from, to, category, sourceId, locale } = ctx.query ?? {};
      const data = await getOccurrenceService(strapi).getOccurrences({
        from: typeof from === 'string' ? from : undefined,
        to: typeof to === 'string' ? to : undefined,
        category: typeof category === 'string' ? category : undefined,
        sourceId: typeof sourceId === 'string' ? sourceId : undefined,
        locale: typeof locale === 'string' ? locale : undefined,
        includeDrafts: false,
      });
      ctx.body = { data };
    },

    async listSpotlights(ctx: StrapiKoaContext) {
      const { date, category, sourceId, locale } = ctx.query ?? {};
      const data = await getOccurrenceService(strapi).getActiveSpotlights({
        date: typeof date === 'string' ? date : undefined,
        category: typeof category === 'string' ? category : undefined,
        sourceId: typeof sourceId === 'string' ? sourceId : undefined,
        locale: typeof locale === 'string' ? locale : undefined,
        includeDrafts: false,
      });
      ctx.body = { data };
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

    async registerAttendee(ctx: StrapiKoaContext) {
      try {
        const { documentId } = ctx.params ?? {};
        const rawBody = ctx.request?.body ?? {};
        const body =
          rawBody.data && typeof rawBody.data === 'object'
            ? (rawBody.data as Record<string, unknown>)
            : rawBody;
        const data = await getRsvpService(strapi).registerAttendee(String(documentId ?? ''), {
          eventUid: typeof body.eventUid === 'string' ? body.eventUid : undefined,
          occurrenceDate: typeof body.occurrenceDate === 'string' ? body.occurrenceDate : undefined,
          attendeeName: String(body.attendeeName ?? ''),
          attendeeEmail: String(body.attendeeEmail ?? ''),
          attendeePhone: typeof body.attendeePhone === 'string' ? body.attendeePhone : undefined,
          guestsCount: typeof body.guestsCount === 'number' ? body.guestsCount : 1,
          locale: typeof body.locale === 'string' ? body.locale : undefined,
          notes: typeof body.notes === 'string' ? body.notes : undefined,
          metadata:
            body.metadata && typeof body.metadata === 'object'
              ? (body.metadata as Record<string, unknown>)
              : undefined,
        });
        ctx.status = 201;
        ctx.body = { data };
      } catch (err: unknown) {
        ctx.badRequest(getErrorMessage(err, 'Registration could not be completed.'));
      }
    },

    async cancelRegistration(ctx: StrapiKoaContext) {
      try {
        const { token } = ctx.params ?? {};
        const data = await getRsvpService(strapi).cancelByToken(String(token ?? ''));
        ctx.body = { data };
      } catch (err: unknown) {
        ctx.badRequest(getErrorMessage(err, 'Cancellation could not be processed.'));
      }
    },

    async downloadFeedIcs(ctx: StrapiKoaContext) {
      const { from, to, category, sourceId, locale } = ctx.query ?? {};
      const ics = await getIcalService(strapi).generateFeedIcs({
        from: typeof from === 'string' ? from : undefined,
        to: typeof to === 'string' ? to : undefined,
        category: typeof category === 'string' ? category : undefined,
        sourceId: typeof sourceId === 'string' ? sourceId : undefined,
        locale: typeof locale === 'string' ? locale : undefined,
      });

      ctx.set('Content-Type', 'text/calendar; charset=utf-8');
      ctx.set('Content-Disposition', 'attachment; filename="calendar.ics"');
      ctx.set('X-Content-Type-Options', 'nosniff');
      ctx.body = ics;
    },

    async downloadEventInviteIcs(ctx: StrapiKoaContext) {
      const { documentId } = ctx.params ?? {};
      const { occurrenceDate, locale } = ctx.query ?? {};
      const safeDocId = String(documentId ?? 'event').replace(/[^a-zA-Z0-9_-]/g, '');
      const ics = await getIcalService(strapi).generateEventInviteIcs({
        documentId: String(documentId ?? ''),
        occurrenceDate: typeof occurrenceDate === 'string' ? occurrenceDate : undefined,
        locale: typeof locale === 'string' ? locale : undefined,
      });

      ctx.set('Content-Type', 'text/calendar; charset=utf-8');
      ctx.set('Content-Disposition', `attachment; filename="event-${safeDocId}.ics"`);
      ctx.set('X-Content-Type-Options', 'nosniff');
      ctx.body = ics;
    },
  };
};
