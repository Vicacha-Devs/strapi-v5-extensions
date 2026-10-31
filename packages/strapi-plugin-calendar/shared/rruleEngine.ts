import { extractCalendarParts } from './calendarSystems';
import type {
  OccurrenceOverride,
  ParsedRRule,
  RRuleFieldValue,
  RRuleFrequency,
  RRuleWeekday,
} from './types';

const VALID_FREQUENCIES: RRuleFrequency[] = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const VALID_WEEKDAYS: RRuleWeekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const JS_DAY_TO_RRULE_DAY: Record<number, RRuleWeekday> = {
  0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA',
};
const DAY_LABELS: Record<RRuleWeekday, string> = {
  MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun',
};
const SINGULAR_FREQ_LABELS: Record<RRuleFrequency, string> = {
  NONE: '', DAILY: 'Every day', WEEKLY: 'Every week', MONTHLY: 'Every month', YEARLY: 'Every year',
};
const PLURAL_FREQ_UNITS: Record<RRuleFrequency, string> = {
  NONE: 'days', DAILY: 'days', WEEKLY: 'weeks', MONTHLY: 'months', YEARLY: 'years',
};

function parseBoundedInt(val: string, min: number, max: number): number | undefined {
  const n = Number.parseInt(val, 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

function parseUntilDate(val: string): string | undefined {
  if (/^\d{8}(?:T\d{6}Z?)?$/.test(val)) {
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
  }
  return /^\d{4}-\d{2}-\d{2}/.test(val) ? val.slice(0, 10) : undefined;
}

function parseByDayList(val: string): RRuleWeekday[] {
  return val
    .split(',')
    .map((d) => d.trim().slice(-2) as RRuleWeekday)
    .filter((d) => VALID_WEEKDAYS.includes(d));
}

type RRulePartAssigner = (parsed: ParsedRRule, val: string) => void;

const RRULE_PART_ASSIGNERS: Record<string, RRulePartAssigner> = {
  RSCALE: (parsed, val) => {
    if (val) parsed.rscale = val.toLowerCase();
  },
  FREQ: (parsed, val) => {
    if (VALID_FREQUENCIES.includes(val as RRuleFrequency)) {
      parsed.freq = val as RRuleFrequency;
    }
  },
  INTERVAL: (parsed, val) => {
    const n = parseBoundedInt(val, 1, 365);
    if (n !== undefined) parsed.interval = n;
  },
  BYDAY: (parsed, val) => {
    parsed.byDay = parseByDayList(val);
  },
  BYMONTH: (parsed, val) => {
    const m = parseBoundedInt(val, 1, 13);
    if (m !== undefined) parsed.byMonth = m;
  },
  BYMONTHDAY: (parsed, val) => {
    const md = parseBoundedInt(val, 1, 31);
    if (md !== undefined) parsed.byMonthDay = md;
  },
  COUNT: (parsed, val) => {
    const c = parseBoundedInt(val, 1, 1000);
    if (c !== undefined) parsed.count = c;
  },
  UNTIL: (parsed, val) => {
    const u = parseUntilDate(val);
    if (u !== undefined) parsed.until = u;
  },
};

export function parseRRule(rawRule?: string | null): ParsedRRule {
  const defaultParsed: ParsedRRule = { freq: 'NONE', interval: 1, byDay: [] };
  if (!rawRule || typeof rawRule !== 'string') return defaultParsed;
  const cleaned = rawRule.trim().replace(/^RRULE:/i, '');
  if (!cleaned) return defaultParsed;
  const parsed: ParsedRRule = { ...defaultParsed };
  for (const part of cleaned.split(';')) {
    const [rawKey, rawVal] = part.split('=');
    if (!rawKey || !rawVal) continue;
    const assigner = RRULE_PART_ASSIGNERS[rawKey.trim().toUpperCase()];
    if (assigner) assigner(parsed, rawVal.trim().toUpperCase());
  }
  return parsed;
}

function appendRscaleAndFreq(segments: string[], parsed: ParsedRRule): void {
  const rscale = parsed.rscale;
  if (rscale && rscale !== 'gregory' && rscale !== 'iso8601') {
    segments.push(`RSCALE=${rscale.toUpperCase()}`);
  }
  segments.push(`FREQ=${parsed.freq}`);
  segments.push(`INTERVAL=${Math.max(1, Math.floor(parsed.interval || 1))}`);
}

function appendRuleModifiers(segments: string[], parsed: ParsedRRule): void {
  if (parsed.freq === 'WEEKLY' && Array.isArray(parsed.byDay)) {
    const validDays = parsed.byDay.filter((d) => VALID_WEEKDAYS.includes(d));
    if (validDays.length > 0) segments.push(`BYDAY=${validDays.join(',')}`);
  }
  if (
    parsed.freq === 'YEARLY' &&
    typeof parsed.byMonth === 'number' &&
    parsed.byMonth >= 1 &&
    parsed.byMonth <= 13
  ) {
    segments.push(`BYMONTH=${Math.floor(parsed.byMonth)}`);
  }
}

function appendMonthDayAndBounds(segments: string[], parsed: ParsedRRule): void {
  const isMonthOrYear = parsed.freq === 'MONTHLY' || parsed.freq === 'YEARLY';
  if (
    isMonthOrYear &&
    typeof parsed.byMonthDay === 'number' &&
    parsed.byMonthDay >= 1 &&
    parsed.byMonthDay <= 31
  ) {
    segments.push(`BYMONTHDAY=${Math.floor(parsed.byMonthDay)}`);
  }
  if (typeof parsed.count === 'number' && parsed.count >= 1) {
    segments.push(`COUNT=${Math.floor(parsed.count)}`);
  } else if (parsed.until && /^\d{4}-\d{2}-\d{2}$/.test(parsed.until)) {
    segments.push(`UNTIL=${parsed.until.replace(/-/g, '')}T235959Z`);
  }
}

export function buildRRule(parsed: ParsedRRule): string {
  if (!parsed || parsed.freq === 'NONE') return '';
  const segments: string[] = [];
  appendRscaleAndFreq(segments, parsed);
  appendRuleModifiers(segments, parsed);
  appendMonthDayAndBounds(segments, parsed);
  return segments.join(';');
}

function formatRRuleIntervalText(parsed: ParsedRRule): string {
  if (parsed.interval === 1) {
    return SINGULAR_FREQ_LABELS[parsed.freq] || 'Every year';
  }
  return `Every ${parsed.interval} ${PLURAL_FREQ_UNITS[parsed.freq] || 'years'}`;
}

function formatRRuleSuffix(parsed: ParsedRRule): string {
  if (parsed.freq === 'WEEKLY' && parsed.byDay.length > 0) {
    return ` on ${parsed.byDay.map((d) => DAY_LABELS[d]).join(', ')}`;
  }
  if (parsed.freq === 'YEARLY' && parsed.byMonth && parsed.byMonthDay) {
    return ` on month ${parsed.byMonth}, day ${parsed.byMonthDay}`;
  }
  if (parsed.freq === 'MONTHLY' && parsed.byMonthDay) {
    return ` on day ${parsed.byMonthDay}`;
  }
  return '';
}

function formatRRuleLimit(parsed: ParsedRRule): string {
  if (parsed.count) return `, ${parsed.count} times`;
  if (parsed.until) return `, until ${parsed.until}`;
  return '';
}

export function describeRRule(rawRule?: string | null): string {
  const parsed = parseRRule(rawRule);
  if (parsed.freq === 'NONE') return 'Does not repeat (Single occurrence)';
  const rscalePrefix =
    parsed.rscale && parsed.rscale !== 'gregory'
      ? `[${parsed.rscale.toUpperCase()}] `
      : '';
  return `${rscalePrefix}${formatRRuleIntervalText(parsed)}${formatRRuleSuffix(parsed)}${formatRRuleLimit(parsed)}`;
}

function normalizeRRuleObject(
  obj: Record<string, unknown>,
  defaultTimezone: string
): RRuleFieldValue {
  const rruleStr = typeof obj.rrule === 'string' ? obj.rrule : '';
  const parsed = parseRRule(rruleStr);
  const timezone =
    typeof obj.timezone === 'string' && obj.timezone ? obj.timezone : defaultTimezone;
  const rscale = typeof obj.rscale === 'string' ? obj.rscale : parsed.rscale;
  const exdates = Array.isArray(obj.exdates)
    ? obj.exdates.filter((d): d is string => typeof d === 'string')
    : [];
  const overrides =
    obj.overrides && typeof obj.overrides === 'object'
      ? (obj.overrides as Record<string, OccurrenceOverride>)
      : {};
  return { rrule: rruleStr, timezone, rscale, allDay: Boolean(obj.allDay), exdates, overrides };
}

export function parseRRuleFieldValue(raw: unknown, defaultTimezone = 'UTC'): RRuleFieldValue {
  const fallback: RRuleFieldValue = {
    rrule: '', timezone: defaultTimezone, allDay: false, exdates: [], overrides: {},
  };
  if (!raw) return fallback;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try {
        return normalizeRRuleObject(JSON.parse(trimmed) as Record<string, unknown>, defaultTimezone);
      } catch {
        return fallback;
      }
    }
    const parsed = parseRRule(trimmed);
    return { ...fallback, rrule: trimmed, rscale: parsed.rscale };
  }
  if (typeof raw === 'object') {
    return normalizeRRuleObject(raw as Record<string, unknown>, defaultTimezone);
  }
  return fallback;
}

function toDateKeyUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface ExpandedSlot {
  occurrenceDate: string;
  startDate: string;
  endDate: string;
  isRecurring: boolean;
  isOverridden: boolean;
  rscale?: string;
  override?: OccurrenceOverride;
}

interface SlotContext {
  startObj: Date;
  durationMs: number;
  winStartMs: number;
  winEndMs: number;
  untilMs: number;
  maxCount: number;
  maxOccurrences: number;
  parsed: ParsedRRule;
  exdatesSet: Set<string>;
  overridesMap: Record<string, OccurrenceOverride>;
  effectiveRScale?: string;
  isNonGregorianRScale: boolean;
  targetMonth: number;
  targetDayOfMonth: number;
  targetWeekdays: RRuleWeekday[];
  anchorMidnightMs: number;
  timeOffsetMs: number;
}

function buildEffectiveSlot(
  candidateDate: Date,
  dateKey: string,
  ctx: Pick<
    SlotContext,
    'exdatesSet' | 'overridesMap' | 'durationMs' | 'winStartMs' | 'winEndMs' | 'effectiveRScale'
  >,
  isRecurring: boolean
): ExpandedSlot | null {
  if (ctx.exdatesSet.has(dateKey)) return null;
  const override = ctx.overridesMap[dateKey];
  if (override?.cancelled) return null;
  const effStart = override?.startDate ? new Date(override.startDate) : candidateDate;
  const effEnd = override?.endDate
    ? new Date(override.endDate)
    : new Date(effStart.getTime() + ctx.durationMs);
  if (effEnd.getTime() < ctx.winStartMs || effStart.getTime() > ctx.winEndMs) return null;
  return {
    occurrenceDate: dateKey,
    startDate: effStart.toISOString(),
    endDate: effEnd.toISOString(),
    isRecurring,
    isOverridden: Boolean(override),
    ...(isRecurring ? { rscale: ctx.effectiveRScale } : {}),
    override,
  };
}

