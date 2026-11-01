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

export const escapeXml = (value: string): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const isTruthyFlag = (value: unknown): boolean =>
  value === true || value === "true";

export const getNestedValue = (obj: unknown, path: string): unknown => {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current !== null && typeof current === "object") {
      const record = current as Record<string, unknown>;
      return record[key] !== undefined ? record[key] : null;
    }
    return null;
  }, obj);
};

const ensureNestedPopulate = (node: PopulateNode | undefined): PopulateMap => {
  if (!node || node === true) {
    return {};
  }
  return node.populate;
};

const insertNestedPath = (populate: PopulateMap, parts: string[]): void => {
  if (parts.length === 1) {
    populate[parts[0]] = true;
    return;
  }
  let current = populate;
  for (let i = 0; i < parts.length - 1; i++) {
    const tableName = parts[i];
    const nextPopulate = ensureNestedPopulate(current[tableName]);
    current[tableName] = { populate: nextPopulate };
    current = nextPopulate;
  }
  current[parts[parts.length - 1]] = true;
};

export const parseTableReferences = (
  pattern: string
): { populate?: PopulateMap } => {
  const populate: PopulateMap = {};
  const placeholders = pattern.match(/\[([^\]]+)]/g) || [];
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
      const loc = `${base}${prefix}/sitemap-${encodeURIComponent(String(d.name).trim())}.xml`;
      return `<sitemap><loc>${escapeXml(loc)}</loc></sitemap>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemaps}</sitemapindex>`;
};

const formatAlternatesXml = (alternates?: HreflangLink[]): string => {
  if (!alternates || alternates.length === 0) {
    return "";
  }
  return alternates
    .map(
      (alt) =>
        `<xhtml:link rel="alternate" hreflang="${escapeXml(alt.lang)}" href="${escapeXml(alt.url)}" />`
    )
    .join("");
};

const formatUrlEntryXml = (entry: UrlsetEntry): string => {
  const lastmodXml = entry.lastmod
    ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>`
    : "";
  const titleText = escapeXml(entry.thumbnailTitle ?? "");
  const imageXml = entry.thumbnail
    ? `<image:image><image:loc>${escapeXml(entry.thumbnail)}</image:loc><image:title>${titleText}</image:title></image:image>`
    : "";
  const alternatesXml = formatAlternatesXml(entry.alternates);
  return `
      <url>
        <loc>${escapeXml(entry.url)}</loc>
        <priority>${escapeXml(String(entry.priority ?? 0.5))}</priority>
        <changefreq>${escapeXml(String(entry.frequency ?? "monthly"))}</changefreq>
        ${lastmodXml}
        ${imageXml}
        ${alternatesXml}
      </url>`;
};

export const generateUrlsetXml = (sitemap: UrlsetEntry[]): string => {
  const urlSet = sitemap.map(formatUrlEntryXml).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urlSet}</urlset>`;
};

