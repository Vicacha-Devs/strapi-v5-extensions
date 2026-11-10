import {
  extractZonedWallClock,
  isSlotBlackedOut,
  normalizeTimeZone,
  parseTimeMinutes,
  resolveDailyScheduleForDate,
  wallClockToUtcMs,
} from "../../../shared/slotEngine";
import { parseIsoDateYmd } from "../../../shared/slotTimezone";
import type {
  BookingResource,
  BookingsPluginSettings,
  CreateReservationInput,
} from "../../../shared/types";
import { BookingValidationError } from "../errors";
import { trimOrUndefined } from "./reservationHelpers";
import {
  verifySlotCapacityAndResolveHost,
  type VerifyCapacityAndHostParams,
} from "./reservationHostCapacity";

export { verifySlotCapacityAndResolveHost, type VerifyCapacityAndHostParams };

/** Linear-time email shape check: one "@", non-empty local part, dotted domain. */
function isValidEmail(value: string): boolean {
  if (/\s/.test(value)) return false;
  const at = value.indexOf("@");
  if (at < 1 || at !== value.lastIndexOf("@")) return false;
  const domain = value.slice(at + 1);
  const dot = domain.indexOf(".");
  return dot > 0 && dot < domain.length - 1;
}

function hasInvalidRolloverPrefix(raw: string): boolean {
  const trimmed = raw.trim();
  return (
    /^\d{4}-\d{2}-\d{2}/.test(trimmed) &&
    parseIsoDateYmd(trimmed.slice(0, 10)) === null
  );
}

export function parseStrictPartySize(val: unknown, defaultValue = 1): number {
  if (val === undefined) {
    return defaultValue;
  }
  if (typeof val !== "number" || !Number.isInteger(val) || val < 1) {
    throw new BookingValidationError(
      "partySize must be an integer greater than or equal to 1"
    );
  }
  return val;
}

export function resolveEffectiveMaxPartySize(
  resource: BookingResource | null | undefined,
  settings: BookingsPluginSettings
): number {
  const capacity =
    resource?.capacityPerSlot ?? settings.defaultCapacityPerSlot ?? 1;
  if (resource) {
    return resource.maxPartySize > 0
      ? Math.min(capacity, resource.maxPartySize)
      : capacity;
  }
  return 50;
}

export function validateReservationCustomerAndStart(
  input: CreateReservationInput
) {
  const customerName = trimOrUndefined(input.customerName);
  const customerEmail = trimOrUndefined(input.customerEmail)?.toLowerCase();
  if (!customerName) {
    throw new BookingValidationError("customerName is required");
  }
  if (!customerEmail || !isValidEmail(customerEmail)) {
    throw new BookingValidationError("A valid customerEmail is required");
  }
  if (
    typeof input.startDate !== "string" ||
    !input.startDate.trim() ||
    hasInvalidRolloverPrefix(input.startDate)
  ) {
    throw new BookingValidationError("A valid ISO startDate is required");
  }
  const startMs = Date.parse(input.startDate);
  if (Number.isNaN(startMs)) {
    throw new BookingValidationError("A valid ISO startDate is required");
  }
  return { customerName, customerEmail, startMs };
}

function resolveDefaultBookingEndMs(
  startMs: number,
  resource: BookingResource | null,
  settings: BookingsPluginSettings
): number {
  if (!resource) {
    const mins = settings.defaultSlotDurationMinutes ?? 60;
    return startMs + mins * 60_000;
  }
  const timeZone = normalizeTimeZone(resource.timezone);
  const startWall = extractZonedWallClock(startMs, timeZone);
  const schedule = resolveDailyScheduleForDate(
    startWall.dateStr,
    startWall.dayKey,
    resource,
    settings.defaultSeasonalSchedules,
    settings.holidays
  );
  if (schedule.mode === "window") {
    const matchingWin = schedule.windows.find(
      (w) => parseTimeMinutes(w.start) === startWall.minutesOfDay
    );
    if (matchingWin) {
      const winEndMs = wallClockToUtcMs(
        startWall.dateStr,
        parseTimeMinutes(matchingWin.end),
        timeZone,
        false
      );
      if (winEndMs !== null && winEndMs > startMs) {
        return winEndMs;
      }
    }
  }
  const zonedEndMs = wallClockToUtcMs(
    startWall.dateStr,
    startWall.minutesOfDay + schedule.durationMins,
    timeZone,
    false
  );
  return zonedEndMs !== null && zonedEndMs > startMs
    ? zonedEndMs
    : startMs + schedule.durationMins * 60_000;
}

export function computeReservationTimingAndParty(
  input: CreateReservationInput,
  startMs: number,
  resource: BookingResource | null,
  settings: BookingsPluginSettings
) {
  if (
    typeof input.endDate === "string" &&
    input.endDate.trim() &&
    hasInvalidRolloverPrefix(input.endDate)
  ) {
    throw new BookingValidationError("endDate must be a valid ISO date");
  }
  const endMs = input.endDate
    ? Date.parse(input.endDate)
    : resolveDefaultBookingEndMs(startMs, resource, settings);

  if (Number.isNaN(endMs) || endMs <= startMs) {
    throw new BookingValidationError("endDate must be after startDate");
  }

  const partySize = parseStrictPartySize(input.partySize, 1);
  const maxParty = resolveEffectiveMaxPartySize(resource, settings);
  if (partySize > maxParty) {
    throw new BookingValidationError(
      `Requested partySize (${partySize}) exceeds maximum allowed (${maxParty})`
    );
  }
  return { endMs, partySize };
}

