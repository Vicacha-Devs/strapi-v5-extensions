import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../../shared/pluginId";
import type { CalendarPluginSettings } from "../../../shared/types";
import {
  formatErrorMessage,
  getCalendarService,
  type QuickCreateEntryParams,
  type StrapiRouteContext,
} from "../types";

function readOptString(val: unknown): string | undefined {
  return typeof val === "string" && val ? val : undefined;
}

function parseQuickCreateBody(
  body: Record<string, unknown>
): QuickCreateEntryParams {
  const statusRaw = body.bookingStatus;
  const bookingStatus =
    statusRaw === "pending" || statusRaw === "confirmed"
      ? statusRaw
      : undefined;
  return {
    sourceId: readOptString(body.sourceId),
    title: String(body.title ?? ""),
    startDate: String(body.startDate ?? ""),
    endDate: readOptString(body.endDate),
    location: readOptString(body.location),
    category: readOptString(body.category),
    summary: readOptString(body.summary),
    rrule: readOptString(body.rrule),
    customerName: readOptString(body.customerName),
    customerEmail: readOptString(body.customerEmail),
    customerPhone: readOptString(body.customerPhone),
    partySize:
      body.partySize !== undefined ? Number(body.partySize) : undefined,
    bookingStatus,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsService = () =>
    getCalendarService(strapi, PLUGIN_ID, "settings");
  const getOccurrenceService = () =>
    getCalendarService(strapi, PLUGIN_ID, "occurrence");

  return {
    async getCalendar(ctx: StrapiRouteContext) {
      try {
        const query = ctx.query ?? {};
        const occurrences = await getOccurrenceService().getOccurrences({
          from: readOptString(query.from),
          to: readOptString(query.to),
          locale: readOptString(query.locale),
          category: readOptString(query.category),
          sourceId: readOptString(query.sourceId),
          includeDrafts: query.includeDrafts !== "false",
        });

        const settings = await getSettingsService().getSettings();
        ctx.body = {
          data: {
            occurrences,
            settings,
          },
        };
      } catch (err: unknown) {
        ctx.status = 400;
        ctx.body = {
          error: {
            message: formatErrorMessage(err, "Failed to load calendar data."),
          },
        };
      }
    },

    async reschedule(ctx: StrapiRouteContext) {
      try {
        const body = ctx.request?.body ?? {};
        const updated = await getOccurrenceService().rescheduleOccurrence({
          sourceId: readOptString(body.sourceId),
          uid: readOptString(body.uid),
          documentId: String(body.documentId ?? ""),
          locale: readOptString(body.locale),
          occurrenceDate: String(body.occurrenceDate ?? ""),
          newStartDate: String(body.newStartDate ?? ""),
          newEndDate: readOptString(body.newEndDate),
          applyToSeries: Boolean(body.applyToSeries),
          cancelOccurrence: Boolean(body.cancelOccurrence),
        });
        ctx.body = { data: updated };
      } catch (err: unknown) {
        ctx.status = 400;
        ctx.body = {
          error: {
            message: formatErrorMessage(
              err,
              "Failed to reschedule occurrence."
            ),
          },
        };
      }
    },

    async quickCreate(ctx: StrapiRouteContext) {
      try {
        const body = (ctx.request?.body ?? {}) as Record<string, unknown>;
        const created = await getOccurrenceService().quickCreateEntry(
          parseQuickCreateBody(body)
        );
        ctx.status = 201;
        ctx.body = { data: created };
      } catch (err: unknown) {
        ctx.status = 400;
        ctx.body = {
          error: {
            message: formatErrorMessage(
              err,
              "Failed to create calendar entry."
            ),
          },
        };
      }
    },

    async getSettings(ctx: StrapiRouteContext) {
      try {
        const settings = await getSettingsService().getSettings();
        ctx.body = { data: settings };
      } catch (err: unknown) {
        ctx.status = 400;
        ctx.body = {
          error: {
            message: formatErrorMessage(err, "Failed to fetch settings."),
          },
        };
      }
    },

    async updateSettings(
      ctx: StrapiRouteContext<Partial<CalendarPluginSettings>>
    ) {
      try {
        const body = ctx.request?.body ?? {};
        const updated = await getSettingsService().updateSettings(body);
        ctx.body = { data: updated };
      } catch (err: unknown) {
        ctx.status = 400;
        ctx.body = {
          error: {
            message: formatErrorMessage(err, "Failed to update settings."),
          },
        };
      }
    },

    async clearSettings(ctx: StrapiRouteContext) {
      try {
        const reset = await getSettingsService().clearSettings();
        ctx.body = { data: reset };
      } catch (err: unknown) {
        ctx.status = 400;
        ctx.body = {
          error: {
            message: formatErrorMessage(err, "Failed to reset settings."),
          },
        };
      }
    },

    async getContentTypes(ctx: StrapiRouteContext) {
      try {
        const contentTypes = getSettingsService().discoverContentTypes();
        ctx.body = { data: contentTypes };
      } catch (err: unknown) {
        ctx.status = 400;
        ctx.body = {
          error: {
            message: formatErrorMessage(
              err,
              "Failed to discover content types."
            ),
          },
        };
      }
    },
  };
};
