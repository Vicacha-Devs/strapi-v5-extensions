import type { Core } from "@strapi/strapi";

import {
  computeNotesSummaryStats,
  filterNotesList,
  NOTE_CONTENT_TYPE_UID,
  normalizeNoteRecord,
  sanitizeNoteAuthor,
  validateNoteCreatePayload,
  validateNoteUpdatePayload,
  type NoteFilterParams,
  type NoteRecord,
  type NotesSummaryStats,
} from "../../../shared";
import {
  buildDbWhereClause,
  getNotesPluginConfig,
  parseNoteQueryFilters,
  resolvePopulatedAuthor,
  type NotesPluginConfig,
} from "./notesQueryHelpers";

export { getNotesPluginConfig, parseNoteQueryFilters, type NotesPluginConfig };

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

function getDocService(strapi: Core.Strapi) {
  if (typeof strapi?.documents === "function") {
    return strapi.documents(NOTE_CONTENT_TYPE_UID) ?? null;
  }
  return null;
}

function hasExternalStorage(strapi: Core.Strapi): boolean {
  return Boolean(getDbQuery(strapi) || getDocService(strapi));
}

function hasNamedActorDisplay(actor: ReturnType<typeof sanitizeNoteAuthor>) {
  if (!actor) return false;
  return Boolean(
    actor.firstname ||
    actor.lastname ||
    actor.username ||
    (actor.displayName && !actor.displayName.startsWith("#"))
  );
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

const MAX_SQL_INT32 = 2_147_483_647;

function toSqlInt32(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_SQL_INT32
  ) {
    return value;
  }
  if (typeof value === "string" && /^\d{1,10}$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    if (parsed >= 1 && parsed <= MAX_SQL_INT32) {
      return parsed;
    }
  }
  return null;
}

