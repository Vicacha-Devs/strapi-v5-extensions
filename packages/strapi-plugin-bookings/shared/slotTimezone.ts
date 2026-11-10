import type {
  BlackoutPeriod,
  BookingResource,
  DailyTimeWindow,
  DayOfWeekKey,
  HolidayScheduleRule,
  SeasonalScheduleOverride,
  WeeklyScheduleConfig,
} from "./types";

export const DEFAULT_WEEKLY_SCHEDULE: WeeklyScheduleConfig = {
  mode: "interval",
  days: {
    "1": [{ start: "09:00", end: "17:00", label: "09:00-17:00" }],
    "2": [{ start: "09:00", end: "17:00", label: "09:00-17:00" }],
    "3": [{ start: "09:00", end: "17:00", label: "09:00-17:00" }],
    "4": [{ start: "09:00", end: "17:00", label: "09:00-17:00" }],
    "5": [{ start: "09:00", end: "17:00", label: "09:00-17:00" }],
  },
};

const WEEKDAY_TO_KEY: Record<string, DayOfWeekKey> = {
  Sun: "0",
  Mon: "1",
  Tue: "2",
  Wed: "3",
  Thu: "4",
  Fri: "5",
  Sat: "6",
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getZonedFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  if (formatterCache.size > 128) {
    formatterCache.clear();
  }
  formatterCache.set(timeZone, dtf);
  return dtf;
}

export function normalizeTimeZone(tz?: string): string {
  const trimmed = typeof tz === "string" ? tz.trim() : "";
  if (!trimmed) return "UTC";
  try {
    getZonedFormatter(trimmed);
    return trimmed;
  } catch {
    return "UTC";
  }
}

export interface ZonedWallClock {
  year: number;
  month: number;
  day: number;
  dateStr: string;
  dayKey: DayOfWeekKey;
  hours: number;
  minutes: number;
  seconds: number;
  ms: number;
  minutesOfDay: number;
}

export function extractZonedWallClock(
  epochMs: number,
  rawTimeZone?: string
): ZonedWallClock {
  const timeZone = normalizeTimeZone(rawTimeZone);
  const dtf = getZonedFormatter(timeZone);
  const parts = dtf.formatToParts(new Date(epochMs));
  let year = 1970;
  let month = 1;
  let day = 1;
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let dayKey: DayOfWeekKey = "4";

  for (const part of parts) {
    if (part.type === "year") year = Number.parseInt(part.value, 10);
    else if (part.type === "month") month = Number.parseInt(part.value, 10);
    else if (part.type === "day") day = Number.parseInt(part.value, 10);
    else if (part.type === "hour") {
      const h = Number.parseInt(part.value, 10);
      hours = h === 24 ? 0 : h;
    } else if (part.type === "minute") {
      minutes = Number.parseInt(part.value, 10);
    } else if (part.type === "second") {
      seconds = Number.parseInt(part.value, 10);
    } else if (part.type === "weekday") {
      dayKey = WEEKDAY_TO_KEY[part.value] ?? "0";
    }
  }

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
  const ms = ((epochMs % 1000) + 1000) % 1000;

  return {
    year,
    month,
    day,
    dateStr,
    dayKey,
    hours,
    minutes,
    seconds,
    ms,
    minutesOfDay: hours * 60 + minutes,
  };
}

function getTimeZoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = extractZonedWallClock(instantMs, timeZone);
  const zonedAsUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hours,
    parts.minutes,
    parts.seconds,
    0
  );
  const truncatedInstant = Math.floor(instantMs / 1000) * 1000;
  return zonedAsUtcMs - truncatedInstant;
}

