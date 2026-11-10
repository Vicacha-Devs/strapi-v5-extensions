import { EVENT_CONTENT_TYPE_UID } from "../../../shared/pluginId";
import {
  isValidCalendarDateKey,
  normalizeRRuleString,
} from "../../../shared/rruleEngine";
import { isSafeObjectKey } from "../../../shared/spotlightHelpers";
import type {
  EventSourceMapping,
  EventsPluginSettings,
} from "../../../shared/types";
import { type PaginationParams, PluginValidationError } from "../types";
import { isAllowedEventSourceUid } from "./occurrenceRsvpBatch";

export interface GetOccurrencesParams extends PaginationParams {
  from?: string;
  to?: string;
  locale?: string;
  category?: string;
  sourceId?: string;
  documentId?: string;
  includeDrafts?: boolean;
  onlySpotlights?: boolean;
}

const MAX_PUBLIC_WINDOW_MS = 366 * 24 * 60 * 60 * 1000;
const MAX_ADMIN_WINDOW_MS = 5 * 366 * 24 * 60 * 60 * 1000;

export function assertValidIsoDateTime(
  raw: unknown,
  fieldName: string
): number {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new PluginValidationError(
      `Invalid ${fieldName}: must be a non-empty ISO 8601 date or datetime.`
    );
  }
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    if (!isValidCalendarDateKey(trimmed)) {
      throw new PluginValidationError(
        `Invalid ${fieldName}: "${trimmed}" is not a valid calendar date.`
      );
    }
    return new Date(`${trimmed}T00:00:00.000Z`).getTime();
  }
  const ms = new Date(trimmed).getTime();
  if (!Number.isFinite(ms)) {
    throw new PluginValidationError(
      `Invalid ${fieldName}: must be a valid ISO 8601 datetime.`
    );
  }
  return ms;
}

function isValidIso(val?: string): boolean {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return isValidCalendarDateKey(trimmed);
  }
  return Number.isFinite(new Date(trimmed).getTime());
}

export function resolveOccurrenceWindow(params: GetOccurrencesParams): {
  windowStart: string;
  windowEnd: string;
  isEmptyWindow: boolean;
} {
  const now = new Date();
  const defaultFromMs = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  ).getTime();
  const defaultToMs = new Date(
    now.getFullYear(),
    now.getMonth() + 3,
    0,
    23,
    59,
    59
  ).getTime();

  const startMs = isValidIso(params.from)
    ? new Date(String(params.from)).getTime()
    : defaultFromMs;
  const rawEndMs = isValidIso(params.to)
    ? new Date(String(params.to)).getTime()
    : defaultToMs;

  if (rawEndMs < startMs) {
    return {
      windowStart: new Date(startMs).toISOString(),
      windowEnd: new Date(rawEndMs).toISOString(),
      isEmptyWindow: true,
    };
  }

  const maxSpanMs = params.includeDrafts
    ? MAX_ADMIN_WINDOW_MS
    : MAX_PUBLIC_WINDOW_MS;
  const clampedEndMs =
    rawEndMs - startMs > maxSpanMs ? startMs + maxSpanMs : rawEndMs;

  return {
    windowStart: new Date(startMs).toISOString(),
    windowEnd: new Date(clampedEndMs).toISOString(),
    isEmptyWindow: false,
  };
}

export function resolveQuickCreateSource(
  settings: EventsPluginSettings,
  sourceId?: string
): EventSourceMapping {
  const sources = (settings.sources ?? []).filter((s) =>
    isAllowedEventSourceUid(s.uid)
  );
  const chosen =
    sources.find((s) => s.id === sourceId) ??
    sources.find((s) => s.uid === EVENT_CONTENT_TYPE_UID) ??
    sources[0];
  if (!chosen) {
    throw new PluginValidationError("No allowed event source is configured.");
  }
  return chosen;
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
  const rruleField = source.fields.rrule;
  const cleanRRule = normalizeRRuleString(params.rrule);
  if (rruleField && isSafeObjectKey(rruleField) && cleanRRule) {
    data[rruleField] = {
      rrule: cleanRRule,
      timezone: settings.defaultTimezone,
      allDay: false,
      exdates: [],
      overrides: {},
    };
  }
  if (
    source.fields.rsvpEnabled &&
    isSafeObjectKey(source.fields.rsvpEnabled) &&
    typeof params.rsvpEnabled === "boolean"
  ) {
    data[source.fields.rsvpEnabled] = params.rsvpEnabled;
  }
  if (
    source.fields.capacity &&
    isSafeObjectKey(source.fields.capacity) &&
    typeof params.capacity === "number" &&
    Number.isFinite(params.capacity) &&
    params.capacity >= 1
  ) {
    data[source.fields.capacity] = Math.floor(params.capacity);
  }
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
    if (fieldKey && isSafeObjectKey(fieldKey) && val) {
      data[fieldKey] = val;
    }
  }
  if (source.fields.slug && isSafeObjectKey(source.fields.slug)) {
    data[source.fields.slug] = `${slug}-${Date.now().toString(36)}`;
  }
  applyQuickCreateRRuleAndRsvp(data, source, settings, params);
  return data;
}
