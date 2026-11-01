import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../../shared/pluginId";
import {
  formatErrorMessage,
  getCalendarService,
  type StrapiRouteContext,
} from "../types";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getOccurrenceService = () =>
    getCalendarService(strapi, PLUGIN_ID, "occurrence");
  const getIcalService = () => getCalendarService(strapi, PLUGIN_ID, "ical");

  return {
    async getOccurrences(ctx: StrapiRouteContext) {
      try {
        const query = ctx.query ?? {};
        const occurrences = await getOccurrenceService().getOccurrences({
          from: typeof query.from === "string" ? query.from : undefined,
          to: typeof query.to === "string" ? query.to : undefined,
          locale: typeof query.locale === "string" ? query.locale : undefined,
          category:
            typeof query.category === "string" ? query.category : undefined,
          sourceId:
            typeof query.sourceId === "string" ? query.sourceId : undefined,
          documentId:
            typeof query.documentId === "string" ? query.documentId : undefined,
          includeDrafts: false,
        });

        ctx.body = {
          data: occurrences,
          meta: {
            total: occurrences.length,
          },
        };
      } catch (err: unknown) {
        ctx.status = 400;
        ctx.body = {
          error: {
            message: formatErrorMessage(err, "Could not fetch occurrences."),
          },
        };
      }
    },

    async downloadFeedIcs(ctx: StrapiRouteContext) {
      try {
        const query = ctx.query ?? {};
        const ics = await getIcalService().buildFeedIcs({
          from: typeof query.from === "string" ? query.from : undefined,
          to: typeof query.to === "string" ? query.to : undefined,
          locale: typeof query.locale === "string" ? query.locale : undefined,
          category:
            typeof query.category === "string" ? query.category : undefined,
          sourceId:
            typeof query.sourceId === "string" ? query.sourceId : undefined,
        });

        ctx.set?.("Content-Type", "text/calendar; charset=utf-8");
        ctx.set?.("Content-Disposition", 'attachment; filename="calendar.ics"');
        ctx.set?.("X-Content-Type-Options", "nosniff");
        ctx.body = ics;
      } catch (err: unknown) {
        ctx.status = 400;
        ctx.body = {
          error: {
            message: formatErrorMessage(err, "Could not generate iCal feed."),
          },
        };
      }
    },

    async downloadEventIcs(ctx: StrapiRouteContext) {
      try {
        const documentId = String(ctx.params?.documentId ?? "");
        const query = ctx.query ?? {};
        const ics = await getIcalService().buildSingleInviteIcs({
          documentId,
          occurrenceDate:
            typeof query.occurrenceDate === "string"
              ? query.occurrenceDate
              : undefined,
          locale: typeof query.locale === "string" ? query.locale : undefined,
        });

        ctx.set?.("Content-Type", "text/calendar; charset=utf-8");
        ctx.set?.(
          "Content-Disposition",
          `attachment; filename="invite-${documentId.replace(/[^a-zA-Z0-9_-]/g, "")}.ics"`
        );
        ctx.set?.("X-Content-Type-Options", "nosniff");
        ctx.body = ics;
      } catch (err: unknown) {
        ctx.status = 400;
        ctx.body = {
          error: {
            message: formatErrorMessage(err, "Could not generate invite .ics."),
          },
        };
      }
    },
  };
};
