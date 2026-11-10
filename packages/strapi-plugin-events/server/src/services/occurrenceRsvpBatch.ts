import type { Core } from "@strapi/strapi";

import {
  EVENT_CONTENT_TYPE_UID,
  REGISTRATION_CONTENT_TYPE_UID,
} from "../../../shared/pluginId";
import { isSafeObjectKey } from "../../../shared/spotlightHelpers";
import type { ExpandedOccurrence, RsvpStats } from "../../../shared/types";
import { getDocumentsClient } from "../types";
import { aggregateRsvpCounts } from "./rsvpHelpers";

const API_CONTENT_TYPE_UID_RE = /^api::[a-z0-9-]+\.[a-z0-9-]+$/i;

const SENSITIVE_FIELD_NAMES = new Set([
  "password",
  "resetpasswordtoken",
  "validationtoken",
  "confirmationtoken",
  "checkintoken",
  "checkintokenhash",
  "canceltoken",
  "canceltokenhash",
]);

/**
 * Strictly restricts mapped event sources to `api::*` content types
 * and the built-in `plugin::events.event` collection type.
 */
export function isAllowedEventSourceUid(uid: unknown): uid is string {
  if (typeof uid !== "string") return false;
  const trimmed = uid.trim();
  if (!trimmed) return false;
  return (
    trimmed === EVENT_CONTENT_TYPE_UID || API_CONTENT_TYPE_UID_RE.test(trimmed)
  );
}

/**
 * Extracts configured custom fields while stripping `private: true` schema
 * attributes, sensitive credential/token fields, and prototype-pollution keys.
 */
export function extractCustomFields(
  strapi: Core.Strapi,
  sourceUid: string,
  doc: Record<string, unknown>,
  customFieldKeys?: string[]
): Record<string, unknown> | undefined {
  if (!Array.isArray(customFieldKeys) || customFieldKeys.length === 0) {
    return undefined;
  }

  const schemaAttrs = strapi.contentTypes?.[sourceUid]?.attributes;
  const extracted: Record<string, unknown> = {};

  for (const key of customFieldKeys) {
    if (!isSafeObjectKey(key)) continue;
    if (SENSITIVE_FIELD_NAMES.has(key.toLowerCase())) continue;

    const attrDef =
      schemaAttrs && Object.hasOwn(schemaAttrs, key)
        ? schemaAttrs[key]
        : undefined;
    if (attrDef?.private === true) continue;

    if (Object.hasOwn(doc, key) && doc[key] !== undefined) {
      extracted[key] = doc[key];
    }
  }

  return Object.keys(extracted).length > 0 ? extracted : undefined;
}

export interface PendingOccurrenceRsvpMeta {
  eventUid: string;
  eventDocumentId: string;
  occurrenceDate: string;
  capacity: number | null;
  waitlistEnabled: boolean;
  rsvpEnabled: boolean;
}

function buildEmptySlotRsvpStats(meta: PendingOccurrenceRsvpMeta): RsvpStats {
  const capacity = meta.capacity;
  return {
    eventUid: meta.eventUid,
    eventDocumentId: meta.eventDocumentId,
    occurrenceDate: meta.occurrenceDate,
    rsvpEnabled: meta.rsvpEnabled,
    capacity,
    waitlistEnabled: meta.waitlistEnabled,
    confirmedCount: 0,
    confirmedSeats: 0,
    checkedInSeats: 0,
    waitlistedCount: 0,
    waitlistedSeats: 0,
    cancelledCount: 0,
    remainingSeats: capacity !== null ? Math.max(0, capacity) : null,
    isFull: capacity !== null ? capacity <= 0 : false,
  };
}

/**
 * Populates `occ.rsvp` across all expanded occurrences using a single batched
 * database query aggregated in memory in O(N) instead of N+1 queries.
 */
export async function attachBatchedRsvpStats(
  strapi: Core.Strapi,
  occurrences: ExpandedOccurrence[],
  pendingByOccurrenceId: Map<string, PendingOccurrenceRsvpMeta>
): Promise<void> {
  if (pendingByOccurrenceId.size === 0 || occurrences.length === 0) {
    return;
  }

  const rsvpDocIdSet = new Set<string>();
  const occDateSet = new Set<string>();
  for (const meta of pendingByOccurrenceId.values()) {
    if (meta.rsvpEnabled && meta.eventDocumentId && meta.occurrenceDate) {
      rsvpDocIdSet.add(meta.eventDocumentId);
      occDateSet.add(meta.occurrenceDate);
    }
  }

  if (rsvpDocIdSet.size === 0 || occDateSet.size === 0) {
    return;
  }

  const rsvpDocIds = Array.from(rsvpDocIdSet);
  const occDates = Array.from(occDateSet);
  let rows: Array<Record<string, unknown>>;
  try {
    rows = await getDocumentsClient(
      strapi,
      REGISTRATION_CONTENT_TYPE_UID
    ).findMany({
      filters: {
        eventDocumentId: { $in: rsvpDocIds },
        occurrenceDate: { $in: occDates },
      },
      limit: 10000,
    });
  } catch {
    rows = [];
  }

  const buckets = new Map<string, Array<Record<string, unknown>>>();
  for (const row of rows) {
    const docId =
      typeof row.eventDocumentId === "string" ? row.eventDocumentId : "";
    const occDate =
      typeof row.occurrenceDate === "string" ? row.occurrenceDate : "";
    if (!docId || !occDate || !rsvpDocIdSet.has(docId)) continue;
    const slotKey = `${docId}::${occDate}`;
    const existingBucket = buckets.get(slotKey);
    if (existingBucket) {
      existingBucket.push(row);
    } else {
      buckets.set(slotKey, [row]);
    }
  }

  for (const occ of occurrences) {
    const meta = pendingByOccurrenceId.get(occ.occurrenceId);
    if (!meta || !meta.rsvpEnabled) continue;

    const slotKey = `${meta.eventDocumentId}::${meta.occurrenceDate}`;
    const slotRecords = buckets.get(slotKey);
    if (!slotRecords || slotRecords.length === 0) {
      occ.rsvp = buildEmptySlotRsvpStats(meta);
      continue;
    }

    const counts = aggregateRsvpCounts(slotRecords);
    const remainingSeats =
      meta.capacity !== null
        ? Math.max(0, meta.capacity - counts.confirmedSeats)
        : null;
    const isFull =
      meta.capacity !== null ? counts.confirmedSeats >= meta.capacity : false;

    occ.rsvp = {
      eventUid: meta.eventUid,
      eventDocumentId: meta.eventDocumentId,
      occurrenceDate: meta.occurrenceDate,
      rsvpEnabled: meta.rsvpEnabled,
      capacity: meta.capacity,
      waitlistEnabled: meta.waitlistEnabled,
      ...counts,
      remainingSeats,
      isFull,
    };
  }
}