async function queryDbByIdentifier(
  strapi: Core.Strapi,
  cleanStr: string
): Promise<Record<string, unknown> | null> {
  const dbQuery = getDbQuery(strapi);
  if (!dbQuery || typeof dbQuery.findOne !== "function") {
    return null;
  }
  const numericId = toSqlInt32(cleanStr);
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
  const docService = getDocService(strapi);
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

  const docService = getDocService(strapi);
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
    return updated ? mergeUpdatedNoteRecord(existing, updated, actor) : null;
  }

  const docService = getDocService(strapi);
  if (
    docService &&
    typeof docService.update === "function" &&
    existing.documentId
  ) {
    const updated = await docService.update({
      documentId: String(existing.documentId),
      data: updateData,
      populate: ["createdBy", "updatedBy"],
    });
    return updated ? mergeUpdatedNoteRecord(existing, updated, actor) : null;
  }

  return null;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const memoryFallback: Array<Record<string, unknown>> = [];
  let nextMemoryId = 1;

  async function fetchRawNotes(
    filters: NoteFilterParams
  ): Promise<Array<Record<string, unknown>>> {
    const where = buildDbWhereClause(filters);
    const hasWhere = Object.keys(where).length > 0;
    const sortDir = (filters.sort ?? "DESC").toLowerCase() as "asc" | "desc";

    const dbQuery = getDbQuery(strapi);
    if (dbQuery && typeof dbQuery.findMany === "function") {
      const rows = await dbQuery.findMany({
        ...(hasWhere ? { where } : {}),
        populate: ["createdBy", "updatedBy"],
        orderBy: { isPinned: "desc", createdAt: sortDir },
        limit: 1000,
      });
      return Array.isArray(rows) ? rows : [];
    }

    const docService = getDocService(strapi);
    if (docService && typeof docService.findMany === "function") {
      const docs = await docService.findMany({
        ...(hasWhere ? { filters: where } : {}),
        populate: ["createdBy", "updatedBy"],
        sort: { isPinned: "desc", createdAt: sortDir },
        limit: 1000,
      });
      return Array.isArray(docs) ? docs : [];
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

    if (hasExternalStorage(strapi)) {
      return null;
    }

    const fromMemory = memoryFallback.find(
      (item) =>
        String(item.id) === cleanStr || String(item.documentId) === cleanStr
    );
    return fromMemory ?? null;
  }

  return {
    async findWithMeta(rawQuery: Record<string, unknown> = {}): Promise<{
      data: NoteRecord[];
      total: number;
      summary: NotesSummaryStats;
    }> {
      const pluginConfig = getNotesPluginConfig(strapi);
      const filters = parseNoteQueryFilters(rawQuery, pluginConfig);
      const rawList = await fetchRawNotes(filters);
      const normalized = rawList.map((item) => normalizeNoteRecord(item));
      const matched = filterNotesList(normalized, {
        ...filters,
        limit: undefined,
        offset: undefined,
      });
      const summary = computeNotesSummaryStats(matched);
      const data = filterNotesList(matched, {
        sort: filters.sort,
        limit: filters.limit,
        offset: filters.offset,
      });
      return {
        data,
        total: matched.length,
        summary,
      };
    },

    async find(rawQuery: Record<string, unknown> = {}): Promise<NoteRecord[]> {
      const { data } = await this.findWithMeta(rawQuery);
      return data;
    },

    async findOne(identifier: string | number): Promise<NoteRecord | null> {
      const found = await findRawNoteByIdentifier(identifier);
      return found ? normalizeNoteRecord(found) : null;
    },

    async getSummaryStats(
      rawQuery: Record<string, unknown> = {}
    ): Promise<NotesSummaryStats> {
      const { summary } = await this.findWithMeta(rawQuery);
      return summary;
    },

    async create(input: unknown, actorUser?: unknown): Promise<NoteRecord> {
      const validation = validateNoteCreatePayload(input);
      if (!validation.valid) {
        throw new NotesValidationError(validation.errors);
      }

      const pluginConfig = getNotesPluginConfig(strapi);
      const actor = sanitizeNoteAuthor(actorUser);
      const actorName = hasNamedActorDisplay(actor)
        ? (actor?.displayName ?? "")
        : "";
      const nowIso = new Date().toISOString();
      const numericEntityId = toSqlInt32(validation.data.entityId);

      const createData: Record<string, unknown> = {
        title: validation.data.title,
        content: validation.data.content,
        category: validation.data.category,
        isPinned: validation.data.isPinned,
        entitySlug: validation.data.entitySlug,
        entityId: numericEntityId,
        entityDocumentId: validation.data.entityDocumentId,
        entityLocale: pluginConfig.enableLocaleScoping
          ? validation.data.entityLocale
          : null,
        createdByName: actorName,
        updatedByName: actorName,
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

      const pluginConfig = getNotesPluginConfig(strapi);
      const actor = sanitizeNoteAuthor(actorUser);
      const nowIso = new Date().toISOString();
      const updateData: Record<string, unknown> = {
        ...validation.data,
      };
      if ("entityId" in updateData) {
        const rawEntityId = updateData.entityId;
        updateData.entityId = toSqlInt32(rawEntityId);
        if (
          updateData.entityId === null &&
          rawEntityId !== null &&
          rawEntityId !== undefined &&
          !updateData.entityDocumentId &&
          !existing.entityDocumentId
        ) {
          updateData.entityDocumentId = String(rawEntityId);
        }
      }
      if (
        !pluginConfig.enableLocaleScoping &&
        "entityLocale" in validation.data
      ) {
        updateData.entityLocale = null;
      }

      if (hasNamedActorDisplay(actor) && actor?.displayName) {
        updateData.updatedByName = actor.displayName;
      }
      if (actor?.id !== null && actor?.id !== undefined) {
        updateData.updatedBy = actor.id;
      }

      if (hasExternalStorage(strapi)) {
        return persistUpdatedNote(strapi, existing, updateData, actor);
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
        updatedBy: resolvePopulatedAuthor(actor, existing.updatedBy),
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

      const docService = getDocService(strapi);
      if (
        docService &&
        typeof docService.delete === "function" &&
        existing.documentId
      ) {
        await docService.delete({
          documentId: String(existing.documentId),
        });
        return normalized;
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
