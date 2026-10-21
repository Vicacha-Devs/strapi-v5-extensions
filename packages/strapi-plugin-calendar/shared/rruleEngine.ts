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
  0: 'SU',
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
};

export function parseRRule(rawRule?: string | null): ParsedRRule {
  const defaultParsed: ParsedRRule = {
    freq: 'NONE',
    interval: 1,
    byDay: [],
  };

  if (!rawRule || typeof rawRule !== 'string') {
    return defaultParsed;
  }

  const cleaned = rawRule.trim().replace(/^RRULE:/i, '');
  if (!cleaned) {
    return defaultParsed;
  }

  const parts = cleaned.split(';');
  const parsed: ParsedRRule = { ...defaultParsed };

  for (const part of parts) {
    const [rawKey, rawVal] = part.split('=');
    if (!rawKey || !rawVal) continue;
    const key = rawKey.trim().toUpperCase();
    const val = rawVal.trim().toUpperCase();

    if (key === 'RSCALE' && val) {
      parsed.rscale = val.toLowerCase();
    } else if (key === 'FREQ' && VALID_FREQUENCIES.includes(val as RRuleFrequency)) {
      parsed.freq = val as RRuleFrequency;
    } else if (key === 'INTERVAL') {
      const n = Number.parseInt(val, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 365) {
        parsed.interval = n;
      }
    } else if (key === 'BYDAY') {
      parsed.byDay = val
        .split(',')
        .map((d) => d.trim().slice(-2) as RRuleWeekday)
        .filter((d) => VALID_WEEKDAYS.includes(d));
    } else if (key === 'BYMONTH') {
      const m = Number.parseInt(val, 10);
      if (Number.isFinite(m) && m >= 1 && m <= 13) {
        parsed.byMonth = m;
      }
    } else if (key === 'BYMONTHDAY') {
      const md = Number.parseInt(val, 10);
      if (Number.isFinite(md) && md >= 1 && md <= 31) {
        parsed.byMonthDay = md;
      }
    } else if (key === 'COUNT') {
      const c = Number.parseInt(val, 10);
      if (Number.isFinite(c) && c >= 1 && c <= 1000) {
        parsed.count = c;
      }
    } else if (key === 'UNTIL') {
      if (/^\d{8}T\d{6}Z?$/.test(val)) {
        parsed.until = `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
      } else if (/^\d{8}$/.test(val)) {
        parsed.until = `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
      } else if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
        parsed.until = val.slice(0, 10);
      }
    }
  }

  return parsed;
}

export function buildRRule(parsed: ParsedRRule): string {
  if (!parsed || parsed.freq === 'NONE') {
    return '';
  }

  const segments: string[] = [];
  if (parsed.rscale && parsed.rscale !== 'gregory' && parsed.rscale !== 'iso8601') {
    segments.push(`RSCALE=${parsed.rscale.toUpperCase()}`);
  }
  segments.push(`FREQ=${parsed.freq}`);

  const interval = Math.max(1, Math.floor(parsed.interval || 1));
  segments.push(`INTERVAL=${interval}`);

  if (parsed.freq === 'WEEKLY' && Array.isArray(parsed.byDay) && parsed.byDay.length > 0) {
    const validDays = parsed.byDay.filter((d) => VALID_WEEKDAYS.includes(d));
    if (validDays.length > 0) {
      segments.push(`BYDAY=${validDays.join(',')}`);
    }
  }

  if (
    parsed.freq === 'YEARLY' &&
    typeof parsed.byMonth === 'number' &&
    parsed.byMonth >= 1 &&
    parsed.byMonth <= 13
  ) {
    segments.push(`BYMONTH=${Math.floor(parsed.byMonth)}`);
  }

  if (
    (parsed.freq === 'MONTHLY' || parsed.freq === 'YEARLY') &&
    typeof parsed.byMonthDay === 'number' &&
    parsed.byMonthDay >= 1 &&
    parsed.byMonthDay <= 31
  ) {
    segments.push(`BYMONTHDAY=${Math.floor(parsed.byMonthDay)}`);
  }

  if (typeof parsed.count === 'number' && parsed.count >= 1) {
    segments.push(`COUNT=${Math.floor(parsed.count)}`);
  } else if (parsed.until && /^\d{4}-\d{2}-\d{2}$/.test(parsed.until)) {
    const compact = parsed.until.replace(/-/g, '');
    segments.push(`UNTIL=${compact}T235959Z`);
  }

  return segments.join(';');
}

