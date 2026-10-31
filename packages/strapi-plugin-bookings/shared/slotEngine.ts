import { formatSecondaryCalendars } from "./calendarSystems";
import type {
  AssignableHost,
  AvailableSlot,
  BlackoutPeriod,
  BookingRecord,
  BookingResource,
  DailyTimeWindow,
  DayOfWeekKey,
  HolidayScheduleRule,
  SeasonalScheduleOverride,
  SecondaryCalendarConfig,
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

export function parseTimeMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return 9 * 60;
  const hours = Math.min(23, Math.max(0, Number.parseInt(match[1], 10)));
  const minutes = Math.min(59, Math.max(0, Number.parseInt(match[2], 10)));
  return hours * 60 + minutes;
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

function matchesYearlessRange(dateStr: string, startStr: string, endStr: string): boolean {
  const targetMmDd = extractMonthDay(dateStr);
  const startMmDd = extractMonthDay(startStr);
  const endMmDd = extractMonthDay(endStr);
  if (!targetMmDd || !startMmDd || !endMmDd) return false;
  if (startMmDd <= endMmDd) return targetMmDd >= startMmDd && targetMmDd <= endMmDd;
  return targetMmDd >= startMmDd || targetMmDd <= endMmDd;
}

export function matchesDateOrYearlessRange(
  dateStr: string,
  startStr: string,
  endStr: string,
  yearless = false
): boolean {
  if (!dateStr || !startStr || !endStr) return false;
  if (yearless) return matchesYearlessRange(dateStr, startStr, endStr);
  const targetDay = dateStr.trim().slice(0, 10);
  const startDay = startStr.trim().slice(0, 10);
  const endDay = endStr.trim().slice(0, 10);
  return targetDay >= startDay && targetDay <= endDay;
}

export function matchesSingleDateOrYearless(
  dateStr: string,
  ruleDateStr: string,
  yearless = false
): boolean {
  return matchesDateOrYearlessRange(dateStr, ruleDateStr, ruleDateStr, yearless);
}

function parsePeriodTimestamp(raw: string, endOfDay: boolean): number {
  const trimmed = raw.trim();
  if (trimmed.length === 10) {
    return Date.parse(`${trimmed}T${endOfDay ? "23:59:59.999Z" : "00:00:00.000Z"}`);
  }
  return Date.parse(trimmed);
}

function doesPeriodBlackOutSlot(
  period: BlackoutPeriod,
  slotDateStr: string,
  slotStartMs: number,
  slotEndMs: number
): boolean {
  if (!period.start || !period.end) return false;
  if (period.yearless)
    return matchesDateOrYearlessRange(slotDateStr, period.start, period.end, true);
  const startMs = parsePeriodTimestamp(period.start, false);
  const endMs = parsePeriodTimestamp(period.end, true);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return false;
  return slotStartMs < endMs && slotEndMs > startMs;
}

export function isSlotBlackedOut(
  slotStartMs: number,
  slotEndMs: number,
  blackoutDates: BlackoutPeriod[]
): boolean {
  const slotDateStr = new Date(slotStartMs).toISOString().slice(0, 10);
  return blackoutDates.some((period) =>
    doesPeriodBlackOutSlot(period, slotDateStr, slotStartMs, slotEndMs)
  );
}

export interface ResolvedDailySchedule {
  mode: "interval" | "window";
  durationMins: number;
  windows: DailyTimeWindow[];
  scheduleLabel?: string;
}

function findMatchingHoliday(
  dateStr: string,
  globalHolidays: HolidayScheduleRule[],
  resourceHolidays?: HolidayScheduleRule[]
): HolidayScheduleRule | undefined {
  const combined = [
    ...(Array.isArray(globalHolidays) ? globalHolidays : []),
    ...(Array.isArray(resourceHolidays) ? resourceHolidays : []),
  ];
  let matched: HolidayScheduleRule | undefined;
  for (const rule of combined) {
    if (rule?.date && matchesSingleDateOrYearless(dateStr, rule.date, Boolean(rule.yearless))) {
      matched = rule;
    }
  }
  return matched;
}

function buildHolidayDailySchedule(
  holiday: HolidayScheduleRule,
  baseMode: "interval" | "window",
  baseDurationMins: number
): ResolvedDailySchedule {
  const hasCustomWindows = Array.isArray(holiday.windows) && holiday.windows.length > 0;
  const isClosed = (holiday.isClosed ?? !hasCustomWindows) || !hasCustomWindows;
  return {
    mode: isClosed ? baseMode : (holiday.mode ?? baseMode),
    durationMins: baseDurationMins,
    windows: isClosed ? [] : (holiday.windows ?? []),
    scheduleLabel: holiday.name,
  };
}

function findWinningSeasonalSchedule(
  dateStr: string,
  globalSeasonalSchedules: SeasonalScheduleOverride[],
  resourceSeasonals?: SeasonalScheduleOverride[]
): SeasonalScheduleOverride | undefined {
  const combined = [
    ...(Array.isArray(globalSeasonalSchedules) ? globalSeasonalSchedules : []),
    ...(Array.isArray(resourceSeasonals) ? resourceSeasonals : []),
  ];
  const matching = combined.filter(
    (s) =>
      s?.schedule &&
      matchesDateOrYearlessRange(dateStr, s.startDate, s.endDate, Boolean(s.yearless))
  );
  if (matching.length === 0) return undefined;
  matching.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  return matching[matching.length - 1];
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
  const matchedHoliday = findMatchingHoliday(dateStr, globalHolidays, resource.holidayRules);
  if (matchedHoliday) {
    return buildHolidayDailySchedule(matchedHoliday, baseMode, baseDurationMins);
  }
  const winningSeasonal = findWinningSeasonalSchedule(
    dateStr,
    globalSeasonalSchedules,
    resource.seasonalSchedules
  );
  if (winningSeasonal) {
    return {
      mode: winningSeasonal.schedule.mode ?? baseMode,
      durationMins: Math.max(5, winningSeasonal.slotDurationMinutes ?? baseDurationMins),
      windows: winningSeasonal.schedule.days?.[dayKey] ?? [],
      scheduleLabel: winningSeasonal.label,
    };
  }
  return {
    mode: baseMode,
    durationMins: baseDurationMins,
    windows: baseSchedule.days?.[dayKey] ?? [],
  };
}

export function isActiveBookingStatus(status: BookingRecord["status"]): boolean {
  return status === "pending" || status === "confirmed";
}

export function doesBookingOverlapSlot(
  booking: Pick<BookingRecord, "startDate" | "endDate" | "status">,
  slotStartMs: number,
  slotEndMs: number,
  bufferBeforeMinutes = 0,
  bufferAfterMinutes = 0
): boolean {
  if (!isActiveBookingStatus(booking.status)) return false;
  const bStart = Date.parse(booking.startDate);
  const bEnd = Date.parse(booking.endDate);
  if (Number.isNaN(bStart) || Number.isNaN(bEnd)) return false;
  const effectiveBookingStart = bStart - bufferBeforeMinutes * 60_000;
  const effectiveBookingEnd = bEnd + bufferAfterMinutes * 60_000;
  return slotStartMs < effectiveBookingEnd && slotEndMs > effectiveBookingStart;
}

export function selectAvailableHostsForSlot(
  resource: BookingResource,
  overlappingBookings: BookingRecord[],
  preferredLanguage?: string
): AssignableHost[] {
  const hosts = Array.isArray(resource.assignedHosts) ? resource.assignedHosts : [];
  if (hosts.length === 0) return [];
  const busyHostNamesOrIds = new Set(
    overlappingBookings
      .map((b) => b.assignedHost?.trim().toLowerCase())
      .filter((v): v is string => Boolean(v))
  );
  const freeHosts = hosts.filter((host) => {
    const idKey = host.id.trim().toLowerCase();
    const nameKey = host.name.trim().toLowerCase();
    return !busyHostNamesOrIds.has(idKey) && !busyHostNamesOrIds.has(nameKey);
  });
  if (!preferredLanguage) return freeHosts;
  const normalizedLang = preferredLanguage.trim().toLowerCase();
  const matchingLang = freeHosts.filter(
    (host) =>
      Array.isArray(host.languages) &&
      host.languages.some((l) => l.trim().toLowerCase() === normalizedLang)
  );
  return matchingLang.length > 0 ? matchingLang : freeHosts;
}

export interface ComputeAvailableSlotsParams {
  resource: BookingResource;
  from: string;
  to: string;
  existingBookings: BookingRecord[];
  partySize?: number;
  preferredLanguage?: string;
  secondaryCalendars?: SecondaryCalendarConfig[];
  globalSeasonalSchedules?: SeasonalScheduleOverride[];
  globalHolidays?: HolidayScheduleRule[];
  referenceNow?: Date;
}

interface CandidateTimeBlock {
  startMins: number;
  endMins: number;
  label: string;
  capacity: number;
}

function buildWindowCandidateBlocks(
  win: DailyTimeWindow,
  mode: "interval" | "window",
  durationMins: number,
  bufferBefore: number,
  bufferAfter: number,
  defaultCapacity: number
): CandidateTimeBlock[] {
  const winStartMins = parseTimeMinutes(win.start);
  const winEndMins = parseTimeMinutes(win.end);
  if (winEndMins <= winStartMins) return [];
  const cap = win.capacity ?? defaultCapacity;
  if (mode === "window") {
    return [
      {
        startMins: winStartMins,
        endMins: winEndMins,
        label: win.label || `${win.start}-${win.end}`,
        capacity: cap,
      },
    ];
  }
  const blocks: CandidateTimeBlock[] = [];
  const stepMins = Math.max(5, durationMins + bufferBefore + bufferAfter);
  for (
    let cursorMins = winStartMins;
    cursorMins + durationMins <= winEndMins;
    cursorMins += stepMins
  ) {
    const blockEndMins = cursorMins + durationMins;
    const isExactMatch = Boolean(win.label && winStartMins + durationMins === winEndMins);
    const label = isExactMatch
      ? String(win.label)
      : `${formatTimeMinutes(cursorMins)}-${formatTimeMinutes(blockEndMins)}`;
    blocks.push({ startMins: cursorMins, endMins: blockEndMins, label, capacity: cap });
  }
  return blocks;
}

function isCandidateSlotPermitted(
  slotStartMs: number,
  slotEndMs: number,
  rangeStartMs: number,
  rangeEndMs: number,
  minAllowedMs: number | null,
  maxAllowedMs: number | null,
  blackoutDates: BlackoutPeriod[]
): boolean {
  if (slotEndMs <= rangeStartMs || slotStartMs > rangeEndMs) return false;
  if (minAllowedMs !== null && slotStartMs < minAllowedMs) return false;
  if (maxAllowedMs !== null && slotStartMs > maxAllowedMs) return false;
  return !isSlotBlackedOut(slotStartMs, slotEndMs, blackoutDates);
}

function evaluateCandidateBlockToSlot(
  block: CandidateTimeBlock,
  slotStartMs: number,
  slotEndMs: number,
  dateStr: string,
  scheduleLabel: string | undefined,
  params: ComputeAvailableSlotsParams,
  resourceBookings: BookingRecord[]
): AvailableSlot {
  const { resource, partySize = 1, preferredLanguage, secondaryCalendars = [] } = params;
  const bufferBefore = Math.max(0, resource.bufferBeforeMinutes || 0);
  const bufferAfter = Math.max(0, resource.bufferAfterMinutes || 0);
  const overlapping = resourceBookings.filter((b) =>
    doesBookingOverlapSlot(b, slotStartMs, slotEndMs, bufferBefore, bufferAfter)
  );
  const bookedCount = overlapping.reduce(
    (sum, b) => sum + Math.max(1, Number(b.partySize) || 1),
    0
  );
  const capacity = Math.max(1, block.capacity || resource.capacityPerSlot || 1);
  const remainingCapacity = Math.max(0, capacity - bookedCount);
  const maxParty = Math.max(capacity, resource.maxPartySize || capacity);

  return {
    slotId: `${resource.documentId}:${dateStr}:${block.label}`,
    resourceDocumentId: resource.documentId,
    resourceName: resource.name,
    resourceSlug: resource.slug,
    start: new Date(slotStartMs).toISOString(),
    end: new Date(slotEndMs).toISOString(),
    date: dateStr,
    slotLabel: block.label,
    scheduleLabel,
    capacity,
    bookedCount,
    remainingCapacity,
    isAvailable: remainingCapacity >= Math.max(1, partySize) && partySize <= maxParty,
    availableHosts: selectAvailableHostsForSlot(resource, overlapping, preferredLanguage),
    secondaryDates:
      secondaryCalendars.length > 0
        ? formatSecondaryCalendars(new Date(slotStartMs), secondaryCalendars)
        : undefined,
  };
}

function resolveLeadAndAdvanceBounds(
  resource: BookingResource,
  referenceNow?: Date
): { minAllowedMs: number | null; maxAllowedMs: number | null } {
  if (!referenceNow) return { minAllowedMs: null, maxAllowedMs: null };
  const nowMs = referenceNow.getTime();
  const minAllowedMs = nowMs + Math.max(0, resource.minLeadTimeHours || 0) * 3_600_000;
  const maxAllowedMs =
    resource.maxAdvanceDays > 0 ? nowMs + resource.maxAdvanceDays * 86_400_000 : null;
  return { minAllowedMs, maxAllowedMs };
}

export function computeAvailableSlots(params: ComputeAvailableSlotsParams): AvailableSlot[] {
  const {
    resource,
    from,
    to,
    existingBookings,
    globalSeasonalSchedules = [],
    globalHolidays = [],
    referenceNow,
  } = params;

  const rangeStartMs = parsePeriodTimestamp(from, false);
  const rangeEndMs = parsePeriodTimestamp(to, true);
  if (
    !resource.isActive ||
    Number.isNaN(rangeStartMs) ||
    Number.isNaN(rangeEndMs) ||
    rangeEndMs < rangeStartMs
  ) {
    return [];
  }

  const bufferBefore = Math.max(0, resource.bufferBeforeMinutes || 0);
  const bufferAfter = Math.max(0, resource.bufferAfterMinutes || 0);
  const resourceBookings = existingBookings.filter(
    (b) =>
      (!b.resourceDocumentId || b.resourceDocumentId === resource.documentId) &&
      isActiveBookingStatus(b.status)
  );
  const { minAllowedMs, maxAllowedMs } = resolveLeadAndAdvanceBounds(resource, referenceNow);
  const blackoutDates = resource.blackoutDates ?? [];
  const slots: AvailableSlot[] = [];
  const startDayUtc = new Date(rangeStartMs);
  startDayUtc.setUTCHours(0, 0, 0, 0);

  for (
    let dayCursorMs = startDayUtc.getTime(), dayCount = 0;
    dayCursorMs <= rangeEndMs && dayCount < 366;
    dayCursorMs += 86_400_000, dayCount += 1
  ) {
    const dayDate = new Date(dayCursorMs);
    const dayKey = String(dayDate.getUTCDay()) as DayOfWeekKey;
    const dateStr = dayDate.toISOString().slice(0, 10);
    const { mode, durationMins, windows, scheduleLabel } = resolveDailyScheduleForDate(
      dateStr,
      dayKey,
      resource,
      globalSeasonalSchedules,
      globalHolidays
    );
    const dayBlocks = windows.flatMap((win) =>
      buildWindowCandidateBlocks(
        win,
        mode,
        durationMins,
        bufferBefore,
        bufferAfter,
        resource.capacityPerSlot
      )
    );
    for (const block of dayBlocks) {
      const slotStartMs = dayCursorMs + block.startMins * 60_000;
      const slotEndMs = dayCursorMs + block.endMins * 60_000;
      if (
        isCandidateSlotPermitted(
          slotStartMs,
          slotEndMs,
          rangeStartMs,
          rangeEndMs,
          minAllowedMs,
          maxAllowedMs,
          blackoutDates
        )
      ) {
        slots.push(
          evaluateCandidateBlockToSlot(
            block,
            slotStartMs,
            slotEndMs,
            dateStr,
            scheduleLabel,
            params,
            resourceBookings
          )
        );
      }
    }
  }
  return slots;
}
