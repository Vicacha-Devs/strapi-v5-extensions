import type {
  EventActionLink,
  EventActionLinkVariant,
  EventLifecycleStatus,
  EventPosterAsset,
  EventSourceMapping,
  EventSpotlightConfig,
  EventSpotlightPosition,
  ExpandedOccurrence,
  TimeSlotWindow,
} from "./types";

const ALLOWED_ACTION_VARIANTS = new Set<EventActionLinkVariant>([
  "primary",
  "secondary",
  "outline",
]);

const ALLOWED_SPOTLIGHT_POSITIONS = new Set<EventSpotlightPosition>(["bottom-end", "bottom-start"]);

const ALLOWED_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);

function isSafeRelativeUrl(trimmed: string): boolean {
  return trimmed.startsWith("/") && !trimmed.startsWith("//");
}

function isAllowedAbsoluteUrl(trimmed: string): boolean {
  try {
    const parsed = new URL(trimmed);
    return ALLOWED_PROTOCOLS.has(parsed.protocol.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Validates that a URL is either a safe relative path (`/path`) or uses an explicit
 * allow-listed protocol (`https:`, `http:`, `mailto:`). Blocks `javascript:`, `data:`, `vbscript:`, etc.
 */
export function sanitizeEventUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048 || /[\u0000-\u001F\u007F]/.test(trimmed)) {
    return null;
  }
  if (isSafeRelativeUrl(trimmed) || isAllowedAbsoluteUrl(trimmed)) {
    return trimmed;
  }
  return null;
}

function parseJsonIfNeeded(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  const isJsonLike =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));
  if (!isJsonLike) return raw;
  try {
    return JSON.parse(trimmed);
  } catch {
    return raw;
  }
}

function getTrimmedString(val: unknown, maxLen?: number): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  return maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

function getPositiveInteger(val: unknown): number | undefined {
  if (typeof val !== "number" || !Number.isFinite(val) || val <= 0) return undefined;
  return Math.round(val);
}

function unwrapPosterRecord(obj: Record<string, unknown>): Record<string, unknown> {
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    return unwrapPosterRecord(obj.data as Record<string, unknown>);
  }
  if (obj.attributes && typeof obj.attributes === "object" && !Array.isArray(obj.attributes)) {
    return unwrapPosterRecord(obj.attributes as Record<string, unknown>);
  }
  return obj;
}

function resolvePosterAltText(
  obj: Record<string, unknown>,
  fallbackAlt?: string
): string | undefined {
  return (
    getTrimmedString(obj.alt) ||
    getTrimmedString(obj.alternativeText) ||
    getTrimmedString(obj.caption) ||
    fallbackAlt ||
    undefined
  );
}

/**
 * Normalizes a Strapi Media field value (object, nested `{ data: ... }`, array, or fallback string URL)
 * into a unified `EventPosterAsset`.
 */
export function normalizeEventPoster(
  rawPoster: unknown,
  fallbackAlt?: string
): EventPosterAsset | undefined {
  if (!rawPoster) return undefined;

  if (typeof rawPoster === "string") {
    const safeUrl = sanitizeEventUrl(rawPoster);
    return safeUrl ? { url: safeUrl, alt: fallbackAlt || undefined } : undefined;
  }

  if (Array.isArray(rawPoster)) {
    return rawPoster.length > 0 ? normalizeEventPoster(rawPoster[0], fallbackAlt) : undefined;
  }

  if (typeof rawPoster !== "object") return undefined;

  const obj = unwrapPosterRecord(rawPoster as Record<string, unknown>);
  const safeUrl = sanitizeEventUrl(obj.url);
  if (!safeUrl) return undefined;

  return {
    url: safeUrl,
    alt: resolvePosterAltText(obj, fallbackAlt),
    mime: getTrimmedString(obj.mime),
    width: getPositiveInteger(obj.width),
    height: getPositiveInteger(obj.height),
  };
}

function resolveActionVariant(rawVariant: unknown, index: number): EventActionLinkVariant {
  const candidate = getTrimmedString(rawVariant) as EventActionLinkVariant | undefined;
  if (candidate && ALLOWED_ACTION_VARIANTS.has(candidate)) {
    return candidate;
  }
  return index === 0 ? "primary" : "outline";
}

