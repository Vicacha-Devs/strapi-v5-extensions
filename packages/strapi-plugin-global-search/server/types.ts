export interface PluginSettings {
  minChars: number;
  debounce: number;
  perTypeLimit: number;
  maxResults: number;
  deep: boolean;
  maxDepth: number;
  includeDrafts: boolean;
  includePluginContentTypes: boolean;
  queryTimeout: number;
  concurrency: number;
  excludedContentTypes: string[];
  excludedFields: string[];
  displayFields: Record<string, string[]>;
}

export type ContentTypeKind = "collectionType" | "singleType";

export interface ContentTypeDescriptor {
  uid: string;
  kind: ContentTypeKind | string;
  displayName: string;
  apiName?: string;
  mainField: string;
  idFields: string[];
  topLevelFields: string[];
  nestedFields: string[];
  localized: boolean;
  draftAndPublish: boolean;
  searchable: boolean;
}

export interface RankedHit {
  tier: number;
  tierLabel: string;
  matchedField: string | null;
  matchedFieldLabel: string | null;
  matchedSnippet: string | null;
  exactCase: boolean;
  valueLength: number;
  contentTypeUid: string;
  contentTypeLabel: string;
  kind: string;
  id: string | number;
  documentId: string | null;
  title: string;
  mainField: string;
  extra: Array<{ field: string; value: unknown }>;
  locale: string | null;
  status: "published" | "draft" | null;
  updatedAt: string | null;
  adminUrl: string;
}

export interface SearchParams {
  query?: string;
  types?: string[];
  locale?: string;
  page?: number;
  pageSize?: number;
  userAbility?: { can: (action: string, subject: string) => boolean } | null;
}

export interface SearchResult {
  query: string;
  results: RankedHit[];
  groups: Array<{
    uid: string;
    label: string;
    kind: string;
    count: number;
    truncated: boolean;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
  meta: {
    searchedTypes: number;
    truncatedTypes: string[];
    failedTypes: Array<{ uid: string; message: string }>;
    minChars: number;
    capped?: boolean;
  };
}

export interface AttributeShape {
  type?: string;
  private?: boolean;
  searchable?: boolean;
  component?: string;
  customField?: string;
  relation?: string;
  repeatable?: boolean;
  components?: string[];
}

export interface ContentTypeShape {
  uid: string;
  kind?: string;
  apiName?: string;
  attributes?: Record<string, AttributeShape>;
  info?: { displayName?: string; singularName?: string };
  pluginOptions?: {
    "i18n"?: { localized?: boolean };
    "content-manager"?: { visible?: boolean };
  };
  options?: { draftAndPublish?: boolean };
}

export interface StrapiPluginService {
  findConfiguration: (contentType: {
    uid: string;
  }) => Promise<{ settings?: { mainField?: string } } | undefined>;
  getSearchableContentTypes: (opts?: {
    force?: boolean;
  }) => Promise<ContentTypeDescriptor[]>;
  getAllContentTypes: () => Promise<ContentTypeDescriptor[]>;
  clearCache: () => void;
  filterReadableTypes: (
    types: ContentTypeDescriptor[],
    userAbility?: { can: (action: string, subject: string) => boolean } | null
  ) => ContentTypeDescriptor[];
  get: () => Promise<PluginSettings>;
  set: (patch?: Partial<PluginSettings>) => Promise<PluginSettings>;
  reset: () => Promise<PluginSettings>;
  search: (params?: SearchParams) => Promise<SearchResult>;
  buildParams: (
    descriptor: ContentTypeDescriptor,
    opts: {
      query: string;
      locale?: string;
      limit: number;
      includeDrafts: boolean;
    }
  ) => Record<string, unknown> | null;
  score: (
    entry: unknown,
    descriptor: ContentTypeDescriptor,
    query: string
  ) => Pick<
    RankedHit,
    | "tier"
    | "tierLabel"
    | "matchedField"
    | "matchedFieldLabel"
    | "matchedSnippet"
    | "exactCase"
    | "valueLength"
  >;
  sort: (hits: RankedHit[]) => RankedHit[];
}

/** Minimal Strapi-like shape used by services */
export interface StrapiLike {
  contentTypes: Record<string, ContentTypeShape>;
  components: Record<string, { attributes?: Record<string, AttributeShape> }>;
  config: {
    get: (key: string, defaultValue?: unknown) => Record<string, unknown>;
  };
  store: (opts: { type: string; name: string }) => {
    get: (opts: {
      key: string;
    }) => Promise<Record<string, unknown> | null | undefined>;
    set: (opts: { key: string; value: unknown }) => Promise<void>;
  };
  log: {
    debug: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
  plugin: (id: string) => { service: (name: string) => StrapiPluginService };
  documents: (uid: string) => {
    findMany: (params: unknown) => Promise<unknown>;
  };
  admin?: {
    services: {
      permission: {
        actionProvider: { registerMany: (actions: unknown[]) => void };
      };
    };
  };
}
