import type { Core } from "@strapi/strapi";

import {
  formatDateInCalendarSystem,
  registerCalendarSystemFormatter,
  unregisterCalendarSystemFormatter,
} from "../../../shared/calendarSystems";
import {
  isValidCalendarDateKey,
  parseRRuleFieldValue,
} from "../../../shared/rruleEngine";
import {
  deduplicateAndSortSpotlights,
  isEventSpotlightActiveOnDate,
  isSafeObjectKey,
} from "../../../shared/spotlightHelpers";
import type {
  CalendarSystemConfig,
  CalendarSystemFormatterFn,
  EventSourceMapping,
  ExpandedOccurrence,
  OccurrenceOverride,
} from "../../../shared/types";
import {
  type PaginationParams,
  PluginNotFoundError,
  PluginValidationError,
  clampPaginatedSlice,
  getDocumentsClient,
  getSettingsService,
} from "../types";
import {
  type GetOccurrencesParams,
  assertValidIsoDateTime,
  buildQuickCreatePayload,
  expandDocumentOccurrencesSync,
  fetchDocumentsForSource,
  resolveOccurrenceWindow,
  resolveQuickCreateSource,
} from "./occurrenceHelpers";
import {
  type PendingOccurrenceRsvpMeta,
  attachBatchedRsvpStats,
  isAllowedEventSourceUid,
} from "./occurrenceRsvpBatch";

function validateRescheduleDates(params: {
  newStartDate: string;
  newEndDate?: string;
  cancelOccurrence?: boolean;
}): void {
  if (params.cancelOccurrence && !params.newStartDate) {
    return;
  }
  const startMs = assertValidIsoDateTime(params.newStartDate, "newStartDate");
  if (params.newEndDate !== undefined && params.newEndDate !== "") {
    const endMs = assertValidIsoDateTime(params.newEndDate, "newEndDate");
    if (endMs <= startMs) {
      throw new PluginValidationError(
        "Invalid newEndDate: must be after newStartDate."
      );
    }
  }
}

function buildReschedulePayload(
  source: EventSourceMapping,
  params: {
    newStartDate: string;
    newEndDate?: string;
    cancelOccurrence?: boolean;
  }
): Record<string, unknown> {
  if (
    params.cancelOccurrence &&
    source.fields.status &&
    isSafeObjectKey(source.fields.status)
  ) {
    return { [source.fields.status]: "cancelled" };
  }
  const updatePayload: Record<string, unknown> = {};
  if (params.newStartDate && isSafeObjectKey(source.fields.startDate)) {
    updatePayload[source.fields.startDate] = params.newStartDate;
  }
  if (
    params.newEndDate &&
    source.fields.endDate &&
    isSafeObjectKey(source.fields.endDate)
  ) {
    updatePayload[source.fields.endDate] = params.newEndDate;
  }
  return updatePayload;
}

