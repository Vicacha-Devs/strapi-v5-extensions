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

function parsePeriodTimestamp(raw: string, endOfDay: boolean): number {
  const trimmed = raw.trim();
  return Date.parse(
    trimmed.length === 10
      ? `${trimmed}T${endOfDay ? "23:59:59.999Z" : "00:00:00.000Z"}`
      : trimmed
  );
}

export function isSlotBlackedOut(
  slotStartMs: number,
  slotEndMs: number,
  blackoutDates: BlackoutPeriod[]
): boolean {
  const slotDateStr = new Date(slotStartMs).toISOString().slice(0, 10);
  return blackoutDates.some((period) => {
    if (!period.start || !period.end) return false;
    if (period.yearless) {
      return matchesDateOrYearlessRange(
        slotDateStr,
        period.start,
        period.end,
        true
      );
    }
    const startMs = parsePeriodTimestamp(period.start, false);
    const endMs = parsePeriodTimestamp(period.end, true);
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

export function isActiveBookingStatus(
  status: BookingRecord["status"]
): boolean {
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
  return (
    slotStartMs < bEnd + bufferAfterMinutes * 60_000 &&
    slotEndMs > bStart - bufferBeforeMinutes * 60_000
  );
}

export function selectAvailableHostsForSlot(
  resource: BookingResource,
  overlappingBookings: BookingRecord[],
  preferredLanguage?: string
): AssignableHost[] {
  const hosts = Array.isArray(resource.assignedHosts)
    ? resource.assignedHosts
    : [];
  if (hosts.length === 0) return [];
  const busy = new Set(
    overlappingBookings
      .map((b) => b.assignedHost?.trim().toLowerCase())
      .filter((v): v is string => Boolean(v))
  );
  const freeHosts = hosts.filter(
    (h) =>
      !busy.has(h.id.trim().toLowerCase()) &&
      !busy.has(h.name.trim().toLowerCase())
  );
  if (!preferredLanguage) return freeHosts;
  const lang = preferredLanguage.trim().toLowerCase();
  const matching = freeHosts.filter(
    (h) =>
      Array.isArray(h.languages) &&
      h.languages.some((l) => l.trim().toLowerCase() === lang)
  );
  return matching.length > 0 ? matching : freeHosts;
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
    const isExactMatch = Boolean(
      win.label && winStartMins + durationMins === winEndMins
    );
    blocks.push({
      startMins: cursorMins,
      endMins: blockEndMins,
      label: isExactMatch
        ? String(win.label)
        : `${formatTimeMinutes(cursorMins)}-${formatTimeMinutes(blockEndMins)}`,
      capacity: cap,
    });
  }
  return blocks;
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
  const {
    resource,
    partySize = 1,
    preferredLanguage,
    secondaryCalendars = [],
  } = params;
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
    isAvailable:
      remainingCapacity >= Math.max(1, partySize) && partySize <= maxParty,
    availableHosts: selectAvailableHostsForSlot(
      resource,
      overlapping,
      preferredLanguage
    ),
    secondaryDates:
      secondaryCalendars.length > 0
        ? formatSecondaryCalendars(new Date(slotStartMs), secondaryCalendars)
        : undefined,
  };
}

export function computeAvailableSlots(
  params: ComputeAvailableSlotsParams
): AvailableSlot[] {
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
  const nowMs = referenceNow?.getTime() ?? null;
  const minAllowedMs =
    nowMs !== null
      ? nowMs + Math.max(0, resource.minLeadTimeHours || 0) * 3_600_000
      : null;
  const maxAllowedMs =
    nowMs !== null && resource.maxAdvanceDays > 0
      ? nowMs + resource.maxAdvanceDays * 86_400_000
      : null;
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
    const { mode, durationMins, windows, scheduleLabel } =
      resolveDailyScheduleForDate(
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
      const permitted =
        slotEndMs > rangeStartMs &&
        slotStartMs <= rangeEndMs &&
        (minAllowedMs === null || slotStartMs >= minAllowedMs) &&
        (maxAllowedMs === null || slotStartMs <= maxAllowedMs) &&
        !isSlotBlackedOut(slotStartMs, slotEndMs, blackoutDates);
      if (permitted) {
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
