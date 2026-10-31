import type { Core } from "@strapi/strapi";

import {
  formatDateInCalendarSystem,
  registerCalendarSystemFormatter,
  resolveOccurrenceAlternateDates,
  unregisterCalendarSystemFormatter,
} from "../../../shared/calendarSystems";
import { buildCalendarLinks } from "../../../shared/icalGenerator";
import { PLUGIN_ID } from "../../../shared/pluginId";
import {
  expandRuleSlots,
  parseRRuleFieldValue,
  type ExpandedSlot,
} from "../../../shared/rruleEngine";
import type {
  CalendarItemStatus,
  CalendarPluginSettings,
  CalendarSourceMapping,
  CalendarSystemConfig,
  CalendarSystemFormatterFn,
  ExpandedCalendarOccurrence,
  RRuleFieldValue,
  TimeSlotWindow,
} from "../../../shared/types";
import {
  getCalendarService,
  type OccurrenceQueryParams,
  type OccurrenceService,
  type QuickCreateEntryParams,
  type RescheduleOccurrenceParams,
} from "../types";
import {
  buildQuickCreatePayload,
  matchesSourceFilter,
  resolveTargetSource,
  type ContentTypeSchemaShape,
} from "./quickCreateHelpers";

const DEFAULT_TIME_SLOTS: Record<string, TimeSlotWindow> = {
  morning: { start: "09:00:00", end: "11:00:00" },
  afternoon: { start: "14:00:00", end: "16:00:00" },
  evening: { start: "18:00:00", end: "20:00:00" },
};

function resolveDateOnlyWithSlot(
  rawStart: string,
  rawSlot: unknown,
  source: CalendarSourceMapping
): { startDate: string; endDate: string | null; allDay: boolean } {
  if (typeof rawSlot === "string" && rawSlot) {
    const slotMap = { ...DEFAULT_TIME_SLOTS, ...source.timeSlotMap };
    const mapped = slotMap[rawSlot];
    if (mapped) {
      return {
        startDate: `${rawStart}T${mapped.start}.000Z`,
        endDate: `${rawStart}T${mapped.end}.000Z`,
        allDay: false,
      };
    }
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(rawSlot)) {
      const normalizedTime = rawSlot.length === 5 ? `${rawSlot}:00` : rawSlot;
      return {
        startDate: `${rawStart}T${normalizedTime}.000Z`,
        endDate: null,
        allDay: false,
      };
    }
  }
  return {
    startDate: `${rawStart}T00:00:00.000Z`,
    endDate: `${rawStart}T23:59:59.000Z`,
    allDay: source.defaultAllDay ?? true,
  };
}

function resolveStartEndFromDocument(
  doc: Record<string, unknown>,
  source: CalendarSourceMapping
): { startDate: string; endDate: string | null; allDay: boolean } | null {
  const rawStart = doc[source.fields.startDate];
  if (!rawStart || typeof rawStart !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawStart)) {
    const rawSlot = source.fields.timeSlot ? doc[source.fields.timeSlot] : null;
    return resolveDateOnlyWithSlot(rawStart, rawSlot, source);
  }
  const rawEnd = source.fields.endDate ? doc[source.fields.endDate] : null;
  const allDay = typeof doc.allDay === "boolean" ? doc.allDay : Boolean(source.defaultAllDay);
  return {
    startDate: rawStart,
    endDate: typeof rawEnd === "string" && rawEnd ? rawEnd : null,
    allDay,
  };
}

const STATUS_MAP: Record<string, CalendarItemStatus> = {
  cancelled: "cancelled",
  canceled: "cancelled",
  rejected: "cancelled",
  postponed: "postponed",
  pending: "postponed",
  rescheduled: "rescheduled",
};

function mapStatus(rawStatus: unknown): CalendarItemStatus {
  if (typeof rawStatus !== "string") return "scheduled";
  return STATUS_MAP[rawStatus.toLowerCase()] ?? "scheduled";
}

