import {
  computeHighLatitudeNightPortionHours,
  DEG_TO_RAD,
  getTimezoneOffsetHours,
  RAD_TO_DEG,
  solarPosition,
  tryComputeHourAngleHours,
} from "./astronomyMath";
import { PRAYER_CALCULATION_METHODS } from "./constants";
import type { IslamPluginSettings } from "./types";
import {
  sanitizeElevationMeters,
  sanitizeHighLatitudeRule,
  sanitizeMinuteAdjustments,
} from "./validation";

export interface BaseSolarMinutes {
  fajrMin: number;
  sunriseMin: number;
  dhuhrMin: number;
  asrMin: number;
  sunsetMin: number;
  maghribMin: number;
  ishaMin: number;
}

export function resolveMethodSpec(methodId: string) {
  return (
    PRAYER_CALCULATION_METHODS[methodId] || PRAYER_CALCULATION_METHODS["3"]
  );
}

function computeJulianDayAtNoonUtc(dateObj: Date): number {
  let y = dateObj.getUTCFullYear();
  let m = dateObj.getUTCMonth() + 1;
  const day = dateObj.getUTCDate();
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    b -
    1524.5
  );
}

function computeAsrAltitudeDeg(
  latRad: number,
  declinationRad: number,
  shadowFactor: number
): number {
  const zenithDiff = Math.abs(latRad - declinationRad);
  return Math.atan(1 / (shadowFactor + Math.tan(zenithDiff))) * RAD_TO_DEG;
}

function utcHoursToLocalMinutes(
  dayStartUtcMs: number,
  eventUtcHours: number,
  safeTimezone: string
): number {
  const approxInstant = new Date(
    dayStartUtcMs + Math.round(eventUtcHours * 3_600_000)
  );
  const tzOffsetHours = getTimezoneOffsetHours(approxInstant, safeTimezone);
  return (eventUtcHours + tzOffsetHours) * 60;
}

function enforceMonotonicDayBounds(raw: BaseSolarMinutes): BaseSolarMinutes {
  const dhuhrMin = Math.max(180, Math.min(1260, raw.dhuhrMin));
  const sunriseMin = Math.max(1, Math.min(dhuhrMin - 15, raw.sunriseMin));
  const fajrMin = Math.max(0, Math.min(sunriseMin - 1, raw.fajrMin));
  const sunsetMin = Math.max(dhuhrMin + 15, Math.min(1437, raw.sunsetMin));
  const maghribMin = Math.max(sunsetMin, Math.min(1438, raw.maghribMin));
  const asrMin = Math.max(dhuhrMin + 1, Math.min(maghribMin - 1, raw.asrMin));
  const ishaMin = Math.max(maghribMin + 1, Math.min(1439, raw.ishaMin));
  return {
    fajrMin,
    sunriseMin,
    dhuhrMin,
    asrMin,
    sunsetMin,
    maghribMin,
    ishaMin,
  };
}

