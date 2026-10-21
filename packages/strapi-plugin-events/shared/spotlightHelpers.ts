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
} from './types';

const ALLOWED_ACTION_VARIANTS = new Set<EventActionLinkVariant>([
  'primary',
  'secondary',
  'outline',
]);

const ALLOWED_SPOTLIGHT_POSITIONS = new Set<EventSpotlightPosition>([
  'bottom-end',
  'bottom-start',
]);

/**
 * Validates that a URL is either a safe relative path (`/path`) or uses an explicit
 * allow-listed protocol (`https:`, `http:`, `mailto:`). Blocks `javascript:`, `data:`, `vbscript:`, etc.
 */
export function sanitizeEventUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string') {
    return null;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048) {
    return null;
  }
  // Reject control characters
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return null;
  }
  // Allow site-relative paths that do not start with protocol-relative `//`
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'https:' || protocol === 'http:' || protocol === 'mailto:') {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

function parseJsonIfNeeded(raw: unknown): unknown {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return raw;
      }
    }
  }
  return raw;
}

/**
 * Normalizes a Strapi Media field value (object, nested `{ data: ... }`, array, or fallback string URL)
 * into a unified `EventPosterAsset`.
 */
export function normalizeEventPoster(
  rawPoster: unknown,
  fallbackAlt?: string
): EventPosterAsset | undefined {
  if (!rawPoster) {
    return undefined;
  }

  if (typeof rawPoster === 'string') {
    const safeUrl = sanitizeEventUrl(rawPoster);
    if (!safeUrl) return undefined;
    return {
      url: safeUrl,
      alt: fallbackAlt || undefined,
    };
  }

  if (Array.isArray(rawPoster)) {
    return rawPoster.length > 0 ? normalizeEventPoster(rawPoster[0], fallbackAlt) : undefined;
  }

  if (typeof rawPoster === 'object') {
    const obj = rawPoster as Record<string, unknown>;

    // Unwrap Strapi v4/v5 `{ data: ... }` or `{ attributes: ... }` wrappers if present
    if (obj.data && typeof obj.data === 'object') {
      return normalizeEventPoster(obj.data, fallbackAlt);
    }
    if (obj.attributes && typeof obj.attributes === 'object') {
      return normalizeEventPoster(obj.attributes, fallbackAlt);
    }

    const safeUrl = sanitizeEventUrl(obj.url);
    if (!safeUrl) {
      return undefined;
    }

    const altRaw =
      typeof obj.alt === 'string' && obj.alt.trim()
        ? obj.alt.trim()
        : typeof obj.alternativeText === 'string' && obj.alternativeText.trim()
          ? obj.alternativeText.trim()
          : typeof obj.caption === 'string' && obj.caption.trim()
            ? obj.caption.trim()
            : fallbackAlt;

    const mime = typeof obj.mime === 'string' && obj.mime.trim() ? obj.mime.trim() : undefined;
    const width =
      typeof obj.width === 'number' && Number.isFinite(obj.width) && obj.width > 0
        ? Math.round(obj.width)
        : undefined;
    const height =
      typeof obj.height === 'number' && Number.isFinite(obj.height) && obj.height > 0
        ? Math.round(obj.height)
        : undefined;

    return {
      url: safeUrl,
      alt: altRaw || undefined,
      mime,
      width,
      height,
    };
  }

  return undefined;
}

/**
 * Normalizes a JSON array of action links, validating URLs and variants.
 */
export function normalizeEventActionLinks(rawLinks: unknown): EventActionLink[] | undefined {
  const parsed = parseJsonIfNeeded(rawLinks);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return undefined;
  }

  const normalized: EventActionLink[] = [];
  for (let i = 0; i < parsed.length; i += 1) {
    const item = parsed[i];
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const label = typeof rec.label === 'string' ? rec.label.trim().slice(0, 120) : '';
    const safeUrl = sanitizeEventUrl(rec.url);
    if (!label || !safeUrl) continue;

    const rawVariant = typeof rec.variant === 'string' ? rec.variant.trim() : '';
    const variant: EventActionLinkVariant = ALLOWED_ACTION_VARIANTS.has(
      rawVariant as EventActionLinkVariant
    )
      ? (rawVariant as EventActionLinkVariant)
      : i === 0
        ? 'primary'
        : 'outline';

    const external =
      typeof rec.external === 'boolean' ? rec.external : /^https?:\/\//i.test(safeUrl);

    const icon =
      typeof rec.icon === 'string' && rec.icon.trim()
        ? rec.icon.trim().slice(0, 60)
        : undefined;

    normalized.push({
      label,
      url: safeUrl,
      variant,
      external,
      ...(icon ? { icon } : {}),
    });
  }

  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Normalizes a spotlight configuration JSON object.
 */
