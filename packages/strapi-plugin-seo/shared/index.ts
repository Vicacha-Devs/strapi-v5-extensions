export const PLUGIN_ID = 'seo';

export type SeoQualityVerdict = 'good' | 'improvements' | 'bad';

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

export interface ContentTypeSeoItem {
  seo: boolean;
  uid: string;
  kind: string;
  globalId: string;
  attributes: Record<string, any>;
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
      type: 'UPDATE_PONCTUAL';
      value: SeoCheckStatus & { entity: string };
    }
  | {
      type: 'UPDATE_FOR_PREVIEW';
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