function isNextCalendarDay(startDateStr: string, endDateStr: string): boolean {
  const startDayMs = Date.parse(`${startDateStr}T00:00:00.000Z`);
  const endDayMs = Date.parse(`${endDateStr}T00:00:00.000Z`);
  return (
    !Number.isNaN(startDayMs) &&
    !Number.isNaN(endDayMs) &&
    endDayMs - startDayMs === 86_400_000
  );
}

/**
 * Enforces blackouts, lead time, advance horizon, open daily schedule windows,
 * holiday closures, exact interval slot-boundary alignment, and max duration.
 */
export function validateBookingOperatingWindow(params: {
  resource: BookingResource | null | undefined;
  settings: BookingsPluginSettings;
  startMs: number;
  endMs: number;
  isAdmin?: boolean;
  skipLeadTimeCheck?: boolean;
  referenceNow?: Date;
}): number | undefined {
  const {
    resource,
    settings,
    startMs,
    endMs,
    isAdmin = false,
    skipLeadTimeCheck = false,
    referenceNow,
  } = params;

  if (!resource) return undefined;
  const timeZone = normalizeTimeZone(resource.timezone);

  const blackouts = resource.blackoutDates || [];
  if (isSlotBlackedOut(startMs, endMs, blackouts, timeZone)) {
    throw new BookingValidationError(
      "Requested time slot falls on a blackout period"
    );
  }

  if (isAdmin) {
    return undefined;
  }

  if (!skipLeadTimeCheck) {
    const now =
      referenceNow instanceof Date && !Number.isNaN(referenceNow.getTime())
        ? referenceNow
        : new Date();
    const nowMs = now.getTime();
    const minLeadMs =
      nowMs + Math.max(0, resource.minLeadTimeHours || 0) * 3_600_000;
    if (startMs < minLeadMs) {
      throw new BookingValidationError(
        `Bookings require at least ${resource.minLeadTimeHours} hours advance notice`
      );
    }
    if (resource.maxAdvanceDays > 0) {
      const maxAdvanceMs = nowMs + resource.maxAdvanceDays * 86_400_000;
      if (startMs > maxAdvanceMs) {
        throw new BookingValidationError(
          `Bookings cannot be scheduled more than ${resource.maxAdvanceDays} days in advance`
        );
      }
    }
  }

  const startWall = extractZonedWallClock(startMs, timeZone);
  const endWall = extractZonedWallClock(endMs, timeZone);
  if (
    startWall.seconds !== 0 ||
    startWall.ms !== 0 ||
    endWall.seconds !== 0 ||
    endWall.ms !== 0
  ) {
    throw new BookingValidationError(
      "Booking start and end times must align to exact minute boundaries"
    );
  }

  let endMinsOfStartDay = endWall.minutesOfDay;
  if (endWall.dateStr !== startWall.dateStr) {
    if (
      endWall.minutesOfDay === 0 &&
      isNextCalendarDay(startWall.dateStr, endWall.dateStr)
    ) {
      endMinsOfStartDay = 1440;
    } else {
      throw new BookingValidationError(
        "Booking must start and end on the same operating day"
      );
    }
  }

  const schedule = resolveDailyScheduleForDate(
    startWall.dateStr,
    startWall.dayKey,
    resource,
    settings.defaultSeasonalSchedules,
    settings.holidays
  );

  if (schedule.windows.length === 0) {
    throw new BookingValidationError(
      "Requested resource is closed on the selected date"
    );
  }

  const containingWindows = schedule.windows.filter((win) => {
    const winStart = parseTimeMinutes(win.start);
    const winEnd = parseTimeMinutes(win.end);
    return (
      winEnd > winStart &&
      startWall.minutesOfDay >= winStart &&
      endMinsOfStartDay <= winEnd
    );
  });

  if (containingWindows.length === 0) {
    throw new BookingValidationError(
      "Requested time slot falls outside operating hours"
    );
  }

  if (schedule.mode === "window") {
    const exactWin = containingWindows.find(
      (win) =>
        startWall.minutesOfDay === parseTimeMinutes(win.start) &&
        endMinsOfStartDay === parseTimeMinutes(win.end)
    );
    if (!exactWin) {
      throw new BookingValidationError(
        "Requested time must match an exact configured booking window"
      );
    }
    return exactWin.capacity;
  }

  const wallDurationMins = endMinsOfStartDay - startWall.minutesOfDay;
  if (wallDurationMins > schedule.durationMins) {
    throw new BookingValidationError(
      `Requested booking duration exceeds maximum slot duration (${schedule.durationMins} minutes)`
    );
  }

  const bufferBefore = Math.max(0, resource.bufferBeforeMinutes || 0);
  const bufferAfter = Math.max(0, resource.bufferAfterMinutes || 0);
  const stepMins = Math.max(
    5,
    schedule.durationMins + bufferBefore + bufferAfter
  );

  const alignedWindow = containingWindows.find((win) => {
    const winStart = parseTimeMinutes(win.start);
    return (
      wallDurationMins === schedule.durationMins &&
      (startWall.minutesOfDay - winStart) % stepMins === 0
    );
  });

  if (!alignedWindow) {
    throw new BookingValidationError(
      "Requested time slot must align with an exact configured interval slot"
    );
  }

  return alignedWindow.capacity;
}
