import type {
  NoteCategory,
  NoteFilterParams,
  NoteRecord,
  NotesSummaryStats,
} from "./types";
import {
  normalizeNoteCategory,
  sanitizeEntityDocumentId,
  sanitizeEntityId,
  sanitizeEntityLocale,
  sanitizeEntitySlug,
  sanitizePlainText,
} from "./validator";

export function sortNotesPinnedFirst(
  notes: readonly NoteRecord[],
  direction: "ASC" | "DESC" = "DESC"
): NoteRecord[] {
  return [...notes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    const timeA = a.createdAt ? Date.parse(a.createdAt) : 0;
    const timeB = b.createdAt ? Date.parse(b.createdAt) : 0;
    if (timeA !== timeB && !Number.isNaN(timeA) && !Number.isNaN(timeB)) {
      return direction === "ASC" ? timeA - timeB : timeB - timeA;
    }
    return String(a.id).localeCompare(String(b.id));
  });
}

function matchesEntityIdentifier(
  note: NoteRecord,
  docIdFilter: string,
  entityIdFilter: number | string | null
): boolean {
  if (!docIdFilter && entityIdFilter === null) {
    return true;
  }
  const noteIdStr = note.entityId !== null ? String(note.entityId) : "";
  if (docIdFilter) {
    if (note.entityDocumentId === docIdFilter || noteIdStr === docIdFilter) {
      return true;
    }
  }
  if (entityIdFilter !== null) {
    const filterStr = String(entityIdFilter);
    if (noteIdStr === filterStr || note.entityDocumentId === filterStr) {
      return true;
    }
  }
  return false;
}

function matchesLocaleFilter(
  note: NoteRecord,
  localeFilter: string | null,
  includeAllLocales?: boolean
): boolean {
  if (!localeFilter || includeAllLocales) {
    return true;
  }
  return !note.entityLocale || note.entityLocale === localeFilter;
}

function matchesSearchFilter(note: NoteRecord, searchFilter: string): boolean {
  if (!searchFilter) {
    return true;
  }
  const haystack = [
    note.title,
    note.content,
    note.entitySlug,
    note.createdBy?.displayName ?? "",
    note.updatedBy?.displayName ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(searchFilter);
}

interface NormalizedNoteFilters {
  slugFilter: string;
  docIdFilter: string;
  entityIdFilter: number | string | null;
  localeFilter: string | null;
  includeAllLocales?: boolean;
  categoryFilter: NoteCategory | null;
  isPinned?: boolean;
  searchFilter: string;
}

function matchesAllNoteFilters(
  note: NoteRecord,
  filters: NormalizedNoteFilters
): boolean {
  if (filters.slugFilter && note.entitySlug !== filters.slugFilter) {
    return false;
  }
  if (
    !matchesEntityIdentifier(note, filters.docIdFilter, filters.entityIdFilter)
  ) {
    return false;
  }
  if (
    !matchesLocaleFilter(note, filters.localeFilter, filters.includeAllLocales)
  ) {
    return false;
  }
  if (filters.categoryFilter && note.category !== filters.categoryFilter) {
    return false;
  }
  if (
    typeof filters.isPinned === "boolean" &&
    note.isPinned !== filters.isPinned
  ) {
    return false;
  }
  return matchesSearchFilter(note, filters.searchFilter);
}

export function filterNotesList(
  notes: readonly NoteRecord[],
  params: NoteFilterParams = {}
): NoteRecord[] {
  const filters: NormalizedNoteFilters = {
    slugFilter: params.entitySlug ? sanitizeEntitySlug(params.entitySlug) : "",
    docIdFilter: params.entityDocumentId
      ? sanitizeEntityDocumentId(params.entityDocumentId)
      : "",
    entityIdFilter:
      params.entityId !== undefined && params.entityId !== null
        ? sanitizeEntityId(params.entityId)
        : null,
    localeFilter: sanitizeEntityLocale(params.entityLocale),
    includeAllLocales: params.includeAllLocales,
    categoryFilter:
      params.category && params.category !== "all"
        ? normalizeNoteCategory(params.category)
        : null,
    isPinned: params.isPinned,
    searchFilter: sanitizePlainText(params.search, 160).toLowerCase(),
  };

  const filtered = notes.filter((note) => matchesAllNoteFilters(note, filters));
  return sortNotesPinnedFirst(filtered, params.sort ?? "DESC");
}

export function computeNotesSummaryStats(
  notes: readonly NoteRecord[]
): NotesSummaryStats {
  const byCategory: Record<NoteCategory, number> = {
    general: 0,
    todo: 0,
    blocker: 0,
    idea: 0,
  };
  let pinned = 0;
  const slugSet = new Set<string>();

  for (const note of notes) {
    if (note.isPinned) {
      pinned += 1;
    }
    const cat = normalizeNoteCategory(note.category);
    byCategory[cat] += 1;
    if (note.entitySlug) {
      slugSet.add(note.entitySlug);
    }
  }

  return {
    total: notes.length,
    pinned,
    byCategory,
    entitySlugs: Array.from(slugSet).sort(),
  };
}

export function buildContentManagerNoteLink(
  note: Pick<
    NoteRecord,
    "entitySlug" | "entityDocumentId" | "entityId" | "entityLocale"
  >
): string | null {
  const slug = sanitizeEntitySlug(note.entitySlug);
  const targetId =
    sanitizeEntityDocumentId(note.entityDocumentId) ||
    (note.entityId !== null && note.entityId !== undefined
      ? sanitizeEntityDocumentId(String(note.entityId))
      : "");
  if (!slug || !targetId) {
    return null;
  }
  const basePath = `/content-manager/collection-types/${encodeURIComponent(
    slug
  )}/${encodeURIComponent(targetId)}`;
  const locale = sanitizeEntityLocale(note.entityLocale);
  if (locale) {
    return `${basePath}?plugins[i18n][locale]=${encodeURIComponent(locale)}`;
  }
  return basePath;
}
