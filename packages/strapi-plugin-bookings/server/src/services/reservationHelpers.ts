import crypto from "node:crypto";

import type {
  BookingFilterQuery,
  BookingRecord,
  BookingResource,
  BookingSourceMapping,
  BookingStatus,
  BookingsPluginSettings,
  CreateReservationInput,
  RescheduleBookingInput,
} from "../../../shared/types";

const VALID_STATUSES = new Set<BookingStatus>([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export function normalizeStatus(raw: unknown): BookingStatus {
  const str = String(raw ?? "pending")
    .toLowerCase()
    .trim() as BookingStatus;
  return VALID_STATUSES.has(str) ? str : "pending";
}

export function hashCancelToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function verifyCancelToken(
  token: string | undefined,
  expectedHash: string | undefined
): boolean {
  if (!token || !expectedHash) {
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

export function generateRawCancelToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function generateBookingCode(now = new Date()): string {
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `BKG-${datePart}-${randomSuffix}`;
}

function asOptStr(val: unknown): string | undefined {
  return val ? String(val) : undefined;
}

function asObjRecord(val: unknown): Record<string, unknown> | undefined {
  return val && typeof val === "object"
    ? (val as Record<string, unknown>)
    : undefined;
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

function asStr(val: unknown, fallback = ""): string {
  return val !== undefined && val !== null ? String(val) : fallback;
}

function formatBookingDefaultTitle(
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
    metadata: asObjRecord(raw.metadata),
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
  const partySize = Math.max(1, Number(raw.partySize ?? 1));
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
    timezone: asStr(raw.timezone ?? mappedResource?.timezone, "UTC"),
    partySize,
    status: normalizeStatus(raw.status),
    sourceCollection: asStr(raw.sourceCollection, "plugin::bookings.booking"),
    ...normalizeBookingOptionals(raw),
  };
}

function resolveExternalSlotWindow(
  dateStr: string,
  slotLabel: string,
  initialEndIso: string,
  source: BookingSourceMapping
): { startIso: string; endIso: string } {
  if (dateStr.length === 10) {
    const defaultWindows: Record<string, { start: string; end: string }> = {
      morning: { start: "09:00", end: "12:00" },
      afternoon: { start: "14:00", end: "17:00" },
      evening: { start: "18:00", end: "20:00" },
      ...source.slotWindows,
    };
    const key = slotLabel.toLowerCase();
    const windowSpec = (slotLabel && defaultWindows[key]) || {
      start: "09:00",
      end: "10:00",
    };
    return {
      startIso: `${dateStr}T${windowSpec.start}:00.000Z`,
      endIso: initialEndIso || `${dateStr}T${windowSpec.end}:00.000Z`,
    };
  }
  if (!initialEndIso) {
    const parsedStart = Date.parse(dateStr);
    const endIso = Number.isNaN(parsedStart)
      ? dateStr
      : new Date(parsedStart + 3_600_000).toISOString();
    return { startIso: dateStr, endIso };
  }
  return { startIso: dateStr, endIso: initialEndIso };
}

function readMappedField(
  row: Record<string, unknown>,
  fieldName?: string
): string | undefined {
  return fieldName && row[fieldName] ? String(row[fieldName]) : undefined;
}

function resolveExternalPartyAndStatus(
  row: Record<string, unknown>,
  source: BookingSourceMapping
): { partySize: number; status: BookingStatus } {
  const rawParty = readMappedField(row, source.partySizeField);
  const partySize = rawParty ? Math.max(1, Number(rawParty)) : 1;
  const status = source.statusField
    ? normalizeStatus(row[source.statusField])
    : "confirmed";
  return { partySize, status };
}

export function mapExternalSourceRowToBooking(
  row: Record<string, unknown>,
  source: BookingSourceMapping
): BookingRecord | null {
  const rawDate = row[source.dateField];
  if (!rawDate) return null;

  const dateStr = String(rawDate).trim();
  const slotLabel = readMappedField(row, source.slotLabelField) ?? "";
  const initialEndIso = readMappedField(row, source.endDateField) ?? "";
  const { startIso, endIso } = resolveExternalSlotWindow(
    dateStr,
    slotLabel,
    initialEndIso,
    source
  );

  const documentId = asStr(row.documentId ?? row.id);
  const customerName = asStr(row[source.customerNameField], "Guest");
  const { partySize, status } = resolveExternalPartyAndStatus(row, source);

  return {
    documentId,
    bookingCode: `EXT-${documentId.slice(0, 8).toUpperCase()}`,
    title: formatBookingDefaultTitle(customerName, source.label, partySize),
    resourceDocumentId: source.id,
    resourceName: source.label,
    resourceColor: asStr(source.color, "#0d9488"),
    customerName,
    customerEmail: readMappedField(row, source.customerEmailField) ?? "",
    customerPhone: readMappedField(row, source.customerPhoneField),
    organization: readMappedField(row, source.organizationField),
    startDate: startIso,
    endDate: endIso,
    slotLabel: asOptStr(slotLabel),
    timezone: "UTC",
    partySize,
    status,
    preferredLanguage: readMappedField(row, source.languageField),
    notes: readMappedField(row, source.notesField),
    sourceCollection: source.uid,
  };
}

function parseBoundaryMs(
  isoOrDate: string | undefined,
  endOfDay: boolean
): number | null {
  if (!isoOrDate) return null;
  const normalized =
    isoOrDate.length === 10
      ? `${isoOrDate}T${endOfDay ? "23:59:59.999Z" : "00:00:00.000Z"}`
      : isoOrDate;
  const ms = Date.parse(normalized);
  return Number.isNaN(ms) ? null : ms;
}

function isWithinDateBoundaries(
  booking: BookingRecord,
  fromMs: number | null,
  toMs: number | null
): boolean {
  if (fromMs !== null) {
    const endMs = Date.parse(booking.endDate);
    if (!Number.isNaN(endMs) && endMs < fromMs) return false;
  }
  if (toMs !== null) {
    const startMs = Date.parse(booking.startDate);
    if (!Number.isNaN(startMs) && startMs > toMs) return false;
  }
  return true;
}

function matchesBookingAttributes(
  booking: BookingRecord,
  targetResourceId: string | undefined,
  query: BookingFilterQuery
): boolean {
  if (targetResourceId && booking.resourceDocumentId !== targetResourceId) {
    return false;
  }
  if (query.status && booking.status !== query.status) {
    return false;
  }
  if (
    query.preferredLanguage &&
    booking.preferredLanguage?.toLowerCase() !==
      query.preferredLanguage.toLowerCase()
  ) {
    return false;
  }
  return !query.source || booking.sourceCollection === query.source;
}

function matchesBookingSearch(
  booking: BookingRecord,
  searchLower: string | undefined
): boolean {
  if (!searchLower) return true;
  const haystack = [
    booking.bookingCode,
    booking.customerName,
    booking.customerEmail,
    booking.organization,
    booking.assignedHost,
    booking.resourceName,
    booking.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(searchLower);
}

export function filterAndSortBookings(
  allBookings: BookingRecord[],
  resources: BookingResource[],
  query: BookingFilterQuery
): BookingRecord[] {
  const fromMs = parseBoundaryMs(query.from, false);
  const toMs = parseBoundaryMs(query.to, true);

  const matchedResource =
    !query.resourceDocumentId && query.resourceSlug
      ? resources.find((r) => r.slug === query.resourceSlug)
      : undefined;
  const targetResourceId =
    query.resourceDocumentId ?? matchedResource?.documentId;
  const searchLower = query.search?.trim().toLowerCase();

  return allBookings
    .filter(
      (b) =>
        isWithinDateBoundaries(b, fromMs, toMs) &&
        matchesBookingAttributes(b, targetResourceId, query) &&
        matchesBookingSearch(b, searchLower)
    )
    .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function trimOrUndefined(val: string | undefined): string | undefined {
  const trimmed = val?.trim();
  return trimmed ? trimmed : undefined;
}

export function validateReservationCustomerAndStart(
  input: CreateReservationInput
) {
  const customerName = input.customerName?.trim();
  const customerEmail = input.customerEmail?.trim().toLowerCase();
  if (!customerName) {
    throw new Error("customerName is required");
  }
  if (!customerEmail || !EMAIL_REGEX.test(customerEmail)) {
    throw new Error("A valid customerEmail is required");
  }
  const startMs = Date.parse(input.startDate);
  if (Number.isNaN(startMs)) {
    throw new Error("A valid ISO startDate is required");
  }
  return { customerName, customerEmail, startMs };
}

export function computeReservationTimingAndParty(
  input: CreateReservationInput,
  startMs: number,
  resource: BookingResource | null,
  settings: BookingsPluginSettings
) {
  const durationMins =
    resource?.slotDurationMinutes ?? settings.defaultSlotDurationMinutes ?? 60;
  const endMs = input.endDate
    ? Date.parse(input.endDate)
    : startMs + durationMins * 60_000;

  if (Number.isNaN(endMs) || endMs <= startMs) {
    throw new Error("endDate must be after startDate");
  }

  const partySize = Math.max(1, Number(input.partySize ?? 1));
  const maxParty = resource?.maxPartySize ?? 50;
  if (partySize > maxParty) {
    throw new Error(
      `Requested partySize (${partySize}) exceeds maximum allowed (${maxParty})`
    );
  }
  return { endMs, partySize };
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
    resourceDocumentId: resource?.documentId ?? undefined,
    customerName,
    customerEmail,
    customerPhone: trimOrUndefined(input.customerPhone),
    organization: trimOrUndefined(input.organization),
    startDate: new Date(startMs).toISOString(),
    endDate: new Date(endMs).toISOString(),
    slotLabel: trimOrUndefined(input.slotLabel),
    timezone: asStr(
      input.timezone || resource?.timezone || settings.defaultTimezone,
      "UTC"
    ),
    partySize,
    status,
    preferredLanguage: trimOrUndefined(input.preferredLanguage),
    assignedHost,
    notes: trimOrUndefined(input.notes),
    cancelTokenHash,
    sourceCollection: "plugin::bookings.booking",
    metadata: input.metadata ?? undefined,
  };
}

export function computeRescheduleWindow(
  targetRaw: Record<string, unknown>,
  input: RescheduleBookingInput
): { newStartMs: number; newEndMs: number } {
  const newStartMs = Date.parse(input.newStartDate);
  if (Number.isNaN(newStartMs)) {
    throw new Error("A valid newStartDate is required");
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
  const newEndMs = input.newEndDate
    ? Date.parse(input.newEndDate)
    : newStartMs + defaultDurationMs;

  if (Number.isNaN(newEndMs) || newEndMs <= newStartMs) {
    throw new Error("newEndDate must be after newStartDate");
  }
  return { newStartMs, newEndMs };
}
