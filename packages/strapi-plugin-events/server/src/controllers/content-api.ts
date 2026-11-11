import type { Core } from "@strapi/strapi";

import type { RsvpRegistrationInput } from "../../../shared/types";
import { assertValidGuestsCount } from "../services/rsvpHelpers";
import {
  type PaginationParams,
  type StrapiKoaContext,
  getIcalService,
  getOccurrenceService,
  getRsvpService,
  handleControllerError,
} from "../types";

const MAX_PUBLIC_PAGE_SIZE = 100;

function optStr(val: unknown): string | undefined {
  return typeof val === "string" && val ? val : undefined;
}

function optQueryInt(val: unknown): number | undefined {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string" && val.trim() !== "") {
    const parsed = Number(val);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function clampPublicQueryPagination(
  q: Record<string, unknown>
): PaginationParams {
  const rawPage = optQueryInt(q.page);
  const rawPageSize = optQueryInt(q.pageSize);
  const rawLimit = optQueryInt(q.limit);

  if (rawPage !== undefined || rawPageSize !== undefined) {
    const page =
      rawPage !== undefined
        ? Math.max(1, Math.min(1000, Math.floor(rawPage)))
        : 1;
    const sizeCandidate = rawPageSize ?? rawLimit ?? 50;
    const pageSize = Math.max(
      1,
      Math.min(MAX_PUBLIC_PAGE_SIZE, Math.floor(sizeCandidate))
    );
    return { page, pageSize };
  }

  const limit =
    rawLimit !== undefined
      ? Math.max(1, Math.min(MAX_PUBLIC_PAGE_SIZE, Math.floor(rawLimit)))
      : MAX_PUBLIC_PAGE_SIZE;
  return { limit };
}

function unwrapRequestData(
  rawBody: Record<string, unknown>
): Record<string, unknown> {
  if (
    rawBody.data &&
    typeof rawBody.data === "object" &&
    !Array.isArray(rawBody.data)
  ) {
    return rawBody.data as Record<string, unknown>;
  }
  return rawBody;
}

function buildRegistrationInput(
  body: Record<string, unknown>
): RsvpRegistrationInput {
  const guestsCount = assertValidGuestsCount(body.guestsCount);
  const metadata =
    body.metadata &&
    typeof body.metadata === "object" &&
    !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : undefined;

  return {
    eventUid: optStr(body.eventUid),
    occurrenceDate: optStr(body.occurrenceDate),
    attendeeName: String(body.attendeeName ?? ""),
    attendeeEmail: String(body.attendeeEmail ?? ""),
    attendeePhone: optStr(body.attendeePhone),
    guestsCount,
    locale: optStr(body.locale),
    notes: optStr(body.notes),
    metadata,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async listOccurrences(ctx: StrapiKoaContext) {
      const q = ctx.query ?? {};
      const pagination = clampPublicQueryPagination(q);
      const data = await getOccurrenceService(strapi).getOccurrences({
        from: optStr(q.from),
        to: optStr(q.to),
        category: optStr(q.category),
        sourceId: optStr(q.sourceId),
        locale: optStr(q.locale),
        includeDrafts: false,
        ...pagination,
      });
      ctx.body = { data };
    },

    async listSpotlights(ctx: StrapiKoaContext) {
      const q = ctx.query ?? {};
      const pagination = clampPublicQueryPagination(q);
      const data = await getOccurrenceService(strapi).getActiveSpotlights({
        date: optStr(q.date),
        category: optStr(q.category),
        sourceId: optStr(q.sourceId),
        locale: optStr(q.locale),
        includeDrafts: false,
        ...pagination,
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
        includeDrafts: false,
      });
      ctx.body = { data };
    },

    async registerAttendee(ctx: StrapiKoaContext) {
      try {
        const { documentId } = ctx.params ?? {};
        const body = unwrapRequestData(
          (ctx.request?.body ?? {}) as Record<string, unknown>
        );
        const data = await getRsvpService(strapi).registerAttendee(
          String(documentId ?? ""),
          buildRegistrationInput(body)
        );
        ctx.status = 201;
        ctx.body = { data };
      } catch (err: unknown) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Registration could not be completed."
        );
      }
    },

    async cancelRegistration(ctx: StrapiKoaContext) {
      try {
        const { token } = ctx.params ?? {};
        const data = await getRsvpService(strapi).cancelByToken(
          String(token ?? "")
        );
        ctx.body = { data };
      } catch (err: unknown) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Cancellation could not be processed."
        );
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
      try {
        const { documentId } = ctx.params ?? {};
        const q = ctx.query ?? {};
        const safeDocId =
          String(documentId ?? "event").replace(/[^a-zA-Z0-9_-]/g, "") ||
          "event";
        const ics = await getIcalService(strapi).generateEventInviteIcs({
          documentId: String(documentId ?? ""),
          occurrenceDate: optStr(q.occurrenceDate),
          locale: optStr(q.locale),
        });

        ctx.set("Content-Type", "text/calendar; charset=utf-8");
        ctx.set(
          "Content-Disposition",
          `attachment; filename="event-${safeDocId}.ics"`
        );
        ctx.set("X-Content-Type-Options", "nosniff");
        ctx.body = ics;
      } catch (err: unknown) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Invite could not be generated."
        );
      }
    },
  };
};