function matchesNonGregorianFrequency(candidateDate: Date, ctx: SlotContext): boolean {
  const calParts = extractCalendarParts(candidateDate, ctx.effectiveRScale!);
  if (!calParts) return false;
  if (ctx.parsed.freq === 'MONTHLY') return calParts.day === ctx.targetDayOfMonth;
  return calParts.month === ctx.targetMonth && calParts.day === ctx.targetDayOfMonth;
}

function matchesGregorianFrequency(
  candidateDate: Date,
  dayOffset: number,
  ctx: SlotContext
): boolean {
  const { freq, interval } = ctx.parsed;
  if (freq === 'DAILY') return dayOffset % interval === 0;
  if (freq === 'WEEKLY') {
    const rruleDay = JS_DAY_TO_RRULE_DAY[candidateDate.getUTCDay()];
    return Math.floor(dayOffset / 7) % interval === 0 && ctx.targetWeekdays.includes(rruleDay);
  }
  if (freq === 'MONTHLY') {
    const monthsDiff =
      (candidateDate.getUTCFullYear() - ctx.startObj.getUTCFullYear()) * 12 +
      (candidateDate.getUTCMonth() - ctx.startObj.getUTCMonth());
    return (
      monthsDiff >= 0 &&
      monthsDiff % interval === 0 &&
      candidateDate.getUTCDate() === ctx.targetDayOfMonth
    );
  }
  const yearsDiff = candidateDate.getUTCFullYear() - ctx.startObj.getUTCFullYear();
  return (
    yearsDiff >= 0 &&
    yearsDiff % interval === 0 &&
    candidateDate.getUTCMonth() + 1 === ctx.targetMonth &&
    candidateDate.getUTCDate() === ctx.targetDayOfMonth
  );
}

function matchesCandidateRule(
  candidateDate: Date,
  dayOffset: number,
  ctx: SlotContext
): boolean {
  const isMonthOrYear = ctx.parsed.freq === 'MONTHLY' || ctx.parsed.freq === 'YEARLY';
  if (ctx.isNonGregorianRScale && ctx.effectiveRScale && isMonthOrYear) {
    return matchesNonGregorianFrequency(candidateDate, ctx);
  }
  return matchesGregorianFrequency(candidateDate, dayOffset, ctx);
}

