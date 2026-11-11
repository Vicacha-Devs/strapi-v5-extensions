import { KAABA_COORDINATES } from "./constants";
import type {
  DailyFivePrayerId,
  IqamahRule,
  IslamPluginSettings,
  ProhibitedTimesWindow,
  QiblaCompassResult,
  SupportedLocale,
} from "./types";
import { sanitizeCoordinates, sanitizeTimezone } from "./validation";

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371.0088;

const COMPASS_16 = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

export const PRAYER_LABELS: Record<
  SupportedLocale,
  Record<DailyFivePrayerId, string>
> = {
  es: {
    fajr: "Fajr (Alba)",
    dhuhr: "Dhuhr (Mediodía)",
    asr: "Asr (Tarde)",
    maghrib: "Maghrib (Ocaso)",
    isha: "Isha (Noche)",
  },
  en: {
    fajr: "Fajr (Dawn)",
    dhuhr: "Dhuhr (Noon)",
    asr: "Asr (Afternoon)",
    maghrib: "Maghrib (Sunset)",
    isha: "Isha (Night)",
  },
  ar: {
    fajr: "الفجر",
    dhuhr: "الظهر",
    asr: "العصر",
    maghrib: "المغرب",
    isha: "العشاء",
  },
  tr: {
    fajr: "İmsak / Sabah (Fecr)",
    dhuhr: "Öğle (Zuhur)",
    asr: "İkindi (Asr)",
    maghrib: "Akşam (Mağrib)",
    isha: "Yatsı (İşa)",
  },
};

export function calculateQiblaCompass(
  rawLat: number,
  rawLon: number,
  city?: string,
  country?: string
): QiblaCompassResult {
  const { lat, lon } = sanitizeCoordinates(rawLat, rawLon);
  const lat1 = lat * DEG_TO_RAD;
  const lon1 = lon * DEG_TO_RAD;
  const lat2 = KAABA_COORDINATES.lat * DEG_TO_RAD;
  const lon2 = KAABA_COORDINATES.lon * DEG_TO_RAD;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

  if (c < 1e-9) {
    return {
      origin: { lat, lon, city, country },
      kaaba: { lat: KAABA_COORDINATES.lat, lon: KAABA_COORDINATES.lon },
      direction: {
        degrees: 0,
        from: "True North",
        clockwise: true,
        cardinal: "N",
      },
      distance: {
        kilometers: 0,
        miles: 0,
      },
    };
  }

  const y = Math.sin(dLon);
  const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(dLon);
  const rawBearing = Math.atan2(y, x) * RAD_TO_DEG;
  const normalized = ((rawBearing % 360) + 360) % 360;
  const rounded = Math.round(normalized * 100) / 100;
  const wrappedDeg = ((rounded % 360) + 360) % 360;
  const degrees = wrappedDeg === 0 ? 0 : wrappedDeg;

  const kilometers = Math.round(EARTH_RADIUS_KM * c * 100) / 100;
  const miles = Math.round(kilometers * 0.621371 * 100) / 100;
  const compassIdx = Math.round(degrees / 22.5) % 16;

  return {
    origin: { lat, lon, city, country },
    kaaba: { lat: KAABA_COORDINATES.lat, lon: KAABA_COORDINATES.lon },
    direction: {
      degrees,
      from: "True North",
      clockwise: true,
      cardinal: COMPASS_16[compassIdx],
    },
    distance: {
      kilometers,
      miles,
    },
  };
}

export function getTimezoneOffsetHours(date: Date, timeZone: string): number {
  const safeTz = sanitizeTimezone(timeZone, "UTC");
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const readPart = (type: string): number =>
      Number(parts.find((p) => p.type === type)?.value ?? 0);
    const year = readPart("year");
    const month = readPart("month");
    const day = readPart("day");
    const hour = readPart("hour") % 24;
    const minute = readPart("minute");
    const second = readPart("second");
    const wallClockAsUtcMs = Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second
    );
    const instantSecMs = Math.floor(date.getTime() / 1000) * 1000;
    return (wallClockAsUtcMs - instantSecMs) / 3_600_000;
  } catch {
    return 0;
  }
}

