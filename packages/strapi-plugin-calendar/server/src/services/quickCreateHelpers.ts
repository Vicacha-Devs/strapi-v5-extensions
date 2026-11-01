import type { CalendarSourceMapping } from "../../../shared/types";
import type { QuickCreateEntryParams } from "../types";

export interface ContentTypeSchemaShape {
  options?: {
    draftAndPublish?: boolean;
  };
  attributes?: Record<string, { type?: string; required?: boolean }>;
}

function matchesKeyword(
  source: CalendarSourceMapping,
  keyword: string,
  canonicalUid: string
): boolean {
  if (source.uid === canonicalUid) return true;
  return (
    source.id.toLowerCase().includes(keyword) ||
    source.uid.toLowerCase().includes(keyword)
  );
}

export function matchesSourceFilter(
  source: CalendarSourceMapping,
  filter?: string
): boolean {
  if (!filter || filter === "all") return true;
  if (source.id === filter || source.uid === filter) return true;
  const lowerFilter = filter.toLowerCase();
  if (lowerFilter === "events" || lowerFilter === "event") {
    return matchesKeyword(source, "event", "plugin::events.event");
  }
  if (lowerFilter === "bookings" || lowerFilter === "booking") {
    return matchesKeyword(source, "booking", "plugin::bookings.booking");
  }
  return false;
}

export function resolveTargetSource(
  sources: CalendarSourceMapping[],
  sourceId?: string
): CalendarSourceMapping | undefined {
  if (!Array.isArray(sources) || sources.length === 0) {
    return undefined;
  }
  if (sourceId && sourceId !== "all") {
    const exact = sources.find((s) => s.id === sourceId || s.uid === sourceId);
    if (exact) return exact;
    const aliasMatch = sources.find((s) => matchesSourceFilter(s, sourceId));
    if (aliasMatch) return aliasMatch;
  }
  return sources.find((s) => s.enabled) ?? sources[0];
}

export function isBookingCollectionSource(
  source: CalendarSourceMapping,
  schema?: ContentTypeSchemaShape
): boolean {
  if (source.uid === "plugin::bookings.booking") return true;
  const attrs = schema?.attributes ?? {};
  return "bookingCode" in attrs && "customerEmail" in attrs;
}

