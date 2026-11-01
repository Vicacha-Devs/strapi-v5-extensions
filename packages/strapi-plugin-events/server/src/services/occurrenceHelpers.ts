import type { Core } from "@strapi/strapi";

import { resolveOccurrenceAlternateDates } from "../../../shared/calendarSystems";
import { buildCalendarLinks } from "../../../shared/icalGenerator";
import { EVENT_CONTENT_TYPE_UID } from "../../../shared/pluginId";
import {
  expandRuleSlots,
  parseRRuleFieldValue,
} from "../../../shared/rruleEngine";
import {
  mapEventStatus,
  normalizeEventActionLinks,
  normalizeEventPoster,
  normalizeEventSpotlightConfig,
  resolveStartEndFromDocument,
} from "../../../shared/spotlightHelpers";
import type {
  EventSourceMapping,
  EventsPluginSettings,
  ExpandedOccurrence,
} from "../../../shared/types";
import {
  type StrapiDocumentQueryOptions,
  getDocumentsClient,
  getRsvpService,
} from "../types";

export interface GetOccurrencesParams {
  from?: string;
  to?: string;
  locale?: string;
  category?: string;
  sourceId?: string;
  documentId?: string;
  includeDrafts?: boolean;
}

export function resolveOccurrenceWindow(params: GetOccurrencesParams): {
  windowStart: string;
  windowEnd: string;
} {
  const now = new Date();
  const defaultFrom = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  ).toISOString();
  const defaultTo = new Date(
    now.getFullYear(),
    now.getMonth() + 3,
    0,
    23,
    59,
    59
  ).toISOString();
  const isValidIso = (val?: string) =>
    Boolean(val && !Number.isNaN(new Date(val).getTime()));
  return {
    windowStart: isValidIso(params.from) ? String(params.from) : defaultFrom,
    windowEnd: isValidIso(params.to) ? String(params.to) : defaultTo,
  };
}

function resolveEffectiveQueryLocale(
  paramLocale: string | undefined,
  defaultLocale: string | undefined
): string | undefined {
  if (paramLocale && paramLocale !== "auto") return paramLocale;
  if (defaultLocale && defaultLocale !== "auto") return defaultLocale;
  return undefined;
}

function buildSourceQueryOptions(
  source: EventSourceMapping,
  params: GetOccurrencesParams,
  settings: EventsPluginSettings
): StrapiDocumentQueryOptions {
  const posterField = source.fields.poster;
  const queryOpts: StrapiDocumentQueryOptions = {
    limit: 500,
    ...(posterField ? { populate: [posterField] } : {}),
  };
  if (params.documentId) {
    queryOpts.filters = { documentId: { $eq: params.documentId } };
  }
  const effectiveLocale = resolveEffectiveQueryLocale(
    params.locale,
    settings.defaultLocale
  );
  if (effectiveLocale) {
    queryOpts.locale = effectiveLocale;
  }
  if (!params.includeDrafts) {
    queryOpts.status = "published";
  }
  return queryOpts;
}

export async function fetchDocumentsForSource(
  strapi: Core.Strapi,
  source: EventSourceMapping,
  params: GetOccurrencesParams,
  settings: EventsPluginSettings
): Promise<Array<Record<string, unknown>>> {
  const client = getDocumentsClient(strapi, source.uid);
  try {
    const queryOpts = buildSourceQueryOptions(source, params, settings);
    const docs = await client.findMany(queryOpts);
    if (docs.length === 0 && queryOpts.locale) {
      const { locale: _ignoredLocale, ...withoutLocaleOpts } = queryOpts;
      return await client.findMany(withoutLocaleOpts);
    }
    return docs;
  } catch {
    return fetchDocumentsFallback(client, params.documentId);
  }
}

async function fetchDocumentsFallback(
  client: ReturnType<typeof getDocumentsClient>,
  documentId?: string
): Promise<Array<Record<string, unknown>>> {
  try {
    const fallbackOpts: StrapiDocumentQueryOptions = { limit: 500 };
    if (documentId) {
      fallbackOpts.filters = { documentId: { $eq: documentId } };
    }
    return await client.findMany(fallbackOpts);
  } catch {
    return [];
  }
}