export function solarPosition(julianDay: number): {
  declinationRad: number;
  equationOfTimeHours: number;
} {
  const d = julianDay - 2451545.0;
  const g = ((357.529 + 0.98560028 * d) % 360) * DEG_TO_RAD;
  const q = (280.459 + 0.98564736 * d) % 360;
  const l =
    ((q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360) * DEG_TO_RAD;
  const e = (23.439 - 0.00000036 * d) * DEG_TO_RAD;

  const ra =
    ((Math.atan2(Math.cos(e) * Math.sin(l), Math.cos(l)) * RAD_TO_DEG + 360) %
      360) /
    15;
  const declinationRad = Math.asin(Math.sin(e) * Math.sin(l));

  let eqt = q / 15 - ra;
  if (eqt > 12) eqt -= 24;
  if (eqt < -12) eqt += 24;

  return { declinationRad, equationOfTimeHours: eqt };
}

export function tryComputeHourAngleHours(
  latRad: number,
  declinationRad: number,
  altitudeDeg: number
): number | null {
  const altRad = altitudeDeg * DEG_TO_RAD;
  const num = Math.sin(altRad) - Math.sin(latRad) * Math.sin(declinationRad);
  const den = Math.cos(latRad) * Math.cos(declinationRad);
  if (Math.abs(den) < 1e-9) return null;
  const ratio = num / den;
  if (ratio < -1 || ratio > 1) return null;
  return (Math.acos(ratio) * RAD_TO_DEG) / 15;
}

export function computeHourAngleHours(
  latRad: number,
  declinationRad: number,
  altitudeDeg: number
): number {
  const exact = tryComputeHourAngleHours(latRad, declinationRad, altitudeDeg);
  if (exact !== null) return exact;
  const altRad = altitudeDeg * DEG_TO_RAD;
  const num = Math.sin(altRad) - Math.sin(latRad) * Math.sin(declinationRad);
  const den = Math.cos(latRad) * Math.cos(declinationRad);
  const cosH = den === 0 ? -1 : Math.max(-1, Math.min(1, num / den));
  return (Math.acos(cosH) * RAD_TO_DEG) / 15;
}

export function computeHighLatitudeNightPortionHours(
  rule: IslamPluginSettings["highLatitudeRule"],
  angleDeg: number,
  nightHours: number
): number {
  const safeNight = Math.max(1, Math.min(23, nightHours));
  if (rule === "OneSeventh") {
    return safeNight / 7;
  }
  if (rule === "MiddleOfTheNight") {
    return safeNight / 2;
  }
  const safeAngle = Number.isFinite(angleDeg) && angleDeg > 0 ? angleDeg : 18;
  return (safeAngle / 60) * safeNight;
}

export function minutesToHhMm(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes)) {
    return "00:00";
  }
  const wrapped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(wrapped / 60);
  const mm = wrapped % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function applyMeridiemAdjustment(hours: number, meridiem?: string): number {
  if (meridiem === "PM" && hours < 12) return hours + 12;
  if (meridiem === "AM" && hours === 12) return 0;
  return hours;
}

export function parseHhMmToMinutes(
  rawTime: string | undefined | null
): number | null {
  if (typeof rawTime !== "string") return null;
  const match = rawTime
    .trim()
    .toUpperCase()
    .match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
  if (!match) return null;
  const rawHours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || rawHours > 23) return null;
  if (match[3] && (rawHours < 1 || rawHours > 12)) return null;
  const hours = applyMeridiemAdjustment(rawHours, match[3]);
  return hours * 60 + minutes;
}

export function resolveIqamahTime(
  prayerName: DailyFivePrayerId,
  adhanMinutes: number,
  rules: IqamahRule[]
): { iqamah: string; iqamahMinutes: number } {
  const safeAdhan = Number.isFinite(adhanMinutes) ? adhanMinutes : 0;
  const rule = Array.isArray(rules)
    ? rules.find((r) => r.prayerName === prayerName)
    : undefined;
  if (!rule) {
    const defaultOffset = prayerName === "maghrib" ? 10 : 15;
    const mins = safeAdhan + defaultOffset;
    return { iqamah: minutesToHhMm(mins), iqamahMinutes: mins };
  }

  if (rule.mode === "fixed_time" && rule.fixedTime) {
    const parsed = parseHhMmToMinutes(rule.fixedTime);
    if (parsed !== null && parsed >= safeAdhan) {
      return { iqamah: minutesToHhMm(parsed), iqamahMinutes: parsed };
    }
  }

  const offset = Number.isFinite(rule.offsetMinutes)
    ? Math.max(0, Math.min(180, Math.trunc(rule.offsetMinutes)))
    : 15;
  const mins = safeAdhan + offset;
  return { iqamah: minutesToHhMm(mins), iqamahMinutes: mins };
}

function detectProhibitedReason(
  nowMinutes: number,
  sunriseMin: number,
  sunriseEnd: number,
  zawalStart: number,
  dhuhrMin: number,
  sunsetStart: number,
  maghribMin: number
): "sunrise" | "zawal" | "sunset" | null {
  if (nowMinutes >= sunriseMin && nowMinutes < sunriseEnd) return "sunrise";
  if (nowMinutes >= zawalStart && nowMinutes < dhuhrMin) return "zawal";
  if (nowMinutes >= sunsetStart && nowMinutes < maghribMin) return "sunset";
  return null;
}

export function computeProhibitedWindows(
  sunriseMin: number,
  dhuhrMin: number,
  maghribMin: number,
  nowMinutes: number
): ProhibitedTimesWindow {
  const sunriseEnd = sunriseMin + 15;
  const zawalStart = dhuhrMin - 10;
  const sunsetStart = maghribMin - 5;
  const activeProhibitedReason = detectProhibitedReason(
    nowMinutes,
    sunriseMin,
    sunriseEnd,
    zawalStart,
    dhuhrMin,
    sunsetStart,
    maghribMin
  );

  return {
    sunrise: {
      start: minutesToHhMm(sunriseMin),
      end: minutesToHhMm(sunriseEnd),
    },
    zawal: {
      start: minutesToHhMm(zawalStart),
      end: minutesToHhMm(dhuhrMin),
    },
    sunset: {
      start: minutesToHhMm(sunsetStart),
      end: minutesToHhMm(maghribMin),
    },
    isCurrentlyProhibited: activeProhibitedReason !== null,
    activeProhibitedReason,
  };
}