function resolveRescheduleSource(
  sources: EventSourceMapping[] | undefined,
  sourceId?: string,
  uid?: string
): EventSourceMapping | undefined {
  const list = (sources ?? []).filter((s) => isAllowedEventSourceUid(s.uid));
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
  if (
    !isSafeObjectKey(params.occurrenceDate) ||
    !isValidCalendarDateKey(params.occurrenceDate)
  ) {
    throw new PluginValidationError(
      "Invalid occurrenceDate: must be a valid YYYY-MM-DD calendar date."
    );
  }
  const nextOverrides: Record<string, OccurrenceOverride> = {};
  if (recurrence.overrides && typeof recurrence.overrides === "object") {
    for (const [k, v] of Object.entries(recurrence.overrides)) {
      if (isSafeObjectKey(k) && v && typeof v === "object") {
        nextOverrides[k] = v;
      }
    }
  }
  const prevOverride = Object.hasOwn(nextOverrides, params.occurrenceDate)
    ? nextOverrides[params.occurrenceDate]
    : undefined;

  nextOverrides[params.occurrenceDate] = {
    ...prevOverride,
    originalDate: params.occurrenceDate,
    cancelled: Boolean(params.cancelOccurrence),
    startDate: params.newStartDate || undefined,
    endDate: params.newEndDate || undefined,
  };
  return { [rruleField]: { ...recurrence, overrides: nextOverrides } };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    registerCalendarFormatter(
      calendarId: string,
      formatter: CalendarSystemFormatterFn
    ): void {
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

    async getOccurrences(
      params: GetOccurrencesParams
    ): Promise<ExpandedOccurrence[]> {
      const settings = await getSettingsService(strapi).getSettings();
      const { windowStart, windowEnd, isEmptyWindow } =
        resolveOccurrenceWindow(params);
      if (isEmptyWindow) {
        return [];
      }

      const activeSources = (settings.sources ?? []).filter(
        (s: EventSourceMapping) =>
          s.enabled &&
          isAllowedEventSourceUid(s.uid) &&
          (!params.sourceId ||
            s.id === params.sourceId ||
            s.uid === params.sourceId)
      );

      const allOccurrences: ExpandedOccurrence[] = [];
      const pendingRsvpMap = new Map<string, PendingOccurrenceRsvpMeta>();

      for (const source of activeSources) {
        const docs = await fetchDocumentsForSource(
          strapi,
          source,
          params,
          settings
        );
        for (const doc of docs) {
          const docOccurrences = expandDocumentOccurrencesSync({
            strapi,
            doc,
            source,
            params,
            settings,
            windowStart,
            windowEnd,
            pendingRsvpMap,
          });
          allOccurrences.push(...docOccurrences);
        }
      }

      allOccurrences.sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

      const sliced = clampPaginatedSlice(allOccurrences, {
        limit: params.limit,
        page: params.page,
        pageSize: params.pageSize,
        defaultLimit: params.includeDrafts ? 2000 : 500,
        maxLimit: params.includeDrafts ? 2000 : 500,
      });

      await attachBatchedRsvpStats(strapi, sliced, pendingRsvpMap);
      return sliced;
    },

    async getActiveSpotlights(
      params?: {
        date?: string;
        locale?: string;
        sourceId?: string;
        category?: string;
        includeDrafts?: boolean;
      } & PaginationParams
    ): Promise<ExpandedOccurrence[]> {
      const refDate =
        params?.date && !Number.isNaN(new Date(params.date).getTime())
          ? new Date(params.date)
          : new Date();

      const fromWindow = new Date(
        refDate.getTime() - 60 * 24 * 60 * 60 * 1000
      ).toISOString();
      const toWindow = new Date(
        refDate.getTime() + 180 * 24 * 60 * 60 * 1000
      ).toISOString();

      const occurrences = await this.getOccurrences({
        from: fromWindow,
        to: toWindow,
        locale: params?.locale,
        sourceId: params?.sourceId,
        category: params?.category,
        includeDrafts: params?.includeDrafts ?? false,
        onlySpotlights: true,
      });

      const active = occurrences.filter((occ) =>
        isEventSpotlightActiveOnDate({
          spotlightConfig: occ.spotlightConfig,
          eventStartDate: occ.startDate,
          eventEndDate: occ.endDate,
          referenceDate: refDate,
        })
      );

      const sorted = deduplicateAndSortSpotlights(active);
      return clampPaginatedSlice(sorted, {
        limit: params?.limit,
        page: params?.page,
        pageSize: params?.pageSize,
        defaultLimit: 100,
        maxLimit: 100,
      });
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
      const docId = (params.documentId ?? "").trim();
      if (!docId) {
        throw new PluginValidationError("Event documentId is required.");
      }
      validateRescheduleDates(params);

      const settings = await getSettingsService(strapi).getSettings();
      const source = resolveRescheduleSource(
        settings.sources,
        params.sourceId,
        params.uid
      );

      if (!source || !isAllowedEventSourceUid(source.uid)) {
        throw new PluginValidationError(
          "Target event source is not configured."
        );
      }

      const client = getDocumentsClient(strapi, source.uid);
      const existing = await client.findOne({ documentId: docId });
      if (!existing) {
        throw new PluginNotFoundError(
          `Document ${docId} not found in ${source.uid}.`
        );
      }

      const rruleField = source.fields.rrule;
      const recurrence =
        rruleField && isSafeObjectKey(rruleField)
          ? parseRRuleFieldValue(existing[rruleField], settings.defaultTimezone)
          : null;

      if (
        recurrence?.rrule &&
        !params.applyToSeries &&
        rruleField &&
        isSafeObjectKey(rruleField)
      ) {
        return client.update({
          documentId: docId,
          data: buildSingleOccurrenceOverridePatch(
            rruleField,
            recurrence,
            params
          ),
        });
      }

      return client.update({
        documentId: docId,
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
        throw new PluginValidationError("Event title is required.");
      }
      const startMs = assertValidIsoDateTime(params.startDate, "startDate");
      if (params.endDate !== undefined && params.endDate !== "") {
        const endMs = assertValidIsoDateTime(params.endDate, "endDate");
        if (endMs <= startMs) {
          throw new PluginValidationError(
            "Invalid endDate: must be after startDate."
          );
        }
      }

      const settings = await getSettingsService(strapi).getSettings();
      const source = resolveQuickCreateSource(settings, params.sourceId);
      const data = buildQuickCreatePayload(source, settings, {
        ...params,
        title,
      });

      return getDocumentsClient(strapi, source.uid).create({
        data,
        status: "published",
      });
    },
  };
};
