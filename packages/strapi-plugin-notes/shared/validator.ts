import {
  MAX_ENTITY_ID_LENGTH,
  MAX_ENTITY_SLUG_LENGTH,
  MAX_LOCALE_LENGTH,
  MAX_NOTE_CONTENT_LENGTH,
  MAX_NOTE_TITLE_LENGTH,
  NOTE_CATEGORIES,
} from "./constants";
import type {
  NoteAttributes,
  NoteAuthorMeta,
  NoteCategory,
  NoteRecord,
  NoteUpsertInput,
} from "./types";

const ENTITY_SLUG_PATTERN = /^[a-zA-Z0-9_:.-]{1,160}$/;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const LOCALE_PATTERN = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,4}$/;
const FORBIDDEN_IDENTIFIER_TOKENS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

function isForbiddenIdentifier(value: string): boolean {
  const lower = value.toLowerCase();
  if (FORBIDDEN_IDENTIFIER_TOKENS.has(lower)) return true;
  if (
    value === "." ||
    value === ".." ||
    value.includes("..") ||
    value.startsWith(".") ||
    value.endsWith(".")
  ) {
    return true;
  }
  return lower
    .split(/[:./]+/)
    .some((segment) => FORBIDDEN_IDENTIFIER_TOKENS.has(segment));
}

function toPositiveSafeInt(input: unknown): number | null {
  if (typeof input !== "number" || !Number.isFinite(input)) return null;
  const truncated = Math.trunc(input);
  return Number.isSafeInteger(truncated) && truncated >= 1 ? truncated : null;
}

export function isValidNoteCategory(value: unknown): value is NoteCategory {
  return (
    typeof value === "string" &&
    (NOTE_CATEGORIES as readonly string[]).includes(value)
  );
}

export function normalizeNoteCategory(value: unknown): NoteCategory {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (isValidNoteCategory(normalized)) return normalized;
  }
  return "general";
}

export function sanitizePlainText(input: unknown, maxLength: number): string {
  if (typeof input !== "string") return "";
  // Remove null bytes and normalize line endings while preserving user text
  const cleaned = input.replace(/\0/g, "").replace(/\r\n/g, "\n").trim();
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

export function sanitizeEntitySlug(input: unknown): string {
  if (typeof input !== "string" || input.includes("\0")) return "";
  const cleaned = input.trim();
  if (
    !cleaned ||
    cleaned.length > MAX_ENTITY_SLUG_LENGTH ||
    isForbiddenIdentifier(cleaned) ||
    !ENTITY_SLUG_PATTERN.test(cleaned)
  ) {
    return "";
  }
  return cleaned;
}

export function sanitizeEntityDocumentId(input: unknown): string {
  const numeric = toPositiveSafeInt(input);
  if (numeric !== null) return String(numeric);
  if (typeof input !== "string" || input.includes("\0")) return "";
  const cleaned = input.trim();
  if (
    !cleaned ||
    cleaned.length > MAX_ENTITY_ID_LENGTH ||
    isForbiddenIdentifier(cleaned) ||
    !SAFE_ID_PATTERN.test(cleaned)
  ) {
    return "";
  }
  return cleaned;
}

function parseStringEntityId(input: string): number | string | null {
  if (input.includes("\0")) return null;
  const trimmed = input.trim();
  if (
    !trimmed ||
    trimmed.length > MAX_ENTITY_ID_LENGTH ||
    isForbiddenIdentifier(trimmed)
  ) {
    return null;
  }
  if (/^\d+$/.test(trimmed)) {
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return SAFE_ID_PATTERN.test(trimmed) ? trimmed : null;
}

export function sanitizeEntityId(input: unknown): number | string | null {
  const numeric = toPositiveSafeInt(input);
  if (numeric !== null) {
    return numeric;
  }
  if (typeof input === "string") {
    return parseStringEntityId(input);
  }
  return null;
}

function isWildcardOrInvalidLocale(cleaned: string): boolean {
  if (!cleaned || cleaned === "all" || cleaned === "*") {
    return true;
  }
  return cleaned.length > MAX_LOCALE_LENGTH || isForbiddenIdentifier(cleaned);
}

export function sanitizeEntityLocale(input: unknown): string | null {
  if (typeof input !== "string" || input.includes("\0")) {
    return null;
  }
  const cleaned = input.trim();
  if (isWildcardOrInvalidLocale(cleaned)) {
    return null;
  }
  return LOCALE_PATTERN.test(cleaned) ? cleaned : null;
}

function extractPrimitiveAuthorId(rawUser: unknown): number | string | null {
  const numeric = toPositiveSafeInt(rawUser);
  if (numeric !== null) {
    return numeric;
  }
  if (typeof rawUser === "string" && rawUser.trim()) {
    return sanitizeEntityDocumentId(rawUser) || null;
  }
  return null;
}

function sanitizePrimitiveAuthor(
  rawUser: unknown,
  fallback: string
): NoteAuthorMeta | null {
  const primitiveId = extractPrimitiveAuthorId(rawUser);
  if (!fallback && primitiveId === null) {
    return null;
  }
  return {
    id: primitiveId,
    firstname: "",
    lastname: "",
    username: "",
    displayName: fallback || `#${String(primitiveId)}`,
  };
}

function asPlainObject(
  value: unknown,
  fallback: Record<string, unknown>
): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : fallback;
}

function unwrapAuthorRecord(rawUser: Record<string, unknown>): {
  attrs: Record<string, unknown>;
  id: number | string | null;
} {
  const nestedData = asPlainObject(rawUser.data, rawUser);
  const attrs = asPlainObject(nestedData.attributes, nestedData);
  const id = extractPrimitiveAuthorId(nestedData.id ?? rawUser.id);
  return { attrs, id };
}

/**
 * Sanitizes raw Strapi admin user objects (`createdBy` / `updatedBy`) so only
 * non-sensitive author display fields are exposed (Issue #18 + PII protection).
 */
export function sanitizeNoteAuthor(
  rawUser: unknown,
  fallbackDisplayName?: unknown
): NoteAuthorMeta | null {
  const fallback = sanitizePlainText(fallbackDisplayName, 120);

  if (!rawUser || typeof rawUser !== "object" || Array.isArray(rawUser)) {
    return sanitizePrimitiveAuthor(rawUser, fallback);
  }

  const { attrs, id } = unwrapAuthorRecord(rawUser as Record<string, unknown>);
  const firstname = sanitizePlainText(attrs.firstname, 80);
  const lastname = sanitizePlainText(attrs.lastname, 80);
  const username = sanitizePlainText(attrs.username, 80);
  const explicitDisplayName = sanitizePlainText(attrs.displayName, 120);

  const fullName = [firstname, lastname].filter(Boolean).join(" ").trim();
  const displayName =
    fullName || username || explicitDisplayName || fallback || "";

  if (!displayName && id === null) {
    return null;
  }

  return {
    id,
    firstname,
    lastname,
    username,
    displayName: displayName || `#${String(id)}`,
  };
}

export function formatNoteAuthorDisplay(
  author: NoteAuthorMeta | null | undefined,
  emptyFallback = "-"
): string {
  if (!author) {
    return emptyFallback;
  }
  const fullName = [author.firstname, author.lastname]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fullName) {
    return fullName;
  }
  if (author.username && author.username.trim()) {
    return author.username.trim();
  }
  if (author.displayName && author.displayName.trim()) {
    return author.displayName.trim();
  }
  return emptyFallback;
}