function resolveQueryWindow(params: OccurrenceQueryParams): {
  windowStart: string;
  windowEnd: string;
} {
  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0)).toISOString();
  const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59)).toISOString();
  const validFrom = params.from && !Number.isNaN(new Date(params.from).getTime());
  const validTo = params.to && !Number.isNaN(new Date(params.to).getTime());
  return {
    windowStart: validFrom ? params.from! : defaultFrom,
    windowEnd: validTo ? params.to! : defaultTo,
  };
}

function buildDocQueryOpts(
  params: OccurrenceQueryParams,
  includeLocale: boolean
): Core.DocumentQueryOptions {
  const opts: Core.DocumentQueryOptions = { limit: 500 };
  if (params.documentId) {
    opts.filters = { documentId: { $eq: params.documentId } };
  }
  if (includeLocale && params.locale && params.locale !== "auto") {
    opts.locale = params.locale;
  }
  if (!params.includeDrafts) {
    opts.status = "published";
  }
  return opts;
}

async function fetchDocumentsForSource(
  strapi: Core.Strapi,
  uid: string,
  params: OccurrenceQueryParams
): Promise<Array<Record<string, unknown>>> {
  const fallbackOpts = buildDocQueryOpts(params, false);
  try {
    const primaryDocs = await strapi.documents(uid).findMany(buildDocQueryOpts(params, true));
    return primaryDocs.length > 0
      ? primaryDocs
      : await strapi.documents(uid).findMany(fallbackOpts);
  } catch {
    try {
      return await strapi.documents(uid).findMany(fallbackOpts);
    } catch {
      return [];
    }
  }
}

function extractCustomFields(
  doc: Record<string, unknown>,
  fieldKeys?: string[]
): Record<string, unknown> | undefined {
  if (!Array.isArray(fieldKeys) || fieldKeys.length === 0) return undefined;
  const extracted: Record<string, unknown> = {};
  for (const key of fieldKeys) {
    if (key && doc[key] !== undefined) extracted[key] = doc[key];
  }
  return Object.keys(extracted).length > 0 ? extracted : undefined;
}

function resolveDocColor(
  doc: Record<string, unknown>,
  source: CalendarSourceMapping,
  categoryVal: string
): string {
  const catColor = categoryVal ? source.categoryColors?.[categoryVal] : undefined;
  if (catColor) return catColor;
  const docColorVal = source.fields.color ? doc[source.fields.color] : doc.color;
  if (typeof docColorVal === "string" && docColorVal.startsWith("#")) {
    return docColorVal;
  }
  return source.color;
}

const optStr = (v?: string) => (v ? v : undefined);
const readField = (doc: Record<string, unknown>, key?: string) =>
  key ? String(doc[key] ?? "") : "";

interface DocExpansionMeta {
  doc: Record<string, unknown>;
  docId: string;
  docLocale?: string;
  source: CalendarSourceMapping;
  recurrence: RRuleFieldValue;
  baseTitle: string;
  baseLocation: string;
  summary: string;
  slug?: string;
  categoryVal?: string;
  statusVal: CalendarItemStatus;
  color: string;
  baseDateKey: string;
  customFields?: Record<string, unknown>;
  secondaryCalendars: CalendarSystemConfig[];
  locale: string;
}

function buildOccurrenceItem(
  slot: ExpandedSlot,
  meta: DocExpansionMeta
): ExpandedCalendarOccurrence {
  const effectiveTitle = slot.override?.title || meta.baseTitle;
  const effectiveLocation = slot.override?.location || meta.baseLocation;
  const allDay = Boolean(meta.recurrence.allDay);
  const calendarLinks = buildCalendarLinks({
    documentId: meta.docId,
    title: effectiveTitle,
    startDate: slot.startDate,
    endDate: slot.endDate,
    allDay,
    summary: meta.summary,
    location: effectiveLocation,
    occurrenceDate: slot.occurrenceDate,
  });
  const alternateDates = resolveOccurrenceAlternateDates({
    occurrenceDate: slot.occurrenceDate,
    baseDateKey: meta.baseDateKey,
    isRecurring: slot.isRecurring,
    doc: meta.doc,
    source: meta.source,
    secondaryCalendars: meta.secondaryCalendars,
    locale: meta.locale,
  });

  return {
    occurrenceId: `${meta.source.id}:${meta.docId}:${slot.occurrenceDate}`,
    sourceId: meta.source.id,
    sourceLabel: meta.source.label,
    uid: meta.source.uid,
    documentId: meta.docId,
    locale: meta.docLocale,
    occurrenceDate: slot.occurrenceDate,
    startDate: slot.startDate,
    endDate: slot.endDate,
    allDay,
    timezone: meta.recurrence.timezone,
    title: effectiveTitle,
    slug: meta.slug,
    summary: optStr(meta.summary),
    location: optStr(effectiveLocation),
    category: meta.categoryVal,
    status: meta.statusVal,
    color: meta.color,
    isRecurring: slot.isRecurring,
    rrule: optStr(meta.recurrence.rrule),
    rscale: slot.rscale,
    isOverridden: slot.isOverridden,
    calendarLinks,
    alternateDates: Object.keys(alternateDates).length > 0 ? alternateDates : undefined,
    customFields: meta.customFields,
  };
}