function normalizeSingleActionLink(item: unknown, index: number): EventActionLink | null {
  if (!item || typeof item !== "object") return null;
  const rec = item as Record<string, unknown>;
  const label = getTrimmedString(rec.label, 120);
  const safeUrl = sanitizeEventUrl(rec.url);
  if (!label || !safeUrl) return null;

  const external = typeof rec.external === "boolean" ? rec.external : /^https?:\/\//i.test(safeUrl);
  const icon = getTrimmedString(rec.icon, 60);

  return {
    label,
    url: safeUrl,
    variant: resolveActionVariant(rec.variant, index),
    external,
    ...(icon ? { icon } : {}),
  };
}

/**
 * Normalizes a JSON array of action links, validating URLs and variants.
 */
export function normalizeEventActionLinks(rawLinks: unknown): EventActionLink[] | undefined {
  const parsed = parseJsonIfNeeded(rawLinks);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return undefined;
  }

  const normalized = parsed
    .map((item, idx) => normalizeSingleActionLink(item, idx))
    .filter((link): link is EventActionLink => link !== null);

  return normalized.length > 0 ? normalized : undefined;
}

function resolveSpotlightPosition(rawPos: unknown): EventSpotlightPosition | undefined {
  const candidate = getTrimmedString(rawPos) as EventSpotlightPosition | undefined;
  return candidate && ALLOWED_SPOTLIGHT_POSITIONS.has(candidate) ? candidate : undefined;
}

function resolveFiniteRoundNumber(val: unknown): number | undefined {
  return typeof val === "number" && Number.isFinite(val) ? Math.round(val) : undefined;
}

/**
 * Normalizes a spotlight configuration JSON object.
 */
export function normalizeEventSpotlightConfig(
  rawConfig: unknown
): EventSpotlightConfig | undefined {
  const parsed = parseJsonIfNeeded(rawConfig);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }

  const rec = parsed as Record<string, unknown>;
  const config: EventSpotlightConfig = {
    enabled: Boolean(rec.enabled),
  };

  const badgeText = getTrimmedString(rec.badgeText, 80);
  if (badgeText) config.badgeText = badgeText;

  const priority = resolveFiniteRoundNumber(rec.priority);
  if (priority !== undefined) config.priority = priority;

  const position = resolveSpotlightPosition(rec.position);
  if (position) config.position = position;

  if (typeof rec.showCountdown === "boolean") {
    config.showCountdown = rec.showCountdown;
  }

  const startAt = getTrimmedString(rec.startAt);
  if (startAt) config.startAt = startAt;

  const endAt = getTrimmedString(rec.endAt);
  if (endAt) config.endAt = endAt;

  return config;
}