export const attachHreflangAlternates = (
  entries: UrlsetEntry[],
  includeHreflang = true
): UrlsetEntry[] => {
  if (!includeHreflang) {
    return entries;
  }

  const byDocId = new Map<string, HreflangLink[]>();
  for (const entry of entries) {
    const docId = entry.documentId?.trim();
    const lang = entry.langcode?.trim();
    if (!docId || !lang || lang === "-") {
      continue;
    }
    const existing = byDocId.get(docId) ?? [];
    if (!existing.some((item) => item.lang === lang)) {
      existing.push({ lang, url: entry.url });
      byDocId.set(docId, existing);
    }
  }

  return entries.map((entry) => {
    const docId = entry.documentId?.trim();
    if (!docId) {
      return entry;
    }
    const group = byDocId.get(docId);
    if (!group || group.length === 0) {
      return entry;
    }
    return {
      ...entry,
      alternates: group,
    };
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
  if (key.includes(".")) {
    return getNestedValue(entry, key);
  }
  return entry[key];
};

const isNonEmptyValue = (value: unknown): boolean =>
  value !== null && value !== undefined && String(value).trim() !== "";

const interpolatePattern = (
  pattern: string,
  entry: Record<string, unknown>,
  fallbackLangcode?: string
): string | null => {
  let url = pattern;
  const placeholders = pattern.match(/\[([^\]]+)]/g) || [];
  for (const placeholder of placeholders) {
    const key = placeholder.replace(/[[\]]/g, "");
    const value = resolvePlaceholderValue(entry, key, fallbackLangcode);
    if (isNonEmptyValue(value)) {
      url = url.replace(placeholder, String(value));
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
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return formatFullUrl(baseURL, trimmed);
};

const findFallbackStringValue = (
  entry: Record<string, unknown>,
  keys: readonly string[]
): string | undefined => {
  for (const key of keys) {
    const val = entry[key];
    if (typeof val === "string" && val.trim() !== "") {
      return val.trim();
    }
  }
  return undefined;
};

const extractThumbnailMedia = (
  baseURL: string,
  entry: Record<string, unknown>,
  thumbnailField?: string
): { url: string; name: string } | undefined => {
  if (!thumbnailField || thumbnailField === "-") {
    return undefined;
  }
  const raw = entry[thumbnailField];
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const mediaObj =
    candidate && typeof candidate === "object"
      ? (candidate as { url?: string; name?: string })
      : undefined;

  const rawMediaUrl =
    mediaObj?.url ?? findFallbackStringValue(entry, FALLBACK_IMAGE_URL_KEYS);
  if (!rawMediaUrl || rawMediaUrl.trim() === "") {
    return undefined;
  }

  const resolvedUrl = resolveMediaUrlString(baseURL, rawMediaUrl);
  const resolvedTitle =
    mediaObj?.name?.trim() ||
    findFallbackStringValue(entry, FALLBACK_TITLE_KEYS) ||
    "";

  return {
    url: resolvedUrl,
    name: resolvedTitle,
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
  if (relativePath === null) {
    return null;
  }

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
): UrlsetEntry[] => {
  return customURLs.map((customURL) => {
    const rawSlug = String(customURL.slug ?? customURL.url ?? "");
    return {
      url: formatFullUrl(baseURL, rawSlug),
      priority: customURL.priority,
      frequency: customURL.frequency,
    };
  });
};

const getPathFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    return pathname.replace(/\/$/, "") || "/";
  } catch {
    return "/";
  }
};

const normalizeExcludedPath = (rawPath: string): string => {
  const prefixed = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  return prefixed.replace(/\/$/, "") || "/";
};

export const filterExcludedUrls = (
  sitemap: UrlsetEntry[],
  excludedUrls: string[]
): UrlsetEntry[] => {
  const normalizedExcluded = excludedUrls
    .map((path) => String(path).trim())
    .filter(Boolean)
    .map(normalizeExcludedPath);

  return sitemap.filter((entry) => {
    const path = getPathFromUrl(entry.url);
    return !normalizedExcluded.includes(path);
  });
};

const isScalarAttribute = (
  fieldName: string,
  field: ContentTypeAttribute
): boolean => {
  if (SYSTEM_FIELDS.includes(fieldName)) {
    return false;
  }
  return (
    field.type !== "relation" &&
    field.type !== "component" &&
    field.type !== "media"
  );
};

const isToOneRelationAttribute = (
  fieldName: string,
  field: ContentTypeAttribute
): boolean => {
  if (field.type !== "relation" || typeof field.relation !== "string") {
    return false;
  }
  if (fieldName === "createdBy" || fieldName === "updatedBy") {
    return false;
  }
  return field.relation.endsWith("ToOne");
};

const getRelationSubFields = (
  fieldName: string,
  field: ContentTypeAttribute,
  contentTypes: Record<string, ContentTypeSchema> | undefined,
  populateLinkedModels: boolean
): string[] => {
  const subFields = [`${fieldName}.id`];
  if (
    !populateLinkedModels ||
    !field.target ||
    !contentTypes?.[field.target]?.attributes
  ) {
    return subFields;
  }
  const targetAttrs = contentTypes[field.target].attributes ?? {};
  for (const [subName, subAttr] of Object.entries(targetAttrs)) {
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
  const subAttrs = components[field.component]?.attributes;
  if (!subAttrs) {
    return;
  }
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
  const attributes = contentType.attributes ?? {};

  for (const [fieldName, field] of Object.entries(attributes)) {
    if (field.type === "media") {
      mediaFields.push(fieldName);
    } else if (isScalarAttribute(fieldName, field)) {
      allowedFields.push(fieldName);
    } else if (isToOneRelationAttribute(fieldName, field)) {
      allowedFields.push(
        ...getRelationSubFields(
          fieldName,
          field,
          contentTypes,
          populateLinkedModels
        )
      );
    } else {
      collectComponentSubFields(
        fieldName,
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