function matchesCategoryParam(categoryVal: string, filterCategory?: string): boolean {
  if (!filterCategory || filterCategory === "all") return true;
  return categoryVal.toLowerCase() === filterCategory.toLowerCase();
}

function resolveDocRecurrence(
  doc: Record<string, unknown>,
  source: CalendarSourceMapping,
  defaultTimezone: string,
  allDay: boolean
): RRuleFieldValue {
  const rawRecurrence = source.fields.rrule ? doc[source.fields.rrule] : null;
  const tz = typeof doc.timezone === "string" && doc.timezone ? doc.timezone : defaultTimezone;
  const recurrence = parseRRuleFieldValue(rawRecurrence, tz);
  if (allDay) recurrence.allDay = true;
  return recurrence;
}

function buildDocExpansionMeta(
  doc: Record<string, unknown>,
  docId: string,
  source: CalendarSourceMapping,
  recurrence: RRuleFieldValue,
  categoryVal: string,
  baseDateKey: string,
  settings: CalendarPluginSettings,
  locale?: string
): DocExpansionMeta {
  const rawSlug = readField(doc, source.fields.slug);
  const docLocale = typeof doc.locale === "string" ? optStr(doc.locale) : undefined;
  return {
    doc,
    docId,
    docLocale,
    source,
    recurrence,
    baseTitle: String(doc[source.fields.title] ?? doc.title ?? "Untitled"),
    baseLocation: readField(doc, source.fields.location),
    summary: readField(doc, source.fields.summary),
    slug: optStr(rawSlug),
    categoryVal: optStr(categoryVal),
    statusVal: mapStatus(source.fields.status ? doc[source.fields.status] : doc.status),
    color: resolveDocColor(doc, source, categoryVal),
    baseDateKey,
    customFields: extractCustomFields(doc, source.fields.customFields),
    secondaryCalendars: settings.secondaryCalendars ?? [],
    locale: locale || "en",
  };
}

function expandDocumentOccurrences(
  doc: Record<string, unknown>,
  source: CalendarSourceMapping,
  settings: CalendarPluginSettings,
  params: OccurrenceQueryParams,
  windowStart: string,
  windowEnd: string
): ExpandedCalendarOccurrence[] {
  const docId = String(doc.documentId ?? doc.id ?? "");
  if (!docId) return [];
  const startEnd = resolveStartEndFromDocument(doc, source);
  if (!startEnd) return [];
  const categoryVal = readField(doc, source.fields.category);
  if (!matchesCategoryParam(categoryVal, params.category)) return [];

  const recurrence = resolveDocRecurrence(doc, source, settings.defaultTimezone, startEnd.allDay);
  const slots = expandRuleSlots({
    baseStartDate: startEnd.startDate,
    baseEndDate: startEnd.endDate,
    recurrence,
    windowStart,
    windowEnd,
  });
  if (slots.length === 0) return [];

  const meta = buildDocExpansionMeta(
    doc,
    docId,
    source,
    recurrence,
    categoryVal,
    startEnd.startDate.slice(0, 10),
    settings,
    params.locale
  );
  return slots.map((slot) => buildOccurrenceItem(slot, meta));
}

