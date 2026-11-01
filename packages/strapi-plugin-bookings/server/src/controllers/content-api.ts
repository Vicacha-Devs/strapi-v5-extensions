import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../../shared/pluginId";
import type {
  CancelBookingInput,
  CreateReservationInput,
  RescheduleBookingInput,
} from "../../../shared/types";
import type { AvailabilityService, ReservationService } from "../types";

interface ContentApiContext {
  query: Record<string, string | undefined>;
  params: Record<string, string | undefined>;
  request: {
    body?: Record<string, unknown>;
  };
  body: unknown;
  status: number;
  set(header: string, value: string): void;
  badRequest(message: string): void;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getAvailabilityService = () =>
    strapi.plugin(PLUGIN_ID).service("availability") as AvailabilityService;
  const getReservationService = () =>
    strapi.plugin(PLUGIN_ID).service("reservation") as ReservationService;

  return {
    async listPublicResources(ctx: ContentApiContext) {
      const resources = await getAvailabilityService().listResources(true);
      ctx.body = { data: resources };
    },

    async getAvailableSlots(ctx: ContentApiContext) {
      const now = new Date();
      const from = ctx.query.from || now.toISOString().slice(0, 10);
      const defaultTo = new Date(now.getTime() + 14 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const to = ctx.query.to || defaultTo;
      const partySize = ctx.query.partySize
        ? Math.max(1, Number.parseInt(ctx.query.partySize, 10) || 1)
        : 1;

      const slots = await getAvailabilityService().getAvailableSlots({
        resourceDocumentId: ctx.query.resourceDocumentId,
        resourceSlug: ctx.query.resourceSlug,
        from,
        to,
        partySize,
        preferredLanguage: ctx.query.preferredLanguage,
      });

      ctx.body = { data: slots };
    },

    async createReservation(ctx: ContentApiContext) {
      try {
        const body = (ctx.request.body ??
          {}) as unknown as CreateReservationInput;
        const result = await getReservationService().createReservation(body, {
          referenceNow: new Date(),
        });
        ctx.body = { data: result };
      } catch (err) {
        ctx.badRequest(
          err instanceof Error ? err.message : "Unable to complete reservation"
        );
      }
    },

    async rescheduleReservation(ctx: ContentApiContext) {
      try {
        const body = (ctx.request.body ??
          {}) as unknown as RescheduleBookingInput;
        const updated = await getReservationService().rescheduleBooking(body, {
          isAdmin: false,
          referenceNow: new Date(),
        });
        ctx.body = { data: updated };
      } catch (err) {
        ctx.badRequest(
          err instanceof Error ? err.message : "Unable to reschedule booking"
        );
      }
    },

    async cancelReservation(ctx: ContentApiContext) {
      try {
        const body = (ctx.request.body ?? {}) as unknown as CancelBookingInput;
        const cancelled = await getReservationService().cancelBooking(body, {
          isAdmin: false,
        });
        ctx.body = { data: cancelled };
      } catch (err) {
        ctx.badRequest(
          err instanceof Error ? err.message : "Unable to cancel booking"
        );
      }
    },

    async getICalFeed(ctx: ContentApiContext) {
      const ics = await getReservationService().exportICal({
        from: ctx.query.from,
        to: ctx.query.to,
        resourceDocumentId: ctx.query.resourceDocumentId,
        resourceSlug: ctx.query.resourceSlug,
        status: "confirmed",
      });
      ctx.set("Content-Type", "text/calendar; charset=utf-8");
      ctx.set("Content-Disposition", 'inline; filename="bookings.ics"');
      ctx.set("X-Content-Type-Options", "nosniff");
      ctx.body = ics;
    },
  };
};