export function computeBaseSolarMinutes(
  dateObj: Date,
  lat: number,
  lon: number,
  safeTimezone: string,
  settings: IslamPluginSettings
): BaseSolarMinutes {
  const methodSpec = resolveMethodSpec(settings.method);
  const shadowFactor = settings.school === "2" ? 2 : 1;
  const highLatRule = sanitizeHighLatitudeRule(settings.highLatitudeRule);
  const elevation = sanitizeElevationMeters(settings.elevationMeters, 0);
  const adj = sanitizeMinuteAdjustments(settings.minuteAdjustments);

  const jd = computeJulianDayAtNoonUtc(dateObj);
  const { declinationRad, equationOfTimeHours } = solarPosition(jd - lon / 360);
  const latRad = lat * DEG_TO_RAD;
  const refModerateLatRad = (lat < 0 ? -45 : 45) * DEG_TO_RAD;

  const dayStartUtcMs = Date.UTC(
    dateObj.getUTCFullYear(),
    dateObj.getUTCMonth(),
    dateObj.getUTCDate(),
    0,
    0,
    0
  );
  const baseTzOffset = getTimezoneOffsetHours(
    new Date(dayStartUtcMs + 12 * 3_600_000),
    safeTimezone
  );
  let solarNoonUtcHours = 12 - lon / 15 - equationOfTimeHours;
  while (solarNoonUtcHours + baseTzOffset >= 24) {
    solarNoonUtcHours -= 24;
  }
  while (solarNoonUtcHours + baseTzOffset < 0) {
    solarNoonUtcHours += 24;
  }
  const horizonAltitudeDeg = -0.8333 - 0.0347 * Math.sqrt(elevation);

  const exactSunriseDiff = tryComputeHourAngleHours(
    latRad,
    declinationRad,
    horizonAltitudeDeg
  );
  const isPolarSunriseFallback = exactSunriseDiff === null;
  const sunriseDiffHours =
    exactSunriseDiff ??
    tryComputeHourAngleHours(
      refModerateLatRad,
      declinationRad,
      horizonAltitudeDeg
    ) ??
    6;

  const nightHours = Math.max(1, Math.min(23, 24 - 2 * sunriseDiffHours));

  const exactFajrDiff = isPolarSunriseFallback
    ? null
    : tryComputeHourAngleHours(latRad, declinationRad, -methodSpec.fajrAngle);
  const fajrDiffHours =
    exactFajrDiff !== null && exactFajrDiff > sunriseDiffHours
      ? exactFajrDiff
      : sunriseDiffHours +
        computeHighLatitudeNightPortionHours(
          highLatRule,
          methodSpec.fajrAngle,
          nightHours
        );

  const exactAsrDiff = tryComputeHourAngleHours(
    latRad,
    declinationRad,
    computeAsrAltitudeDeg(latRad, declinationRad, shadowFactor)
  );
  const asrDiffHours =
    exactAsrDiff ??
    tryComputeHourAngleHours(
      refModerateLatRad,
      declinationRad,
      computeAsrAltitudeDeg(refModerateLatRad, declinationRad, shadowFactor)
    ) ??
    Math.max(1, sunriseDiffHours * 0.5);

  const exactMaghribDiff = methodSpec.maghribAngle
    ? isPolarSunriseFallback
      ? null
      : tryComputeHourAngleHours(
          latRad,
          declinationRad,
          -methodSpec.maghribAngle
        )
    : sunriseDiffHours;
  const maghribDiffHours =
    methodSpec.maghribAngle &&
    (exactMaghribDiff === null || exactMaghribDiff <= sunriseDiffHours)
      ? sunriseDiffHours +
        computeHighLatitudeNightPortionHours(
          highLatRule,
          methodSpec.maghribAngle,
          nightHours
        )
      : (exactMaghribDiff ?? sunriseDiffHours);

  let ishaDiffHours: number;
  if (methodSpec.ishaIntervalMinutes) {
    ishaDiffHours = maghribDiffHours + methodSpec.ishaIntervalMinutes / 60;
  } else {
    const exactIshaDiff = isPolarSunriseFallback
      ? null
      : tryComputeHourAngleHours(latRad, declinationRad, -methodSpec.ishaAngle);
    ishaDiffHours =
      exactIshaDiff !== null && exactIshaDiff > maghribDiffHours
        ? exactIshaDiff
        : sunriseDiffHours +
          computeHighLatitudeNightPortionHours(
            highLatRule,
            methodSpec.ishaAngle,
            nightHours
          );
  }

  const toLocalMin = (utcHours: number) =>
    utcHoursToLocalMinutes(dayStartUtcMs, utcHours, safeTimezone);

  const fajrRaw = Math.round(toLocalMin(solarNoonUtcHours - fajrDiffHours));
  const ishaRaw = Math.round(toLocalMin(solarNoonUtcHours + ishaDiffHours));

  return enforceMonotonicDayBounds({
    fajrMin: fajrRaw + adj.fajr,
    sunriseMin:
      Math.round(toLocalMin(solarNoonUtcHours - sunriseDiffHours)) +
      adj.sunrise,
    dhuhrMin: Math.round(toLocalMin(solarNoonUtcHours)) + 1 + adj.dhuhr,
    asrMin: Math.round(toLocalMin(solarNoonUtcHours + asrDiffHours)) + adj.asr,
    sunsetMin: Math.round(toLocalMin(solarNoonUtcHours + sunriseDiffHours)),
    maghribMin:
      Math.round(toLocalMin(solarNoonUtcHours + maghribDiffHours)) +
      1 +
      adj.maghrib,
    ishaMin: ishaRaw + adj.isha,
  });
}
