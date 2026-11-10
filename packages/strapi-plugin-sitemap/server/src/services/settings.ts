import type { Core } from "@strapi/strapi";

import {
  CONTENT_TYPE_UID,
  OPTION_UID,
  PLUGIN_ID,
  SINGLE_URL_UID,
} from "../pluginId";
import type {
  CollectionTypeSettingItem,
  ComponentSchema,
  ContentTypeSchema,
  CustomUrlRecord,
  CustomUrlSettingItem,
  DocumentsFn,
  SitemapDefinitionRecord,
  SitemapDefinitionSettingItem,
  SitemapEntryConfig,
  SitemapOptionRecord,
  SitemapPluginConfig,
  SitemapSettingsPayload,
  SitemapSettingsUpdateInput,
} from "./types";
import { clampPriority, isTruthyFlag, sanitizeFrequency } from "./xml-builder";

export const sanitizeBaseUrl = (rawUrl: unknown): string => {
  let trimmed = String(rawUrl ?? "").trim();
  while (trimmed.endsWith("/")) {
    trimmed = trimmed.slice(0, -1);
  }
  if (!trimmed) {
    return "";
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return "";
  }
  return trimmed;
};

export const sanitizeExcludedUrls = (rawUrls: unknown): string[] => {
  const items = toArray<string>(rawUrls)
    .map((u) => String(u ?? "").trim())
    .filter(Boolean)
    .map((u) => (u.startsWith("/") ? u : `/${u}`));
  return Array.from(new Set(items));
};

const EXCLUDED_PLUGIN_PREFIXES = [
  "plugin::upload.",
  "plugin::users-permissions.",
  "plugin::i18n.",
  "plugin::content-releases.",
  "plugin::review-workflows.",
  `plugin::${PLUGIN_ID}.`,
  "plugin::strapi-5-sitemap-plugin.",
];

export interface DbQueryRepo<T = Record<string, unknown>> {
  findMany: (params?: Record<string, unknown>) => Promise<T[]>;
  create?: (params: { data: unknown }) => Promise<T>;
  update?: (params: {
    where: Record<string, unknown>;
    data: unknown;
  }) => Promise<T>;
  delete?: (params: { where: Record<string, unknown> }) => Promise<T>;
  deleteMany?: (params: { where: Record<string, unknown> }) => Promise<unknown>;
}

export const getDocuments = (strapi: Core.Strapi): DocumentsFn =>
  ((uid: string) => strapi.documents(uid as never)) as unknown as DocumentsFn;

export const getDbQuery = <T = Record<string, unknown>>(
  strapi: Core.Strapi,
  uid: string
): DbQueryRepo<T> | undefined =>
  (
    strapi.db as unknown as {
      query?: (targetUid: string) => DbQueryRepo<T>;
    }
  )?.query?.(uid);

export const getContentTypesMap = (
  strapi: Core.Strapi
): Record<string, ContentTypeSchema> =>
  (strapi.contentTypes ?? {}) as unknown as Record<string, ContentTypeSchema>;

export const getComponentsMap = (
  strapi: Core.Strapi
): Record<string, ComponentSchema> =>
  (strapi.components ?? {}) as unknown as Record<string, ComponentSchema>;

export const getPluginConfig = (strapi: Core.Strapi): SitemapPluginConfig => {
  const cfg = (
    strapi.config as unknown as {
      get?: (key: string, defaultVal?: unknown) => SitemapPluginConfig;
    }
  )?.get?.(`plugin::${PLUGIN_ID}`, {});
  return cfg && typeof cfg === "object" ? cfg : {};
};

export const toArray = <T>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

export const isVisibleCollectionType = (
  key: string,
  ct: ContentTypeSchema | undefined
): boolean => {
  if (!ct || ct.kind !== "collectionType") {
    return false;
  }
  if (ct.pluginOptions?.["content-manager"]?.visible === false) {
    return false;
  }
  if (key.startsWith("api::")) {
    return true;
  }
  if (!key.startsWith("plugin::")) {
    return false;
  }
  return !EXCLUDED_PLUGIN_PREFIXES.some((prefix) => key.startsWith(prefix));
};

export const persistOptionsRecord = async (
  strapi: Core.Strapi,
  existing: SitemapOptionRecord | null,
  updateData: SitemapOptionRecord
): Promise<unknown> => {
  const optionQuery = getDbQuery<SitemapOptionRecord>(strapi, OPTION_UID);
  if (!existing) {
    if (optionQuery?.create) {
      return optionQuery.create({ data: updateData });
    }
    return getDocuments(strapi)<SitemapOptionRecord>(OPTION_UID).create({
      data: updateData,
    });
  }
  if (optionQuery?.findMany && optionQuery?.update) {
    const rows = await optionQuery.findMany({ limit: 1 });
    const row = rows[0];
    if (row && row.id != null) {
      return optionQuery.update({
        where: { id: row.id },
        data: updateData,
      });
    }
  }
  return getDocuments(strapi)<SitemapOptionRecord>(OPTION_UID).update({
    documentId: existing.documentId,
    data: updateData,
  });
};

