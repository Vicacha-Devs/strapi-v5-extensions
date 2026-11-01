import type { Core } from "@strapi/strapi";

import {
  computeNotesSummaryStats,
  filterNotesList,
  NOTE_CONTENT_TYPE_UID,
  normalizeNoteCategory,
  normalizeNoteRecord,
  sanitizeEntityDocumentId,
  sanitizeEntityId,
  sanitizeEntityLocale,
  sanitizeEntitySlug,
  sanitizeNoteAuthor,
  sanitizePlainText,
  validateNoteCreatePayload,
  validateNoteUpdatePayload,
  type NoteFilterParams,
  type NoteRecord,
  type NotesSummaryStats,
} from "../../../shared";

export class NotesValidationError extends Error {
  status = 400;
  details: string[];

  constructor(errors: string[]) {
    super(errors.join(" "));
    this.name = "NotesValidationError";
    this.details = errors;
  }
}

function getDbQuery(strapi: Core.Strapi) {
  if (typeof strapi?.db?.query === "function") {
    return strapi.db.query(NOTE_CONTENT_TYPE_UID);
  }
  if (typeof strapi?.query === "function") {
    return strapi.query(NOTE_CONTENT_TYPE_UID);
  }
  return null;
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

function asObjectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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
  sortObj: Record<string, unknown>
): "ASC" | "DESC" {
  const candidates = [
    rawQuery.sort,
    sortObj.createdAt,
    rawQuery["sort[createdAt]"],
  ];
  const rawSort = candidates.find((val) => typeof val === "string") ?? "DESC";
  return String(rawSort).toUpperCase().includes("ASC") ? "ASC" : "DESC";
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
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
  rawQuery: Record<string, unknown> = {}
): NoteFilterParams {
  const filtersObj = asObjectRecord(rawQuery.filters);
  const sortObj = asObjectRecord(rawQuery.sort);

  const rawSlug = pickQueryField(rawQuery, filtersObj, "entitySlug");
  const rawDocId = pickQueryField(rawQuery, filtersObj, "entityDocumentId");
  const rawEntityId = pickQueryField(rawQuery, filtersObj, "entityId");
  const rawLocale = pickQueryField(rawQuery, filtersObj, "entityLocale");
  const rawCategory =
    rawQuery.category ?? extractFilterValue(filtersObj.category);
  const rawPinned =
    rawQuery.isPinned ?? extractFilterValue(filtersObj.isPinned);

  return {
    entitySlug: sanitizeEntitySlug(rawSlug) || undefined,
    entityDocumentId: sanitizeEntityDocumentId(rawDocId) || undefined,
    entityId: sanitizeEntityId(rawEntityId),
    entityLocale: sanitizeEntityLocale(rawLocale),
    includeAllLocales:
      parseOptionalBoolean(rawQuery.includeAllLocales) === true,
    category: parseCategoryFilter(rawCategory),
    isPinned: parseOptionalBoolean(rawPinned),
    search: sanitizePlainText(rawQuery.search ?? rawQuery._q, 160) || undefined,
    sort: resolveSortDirection(rawQuery, sortObj),
  };
}

function resolvePopulatedAuthor(
  dbValue: unknown,
  fallbackAuthor: unknown
): unknown {
  return typeof dbValue === "object" && dbValue !== null
    ? dbValue
    : (fallbackAuthor ?? dbValue);
}

function mergeUpdatedNoteRecord(
  existing: Record<string, unknown>,
  updated: Record<string, unknown>,
  actor: unknown
): NoteRecord {
  return normalizeNoteRecord({
    ...existing,
    ...updated,
    createdBy: resolvePopulatedAuthor(updated.createdBy, existing.createdBy),
    updatedBy: resolvePopulatedAuthor(
      updated.updatedBy,
      actor ?? existing.updatedBy
    ),
  });
}

async function queryDbByIdentifier(
  strapi: Core.Strapi,
  cleanStr: string
): Promise<Record<string, unknown> | null> {
  const dbQuery = getDbQuery(strapi);
  if (!dbQuery || typeof dbQuery.findOne !== "function") {
    return null;
  }
  const numericId = /^\d+$/.test(cleanStr)
    ? Number.parseInt(cleanStr, 10)
    : null;
  if (numericId !== null) {
    const byId = await dbQuery.findOne({
      where: { id: numericId },
      populate: ["createdBy", "updatedBy"],
    });
    if (byId) return byId;
  }
  const byDocId = await dbQuery.findOne({
    where: { documentId: cleanStr },
    populate: ["createdBy", "updatedBy"],
  });
  return byDocId ?? null;
}