function extractCustomFields(
  doc: Record<string, unknown>,
  customFieldKeys?: string[]
): Record<string, unknown> | undefined {
  if (!Array.isArray(customFieldKeys) || customFieldKeys.length === 0) {
    return undefined;
  }
  const extracted: Record<string, unknown> = {};
  for (const fieldKey of customFieldKeys) {
    if (fieldKey && doc[fieldKey] !== undefined) {
      extracted[fieldKey] = doc[fieldKey];
    }
  }
  return Object.keys(extracted).length > 0 ? extracted : undefined;
}

function resolveDocColor(
  doc: Record<string, unknown>,
  source: EventSourceMapping,
  categoryVal: string
): string {
  const categoryColor = categoryVal
    ? source.categoryColors?.[categoryVal]
    : undefined;
  if (categoryColor) return categoryColor;
  if (typeof doc.color === "string" && doc.color.startsWith("#"))
    return doc.color;
  return source.color;
}

function readOptionalFieldString(
  doc: Record<string, unknown>,
  fieldName?: string
): string {
  if (!fieldName) return "";
  return String(doc[fieldName] ?? "");
}

function resolveDocCapacity(
  doc: Record<string, unknown>,
  source: EventSourceMapping
): number | null {
  const capField = source.fields.capacity ?? "capacity";
  const rawCap = doc[capField];
  return typeof rawCap === "number" && rawCap > 0 ? Math.floor(rawCap) : null;
}

interface ExtractedDocMeta {
  docId: string;
  baseTitle: string;
  baseLocation: string;
  summary: string;
  slug: string | undefined;
  categoryVal: string;
  statusVal: ExpandedOccurrence["status"];
  color: string;
  rsvpEnabled: boolean;
  capacity: number | null;
  baseDateKey: string;
  poster: ExpandedOccurrence["poster"];
  actionLinks: ExpandedOccurrence["actionLinks"];
  spotlightConfig: ExpandedOccurrence["spotlightConfig"];
  extractedCustomFields: Record<string, unknown> | undefined;
}

function extractDocMetadata(
  doc: Record<string, unknown>,
  source: EventSourceMapping,
  docId: string,
  baseDateKey: string
): ExtractedDocMeta {
  const categoryVal = readOptionalFieldString(doc, source.fields.category);
  const baseTitle = String(doc[source.fields.title] ?? doc.title ?? "Untitled");
  const baseLocation = readOptionalFieldString(doc, source.fields.location);
  const summary = readOptionalFieldString(doc, source.fields.summary);
  const slugVal = readOptionalFieldString(doc, source.fields.slug);
  const statusVal = mapEventStatus(
    source.fields.status ? doc[source.fields.status] : doc.eventStatus
  );
  const color = resolveDocColor(doc, source, categoryVal);
  const rsvpField = source.fields.rsvpEnabled ?? "rsvpEnabled";
  const rsvpEnabled =
    doc[rsvpField] !== undefined ? Boolean(doc[rsvpField]) : false;
  const capacity = resolveDocCapacity(doc, source);
  const posterField = source.fields.poster;
  const poster = normalizeEventPoster(
    posterField ? doc[posterField] : doc.poster,
    baseTitle
  );
  const actionLinks = normalizeEventActionLinks(
    doc[source.fields.actionLinks ?? "actionLinks"]
  );
  const spotlightConfig = normalizeEventSpotlightConfig(
    doc[source.fields.spotlightConfig ?? "spotlightConfig"]
  );

  return {
    docId,
    baseTitle,
    baseLocation,
    summary,
    slug: slugVal || undefined,
    categoryVal,
    statusVal,
    color,
    rsvpEnabled,
    capacity,
    baseDateKey,
    poster,
    actionLinks,
    spotlightConfig,
    extractedCustomFields: extractCustomFields(doc, source.fields.customFields),
  };
}

