import { extractCalendarParts } from "./calendarSystems";
import type {
  OccurrenceOverride,
  ParsedRRule,
  RRuleFieldValue,
  RRuleFrequency,
  RRuleWeekday,
} from "./types";

const VALID_FREQUENCIES: RRuleFrequency[] = [
  "NONE",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
];
const JS_DAY_TO_RRULE_DAY: RRuleWeekday[] = [
  "SU",
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
];
const DAY_LABELS: Record<RRuleWeekday, string> = {
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
  SU: "Sun",
};
const FREQ_UNITS: Record<RRuleFrequency, [string, string]> = {
  NONE: ["", "days"],
  DAILY: ["Every day", "days"],
  WEEKLY: ["Every week", "weeks"],
  MONTHLY: ["Every month", "months"],
  YEARLY: ["Every year", "years"],
};

function parseBoundedInt(val: string, min: number, max: number) {
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
    .split(",")
    .map((d) => d.trim().slice(-2) as RRuleWeekday)
    .filter((d) => JS_DAY_TO_RRULE_DAY.includes(d));
}

const intAssigner =
  (
    key: "interval" | "byMonth" | "byMonthDay" | "count",
    min: number,
    max: number
  ) =>
  (p: ParsedRRule, v: string) => {
    const n = parseBoundedInt(v, min, max);
    if (n !== undefined) p[key] = n;
  };

const RRULE_PART_ASSIGNERS: Record<
  string,
  (parsed: ParsedRRule, val: string) => void
> = {
  RSCALE: (p, v) => {
    if (v) p.rscale = v.toLowerCase();
  },
  FREQ: (p, v) => {
    if (VALID_FREQUENCIES.includes(v as RRuleFrequency)) {
      p.freq = v as RRuleFrequency;
    }
  },
  INTERVAL: intAssigner("interval", 1, 365),
  BYDAY: (p, v) => {
    p.byDay = parseByDayList(v);
  },
  BYMONTH: intAssigner("byMonth", 1, 13),
  BYMONTHDAY: intAssigner("byMonthDay", 1, 31),
  COUNT: intAssigner("count", 1, 1000),
  UNTIL: (p, v) => {
    const u = parseUntilDate(v);
    if (u !== undefined) p.until = u;
  },
};

export function parseRRule(rawRule?: string | null): ParsedRRule {
  const defaultParsed: ParsedRRule = { freq: "NONE", interval: 1, byDay: [] };
  if (!rawRule || typeof rawRule !== "string") return defaultParsed;
  const cleaned = rawRule.trim().replace(/^RRULE:/i, "");
  if (!cleaned) return defaultParsed;
  const parsed: ParsedRRule = { ...defaultParsed };
  for (const part of cleaned.split(";")) {
    const [rawKey, rawVal] = part.split("=");
    if (!rawKey || !rawVal) continue;
    RRULE_PART_ASSIGNERS[rawKey.trim().toUpperCase()]?.(
      parsed,
      rawVal.trim().toUpperCase()
    );
  }
  return parsed;
}

export function buildRRule(parsed: ParsedRRule): string {
  if (!parsed || parsed.freq === "NONE") return "";
  const rscale = parsed.rscale;
  const segments: string[] = [];
  if (rscale && rscale !== "gregory" && rscale !== "iso8601") {
    segments.push(`RSCALE=${rscale.toUpperCase()}`);
  }
  segments.push(
    `FREQ=${parsed.freq}`,
    `INTERVAL=${Math.max(1, Math.floor(parsed.interval || 1))}`
  );
  if (parsed.freq === "WEEKLY" && Array.isArray(parsed.byDay)) {
    const validDays = parsed.byDay.filter((d) =>
      JS_DAY_TO_RRULE_DAY.includes(d)
    );
    if (validDays.length > 0) segments.push(`BYDAY=${validDays.join(",")}`);
  }
  if (
    parsed.freq === "YEARLY" &&
    typeof parsed.byMonth === "number" &&
    parsed.byMonth >= 1 &&
    parsed.byMonth <= 13
  ) {
    segments.push(`BYMONTH=${Math.floor(parsed.byMonth)}`);
  }
  if (
    (parsed.freq === "MONTHLY" || parsed.freq === "YEARLY") &&
    typeof parsed.byMonthDay === "number" &&
    parsed.byMonthDay >= 1 &&
    parsed.byMonthDay <= 31
  ) {
    segments.push(`BYMONTHDAY=${Math.floor(parsed.byMonthDay)}`);
  }
  if (typeof parsed.count === "number" && parsed.count >= 1) {
    segments.push(`COUNT=${Math.floor(parsed.count)}`);
  } else if (parsed.until && /^\d{4}-\d{2}-\d{2}$/.test(parsed.until)) {
    segments.push(`UNTIL=${parsed.until.replace(/-/g, "")}T235959Z`);
  }
  return segments.join(";");
}