async function queryDocServiceByIdentifier(
  strapi: Core.Strapi,
  cleanStr: string
): Promise<Record<string, unknown> | null> {
  if (typeof strapi?.documents !== "function") {
    return null;
  }
  const docService = strapi.documents(NOTE_CONTENT_TYPE_UID);
  if (!docService || typeof docService.findOne !== "function") {
    return null;
  }
  const found = await docService.findOne({
    documentId: cleanStr,
    populate: ["createdBy", "updatedBy"],
  });
  return found ?? null;
}

async function persistCreatedNote(
  strapi: Core.Strapi,
  createData: Record<string, unknown>,
  actor: unknown
): Promise<NoteRecord | null> {
  const dbQuery = getDbQuery(strapi);
  if (dbQuery && typeof dbQuery.create === "function") {
    const created = await dbQuery.create({
      data: createData,
      populate: ["createdBy", "updatedBy"],
    });
    return normalizeNoteRecord({
      ...created,
      createdBy: resolvePopulatedAuthor(created.createdBy, actor),
      updatedBy: resolvePopulatedAuthor(created.updatedBy, actor),
    });
  }

  if (typeof strapi?.documents === "function") {
    const docService = strapi.documents(NOTE_CONTENT_TYPE_UID);
    if (docService && typeof docService.create === "function") {
      const created = await docService.create({
        data: createData,
        populate: ["createdBy", "updatedBy"],
      });
      return normalizeNoteRecord({
        ...created,
        createdBy: resolvePopulatedAuthor(created.createdBy, actor),
        updatedBy: resolvePopulatedAuthor(created.updatedBy, actor),
      });
    }
  }

  return null;
}

