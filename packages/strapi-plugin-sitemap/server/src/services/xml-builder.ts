import {
  FORBIDDEN_OBJECT_KEYS as FORBIDDEN_KEYS,
  escapeXml,
} from "@vicacha-devs/plugin-shared";

import type {
  ComponentSchema,
  ContentTypeAttribute,
  ContentTypeSchema,
  CustomUrlRecord,
  HreflangLink,
  PopulateMap,
  PopulateNode,
  SitemapDefinitionRecord,
  SitemapEntryConfig,
  UrlsetEntry,
} from "./types";

export { escapeXml };

const SYSTEM_FIELDS = [
  "createdAt",
  "updatedAt",
  "publishedAt",
  "createdBy",
  "updatedBy",
  "locale",
];
const FALLBACK_IMAGE_URL_KEYS = [
  "imageUrl",
  "coverUrl",
  "photoUrl",
  "coverImageUrl",
  "posterUrl",
  "thumbnailUrl",
] as const;
const FALLBACK_TITLE_KEYS = ["title", "name", "term", "slug"] as const;
const VALID_FREQUENCIES = new Set([
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
]);

const SENSITIVE_FIELD_RE = /password|token|secret|privatekey|apikey|hash/i;

const isSafeKey = (key: string): boolean =>
  Boolean(key) && !FORBIDDEN_KEYS.has(key) && !SENSITIVE_FIELD_RE.test(key);

export const clampPriority = (value: unknown, fallback = 0.5): number => {
  const num = Number(value);
  return Number.isFinite(num)
    ? Math.min(1, Math.max(0, Math.round(num * 10) / 10))
    : fallback;
};

export const sanitizeFrequency = (
  value: unknown,
  fallback = "monthly"
): string => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return VALID_FREQUENCIES.has(normalized) ? normalized : fallback;
};

export const isTruthyFlag = (value: unknown): boolean =>
  value === true || value === "true";

export const getNestedValue = (obj: unknown, path: string): unknown => {
  const segments = path.split(".");
  if (!segments.every(isSafeKey)) return null;
  return segments.reduce<unknown>((current, key) => {
    if (
      current !== null &&
      typeof current === "object" &&
      Object.prototype.hasOwnProperty.call(current, key)
    ) {
      const val = (current as Record<string, unknown>)[key];
      return val !== undefined ? val : null;
    }
    return null;
  }, obj);
};

const ensureNestedPopulate = (node: PopulateNode | undefined): PopulateMap =>
  !node || node === true ? {} : node.populate;

export const insertNestedPath = (
  populate: PopulateMap,
  parts: string[]
): void => {
  if (parts.length === 0 || !parts.every(isSafeKey)) return;
  let current = populate;
  for (let i = 0; i < parts.length - 1; i++) {
    const tableName = parts[i];
    const existing = Object.prototype.hasOwnProperty.call(current, tableName)
      ? current[tableName]
      : undefined;
    const nextPopulate = ensureNestedPopulate(existing);
    current[tableName] = { populate: nextPopulate };
    current = nextPopulate;
  }
  const lastKey = parts[parts.length - 1];
  if (typeof current[lastKey] !== "object" || current[lastKey] === null) {
    current[lastKey] = true;
  }
};

export const parseTableReferences = (
  pattern: string
): { populate?: PopulateMap } => {
  const populate: PopulateMap = {};
  const placeholders = pattern.match(/\[([^[\]]+)]/g) || [];
  for (const placeholder of placeholders) {
    const content = placeholder.replace(/[[\]]/g, "");
    if (content.includes(".")) {
      const parts = content.split(".");
      parts.pop();
      insertNestedPath(populate, parts);
    }
  }
  return Object.keys(populate).length > 0 ? { populate } : {};
};

