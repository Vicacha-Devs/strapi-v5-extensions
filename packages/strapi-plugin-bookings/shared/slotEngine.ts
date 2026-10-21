import { formatSecondaryCalendars } from './calendarSystems';
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
} from './types';

export const DEFAULT_WEEKLY_SCHEDULE: WeeklyScheduleConfig = {
  mode: 'interval',
  days: {
    '1': [{ start: '09:00', end: '17:00', label: '09:00-17:00' }],
    '2': [{ start: '09:00', end: '17:00', label: '09:00-17:00' }],
    '3': [{ start: '09:00', end: '17:00', label: '09:00-17:00' }],
    '4': [{ start: '09:00', end: '17:00', label: '09:00-17:00' }],
    '5': [{ start: '09:00', end: '17:00', label: '09:00-17:00' }],
  },
};

export function parseTimeMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) {
    return 9 * 60;
  }
  const hours = Math.min(23, Math.max(0, Number.parseInt(match[1], 10)));
  const minutes = Math.min(59, Math.max(0, Number.parseInt(match[2], 10)));
  return hours * 60 + minutes;
}

export function formatTimeMinutes(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, totalMinutes));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function extractMonthDay(dateOrMmDd: string): string {
  const trimmed = dateOrMmDd.trim();
  const isoDay = trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) {
    return isoDay.slice(5, 10);
  }
  if (/^\d{2}-\d{2}$/.test(isoDay)) {
    return isoDay;
  }
  return '';
}