function matchesCategoryFilter(
  categoryVal: string,
  filterCategory?: string
): boolean {
  if (!filterCategory || filterCategory === "all") return true;
  return categoryVal.toLowerCase() === filterCategory.toLowerCase();
}

function resolveDocumentRecurrence(
  doc: Record<string, unknown>,
  source: EventSourceMapping,
  defaultTimezone: string,
  allDay: boolean
) {
  const rawRecurrence = source.fields.rrule ? doc[source.fields.rrule] : null;
  const docTz =
    typeof doc.timezone === "string" && doc.timezone
      ? doc.timezone
      : defaultTimezone;
  const recurrence = parseRRuleFieldValue(rawRecurrence, docTz);
  if (allDay) {
    recurrence.allDay = true;
  }
  return recurrence;
}

export async function expandDocumentOccurrences(
  strapi: Core.Strapi,
  doc: Record<string, unknown>,
  source: EventSourceMapping,
  params: GetOccurrencesParams,
  settings: EventsPluginSettings,
  windowStart: string,
  windowEnd: string
): Promise<ExpandedOccurrence[]> {
  const docId = String(doc.documentId ?? doc.id ?? "");
  if (!docId) return [];
  const startEnd = resolveStartEndFromDocument(doc, source);
  if (!startEnd) return [];

  const meta = extractDocMetadata(
    doc,
    source,
    docId,
    startEnd.startDate.slice(0, 10)
  );
  if (!matchesCategoryFilter(meta.categoryVal, params.category)) {
    return [];
  }

  const recurrence = resolveDocumentRecurrence(
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

  const results: ExpandedOccurrence[] = [];
  for (const slot of slots) {
    const item = await buildSingleExpandedOccurrence({
      strapi,
      doc,
      source,
      meta,
      slot,
      recurrence,
      settings,
      paramLocale: params.locale,
    });
    results.push(item);
  }
  return results;
}

async function fetchSlotRsvpStats(
  strapi: Core.Strapi,
  doc: Record<string, unknown>,
  source: EventSourceMapping,
  meta: ExtractedDocMeta,
  occurrenceDate: string,
  settings: EventsPluginSettings
) {
  if (!meta.rsvpEnabled) return undefined;
  const waitlistOverride =
    typeof doc.waitlistEnabled === "boolean"
      ? doc.waitlistEnabled
      : settings.waitlistEnabledByDefault;

  return getRsvpService(strapi).getEventStats({
    eventUid: source.uid,
    eventDocumentId: meta.docId,
    occurrenceDate,
    capacityOverride: meta.capacity,
    waitlistOverride,
    rsvpEnabledOverride: meta.rsvpEnabled,
  });
}

function toUndefinedIfEmpty(val: string): string | undefined {
  return val ? val : undefined;
}

function readOptionalDocString(
  doc: Record<string, unknown>,
  key: string
): string | undefined {
  const val = doc[key];
  return typeof val === "string" && val ? val : undefined;
}

async function buildSingleExpandedOccurrence(args: {
  strapi: Core.Strapi;
  doc: Record<string, unknown>;
  source: EventSourceMapping;
  meta: ExtractedDocMeta;
  slot: ReturnType<typeof expandRuleSlots>[number];
  recurrence: ReturnType<typeof parseRRuleFieldValue>;
  settings: EventsPluginSettings;
  paramLocale?: string;
}): Promise<ExpandedOccurrence> {
  const { strapi, doc, source, meta, slot, recurrence, settings, paramLocale } =
    args;
  const effectiveTitle = slot.override?.title || meta.baseTitle;
  const effectiveLocation = slot.override?.location || meta.baseLocation;
  const rsvpStats = await fetchSlotRsvpStats(
    strapi,
    doc,
    source,
    meta,
    slot.occurrenceDate,
    settings
  );

  const calendarLinks = buildCalendarLinks({
    documentId: meta.docId,
    title: effectiveTitle,
    startDate: slot.startDate,
    endDate: slot.endDate,
    allDay: Boolean(recurrence.allDay),
    summary: meta.summary,
    location: effectiveLocation,
    occurrenceDate: slot.occurrenceDate,
  });

  const alternateDates = resolveOccurrenceAlternateDates({
    occurrenceDate: slot.occurrenceDate,
    baseDateKey: meta.baseDateKey,
    isRecurring: slot.isRecurring,
    doc,
    source,
    secondaryCalendars: settings.secondaryCalendars ?? [],
    locale: paramLocale && paramLocale !== "auto" ? paramLocale : "en",
  });

  return {
    occurrenceId: `${source.id}:${meta.docId}:${slot.occurrenceDate}`,
    sourceId: source.id,
    sourceLabel: source.label,
    uid: source.uid,
    documentId: meta.docId,
    locale: readOptionalDocString(doc, "locale"),
    occurrenceDate: slot.occurrenceDate,
    startDate: slot.startDate,
    endDate: slot.endDate,
    allDay: Boolean(recurrence.allDay),
    timezone: recurrence.timezone,
    title: effectiveTitle,
    slug: meta.slug,
    summary: toUndefinedIfEmpty(meta.summary),
    location: toUndefinedIfEmpty(effectiveLocation),
    virtualUrl: readOptionalDocString(doc, "virtualUrl"),
    category: toUndefinedIfEmpty(meta.categoryVal),
    status: meta.statusVal,
    color: meta.color,
    isRecurring: slot.isRecurring,
    rrule: toUndefinedIfEmpty(recurrence.rrule),
    isOverridden: slot.isOverridden,
    rsvp: rsvpStats,
    calendarLinks,
    alternateDates:
      Object.keys(alternateDates).length > 0 ? alternateDates : undefined,
    poster: meta.poster,
    actionLinks: meta.actionLinks,
    spotlightConfig: meta.spotlightConfig,
    customFields: meta.extractedCustomFields,
  };
}

export function resolveQuickCreateSource(
  settings: EventsPluginSettings,
  sourceId?: string
): EventSourceMapping {
  const sources = settings.sources ?? [];
  return (
    sources.find((s) => s.id === sourceId) ??
    sources.find((s) => s.uid === EVENT_CONTENT_TYPE_UID) ??
    sources[0]
  );
}

export function buildQuickCreatePayload(
  source: EventSourceMapping,
  settings: EventsPluginSettings,
  params: {
    title: string;
    startDate: string;
    endDate?: string;
    location?: string;
    category?: string;
    summary?: string;
    rrule?: string;
    rsvpEnabled?: boolean;
    capacity?: number;
  }
): Record<string, unknown> {
  const title = (params.title ?? "").trim();
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  const data: Record<string, unknown> = {
    [source.fields.title]: title,
    [source.fields.startDate]: params.startDate,
  };

  const optionalStrings: Array<[string | undefined, string | undefined]> = [
    [source.fields.endDate, params.endDate],
    [source.fields.location, params.location],
    [source.fields.category, params.category],
    [source.fields.summary, params.summary],
  ];
  for (const [fieldKey, val] of optionalStrings) {
    if (fieldKey && val) {
      data[fieldKey] = val;
    }
  }
  if (source.fields.slug) {
    data[source.fields.slug] = `${slug}-${Date.now().toString(36)}`;
  }
  applyQuickCreateRRuleAndRsvp(data, source, settings, params);
  return data;
}

function applyQuickCreateRRuleAndRsvp(
  data: Record<string, unknown>,
  source: EventSourceMapping,
  settings: EventsPluginSettings,
  params: {
    rrule?: string;
    rsvpEnabled?: boolean;
    capacity?: number;
  }
): void {
  if (source.fields.rrule && params.rrule) {
    data[source.fields.rrule] = {
      rrule: params.rrule,
      timezone: settings.defaultTimezone,
      allDay: false,
      exdates: [],
      overrides: {},
    };
  }
  if (source.fields.rsvpEnabled && typeof params.rsvpEnabled === "boolean") {
    data[source.fields.rsvpEnabled] = params.rsvpEnabled;
  }
  if (
    source.fields.capacity &&
    typeof params.capacity === "number" &&
    params.capacity > 0
  ) {
    data[source.fields.capacity] = Math.floor(params.capacity);
  }
}