export const generateSitemapIndexXml = (
  baseURL: string,
  definitions: SitemapDefinitionRecord[],
  pluginId: string
): string => {
  const base = baseURL.replace(/\/$/, "");
  const prefix = `/api/${pluginId}`;
  const sitemaps = definitions
    .filter((d) => String(d.name ?? "").trim() !== "")
    .map((d) => {
      const slug = encodeURIComponent(String(d.name).trim());
      const loc = `${base}${prefix}/sitemap-${slug}.xml`;
      return `<sitemap><loc>${escapeXml(loc)}</loc></sitemap>`;
    })
    .join("");
  const ns = "http://www.sitemaps.org/schemas/sitemap/0.9";
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="${ns}">${sitemaps}</sitemapindex>`;
};

const formatAlternatesXml = (alternates?: HreflangLink[]): string =>
  !alternates || alternates.length === 0
    ? ""
    : alternates
        .map(
          (alt) =>
            `<xhtml:link rel="alternate" hreflang="${escapeXml(alt.lang)}" href="${escapeXml(alt.url)}" />`
        )
        .join("");

const formatUrlEntryXml = (entry: UrlsetEntry): string => {
  const lastmodXml = entry.lastmod
    ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>`
    : "";
  const titleText = escapeXml(entry.thumbnailTitle ?? "");
  const imageLoc = entry.thumbnail ? escapeXml(entry.thumbnail) : "";
  const imageXml = entry.thumbnail
    ? `<image:image><image:loc>${imageLoc}</image:loc><image:title>${titleText}</image:title></image:image>`
    : "";
  const alternatesXml = formatAlternatesXml(entry.alternates);
  const priority = clampPriority(entry.priority);
  const changefreq = sanitizeFrequency(entry.frequency);
  return `
      <url>
        <loc>${escapeXml(entry.url)}</loc>
        <priority>${escapeXml(String(priority))}</priority>
        <changefreq>${escapeXml(changefreq)}</changefreq>
        ${lastmodXml}
        ${imageXml}
        ${alternatesXml}
      </url>`;
};

export const generateUrlsetXml = (sitemap: UrlsetEntry[]): string => {
  const urlSet = sitemap.map(formatUrlEntryXml).join("");
  const ns = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  const imgNs = 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
  const xhtmlNs = 'xmlns:xhtml="http://www.w3.org/1999/xhtml"';
  return `<?xml version="1.0" encoding="UTF-8"?><urlset ${ns} ${imgNs} ${xhtmlNs}>${urlSet}</urlset>`;
};

export const attachHreflangAlternates = (
  entries: UrlsetEntry[],
  includeHreflang = true
): UrlsetEntry[] => {
  if (!includeHreflang) return entries;
  const byDocId = new Map<string, HreflangLink[]>();
  for (const entry of entries) {
    const docId = entry.documentId?.trim();
    const lang = entry.langcode?.trim();
    if (!docId || !lang || lang === "-") continue;
    const existing = byDocId.get(docId) ?? [];
    if (!existing.some((item) => item.lang === lang)) {
      existing.push({ lang, url: entry.url });
      byDocId.set(docId, existing);
    }
  }
  return entries.map((entry) => {
    const docId = entry.documentId?.trim();
    const group = docId ? byDocId.get(docId) : undefined;
    return group && group.length > 0 ? { ...entry, alternates: group } : entry;
  });
};

const resolvePlaceholderValue = (
  entry: Record<string, unknown>,
  key: string,
  fallbackLangcode?: string
): unknown => {
  if (
    key === "locale" &&
    entry.locale === undefined &&
    fallbackLangcode &&
    fallbackLangcode !== "-"
  ) {
    return fallbackLangcode;
  }
  if (key.includes(".")) return getNestedValue(entry, key);
  if (!isSafeKey(key) || !Object.prototype.hasOwnProperty.call(entry, key)) {
    return undefined;
  }
  return entry[key];
};

const isNonEmptyValue = (value: unknown): boolean =>
  value !== null && value !== undefined && String(value).trim() !== "";

