import type { Core } from "@strapi/strapi";

import {
  formatDateInCalendarSystem,
  registerCalendarSystemFormatter,
  unregisterCalendarSystemFormatter,
} from "../../../shared/calendarSystems";
import { parseRRuleFieldValue } from "../../../shared/rruleEngine";
import {
  deduplicateAndSortSpotlights,
  isEventSpotlightActiveOnDate,
} from "../../../shared/spotlightHelpers";
import type {
  CalendarSystemConfig,
  CalendarSystemFormatterFn,
  EventSourceMapping,
  ExpandedOccurrence,
} from "../../../shared/types";
import { getDocumentsClient, getSettingsService } from "../types";
import {
  type GetOccurrencesParams,
  buildQuickCreatePayload,
  expandDocumentOccurrences,
  fetchDocumentsForSource,
  resolveOccurrenceWindow,
  resolveQuickCreateSource,
} from "./occurrenceHelpers";

function buildReschedulePayload(
  source: EventSourceMapping,
  params: {
    newStartDate: string;
    newEndDate?: string;
    cancelOccurrence?: boolean;
  }
): Record<string, unknown> {
  if (params.cancelOccurrence && source.fields.status) {
    return { [source.fields.status]: "cancelled" };
  }
  const updatePayload: Record<string, unknown> = {
    [source.fields.startDate]: params.newStartDate,
  };
  if (params.newEndDate && source.fields.endDate) {
    updatePayload[source.fields.endDate] = params.newEndDate;
  }
  return updatePayload;
}

function resolveRescheduleSource(
  sources: EventSourceMapping[] | undefined,
  sourceId?: string,
  uid?: string
): EventSourceMapping | undefined {
  const list = sources ?? [];
  return list.find((s) => s.id === sourceId || s.uid === uid) ?? list[0];
}

function buildSingleOccurrenceOverridePatch(
  rruleField: string,
  recurrence: ReturnType<typeof parseRRuleFieldValue>,
  params: {
    occurrenceDate: string;
    newStartDate: string;
    newEndDate?: string;
    cancelOccurrence?: boolean;
  }
): Record<string, unknown> {
  const nextOverrides = { ...recurrence.overrides };
  nextOverrides[params.occurrenceDate] = {
    ...nextOverrides[params.occurrenceDate],
    originalDate: params.occurrenceDate,
    cancelled: Boolean(params.cancelOccurrence),
    startDate: params.newStartDate || undefined,
    endDate: params.newEndDate || undefined,
  };
  return { [rruleField]: { ...recurrence, overrides: nextOverrides } };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    registerCalendarFormatter(calendarId: string, formatter: CalendarSystemFormatterFn): void {
      registerCalendarSystemFormatter(calendarId, formatter);
    },

    unregisterCalendarFormatter(calendarId: string): void {
      unregisterCalendarSystemFormatter(calendarId);
    },

    formatDateInCalendarSystem(
      isoOrDateKey: string,
      system: CalendarSystemConfig,
      locale = "en",
      options?: { compact?: boolean }
    ): string {
      return formatDateInCalendarSystem(isoOrDateKey, system, locale, options);
    },

    async getOccurrences(params: GetOccurrencesParams): Promise<ExpandedOccurrence[]> {
      const settings = await getSettingsService(strapi).getSettings();
      const { windowStart, windowEnd } = resolveOccurrenceWindow(params);

      const activeSources = (settings.sources ?? []).filter(
        (s: EventSourceMapping) =>
          s.enabled && (!params.sourceId || s.id === params.sourceId || s.uid === params.sourceId)
      );

      const allOccurrences: ExpandedOccurrence[] = [];

      for (const source of activeSources) {
        const docs = await fetchDocumentsForSource(strapi, source, params, settings);
        for (const doc of docs) {
          const docOccurrences = await expandDocumentOccurrences(
            strapi,
            doc,
            source,
            params,
            settings,
            windowStart,
            windowEnd
          );
          allOccurrences.push(...docOccurrences);
        }
      }

      allOccurrences.sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

      return allOccurrences;
    },

    async getActiveSpotlights(params?: {
      date?: string;
      locale?: string;
      sourceId?: string;
      category?: string;
      includeDrafts?: boolean;
    }): Promise<ExpandedOccurrence[]> {
      const refDate =
        params?.date && !Number.isNaN(new Date(params.date).getTime())
          ? new Date(params.date)
          : new Date();

      const fromWindow = new Date(refDate.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const toWindow = new Date(refDate.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();

      const occurrences = await this.getOccurrences({
        from: fromWindow,
        to: toWindow,
        locale: params?.locale,
        sourceId: params?.sourceId,
        category: params?.category,
        includeDrafts: params?.includeDrafts ?? false,
      });

      const active = occurrences.filter((occ) =>
        isEventSpotlightActiveOnDate({
          spotlightConfig: occ.spotlightConfig,
          eventStartDate: occ.startDate,
          eventEndDate: occ.endDate,
          referenceDate: refDate,
        })
      );

      return deduplicateAndSortSpotlights(active);
    },

    async rescheduleOccurrence(params: {
      sourceId?: string;
      uid?: string;
      documentId: string;
      occurrenceDate: string;
      newStartDate: string;
      newEndDate?: string;
      applyToSeries?: boolean;
      cancelOccurrence?: boolean;
    }): Promise<Record<string, unknown>> {
      const settings = await getSettingsService(strapi).getSettings();
      const source = resolveRescheduleSource(settings.sources, params.sourceId, params.uid);

      if (!source) {
        throw new Error("Target event source is not configured.");
      }

      const client = getDocumentsClient(strapi, source.uid);
      const existing = await client.findOne({ documentId: params.documentId });
      if (!existing) {
        throw new Error(`Document ${params.documentId} not found in ${source.uid}.`);
      }

      const rruleField = source.fields.rrule;
      const recurrence = rruleField
        ? parseRRuleFieldValue(existing[rruleField], settings.defaultTimezone)
        : null;

      if (recurrence?.rrule && !params.applyToSeries && rruleField) {
        return client.update({
          documentId: params.documentId,
          data: buildSingleOccurrenceOverridePatch(rruleField, recurrence, params),
        });
      }

      return client.update({
        documentId: params.documentId,
        data: buildReschedulePayload(source, params),
      });
    },

    async quickCreateEvent(params: {
      sourceId?: string;
      title: string;
      startDate: string;
      endDate?: string;
      location?: string;
      category?: string;
      summary?: string;
      rrule?: string;
      rsvpEnabled?: boolean;
      capacity?: number;
    }): Promise<Record<string, unknown>> {
      const title = (params.title ?? "").trim();
      if (!title) {
        throw new Error("Event title is required.");
      }
      const settings = await getSettingsService(strapi).getSettings();
      const source = resolveQuickCreateSource(settings, params.sourceId);
      const data = buildQuickCreatePayload(source, settings, { ...params, title });

      return getDocumentsClient(strapi, source.uid).create({
        data,
        status: "published",
      });
    },
  };
};