export const normalizeCollectionTypeRow = (
  row: SitemapEntryConfig
): CollectionTypeSettingItem => ({
  ...(row.id != null ? { id: row.id } : {}),
  type: String(row.type ?? ""),
  langcode: String(row.langcode ?? "-"),
  pattern: String(row.pattern ?? ""),
  priority: clampPriority(row.priority),
  frequency: sanitizeFrequency(row.frequency),
  lastModified: isTruthyFlag(row.lastModified),
  thumbnail:
    row.thumbnail && row.thumbnail !== "-" ? String(row.thumbnail) : "",
  populateLinkedModels: isTruthyFlag(row.populateLinkedModels),
});

export const normalizeCustomUrlRow = (
  row: CustomUrlRecord
): CustomUrlSettingItem => ({
  ...(row.id != null ? { id: row.id } : {}),
  url: String(row.slug ?? row.url ?? "").replace(/^\/+/, ""),
  priority: clampPriority(row.priority),
  frequency: sanitizeFrequency(row.frequency),
});

export const normalizeSitemapDefinition = (
  def: SitemapDefinitionRecord,
  allEntries: SitemapEntryConfig[]
): SitemapDefinitionSettingItem => {
  const rawIndices = toArray<number>(def.collectionTypeConfigIndices);
  const rawIds = toArray<number>(def.collectionTypeConfigIds);
  const resolvedIndices =
    rawIndices.length > 0
      ? rawIndices.filter((idx) => idx >= 0 && idx < allEntries.length)
      : rawIds
          .map((id) => allEntries.findIndex((e) => Number(e.id) === Number(id)))
          .filter((idx) => idx >= 0);

  return {
    name: String(def.name ?? "").trim(),
    collectionTypeConfigIndices: Array.from(new Set(resolvedIndices)),
    ...(rawIds.length > 0 ? { collectionTypeConfigIds: rawIds } : {}),
    includeCustomUrls: Boolean(def.includeCustomUrls),
  };
};

const deleteSurplusRows = async <T extends { id?: number | string }>(
  repo: DbQueryRepo<T>,
  existing: T[],
  startIndex: number
) => {
  const surplusIds = existing
    .slice(startIndex)
    .map((row) => row?.id)
    .filter((id): id is number | string => id != null);
  if (surplusIds.length === 0) {
    return;
  }
  if (repo.deleteMany) {
    await repo.deleteMany({ where: { id: { $in: surplusIds } } });
    return;
  }
  if (repo.delete) {
    for (const id of surplusIds) {
      await repo.delete({ where: { id } });
    }
  }
};

export const syncCollectionTypeRows = async (
  strapi: Core.Strapi,
  items: Partial<CollectionTypeSettingItem>[]
): Promise<SitemapEntryConfig[]> => {
  const repo = getDbQuery<SitemapEntryConfig>(strapi, CONTENT_TYPE_UID);
  if (!repo) {
    return [];
  }
  const existing = (await repo.findMany({ orderBy: { id: "asc" } })) ?? [];
  const saved: SitemapEntryConfig[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowData: SitemapEntryConfig = {
      type: String(item.type ?? "").trim(),
      langcode: String(item.langcode || "-").trim(),
      pattern: String(item.pattern ?? "").trim(),
      priority: clampPriority(item.priority),
      frequency: sanitizeFrequency(item.frequency),
      lastModified: isTruthyFlag(item.lastModified) ? "true" : "false",
      thumbnail:
        item.thumbnail && item.thumbnail !== "-" ? String(item.thumbnail) : "",
      populateLinkedModels: isTruthyFlag(item.populateLinkedModels)
        ? "true"
        : "false",
    };

    const existingRow = existing[i];
    if (existingRow && existingRow.id != null && repo.update) {
      const updated = await repo.update({
        where: { id: existingRow.id },
        data: rowData,
      });
      saved.push(updated ?? { id: existingRow.id, ...rowData });
    } else if (repo.create) {
      if (existingRow?.id != null && repo.delete) {
        await repo.delete({ where: { id: existingRow.id } });
      }
      const created = await repo.create({ data: rowData });
      saved.push(created ?? { id: i + 1, ...rowData });
    } else {
      saved.push({ id: existingRow?.id ?? i + 1, ...rowData });
    }
  }

  await deleteSurplusRows(repo, existing, items.length);
  return saved;
};

