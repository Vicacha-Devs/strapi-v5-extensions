import type { Core } from "@strapi/strapi";

import type { EventsPluginSettings, RsvpStatus } from "../../../shared/types";
import {
  type StrapiKoaContext,
  getErrorMessage,
  getOccurrenceService,
  getRsvpService,
  getSettingsService,
} from "../types";

function optStr(val: unknown): string | undefined {
  return typeof val === "string" && val ? val : undefined;
}

function optNum(val: unknown): number | undefined {
  return typeof val === "number" ? val : undefined;
}

function buildRescheduleInput(body: Record<string, unknown>) {
  return {
    sourceId: optStr(body.sourceId),
    uid: optStr(body.uid),
    documentId: String(body.documentId ?? ""),
    occurrenceDate: String(body.occurrenceDate ?? ""),
    newStartDate: String(body.newStartDate ?? ""),
    newEndDate: optStr(body.newEndDate),
    applyToSeries: Boolean(body.applyToSeries),
    cancelOccurrence: Boolean(body.cancelOccurrence),
  };
}

function buildQuickCreateInput(body: Record<string, unknown>) {
  return {
    sourceId: optStr(body.sourceId),
    title: String(body.title ?? ""),
    startDate: String(body.startDate ?? ""),
    endDate: optStr(body.endDate),
    location: optStr(body.location),
    category: optStr(body.category),
    summary: optStr(body.summary),
    rrule: optStr(body.rrule),
    rsvpEnabled: Boolean(body.rsvpEnabled),
    capacity: optNum(body.capacity),
  };
}

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
      const q = ctx.query ?? {};
      const settings = await getSettingsService(strapi).getSettings();
      const occurrences = await getOccurrenceService(strapi).getOccurrences({
        from: optStr(q.from),
        to: optStr(q.to),
        category: optStr(q.category),
        sourceId: optStr(q.sourceId),
        locale: optStr(q.locale),
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
        const body = (ctx.request?.body ?? {}) as Record<string, unknown>;
        const updated = await getOccurrenceService(strapi).rescheduleOccurrence(
          buildRescheduleInput(body)
        );
        ctx.body = { data: updated };
      } catch (err: unknown) {
        ctx.badRequest(getErrorMessage(err, "Unable to reschedule event occurrence."));
      }
    },

    async quickCreate(ctx: StrapiKoaContext) {
      try {
        const body = (ctx.request?.body ?? {}) as Record<string, unknown>;
        const created = await getOccurrenceService(strapi).quickCreateEvent(
          buildQuickCreateInput(body)
        );
        ctx.status = 201;
        ctx.body = { data: created };
      } catch (err: unknown) {
        ctx.badRequest(getErrorMessage(err, "Unable to create event."));
      }
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

    async listRegistrations(ctx: StrapiKoaContext) {
      const q = ctx.query ?? {};
      const data = await getRsvpService(strapi).listRegistrations({
        eventDocumentId: optStr(q.eventDocumentId),
        occurrenceDate: optStr(q.occurrenceDate),
        status: optStr(q.status) as RsvpStatus | undefined,
        search: optStr(q.search),
      });
      ctx.body = { data };
    },

    async updateRegistrationStatus(ctx: StrapiKoaContext) {
      try {
        const { documentId } = ctx.params ?? {};
        const { status } = ctx.request?.body ?? {};
        const result = await getRsvpService(strapi).updateRegistrationStatus(
          String(documentId ?? ""),
          status as RsvpStatus
        );
        ctx.body = { data: result };
      } catch (err: unknown) {
        ctx.badRequest(getErrorMessage(err, "Failed to update registration status."));
      }
    },

    async checkIn(ctx: StrapiKoaContext) {
      try {
        const { documentId } = ctx.params ?? {};
        const { token } = ctx.request?.body ?? {};
        const data = await getRsvpService(strapi).checkInAttendee({
          documentId: optStr(documentId),
          token: optStr(token),
        });
        ctx.body = { data };
      } catch (err: unknown) {
        ctx.badRequest(getErrorMessage(err, "Check-in failed."));
      }
    },

    async exportRegistrationsCsv(ctx: StrapiKoaContext) {
      const q = ctx.query ?? {};
      const csv = await getRsvpService(strapi).exportRegistrationsCsv({
        eventDocumentId: optStr(q.eventDocumentId),
        occurrenceDate: optStr(q.occurrenceDate),
        status: optStr(q.status) as RsvpStatus | undefined,
      });

      ctx.set("Content-Type", "text/csv; charset=utf-8");
      ctx.set("Content-Disposition", 'attachment; filename="event-registrations.csv"');
      ctx.set("X-Content-Type-Options", "nosniff");
      ctx.body = csv;
    },
  };
};
