/**
 * Delegates RFC 5545 RRULE & RFC 7529 RSCALE recurrence parsing and expansion
 * to @vicacha-devs/strapi-plugin-calendar/shared while sanitizing stored
 * exdates and per-occurrence override timestamps.
 */
import {
  type ExpandedSlot,
  buildRRule as calendarBuildRRule,
  expandRuleSlots as calendarExpandRuleSlots,
  parseRRuleFieldValue as calendarParseRRuleFieldValue,
  parseRRule,
} from "@vicacha-devs/strapi-plugin-calendar/shared";

import type { OccurrenceOverride, ParsedRRule, RRuleFieldValue } from "./types";
import { isSafeObjectKey } from "./urlAndPosterHelpers";

export type RawOccurrenceSlot = ExpandedSlot;

export { parseRRule };

export function isValidCalendarDateKey(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const parsed = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return parsed.toISOString().slice(0, 10) === dateStr;
}

export function toDateKey(dateInput: Date | string): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return d.toISOString().slice(0, 10);
}

export function normalizeRRuleString(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") {
    return "";
  }
  return raw

    .replace(/[\u0000-\u001F\u007F]+/g, "")
    .trim()
    .replace(/^RRULE:/i, "")
    .trim();
}

export function sanitizeOccurrenceOverrides(
  rawOverrides: Record<string, OccurrenceOverride> | undefined
): Record<string, OccurrenceOverride> {
  const clean: Record<string, OccurrenceOverride> = {};
  if (
    !rawOverrides ||
    typeof rawOverrides !== "object" ||
    Array.isArray(rawOverrides)
  ) {
    return clean;
  }

  for (const [key, ov] of Object.entries(rawOverrides)) {
    if (!isSafeObjectKey(key) || !isValidCalendarDateKey(key)) continue;
    if (!ov || typeof ov !== "object" || Array.isArray(ov)) continue;

    let validStart: string | undefined;
    let startMs: number | null = null;
    if (ov.startDate !== undefined && ov.startDate !== "") {
      if (typeof ov.startDate !== "string") continue;
      const parsedStart = new Date(ov.startDate).getTime();
      if (Number.isNaN(parsedStart)) continue;
      validStart = ov.startDate;
      startMs = parsedStart;
    }

    let validEnd: string | undefined;
    if (ov.endDate !== undefined && ov.endDate !== "") {
      if (typeof ov.endDate !== "string") continue;
      const parsedEnd = new Date(ov.endDate).getTime();
      if (Number.isNaN(parsedEnd)) continue;
      const minStartMs = startMs ?? new Date(`${key}T00:00:00.000Z`).getTime();
      if (parsedEnd < minStartMs) continue;
      validEnd = ov.endDate;
    }

    clean[key] = {
      ...ov,
      originalDate:
        typeof ov.originalDate === "string" &&
        isValidCalendarDateKey(ov.originalDate)
          ? ov.originalDate
          : key,
      startDate: validStart,
      endDate: validEnd,
    };
  }

  return clean;
}

export function sanitizeRRuleFieldValue(
  rec: RRuleFieldValue | null | undefined,
  defaultTimezone = "UTC"
): RRuleFieldValue {
  const rrule = normalizeRRuleString(rec?.rrule);
  const timezone =
    typeof rec?.timezone === "string" && rec.timezone.trim()
      ? rec.timezone.trim()
      : defaultTimezone;
  const exdates = Array.isArray(rec?.exdates)
    ? rec.exdates.filter(
        (d): d is string => typeof d === "string" && isValidCalendarDateKey(d)
      )
    : [];
  const overrides = sanitizeOccurrenceOverrides(rec?.overrides);

  return {
    ...rec,
    rrule,
    timezone,
    allDay: Boolean(rec?.allDay),
    exdates,
    overrides,
  };
}

export function parseRRuleFieldValue(
  raw: unknown,
  defaultTimezone = "UTC"
): RRuleFieldValue {
  const parsed = calendarParseRRuleFieldValue(raw, defaultTimezone);
  return sanitizeRRuleFieldValue(parsed, defaultTimezone);
}

export function buildRRule(parsed: Partial<ParsedRRule>): string {
  return calendarBuildRRule({
    freq: parsed.freq ?? "NONE",
    interval: parsed.interval ?? 1,
    byDay: parsed.byDay ?? [],
    byMonthDay: parsed.byMonthDay,
    count: parsed.count,
    until: parsed.until,
  });
}

const FREQ_UNITS: Record<string, { singular: string; plural: string }> = {
  DAILY: { singular: "day", plural: "days" },
  WEEKLY: { singular: "week", plural: "weeks" },
  MONTHLY: { singular: "month", plural: "months" },
  YEARLY: { singular: "year", plural: "years" },
};

function formatIntervalUnit(freq: string, interval: number): string {
  const unit = Object.hasOwn(FREQ_UNITS, freq)
    ? FREQ_UNITS[freq]
    : FREQ_UNITS.YEARLY;
  return interval === 1 ? unit.singular : `${interval} ${unit.plural}`;
}

export function describeRRule(rruleString: string | undefined | null): string {
  const parsed = parseRRule(normalizeRRuleString(rruleString));
  if (parsed.freq === "NONE") {
    return "Does not repeat";
  }

  let summary = `Every ${formatIntervalUnit(parsed.freq, parsed.interval)}`;
  if (parsed.freq === "WEEKLY" && parsed.byDay.length > 0) {
    summary += ` on ${parsed.byDay.join(", ")}`;
  } else if (parsed.freq === "MONTHLY" && parsed.byMonthDay) {
    summary += ` on day ${parsed.byMonthDay}`;
  }

  if (parsed.until) {
    summary += ` until ${parsed.until}`;
  } else if (parsed.count) {
    summary += ` (${parsed.count} occurrences)`;
  }

  return summary;
}

export function expandRuleSlots(options: {
  baseStartDate: string;
  baseEndDate?: string | null;
  recurrence: RRuleFieldValue;
  windowStart: string | Date;
  windowEnd: string | Date;
  maxInstances?: number;
}): RawOccurrenceSlot[] {
  const baseStartMs = new Date(options.baseStartDate).getTime();
  if (Number.isNaN(baseStartMs)) {
    return [];
  }

  let safeBaseEnd: string | null = null;
  if (typeof options.baseEndDate === "string" && options.baseEndDate) {
    const baseEndMs = new Date(options.baseEndDate).getTime();
    if (!Number.isNaN(baseEndMs) && baseEndMs >= baseStartMs) {
      safeBaseEnd = options.baseEndDate;
    }
  }

  const windowStartIso =
    typeof options.windowStart === "string"
      ? options.windowStart
      : options.windowStart.toISOString();
  const windowEndIso =
    typeof options.windowEnd === "string"
      ? options.windowEnd
      : options.windowEnd.toISOString();

  if (
    Number.isNaN(new Date(windowStartIso).getTime()) ||
    Number.isNaN(new Date(windowEndIso).getTime())
  ) {
    return [];
  }

  return calendarExpandRuleSlots({
    baseStartDate: options.baseStartDate,
    baseEndDate: safeBaseEnd,
    recurrence: sanitizeRRuleFieldValue(
      options.recurrence,
      options.recurrence?.timezone || "UTC"
    ),
    windowStart: windowStartIso,
    windowEnd: windowEndIso,
    maxOccurrences: options.maxInstances ?? 366,
  });
}
