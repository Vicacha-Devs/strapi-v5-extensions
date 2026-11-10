import crypto from "node:crypto";

import {
  normalizeTimeZone,
  parseIsoDateYmd,
} from "../../../shared/slotTimezone";
import type {
  BookingRecord,
  BookingResource,
  BookingStatus,
  BookingsPluginSettings,
  CreateReservationInput,
  RescheduleBookingInput,
} from "../../../shared/types";
import { BookingValidationError, sanitizePlainRecord } from "../errors";
import {
  filterAndSortBookings,
  mapExternalSourceRowToBooking,
  parseBoundaryMs,
} from "./reservationSources";

export {
  filterAndSortBookings,
  mapExternalSourceRowToBooking,
  parseBoundaryMs,
};

export const VALID_BOOKING_STATUSES = new Set<BookingStatus>([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export function isValidBookingStatus(raw: unknown): raw is BookingStatus {
  return (
    typeof raw === "string" &&
    VALID_BOOKING_STATUSES.has(raw.trim() as BookingStatus)
  );
}

export function parseStrictBookingStatus(raw: unknown): BookingStatus {
  if (typeof raw !== "string") {
    throw new BookingValidationError("A valid booking status is required");
  }
  const normalized = raw.trim().toLowerCase() as BookingStatus;
  if (!VALID_BOOKING_STATUSES.has(normalized)) {
    throw new BookingValidationError(`Invalid booking status: '${raw}'`);
  }
  return normalized;
}

export function normalizeStatus(raw: unknown): BookingStatus {
  const str = String(raw ?? "pending")
    .toLowerCase()
    .trim() as BookingStatus;
  return VALID_BOOKING_STATUSES.has(str) ? str : "pending";
}

export function hashCancelToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function verifyCancelToken(
  token: string | undefined,
  expectedHash: string | undefined
): boolean {
  if (
    typeof token !== "string" ||
    !token.trim() ||
    typeof expectedHash !== "string" ||
    !expectedHash.trim()
  ) {
    return false;
  }
  const actualHash = hashCancelToken(token);
  const aBuf = Buffer.from(actualHash, "utf8");
  const bBuf = Buffer.from(expectedHash, "utf8");
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function verifySecretToken(
  provided: string | undefined,
  expected: string | undefined
): boolean {
  if (
    typeof provided !== "string" ||
    !provided.trim() ||
    typeof expected !== "string" ||
    !expected.trim()
  ) {
    return false;
  }
  const aBuf = Buffer.from(hashCancelToken(provided.trim()), "utf8");
  const bBuf = Buffer.from(hashCancelToken(expected.trim()), "utf8");
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

export function computeOpaqueBookingUid(booking: BookingRecord): string {
  const seed = `ical-feed:${booking.documentId}:${booking.bookingCode}:${booking.startDate}`;
  return crypto
    .createHash("sha256")
    .update(seed, "utf8")
    .digest("hex")
    .slice(0, 24);
}

export function generateRawCancelToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function generateBookingCode(now = new Date()): string {
  const safeNow =
    now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const datePart = safeNow.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `BKG-${datePart}-${randomSuffix}`;
}

function asOptStr(val: unknown): string | undefined {
  return val !== undefined && val !== null && String(val) !== ""
    ? String(val)
    : undefined;
}

function asObjRecord(val: unknown): Record<string, unknown> | undefined {
  return val && typeof val === "object" && !Array.isArray(val)
    ? (val as Record<string, unknown>)
    : undefined;
}

function asStr(val: unknown, fallback = ""): string {
  return val !== undefined && val !== null ? String(val) : fallback;
}

function resolveBookingResourceRef(
  raw: Record<string, unknown>,
  resourceMap: Map<string, BookingResource>
) {
  const relResource = asObjRecord(raw.resource);
  const rawResourceStr = typeof raw.resource === "string" ? raw.resource : "";
  const resourceDocumentId = String(
    relResource?.documentId ??
      relResource?.id ??
      raw.resourceDocumentId ??
      rawResourceStr
  );
  const mappedResource = resourceDocumentId
    ? resourceMap.get(resourceDocumentId)
    : undefined;
  const resourceName = mappedResource?.name ?? asOptStr(relResource?.name);
  return {
    resourceDocumentId: resourceDocumentId || undefined,
    mappedResource,
    resourceName,
  };
}

export function formatBookingDefaultTitle(
  customerName: string,
  resourceName: string | undefined,
  partySize: number
): string {
  const resourceSuffix = resourceName ? ` — ${resourceName}` : "";
  const sizeSuffix = partySize > 1 ? ` (${partySize})` : "";
  return `${customerName}${resourceSuffix}${sizeSuffix}`;
}

function normalizeBookingOptionals(raw: Record<string, unknown>) {
  return {
    customerPhone: asOptStr(raw.customerPhone),
    organization: asOptStr(raw.organization),
    slotLabel: asOptStr(raw.slotLabel),
    preferredLanguage: asOptStr(raw.preferredLanguage),
    assignedHost: asOptStr(raw.assignedHost),
    notes: asOptStr(raw.notes),
    internalNotes: asOptStr(raw.internalNotes),
    metadata: sanitizePlainRecord(raw.metadata),
    createdAt: asOptStr(raw.createdAt),
    updatedAt: asOptStr(raw.updatedAt),
  };
}

export function normalizeBookingRecord(
  raw: Record<string, unknown>,
  resourceMap: Map<string, BookingResource>
): BookingRecord {
  const { resourceDocumentId, mappedResource, resourceName } =
    resolveBookingResourceRef(raw, resourceMap);
  const customerName = asStr(raw.customerName, "Guest");
  const rawParty = Number(raw.partySize ?? 1);
  const partySize = Number.isFinite(rawParty)
    ? Math.max(1, Math.trunc(rawParty))
    : 1;
  const documentId = asStr(raw.documentId ?? raw.id);
  const startDate = asStr(raw.startDate);
  const defaultTitle = formatBookingDefaultTitle(
    customerName,
    resourceName,
    partySize
  );

  return {
    documentId,
    bookingCode: asStr(raw.bookingCode, `BKG-${documentId}`),
    title: asOptStr(raw.title) ?? defaultTitle,
    resourceDocumentId,
    resourceName,
    resourceColor: mappedResource?.color,
    customerName,
    customerEmail: asStr(raw.customerEmail),
    startDate,
    endDate: asStr(raw.endDate, startDate),
    timezone: normalizeTimeZone(
      asStr(raw.timezone ?? mappedResource?.timezone, "UTC")
    ),
    partySize,
    status: normalizeStatus(raw.status),
    sourceCollection: asStr(raw.sourceCollection, "plugin::bookings.booking"),
    ...normalizeBookingOptionals(raw),
  };
}

export function trimOrUndefined(val: unknown): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  return trimmed ? trimmed : undefined;
}

export function buildBookingCreatePayload(params: {
  bookingCode: string;
  customerName: string;
  customerEmail: string;
  startMs: number;
  endMs: number;
  partySize: number;
  status: BookingStatus;
  assignedHost: string | undefined;
  cancelTokenHash: string;
  resource: BookingResource | null;
  settings: BookingsPluginSettings;
  input: CreateReservationInput;
}): Record<string, unknown> {
  const {
    bookingCode,
    customerName,
    customerEmail,
    startMs,
    endMs,
    partySize,
    status,
    assignedHost,
    cancelTokenHash,
    resource,
    settings,
    input,
  } = params;

  return {
    bookingCode,
    title: formatBookingDefaultTitle(customerName, resource?.name, partySize),
    resource: resource?.documentId ?? undefined,
    customerName,
    customerEmail,
    customerPhone: trimOrUndefined(input.customerPhone),
    organization: trimOrUndefined(input.organization),
    startDate: new Date(startMs).toISOString(),
    endDate: new Date(endMs).toISOString(),
    slotLabel: trimOrUndefined(input.slotLabel),
    timezone: normalizeTimeZone(
      asStr(
        input.timezone || resource?.timezone || settings.defaultTimezone,
        "UTC"
      )
    ),
    partySize,
    status,
    preferredLanguage: trimOrUndefined(input.preferredLanguage),
    assignedHost,
    notes: trimOrUndefined(input.notes),
    cancelTokenHash,
    sourceCollection: "plugin::bookings.booking",
    metadata: sanitizePlainRecord(input.metadata),
  };
}

const CAPACITY_WINDOW_PAD_MS = 86_400_000;

export function buildCapacityWindowQuery(
  resourceDocumentId: string | undefined,
  startMs: number,
  endMs: number
) {
  return {
    resourceDocumentId,
    from: new Date(startMs - CAPACITY_WINDOW_PAD_MS).toISOString(),
    to: new Date(endMs + CAPACITY_WINDOW_PAD_MS).toISOString(),
    activeOnly: true,
    limit: 1000,
  };
}

function assertNonRolloverDatePrefix(raw: string, errorMessage: string): void {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    if (!parseIsoDateYmd(trimmed.slice(0, 10))) {
      throw new BookingValidationError(errorMessage);
    }
  }
}

export function computeRescheduleWindow(
  targetRaw: Record<string, unknown>,
  input: RescheduleBookingInput
): { newStartMs: number; newEndMs: number } {
  if (typeof input.newStartDate !== "string" || !input.newStartDate.trim()) {
    throw new BookingValidationError("A valid newStartDate is required");
  }
  assertNonRolloverDatePrefix(
    input.newStartDate,
    "A valid newStartDate is required"
  );
  const newStartMs = Date.parse(input.newStartDate);
  if (Number.isNaN(newStartMs)) {
    throw new BookingValidationError("A valid newStartDate is required");
  }
  const oldStartMs = Date.parse(String(targetRaw.startDate));
  const oldEndMs = Date.parse(String(targetRaw.endDate));
  const hasValidOldRange =
    !Number.isNaN(oldStartMs) &&
    !Number.isNaN(oldEndMs) &&
    oldEndMs > oldStartMs;
  const defaultDurationMs = hasValidOldRange
    ? oldEndMs - oldStartMs
    : 3_600_000;
  if (typeof input.newEndDate === "string" && input.newEndDate.trim()) {
    assertNonRolloverDatePrefix(
      input.newEndDate,
      "newEndDate must be a valid ISO date"
    );
  }
  const newEndMs = input.newEndDate
    ? Date.parse(input.newEndDate)
    : newStartMs + defaultDurationMs;

  if (Number.isNaN(newEndMs) || newEndMs <= newStartMs) {
    throw new BookingValidationError("newEndDate must be after newStartDate");
  }
  return { newStartMs, newEndMs };
}