export const syncCustomUrlRows = async (
  strapi: Core.Strapi,
  items: (Partial<CustomUrlSettingItem> & { slug?: string })[]
): Promise<CustomUrlRecord[]> => {
  const repo = getDbQuery<CustomUrlRecord>(strapi, SINGLE_URL_UID);
  if (!repo) {
    return [];
  }
  const existing = (await repo.findMany({ orderBy: { id: "asc" } })) ?? [];
  const saved: CustomUrlRecord[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowData: CustomUrlRecord = {
      slug: String(item.url ?? item.slug ?? "")
        .trim()
        .replace(/^\/+/, ""),
      priority: clampPriority(item.priority),
      frequency: sanitizeFrequency(item.frequency),
    };

    const existingRow = existing[i];
    if (existingRow && existingRow.id != null && repo.update) {
      const updated = await repo.update({
        where: { id: existingRow.id },
        data: rowData,
      });
      saved.push(updated ?? { id: existingRow.id, ...rowData });
    } else if (repo.create) {
      if (existingRow?.id != null && repo.delete) {
        await repo.delete({ where: { id: existingRow.id } });
      }
      const created = await repo.create({ data: rowData });
      saved.push(created ?? { id: i + 1, ...rowData });
    } else {
      saved.push({ id: existingRow?.id ?? i + 1, ...rowData });
    }
  }

  await deleteSurplusRows(repo, existing, items.length);
  return saved;
};

export const readUnifiedSettings = async (
  strapi: Core.Strapi
): Promise<SitemapSettingsPayload> => {
  const pluginCfg = getPluginConfig(strapi);
  const optionDoc =
    await getDocuments(strapi)<SitemapOptionRecord>(OPTION_UID).findFirst();
  const ctRows =
    (await getDbQuery<SitemapEntryConfig>(strapi, CONTENT_TYPE_UID)?.findMany({
      orderBy: { id: "asc" },
    })) ?? [];
  const customRows =
    (await getDbQuery<CustomUrlRecord>(strapi, SINGLE_URL_UID)?.findMany({
      orderBy: { id: "asc" },
    })) ?? [];

  const rawDefs = toArray<SitemapDefinitionRecord>(
    optionDoc?.sitemapDefinitions
  );
  return {
    baseUrl: sanitizeBaseUrl(optionDoc?.baseUrl || pluginCfg.hostname || ""),
    collectionTypes: ctRows.map(normalizeCollectionTypeRow),
    customURLs: customRows.map(normalizeCustomUrlRow),
    excludedUrls: sanitizeExcludedUrls(optionDoc?.excludedUrls),
    useSitemapIndex: Boolean(optionDoc?.useSitemapIndex),
    sitemaps: rawDefs.map((def) => normalizeSitemapDefinition(def, ctRows)),
  };
};

export const writeUnifiedSettings = async (
  strapi: Core.Strapi,
  data: SitemapSettingsUpdateInput
) => {
  const existingOption =
    await getDocuments(strapi)<SitemapOptionRecord>(OPTION_UID).findFirst();

  const savedCtRows = Array.isArray(data.collectionTypes)
    ? await syncCollectionTypeRows(strapi, data.collectionTypes)
    : ((await getDbQuery<SitemapEntryConfig>(
        strapi,
        CONTENT_TYPE_UID
      )?.findMany({
        orderBy: { id: "asc" },
      })) ?? []);

  if (Array.isArray(data.customURLs)) {
    await syncCustomUrlRows(strapi, data.customURLs);
  }

  const rawSitemaps = Array.isArray(data.sitemaps)
    ? data.sitemaps
    : toArray<SitemapDefinitionRecord>(existingOption?.sitemapDefinitions);

  const normalizedDefinitions: SitemapDefinitionRecord[] = rawSitemaps
    .map((def) => {
      const indices = Array.from(
        new Set(toArray<number>(def.collectionTypeConfigIndices))
      );
      const explicitIds = Array.from(
        new Set(toArray<number>(def.collectionTypeConfigIds))
      );
      const mappedIds =
        indices.length > 0
          ? indices
              .map((idx) => savedCtRows[idx]?.id)
              .filter((id): id is number => typeof id === "number")
          : explicitIds;

      return {
        name: String(def.name ?? "").trim(),
        collectionTypeConfigIndices: indices,
        collectionTypeConfigIds: mappedIds,
        includeCustomUrls: Boolean(def.includeCustomUrls),
      };
    })
    .filter((def) => def.name !== "");

  const resolvedBaseUrl =
    data.baseUrl !== undefined
      ? sanitizeBaseUrl(data.baseUrl)
      : data.baseURL !== undefined
        ? sanitizeBaseUrl(data.baseURL)
        : sanitizeBaseUrl(existingOption?.baseUrl ?? "");

  const updateData: SitemapOptionRecord = {
    baseUrl: resolvedBaseUrl,
    excludedUrls:
      data.excludedUrls !== undefined
        ? sanitizeExcludedUrls(data.excludedUrls)
        : sanitizeExcludedUrls(existingOption?.excludedUrls),
    useSitemapIndex:
      data.useSitemapIndex !== undefined
        ? Boolean(data.useSitemapIndex)
        : Boolean(existingOption?.useSitemapIndex),
    sitemapDefinitions: normalizedDefinitions,
  };

  await persistOptionsRecord(strapi, existingOption, updateData);
  const updatedSettings = await readUnifiedSettings(strapi);
  return {
    message: "Settings updated successfully",
    ...updatedSettings,
  };
};

const settings = ({ strapi }: { strapi: Core.Strapi }) => ({
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
  settings,
};