function resolveEndDate(startObj: Date, baseEndDate?: string | null): Date {
  if (baseEndDate) {
    const parsedEnd = new Date(baseEndDate);
    if (!Number.isNaN(parsedEnd.getTime())) return parsedEnd;
  }
  return new Date(startObj.getTime() + 60 * 60 * 1000);
}

function resolveCalendarTargets(
  startObj: Date,
  parsed: ParsedRRule,
  effectiveRScale?: string
): {
  isNonGregorianRScale: boolean;
  targetMonth: number;
  targetDayOfMonth: number;
  targetWeekdays: RRuleWeekday[];
} {
  const isNonGregorianRScale =
    Boolean(effectiveRScale) && effectiveRScale !== 'gregory' && effectiveRScale !== 'iso8601';
  const baseParts =
    isNonGregorianRScale && effectiveRScale
      ? extractCalendarParts(startObj, effectiveRScale)
      : null;
  const targetMonth = parsed.byMonth ?? (baseParts ? baseParts.month : startObj.getUTCMonth() + 1);
  const targetDayOfMonth =
    parsed.byMonthDay ?? (baseParts ? baseParts.day : startObj.getUTCDate());
  const targetWeekdays =
    parsed.byDay.length > 0 ? parsed.byDay : [JS_DAY_TO_RRULE_DAY[startObj.getUTCDay()]];
  return { isNonGregorianRScale, targetMonth, targetDayOfMonth, targetWeekdays };
}

function createSlotContext(params: {
  startObj: Date;
  baseEndDate?: string | null;
  recurrence?: RRuleFieldValue | null;
  windowStart: string;
  windowEnd: string;
  maxOccurrences: number;
}): SlotContext {
  const { startObj, baseEndDate, recurrence, windowStart, windowEnd } = params;
  const endObj = resolveEndDate(startObj, baseEndDate);
  const parsed = parseRRule(recurrence?.rrule);
  const effectiveRScale = recurrence?.rscale || parsed.rscale;
  const targets = resolveCalendarTargets(startObj, parsed, effectiveRScale);
  const untilMs = parsed.until
    ? new Date(`${parsed.until}T23:59:59.999Z`).getTime()
    : Number.POSITIVE_INFINITY;

  return {
    startObj,
    durationMs: Math.max(0, endObj.getTime() - startObj.getTime()),
    winStartMs: new Date(windowStart).getTime(),
    winEndMs: new Date(windowEnd).getTime(),
    untilMs,
    maxCount: parsed.count ?? params.maxOccurrences,
    maxOccurrences: params.maxOccurrences,
    parsed,
    exdatesSet: new Set(recurrence?.exdates ?? []),
    overridesMap: recurrence?.overrides ?? {},
    effectiveRScale,
    ...targets,
    anchorMidnightMs: Date.UTC(
      startObj.getUTCFullYear(),
      startObj.getUTCMonth(),
      startObj.getUTCDate()
    ),
    timeOffsetMs:
      startObj.getUTCHours() * 3600000 +
      startObj.getUTCMinutes() * 60000 +
      startObj.getUTCSeconds() * 1000,
  };
}

function scanRecurringSlots(ctx: SlotContext): ExpandedSlot[] {
  const results: ExpandedSlot[] = [];
  let generatedCount = 0;
  for (let dayOffset = 0; dayOffset <= 1460; dayOffset++) {
    if (generatedCount >= ctx.maxCount || results.length >= ctx.maxOccurrences) break;
    const candidateDate = new Date(
      ctx.anchorMidnightMs + dayOffset * 86400000 + ctx.timeOffsetMs
    );
    const candidateMs = candidateDate.getTime();
    if (candidateMs > ctx.untilMs || candidateMs > ctx.winEndMs) break;
    if (!matchesCandidateRule(candidateDate, dayOffset, ctx)) continue;
    generatedCount++;
    const slot = buildEffectiveSlot(candidateDate, toDateKeyUTC(candidateDate), ctx, true);
    if (slot) results.push(slot);
  }
  return results;
}

export function expandRuleSlots(params: {
  baseStartDate: string;
  baseEndDate?: string | null;
  recurrence?: RRuleFieldValue | null;
  windowStart: string;
  windowEnd: string;
  maxOccurrences?: number;
}): ExpandedSlot[] {
  const startObj = new Date(params.baseStartDate);
  if (Number.isNaN(startObj.getTime())) return [];
  const ctx = createSlotContext({
    ...params,
    startObj,
    maxOccurrences: params.maxOccurrences ?? 366,
  });
  if (ctx.parsed.freq === 'NONE') {
    const slot = buildEffectiveSlot(startObj, toDateKeyUTC(startObj), ctx, false);
    return slot ? [slot] : [];
  }
  return scanRecurringSlots(ctx);
}