const encodePathValue = (value: unknown): string =>
  String(value)
    .trim()
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const interpolatePattern = (
  pattern: string,
  entry: Record<string, unknown>,
  fallbackLangcode?: string
): string | null => {
  let url = pattern;
  const placeholders = pattern.match(/\[([^[\]]+)]/g) || [];
  for (const placeholder of placeholders) {
    const key = placeholder.replace(/[[\]]/g, "");
    const value = resolvePlaceholderValue(entry, key, fallbackLangcode);
    if (isNonEmptyValue(value)) {
      url = url.replace(placeholder, encodePathValue(value));
    } else if (key.includes(".")) {
      url = url.replace(placeholder, "");
    } else {
      return null;
    }
  }
  return url.replace(/\/+/g, "/");
};

const formatFullUrl = (baseURL: string, path: string): string => {
  const normalizedBase = baseURL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const resolveMediaUrlString = (baseURL: string, rawUrl: string): string => {
  const trimmed = rawUrl.trim();
  return /^https?:\/\//i.test(trimmed)
    ? trimmed
    : formatFullUrl(baseURL, trimmed);
};

const findFallbackStringValue = (
  entry: Record<string, unknown>,
  keys: readonly string[]
): string | undefined => {
  for (const key of keys) {
    const val = entry[key];
    if (typeof val === "string" && val.trim() !== "") return val.trim();
  }
  return undefined;
};

const extractThumbnailMedia = (
  baseURL: string,
  entry: Record<string, unknown>,
  thumbnailField?: string
): { url: string; name: string } | undefined => {
  if (!thumbnailField || thumbnailField === "-") return undefined;
  const raw = thumbnailField.includes(".")
    ? getNestedValue(entry, thumbnailField)
    : entry[thumbnailField];
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const mediaObj =
    candidate && typeof candidate === "object"
      ? (candidate as { url?: string; name?: string })
      : undefined;
  const rawMediaUrl =
    mediaObj?.url ?? findFallbackStringValue(entry, FALLBACK_IMAGE_URL_KEYS);
  if (!rawMediaUrl || rawMediaUrl.trim() === "") return undefined;
  return {
    url: resolveMediaUrlString(baseURL, rawMediaUrl),
    name:
      mediaObj?.name?.trim() ||
      findFallbackStringValue(entry, FALLBACK_TITLE_KEYS) ||
      "",
  };
};

export const buildCollectionUrlEntry = (
  baseURL: string,
  config: SitemapEntryConfig,
  entry: Record<string, unknown>
): UrlsetEntry | null => {
  const relativePath = interpolatePattern(
    config.pattern,
    entry,
    config.langcode
  );
  if (relativePath === null) return null;
  const resolvedLang =
    typeof entry.locale === "string" && entry.locale.trim() !== ""
      ? entry.locale
      : config.langcode;
  const sitemapEntry: UrlsetEntry = {
    url: formatFullUrl(baseURL, relativePath),
    priority: config.priority,
    frequency: config.frequency,
    populateLinkedModels: isTruthyFlag(config.populateLinkedModels)
      ? true
      : undefined,
    documentId:
      typeof entry.documentId === "string" ? entry.documentId : undefined,
    langcode: resolvedLang && resolvedLang !== "-" ? resolvedLang : undefined,
  };
  if (isTruthyFlag(config.lastModified) && entry.updatedAt) {
    sitemapEntry.lastmod = String(entry.updatedAt);
  }
  const media = extractThumbnailMedia(baseURL, entry, config.thumbnail);
  if (media) {
    sitemapEntry.thumbnail = media.url;
    sitemapEntry.thumbnailTitle = media.name;
  }
  return sitemapEntry;
};

export const buildCustomUrlEntries = (
  baseURL: string,
  customURLs: CustomUrlRecord[]
): UrlsetEntry[] =>
  customURLs.map((customURL) => ({
    url: formatFullUrl(baseURL, String(customURL.slug ?? customURL.url ?? "")),
    priority: customURL.priority,
    frequency: customURL.frequency,
  }));

const getPathFromUrl = (url: string): string => {
  try {
    return new URL(url).pathname.replace(/\/$/, "") || "/";
  } catch {
    return "/";
  }
};

const normalizeExcludedPath = (rawPath: string): string =>
  (rawPath.startsWith("/") ? rawPath : `/${rawPath}`).replace(/\/$/, "") || "/";

export const filterExcludedUrls = (
  sitemap: UrlsetEntry[],
  excludedUrls: string[]
): UrlsetEntry[] => {
  const normalizedExcluded = excludedUrls
    .map((path) => String(path).trim())
    .filter(Boolean)
    .map(normalizeExcludedPath);
  return sitemap.filter(
    (entry) => !normalizedExcluded.includes(getPathFromUrl(entry.url))
  );
};

const isScalarAttribute = (
  fieldName: string,
  field: ContentTypeAttribute
): boolean =>
  isSafeKey(fieldName) &&
  !SYSTEM_FIELDS.includes(fieldName) &&
  field.private !== true &&
  field.type !== "password" &&
  field.type !== "relation" &&
  field.type !== "component" &&
  field.type !== "media";

const isToOneRelationAttribute = (
  fieldName: string,
  field: ContentTypeAttribute
): boolean =>
  field.type === "relation" &&
  typeof field.relation === "string" &&
  fieldName !== "createdBy" &&
  fieldName !== "updatedBy" &&
  field.relation.endsWith("ToOne");

const getRelationSubFields = (
  fieldName: string,
  field: ContentTypeAttribute,
  contentTypes: Record<string, ContentTypeSchema> | undefined,
  populateLinkedModels: boolean
): string[] => {
  const subFields = [`${fieldName}.id`];
  const targetAttrs =
    populateLinkedModels && field.target
      ? contentTypes?.[field.target]?.attributes
      : undefined;
  for (const [subName, subAttr] of Object.entries(targetAttrs ?? {})) {
    if (isScalarAttribute(subName, subAttr)) {
      subFields.push(`${fieldName}.${subName}`);
    }
  }
  return subFields;
};

const collectComponentSubFields = (
  fieldName: string,
  field: ContentTypeAttribute,
  components: Record<string, ComponentSchema>,
  allowedFields: string[],
  mediaFields: string[]
): void => {
  if (field.type !== "component" || field.repeatable || !field.component) {
    return;
  }
  const subAttrs = components[field.component]?.attributes ?? {};
  for (const [subFieldName, subAttr] of Object.entries(subAttrs)) {
    if (subAttr.type === "media") {
      mediaFields.push(`${fieldName}.${subFieldName}`);
    } else if (isScalarAttribute(subFieldName, subAttr)) {
      allowedFields.push(`${fieldName}.${subFieldName}`);
    }
  }
};

export const extractAllowedFieldsFromSchema = (
  contentType: ContentTypeSchema,
  components: Record<string, ComponentSchema>,
  contentTypes?: Record<string, ContentTypeSchema>,
  populateLinkedModels = false
): { allowedFields: string[]; mediaFields: string[] } => {
  const allowedFields: string[] = [];
  const mediaFields: string[] = [];
  for (const [name, field] of Object.entries(contentType.attributes ?? {})) {
    if (field.type === "media") {
      mediaFields.push(name);
    } else if (isScalarAttribute(name, field)) {
      allowedFields.push(name);
    } else if (isToOneRelationAttribute(name, field)) {
      const relFields = getRelationSubFields(
        name,
        field,
        contentTypes,
        populateLinkedModels
      );
      allowedFields.push(...relFields);
    } else {
      collectComponentSubFields(
        name,
        field,
        components,
        allowedFields,
        mediaFields
      );
    }
  }
  if (!allowedFields.includes("id")) {
    allowedFields.push("id");
  }
  return { allowedFields, mediaFields };
};