async function persistUpdatedNote(
  strapi: Core.Strapi,
  existing: Record<string, unknown>,
  updateData: Record<string, unknown>,
  actor: unknown
): Promise<NoteRecord | null> {
  const dbQuery = getDbQuery(strapi);
  if (
    dbQuery &&
    typeof dbQuery.update === "function" &&
    existing.id !== undefined
  ) {
    const updated = await dbQuery.update({
      where: { id: existing.id },
      data: updateData,
      populate: ["createdBy", "updatedBy"],
    });
    if (updated) {
      return mergeUpdatedNoteRecord(existing, updated, actor);
    }
  }

  if (typeof strapi?.documents === "function" && existing.documentId) {
    const docService = strapi.documents(NOTE_CONTENT_TYPE_UID);
    if (docService && typeof docService.update === "function") {
      const updated = await docService.update({
        documentId: String(existing.documentId),
        data: updateData,
        populate: ["createdBy", "updatedBy"],
      });
      if (updated) {
        return mergeUpdatedNoteRecord(existing, updated, actor);
      }
    }
  }

  return null;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const memoryFallback: Array<Record<string, unknown>> = [];
  let nextMemoryId = 1;

  async function fetchRawNotes(): Promise<Array<Record<string, unknown>>> {
    const dbQuery = getDbQuery(strapi);
    if (dbQuery && typeof dbQuery.findMany === "function") {
      const rows = await dbQuery.findMany({
        populate: ["createdBy", "updatedBy"],
        orderBy: { createdAt: "desc" },
      });
      return Array.isArray(rows) ? rows : [];
    }

    if (typeof strapi?.documents === "function") {
      const docService = strapi.documents(NOTE_CONTENT_TYPE_UID);
      if (docService && typeof docService.findMany === "function") {
        const docs = await docService.findMany({
          populate: ["createdBy", "updatedBy"],
          sort: { createdAt: "desc" },
        });
        return Array.isArray(docs) ? docs : [];
      }
    }

    return [...memoryFallback];
  }

  async function findRawNoteByIdentifier(
    identifier: string | number
  ): Promise<Record<string, unknown> | null> {
    const cleanStr = String(identifier ?? "").trim();
    if (!cleanStr) {
      return null;
    }

    const fromDb = await queryDbByIdentifier(strapi, cleanStr);
    if (fromDb) return fromDb;

    const fromDoc = await queryDocServiceByIdentifier(strapi, cleanStr);
    if (fromDoc) return fromDoc;

    const fromMemory = memoryFallback.find(
      (item) =>
        String(item.id) === cleanStr || String(item.documentId) === cleanStr
    );
    return fromMemory ?? null;
  }

  return {
    async find(rawQuery: Record<string, unknown> = {}): Promise<NoteRecord[]> {
      const filters = parseNoteQueryFilters(rawQuery);
      const rawList = await fetchRawNotes();
      const normalized = rawList.map((item) => normalizeNoteRecord(item));
      return filterNotesList(normalized, filters);
    },

    async findOne(identifier: string | number): Promise<NoteRecord | null> {
      const found = await findRawNoteByIdentifier(identifier);
      return found ? normalizeNoteRecord(found) : null;
    },

    async getSummaryStats(
      rawQuery: Record<string, unknown> = {}
    ): Promise<NotesSummaryStats> {
      const notes = await this.find(rawQuery);
      return computeNotesSummaryStats(notes);
    },

    async create(input: unknown, actorUser?: unknown): Promise<NoteRecord> {
      const validation = validateNoteCreatePayload(input);
      if (!validation.valid) {
        throw new NotesValidationError(validation.errors);
      }

      const actor = sanitizeNoteAuthor(actorUser);
      const nowIso = new Date().toISOString();
      const numericEntityId =
        typeof validation.data.entityId === "number"
          ? validation.data.entityId
          : null;

      const createData: Record<string, unknown> = {
        title: validation.data.title,
        content: validation.data.content,
        category: validation.data.category,
        isPinned: validation.data.isPinned,
        entitySlug: validation.data.entitySlug,
        entityId: numericEntityId,
        entityDocumentId: validation.data.entityDocumentId,
        entityLocale: validation.data.entityLocale,
        createdByName: actor?.displayName ?? "",
        updatedByName: actor?.displayName ?? "",
      };

      if (actor?.id !== null && actor?.id !== undefined) {
        createData.createdBy = actor.id;
        createData.updatedBy = actor.id;
      }

      const persisted = await persistCreatedNote(strapi, createData, actor);
      if (persisted) {
        return persisted;
      }

      const memId = nextMemoryId++;
      const record: Record<string, unknown> = {
        id: memId,
        documentId: `note_${memId}`,
        ...createData,
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: actor,
        updatedBy: actor,
      };
      memoryFallback.push(record);
      return normalizeNoteRecord(record);
    },

    async update(
      identifier: string | number,
      input: unknown,
      actorUser?: unknown
    ): Promise<NoteRecord | null> {
      const validation = validateNoteUpdatePayload(input);
      if (!validation.valid) {
        throw new NotesValidationError(validation.errors);
      }

      const existing = await findRawNoteByIdentifier(identifier);
      if (!existing) {
        return null;
      }

      const actor = sanitizeNoteAuthor(actorUser);
      const nowIso = new Date().toISOString();
      const updateData: Record<string, unknown> = {
        ...validation.data,
      };

      if (actor?.displayName) {
        updateData.updatedByName = actor.displayName;
      }
      if (actor?.id !== null && actor?.id !== undefined) {
        updateData.updatedBy = actor.id;
      }

      const persisted = await persistUpdatedNote(
        strapi,
        existing,
        updateData,
        actor
      );
      if (persisted) {
        return persisted;
      }

      const memIndex = memoryFallback.findIndex(
        (item) =>
          String(item.id) === String(existing.id) ||
          String(item.documentId) === String(existing.documentId)
      );
      const merged: Record<string, unknown> = {
        ...existing,
        ...updateData,
        updatedAt: nowIso,
        updatedBy: actor ?? existing.updatedBy,
      };
      if (memIndex >= 0) {
        memoryFallback[memIndex] = merged;
      }
      return normalizeNoteRecord(merged);
    },

    async delete(identifier: string | number): Promise<NoteRecord | null> {
      const existing = await findRawNoteByIdentifier(identifier);
      if (!existing) {
        return null;
      }
      const normalized = normalizeNoteRecord(existing);

      const dbQuery = getDbQuery(strapi);
      if (
        dbQuery &&
        typeof dbQuery.delete === "function" &&
        existing.id !== undefined
      ) {
        await dbQuery.delete({
          where: { id: existing.id },
        });
        return normalized;
      }

      if (typeof strapi?.documents === "function" && existing.documentId) {
        const docService = strapi.documents(NOTE_CONTENT_TYPE_UID);
        if (docService && typeof docService.delete === "function") {
          await docService.delete({
            documentId: String(existing.documentId),
          });
          return normalized;
        }
      }

      const memIndex = memoryFallback.findIndex(
        (item) =>
          String(item.id) === String(existing.id) ||
          String(item.documentId) === String(existing.documentId)
      );
      if (memIndex >= 0) {
        memoryFallback.splice(memIndex, 1);
      }
      return normalized;
    },
  };
};
