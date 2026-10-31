import { NOTE_CATEGORIES } from './constants';

export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

export interface NoteAuthorMeta {
  id: number | string | null;
  firstname: string;
  lastname: string;
  username: string;
  displayName: string;
}

export interface NoteAttributes {
  title: string;
  content: string;
  category: NoteCategory;
  isPinned: boolean;
  entitySlug: string;
  entityId: number | string | null;
  entityDocumentId: string;
  entityLocale: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: NoteAuthorMeta | null;
  updatedBy: NoteAuthorMeta | null;
}

export interface NoteRecord extends NoteAttributes {
  id: number | string;
  documentId: string;
  /**
   * Backward-compatible mirror of note attributes for callers written for
   * Strapi v4 `strapi-plugin-notes` (`note.attributes.*`).
   */
  attributes: NoteAttributes;
}

export interface NoteUpsertInput {
  title?: string;
  content?: string;
  category?: NoteCategory;
  isPinned?: boolean;
  entitySlug?: string;
  entityId?: number | string | null;
  entityDocumentId?: string | null;
  entityLocale?: string | null;
}

export interface NoteFilterParams {
  entitySlug?: string;
  entityId?: number | string | null;
  entityDocumentId?: string;
  entityLocale?: string | null;
  includeAllLocales?: boolean;
  category?: NoteCategory | 'all';
  isPinned?: boolean;
  search?: string;
  sort?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface NotesSummaryStats {
  total: number;
  pinned: number;
  byCategory: Record<NoteCategory, number>;
  entitySlugs: string[];
}
