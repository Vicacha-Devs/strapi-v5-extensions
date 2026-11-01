import type { Core } from "@strapi/strapi";

import {
  CONTENT_TYPE_UID,
  OPTION_UID,
  PLUGIN_ID,
  SINGLE_URL_UID,
} from "../pluginId";
import {
  getComponentsMap,
  getContentTypesMap,
  getDbQuery,
  getDocuments,
  getPluginConfig,
  isVisibleCollectionType,
  persistOptionsRecord,
  readUnifiedSettings,
  toArray,
  writeUnifiedSettings,
} from "./settings";
import type {
  ContentTypeSchema,
  CustomUrlRecord,
  PopulateMap,
  SitemapDefinitionRecord,
  SitemapEntryConfig,
  SitemapOptionRecord,
  SitemapSettingsPayload,
  SitemapSettingsUpdateInput,
  UrlsetEntry,
} from "./types";
import {
  attachHreflangAlternates,
  buildCollectionUrlEntry,
  buildCustomUrlEntries,
  extractAllowedFieldsFromSchema,
  filterExcludedUrls,
  generateSitemapIndexXml,
  generateUrlsetXml,
  getNestedValue,
  isTruthyFlag,
  parseTableReferences,
} from "./xml-builder";

const filterEntriesForSitemapDef = (
  def: SitemapDefinitionRecord,
  allSitemapEntries: SitemapEntryConfig[]
): SitemapEntryConfig[] => {
  const configIds = toArray<number>(def.collectionTypeConfigIds);
  const configIndices = toArray<number>(def.collectionTypeConfigIndices);
  if (configIds.length > 0) {
    const byId = allSitemapEntries.filter((e) =>
      configIds.includes(Number(e.id))
    );
    if (byId.length > 0 || configIndices.length === 0) {
      return byId;
    }
  }
  if (configIndices.length > 0) {
    return configIndices
      .filter((idx) => idx >= 0 && idx < allSitemapEntries.length)
      .map((idx) => allSitemapEntries[idx]);
  }
  return [];
};

