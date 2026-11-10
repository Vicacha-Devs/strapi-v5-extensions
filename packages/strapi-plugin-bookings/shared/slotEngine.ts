import { formatSecondaryCalendars } from "./calendarSystems";
import {
  DEFAULT_WEEKLY_SCHEDULE,
  enumerateLocalDatesInRange,
  extractMonthDay,
  extractZonedWallClock,
  formatTimeMinutes,
  isSlotBlackedOut,
  matchesDateOrYearlessRange,
  matchesSingleDateOrYearless,
  normalizeTimeZone,
  parsePeriodTimestampInZone,
  parseTimeMinutes,
  resolveDailyScheduleForDate,
  wallClockToUtcMs,
  type ResolvedDailySchedule,
  type ZonedWallClock,
} from "./slotTimezone";
import type {
  AssignableHost,
  AvailableSlot,
  BookingRecord,
  BookingResource,
  DailyTimeWindow,
  HolidayScheduleRule,
  SeasonalScheduleOverride,
  SecondaryCalendarConfig,
} from "./types";

export {
  DEFAULT_WEEKLY_SCHEDULE,
  enumerateLocalDatesInRange,
  extractMonthDay,
  extractZonedWallClock,
  formatTimeMinutes,
  isSlotBlackedOut,
  matchesDateOrYearlessRange,
  matchesSingleDateOrYearless,
  normalizeTimeZone,
  parsePeriodTimestampInZone,
  parseTimeMinutes,
  resolveDailyScheduleForDate,
  wallClockToUtcMs,
  type ResolvedDailySchedule,
  type ZonedWallClock,
};

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
  const rawHosts = Array.isArray(resource.assignedHosts)
    ? resource.assignedHosts
    : [];
  const hosts = rawHosts.filter(
    (h): h is AssignableHost =>
      Boolean(h) &&
      typeof h.id === "string" &&
      h.id.trim().length > 0 &&
      typeof h.name === "string" &&
      h.name.trim().length > 0
  );
  if (hosts.length === 0) return [];
  const busy = new Set(
    overlappingBookings
      .map((b) =>
        typeof b.assignedHost === "string"
          ? b.assignedHost.trim().toLowerCase()
          : ""
      )
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
      h.languages.some(
        (l) => typeof l === "string" && l.trim().toLowerCase() === lang
      )
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
  const maxParty =
    resource.maxPartySize > 0
      ? Math.min(capacity, resource.maxPartySize)
      : capacity;
  const validParty =
    typeof partySize === "number" &&
    Number.isInteger(partySize) &&
    partySize >= 1;

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
      validParty && remainingCapacity >= partySize && partySize <= maxParty,
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

  const timeZone = normalizeTimeZone(resource.timezone);
  const rangeStartMs = parsePeriodTimestampInZone(from, false, timeZone);
  const rangeEndMs = parsePeriodTimestampInZone(to, true, timeZone);
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
      b.resourceDocumentId === resource.documentId &&
      isActiveBookingStatus(b.status)
  );
  const nowMs =
    referenceNow instanceof Date && !Number.isNaN(referenceNow.getTime())
      ? referenceNow.getTime()
      : null;
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
  const localDates = enumerateLocalDatesInRange(
    rangeStartMs,
    rangeEndMs,
    timeZone,
    366
  );

  for (const { dateStr, dayKey } of localDates) {
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
      const slotStartMs = wallClockToUtcMs(
        dateStr,
        block.startMins,
        timeZone,
        true
      );
      const slotEndMs = wallClockToUtcMs(
        dateStr,
        block.endMins,
        timeZone,
        false
      );
      if (
        slotStartMs === null ||
        slotEndMs === null ||
        slotEndMs <= slotStartMs
      ) {
        continue;
      }
      const permitted =
        slotEndMs > rangeStartMs &&
        slotStartMs <= rangeEndMs &&
        (minAllowedMs === null || slotStartMs >= minAllowedMs) &&
        (maxAllowedMs === null || slotStartMs <= maxAllowedMs) &&
        !isSlotBlackedOut(slotStartMs, slotEndMs, blackoutDates, timeZone);
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
