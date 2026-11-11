import type {
  EventActionLink,
  EventActionLinkVariant,
  EventPosterAsset,
} from "./types";

const DANGEROUS_OBJECT_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

export function isSafeObjectKey(key: unknown): key is string {
  return (
    typeof key === "string" && key.length > 0 && !DANGEROUS_OBJECT_KEYS.has(key)
  );
}

export function sanitizePlainRecord(
  raw: unknown,
  maxDepth = 4
): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || maxDepth < 0) {
    return null;
  }
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isSafeObjectKey(k)) continue;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if (maxDepth === 0) continue;
      clean[k] = sanitizePlainRecord(v, maxDepth - 1);
    } else if (Array.isArray(v)) {
      clean[k] =
        maxDepth === 0
          ? []
          : v.map((item) =>
              item && typeof item === "object" && !Array.isArray(item)
                ? sanitizePlainRecord(item, maxDepth - 1)
                : item
            );
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

const ALLOWED_ACTION_VARIANTS = new Set<EventActionLinkVariant>([
  "primary",
  "secondary",
  "outline",
]);

const HTTP_PROTOCOLS = new Set(["https:", "http:"]);
const ACTION_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);

function isSafeRelativeUrl(trimmed: string): boolean {
  return (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.includes("\\")
  );
}

function isAllowedAbsoluteUrl(trimmed: string, allowMailto: boolean): boolean {
  try {
    const parsed = new URL(trimmed);
    const proto = parsed.protocol.toLowerCase();
    return allowMailto
      ? ACTION_PROTOCOLS.has(proto)
      : HTTP_PROTOCOLS.has(proto);
  } catch {
    return false;
  }
}

/**
 * Validates that a URL is either a safe relative path (`/path`, no `//` or `\`)
 * or uses an allow-listed protocol (`https:`, `http:`, plus `mailto:` unless disabled).
 */
export function sanitizeEventUrl(
  rawUrl: unknown,
  options?: { allowMailto?: boolean }
): string | null {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (
    !trimmed ||
    trimmed.length > 2048 ||
    /[\u0000-\u001F\u007F]/.test(trimmed)
  ) {
    return null;
  }
  const allowMailto = options?.allowMailto ?? true;
  if (
    isSafeRelativeUrl(trimmed) ||
    isAllowedAbsoluteUrl(trimmed, allowMailto)
  ) {
    return trimmed;
  }
  return null;
}

export function parseJsonIfNeeded(raw: unknown): unknown {
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

export function getTrimmedString(
  val: unknown,
  maxLen?: number
): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  return maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

function getPositiveInteger(val: unknown): number | undefined {
  if (typeof val !== "number" || !Number.isFinite(val) || val <= 0) {
    return undefined;
  }
  return Math.round(val);
}

function unwrapPosterRecord(
  obj: Record<string, unknown>
): Record<string, unknown> {
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    return unwrapPosterRecord(obj.data as Record<string, unknown>);
  }
  if (
    obj.attributes &&
    typeof obj.attributes === "object" &&
    !Array.isArray(obj.attributes)
  ) {
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
 * Normalizes a Strapi Media field value into a unified `EventPosterAsset`.
 * Disallows `mailto:` URLs on poster assets.
 */
export function normalizeEventPoster(
  rawPoster: unknown,
  fallbackAlt?: string
): EventPosterAsset | undefined {
  if (!rawPoster) return undefined;

  if (typeof rawPoster === "string") {
    const safeUrl = sanitizeEventUrl(rawPoster, { allowMailto: false });
    return safeUrl
      ? { url: safeUrl, alt: fallbackAlt || undefined }
      : undefined;
  }

  if (Array.isArray(rawPoster)) {
    return rawPoster.length > 0
      ? normalizeEventPoster(rawPoster[0], fallbackAlt)
      : undefined;
  }

  if (typeof rawPoster !== "object") return undefined;

  const obj = unwrapPosterRecord(rawPoster as Record<string, unknown>);
  const safeUrl = sanitizeEventUrl(obj.url, { allowMailto: false });
  if (!safeUrl) return undefined;

  return {
    url: safeUrl,
    alt: resolvePosterAltText(obj, fallbackAlt),
    mime: getTrimmedString(obj.mime),
    width: getPositiveInteger(obj.width),
    height: getPositiveInteger(obj.height),
  };
}

function resolveActionVariant(
  rawVariant: unknown,
  index: number
): EventActionLinkVariant {
  const candidate = getTrimmedString(rawVariant) as
    | EventActionLinkVariant
    | undefined;
  if (candidate && ALLOWED_ACTION_VARIANTS.has(candidate)) {
    return candidate;
  }
  return index === 0 ? "primary" : "outline";
}

function normalizeSingleActionLink(
  item: unknown,
  index: number
): EventActionLink | null {
  if (!item || typeof item !== "object") return null;
  const rec = item as Record<string, unknown>;
  const label = getTrimmedString(rec.label, 120);
  const safeUrl = sanitizeEventUrl(rec.url);
  if (!label || !safeUrl) return null;

  const external =
    typeof rec.external === "boolean"
      ? rec.external
      : /^https?:\/\//i.test(safeUrl);
  const icon = getTrimmedString(rec.icon, 60);

  return {
    label,
    url: safeUrl,
    variant: resolveActionVariant(rec.variant, index),
    external,
    ...(icon ? { icon } : {}),
  };
}

export function normalizeEventActionLinks(
  rawLinks: unknown
): EventActionLink[] | undefined {
  const parsed = parseJsonIfNeeded(rawLinks);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return undefined;
  }

  const normalized = parsed
    .map((item, idx) => normalizeSingleActionLink(item, idx))
    .filter((link): link is EventActionLink => link !== null);

  return normalized.length > 0 ? normalized : undefined;
}