export function describeRRule(rawRule?: string | null): string {
  const parsed = parseRRule(rawRule);
  if (parsed.freq === 'NONE') {
    return 'Does not repeat (Single occurrence)';
  }

  const rscalePrefix =
    parsed.rscale && parsed.rscale !== 'gregory'
      ? `[${parsed.rscale.toUpperCase()}] `
      : '';

  const intervalText =
    parsed.interval === 1
      ? parsed.freq === 'DAILY'
        ? 'Every day'
        : parsed.freq === 'WEEKLY'
          ? 'Every week'
          : parsed.freq === 'MONTHLY'
            ? 'Every month'
            : 'Every year'
      : `Every ${parsed.interval} ${
          parsed.freq === 'DAILY'
            ? 'days'
            : parsed.freq === 'WEEKLY'
              ? 'weeks'
              : parsed.freq === 'MONTHLY'
                ? 'months'
                : 'years'
        }`;

  const dayMap: Record<RRuleWeekday, string> = {
    MO: 'Mon',
    TU: 'Tue',
    WE: 'Wed',
    TH: 'Thu',
    FR: 'Fri',
    SA: 'Sat',
    SU: 'Sun',
  };

  let suffix = '';
  if (parsed.freq === 'WEEKLY' && parsed.byDay.length > 0) {
    suffix = ` on ${parsed.byDay.map((d) => dayMap[d]).join(', ')}`;
  } else if (parsed.freq === 'YEARLY' && parsed.byMonth && parsed.byMonthDay) {
    suffix = ` on month ${parsed.byMonth}, day ${parsed.byMonthDay}`;
  } else if (parsed.freq === 'MONTHLY' && parsed.byMonthDay) {
    suffix = ` on day ${parsed.byMonthDay}`;
  }

  let limit = '';
  if (parsed.count) {
    limit = `, ${parsed.count} times`;
  } else if (parsed.until) {
    limit = `, until ${parsed.until}`;
  }

  return `${rscalePrefix}${intervalText}${suffix}${limit}`;
}

export function parseRRuleFieldValue(
  raw: unknown,
  defaultTimezone = 'UTC'
): RRuleFieldValue {
  const fallback: RRuleFieldValue = {
    rrule: '',
    timezone: defaultTimezone,
    allDay: false,
    exdates: [],
    overrides: {},
  };

  if (!raw) return fallback;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try {
        const obj = JSON.parse(trimmed) as Partial<RRuleFieldValue>;
        const parsed = parseRRule(typeof obj.rrule === 'string' ? obj.rrule : '');
        return {
          rrule: typeof obj.rrule === 'string' ? obj.rrule : '',
          timezone: typeof obj.timezone === 'string' && obj.timezone ? obj.timezone : defaultTimezone,
          rscale: typeof obj.rscale === 'string' ? obj.rscale : parsed.rscale,
          allDay: Boolean(obj.allDay),
          exdates: Array.isArray(obj.exdates)
            ? obj.exdates.filter((d): d is string => typeof d === 'string')
            : [],
          overrides:
            obj.overrides && typeof obj.overrides === 'object' ? obj.overrides : {},
        };
      } catch {
        return fallback;
      }
    }
    const parsed = parseRRule(trimmed);
    return {
      ...fallback,
      rrule: trimmed,
      rscale: parsed.rscale,
    };
  }

  if (typeof raw === 'object') {
    const obj = raw as Partial<RRuleFieldValue>;
    const rruleStr = typeof obj.rrule === 'string' ? obj.rrule : '';
    const parsed = parseRRule(rruleStr);
    return {
      rrule: rruleStr,
      timezone: typeof obj.timezone === 'string' && obj.timezone ? obj.timezone : defaultTimezone,
      rscale: typeof obj.rscale === 'string' ? obj.rscale : parsed.rscale,
      allDay: Boolean(obj.allDay),
      exdates: Array.isArray(obj.exdates)
        ? obj.exdates.filter((d): d is string => typeof d === 'string')
        : [],
      overrides: obj.overrides && typeof obj.overrides === 'object' ? obj.overrides : {},
    };
  }

  return fallback;
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

function toDateKeyUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Expands either a single occurrence or an RFC 5545 / RFC 7529 (RSCALE) recurring series
 * within [windowStart, windowEnd], applying exdates and per-occurrence overrides.
 */
export function expandRuleSlots(params: {
  baseStartDate: string;
  baseEndDate?: string | null;
  recurrence?: RRuleFieldValue | null;
  windowStart: string;
  windowEnd: string;
  maxOccurrences?: number;
}): ExpandedSlot[] {
  const {
    baseStartDate,
    baseEndDate,
    recurrence,
    windowStart,
    windowEnd,
    maxOccurrences = 366,
  } = params;

  const startObj = new Date(baseStartDate);
  if (Number.isNaN(startObj.getTime())) {
    return [];
  }

  const endObj =
    baseEndDate && !Number.isNaN(new Date(baseEndDate).getTime())
      ? new Date(baseEndDate)
      : new Date(startObj.getTime() + 60 * 60 * 1000);

  const durationMs = Math.max(0, endObj.getTime() - startObj.getTime());
  const winStartMs = new Date(windowStart).getTime();
  const winEndMs = new Date(windowEnd).getTime();

  const parsed = parseRRule(recurrence?.rrule);
  const exdatesSet = new Set(recurrence?.exdates ?? []);
  const overridesMap = recurrence?.overrides ?? {};
  const effectiveRScale = recurrence?.rscale || parsed.rscale;

  // Non-recurring entry
  if (parsed.freq === 'NONE') {
    const dateKey = toDateKeyUTC(startObj);
    if (exdatesSet.has(dateKey)) {
      return [];
    }
    const override = overridesMap[dateKey];
    if (override?.cancelled) {
      return [];
    }
    const effStart = override?.startDate ? new Date(override.startDate) : startObj;
    const effEnd = override?.endDate
      ? new Date(override.endDate)
      : new Date(effStart.getTime() + durationMs);

    if (effEnd.getTime() < winStartMs || effStart.getTime() > winEndMs) {
      return [];
    }

    return [
      {
        occurrenceDate: dateKey,
        startDate: effStart.toISOString(),
        endDate: effEnd.toISOString(),
        isRecurring: false,
        isOverridden: Boolean(override),
        override,
      },
    ];
  }

  const results: ExpandedSlot[] = [];
  const untilMs = parsed.until
    ? new Date(`${parsed.until}T23:59:59.999Z`).getTime()
    : Number.POSITIVE_INFINITY;
  const maxCount = parsed.count ?? maxOccurrences;

  const baseHours = startObj.getUTCHours();
  const baseMinutes = startObj.getUTCMinutes();
  const baseSeconds = startObj.getUTCSeconds();

  const isNonGregorianRScale =
    Boolean(effectiveRScale) &&
    effectiveRScale !== 'gregory' &&
    effectiveRScale !== 'iso8601';

  const baseCalendarParts = isNonGregorianRScale
    ? extractCalendarParts(startObj, effectiveRScale!)
    : {
        year: startObj.getUTCFullYear(),
        month: startObj.getUTCMonth() + 1,
        day: startObj.getUTCDate(),
      };

  const targetMonth = parsed.byMonth ?? baseCalendarParts?.month ?? startObj.getUTCMonth() + 1;
  const targetDayOfMonth =
    parsed.byMonthDay ?? baseCalendarParts?.day ?? startObj.getUTCDate();
  const targetWeekdays: RRuleWeekday[] =
    parsed.byDay.length > 0
      ? parsed.byDay
      : [JS_DAY_TO_RRULE_DAY[startObj.getUTCDay()]];

  const anchorMidnightMs = Date.UTC(
    startObj.getUTCFullYear(),
    startObj.getUTCMonth(),
    startObj.getUTCDate()
  );

  let generatedCount = 0;
  const maxDaysToScan = 1460; // up to 4 years

  for (let dayOffset = 0; dayOffset <= maxDaysToScan; dayOffset++) {
    if (generatedCount >= maxCount || results.length >= maxOccurrences) {
      break;
    }

    const candidateDate = new Date(
      anchorMidnightMs +
        dayOffset * 86_400_000 +
        baseHours * 3_600_000 +
        baseMinutes * 60_000 +
        baseSeconds * 1_000
    );

    const candidateMs = candidateDate.getTime();
    if (candidateMs > untilMs || candidateMs > winEndMs) {
      break;
    }

    let matchesRule = false;

    if (isNonGregorianRScale && (parsed.freq === 'MONTHLY' || parsed.freq === 'YEARLY')) {
      const calParts = extractCalendarParts(candidateDate, effectiveRScale!);
      if (calParts) {
        if (parsed.freq === 'MONTHLY') {
          matchesRule = calParts.day === targetDayOfMonth;
        } else if (parsed.freq === 'YEARLY') {
          matchesRule =
            calParts.month === targetMonth && calParts.day === targetDayOfMonth;
        }
      }
    } else if (parsed.freq === 'DAILY') {
      matchesRule = dayOffset % parsed.interval === 0;
    } else if (parsed.freq === 'WEEKLY') {
      const weekIndex = Math.floor(dayOffset / 7);
      const rruleDay = JS_DAY_TO_RRULE_DAY[candidateDate.getUTCDay()];
      matchesRule =
        weekIndex % parsed.interval === 0 && targetWeekdays.includes(rruleDay);
    } else if (parsed.freq === 'MONTHLY') {
      const monthsDiff =
        (candidateDate.getUTCFullYear() - startObj.getUTCFullYear()) * 12 +
        (candidateDate.getUTCMonth() - startObj.getUTCMonth());
      matchesRule =
        monthsDiff >= 0 &&
        monthsDiff % parsed.interval === 0 &&
        candidateDate.getUTCDate() === targetDayOfMonth;
    } else if (parsed.freq === 'YEARLY') {
      const yearsDiff = candidateDate.getUTCFullYear() - startObj.getUTCFullYear();
      matchesRule =
        yearsDiff >= 0 &&
        yearsDiff % parsed.interval === 0 &&
        candidateDate.getUTCMonth() + 1 === targetMonth &&
        candidateDate.getUTCDate() === targetDayOfMonth;
    }

    if (!matchesRule) {
      continue;
    }

    generatedCount++;

    const dateKey = toDateKeyUTC(candidateDate);
    if (exdatesSet.has(dateKey)) {
      continue;
    }

    const override = overridesMap[dateKey];
    if (override?.cancelled) {
      continue;
    }

    const effStart = override?.startDate
      ? new Date(override.startDate)
      : candidateDate;
    const effEnd = override?.endDate
      ? new Date(override.endDate)
      : new Date(effStart.getTime() + durationMs);

    if (effEnd.getTime() < winStartMs || effStart.getTime() > winEndMs) {
      continue;
    }

    results.push({
      occurrenceDate: dateKey,
      startDate: effStart.toISOString(),
      endDate: effEnd.toISOString(),
      isRecurring: true,
      isOverridden: Boolean(override),
      rscale: effectiveRScale,
      override,
    });
  }

  return results;
}