function generateBookingCode(startIso: string): string {
  const dateCompact = startIso.slice(0, 10).replace(/-/g, "") || "20260101";
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK-${dateCompact}-${rand}`;
}

function computeEffectiveEnd(
  rawStart: string,
  endDate?: string
): { normalizedStart: string; effectiveEnd: string } {
  const normalizedStart = rawStart.includes("T")
    ? rawStart
    : `${rawStart}T10:00:00.000Z`;
  const startMs = new Date(normalizedStart).getTime();
  const defaultEndIso = Number.isNaN(startMs)
    ? normalizedStart
    : new Date(startMs + 3600000).toISOString();
  const trimmedEnd = endDate?.trim();
  return {
    normalizedStart,
    effectiveEnd: trimmedEnd || defaultEndIso,
  };
}

function setTrimmedIfMapped(
  data: Record<string, unknown>,
  fieldName: string | undefined,
  rawVal: string | undefined
): void {
  if (fieldName && rawVal) {
    data[fieldName] = rawVal.trim();
  }
}

function applyOptionalSourceFields(
  data: Record<string, unknown>,
  params: QuickCreateEntryParams,
  source: CalendarSourceMapping,
  defaultTimezone: string,
  slug: string,
  effectiveEnd: string,
  isPluginBooking: boolean
): void {
  const shouldSetEnd = Boolean(params.endDate) || isPluginBooking;
  if (source.fields.endDate && shouldSetEnd) {
    data[source.fields.endDate] = effectiveEnd;
  }
  if (source.fields.slug) {
    data[source.fields.slug] = `${slug}-${Date.now().toString(36)}`;
  }
  setTrimmedIfMapped(data, source.fields.location, params.location);
  setTrimmedIfMapped(data, source.fields.summary, params.summary);
  if (source.fields.rrule && params.rrule) {
    data[source.fields.rrule] = {
      rrule: params.rrule,
      timezone: defaultTimezone,
      allDay: false,
      exdates: [],
      overrides: {},
    };
  }
}

function applyCategoryIfApplicable(
  data: Record<string, unknown>,
  params: QuickCreateEntryParams,
  source: CalendarSourceMapping,
  isPluginBooking: boolean
): void {
  const catField = source.fields.category;
  if (!catField || !params.category || isPluginBooking) return;
  if (catField !== source.fields.status) {
    data[catField] = params.category;
  }
}

function hasFieldOrBookingUid(
  field: string,
  attrs: Record<string, unknown>,
  source: CalendarSourceMapping
): boolean {
  return field in attrs || source.uid === "plugin::bookings.booking";
}

function setIfBookingFieldPresent(
  data: Record<string, unknown>,
  field: string,
  value: unknown,
  attrs: Record<string, unknown>,
  source: CalendarSourceMapping
): void {
  if (value !== undefined && hasFieldOrBookingUid(field, attrs, source)) {
    data[field] = value;
  }
}

function applyBookingCollectionFields(
  data: Record<string, unknown>,
  params: QuickCreateEntryParams,
  source: CalendarSourceMapping,
  attrs: Record<string, unknown>,
  title: string,
  normalizedStart: string,
  effectiveEnd: string
): void {
  setIfBookingFieldPresent(
    data,
    "bookingCode",
    generateBookingCode(normalizedStart),
    attrs,
    source
  );
  setIfBookingFieldPresent(
    data,
    "customerName",
    params.customerName?.trim() || title,
    attrs,
    source
  );
  setIfBookingFieldPresent(
    data,
    "customerEmail",
    params.customerEmail?.trim() || "reservas@mezquitabogota.org",
    attrs,
    source
  );
  const phone = params.customerPhone?.trim();
  setIfBookingFieldPresent(
    data,
    "customerPhone",
    phone || undefined,
    attrs,
    source
  );

  const partySize = Math.max(1, Math.floor(Number(params.partySize) || 1));
  setIfBookingFieldPresent(data, "partySize", partySize, attrs, source);

  const statusField = source.fields.status || "status";
  const statusVal =
    params.bookingStatus === "pending" ? "pending" : "confirmed";
  setIfBookingFieldPresent(data, statusField, statusVal, attrs, source);

  const endField = source.fields.endDate || "endDate";
  if (!data[endField]) {
    data[endField] = effectiveEnd;
  }
}

export function buildQuickCreatePayload(
  params: QuickCreateEntryParams,
  source: CalendarSourceMapping,
  defaultTimezone: string,
  schema?: ContentTypeSchemaShape
): { data: Record<string, unknown>; shouldPublish: boolean } {
  const title = (params.title ?? "").trim();
  if (!title) throw new Error("Entry title is required.");

  const rawStart = (params.startDate ?? "").trim();
  if (!rawStart) throw new Error("Start date is required.");

  const { normalizedStart, effectiveEnd } = computeEffectiveEnd(
    rawStart,
    params.endDate
  );
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  const attrs = schema?.attributes ?? {};
  const isPluginBooking = isBookingCollectionSource(source, schema);
  const data: Record<string, unknown> = {
    [source.fields.title]: title,
    [source.fields.startDate]: rawStart,
  };

  applyOptionalSourceFields(
    data,
    params,
    source,
    defaultTimezone,
    slug,
    effectiveEnd,
    isPluginBooking
  );
  applyCategoryIfApplicable(data, params, source, isPluginBooking);

  if (isPluginBooking) {
    applyBookingCollectionFields(
      data,
      params,
      source,
      attrs,
      title,
      normalizedStart,
      effectiveEnd
    );
  }

  const shouldPublish =
    schema?.options?.draftAndPublish !== undefined
      ? Boolean(schema.options.draftAndPublish)
      : source.uid !== "plugin::bookings.booking";

  return { data, shouldPublish };
}