const fetchRawI18nLocales = async (strapi: Core.Strapi): Promise<unknown[]> => {
  const fromService = await (
    strapi as unknown as {
      plugin?: (name: string) => {
        service?: (svc: string) => { find?: () => Promise<unknown[]> };
      };
    }
  )
    .plugin?.("i18n")
    ?.service?.("locales")
    ?.find?.();
  if (Array.isArray(fromService) && fromService.length > 0) {
    return fromService;
  }
  const fromDocs = await getDocuments(strapi)<Record<string, unknown>>(
    "plugin::i18n.locale"
  ).findMany();
  if (Array.isArray(fromDocs) && fromDocs.length > 0) {
    return fromDocs;
  }
  return (await getDbQuery(strapi, "plugin::i18n.locale")?.findMany()) ?? [];
};

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  getNestedValue(obj: unknown, path: string): unknown {
    return getNestedValue(obj, path);
  },

  parseTableReferences(pattern: string): { populate?: PopulateMap } {
    return parseTableReferences(pattern);
  },

  generateSitemapIndexXml(
    baseURL: string,
    definitions: SitemapDefinitionRecord[]
  ): string {
    return generateSitemapIndexXml(baseURL, definitions, PLUGIN_ID);
  },

  generateUrlsetXml(sitemap: UrlsetEntry[]): string {
    return generateUrlsetXml(sitemap);
  },

  resolveContentTypeUid(typeName: string): string | undefined {
    const allContentTypes = getContentTypesMap(strapi);
    if (allContentTypes[typeName]) {
      return typeName;
    }
    const visibleMatch = Object.keys(allContentTypes).find(
      (uid) =>
        isVisibleCollectionType(uid, allContentTypes[uid]) &&
        allContentTypes[uid]?.info?.singularName === typeName
    );
    if (visibleMatch) {
      return visibleMatch;
    }
    return Object.keys(allContentTypes).find(
      (uid) => allContentTypes[uid]?.info?.singularName === typeName
    );
  },

  async resolveIndexModeSitemap(
    slug: string | undefined,
    baseURL: string,
    excludedUrls: string[],
    sitemapDefinitions: SitemapDefinitionRecord[],
    allSitemapEntries: SitemapEntryConfig[],
    allCustomURLs: CustomUrlRecord[]
  ): Promise<string> {
    if (slug === undefined) {
      return this.generateSitemapIndexXml(baseURL, sitemapDefinitions);
    }
    const targetSlug = String(slug).trim();
    const def = sitemapDefinitions.find(
      (d) => String(d.name ?? "").trim() === targetSlug
    );
    if (!def) {
      return this.generateUrlsetXml([]);
    }
    const sitemapEntries = filterEntriesForSitemapDef(def, allSitemapEntries);
    const customURLs = def.includeCustomUrls ? allCustomURLs : [];
    return this.buildAndReturnSitemapXml(
      baseURL,
      excludedUrls,
      sitemapEntries,
      customURLs
    );
  },

  async getSitemap(slug?: string): Promise<string> {
    const pluginCfg = getPluginConfig(strapi);
    const baseURLObject =
      await getDocuments(strapi)<SitemapOptionRecord>(OPTION_UID).findFirst();
    if (!baseURLObject && !pluginCfg.hostname) {
      return this.generateUrlsetXml([]);
    }
    const baseURL = baseURLObject?.baseUrl || pluginCfg.hostname || "";
    const excludedUrls = toArray<string>(baseURLObject?.excludedUrls);
    const sitemapDefinitions = toArray<SitemapDefinitionRecord>(
      baseURLObject?.sitemapDefinitions
    );
    const allSitemapEntries =
      (await getDbQuery<SitemapEntryConfig>(strapi, CONTENT_TYPE_UID)?.findMany(
        {
          orderBy: { id: "asc" },
        }
      )) ?? [];
    const allCustomURLs =
      (await getDbQuery<CustomUrlRecord>(strapi, SINGLE_URL_UID)?.findMany()) ??
      [];

    if (slug !== undefined && sitemapDefinitions.length > 0) {
      return this.resolveIndexModeSitemap(
        slug,
        baseURL,
        excludedUrls,
        sitemapDefinitions,
        allSitemapEntries,
        allCustomURLs
      );
    }

    if (
      Boolean(baseURLObject?.useSitemapIndex) &&
      sitemapDefinitions.length > 0
    ) {
      return this.generateSitemapIndexXml(baseURL, sitemapDefinitions);
    }

    return this.buildAndReturnSitemapXml(
      baseURL,
      excludedUrls,
      allSitemapEntries,
      allCustomURLs
    );
  },

  buildPopulateForConfig(
    sitemapEntry: SitemapEntryConfig,
    ctSchema?: ContentTypeSchema
  ): PopulateMap | undefined {
    const thumbField = sitemapEntry.thumbnail
      ? String(sitemapEntry.thumbnail)
      : "";
    const attrDef = thumbField ? ctSchema?.attributes?.[thumbField] : undefined;
    const isValidThumbnail = Boolean(
      thumbField && thumbField !== "-" && (!attrDef || attrDef.type === "media")
    );
    let populate: PopulateMap | undefined = isValidThumbnail
      ? { [thumbField]: true }
      : undefined;

    if (isTruthyFlag(sitemapEntry.populateLinkedModels)) {
      const linkedModels = this.parseTableReferences(sitemapEntry.pattern);
      if (linkedModels.populate) {
        populate = { ...populate, ...linkedModels.populate };
      }
    }
    return populate;
  },

  async fetchEntriesForConfig(
    sitemapEntry: SitemapEntryConfig
  ): Promise<Record<string, unknown>[]> {
    const resolvedUid = this.resolveContentTypeUid(sitemapEntry.type);
    const targetUid =
      resolvedUid ?? `api::${sitemapEntry.type}.${sitemapEntry.type}`;
    const contentTypes = getContentTypesMap(strapi);
    const ctSchema = contentTypes[targetUid];
    if (!ctSchema) {
      return [];
    }
    const populate = this.buildPopulateForConfig(sitemapEntry, ctSchema);
    const isLocalized = ctSchema.pluginOptions?.i18n?.localized !== false;
    const locale =
      isLocalized && sitemapEntry.langcode && sitemapEntry.langcode !== "-"
        ? sitemapEntry.langcode
        : undefined;

    let entries: Record<string, unknown>[];
    try {
      entries =
        (await getDocuments(strapi)<Record<string, unknown>>(
          targetUid
        ).findMany({
          locale,
          status: "published",
          populate,
        })) ?? [];
    } catch {
      entries = [];
    }

    if (entries.length === 0) {
      const fallbackQuery = getDbQuery<Record<string, unknown>>(
        strapi,
        targetUid
      );
      if (fallbackQuery?.findMany) {
        try {
          const where = locale ? { locale } : undefined;
          entries =
            (await fallbackQuery.findMany(where ? { where } : undefined)) ?? [];
        } catch {
          entries = [];
        }
      }
    }

    return entries;
  },

  async buildAndReturnSitemapXml(
    baseURL: string,
    excludedUrls: string[],
    sitemapEntries: SitemapEntryConfig[],
    customURLs: CustomUrlRecord[]
  ): Promise<string> {
    try {
      const pluginCfg = getPluginConfig(strapi);
      const includeHreflang = pluginCfg.includeHreflang !== false;
      const collectionUrls: UrlsetEntry[] = [];

      for (const sitemapEntry of sitemapEntries) {
        const entries = await this.fetchEntriesForConfig(sitemapEntry);
        for (const entry of entries) {
          const built = buildCollectionUrlEntry(baseURL, sitemapEntry, entry);
          if (built) {
            collectionUrls.push(built);
          }
        }
      }

      const enrichedCollectionUrls = attachHreflangAlternates(
        collectionUrls,
        includeHreflang
      );
      const allUrls: UrlsetEntry[] = [
        ...enrichedCollectionUrls,
        ...buildCustomUrlEntries(baseURL, customURLs),
      ];
      const filteredSitemap = filterExcludedUrls(allUrls, excludedUrls);
      return this.generateUrlsetXml(filteredSitemap);
    } catch (error) {
      strapi.log.error("Error fetching entries:", error);
      throw new Error("Failed to fetch entries for types", { cause: error });
    }
  },

  async getContentTypes() {
    try {
      const contentTypes = getContentTypesMap(strapi);
      const collectionTypes = Object.keys(contentTypes)
        .filter((key) => isVisibleCollectionType(key, contentTypes[key]))
        .map((key) => {
          const info = contentTypes[key].info;
          const displayName = String(info.displayName || key).replace(
            /^\d{1,3}\s+/,
            ""
          );
          return {
            uid: key,
            singularName: info.singularName,
            pluralName: info.pluralName,
            displayName,
            info: {
              singularName: info.singularName,
              pluralName: info.pluralName,
              displayName,
            },
          };
        });
      return { collectionTypes };
    } catch (error) {
      strapi.log.error("Error fetching content types:", error);
      throw new Error("Failed to fetch content types", { cause: error });
    }
  },

  async getLocales() {
    try {
      const rawLocales = await fetchRawI18nLocales(strapi);
      const locales = rawLocales
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }
          if (item && typeof item === "object" && "code" in item) {
            return String((item as { code: unknown }).code);
          }
          return "";
        })
        .filter(Boolean);
      return { locales };
    } catch (error) {
      strapi.log.error("Error fetching locales:", error);
      throw new Error("Failed to fetch locales", { cause: error });
    }
  },

  async getAllowedFields(
    contentTypeSingularName: string,
    populateLinkedModels = false
  ) {
    const targetUid = this.resolveContentTypeUid(contentTypeSingularName);
    const contentTypes = getContentTypesMap(strapi);
    const contentType = targetUid ? contentTypes[targetUid] : undefined;
    if (!contentType) {
      return {
        allowedFields: ["id"],
        mediaFields: [],
        slug: contentTypeSingularName,
      };
    }
    const { allowedFields, mediaFields } = extractAllowedFieldsFromSchema(
      contentType,
      getComponentsMap(strapi),
      contentTypes,
      populateLinkedModels
    );
    return {
      allowedFields,
      mediaFields,
      slug: contentType.info.pluralName,
    };
  },

  async getOptions() {
    try {
      const pluginCfg = getPluginConfig(strapi);
      const results =
        await getDocuments(strapi)<SitemapOptionRecord>(OPTION_UID).findFirst();
      return {
        baseUrl: results?.baseUrl || pluginCfg.hostname || "",
        excludedUrls: toArray<string>(results?.excludedUrls),
        useSitemapIndex: Boolean(results?.useSitemapIndex),
        sitemapDefinitions: toArray<SitemapDefinitionRecord>(
          results?.sitemapDefinitions
        ),
      };
    } catch (error) {
      strapi.log.error("Error fetching options:", error);
      throw new Error("Failed to fetch options", { cause: error });
    }
  },

  async updateOptions(
    data: Partial<SitemapOptionRecord> & { baseURL?: string }
  ) {
    try {
      const results =
        await getDocuments(strapi)<SitemapOptionRecord>(OPTION_UID).findFirst();
      const updateData: SitemapOptionRecord = {
        baseUrl: String(data.baseUrl ?? data.baseURL ?? results?.baseUrl ?? ""),
        excludedUrls:
          data.excludedUrls !== undefined
            ? toArray<string>(data.excludedUrls)
            : toArray<string>(results?.excludedUrls),
        useSitemapIndex:
          data.useSitemapIndex !== undefined
            ? Boolean(data.useSitemapIndex)
            : Boolean(results?.useSitemapIndex),
        sitemapDefinitions:
          data.sitemapDefinitions !== undefined
            ? toArray<SitemapDefinitionRecord>(data.sitemapDefinitions)
            : toArray<SitemapDefinitionRecord>(results?.sitemapDefinitions),
      };
      const savedData = await persistOptionsRecord(strapi, results, updateData);
      return { message: "Data saved successfully", savedData };
    } catch (error) {
      strapi.log.error("Error saving data:", error);
      throw new Error("Failed to save data", { cause: error });
    }
  },

  async getSettings(): Promise<SitemapSettingsPayload> {
    try {
      return await readUnifiedSettings(strapi);
    } catch (error) {
      strapi.log.error("Error fetching sitemap settings:", error);
      throw new Error("Failed to fetch sitemap settings", { cause: error });
    }
  },

  async updateSettings(data: SitemapSettingsUpdateInput) {
    try {
      return await writeUnifiedSettings(strapi, data);
    } catch (error) {
      strapi.log.error("Error updating sitemap settings:", error);
      throw new Error("Failed to update sitemap settings", { cause: error });
    }
  },
});

export default {
  service,
};