export function formatNoteTimestamp(
  isoString: string | null | undefined,
  locale = "en",
  emptyFallback = "-"
): string {
  if (!isoString || typeof isoString !== "string") {
    return emptyFallback;
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return emptyFallback;
  }
  try {
    return new Intl.DateTimeFormat(locale || "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function extractRecordId(
  root: Record<string, unknown>,
  attrs: Record<string, unknown>
): number | string {
  if (
    (typeof root.id === "number" && Number.isFinite(root.id)) ||
    typeof root.id === "string"
  ) {
    return root.id;
  }
  if (
    (typeof attrs.id === "number" && Number.isFinite(attrs.id)) ||
    typeof attrs.id === "string"
  ) {
    return attrs.id;
  }
  return "";
}

function sanitizeOptionalIsoString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function unwrapRawNoteAttributes(raw: unknown): {
  root: Record<string, unknown>;
  attrs: Record<string, unknown>;
} {
  const root = asPlainObject(raw, {});
  const rawAttrs = asPlainObject(root.attributes, {});
  const attrs = { ...root, ...rawAttrs };
  return { root, attrs };
}

export function normalizeNoteRecord(raw: unknown): NoteRecord {
  const { root, attrs } = unwrapRawNoteAttributes(raw);
  const id = extractRecordId(root, attrs);
  const documentId =
    sanitizeEntityDocumentId(root.documentId ?? attrs.documentId) ||
    String(id || "");

  const entityId = sanitizeEntityId(attrs.entityId);
  const entityDocumentId =
    sanitizeEntityDocumentId(attrs.entityDocumentId) ||
    (entityId !== null ? String(entityId) : "");

  const createdBy = sanitizeNoteAuthor(
    attrs.createdBy,
    attrs.createdByName ?? attrs.authorName
  );
  const updatedBy =
    sanitizeNoteAuthor(attrs.updatedBy, attrs.updatedByName) ?? createdBy;

  const createdAt = sanitizeOptionalIsoString(attrs.createdAt);
  const updatedAt = sanitizeOptionalIsoString(attrs.updatedAt) ?? createdAt;

  const normalizedAttributes: NoteAttributes = {
    title: sanitizePlainText(attrs.title, MAX_NOTE_TITLE_LENGTH),
    content: sanitizePlainText(attrs.content, MAX_NOTE_CONTENT_LENGTH),
    category: normalizeNoteCategory(attrs.category),
    isPinned: Boolean(attrs.isPinned),
    entitySlug: sanitizeEntitySlug(attrs.entitySlug),
    entityId,
    entityDocumentId,
    entityLocale: sanitizeEntityLocale(attrs.entityLocale),
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
  };

  return {
    id,
    documentId,
    ...normalizedAttributes,
    attributes: normalizedAttributes,
  };
}

export function validateNoteCreatePayload(input: unknown): {
  valid: boolean;
  errors: string[];
  data: {
    title: string;
    content: string;
    category: NoteCategory;
    isPinned: boolean;
    entitySlug: string;
    entityId: number | string | null;
    entityDocumentId: string;
    entityLocale: string | null;
  };
} {
  const raw = unwrapDataEnvelope(input);
  const errors: string[] = [];

  const title = sanitizePlainText(raw.title, MAX_NOTE_TITLE_LENGTH);
  const content = sanitizePlainText(raw.content, MAX_NOTE_CONTENT_LENGTH);
  const category = normalizeNoteCategory(raw.category);
  const isPinned = Boolean(raw.isPinned);
  const entitySlug = sanitizeEntitySlug(raw.entitySlug);
  const entityId = sanitizeEntityId(raw.entityId);
  const entityDocumentId =
    sanitizeEntityDocumentId(raw.entityDocumentId) ||
    (entityId !== null ? String(entityId) : "");
  const entityLocale = sanitizeEntityLocale(raw.entityLocale);

  if (!title) {
    errors.push("Note title is required.");
  }
  if (!entitySlug) {
    errors.push("A valid target entitySlug is required.");
  }
  if (!entityDocumentId && entityId === null) {
    errors.push("Either entityDocumentId or entityId is required.");
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      title,
      content,
      category,
      isPinned,
      entitySlug,
      entityId,
      entityDocumentId,
      entityLocale,
    },
  };
}

function applyEntityTargetUpdates(
  raw: Record<string, unknown>,
  hasOwn: (key: string) => boolean,
  data: Partial<NoteUpsertInput>,
  errors: string[]
): void {
  if (hasOwn("entityDocumentId")) {
    const docId = sanitizeEntityDocumentId(raw.entityDocumentId);
    if (docId) data.entityDocumentId = docId;
  }
  if (hasOwn("entityId")) {
    const entityId = sanitizeEntityId(raw.entityId);
    if (entityId !== null) data.entityId = entityId;
  }
  if (hasOwn("entitySlug")) {
    const slug = sanitizeEntitySlug(raw.entitySlug);
    if (slug) {
      data.entitySlug = slug;
    } else if (raw.entitySlug !== undefined && raw.entitySlug !== null) {
      errors.push("A valid target entitySlug is required.");
    }
  }
}

export function validateNoteUpdatePayload(input: unknown): {
  valid: boolean;
  errors: string[];
  data: Partial<NoteUpsertInput>;
} {
  const raw = unwrapDataEnvelope(input);
  const errors: string[] = [];
  const data: Partial<NoteUpsertInput> = {};
  const hasOwn = (key: string) =>
    Object.prototype.hasOwnProperty.call(raw, key);

  if (hasOwn("title")) {
    const title = sanitizePlainText(raw.title, MAX_NOTE_TITLE_LENGTH);
    if (!title) {
      errors.push("Note title cannot be empty.");
    } else {
      data.title = title;
    }
  }
  if (hasOwn("content")) {
    data.content = sanitizePlainText(raw.content, MAX_NOTE_CONTENT_LENGTH);
  }
  if (hasOwn("category")) {
    data.category = normalizeNoteCategory(raw.category);
  }
  if (hasOwn("isPinned")) {
    data.isPinned = Boolean(raw.isPinned);
  }
  if (hasOwn("entityLocale")) {
    data.entityLocale = sanitizeEntityLocale(raw.entityLocale);
  }
  applyEntityTargetUpdates(raw, hasOwn, data, errors);

  if (Object.keys(data).length === 0 && errors.length === 0) {
    errors.push("At least one valid note field must be provided for update.");
  }

  return { valid: errors.length === 0, errors, data };
}

export function unwrapDataEnvelope(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  const obj = input as Record<string, unknown>;
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    return obj.data as Record<string, unknown>;
  }
  if (obj.body && typeof obj.body === "object" && !Array.isArray(obj.body)) {
    return obj.body as Record<string, unknown>;
  }
  return obj;
}