export function parseIsoDateYmd(
  dateStr: string
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/**
 * Resolves a local wall-clock `(dateStr, totalMinutes)` in `timeZone` to UTC epoch ms.
 * When `strictGap` is true, returns `null` if the local wall-clock falls inside a
 * non-existent Spring-Forward DST transition gap (e.g. 02:30 on US DST start).
 */
export function wallClockToUtcMs(
  dateStr: string,
  totalMinutes: number,
  rawTimeZone?: string,
  strictGap = false
): number | null {
  const ymd = parseIsoDateYmd(dateStr);
  if (!ymd) return null;
  const timeZone = normalizeTimeZone(rawTimeZone);
  const extraDays = Math.floor(totalMinutes / 1440);
  const remMins = ((totalMinutes % 1440) + 1440) % 1440;
  const targetUtcMidnight = Date.UTC(
    ymd.year,
    ymd.month - 1,
    ymd.day + extraDays,
    0,
    0,
    0,
    0
  );
  const naiveUtcMs = targetUtcMidnight + remMins * 60_000;
  const offset1 = getTimeZoneOffsetMs(naiveUtcMs, timeZone);
  const guess1 = naiveUtcMs - offset1;
  const offset2 = getTimeZoneOffsetMs(guess1, timeZone);
  const guess2 = naiveUtcMs - offset2;

  const targetDateObj = new Date(targetUtcMidnight);
  const expectedDateStr = targetDateObj.toISOString().slice(0, 10);
  const check2 = extractZonedWallClock(guess2, timeZone);

  if (check2.dateStr === expectedDateStr && check2.minutesOfDay === remMins) {
    return guess2;
  }
  const check1 = extractZonedWallClock(guess1, timeZone);
  if (check1.dateStr === expectedDateStr && check1.minutesOfDay === remMins) {
    return guess1;
  }
  return strictGap ? null : guess1;
}

export function parsePeriodTimestampInZone(
  raw: string,
  endOfDay: boolean,
  rawTimeZone?: string
): number {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const ms = wallClockToUtcMs(
      trimmed,
      endOfDay ? 1440 : 0,
      rawTimeZone,
      false
    );
    if (ms === null) return Number.NaN;
    return endOfDay ? ms - 1 : ms;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    if (!parseIsoDateYmd(trimmed.slice(0, 10))) {
      return Number.NaN;
    }
  }
  return Date.parse(trimmed);
}

export function enumerateLocalDatesInRange(
  rangeStartMs: number,
  rangeEndMs: number,
  rawTimeZone?: string,
  maxDays = 366
): Array<{ dateStr: string; dayKey: DayOfWeekKey }> {
  const timeZone = normalizeTimeZone(rawTimeZone);
  const startWall = extractZonedWallClock(rangeStartMs, timeZone);
  const endWall = extractZonedWallClock(rangeEndMs, timeZone);
  const startUtcDay = Date.UTC(
    startWall.year,
    startWall.month - 1,
    startWall.day
  );
  const endUtcDay = Date.UTC(endWall.year, endWall.month - 1, endWall.day);
  const results: Array<{ dateStr: string; dayKey: DayOfWeekKey }> = [];

  for (
    let cursorUtc = startUtcDay, count = 0;
    cursorUtc <= endUtcDay && count < maxDays;
    cursorUtc += 86_400_000, count += 1
  ) {
    const d = new Date(cursorUtc);
    results.push({
      dateStr: d.toISOString().slice(0, 10),
      dayKey: String(d.getUTCDay()) as DayOfWeekKey,
    });
  }
  return results;
}

export function parseTimeMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return 9 * 60;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hours === 24 && minutes === 0) return 1440;
  const clampedH = Math.min(23, Math.max(0, hours));
  const clampedM = Math.min(59, Math.max(0, minutes));
  return clampedH * 60 + clampedM;
}

export function formatTimeMinutes(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, totalMinutes));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function extractMonthDay(dateOrMmDd: string): string {
  const trimmed = dateOrMmDd.trim();
  const isoDay = trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return isoDay.slice(5, 10);
  if (/^\d{2}-\d{2}$/.test(isoDay)) return isoDay;
  return "";
}

function matchesYearlessRange(
  dateStr: string,
  startStr: string,
  endStr: string
): boolean {
  const [t, s, e] = [dateStr, startStr, endStr].map(extractMonthDay);
  if (!t || !s || !e) return false;
  return s <= e ? t >= s && t <= e : t >= s || t <= e;
}

export function matchesDateOrYearlessRange(
  dateStr: string,
  startStr: string,
  endStr: string,
  yearless = false
): boolean {
  if (!dateStr || !startStr || !endStr) return false;
  if (yearless) return matchesYearlessRange(dateStr, startStr, endStr);
  const [t, s, e] = [dateStr, startStr, endStr].map((d) =>
    d.trim().slice(0, 10)
  );
  return t >= s && t <= e;
}