function formatRRuleSuffix(parsed: ParsedRRule): string {
  if (parsed.freq === "WEEKLY" && parsed.byDay.length > 0) {
    return ` on ${parsed.byDay.map((d) => DAY_LABELS[d]).join(", ")}`;
  }
  if (parsed.freq === "YEARLY" && parsed.byMonth && parsed.byMonthDay) {
    return ` on month ${parsed.byMonth}, day ${parsed.byMonthDay}`;
  }
  if (parsed.freq === "MONTHLY" && parsed.byMonthDay) {
    return ` on day ${parsed.byMonthDay}`;
  }
  return "";
}

export function describeRRule(rawRule?: string | null): string {
  const parsed = parseRRule(rawRule);
  if (parsed.freq === "NONE") return "Does not repeat (Single occurrence)";
  const rscalePrefix =
    parsed.rscale && parsed.rscale !== "gregory"
      ? `[${parsed.rscale.toUpperCase()}] `
      : "";
  const [singular, plural] = FREQ_UNITS[parsed.freq] || ["Every year", "years"];
  const intervalText =
    parsed.interval === 1 ? singular : `Every ${parsed.interval} ${plural}`;
  const limit = parsed.count
    ? `, ${parsed.count} times`
    : parsed.until
      ? `, until ${parsed.until}`
      : "";
  return `${rscalePrefix}${intervalText}${formatRRuleSuffix(parsed)}${limit}`;
}

function normalizeRRuleObject(
  obj: Record<string, unknown>,
  defaultTimezone: string
): RRuleFieldValue {
  const rrule = typeof obj.rrule === "string" ? obj.rrule : "";
  const parsed = parseRRule(rrule);
  const timezone =
    typeof obj.timezone === "string" && obj.timezone
      ? obj.timezone
      : defaultTimezone;
  const rscale = typeof obj.rscale === "string" ? obj.rscale : parsed.rscale;
  const exdates = Array.isArray(obj.exdates)
    ? obj.exdates.filter((d): d is string => typeof d === "string")
    : [];
  const overrides =
    obj.overrides && typeof obj.overrides === "object"
      ? (obj.overrides as Record<string, OccurrenceOverride>)
      : {};
  return {
    rrule,
    timezone,
    rscale,
    allDay: Boolean(obj.allDay),
    exdates,
    overrides,
  };
}

export function parseRRuleFieldValue(
  raw: unknown,
  defaultTimezone = "UTC"
): RRuleFieldValue {
  const fallback = normalizeRRuleObject({}, defaultTimezone);
  if (!raw) return fallback;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) {
      try {
        const obj = JSON.parse(trimmed) as Record<string, unknown>;
        return normalizeRRuleObject(obj, defaultTimezone);
      } catch {
        return fallback;
      }
    }
    const parsed = parseRRule(trimmed);
    return { ...fallback, rrule: trimmed, rscale: parsed.rscale };
  }
  return typeof raw === "object"
    ? normalizeRRuleObject(raw as Record<string, unknown>, defaultTimezone)
    : fallback;
}

const toDateKeyUTC = (date: Date) => date.toISOString().slice(0, 10);

export interface ExpandedSlot {
  occurrenceDate: string;
  startDate: string;
  endDate: string;
  isRecurring: boolean;
  isOverridden: boolean;
  rscale?: string;
  override?: OccurrenceOverride;
}

type SlotContext = ReturnType<typeof createSlotContext>;

