/**
 * Shared prototype-pollution, plain-object, and Strapi v5 content-type/field
 * isolation guards across @vicacha-devs plugins.
 */

export const FORBIDDEN_OBJECT_KEYS: ReadonlySet<string> = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

export const BLOCKED_CONTENT_TYPE_UID_PREFIXES: readonly string[] =
  Object.freeze([
    "admin::",
    "strapi::",
    "plugin::users-permissions",
    "plugin::content-releases",
    "plugin::review-workflows",
    "plugin::i18n",
    "plugin::upload",
    "plugin::SEO",
    "plugin::seo",
    "plugin::global-search",
    "plugin::sitemap",
    "plugin::bookings",
    "plugin::donations",
    "plugin::inbox",
    "plugin::notes",
    "plugin::broadcasts",
    "plugin::certificates",
  ]);

export const SENSITIVE_FIELD_NAMES: ReadonlySet<string> = new Set([
  "password",
  "resetpasswordtoken",
  "registrationtoken",
  "confirmationtoken",
  "confirmtoken",
  "unsubscribetoken",
  "canceltoken",
  "verificationtoken",
  "nationalidhash",
  "cryptographicsignature",
  "canonicalpayloadhash",
  "accesskey",
  "secret",
  "privatekey",
  "apikey",
  "token",
  "hash",
  "createdby",
  "updatedby",
]);

const SENSITIVE_FIELD_SUBSTRING_RE =
  /password|token|secret|privatekey|apikey|hash/i;

export function isForbiddenObjectKey(key: unknown): boolean {
  return typeof key === "string" && FORBIDDEN_OBJECT_KEYS.has(key);
}

export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

export function stripDangerousKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripDangerousKeys(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (FORBIDDEN_OBJECT_KEYS.has(key)) continue;
      clean[key] = stripDangerousKeys(val);
    }
    return clean as T;
  }
  return value;
}

export function isSensitiveFieldName(fieldName: unknown): boolean {
  if (typeof fieldName !== "string") return true;
  const trimmed = fieldName.trim();
  if (!trimmed || FORBIDDEN_OBJECT_KEYS.has(trimmed)) return true;
  const lower = trimmed.toLowerCase();
  return (
    SENSITIVE_FIELD_NAMES.has(lower) || SENSITIVE_FIELD_SUBSTRING_RE.test(lower)
  );
}

export function isSensitiveContentTypeUid(
  uid: unknown,
  options?: { allowPluginPrefixes?: readonly string[] }
): boolean {
  if (typeof uid !== "string") return true;
  const trimmed = uid.trim();
  if (!trimmed) return true;
  if (options?.allowPluginPrefixes?.some((p) => trimmed.startsWith(p))) {
    return false;
  }
  return BLOCKED_CONTENT_TYPE_UID_PREFIXES.some((prefix) =>
    trimmed.startsWith(prefix)
  );
}
