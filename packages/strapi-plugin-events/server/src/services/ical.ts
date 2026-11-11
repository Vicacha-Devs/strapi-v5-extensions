import type { Core } from "@strapi/strapi";

import { generateIcsCalendar } from "../../../shared/icalGenerator";
import { isValidCalendarDateKey } from "../../../shared/rruleEngine";
import {
  PluginValidationError,
  getOccurrenceService,
  getSettingsService,
} from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async generateFeedIcs(params?: {
      from?: string;
      to?: string;
      category?: string;
      sourceId?: string;
      locale?: string;
    }): Promise<string> {
      const settings = await getSettingsService(strapi).getSettings();
      const occurrences = await getOccurrenceService(strapi).getOccurrences({
        from: params?.from,
        to: params?.to,
        category: params?.category,
        sourceId: params?.sourceId,
        locale: params?.locale,
        includeDrafts: false,
      });

      return generateIcsCalendar(occurrences, settings.feedTitle);
    },

    async generateEventInviteIcs(params: {
      documentId: string;
      occurrenceDate?: string;
      locale?: string;
    }): Promise<string> {
      const docId = (params.documentId ?? "").trim();
      if (!docId) {
        throw new PluginValidationError("Event documentId is required.");
      }

      const settings = await getSettingsService(strapi).getSettings();
      let from: string;
      let to: string;

      if (params.occurrenceDate) {
        if (!isValidCalendarDateKey(params.occurrenceDate)) {
          throw new PluginValidationError(
            "Invalid occurrenceDate: must be a valid YYYY-MM-DD calendar date."
          );
        }
        const anchorMs = new Date(
          `${params.occurrenceDate}T00:00:00.000Z`
        ).getTime();
        from = new Date(anchorMs - 2 * DAY_MS).toISOString();
        to = new Date(anchorMs + 3 * DAY_MS).toISOString();
      } else {
        const nowMs = Date.now();
        from = new Date(nowMs - 30 * DAY_MS).toISOString();
        to = new Date(nowMs + 335 * DAY_MS).toISOString();
      }

      const occurrences = await getOccurrenceService(strapi).getOccurrences({
        documentId: docId,
        from,
        to,
        locale: params.locale,
        includeDrafts: false,
      });

      const filtered = params.occurrenceDate
        ? occurrences.filter((o) => o.occurrenceDate === params.occurrenceDate)
        : occurrences.slice(0, 1);

      return generateIcsCalendar(filtered, settings.feedTitle);
    },
  };
};
