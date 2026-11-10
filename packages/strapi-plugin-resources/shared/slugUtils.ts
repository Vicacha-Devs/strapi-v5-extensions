export interface ValidationResult<T> {
  valid: boolean;
  errors: string[];
  data?: T;
}

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FOLDER_PATH_REGEX = /^\/[a-zA-Z0-9/_-]*$/;
export const BCP47_LOCALE_REGEX = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/;
const UNSAFE_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function isSafeObjectKey(key: string): boolean {
  return Boolean(key) && !UNSAFE_OBJECT_KEYS.has(key);
}

export function isValidBcp47Locale(val: unknown): val is string {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  return (
    trimmed.length >= 2 &&
    trimmed.length <= 35 &&
    BCP47_LOCALE_REGEX.test(trimmed)
  );
}

export function toSlug(input: string): string {
  let slug = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "");
  while (slug.endsWith("-")) {
    slug = slug.slice(0, -1);
  }
  return slug.slice(0, 96);
}

/**
 * Computes a deterministic 32-bit FNV-1a hex digest over Unicode code points
 * so non-ASCII titles (`ar`, `ru`, `zh`, etc.) produce stable slugs.
 */
export function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (const ch of input.normalize("NFC")) {
    const cp = ch.codePointAt(0) ?? 0;
    hash ^= cp & 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
    if (cp > 0xff) {
      hash ^= (cp >>> 8) & 0xff;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    if (cp > 0xffff) {
      hash ^= (cp >>> 16) & 0xff;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return hash.toString(16).padStart(8, "0");
}

export function resolveSlug(
  rawSlug: unknown,
  fallbackSource: string,
  transliteration?: unknown
): string {
  const custom =
    typeof rawSlug === "string" ? rawSlug.trim().toLowerCase() : "";
  if (custom) return custom;

  const primary = toSlug(fallbackSource);
  if (primary) return primary;

  const secondaryStr =
    typeof transliteration === "string" ? transliteration.trim() : "";
  const secondary = toSlug(secondaryStr);
  if (secondary) return secondary;

  const trimmedFallback = fallbackSource.trim();
  if (!trimmedFallback) return "";
  return `entry-${fnv1aHex(trimmedFallback)}`;
}

/**
 * Strictly validates and normalizes a Strapi v5 Media Library folder path
 * (`plugin::upload.folder.path`), rejecting `..` and `\`, and normalizing
 * duplicate/trailing slashes.
 */
export function validateMediaFolderPath(
  rawPath: unknown
): ValidationResult<string> {
  if (typeof rawPath !== "string" || !rawPath.trim()) {
    return { valid: false, errors: ["Media folder path is required"] };
  }
  const trimmed = rawPath.trim();
  if (trimmed.includes("..") || trimmed.includes("\\")) {
    return {
      valid: false,
      errors: ["Media folder path must not contain traversal sequences"],
    };
  }
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded.includes("..") || decoded.includes("\\")) {
      return {
        valid: false,
        errors: ["Media folder path must not contain traversal sequences"],
      };
    }
  } catch {
    return {
      valid: false,
      errors: ["Media folder path contains invalid encoding"],
    };
  }

  let normalized = (trimmed.startsWith("/") ? trimmed : `/${trimmed}`).replace(
    /\/+/g,
    "/"
  );
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  if (normalized.length > 160 || !FOLDER_PATH_REGEX.test(normalized)) {
    return {
      valid: false,
      errors: ["Media folder path contains invalid characters"],
    };
  }
  return { valid: true, errors: [], data: normalized };
}
