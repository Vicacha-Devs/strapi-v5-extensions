import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../../shared/pluginId";
import type {
  BookingFilterQuery,
  BookingResource,
  BookingsPluginSettings,
  BookingStatus,
  CreateReservationInput,
} from "../../../shared/types";
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
  badRequest(message: string): void;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsService = () =>
    strapi.plugin(PLUGIN_ID).service("settings") as SettingsService;
  const getAvailabilityService = () =>
    strapi.plugin(PLUGIN_ID).service("availability") as AvailabilityService;
  const getReservationService = () =>
    strapi.plugin(PLUGIN_ID).service("reservation") as ReservationService;

  return {
    async getSettings(ctx: AdminContext) {
      const settings = await getSettingsService().getSettings();
      ctx.body = { data: settings };
    },

    async updateSettings(ctx: AdminContext) {
      const payload = (ctx.request.body ??
        {}) as Partial<BookingsPluginSettings>;
      const updated = await getSettingsService().updateSettings(payload);
      ctx.body = { data: updated };
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
      const body = (ctx.request.body ?? {}) as Partial<BookingResource> & {
        name?: string;
      };
      if (!body.name || !body.name.trim()) {
        ctx.badRequest("Resource name is required");
        return;
      }
      const saved = await getAvailabilityService().saveResource({
        ...body,
        name: body.name,
      });
      ctx.body = { data: saved };
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

      ctx.body = {
        data: {
          ...calendarData,
          resources,
          settings,
        },
      };
    },

    async createBooking(ctx: AdminContext) {
      try {
        const body = (ctx.request.body ??
          {}) as unknown as CreateReservationInput;
        const result = await getReservationService().createReservation(body, {
          skipLeadTimeCheck: true,
        });
        ctx.body = { data: result };
      } catch (err) {
        ctx.badRequest(
          err instanceof Error ? err.message : "Invalid booking payload"
        );
      }
    },

    async updateBookingStatus(ctx: AdminContext) {
      try {
        const documentId = ctx.params.documentId;
        if (!documentId) {
          ctx.badRequest("documentId parameter is required");
          return;
        }
        const body = (ctx.request.body ?? {}) as {
          status?: BookingStatus;
          assignedHost?: string;
          internalNotes?: string;
        };
        if (!body.status) {
          ctx.badRequest("status is required");
          return;
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
        ctx.badRequest(
          err instanceof Error ? err.message : "Status update failed"
        );
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
          ctx.badRequest("newStartDate is required");
          return;
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
        ctx.badRequest(
          err instanceof Error ? err.message : "Reschedule failed"
        );
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
      const ics = await getReservationService().exportICal({
        from: ctx.query.from,
        to: ctx.query.to,
        resourceDocumentId: ctx.query.resourceDocumentId,
        status: (ctx.query.status as BookingStatus | undefined) ?? "",
      });
      ctx.set("Content-Type", "text/calendar; charset=utf-8");
      ctx.set("Content-Disposition", 'attachment; filename="bookings.ics"');
      ctx.set("X-Content-Type-Options", "nosniff");
      ctx.body = ics;
    },
  };
};
