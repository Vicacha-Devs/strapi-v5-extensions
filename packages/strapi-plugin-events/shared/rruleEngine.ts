/**
 * Delegates RFC 5545 RRULE & RFC 7529 RSCALE recurrence parsing and expansion
 * to @vicacha-devs/strapi-plugin-calendar/shared.
 */
import {
  type ExpandedSlot,
  buildRRule as calendarBuildRRule,
  expandRuleSlots as calendarExpandRuleSlots,
  parseRRule,
  parseRRuleFieldValue,
} from '@vicacha-devs/strapi-plugin-calendar/shared';
import type { ParsedRRule, RRuleFieldValue } from './types';

export type RawOccurrenceSlot = ExpandedSlot;

export { parseRRule, parseRRuleFieldValue };

export function toDateKey(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toISOString().slice(0, 10);
}

export function normalizeRRuleString(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }
  return raw.trim().replace(/^RRULE:/i, '').trim();
}

export function buildRRule(parsed: Partial<ParsedRRule>): string {
  return calendarBuildRRule({
    freq: parsed.freq ?? 'NONE',
    interval: parsed.interval ?? 1,
    byDay: parsed.byDay ?? [],
    byMonthDay: parsed.byMonthDay,
    count: parsed.count,
    until: parsed.until,
  });
}

const FREQ_UNITS: Record<string, { singular: string; plural: string }> = {
  DAILY: { singular: 'day', plural: 'days' },
  WEEKLY: { singular: 'week', plural: 'weeks' },
  MONTHLY: { singular: 'month', plural: 'months' },
  YEARLY: { singular: 'year', plural: 'years' },
};

function formatIntervalUnit(freq: string, interval: number): string {
  const unit = FREQ_UNITS[freq] ?? FREQ_UNITS.YEARLY;
  return interval === 1 ? unit.singular : `${interval} ${unit.plural}`;
}

export function describeRRule(rruleString: string | undefined | null): string {
  const parsed = parseRRule(rruleString);
  if (parsed.freq === 'NONE') {
    return 'Does not repeat';
  }

  let summary = `Every ${formatIntervalUnit(parsed.freq, parsed.interval)}`;
  if (parsed.freq === 'WEEKLY' && parsed.byDay.length > 0) {
    summary += ` on ${parsed.byDay.join(', ')}`;
  } else if (parsed.freq === 'MONTHLY' && parsed.byMonthDay) {
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
  const windowStartIso =
    typeof options.windowStart === 'string'
      ? options.windowStart
      : options.windowStart.toISOString();
  const windowEndIso =
    typeof options.windowEnd === 'string'
      ? options.windowEnd
      : options.windowEnd.toISOString();

  return calendarExpandRuleSlots({
    baseStartDate: options.baseStartDate,
    baseEndDate: options.baseEndDate,
    recurrence: options.recurrence,
    windowStart: windowStartIso,
    windowEnd: windowEndIso,
    maxOccurrences: options.maxInstances ?? 366,
  });
}
