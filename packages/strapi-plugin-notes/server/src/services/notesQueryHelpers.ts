import type { Core } from "@strapi/strapi";

import {
  normalizeNoteCategory,
  PLUGIN_ID,
  sanitizeEntityDocumentId,
  sanitizeEntityId,
  sanitizeEntityLocale,
  sanitizeEntitySlug,
  sanitizePlainText,
  type NoteFilterParams,
} from "../../../shared";

export interface NotesPluginConfig {
  defaultSortOrder: "ASC" | "DESC";
  enableLocaleScoping: boolean;
}

function asObjectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function getNotesPluginConfig(strapi?: Core.Strapi): NotesPluginConfig {
  const raw =
    typeof strapi?.config?.get === "function"
      ? strapi.config.get(`plugin::${PLUGIN_ID}`, {})
      : {};
  const configObj = asObjectRecord(raw);
  const defaultSortOrder =
    configObj.defaultSortOrder === "ASC" ? "ASC" : "DESC";
  const enableLocaleScoping =
    typeof configObj.enableLocaleScoping === "boolean"
      ? configObj.enableLocaleScoping
      : true;
  return { defaultSortOrder, enableLocaleScoping };
}

function extractFilterValue(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if ("$eq" in obj) {
      return obj.$eq;
    }
  }
  return value;
}

function pickQueryField(
  rawQuery: Record<string, unknown>,
  filtersObj: Record<string, unknown>,
  key: string
): unknown {
  return (
    rawQuery[key] ??
    extractFilterValue(filtersObj[key]) ??
    rawQuery[`filters[${key}]`] ??
    rawQuery[`filters[${key}][$eq]`]
  );
}

function resolveSortDirection(
  rawQuery: Record<string, unknown>,
  sortObj: Record<string, unknown>,
  defaultSortOrder: "ASC" | "DESC" = "DESC"
): "ASC" | "DESC" {
  const candidates = [
    rawQuery.sort,
    sortObj.createdAt,
    rawQuery["sort[createdAt]"],
  ];
  const rawSort = candidates.find((val) => typeof val === "string");
  if (typeof rawSort !== "string" || !rawSort.trim()) {
    return defaultSortOrder;
  }
  return rawSort.toUpperCase().includes("ASC") ? "ASC" : "DESC";
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

function parseOptionalNonNegativeInt(
  value: unknown,
  minValue: number
): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    const truncated = Math.trunc(value);
    return truncated >= minValue ? truncated : undefined;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isSafeInteger(parsed) && parsed >= minValue
      ? parsed
      : undefined;
  }
  return undefined;
}

function parseCategoryFilter(
  rawCategory: unknown
): NoteFilterParams["category"] {
  if (rawCategory === "all" || !rawCategory) {
    return "all";
  }
  return normalizeNoteCategory(rawCategory);
}

export function parseNoteQueryFilters(
  rawQuery: Record<string, unknown> = {},
  pluginConfig?: Partial<NotesPluginConfig>
): NoteFilterParams {
  const filtersObj = asObjectRecord(rawQuery.filters);
  const sortObj = asObjectRecord(rawQuery.sort);
  const paginationObj = asObjectRecord(rawQuery.pagination);

  const localeScopingEnabled = pluginConfig?.enableLocaleScoping !== false;
  const defaultSortOrder =
    pluginConfig?.defaultSortOrder === "ASC" ? "ASC" : "DESC";

  const rawSlug = pickQueryField(rawQuery, filtersObj, "entitySlug");
  const rawDocId = pickQueryField(rawQuery, filtersObj, "entityDocumentId");
  const rawEntityId = pickQueryField(rawQuery, filtersObj, "entityId");
  const rawLocale = pickQueryField(rawQuery, filtersObj, "entityLocale");
  const rawCategory =
    rawQuery.category ?? extractFilterValue(filtersObj.category);
  const rawPinned =
    rawQuery.isPinned ?? extractFilterValue(filtersObj.isPinned);

  const includeAllLocales =
    !localeScopingEnabled ||
    parseOptionalBoolean(rawQuery.includeAllLocales) === true;

  return {
    entitySlug: sanitizeEntitySlug(rawSlug) || undefined,
    entityDocumentId: sanitizeEntityDocumentId(rawDocId) || undefined,
    entityId: sanitizeEntityId(rawEntityId),
    entityLocale: localeScopingEnabled ? sanitizeEntityLocale(rawLocale) : null,
    includeAllLocales,
    category: parseCategoryFilter(rawCategory),
    isPinned: parseOptionalBoolean(rawPinned),
    search: sanitizePlainText(rawQuery.search ?? rawQuery._q, 160) || undefined,
    sort: resolveSortDirection(rawQuery, sortObj, defaultSortOrder),
    limit: (() => {
      const rawLimit = parseOptionalNonNegativeInt(
        rawQuery.limit ?? paginationObj.limit ?? paginationObj.pageSize,
        1
      );
      return rawLimit !== undefined ? Math.min(rawLimit, 500) : undefined;
    })(),
    offset: parseOptionalNonNegativeInt(
      rawQuery.offset ?? paginationObj.offset ?? paginationObj.start,
      0
    ),
  };
}

export function buildDbWhereClause(
  filters: NoteFilterParams = {}
): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (filters.entitySlug) {
    where.entitySlug = filters.entitySlug;
  }
  if (filters.category && filters.category !== "all") {
    where.category = filters.category;
  }
  if (typeof filters.isPinned === "boolean") {
    where.isPinned = filters.isPinned;
  }
  return where;
}

function hasAuthorIdentityFields(record: Record<string, unknown>): boolean {
  const keys = ["firstname", "lastname", "username", "displayName"];
  return keys.some(
    (key) => typeof record[key] === "string" && record[key].trim().length > 0
  );
}

export function hasPopulatedAuthorIdentity(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const root = value as Record<string, unknown>;
  if (hasAuthorIdentityFields(root)) {
    return true;
  }
  const nestedData = asObjectRecord(root.data);
  if (hasAuthorIdentityFields(nestedData)) {
    return true;
  }
  const nestedAttrs = asObjectRecord(nestedData.attributes ?? root.attributes);
  return hasAuthorIdentityFields(nestedAttrs);
}

export function resolvePopulatedAuthor(
  dbValue: unknown,
  fallbackAuthor: unknown
): unknown {
  if (hasPopulatedAuthorIdentity(dbValue)) {
    return dbValue;
  }
  return fallbackAuthor ?? dbValue;
}