export function matchesDateOrYearlessRange(
  dateStr: string,
  startStr: string,
  endStr: string,
  yearless = false
): boolean {
  if (!dateStr || !startStr || !endStr) {
    return false;
  }
  if (yearless) {
    const targetMmDd = extractMonthDay(dateStr);
    const startMmDd = extractMonthDay(startStr);
    const endMmDd = extractMonthDay(endStr);
    if (!targetMmDd || !startMmDd || !endMmDd) {
      return false;
    }
    if (startMmDd <= endMmDd) {
      return targetMmDd >= startMmDd && targetMmDd <= endMmDd;
    }
    // Cross-year range (e.g. '12-15' to '01-05')
    return targetMmDd >= startMmDd || targetMmDd <= endMmDd;
  }
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

export function isSlotBlackedOut(
  slotStartMs: number,
  slotEndMs: number,
  blackoutDates: BlackoutPeriod[]
): boolean {
  const slotDateStr = new Date(slotStartMs).toISOString().slice(0, 10);
  for (const period of blackoutDates) {
    if (!period.start || !period.end) continue;
    if (period.yearless) {
      if (matchesDateOrYearlessRange(slotDateStr, period.start, period.end, true)) {
        return true;
      }
      continue;
    }
    const rawStart = period.start.trim();
    const rawEnd = period.end.trim();
    const startMs =
      rawStart.length === 10
        ? Date.parse(`${rawStart}T00:00:00.000Z`)
        : Date.parse(rawStart);
    const endMs =
      rawEnd.length === 10
        ? Date.parse(`${rawEnd}T23:59:59.999Z`)
        : Date.parse(rawEnd);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue;
    if (slotStartMs < endMs && slotEndMs > startMs) {
      return true;
    }
  }
  return false;
}

export interface ResolvedDailySchedule {
  mode: 'interval' | 'window';
  durationMins: number;
  windows: DailyTimeWindow[];
  scheduleLabel?: string;
}

export function resolveDailyScheduleForDate(
  dateStr: string,
  dayKey: DayOfWeekKey,
  resource: BookingResource,
  globalSeasonalSchedules: SeasonalScheduleOverride[] = [],
  globalHolidays: HolidayScheduleRule[] = []
): ResolvedDailySchedule {
  const baseSchedule: WeeklyScheduleConfig =
    resource.weeklySchedule && resource.weeklySchedule.days
      ? resource.weeklySchedule
      : DEFAULT_WEEKLY_SCHEDULE;
  const baseMode = baseSchedule.mode ?? 'interval';
  const baseDurationMins = Math.max(5, resource.slotDurationMinutes || 60);

  // 1. Check holiday rules (resource-level holiday rules take precedence over global holidays)
  const combinedHolidays = [
    ...(Array.isArray(globalHolidays) ? globalHolidays : []),
    ...(Array.isArray(resource.holidayRules) ? resource.holidayRules : []),
  ];
  let matchedHoliday: HolidayScheduleRule | undefined;
  for (const rule of combinedHolidays) {
    if (rule?.date && matchesSingleDateOrYearless(dateStr, rule.date, Boolean(rule.yearless))) {
      matchedHoliday = rule;
    }
  }
  if (matchedHoliday) {
    const hasCustomWindows = Array.isArray(matchedHoliday.windows) && matchedHoliday.windows.length > 0;
    const isClosed = matchedHoliday.isClosed ?? !hasCustomWindows;
    if (isClosed || !hasCustomWindows) {
      return {
        mode: baseMode,
        durationMins: baseDurationMins,
        windows: [],
        scheduleLabel: matchedHoliday.name,
      };
    }
    return {
      mode: matchedHoliday.mode ?? baseMode,
      durationMins: baseDurationMins,
      windows: matchedHoliday.windows ?? [],
      scheduleLabel: matchedHoliday.name,
    };
  }

  // 2. Check seasonal schedule overrides (sorted by priority ascending so last/highest wins)
  const combinedSeasonals = [
    ...(Array.isArray(globalSeasonalSchedules) ? globalSeasonalSchedules : []),
    ...(Array.isArray(resource.seasonalSchedules) ? resource.seasonalSchedules : []),
  ];
  const matchingSeasonals = combinedSeasonals.filter(
    (s) =>
      s &&
      s.schedule &&
      matchesDateOrYearlessRange(dateStr, s.startDate, s.endDate, Boolean(s.yearless))
  );
  if (matchingSeasonals.length > 0) {
    matchingSeasonals.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    const winner = matchingSeasonals[matchingSeasonals.length - 1];
    return {
      mode: winner.schedule.mode ?? baseMode,
      durationMins: Math.max(5, winner.slotDurationMinutes ?? baseDurationMins),
      windows: winner.schedule.days?.[dayKey] ?? [],
      scheduleLabel: winner.label,
    };
  }

  // 3. Default weekly schedule
  return {
    mode: baseMode,
    durationMins: baseDurationMins,
    windows: baseSchedule.days?.[dayKey] ?? [],
  };
}

export function isActiveBookingStatus(status: BookingRecord['status']): boolean {
  return status === 'pending' || status === 'confirmed';
}

export function doesBookingOverlapSlot(
  booking: Pick<BookingRecord, 'startDate' | 'endDate' | 'status'>,
  slotStartMs: number,
  slotEndMs: number,
  bufferBeforeMinutes = 0,
  bufferAfterMinutes = 0
): boolean {
  if (!isActiveBookingStatus(booking.status)) {
    return false;
  }
  const bStart = Date.parse(booking.startDate);
  const bEnd = Date.parse(booking.endDate);
  if (Number.isNaN(bStart) || Number.isNaN(bEnd)) {
    return false;
  }
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
  if (hosts.length === 0) {
    return [];
  }
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

  if (!preferredLanguage) {
    return freeHosts;
  }

  const normalizedLang = preferredLanguage.trim().toLowerCase();
  const matchingLang = freeHosts.filter((host) =>
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

export function computeAvailableSlots(
  params: ComputeAvailableSlotsParams
): AvailableSlot[] {
  const {
    resource,
    from,
    to,
    existingBookings,
    partySize = 1,
    preferredLanguage,
    secondaryCalendars = [],
    globalSeasonalSchedules = [],
    globalHolidays = [],
    referenceNow,
  } = params;

  if (!resource.isActive) {
    return [];
  }

  const rangeStartMs =
    from.length === 10
      ? Date.parse(`${from}T00:00:00.000Z`)
      : Date.parse(from);
  const rangeEndMs =
    to.length === 10
      ? Date.parse(`${to}T23:59:59.999Z`)
      : Date.parse(to);

  if (Number.isNaN(rangeStartMs) || Number.isNaN(rangeEndMs) || rangeEndMs < rangeStartMs) {
    return [];
  }

  const bufferBefore = Math.max(0, resource.bufferBeforeMinutes || 0);
  const bufferAfter = Math.max(0, resource.bufferAfterMinutes || 0);
  const resourceBookings = existingBookings.filter(
    (b) =>
      (!b.resourceDocumentId || b.resourceDocumentId === resource.documentId) &&
      isActiveBookingStatus(b.status)
  );

  const minAllowedMs = referenceNow
    ? referenceNow.getTime() + Math.max(0, resource.minLeadTimeHours || 0) * 3_600_000
    : null;
  const maxAllowedMs =
    referenceNow && resource.maxAdvanceDays > 0
      ? referenceNow.getTime() + resource.maxAdvanceDays * 86_400_000
      : null;

  const slots: AvailableSlot[] = [];
  const startDayUtc = new Date(rangeStartMs);
  startDayUtc.setUTCHours(0, 0, 0, 0);

  const maxDays = 366;
  let dayCursorMs = startDayUtc.getTime();
  let dayCount = 0;

  while (dayCursorMs <= rangeEndMs && dayCount < maxDays) {
    dayCount += 1;
    const dayDate = new Date(dayCursorMs);
    const dayKey = String(dayDate.getUTCDay()) as DayOfWeekKey;
    const dateStr = dayDate.toISOString().slice(0, 10);
    const {
      mode,
      durationMins,
      windows,
      scheduleLabel,
    } = resolveDailyScheduleForDate(
      dateStr,
      dayKey,
      resource,
      globalSeasonalSchedules,
      globalHolidays
    );

    for (const win of windows) {
      const winStartMins = parseTimeMinutes(win.start);
      const winEndMins = parseTimeMinutes(win.end);
      if (winEndMins <= winStartMins) continue;

      const candidateBlocks: Array<{
        startMins: number;
        endMins: number;
        label: string;
        capacity: number;
      }> = [];

      if (mode === 'window') {
        candidateBlocks.push({
          startMins: winStartMins,
          endMins: winEndMins,
          label: win.label || `${win.start}-${win.end}`,
          capacity: win.capacity ?? resource.capacityPerSlot,
        });
      } else {
        const stepMins = durationMins + bufferBefore + bufferAfter;
        let cursorMins = winStartMins;
        while (cursorMins + durationMins <= winEndMins) {
          const blockEndMins = cursorMins + durationMins;
          const labelStr =
            win.label && winStartMins + durationMins === winEndMins
              ? win.label
              : `${formatTimeMinutes(cursorMins)}-${formatTimeMinutes(blockEndMins)}`;
          candidateBlocks.push({
            startMins: cursorMins,
            endMins: blockEndMins,
            label: labelStr,
            capacity: win.capacity ?? resource.capacityPerSlot,
          });
          cursorMins += Math.max(5, stepMins);
        }
      }

      for (const block of candidateBlocks) {
        const slotStartMs = dayCursorMs + block.startMins * 60_000;
        const slotEndMs = dayCursorMs + block.endMins * 60_000;

        if (slotEndMs <= rangeStartMs || slotStartMs > rangeEndMs) {
          continue;
        }
        if (minAllowedMs !== null && slotStartMs < minAllowedMs) {
          continue;
        }
        if (maxAllowedMs !== null && slotStartMs > maxAllowedMs) {
          continue;
        }
        if (isSlotBlackedOut(slotStartMs, slotEndMs, resource.blackoutDates || [])) {
          continue;
        }

        const overlapping = resourceBookings.filter((b) =>
          doesBookingOverlapSlot(b, slotStartMs, slotEndMs, bufferBefore, bufferAfter)
        );
        const bookedCount = overlapping.reduce(
          (sum, b) => sum + Math.max(1, Number(b.partySize) || 1),
          0
        );
        const capacity = Math.max(1, block.capacity || resource.capacityPerSlot || 1);
        const remainingCapacity = Math.max(0, capacity - bookedCount);
        const availableHosts = selectAvailableHostsForSlot(
          resource,
          overlapping,
          preferredLanguage
        );
        const isAvailable =
          remainingCapacity >= Math.max(1, partySize) &&
          partySize <= Math.max(capacity, resource.maxPartySize || capacity);

        const slotStartIso = new Date(slotStartMs).toISOString();
        const slotEndIso = new Date(slotEndMs).toISOString();
        const secondaryDates =
          secondaryCalendars.length > 0
            ? formatSecondaryCalendars(new Date(slotStartMs), secondaryCalendars)
            : undefined;

        slots.push({
          slotId: `${resource.documentId}:${dateStr}:${block.label}`,
          resourceDocumentId: resource.documentId,
          resourceName: resource.name,
          resourceSlug: resource.slug,
          start: slotStartIso,
          end: slotEndIso,
          date: dateStr,
          slotLabel: block.label,
          scheduleLabel,
          capacity,
          bookedCount,
          remainingCapacity,
          isAvailable,
          availableHosts,
          secondaryDates,
        });
      }
    }

    dayCursorMs += 86_400_000;
  }

  return slots;
}