export function matchesSingleDateOrYearless(
  dateStr: string,
  ruleDateStr: string,
  yearless = false
): boolean {
  return matchesDateOrYearlessRange(
    dateStr,
    ruleDateStr,
    ruleDateStr,
    yearless
  );
}

export function isSlotBlackedOut(
  slotStartMs: number,
  slotEndMs: number,
  blackoutDates: BlackoutPeriod[],
  rawTimeZone?: string
): boolean {
  const timeZone = normalizeTimeZone(rawTimeZone);
  const slotDateStr = extractZonedWallClock(slotStartMs, timeZone).dateStr;
  return blackoutDates.some((period) => {
    if (!period?.start || !period?.end) return false;
    if (period.yearless) {
      return matchesDateOrYearlessRange(
        slotDateStr,
        period.start,
        period.end,
        true
      );
    }
    const startMs = parsePeriodTimestampInZone(period.start, false, timeZone);
    const endMs = parsePeriodTimestampInZone(period.end, true, timeZone);
    return (
      !Number.isNaN(startMs) &&
      !Number.isNaN(endMs) &&
      slotStartMs < endMs &&
      slotEndMs > startMs
    );
  });
}

export interface ResolvedDailySchedule {
  mode: "interval" | "window";
  durationMins: number;
  windows: DailyTimeWindow[];
  scheduleLabel?: string;
}

function findMatchingHoliday(
  dateStr: string,
  globalHolidays: HolidayScheduleRule[] = [],
  resourceHolidays: HolidayScheduleRule[] = []
): HolidayScheduleRule | undefined {
  return [
    ...(Array.isArray(globalHolidays) ? globalHolidays : []),
    ...(Array.isArray(resourceHolidays) ? resourceHolidays : []),
  ]
    .filter(
      (r) =>
        Boolean(r?.date) &&
        matchesSingleDateOrYearless(dateStr, r.date, Boolean(r.yearless))
    )
    .pop();
}

function findWinningSeasonalSchedule(
  dateStr: string,
  globalSeasonalSchedules: SeasonalScheduleOverride[] = [],
  resourceSeasonals: SeasonalScheduleOverride[] = []
): SeasonalScheduleOverride | undefined {
  return [
    ...(Array.isArray(globalSeasonalSchedules) ? globalSeasonalSchedules : []),
    ...(Array.isArray(resourceSeasonals) ? resourceSeasonals : []),
  ]
    .filter(
      (s) =>
        s?.schedule &&
        matchesDateOrYearlessRange(
          dateStr,
          s.startDate,
          s.endDate,
          Boolean(s.yearless)
        )
    )
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .pop();
}

export function resolveDailyScheduleForDate(
  dateStr: string,
  dayKey: DayOfWeekKey,
  resource: BookingResource,
  globalSeasonalSchedules: SeasonalScheduleOverride[] = [],
  globalHolidays: HolidayScheduleRule[] = []
): ResolvedDailySchedule {
  const baseSchedule = resource.weeklySchedule?.days
    ? resource.weeklySchedule
    : DEFAULT_WEEKLY_SCHEDULE;
  const baseMode = baseSchedule.mode ?? "interval";
  const baseDurationMins = Math.max(5, resource.slotDurationMinutes || 60);
  const holiday = findMatchingHoliday(
    dateStr,
    globalHolidays,
    resource.holidayRules
  );
  if (holiday) {
    const hasCustom =
      Array.isArray(holiday.windows) && holiday.windows.length > 0;
    const isClosed = (holiday.isClosed ?? !hasCustom) || !hasCustom;
    return {
      mode: isClosed ? baseMode : (holiday.mode ?? baseMode),
      durationMins: baseDurationMins,
      windows: isClosed ? [] : (holiday.windows ?? []),
      scheduleLabel: holiday.name,
    };
  }
  const seasonal = findWinningSeasonalSchedule(
    dateStr,
    globalSeasonalSchedules,
    resource.seasonalSchedules
  );
  if (seasonal) {
    return {
      mode: seasonal.schedule.mode ?? baseMode,
      durationMins: Math.max(
        5,
        seasonal.slotDurationMinutes ?? baseDurationMins
      ),
      windows: seasonal.schedule.days?.[dayKey] ?? [],
      scheduleLabel: seasonal.label,
    };
  }
  return {
    mode: baseMode,
    durationMins: baseDurationMins,
    windows: baseSchedule.days?.[dayKey] ?? [],
  };
}
