import type { Core } from "@strapi/strapi";

import type { RsvpRegistrationInput } from "../../../shared/types";
import {
  type StrapiKoaContext,
  getErrorMessage,
  getIcalService,
  getOccurrenceService,
  getRsvpService,
} from "../types";

function optStr(val: unknown): string | undefined {
  return typeof val === "string" && val ? val : undefined;
}

function unwrapRequestData(rawBody: Record<string, unknown>): Record<string, unknown> {
  if (rawBody.data && typeof rawBody.data === "object" && !Array.isArray(rawBody.data)) {
    return rawBody.data as Record<string, unknown>;
  }
  return rawBody;
}

function buildRegistrationInput(body: Record<string, unknown>): RsvpRegistrationInput {
  const metadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : undefined;

  return {
    eventUid: optStr(body.eventUid),
    occurrenceDate: optStr(body.occurrenceDate),
    attendeeName: String(body.attendeeName ?? ""),
    attendeeEmail: String(body.attendeeEmail ?? ""),
    attendeePhone: optStr(body.attendeePhone),
    guestsCount: typeof body.guestsCount === "number" ? body.guestsCount : 1,
    locale: optStr(body.locale),
    notes: optStr(body.notes),
    metadata,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async listOccurrences(ctx: StrapiKoaContext) {
      const q = ctx.query ?? {};
      const data = await getOccurrenceService(strapi).getOccurrences({
        from: optStr(q.from),
        to: optStr(q.to),
        category: optStr(q.category),
        sourceId: optStr(q.sourceId),
        locale: optStr(q.locale),
        includeDrafts: false,
      });
      ctx.body = { data };
    },

    async listSpotlights(ctx: StrapiKoaContext) {
      const q = ctx.query ?? {};
      const data = await getOccurrenceService(strapi).getActiveSpotlights({
        date: optStr(q.date),
        category: optStr(q.category),
        sourceId: optStr(q.sourceId),
        locale: optStr(q.locale),
        includeDrafts: false,
      });
      ctx.body = { data };
    },

    async getEventStats(ctx: StrapiKoaContext) {
      const { documentId } = ctx.params ?? {};
      const q = ctx.query ?? {};
      const data = await getRsvpService(strapi).getEventStats({
        eventUid: optStr(q.eventUid),
        eventDocumentId: String(documentId ?? ""),
        occurrenceDate: optStr(q.occurrenceDate) ?? null,
      });
      ctx.body = { data };
    },

    async registerAttendee(ctx: StrapiKoaContext) {
      try {
        const { documentId } = ctx.params ?? {};
        const body = unwrapRequestData((ctx.request?.body ?? {}) as Record<string, unknown>);
        const data = await getRsvpService(strapi).registerAttendee(
          String(documentId ?? ""),
          buildRegistrationInput(body)
        );
        ctx.status = 201;
        ctx.body = { data };
      } catch (err: unknown) {
        ctx.badRequest(getErrorMessage(err, "Registration could not be completed."));
      }
    },

    async cancelRegistration(ctx: StrapiKoaContext) {
      try {
        const { token } = ctx.params ?? {};
        const data = await getRsvpService(strapi).cancelByToken(String(token ?? ""));
        ctx.body = { data };
      } catch (err: unknown) {
        ctx.badRequest(getErrorMessage(err, "Cancellation could not be processed."));
      }
    },

    async downloadFeedIcs(ctx: StrapiKoaContext) {
      const q = ctx.query ?? {};
      const ics = await getIcalService(strapi).generateFeedIcs({
        from: optStr(q.from),
        to: optStr(q.to),
        category: optStr(q.category),
        sourceId: optStr(q.sourceId),
        locale: optStr(q.locale),
      });

      ctx.set("Content-Type", "text/calendar; charset=utf-8");
      ctx.set("Content-Disposition", 'attachment; filename="calendar.ics"');
      ctx.set("X-Content-Type-Options", "nosniff");
      ctx.body = ics;
    },

    async downloadEventInviteIcs(ctx: StrapiKoaContext) {
      const { documentId } = ctx.params ?? {};
      const q = ctx.query ?? {};
      const safeDocId = String(documentId ?? "event").replace(/[^a-zA-Z0-9_-]/g, "");
      const ics = await getIcalService(strapi).generateEventInviteIcs({
        documentId: String(documentId ?? ""),
        occurrenceDate: optStr(q.occurrenceDate),
        locale: optStr(q.locale),
      });

      ctx.set("Content-Type", "text/calendar; charset=utf-8");
      ctx.set("Content-Disposition", `attachment; filename="event-${safeDocId}.ics"`);
      ctx.set("X-Content-Type-Options", "nosniff");
      ctx.body = ics;
    },
  };
};
