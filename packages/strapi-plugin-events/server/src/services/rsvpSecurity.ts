import type { Core } from "@strapi/strapi";
import crypto from "node:crypto";

import { REGISTRATION_CONTENT_TYPE_UID } from "../../../shared/pluginId";
import {
  expandRuleSlots,
  isValidCalendarDateKey,
  toDateKey,
} from "../../../shared/rruleEngine";
import { isSafeObjectKey } from "../../../shared/spotlightHelpers";
import { PluginValidationError, getDocumentsClient } from "../types";
import type { ResolvedTargetEvent } from "./rsvpHelpers";

const utf8Encoder = new TextEncoder();
const DAY_MS = 24 * 60 * 60 * 1000;

export function generateRawRsvpToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function hashRsvpToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function verifyTokenHashConstantTime(
  candidateHash: string,
  storedValue: unknown
): boolean {
  if (typeof storedValue !== "string" || !storedValue) {
    return false;
  }
  const a = utf8Encoder.encode(candidateHash);
  const b = utf8Encoder.encode(storedValue);
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export async function findRegistrationByRawToken(
  strapi: Core.Strapi,
  rawToken: string
): Promise<{
  record: Record<string, unknown>;
  tokenHash: string;
} | null> {
  const cleaned = (rawToken ?? "").trim();
  if (cleaned.length < 16 || cleaned.length > 256) {
    return null;
  }
  const tokenHash = hashRsvpToken(cleaned);
  const matches = await getDocumentsClient(
    strapi,
    REGISTRATION_CONTENT_TYPE_UID
  ).findMany({
    filters: { checkInToken: { $eq: tokenHash } },
    limit: 10,
  });

  for (const item of matches) {
    if (verifyTokenHashConstantTime(tokenHash, item.checkInToken)) {
      return { record: item, tokenHash };
    }
  }
  return null;
}

const strapiSlotLocks = new WeakMap<Core.Strapi, Map<string, Promise<void>>>();

function getSlotLocksMap(strapi: Core.Strapi): Map<string, Promise<void>> {
  let map = strapiSlotLocks.get(strapi);
  if (!map) {
    map = new Map<string, Promise<void>>();
    strapiSlotLocks.set(strapi, map);
  }
  return map;
}

export function clearOccurrenceLocks(strapi: Core.Strapi): void {
  const map = strapiSlotLocks.get(strapi);
  if (map) {
    map.clear();
    strapiSlotLocks.delete(strapi);
  }
}

/**
 * Serializes mutations per `(eventDocumentId, occurrenceDate)` scoped per
 * Strapi instance and wraps inside `strapi.db.transaction` when available.
 */
export async function withOccurrenceLock<T>(
  strapi: Core.Strapi,
  eventDocumentId: string,
  occurrenceDate: string,
  fn: () => Promise<T>
): Promise<T> {
  const slotLocks = getSlotLocksMap(strapi);
  const lockKey = `${eventDocumentId}::${occurrenceDate}`;
  const previous = slotLocks.get(lockKey) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const currentTail = previous.then(() => gate);
  slotLocks.set(lockKey, currentTail);

  await previous;
  try {
    const txFn = strapi.db?.transaction;
    if (typeof txFn === "function") {
      const runInTransaction = txFn.bind(strapi.db) as <R>(
        cb: () => Promise<R>
      ) => Promise<R>;
      return await runInTransaction(() => fn());
    }
    return await fn();
  } finally {
    release();
    if (slotLocks.get(lockKey) === currentTail) {
      slotLocks.delete(lockKey);
    }
  }
}

function parseEndTimestamp(
  endIso: string | null | undefined,
  startIso: string,
  occurrenceDate: string,
  allDay: boolean
): number | null {
  if (allDay) {
    const ms = new Date(`${occurrenceDate}T23:59:59.999Z`).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (endIso) {
    const endMs = new Date(endIso).getTime();
    if (Number.isFinite(endMs)) return endMs;
  }
  const startMs = new Date(startIso).getTime();
  return Number.isFinite(startMs) ? startMs + 60 * 60 * 1000 : null;
}

function assertOccurrenceNotEnded(endMs: number | null): void {
  if (endMs !== null && Number.isFinite(endMs) && Date.now() > endMs) {
    throw new PluginValidationError(
      "Cannot register for an event occurrence that has already ended."
    );
  }
}

/**
 * Verifies that `occurrenceDate` is a valid calendar YYYY-MM-DD and matches
 * an actual scheduled (non-excluded, non-cancelled) occurrence of `targetEvent`.
 * Returns the occurrence's effective end timestamp in ms when determinable.
 */
export function assertScheduledOccurrence(
  targetEvent: ResolvedTargetEvent,
  occurrenceDate: string
): number | null {
  if (!isValidCalendarDateKey(occurrenceDate)) {
    throw new PluginValidationError(
      "Invalid occurrenceDate: must be a valid YYYY-MM-DD calendar date."
    );
  }

  const recurrence = targetEvent.recurrence;
  if (recurrence.exdates?.includes(occurrenceDate)) {
    throw new PluginValidationError(
      `Date ${occurrenceDate} is excluded for this event.`
    );
  }
  const directOverride =
    isSafeObjectKey(occurrenceDate) &&
    recurrence.overrides &&
    Object.hasOwn(recurrence.overrides, occurrenceDate)
      ? recurrence.overrides[occurrenceDate]
      : undefined;
  if (directOverride?.cancelled) {
    throw new PluginValidationError(
      `Occurrence on ${occurrenceDate} has been cancelled.`
    );
  }

  if (!recurrence.rrule) {
    const baseKey = toDateKey(targetEvent.startDate);
    if (occurrenceDate !== baseKey) {
      throw new PluginValidationError(
        `Date ${occurrenceDate} is not a scheduled occurrence for this event.`
      );
    }
    const effStart = directOverride?.startDate || targetEvent.startDate;
    const effEnd = directOverride?.endDate || targetEvent.endDate;
    return parseEndTimestamp(
      effEnd,
      effStart,
      occurrenceDate,
      targetEvent.allDay
    );
  }

  const anchorMs = new Date(`${occurrenceDate}T00:00:00.000Z`).getTime();
  const slots = expandRuleSlots({
    baseStartDate: targetEvent.startDate,
    baseEndDate: targetEvent.endDate,
    recurrence,
    windowStart: new Date(anchorMs - 31 * DAY_MS).toISOString(),
    windowEnd: new Date(anchorMs + 32 * DAY_MS - 1).toISOString(),
    maxInstances: 10000,
  });

  const matched = slots.find(
    (s) =>
      s.occurrenceDate === occurrenceDate ||
      toDateKey(s.startDate) === occurrenceDate
  );
  if (!matched) {
    throw new PluginValidationError(
      `Date ${occurrenceDate} is not a scheduled occurrence for this event.`
    );
  }

  return parseEndTimestamp(
    matched.endDate,
    matched.startDate,
    occurrenceDate,
    Boolean(recurrence.allDay || targetEvent.allDay)
  );
}

export function resolveValidatedOccurrenceDate(
  inputDate: string | undefined,
  targetEvent: ResolvedTargetEvent
): string {
  if (inputDate !== undefined && inputDate !== "") {
    const trimmed = String(inputDate).trim();
    const endMs = assertScheduledOccurrence(targetEvent, trimmed);
    assertOccurrenceNotEnded(endMs);
    return trimmed;
  }

  if (targetEvent.recurrence.rrule) {
    const nowMs = Date.now();
    const isAllDay = Boolean(
      targetEvent.recurrence.allDay || targetEvent.allDay
    );
    const upcomingSlots = expandRuleSlots({
      baseStartDate: targetEvent.startDate,
      baseEndDate: targetEvent.endDate,
      recurrence: targetEvent.recurrence,
      windowStart: new Date(nowMs - DAY_MS).toISOString(),
      windowEnd: new Date(nowMs + 366 * DAY_MS).toISOString(),
      maxInstances: 1000,
    });
    for (const slot of upcomingSlots) {
      const slotEndMs = parseEndTimestamp(
        slot.endDate,
        slot.startDate,
        slot.occurrenceDate,
        isAllDay
      );
      if (
        slotEndMs === null ||
        !Number.isFinite(slotEndMs) ||
        slotEndMs > nowMs
      ) {
        return slot.occurrenceDate;
      }
    }
    throw new PluginValidationError(
      "Cannot register for an event occurrence that has already ended."
    );
  }

  const fallbackKey = toDateKey(targetEvent.startDate);
  const endMs = assertScheduledOccurrence(targetEvent, fallbackKey);
  assertOccurrenceNotEnded(endMs);
  return fallbackKey;
}
