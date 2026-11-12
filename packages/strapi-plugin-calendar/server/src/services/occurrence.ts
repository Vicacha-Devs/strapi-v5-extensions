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
  CalendarPluginSettings,
  CalendarSourceMapping,
  ExpandedCalendarOccurrence,
  RRuleFieldValue,
} from "../../../shared/types";
import {
  getCalendarService,
  type OccurrenceQueryParams,
  type OccurrenceService,
  type QuickCreateEntryParams,
  type RescheduleOccurrenceParams,
} from "../types";
import { mapStatus, resolveStartEndFromDocument } from "./occurrenceDates";
import {
  buildDirectUpdatePayload,
  buildQuickCreatePayload,
  buildRecurrenceOverridePayload,
  matchesSourceFilter,
  resolveTargetSource,
  type ContentTypeSchemaShape,
} from "./quickCreateHelpers";

const MAX_QUERY_WINDOW_MS = 1850 * 86_400_000;
const BLOCKED_SOURCE_UID_PREFIXES = [
  "admin::",
  "strapi::",
  "plugin::users-permissions.",
  "plugin::inbox.",
  "plugin::donations.",
  "plugin::certificates.",
  "plugin::notes.",
  "plugin::broadcasts.",
];
const SENSITIVE_CUSTOM_FIELD_RE =
  /^(__proto__|constructor|prototype)$|password|token|secret|hash|privatekey|apikey/i;

export function isAllowedCalendarSourceUid(uid: unknown): uid is string {
  if (typeof uid !== "string" || !uid.trim()) return false;
  return !BLOCKED_SOURCE_UID_PREFIXES.some((p) => uid.startsWith(p));
}

function resolveQueryWindow(params: OccurrenceQueryParams) {
  const y = new Date().getUTCFullYear();
  const defaultFrom = new Date(Date.UTC(y, 0, 1, 0, 0, 0)).toISOString();
  const defaultTo = new Date(Date.UTC(y, 11, 31, 23, 59, 59)).toISOString();
  const fromMs = params.from ? new Date(params.from).getTime() : Number.NaN;
  const toMs = params.to ? new Date(params.to).getTime() : Number.NaN;
  const startMs = !Number.isNaN(fromMs)
    ? fromMs
    : new Date(defaultFrom).getTime();
  const rawEndMs = !Number.isNaN(toMs) ? toMs : new Date(defaultTo).getTime();
  const safeEndMs =
    rawEndMs < startMs
      ? startMs
      : Math.min(rawEndMs, startMs + MAX_QUERY_WINDOW_MS);
  return {
    windowStart: !Number.isNaN(fromMs)
      ? params.from!
      : new Date(startMs).toISOString(),
    windowEnd:
      !Number.isNaN(toMs) && rawEndMs >= startMs && rawEndMs === safeEndMs
        ? params.to!
        : new Date(safeEndMs).toISOString(),
  };
}

function buildWindowFilters(
  source: CalendarSourceMapping,
  windowStart: string,
  windowEnd: string
): Record<string, unknown> {
  if (source.fields.rrule) {
    return { [source.fields.startDate]: { $lte: windowEnd } };
  }
  if (source.fields.endDate) {
    return {
      [source.fields.startDate]: { $lte: windowEnd },
      [source.fields.endDate]: { $gte: windowStart },
    };
  }
  return {
    [source.fields.startDate]: { $gte: windowStart, $lte: windowEnd },
  };
}

function buildDocQueryOpts(
  params: OccurrenceQueryParams,
  source: CalendarSourceMapping,
  windowStart: string,
  windowEnd: string,
  includeLocale: boolean
): Core.DocumentQueryOptions {
  const opts: Core.DocumentQueryOptions = {
    limit: 1000,
    filters: params.documentId
      ? { documentId: { $eq: params.documentId } }
      : buildWindowFilters(source, windowStart, windowEnd),
    ...({
      sort: { [source.fields.startDate]: "desc" },
    } as Partial<Core.DocumentQueryOptions>),
  };
  if (includeLocale && params.locale && params.locale !== "auto") {
    opts.locale = params.locale;
  }
  if (!params.includeDrafts) opts.status = "published";
  return opts;
}

const docKey = (d: Record<string, unknown>) => String(d.documentId ?? d.id);

async function fetchDocumentsForSource(
  strapi: Core.Strapi,
  source: CalendarSourceMapping,
  params: OccurrenceQueryParams,
  windowStart: string,
  windowEnd: string
): Promise<Array<Record<string, unknown>>> {
  if (!isAllowedCalendarSourceUid(source.uid)) return [];
  const find = (withLocale: boolean) =>
    strapi
      .documents(source.uid)
      .findMany(
        buildDocQueryOpts(params, source, windowStart, windowEnd, withLocale)
      )
      .catch(() => []);
  if (!params.locale || params.locale === "auto") return find(false);
  const [primary, fallback] = await Promise.all([find(true), find(false)]);
  const seen = new Set(primary.map(docKey));
  return [...primary, ...fallback.filter((d) => !seen.has(docKey(d)))];
}

