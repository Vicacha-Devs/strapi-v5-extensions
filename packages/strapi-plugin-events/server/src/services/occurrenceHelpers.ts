import type { Core } from "@strapi/strapi";

import { resolveOccurrenceAlternateDates } from "../../../shared/calendarSystems";
import { buildCalendarLinks } from "../../../shared/icalGenerator";
import {
  expandRuleSlots,
  parseRRuleFieldValue,
} from "../../../shared/rruleEngine";
import {
  isSafeObjectKey,
  mapEventStatus,
  normalizeEventActionLinks,
  normalizeEventPoster,
  normalizeEventSpotlightConfig,
  resolveStartEndFromDocument,
  sanitizeEventUrl,
} from "../../../shared/spotlightHelpers";
import type {
  EventSourceMapping,
  EventsPluginSettings,
  ExpandedOccurrence,
} from "../../../shared/types";
import { type StrapiDocumentQueryOptions, getDocumentsClient } from "../types";
import {
  type GetOccurrencesParams,
  assertValidIsoDateTime,
  buildQuickCreatePayload,
  resolveOccurrenceWindow,
  resolveQuickCreateSource,
} from "./occurrencePayloadHelpers";
import {
  type PendingOccurrenceRsvpMeta,
  extractCustomFields,
  isAllowedEventSourceUid,
} from "./occurrenceRsvpBatch";
import { readNullablePositiveInt } from "./rsvpHelpers";

export {
  type GetOccurrencesParams,
  assertValidIsoDateTime,
  buildQuickCreatePayload,
  resolveOccurrenceWindow,
  resolveQuickCreateSource,
};

function resolveEffectiveQueryLocale(paramLoc?: string, defaultLoc?: string) {
  if (paramLoc && paramLoc !== "auto") return paramLoc;
  return defaultLoc && defaultLoc !== "auto" ? defaultLoc : undefined;
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
  const loc = resolveEffectiveQueryLocale(
    params.locale,
    settings.defaultLocale
  );
  if (loc) queryOpts.locale = loc;
  if (!params.includeDrafts) queryOpts.status = "published";
  return queryOpts;
}

function filterOutExplicitDrafts(
  docs: Array<Record<string, unknown>>,
  includeDrafts?: boolean
): Array<Record<string, unknown>> {
  if (includeDrafts) return docs;
  return docs.filter((doc) => doc.publishedAt !== null);
}

export async function fetchDocumentsForSource(
  strapi: Core.Strapi,
  source: EventSourceMapping,
  params: GetOccurrencesParams,
  settings: EventsPluginSettings
): Promise<Array<Record<string, unknown>>> {
  if (!isAllowedEventSourceUid(source.uid)) {
    return [];
  }
  const client = getDocumentsClient(strapi, source.uid);
  try {
    const queryOpts = buildSourceQueryOptions(source, params, settings);
    const docs = await client.findMany(queryOpts);
    if (docs.length === 0 && queryOpts.locale) {
      const { locale: _ignoredLocale, ...withoutLocaleOpts } = queryOpts;
      const fallbackLocaleDocs = await client.findMany(withoutLocaleOpts);
      return filterOutExplicitDrafts(fallbackLocaleDocs, params.includeDrafts);
    }
    return filterOutExplicitDrafts(docs, params.includeDrafts);
  } catch {
    return fetchDocumentsFallback(client, params);
  }
}

async function fetchDocumentsFallback(
  client: ReturnType<typeof getDocumentsClient>,
  params: Pick<GetOccurrencesParams, "documentId" | "includeDrafts">
): Promise<Array<Record<string, unknown>>> {
  try {
    const fallbackOpts: StrapiDocumentQueryOptions = { limit: 500 };
    if (params.documentId) {
      fallbackOpts.filters = { documentId: { $eq: params.documentId } };
    }
    if (!params.includeDrafts) {
      fallbackOpts.status = "published";
    }
    const docs = await client.findMany(fallbackOpts);
    return filterOutExplicitDrafts(docs, params.includeDrafts);
  } catch {
    return [];
  }
}

function resolveDocColor(
  doc: Record<string, unknown>,
  source: EventSourceMapping,
  categoryVal: string
): string {
  const colors = source.categoryColors;
  const categoryColor =
    categoryVal &&
    isSafeObjectKey(categoryVal) &&
    colors &&
    Object.hasOwn(colors, categoryVal)
      ? colors[categoryVal]
      : undefined;
  if (categoryColor) return categoryColor;
  if (typeof doc.color === "string" && doc.color.startsWith("#")) {
    return doc.color;
  }
  return source.color;
}

const readOptionalFieldString = (doc: Record<string, unknown>, key?: string) =>
  key && isSafeObjectKey(key) ? String(doc[key] ?? "") : "";

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
  waitlistEnabled: boolean;
  baseDateKey: string;
  virtualUrl: string | undefined;
  poster: ExpandedOccurrence["poster"];
  actionLinks: ExpandedOccurrence["actionLinks"];
  spotlightConfig: ExpandedOccurrence["spotlightConfig"];
  extractedCustomFields: Record<string, unknown> | undefined;
}