export function normalizeEventSpotlightConfig(
  rawConfig: unknown
): EventSpotlightConfig | undefined {
  const parsed = parseJsonIfNeeded(rawConfig);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return undefined;
  }

  const rec = parsed as Record<string, unknown>;
  const enabled = Boolean(rec.enabled);

  const badgeText =
    typeof rec.badgeText === 'string' && rec.badgeText.trim()
      ? rec.badgeText.trim().slice(0, 80)
      : undefined;

  const priority =
    typeof rec.priority === 'number' && Number.isFinite(rec.priority)
      ? Math.round(rec.priority)
      : undefined;

  const rawPos = typeof rec.position === 'string' ? rec.position.trim() : '';
  const position: EventSpotlightPosition | undefined = ALLOWED_SPOTLIGHT_POSITIONS.has(
    rawPos as EventSpotlightPosition
  )
    ? (rawPos as EventSpotlightPosition)
    : undefined;

  const showCountdown =
    typeof rec.showCountdown === 'boolean' ? rec.showCountdown : undefined;

  const startAt =
    typeof rec.startAt === 'string' && rec.startAt.trim() ? rec.startAt.trim() : undefined;
  const endAt =
    typeof rec.endAt === 'string' && rec.endAt.trim() ? rec.endAt.trim() : undefined;

  return {
    enabled,
    ...(badgeText ? { badgeText } : {}),
    ...(priority !== undefined ? { priority } : {}),
    ...(position ? { position } : {}),
    ...(showCountdown !== undefined ? { showCountdown } : {}),
    ...(startAt ? { startAt } : {}),
    ...(endAt ? { endAt } : {}),
  };
}

function toBoundaryTimestamp(rawIsoOrDate: string, isEndBoundary: boolean): number | null {
  const trimmed = rawIsoOrDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const suffix = isEndBoundary ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
    const ts = new Date(`${trimmed}${suffix}`).getTime();
    return Number.isNaN(ts) ? null : ts;
  }
  const ts = new Date(trimmed).getTime();
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
  if (!spotlightConfig || !spotlightConfig.enabled) {
    return false;
  }

  const refDateObj =
    referenceDate instanceof Date
      ? referenceDate
      : typeof referenceDate === 'string' && referenceDate.trim()
        ? new Date(referenceDate)
        : new Date();
  const refTs = refDateObj.getTime();
  if (Number.isNaN(refTs)) {
    return false;
  }

  const effectiveStartRaw = spotlightConfig.startAt || eventStartDate;
  const effectiveEndRaw = spotlightConfig.endAt || eventEndDate || eventStartDate;

  const startTs = toBoundaryTimestamp(effectiveStartRaw, false);
  const endTs = toBoundaryTimestamp(effectiveEndRaw, true);

  if (startTs !== null && refTs < startTs) {
    return false;
  }
  if (endTs !== null && refTs > endTs) {
    return false;
  }
  return true;
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
    if (!occ.spotlightConfig?.enabled || occ.status === 'cancelled') {
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
  morning: { start: '09:00:00', end: '11:00:00' },
  afternoon: { start: '14:00:00', end: '16:00:00' },
  evening: { start: '18:00:00', end: '20:00:00' },
};

export function resolveStartEndFromDocument(
  doc: Record<string, unknown>,
  source: EventSourceMapping
): { startDate: string; endDate: string | null; allDay: boolean } | null {
  const rawStart = doc[source.fields.startDate];
  if (!rawStart || typeof rawStart !== 'string') {
    return null;
  }

  const rawEnd = source.fields.endDate ? doc[source.fields.endDate] : null;
  const rawSlot = source.fields.timeSlot ? doc[source.fields.timeSlot] : null;

  // Date-only field (e.g., "2026-11-15")
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawStart)) {
    if (typeof rawSlot === 'string' && rawSlot) {
      const slotMap = { ...DEFAULT_TIME_SLOTS, ...(source.timeSlotMap ?? {}) };
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
    const dateOnlyEnd =
      typeof rawEnd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawEnd)
        ? `${rawEnd}T23:59:59.000Z`
        : typeof rawEnd === 'string' && rawEnd
          ? rawEnd
          : `${rawStart}T23:59:59.000Z`;
    return {
      startDate: `${rawStart}T00:00:00.000Z`,
      endDate: dateOnlyEnd,
      allDay: source.defaultAllDay ?? true,
    };
  }

  const allDay = typeof doc.allDay === 'boolean' ? doc.allDay : Boolean(source.defaultAllDay);
  return {
    startDate: rawStart,
    endDate: typeof rawEnd === 'string' && rawEnd ? rawEnd : null,
    allDay,
  };
}

export function mapEventStatus(rawStatus: unknown): EventLifecycleStatus {
  if (typeof rawStatus !== 'string') return 'scheduled';
  const lower = rawStatus.toLowerCase();
  if (lower === 'cancelled' || lower === 'canceled') return 'cancelled';
  if (lower === 'postponed' || lower === 'pending') return 'postponed';
  if (lower === 'rescheduled') return 'rescheduled';
  return 'scheduled';
}