function buildDirectUpdatePayload(
  params: RescheduleOccurrenceParams,
  source: CalendarSourceMapping
): Record<string, unknown> {
  if (params.cancelOccurrence && source.fields.status) {
    return { [source.fields.status]: "cancelled" };
  }
  const payload: Record<string, unknown> = {
    [source.fields.startDate]: params.newStartDate,
  };
  if (params.newEndDate && source.fields.endDate) {
    payload[source.fields.endDate] = params.newEndDate;
  }
  return payload;
}

function buildRecurrenceOverridePayload(
  recurrence: RRuleFieldValue,
  rruleField: string,
  params: RescheduleOccurrenceParams
): Record<string, unknown> {
  const nextOverrides = { ...recurrence.overrides };
  nextOverrides[params.occurrenceDate] = {
    ...nextOverrides[params.occurrenceDate],
    originalDate: params.occurrenceDate,
    cancelled: Boolean(params.cancelOccurrence),
    startDate: params.newStartDate || undefined,
    endDate: params.newEndDate || undefined,
  };
  return {
    [rruleField]: {
      ...recurrence,
      overrides: nextOverrides,
    },
  };
}

export default ({ strapi }: { strapi: Core.Strapi }): OccurrenceService => {
  const getSettingsService = () => getCalendarService(strapi, PLUGIN_ID, "settings");

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

    async getOccurrences(params: OccurrenceQueryParams): Promise<ExpandedCalendarOccurrence[]> {
      const settings = await getSettingsService().getSettings();
      const { windowStart, windowEnd } = resolveQueryWindow(params);
      const activeSources = (settings.sources ?? []).filter(
        (s: CalendarSourceMapping) => s.enabled && matchesSourceFilter(s, params.sourceId)
      );

      const allOccurrences: ExpandedCalendarOccurrence[] = [];
      for (const source of activeSources) {
        const docs = await fetchDocumentsForSource(strapi, source.uid, params);
        for (const doc of docs) {
          allOccurrences.push(
            ...expandDocumentOccurrences(doc, source, settings, params, windowStart, windowEnd)
          );
        }
      }

      allOccurrences.sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      return allOccurrences;
    },

    async rescheduleOccurrence(
      params: RescheduleOccurrenceParams
    ): Promise<Record<string, unknown>> {
      const settings = await getSettingsService().getSettings();
      const source =
        (settings.sources ?? []).find(
          (s: CalendarSourceMapping) => s.id === params.sourceId || s.uid === params.uid
        ) ?? settings.sources[0];

      if (!source) throw new Error("Target calendar source is not configured.");

      const existing = await strapi.documents(source.uid).findOne({
        documentId: params.documentId,
      });
      if (!existing) {
        throw new Error(`Document ${params.documentId} not found in ${source.uid}.`);
      }

      const rruleField = source.fields.rrule;
      const recurrence = rruleField
        ? parseRRuleFieldValue(existing[rruleField], settings.defaultTimezone)
        : null;
      const useSeriesOverride = Boolean(recurrence?.rrule && !params.applyToSeries && rruleField);
      const data = useSeriesOverride
        ? buildRecurrenceOverridePayload(recurrence!, rruleField!, params)
        : buildDirectUpdatePayload(params, source);

      const updatedDoc = await strapi.documents(source.uid).update({
        documentId: params.documentId,
        data,
      });
      return updatedDoc ?? {};
    },

    async quickCreateEntry(params: QuickCreateEntryParams): Promise<Record<string, unknown>> {
      const settings = await getSettingsService().getSettings();
      const source = resolveTargetSource(settings.sources ?? [], params.sourceId);
      if (!source) throw new Error("No calendar collection source is configured.");

      const contentTypes = (strapi.contentTypes ?? {}) as Record<
        string,
        ContentTypeSchemaShape | undefined
      >;
      const { data, shouldPublish } = buildQuickCreatePayload(
        params,
        source,
        settings.defaultTimezone,
        contentTypes[source.uid]
      );

      if (shouldPublish) {
        try {
          return await strapi.documents(source.uid).create({ data, status: "published" });
        } catch {
          return await strapi.documents(source.uid).create({ data });
        }
      }
      return strapi.documents(source.uid).create({ data });
    },
  };
};