function extractCustomFields(doc: Record<string, unknown>, keys?: string[]) {
  if (!Array.isArray(keys) || keys.length === 0) return undefined;
  const extracted: Record<string, unknown> = {};
  for (const key of keys) {
    if (
      key &&
      !SENSITIVE_CUSTOM_FIELD_RE.test(key) &&
      Object.hasOwn(doc, key) &&
      doc[key] !== undefined
    ) {
      extracted[key] = doc[key];
    }
  }
  return Object.keys(extracted).length > 0 ? extracted : undefined;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

function resolveDocColor(
  doc: Record<string, unknown>,
  source: CalendarSourceMapping,
  categoryVal: string
): string {
  const catColor = categoryVal
    ? source.categoryColors?.[categoryVal]
    : undefined;
  if (typeof catColor === "string" && HEX_COLOR_RE.test(catColor.trim())) {
    return catColor.trim();
  }
  const docColorVal = source.fields.color
    ? doc[source.fields.color]
    : doc.color;
  if (
    typeof docColorVal === "string" &&
    HEX_COLOR_RE.test(docColorVal.trim())
  ) {
    return docColorVal.trim();
  }
  return HEX_COLOR_RE.test(source.color) ? source.color : "#4945ff";
}

const optStr = (v?: string) => (v ? v : undefined);
const readField = (doc: Record<string, unknown>, key?: string) =>
  key ? String(doc[key] ?? "") : "";

type DocExpansionMeta = ReturnType<typeof buildDocExpansionMeta>;

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
    alternateDates:
      Object.keys(alternateDates).length > 0 ? alternateDates : undefined,
    customFields: meta.customFields,
  };
}

function matchesCategoryParam(
  categoryVal: string,
  filterCategory?: string
): boolean {
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
  const tz =
    typeof doc.timezone === "string" && doc.timezone
      ? doc.timezone
      : defaultTimezone;
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
  locale = "en"
) {
  return {
    doc,
    docId,
    docLocale: typeof doc.locale === "string" ? optStr(doc.locale) : undefined,
    source,
    recurrence,
    baseTitle: String(doc[source.fields.title] ?? doc.title ?? "Untitled"),
    baseLocation: readField(doc, source.fields.location),
    summary: readField(doc, source.fields.summary),
    slug: optStr(readField(doc, source.fields.slug)),
    categoryVal: optStr(categoryVal),
    statusVal: mapStatus(
      source.fields.status ? doc[source.fields.status] : doc.status
    ),
    color: resolveDocColor(doc, source, categoryVal),
    baseDateKey,
    customFields: extractCustomFields(doc, source.fields.customFields),
    secondaryCalendars: settings.secondaryCalendars ?? [],
    locale,
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

  const recurrence = resolveDocRecurrence(
    doc,
    source,
    settings.defaultTimezone,
    startEnd.allDay
  );
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

export default ({ strapi }: { strapi: Core.Strapi }): OccurrenceService => {
  const getSettingsService = () =>
    getCalendarService(strapi, PLUGIN_ID, "settings");

  return {
    registerCalendarFormatter: registerCalendarSystemFormatter,
    unregisterCalendarFormatter: unregisterCalendarSystemFormatter,
    formatDateInCalendarSystem,

    async getOccurrences(
      params: OccurrenceQueryParams
    ): Promise<ExpandedCalendarOccurrence[]> {
      const settings = await getSettingsService().getSettings();
      const { windowStart, windowEnd } = resolveQueryWindow(params);
      const activeSources = (settings.sources ?? []).filter(
        (s: CalendarSourceMapping) =>
          s.enabled &&
          (!params.publicOnly || s.publicFeed !== false) &&
          matchesSourceFilter(s, params.sourceId)
      );

      const allOccurrences: ExpandedCalendarOccurrence[] = [];
      for (const source of activeSources) {
        const docs = await fetchDocumentsForSource(
          strapi,
          source,
          params,
          windowStart,
          windowEnd
        );
        for (const doc of docs) {
          const items = expandDocumentOccurrences(
            doc,
            source,
            settings,
            params,
            windowStart,
            windowEnd
          );
          allOccurrences.push(...items);
        }
      }
      return allOccurrences.sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
    },

    async rescheduleOccurrence(
      params: RescheduleOccurrenceParams
    ): Promise<Record<string, unknown>> {
      const settings = await getSettingsService().getSettings();
      const sources = settings.sources ?? [];
      const source =
        params.sourceId || params.uid
          ? sources.find(
              (s: CalendarSourceMapping) =>
                s.id === params.sourceId || s.uid === params.uid
            )
          : sources[0];
      if (!source) throw new Error("Target calendar source is not configured.");

      const localeOpt =
        params.locale && params.locale !== "auto"
          ? { locale: params.locale }
          : {};
      const existing = await strapi
        .documents(source.uid)
        .findOne({ documentId: params.documentId, ...localeOpt });
      if (!existing) {
        throw new Error(
          `Document ${params.documentId} not found in ${source.uid}.`
        );
      }
      const rruleField = source.fields.rrule;
      const recurrence = rruleField
        ? parseRRuleFieldValue(existing[rruleField], settings.defaultTimezone)
        : null;
      const data =
        recurrence?.rrule && !params.applyToSeries && rruleField
          ? buildRecurrenceOverridePayload(recurrence, rruleField, params)
          : buildDirectUpdatePayload(params, source, existing);
      const updatedDoc = await strapi
        .documents(source.uid)
        .update({ documentId: params.documentId, data, ...localeOpt });
      return updatedDoc ?? {};
    },

    async quickCreateEntry(
      params: QuickCreateEntryParams
    ): Promise<Record<string, unknown>> {
      const settings = await getSettingsService().getSettings();
      const source = resolveTargetSource(
        settings.sources ?? [],
        params.sourceId
      );
      if (!source)
        throw new Error("No calendar collection source is configured.");

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
          return await strapi
            .documents(source.uid)
            .create({ data, status: "published" });
        } catch {
          return await strapi.documents(source.uid).create({ data });
        }
      }
      return strapi.documents(source.uid).create({ data });
    },
  };
};
