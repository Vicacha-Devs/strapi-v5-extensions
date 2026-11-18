export const PLUGIN_ID = "seo";

export type SeoQualityVerdict = "good" | "improvements" | "bad";

export interface SeoCheckStatus {
  message: string;
  qualityVerdict: SeoQualityVerdict;
}

export interface SeoChecksConfig {
  metaTitle: boolean;
  metaDescription: boolean;
  metaRobots: boolean;
  openGraph: boolean;
  wordCount: boolean;
  canonicalUrl: boolean;
  keywordDensity: boolean;
  structuredData: boolean;
  alternativeText: boolean;
  lastUpdatedAt: boolean;
}

export const DEFAULT_SEO_CHECKS: SeoChecksConfig = {
  metaTitle: true,
  metaDescription: true,
  metaRobots: true,
  openGraph: true,
  wordCount: true,
  canonicalUrl: true,
  keywordDensity: true,
  structuredData: true,
  alternativeText: true,
  lastUpdatedAt: true,
};

export interface ContentTypeSeoSettings {
  collectionName: string;
  seoChecks: SeoChecksConfig;
}

export type SeoSettingsMap = Record<string, ContentTypeSeoSettings>;

export interface SchemaAttribute {
  type?: string;
  component?: string;
  customField?: string;
  [key: string]: unknown;
}

export interface ContentTypeSchemaInfo {
  uid?: string;
  kind?: string;
  globalId?: string;
  attributes?: Record<string, SchemaAttribute>;
  [key: string]: unknown;
}

export type ComponentSchemasMap = Record<string, ContentTypeSchemaInfo>;

export interface ContentTypeSeoItem {
  seo: boolean;
  uid: string;
  kind: string;
  globalId: string;
  attributes: Record<string, unknown>;
}

export interface ContentTypesResponse {
  collectionTypes: ContentTypeSeoItem[];
  singleTypes: ContentTypeSeoItem[];
  plugins: ContentTypeSeoItem[];
}

export interface OpenGraphImage {
  url?: string;
  alternativeText?: string | null;
  name?: string;
  [key: string]: unknown;
}

export interface OpenGraphData {
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: OpenGraphImage | null;
  ogUrl?: string | null;
  ogType?: string | null;
}

export interface SeoComponentValues {
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaImage?: OpenGraphImage | null;
  openGraph?: OpenGraphData | null;
  keywords?: string | null;
  metaRobots?: string | null;
  metaViewport?: string | null;
  canonicalURL?: string | null;
  structuredData?: Record<string, unknown> | string | null;
}

export interface ContentManagerFormValues {
  seo?: SeoComponentValues | null;
  updatedAt?: string | null;
  [key: string]: unknown;
}

export interface RichTextBlockNode {
  type?: string;
  text?: string;
  image?: {
    alternativeText?: string | null;
    [key: string]: unknown;
  };
  attrs?: {
    alt?: string | null;
    alternativeText?: string | null;
    [key: string]: unknown;
  };
  children?: RichTextBlockNode[];
  content?: RichTextBlockNode[];
  [key: string]: unknown;
}

export interface SeoChecksState {
  preview?: boolean;
  metaTitle?: SeoCheckStatus;
  metaDescription?: SeoCheckStatus;
  wordCount?: SeoCheckStatus;
  keywordsDensity?: SeoCheckStatus;
  openGraph?: SeoCheckStatus;
  canonicalUrl?: SeoCheckStatus;
  structuredData?: SeoCheckStatus;
  metaRobots?: SeoCheckStatus;
  alternativeText?: SeoCheckStatus;
  lastUpdatedAt?: SeoCheckStatus;
  [key: string]: unknown;
}

export type SeoCheckerAction =
  | {
      type: "UPDATE_PONCTUAL";
      value: SeoCheckStatus & { entity: string };
    }
  | {
      type: "UPDATE_FOR_PREVIEW";
      value: SeoChecksState;
    };

export interface EmptyAltOccurrence {
  field: string;
  occurences: number;
}

export interface EmptyAltCount {
  intersections: number;
  richTextAlts: EmptyAltOccurrence[];
  blockTextAlts: EmptyAltOccurrence[];
  altTexts: string[];
}

export interface KeywordDensityEntry {
  count: number;
}

export type KeywordDensityMap = Record<string, KeywordDensityEntry>;

export interface RichTextAnalysisResult {
  wordCount: number;
  keywordsDensity: KeywordDensityMap;
  emptyAltCount: EmptyAltCount;
}

export interface SeoGeneratorContext {
  uid: string;
  doc: Record<string, unknown>;
  locale?: string | null;
  strapi?: unknown;
}

export type SeoGeneratorFn<T = string> = (
  ctx: SeoGeneratorContext
) => Promise<T | null | undefined> | T | null | undefined;

export interface SeoPluginConfig {
  autoCreateComponent?: boolean;
  autoPopulateOnSave?: boolean;
  generateTitle?: SeoGeneratorFn<string>;
  generateDescription?: SeoGeneratorFn<string>;
  generateImage?: SeoGeneratorFn<unknown>;
  generateURL?: SeoGeneratorFn<string>;
}

export interface GeneratedSeoMetadata {
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaImage?: unknown;
  canonicalURL?: string | null;
}

export interface StructuredDataValidationResult {
  valid: boolean;
  hasContext: boolean;
  hasType: boolean;
  reason?: string;
}

/**
 * Finds the root attribute name on a content-type schema that references `shared.seo`
 * (preferring `seo` if present, otherwise returning the first matching attribute).
 */
export function findSeoAttributeName(
  attributes?: Record<string, SchemaAttribute> | null
): string | null {
  if (!attributes || typeof attributes !== "object") return null;
  const seoAttr = attributes.seo;
  if (seoAttr && seoAttr.component === "shared.seo") {
    return "seo";
  }
  for (const [name, attr] of Object.entries(attributes)) {
    if (attr && attr.component === "shared.seo") {
      return name;
    }
  }
  return null;
}

/**
 * Returns true if the comma-separated `metaRobots` string contains a `noindex` directive.
 */
export function hasNoIndexDirective(metaRobots?: string | null): boolean {
  if (typeof metaRobots !== "string" || !metaRobots.trim()) return false;
  return metaRobots
    .split(",")
    .some((part) => part.trim().toLowerCase() === "noindex");
}

/**
 * Validates JSON-LD structured data: ensures valid JSON object/array and checks for `@context` and `@type`.
 */
export function validateStructuredData(
  value: unknown
): StructuredDataValidationResult {
  if (value === null || value === undefined) {
    return { valid: false, hasContext: false, hasType: false, reason: "empty" };
  }

  let parsed: unknown = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return { valid: false, hasContext: false, hasType: false, reason: "empty" };
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return {
        valid: false,
        hasContext: false,
        hasType: false,
        reason: "invalid_json",
      };
    }
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  const objects = items.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
  if (objects.length === 0) {
    return {
      valid: false,
      hasContext: false,
      hasType: false,
      reason: "not_object",
    };
  }

  const hasContext = objects.some(
    (obj) =>
      typeof obj["@context"] === "string" && obj["@context"].trim().length > 0
  );
  const hasType = objects.some(
    (obj) =>
      (typeof obj["@type"] === "string" && obj["@type"].trim().length > 0) ||
      (Array.isArray(obj["@type"]) && obj["@type"].length > 0)
  );

  return {
    valid: hasContext && hasType,
    hasContext,
    hasType,
    ...(!hasContext || !hasType ? { reason: "missing_jsonld_keys" } : {}),
  };
}
