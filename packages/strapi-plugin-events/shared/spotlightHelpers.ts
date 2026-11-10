import type {
  EventLifecycleStatus,
  EventSourceMapping,
  EventSpotlightConfig,
  EventSpotlightPosition,
  ExpandedOccurrence,
  TimeSlotWindow,
} from "./types";
import {
  getTrimmedString,
  isSafeObjectKey,
  normalizeEventActionLinks,
  normalizeEventPoster,
  parseJsonIfNeeded,
  sanitizeEventUrl,
  sanitizePlainRecord,
} from "./urlAndPosterHelpers";

export {
  isSafeObjectKey,
  normalizeEventActionLinks,
  normalizeEventPoster,
  sanitizeEventUrl,
  sanitizePlainRecord,
};

const ALLOWED_SPOTLIGHT_POSITIONS = new Set<EventSpotlightPosition>([
  "bottom-end",
  "bottom-start",
]);

function resolveSpotlightPosition(
  rawPos: unknown
): EventSpotlightPosition | undefined {
  const candidate = getTrimmedString(rawPos) as
    | EventSpotlightPosition
    | undefined;
  return candidate && ALLOWED_SPOTLIGHT_POSITIONS.has(candidate)
    ? candidate
    : undefined;
}

function resolveFiniteRoundNumber(val: unknown): number | undefined {
  return typeof val === "number" && Number.isFinite(val)
    ? Math.round(val)
    : undefined;
}

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

function toBoundaryTimestamp(
  rawIsoOrDate: string,
  isEndBoundary: boolean
): number | null {
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

export function isEventSpotlightActiveOnDate(params: {
  spotlightConfig?: EventSpotlightConfig;
  eventStartDate: string;
  eventEndDate?: string | null;
  referenceDate?: string | Date;
}): boolean {
  const { spotlightConfig, eventStartDate, eventEndDate, referenceDate } =
    params;
  if (!spotlightConfig?.enabled) return false;

  const refTs = toReferenceTimestamp(referenceDate);
  if (refTs === null) return false;

  const startTs = toBoundaryTimestamp(
    spotlightConfig.startAt || eventStartDate,
    false
  );
  const endTs = toBoundaryTimestamp(
    spotlightConfig.endAt || eventEndDate || eventStartDate,
    true
  );

  const afterStart = startTs === null || refTs >= startTs;
  const beforeEnd = endTs === null || refTs <= endTs;
  return afterStart && beforeEnd;
}

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

function buildSafeSlotMap(
  customSlots?: Record<string, TimeSlotWindow>
): Record<string, TimeSlotWindow> {
  const slotMap: Record<string, TimeSlotWindow> = { ...DEFAULT_TIME_SLOTS };
  if (customSlots && typeof customSlots === "object") {
    for (const [k, v] of Object.entries(customSlots)) {
      if (isSafeObjectKey(k) && v && typeof v === "object") {
        slotMap[k] = v;
      }
    }
  }
  return slotMap;
}

function resolveDateOnlySlotWindow(
  rawStart: string,
  rawSlot: unknown,
  source: EventSourceMapping
): { startDate: string; endDate: string | null; allDay: boolean } | null {
  if (!isSafeObjectKey(rawSlot)) return null;
  const slotMap = buildSafeSlotMap(source.timeSlotMap);
  const mapped = Object.hasOwn(slotMap, rawSlot) ? slotMap[rawSlot] : undefined;
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
    return /^\d{4}-\d{2}-\d{2}$/.test(rawEnd)
      ? `${rawEnd}T23:59:59.000Z`
      : rawEnd;
  }
  return `${rawStart}T23:59:59.000Z`;
}

function readOptionalDocField(
  doc: Record<string, unknown>,
  fieldName?: string
): unknown {
  return fieldName && isSafeObjectKey(fieldName) ? doc[fieldName] : null;
}

function resolveNonEmptyEnd(rawEnd: unknown): string | null {
  return typeof rawEnd === "string" && rawEnd ? rawEnd : null;
}

export function resolveStartEndFromDocument(
  doc: Record<string, unknown>,
  source: EventSourceMapping
): { startDate: string; endDate: string | null; allDay: boolean } | null {
  const startField = source.fields.startDate;
  const rawStart = isSafeObjectKey(startField) ? doc[startField] : undefined;
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

  const allDay =
    typeof doc.allDay === "boolean"
      ? doc.allDay
      : Boolean(source.defaultAllDay);
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
  const lower = rawStatus.toLowerCase();
  return Object.hasOwn(EVENT_STATUS_ALIAS_MAP, lower)
    ? EVENT_STATUS_ALIAS_MAP[lower]
    : "scheduled";
}