function buildEffectiveSlot(
  candidateDate: Date,
  dateKey: string,
  ctx: SlotContext,
  isRecurring: boolean
): ExpandedSlot | null {
  if (ctx.exdatesSet.has(dateKey)) return null;
  const override = ctx.overridesMap[dateKey];
  if (override?.cancelled) return null;
  const effStart = override?.startDate
    ? new Date(override.startDate)
    : candidateDate;
  const effEnd = override?.endDate
    ? new Date(override.endDate)
    : new Date(effStart.getTime() + ctx.durationMs);
  if (effEnd.getTime() < ctx.winStartMs || effStart.getTime() > ctx.winEndMs)
    return null;
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

function matchesNonGregorianFrequency(
  candidateDate: Date,
  ctx: SlotContext
): boolean {
  const calParts = extractCalendarParts(candidateDate, ctx.effectiveRScale!);
  if (!calParts || !ctx.baseParts) return false;
  const interval = Math.max(1, ctx.parsed.interval);
  if (ctx.parsed.freq === "MONTHLY") {
    const monthsDiff =
      (calParts.year - ctx.baseParts.year) * 12 +
      (calParts.month - ctx.baseParts.month);
    return (
      monthsDiff >= 0 &&
      monthsDiff % interval === 0 &&
      calParts.day === ctx.targetDayOfMonth
    );
  }
  const yearsDiff = calParts.year - ctx.baseParts.year;
  return (
    yearsDiff >= 0 &&
    yearsDiff % interval === 0 &&
    calParts.month === ctx.targetMonth &&
    calParts.day === ctx.targetDayOfMonth
  );
}

function matchesGregorianFrequency(
  candidateDate: Date,
  dayOffset: number,
  ctx: SlotContext
): boolean {
  const { freq, interval } = ctx.parsed;
  if (freq === "DAILY") return dayOffset % interval === 0;
  if (freq === "WEEKLY") {
    const rruleDay = JS_DAY_TO_RRULE_DAY[candidateDate.getUTCDay()];
    const startWeekDay = (ctx.startObj.getUTCDay() + 6) % 7;
    const weekIdx = Math.floor((dayOffset + startWeekDay) / 7);
    return weekIdx % interval === 0 && ctx.targetWeekdays.includes(rruleDay);
  }
  if (freq === "MONTHLY") {
    const monthsDiff =
      (candidateDate.getUTCFullYear() - ctx.startObj.getUTCFullYear()) * 12 +
      (candidateDate.getUTCMonth() - ctx.startObj.getUTCMonth());
    return (
      monthsDiff >= 0 &&
      monthsDiff % interval === 0 &&
      candidateDate.getUTCDate() === ctx.targetDayOfMonth
    );
  }
  const yearsDiff =
    candidateDate.getUTCFullYear() - ctx.startObj.getUTCFullYear();
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
  const isMonthOrYear =
    ctx.parsed.freq === "MONTHLY" || ctx.parsed.freq === "YEARLY";
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
) {
  const isNonGregorianRScale =
    Boolean(effectiveRScale) &&
    effectiveRScale !== "gregory" &&
    effectiveRScale !== "iso8601";
  const baseParts =
    isNonGregorianRScale && effectiveRScale
      ? extractCalendarParts(startObj, effectiveRScale)
      : null;
  const targetMonth =
    parsed.byMonth ??
    (baseParts ? baseParts.month : startObj.getUTCMonth() + 1);
  const targetDayOfMonth =
    parsed.byMonthDay ?? (baseParts ? baseParts.day : startObj.getUTCDate());
  const targetWeekdays =
    parsed.byDay.length > 0
      ? parsed.byDay
      : [JS_DAY_TO_RRULE_DAY[startObj.getUTCDay()]];
  return {
    isNonGregorianRScale,
    baseParts,
    targetMonth,
    targetDayOfMonth,
    targetWeekdays,
  };
}

function createSlotContext(
  params: Parameters<typeof expandRuleSlots>[0] & {
    startObj: Date;
    maxOccurrences: number;
  }
) {
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
  const daysToWinEnd =
    Math.ceil((ctx.winEndMs - ctx.anchorMidnightMs) / 86400000) + 1;
  const maxDayOffset = Math.min(Math.max(daysToWinEnd, 0), 36500);
  const startDayOffset =
    ctx.parsed.count === undefined && !ctx.isNonGregorianRScale
      ? Math.max(
          0,
          Math.floor(
            (ctx.winStartMs - ctx.durationMs - ctx.anchorMidnightMs) / 86400000
          ) - 1
        )
      : 0;
  for (let dayOffset = startDayOffset; dayOffset <= maxDayOffset; dayOffset++) {
    if (generatedCount >= ctx.maxCount || results.length >= ctx.maxOccurrences)
      break;
    const candidateDate = new Date(
      ctx.anchorMidnightMs + dayOffset * 86400000 + ctx.timeOffsetMs
    );
    const candidateMs = candidateDate.getTime();
    if (candidateMs > ctx.untilMs || candidateMs > ctx.winEndMs) break;
    if (!matchesCandidateRule(candidateDate, dayOffset, ctx)) continue;
    generatedCount++;
    const slot = buildEffectiveSlot(
      candidateDate,
      toDateKeyUTC(candidateDate),
      ctx,
      true
    );
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
  if (ctx.parsed.freq === "NONE") {
    const slot = buildEffectiveSlot(
      startObj,
      toDateKeyUTC(startObj),
      ctx,
      false
    );
    return slot ? [slot] : [];
  }
  return scanRecurringSlots(ctx);
}
