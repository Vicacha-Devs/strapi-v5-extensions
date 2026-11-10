import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../../shared/pluginId";
import type {
  BookingFilterQuery,
  BookingResource,
  BookingsPluginSettings,
  BookingStatus,
  CreateReservationInput,
} from "../../../shared/types";
import {
  BookingForbiddenError,
  BookingNotFoundError,
  BookingValidationError,
} from "../errors";
import type {
  AvailabilityService,
  ReservationService,
  SettingsService,
} from "../types";

export interface AdminContext {
  query: Record<string, string | undefined>;
  params: Record<string, string | undefined>;
  request: {
    body?: Record<string, unknown>;
  };
  body: unknown;
  status: number;
  set(header: string, value: string): void;
  badRequest(message: string): unknown;
  notFound?(message: string): unknown;
  forbidden?(message: string): unknown;
}

function respondControllerError(
  ctx: AdminContext,
  strapi: Core.Strapi,
  err: unknown,
  fallbackMessage: string
): unknown {
  if (err instanceof BookingNotFoundError) {
    if (typeof ctx.notFound === "function") {
      return ctx.notFound(err.message);
    }
    ctx.status = 404;
    ctx.body = {
      error: { status: 404, name: "NotFoundError", message: err.message },
    };
    return undefined;
  }
  if (err instanceof BookingForbiddenError) {
    if (typeof ctx.forbidden === "function") {
      return ctx.forbidden(err.message);
    }
    ctx.status = 403;
    ctx.body = {
      error: { status: 403, name: "ForbiddenError", message: err.message },
    };
    return undefined;
  }
  if (err instanceof BookingValidationError) {
    return ctx.badRequest(err.message);
  }
  strapi.log?.error?.(
    `[bookings] ${fallbackMessage}: ${err instanceof Error ? err.message : "unknown error"}`
  );
  return ctx.badRequest(fallbackMessage);
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsService = () =>
    strapi.plugin(PLUGIN_ID).service<SettingsService>("settings");
  const getAvailabilityService = () =>
    strapi.plugin(PLUGIN_ID).service<AvailabilityService>("availability");
  const getReservationService = () =>
    strapi.plugin(PLUGIN_ID).service<ReservationService>("reservation");

  return {
    async getSettings(ctx: AdminContext) {
      const settings = await getSettingsService().getSettings();
      ctx.body = { data: settings };
    },

    async updateSettings(ctx: AdminContext) {
      try {
        const payload = (ctx.request.body ??
          {}) as Partial<BookingsPluginSettings>;
        const updated = await getSettingsService().updateSettings(payload);
        ctx.body = { data: updated };
      } catch (err) {
        return respondControllerError(
          ctx,
          strapi,
          err,
          "Failed to update bookings settings"
        );
      }
    },

    async discoverSchemas(ctx: AdminContext) {
      const schemas = await getSettingsService().discoverSchemas();
      ctx.body = { data: schemas };
    },

    async listResources(ctx: AdminContext) {
      const activeOnly = ctx.query.activeOnly === "true";
      const resources =
        await getAvailabilityService().listResources(activeOnly);
      ctx.body = { data: resources };
    },

    async saveResource(ctx: AdminContext) {
      try {
        const body = (ctx.request.body ?? {}) as Partial<BookingResource> & {
          name?: string;
        };
        if (typeof body.name !== "string" || !body.name.trim()) {
          return ctx.badRequest("Resource name is required");
        }
        const saved = await getAvailabilityService().saveResource({
          ...body,
          name: body.name,
        });
        ctx.body = { data: saved };
      } catch (err) {
        return respondControllerError(
          ctx,
          strapi,
          err,
          "Failed to save booking resource"
        );
      }
    },

    async getCalendar(ctx: AdminContext) {
      const query: BookingFilterQuery = {
        from: ctx.query.from,
        to: ctx.query.to,
        resourceDocumentId: ctx.query.resourceDocumentId,
        resourceSlug: ctx.query.resourceSlug,
        status: (ctx.query.status as BookingStatus | undefined) ?? "",
        preferredLanguage: ctx.query.preferredLanguage,
        search: ctx.query.search,
        source: ctx.query.source,
      };
      const [calendarData, resources, settings] = await Promise.all([
        getAvailabilityService().getCalendarOccurrences(query),
        getAvailabilityService().listResources(false),
        getSettingsService().getSettings(),
      ]);
      const { icalFeedToken: _omit, ...safeSettings } = settings;

      ctx.body = {
        data: {
          ...calendarData,
          resources,
          settings: safeSettings,
        },
      };
    },

    async createBooking(ctx: AdminContext) {
      try {
        const body = (ctx.request.body ??
          {}) as unknown as CreateReservationInput;
        const result = await getReservationService().createReservation(body, {
          isAdmin: true,
          skipLeadTimeCheck: true,
        });
        ctx.body = { data: result };
      } catch (err) {
        return respondControllerError(
          ctx,
          strapi,
          err,
          "Invalid booking payload"
        );
      }
    },

    async updateBookingStatus(ctx: AdminContext) {
      try {
        const documentId = ctx.params.documentId;
        if (!documentId) {
          return ctx.badRequest("documentId parameter is required");
        }
        const body = (ctx.request.body ?? {}) as {
          status?: BookingStatus;
          assignedHost?: string;
          internalNotes?: string;
        };
        if (!body.status) {
          return ctx.badRequest("status is required");
        }
        const updated = await getReservationService().updateBookingStatus(
          documentId,
          body.status,
          {
            assignedHost: body.assignedHost,
            internalNotes: body.internalNotes,
          }
        );
        ctx.body = { data: updated };
      } catch (err) {
        return respondControllerError(ctx, strapi, err, "Status update failed");
      }
    },

    async rescheduleBooking(ctx: AdminContext) {
      try {
        const body = (ctx.request.body ?? {}) as {
          bookingDocumentId?: string;
          bookingCode?: string;
          newStartDate?: string;
          newEndDate?: string;
          newSlotLabel?: string;
          partySize?: number;
        };
        if (!body.newStartDate) {
          return ctx.badRequest("newStartDate is required");
        }
        const updated = await getReservationService().rescheduleBooking(
          {
            bookingDocumentId: body.bookingDocumentId ?? ctx.params.documentId,
            bookingCode: body.bookingCode,
            newStartDate: body.newStartDate,
            newEndDate: body.newEndDate,
            newSlotLabel: body.newSlotLabel,
            partySize: body.partySize,
          },
          { isAdmin: true }
        );
        ctx.body = { data: updated };
      } catch (err) {
        return respondControllerError(ctx, strapi, err, "Reschedule failed");
      }
    },

    async exportCsv(ctx: AdminContext) {
      const csv = await getReservationService().exportCsv({
        from: ctx.query.from,
        to: ctx.query.to,
        resourceDocumentId: ctx.query.resourceDocumentId,
        status: (ctx.query.status as BookingStatus | undefined) ?? "",
        search: ctx.query.search,
      });
      ctx.set("Content-Type", "text/csv; charset=utf-8");
      ctx.set("Content-Disposition", 'attachment; filename="bookings.csv"');
      ctx.set("X-Content-Type-Options", "nosniff");
      ctx.body = csv;
    },

    async exportICal(ctx: AdminContext) {
      const ics = await getReservationService().exportICal(
        {
          from: ctx.query.from,
          to: ctx.query.to,
          resourceDocumentId: ctx.query.resourceDocumentId,
          status: (ctx.query.status as BookingStatus | undefined) ?? "",
        },
        { anonymize: false }
      );
      ctx.set("Content-Type", "text/calendar; charset=utf-8");
      ctx.set("Content-Disposition", 'attachment; filename="bookings.ics"');
      ctx.set("X-Content-Type-Options", "nosniff");
      ctx.body = ics;
    },
  };
};