function toBoundaryTimestamp(rawIsoOrDate: string, isEndBoundary: boolean): number | null {
  const trimmed = rawIsoOrDate.trim();
  const isoString = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}${isEndBoundary ? "T23:59:59.999Z" : "T00:00:00.000Z"}`
    : trimmed;
  const ts = new Date(isoString).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function toReferenceTimestamp(referenceDate?: string | Date): number | null {
  if (referenceDate instanceof Date) {
    const ts = referenceDate.getTime();
    return Number.isNaN(ts) ? null : ts;
  }
  const str = getTrimmedString(referenceDate);
  const dt = str ? new Date(str) : new Date();
  const ts = dt.getTime();
  return Number.isNaN(ts) ? null : ts;
}

/**
 * Determines whether an event's spotlight is active at the given reference date/time.
 */
export function isEventSpotlightActiveOnDate(params: {
  spotlightConfig?: EventSpotlightConfig;
  eventStartDate: string;
  eventEndDate?: string | null;
  referenceDate?: string | Date;
}): boolean {
  const { spotlightConfig, eventStartDate, eventEndDate, referenceDate } = params;
  if (!spotlightConfig?.enabled) return false;

  const refTs = toReferenceTimestamp(referenceDate);
  if (refTs === null) return false;

  const startTs = toBoundaryTimestamp(spotlightConfig.startAt || eventStartDate, false);
  const endTs = toBoundaryTimestamp(spotlightConfig.endAt || eventEndDate || eventStartDate, true);

  const afterStart = startTs === null || refTs >= startTs;
  const beforeEnd = endTs === null || refTs <= endTs;
  return afterStart && beforeEnd;
}

/**
 * Deduplicates spotlight occurrences by `(sourceId, documentId)` and sorts by
 * `spotlightConfig.priority` descending, then `startDate` ascending.
 */
export function deduplicateAndSortSpotlights(
  occurrences: ExpandedOccurrence[]
): ExpandedOccurrence[] {
  const byDocKey = new Map<string, ExpandedOccurrence>();

  for (const occ of occurrences) {
    if (!occ.spotlightConfig?.enabled || occ.status === "cancelled") {
      continue;
    }
    const key = `${occ.sourceId}:${occ.documentId}`;
    if (!byDocKey.has(key)) {
      byDocKey.set(key, occ);
    }
  }

  const unique = Array.from(byDocKey.values());
  unique.sort((a, b) => {
    const prioA = a.spotlightConfig?.priority ?? 0;
    const prioB = b.spotlightConfig?.priority ?? 0;
    if (prioB !== prioA) {
      return prioB - prioA;
    }
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  return unique;
}

const DEFAULT_TIME_SLOTS: Record<string, TimeSlotWindow> = {
  morning: { start: "09:00:00", end: "11:00:00" },
  afternoon: { start: "14:00:00", end: "16:00:00" },
  evening: { start: "18:00:00", end: "20:00:00" },
};

function resolveDateOnlySlotWindow(
  rawStart: string,
  rawSlot: unknown,
  source: EventSourceMapping
): { startDate: string; endDate: string | null; allDay: boolean } | null {
  if (typeof rawSlot !== "string" || !rawSlot) return null;
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
  return null;
}

function resolveDateOnlyEnd(rawStart: string, rawEnd: unknown): string {
  if (typeof rawEnd === "string" && rawEnd) {
    return /^\d{4}-\d{2}-\d{2}$/.test(rawEnd) ? `${rawEnd}T23:59:59.000Z` : rawEnd;
  }
  return `${rawStart}T23:59:59.000Z`;
}

function readOptionalDocField(doc: Record<string, unknown>, fieldName?: string): unknown {
  return fieldName ? doc[fieldName] : null;
}

function resolveNonEmptyEnd(rawEnd: unknown): string | null {
  return typeof rawEnd === "string" && rawEnd ? rawEnd : null;
}

export function resolveStartEndFromDocument(
  doc: Record<string, unknown>,
  source: EventSourceMapping
): { startDate: string; endDate: string | null; allDay: boolean } | null {
  const rawStart = doc[source.fields.startDate];
  if (typeof rawStart !== "string" || !rawStart) {
    return null;
  }

  const rawEnd = readOptionalDocField(doc, source.fields.endDate);
  const rawSlot = readOptionalDocField(doc, source.fields.timeSlot);

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawStart)) {
    const slotWindow = resolveDateOnlySlotWindow(rawStart, rawSlot, source);
    if (slotWindow) return slotWindow;
    return {
      startDate: `${rawStart}T00:00:00.000Z`,
      endDate: resolveDateOnlyEnd(rawStart, rawEnd),
      allDay: source.defaultAllDay ?? true,
    };
  }

  const allDay = typeof doc.allDay === "boolean" ? doc.allDay : Boolean(source.defaultAllDay);
  return {
    startDate: rawStart,
    endDate: resolveNonEmptyEnd(rawEnd),
    allDay,
  };
}

const EVENT_STATUS_ALIAS_MAP: Record<string, EventLifecycleStatus> = {
  cancelled: "cancelled",
  canceled: "cancelled",
  postponed: "postponed",
  pending: "postponed",
  rescheduled: "rescheduled",
};

export function mapEventStatus(rawStatus: unknown): EventLifecycleStatus {
  if (typeof rawStatus !== "string") return "scheduled";
  return EVENT_STATUS_ALIAS_MAP[rawStatus.toLowerCase()] ?? "scheduled";
}