function extractDocMetadata(
  strapi: Core.Strapi,
  doc: Record<string, unknown>,
  source: EventSourceMapping,
  settings: EventsPluginSettings,
  docId: string,
  baseDateKey: string
): ExtractedDocMeta {
  const f = source.fields;
  const categoryVal = readOptionalFieldString(doc, f.category);
  const baseTitle = String(
    (isSafeObjectKey(f.title) ? doc[f.title] : undefined) ??
      doc.title ??
      "Untitled"
  );
  const slugVal = readOptionalFieldString(doc, f.slug);
  const rsvpField =
    f.rsvpEnabled && isSafeObjectKey(f.rsvpEnabled)
      ? f.rsvpEnabled
      : "rsvpEnabled";
  const capField =
    f.capacity && isSafeObjectKey(f.capacity) ? f.capacity : "capacity";

  return {
    docId,
    baseTitle,
    baseLocation: readOptionalFieldString(doc, f.location),
    summary: readOptionalFieldString(doc, f.summary),
    slug: slugVal || undefined,
    categoryVal,
    statusVal: mapEventStatus(
      f.status && isSafeObjectKey(f.status) ? doc[f.status] : doc.eventStatus
    ),
    color: resolveDocColor(doc, source, categoryVal),
    rsvpEnabled: doc[rsvpField] !== undefined ? Boolean(doc[rsvpField]) : false,
    capacity: readNullablePositiveInt(doc[capField]),
    waitlistEnabled:
      typeof doc.waitlistEnabled === "boolean"
        ? doc.waitlistEnabled
        : settings.waitlistEnabledByDefault,
    baseDateKey,
    virtualUrl:
      sanitizeEventUrl(doc.virtualUrl, { allowMailto: false }) ?? undefined,
    poster: normalizeEventPoster(
      f.poster && isSafeObjectKey(f.poster) ? doc[f.poster] : doc.poster,
      baseTitle
    ),
    actionLinks: normalizeEventActionLinks(doc[f.actionLinks ?? "actionLinks"]),
    spotlightConfig: normalizeEventSpotlightConfig(
      doc[f.spotlightConfig ?? "spotlightConfig"]
    ),
    extractedCustomFields: extractCustomFields(
      strapi,
      source.uid,
      doc,
      f.customFields
    ),
  };
}

const matchesCategoryFilter = (cat: string, filter?: string) =>
  !filter || filter === "all" || cat.toLowerCase() === filter.toLowerCase();

function resolveDocumentRecurrence(
  doc: Record<string, unknown>,
  source: EventSourceMapping,
  defaultTimezone: string,
  allDay: boolean
) {
  const rruleField = source.fields.rrule;
  const rawRecurrence =
    rruleField && isSafeObjectKey(rruleField) ? doc[rruleField] : null;
  const docTz =
    typeof doc.timezone === "string" && doc.timezone
      ? doc.timezone
      : defaultTimezone;
  const recurrence = parseRRuleFieldValue(rawRecurrence, docTz);
  if (allDay) recurrence.allDay = true;
  return recurrence;
}

export function expandDocumentOccurrencesSync(args: {
  strapi: Core.Strapi;
  doc: Record<string, unknown>;
  source: EventSourceMapping;
  params: GetOccurrencesParams;
  settings: EventsPluginSettings;
  windowStart: string;
  windowEnd: string;
  pendingRsvpMap: Map<string, PendingOccurrenceRsvpMeta>;
}): ExpandedOccurrence[] {
  const {
    strapi,
    doc,
    source,
    params,
    settings,
    windowStart,
    windowEnd,
    pendingRsvpMap,
  } = args;

  if (!isAllowedEventSourceUid(source.uid)) return [];
  const docId = String(doc.documentId ?? doc.id ?? "");
  if (!docId) return [];
  const startEnd = resolveStartEndFromDocument(doc, source);
  if (!startEnd) return [];

  const meta = extractDocMetadata(
    strapi,
    doc,
    source,
    settings,
    docId,
    startEnd.startDate.slice(0, 10)
  );
  if (params.onlySpotlights && !meta.spotlightConfig?.enabled) {
    return [];
  }
  if (!matchesCategoryFilter(meta.categoryVal, params.category)) return [];

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
    const occ = buildSingleExpandedOccurrence({
      doc,
      source,
      meta,
      slot,
      recurrence,
      settings,
      paramLocale: params.locale,
    });
    if (meta.rsvpEnabled) {
      pendingRsvpMap.set(occ.occurrenceId, {
        eventUid: source.uid,
        eventDocumentId: meta.docId,
        occurrenceDate: slot.occurrenceDate,
        capacity: meta.capacity,
        waitlistEnabled: meta.waitlistEnabled,
        rsvpEnabled: meta.rsvpEnabled,
      });
    }
    results.push(occ);
  }
  return results;
}

const toUndefinedIfEmpty = (val: string) => (val ? val : undefined);

const readOptionalDocString = (doc: Record<string, unknown>, key: string) =>
  typeof doc[key] === "string" && doc[key] ? (doc[key] as string) : undefined;

function buildSingleExpandedOccurrence(args: {
  doc: Record<string, unknown>;
  source: EventSourceMapping;
  meta: ExtractedDocMeta;
  slot: ReturnType<typeof expandRuleSlots>[number];
  recurrence: ReturnType<typeof parseRRuleFieldValue>;
  settings: EventsPluginSettings;
  paramLocale?: string;
}): ExpandedOccurrence {
  const { doc, source, meta, slot, recurrence, settings, paramLocale } = args;
  const effectiveTitle = slot.override?.title || meta.baseTitle;
  const effectiveLocation = slot.override?.location || meta.baseLocation;

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
    virtualUrl: meta.virtualUrl,
    category: toUndefinedIfEmpty(meta.categoryVal),
    status: meta.statusVal,
    color: meta.color,
    isRecurring: slot.isRecurring,
    rrule: toUndefinedIfEmpty(recurrence.rrule),
    isOverridden: slot.isOverridden,
    calendarLinks,
    alternateDates:
      Object.keys(alternateDates).length > 0 ? alternateDates : undefined,
    poster: meta.poster,
    actionLinks: meta.actionLinks,
    spotlightConfig: meta.spotlightConfig,
    customFields: meta.extractedCustomFields,
  };
}
