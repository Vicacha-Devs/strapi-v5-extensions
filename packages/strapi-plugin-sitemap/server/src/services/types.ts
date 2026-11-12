export interface PopulateObject {
  populate: PopulateMap;
}

export type PopulateNode = boolean | PopulateObject;
export type PopulateMap = Record<string, PopulateNode>;

export interface SitemapPluginConfig {
  hostname?: string;
  includeHreflang?: boolean;
}

export interface SitemapDefinitionRecord {
  name?: string;
  collectionTypeConfigIds?: number[];
  collectionTypeConfigIndices?: number[];
  includeCustomUrls?: boolean;
}

export interface SitemapOptionRecord {
  id?: number | string;
  documentId?: string;
  baseUrl?: string;
  excludedUrls?: string[];
  useSitemapIndex?: boolean;
  sitemapDefinitions?: SitemapDefinitionRecord[];
}

export interface SitemapEntryConfig {
  id?: number | string;
  type: string;
  langcode: string;
  pattern: string;
  priority: number | string;
  frequency: string;
  lastModified?: string | boolean;
  thumbnail?: string;
  populateLinkedModels?: string | boolean;
}

export interface CustomUrlRecord {
  id?: number | string;
  slug?: string;
  url?: string;
  priority?: number | string;
  frequency?: string;
}

export interface CollectionTypeSettingItem {
  id?: number | string;
  type: string;
  langcode: string;
  pattern: string;
  priority: number;
  frequency: string;
  lastModified: boolean;
  thumbnail: string;
  populateLinkedModels: boolean;
}

export interface CustomUrlSettingItem {
  id?: number | string;
  url: string;
  priority: number;
  frequency: string;
}

export interface SitemapDefinitionSettingItem {
  name: string;
  collectionTypeConfigIndices: number[];
  collectionTypeConfigIds?: number[];
  includeCustomUrls: boolean;
}

export interface SitemapSettingsPayload {
  baseUrl: string;
  collectionTypes: CollectionTypeSettingItem[];
  customURLs: CustomUrlSettingItem[];
  excludedUrls: string[];
  useSitemapIndex: boolean;
  sitemaps: SitemapDefinitionSettingItem[];
}

export interface SitemapSettingsUpdateInput {
  baseUrl?: string;
  baseURL?: string;
  collectionTypes?: Partial<CollectionTypeSettingItem>[];
  customURLs?: (Partial<CustomUrlSettingItem> & { slug?: string })[];
  excludedUrls?: string[];
  useSitemapIndex?: boolean;
  sitemaps?: Partial<SitemapDefinitionSettingItem>[];
}

export interface HreflangLink {
  lang: string;
  url: string;
}

export interface UrlsetEntry {
  url: string;
  priority?: number | string;
  frequency?: string;
  lastmod?: string;
  thumbnail?: string;
  thumbnailTitle?: string;
  populateLinkedModels?: boolean;
  documentId?: string;
  langcode?: string;
  alternates?: HreflangLink[];
}

export interface ContentTypeAttribute {
  type?: string;
  relation?: string;
  target?: string;
  repeatable?: boolean;
  component?: string;
  private?: boolean;
}

export interface ContentTypeSchema {
  kind?: string;
  info: {
    singularName: string;
    pluralName: string;
    displayName: string;
  };
  options?: {
    draftAndPublish?: boolean;
  };
  pluginOptions?: {
    "content-manager"?: {
      visible?: boolean;
    };
    "i18n"?: {
      localized?: boolean;
    };
  };
  attributes?: Record<string, ContentTypeAttribute>;
}

export interface ComponentSchema {
  attributes?: Record<string, ContentTypeAttribute>;
}

export interface DocumentRepository<T = Record<string, unknown>> {
  findFirst: () => Promise<T | null>;
  findMany: (params?: Record<string, unknown>) => Promise<T[]>;
  create: (params: { data: unknown }) => Promise<T>;
  update: (params: { documentId?: string; data: unknown }) => Promise<T>;
}

export type DocumentsFn = <T = Record<string, unknown>>(
  uid: string
) => DocumentRepository<T>;
