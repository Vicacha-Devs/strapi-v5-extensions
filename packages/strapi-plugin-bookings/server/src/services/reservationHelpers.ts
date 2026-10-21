import crypto from 'node:crypto';
import type {
  BookingFilterQuery,
  BookingRecord,
  BookingResource,
  BookingSourceMapping,
  BookingStatus,
} from '../../../shared/types';

const VALID_STATUSES = new Set<BookingStatus>([
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);

export function normalizeStatus(raw: unknown): BookingStatus {
  const str = String(raw ?? 'pending').toLowerCase().trim() as BookingStatus;
  return VALID_STATUSES.has(str) ? str : 'pending';
}

export function hashCancelToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export function verifyCancelToken(
  token: string | undefined,
  expectedHash: string | undefined
): boolean {
  if (!token || !expectedHash) {
    return false;
  }
  const actualHash = hashCancelToken(token);
  const aBuf = Buffer.from(actualHash, 'utf8');
  const bBuf = Buffer.from(expectedHash, 'utf8');
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function generateRawCancelToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function generateBookingCode(now = new Date()): string {
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BKG-${datePart}-${randomSuffix}`;
}

export function normalizeBookingRecord(
  raw: Record<string, unknown>,
  resourceMap: Map<string, BookingResource>
): BookingRecord {
  const relResource =
    raw.resource && typeof raw.resource === 'object'
      ? (raw.resource as Record<string, unknown>)
      : undefined;

  const resourceDocumentId = String(
    relResource?.documentId ??
      relResource?.id ??
      raw.resourceDocumentId ??
      (typeof raw.resource === 'string' ? raw.resource : '')
  );

  const mappedResource = resourceDocumentId
    ? resourceMap.get(resourceDocumentId)
    : undefined;

  const customerName = String(raw.customerName ?? 'Guest');
  const partySize = Math.max(1, Number(raw.partySize ?? 1));
  const resourceName =
    mappedResource?.name ??
    (relResource?.name ? String(relResource.name) : undefined);

  return {
    documentId: String(raw.documentId ?? raw.id ?? ''),
    bookingCode: String(raw.bookingCode ?? `BKG-${raw.documentId ?? raw.id}`),
    title: String(
      raw.title ||
        `${customerName}${resourceName ? ` — ${resourceName}` : ''}${partySize > 1 ? ` (${partySize})` : ''}`
    ),
    resourceDocumentId: resourceDocumentId || undefined,
    resourceName,
    resourceColor: mappedResource?.color,
    customerName,
    customerEmail: String(raw.customerEmail ?? ''),
    customerPhone: raw.customerPhone ? String(raw.customerPhone) : undefined,
    organization: raw.organization ? String(raw.organization) : undefined,
    startDate: String(raw.startDate ?? ''),
    endDate: String(raw.endDate ?? raw.startDate ?? ''),
    slotLabel: raw.slotLabel ? String(raw.slotLabel) : undefined,
    timezone: String(raw.timezone ?? mappedResource?.timezone ?? 'UTC'),
    partySize,
    status: normalizeStatus(raw.status),
    preferredLanguage: raw.preferredLanguage
      ? String(raw.preferredLanguage)
      : undefined,
    assignedHost: raw.assignedHost ? String(raw.assignedHost) : undefined,
    notes: raw.notes ? String(raw.notes) : undefined,
    internalNotes: raw.internalNotes ? String(raw.internalNotes) : undefined,
    sourceCollection: String(raw.sourceCollection ?? 'plugin::bookings.booking'),
    metadata:
      raw.metadata && typeof raw.metadata === 'object'
        ? (raw.metadata as Record<string, unknown>)
        : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

export function mapExternalSourceRowToBooking(
  row: Record<string, unknown>,
  source: BookingSourceMapping
): BookingRecord | null {
  const rawDate = row[source.dateField];
  if (!rawDate) return null;

  const dateStr = String(rawDate).trim();
  const slotLabel = source.slotLabelField
    ? String(row[source.slotLabelField] ?? '')
    : '';

  let startIso = dateStr;
  let endIso = source.endDateField && row[source.endDateField]
    ? String(row[source.endDateField])
    : '';

  if (dateStr.length === 10) {
    const defaultWindows: Record<string, { start: string; end: string }> = {
      morning: { start: '09:00', end: '12:00' },
      afternoon: { start: '14:00', end: '17:00' },
      evening: { start: '18:00', end: '20:00' },
      ...(source.slotWindows ?? {}),
    };
    const windowSpec = slotLabel && defaultWindows[slotLabel.toLowerCase()]
      ? defaultWindows[slotLabel.toLowerCase()]
      : { start: '09:00', end: '10:00' };
    startIso = `${dateStr}T${windowSpec.start}:00.000Z`;
    if (!endIso) {
      endIso = `${dateStr}T${windowSpec.end}:00.000Z`;
    }
  } else if (!endIso) {
    const parsedStart = Date.parse(startIso);
    endIso = Number.isNaN(parsedStart)
      ? startIso
      : new Date(parsedStart + 3_600_000).toISOString();
  }

  const documentId = String(row.documentId ?? row.id ?? '');
  const customerName = String(row[source.customerNameField] ?? 'Guest');
  const partySize = source.partySizeField
    ? Math.max(1, Number(row[source.partySizeField] ?? 1))
    : 1;

  return {
    documentId,
    bookingCode: `EXT-${documentId.slice(0, 8).toUpperCase()}`,
    title: `${customerName} — ${source.label}${partySize > 1 ? ` (${partySize})` : ''}`,
    resourceDocumentId: source.id,
    resourceName: source.label,
    resourceColor: source.color || '#0d9488',
    customerName,
    customerEmail: source.customerEmailField
      ? String(row[source.customerEmailField] ?? '')
      : '',
    customerPhone:
      source.customerPhoneField && row[source.customerPhoneField]
        ? String(row[source.customerPhoneField])
        : undefined,
    organization:
      source.organizationField && row[source.organizationField]
        ? String(row[source.organizationField])
        : undefined,
    startDate: startIso,
    endDate: endIso,
    slotLabel: slotLabel || undefined,
    timezone: 'UTC',
    partySize,
    status: source.statusField
      ? normalizeStatus(row[source.statusField])
      : 'confirmed',
    preferredLanguage:
      source.languageField && row[source.languageField]
        ? String(row[source.languageField])
        : undefined,
    notes:
      source.notesField && row[source.notesField]
        ? String(row[source.notesField])
        : undefined,
    sourceCollection: source.uid,
  };
}

export function filterAndSortBookings(
  allBookings: BookingRecord[],
  resources: BookingResource[],
  query: BookingFilterQuery
): BookingRecord[] {
  const fromMs = query.from
    ? query.from.length === 10
      ? Date.parse(`${query.from}T00:00:00.000Z`)
      : Date.parse(query.from)
    : null;
  const toMs = query.to
    ? query.to.length === 10
      ? Date.parse(`${query.to}T23:59:59.999Z`)
      : Date.parse(query.to)
    : null;

  let targetResourceId = query.resourceDocumentId;
  if (!targetResourceId && query.resourceSlug) {
    const matched = resources.find((r) => r.slug === query.resourceSlug);
    if (matched) targetResourceId = matched.documentId;
  }

  const searchLower = query.search?.trim().toLowerCase();

  return allBookings
    .filter((b) => {
      if (fromMs !== null && !Number.isNaN(fromMs)) {
        const endMs = Date.parse(b.endDate);
        if (!Number.isNaN(endMs) && endMs < fromMs) return false;
      }
      if (toMs !== null && !Number.isNaN(toMs)) {
        const startMs = Date.parse(b.startDate);
        if (!Number.isNaN(startMs) && startMs > toMs) return false;
      }
      if (targetResourceId && b.resourceDocumentId !== targetResourceId) {
        return false;
      }
      if (query.status && b.status !== query.status) {
        return false;
      }
      if (
        query.preferredLanguage &&
        b.preferredLanguage?.toLowerCase() !==
          query.preferredLanguage.toLowerCase()
      ) {
        return false;
      }
      if (query.source && b.sourceCollection !== query.source) {
        return false;
      }
      if (searchLower) {
        const haystack = [
          b.bookingCode,
          b.customerName,
          b.customerEmail,
          b.organization,
          b.assignedHost,
          b.resourceName,
          b.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    })
    .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
}
