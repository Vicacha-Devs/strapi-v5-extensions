import { parseIsoDateYmd } from "../../../shared/slotTimezone";
import type {
  BookingFilterQuery,
  BookingRecord,
  BookingResource,
  BookingSourceMapping,
  BookingStatus,
} from "../../../shared/types";
import { isSafeObjectKey } from "../errors";
import {
  formatBookingDefaultTitle,
  normalizeStatus,
} from "./reservationHelpers";

function asStr(val: unknown, fallback = ""): string {
  return val !== undefined && val !== null ? String(val) : fallback;
}

function asOptStr(val: unknown): string | undefined {
  return val !== undefined && val !== null && String(val) !== ""
    ? String(val)
    : undefined;
}

function resolveExternalSlotWindow(
  dateStr: string,
  slotLabel: string,
  initialEndIso: string,
  source: BookingSourceMapping
): { startIso: string; endIso: string } {
  if (dateStr.length === 10) {
    const defaultWindows: Record<string, { start: string; end: string }> =
      Object.assign(
        Object.create(null) as Record<string, { start: string; end: string }>,
        {
          morning: { start: "09:00", end: "12:00" },
          afternoon: { start: "14:00", end: "17:00" },
          evening: { start: "18:00", end: "20:00" },
        }
      );
    if (source.slotWindows && typeof source.slotWindows === "object") {
      for (const [wKey, wVal] of Object.entries(source.slotWindows)) {
        if (
          isSafeObjectKey(wKey) &&
          Object.hasOwn(source.slotWindows, wKey) &&
          wVal &&
          typeof wVal.start === "string" &&
          typeof wVal.end === "string"
        ) {
          defaultWindows[wKey.toLowerCase()] = {
            start: wVal.start,
            end: wVal.end,
          };
        }
      }
    }
    const key = slotLabel.toLowerCase();
    const windowSpec =
      slotLabel && isSafeObjectKey(key) && Object.hasOwn(defaultWindows, key)
        ? defaultWindows[key]
        : { start: "09:00", end: "10:00" };
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
  if (!isSafeObjectKey(fieldName) || !Object.hasOwn(row, fieldName)) {
    return undefined;
  }
  const value = row[fieldName];
  return value !== undefined && value !== null && String(value) !== ""
    ? String(value)
    : undefined;
}

function resolveExternalPartyAndStatus(
  row: Record<string, unknown>,
  source: BookingSourceMapping
): { partySize: number; status: BookingStatus } {
  const rawParty = readMappedField(row, source.partySizeField);
  const parsed = rawParty ? Number(rawParty) : 1;
  const partySize = Number.isFinite(parsed)
    ? Math.max(1, Math.trunc(parsed))
    : 1;
  const statusField = source.statusField;
  const status =
    isSafeObjectKey(statusField) && Object.hasOwn(row, statusField)
      ? normalizeStatus(row[statusField])
      : "confirmed";
  return { partySize, status };
}

export function mapExternalSourceRowToBooking(
  row: Record<string, unknown>,
  source: BookingSourceMapping
): BookingRecord | null {
  if (
    !isSafeObjectKey(source.dateField) ||
    !Object.hasOwn(row, source.dateField)
  ) {
    return null;
  }
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
  const customerName =
    readMappedField(row, source.customerNameField) ?? "Guest";
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

export function parseBoundaryMs(
  isoOrDate: string | undefined,
  endOfDay: boolean
): number | null {
  if (!isoOrDate) return null;
  const trimmed = isoOrDate.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    if (!parseIsoDateYmd(trimmed.slice(0, 10))) {
      return null;
    }
  }
  const normalized =
    trimmed.length === 10
      ? `${trimmed}T${endOfDay ? "23:59:59.999Z" : "00:00:00.000Z"}`
      : trimmed;
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
  if (
    query.activeOnly &&
    booking.status !== "pending" &&
    booking.status !== "confirmed"
  ) {
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

  const sorted = allBookings
    .filter(
      (b) =>
        isWithinDateBoundaries(b, fromMs, toMs) &&
        matchesBookingAttributes(b, targetResourceId, query) &&
        matchesBookingSearch(b, searchLower)
    )
    .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));

  if (
    typeof query.limit === "number" &&
    Number.isFinite(query.limit) &&
    query.limit > 0
  ) {
    return sorted.slice(0, Math.trunc(query.limit));
  }
  return sorted;
}
