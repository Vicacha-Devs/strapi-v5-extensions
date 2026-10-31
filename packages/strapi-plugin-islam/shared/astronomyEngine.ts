import {
  calculateQiblaCompass,
  computeHourAngleHours,
  computeProhibitedWindows,
  DEG_TO_RAD,
  getTimezoneOffsetHours,
  minutesToHhMm,
  parseHhMmToMinutes,
  PRAYER_LABELS,
  RAD_TO_DEG,
  resolveIqamahTime,
  solarPosition,
} from "./astronomyMath";
import { PRAYER_CALCULATION_METHODS } from "./constants";
import { gregorianToHijri } from "./hijriEngine";
import type {
  DailyFivePrayerId,
  DailyPrayerTimetable,
  IslamPluginSettings,
  PrayerWithIqamah,
  SupportedLocale,
} from "./types";
import { sanitizeCoordinates, sanitizeIcsText } from "./validation";

export {
  calculateQiblaCompass,
  computeProhibitedWindows,
  minutesToHhMm,
  parseHhMmToMinutes,
  resolveIqamahTime,
};

export interface TimetableOverrides {
  lat?: number;
  lon?: number;
  city?: string;
  country?: string;
  locale?: SupportedLocale;
  nowMinutesOverride?: number;
  externalTimesOverride?: Partial<Record<string, string>>;
}

interface ComputedDayMinutes {
  fajrMin: number;
  sunriseMin: number;
  dhuhrMin: number;
  asrMin: number;
  sunsetMin: number;
  maghribMin: number;
  ishaMin: number;
  source: "astronomical_engine" | "external_api";
}

function normalizeDateInput(dateIsoOrDate: string | Date): Date {
  return typeof dateIsoOrDate === "string"
    ? new Date(`${dateIsoOrDate.slice(0, 10)}T12:00:00Z`)
    : new Date(dateIsoOrDate.getTime());
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
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

function resolveMethodSpec(methodId: string) {
  return PRAYER_CALCULATION_METHODS[methodId] || PRAYER_CALCULATION_METHODS["3"];
}

function computeBaseSolarMinutes(
  dateObj: Date,
  lat: number,
  lon: number,
  timezone: string,
  settings: IslamPluginSettings
): Omit<ComputedDayMinutes, "source"> {
  const methodSpec = resolveMethodSpec(settings.method);
  const shadowFactor = settings.school === "2" ? 2 : 1;
  const jd = computeJulianDayAtNoonUtc(dateObj);
  const tzOffsetHours = getTimezoneOffsetHours(dateObj, timezone);
  const { declinationRad, equationOfTimeHours } = solarPosition(jd - lon / 360);
  const latRad = lat * DEG_TO_RAD;

  const solarNoonHours = 12 + tzOffsetHours - lon / 15 - equationOfTimeHours;
  const elevation = Math.max(0, settings.elevationMeters || 0);
  const horizonAltitudeDeg = -0.8333 - 0.0347 * Math.sqrt(elevation);

  const sunriseDiffHours = computeHourAngleHours(latRad, declinationRad, horizonAltitudeDeg);
  const fajrDiffHours = computeHourAngleHours(latRad, declinationRad, -methodSpec.fajrAngle);
  const asrAltitudeRad = Math.atan(
    1 / (shadowFactor + Math.tan(Math.abs(latRad - declinationRad)))
  );
  const asrDiffHours = computeHourAngleHours(latRad, declinationRad, asrAltitudeRad * RAD_TO_DEG);
  const maghribDiffHours = methodSpec.maghribAngle
    ? computeHourAngleHours(latRad, declinationRad, -methodSpec.maghribAngle)
    : sunriseDiffHours;
  const ishaHours = methodSpec.ishaIntervalMinutes
    ? solarNoonHours + maghribDiffHours + methodSpec.ishaIntervalMinutes / 60
    : solarNoonHours + computeHourAngleHours(latRad, declinationRad, -methodSpec.ishaAngle);

  const adj = settings.minuteAdjustments;
  return {
    fajrMin: Math.round((solarNoonHours - fajrDiffHours) * 60) + adj.fajr,
    sunriseMin: Math.round((solarNoonHours - sunriseDiffHours) * 60) + adj.sunrise,
    dhuhrMin: Math.round(solarNoonHours * 60) + 1 + adj.dhuhr,
    asrMin: Math.round((solarNoonHours + asrDiffHours) * 60) + adj.asr,
    sunsetMin: Math.round((solarNoonHours + sunriseDiffHours) * 60),
    maghribMin: Math.round((solarNoonHours + maghribDiffHours) * 60) + 1 + adj.maghrib,
    ishaMin: Math.round(ishaHours * 60) + adj.isha,
  };
}

function applyExternalTimesOverride(
  base: Omit<ComputedDayMinutes, "source">,
  ext?: Partial<Record<string, string>>
): ComputedDayMinutes {
  if (!ext) {
    return { ...base, source: "astronomical_engine" };
  }
  const parsed = [
    parseHhMmToMinutes(ext.Fajr ?? ext.fajr),
    parseHhMmToMinutes(ext.Sunrise ?? ext.sunrise),
    parseHhMmToMinutes(ext.Dhuhr ?? ext.dhuhr),
    parseHhMmToMinutes(ext.Asr ?? ext.asr),
    parseHhMmToMinutes(ext.Maghrib ?? ext.maghrib),
    parseHhMmToMinutes(ext.Isha ?? ext.isha),
  ];
  if (parsed.some((val) => val === null)) {
    return { ...base, source: "astronomical_engine" };
  }
  const [fajrMin, sunriseMin, dhuhrMin, asrMin, maghribMin, ishaMin] = parsed as number[];
  return {
    fajrMin,
    sunriseMin,
    dhuhrMin,
    asrMin,
    sunsetMin: base.sunsetMin,
    maghribMin,
    ishaMin,
    source: "external_api",
  };
}

function resolveCurrentMinutesInTimezone(timezone: string, nowMinutesOverride?: number): number {
  if (nowMinutesOverride !== undefined) {
    return nowMinutesOverride;
  }
  try {
    const nowParts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      timeZone: timezone,
    }).formatToParts(new Date());
    const h = Number(nowParts.find((p) => p.type === "hour")?.value ?? 0) % 24;
    const min = Number(nowParts.find((p) => p.type === "minute")?.value ?? 0);
    return h * 60 + min;
  } catch {
    const now = new Date();
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
}

function determineActivePrayer(
  nowMinutes: number,
  isProhibited: boolean,
  times: Omit<ComputedDayMinutes, "source">
): DailyFivePrayerId | null {
  if (isProhibited) {
    return null;
  }
  if (nowMinutes >= times.ishaMin || nowMinutes < times.fajrMin) return "isha";
  const windows: Array<[DailyFivePrayerId, number, number]> = [
    ["fajr", times.fajrMin, times.sunriseMin],
    ["dhuhr", times.dhuhrMin, times.asrMin],
    ["asr", times.asrMin, times.maghribMin],
    ["maghrib", times.maghribMin, times.ishaMin],
  ];
  const matched = windows.find(([, start, end]) => nowMinutes >= start && nowMinutes < end);
  return matched ? matched[0] : null;
}

function buildPrayersMap(
  ordered: Array<{ name: DailyFivePrayerId; min: number }>,
  locale: SupportedLocale,
  settings: IslamPluginSettings,
  activePrayer: DailyFivePrayerId | null,
  nextPrayer: DailyFivePrayerId
): Record<DailyFivePrayerId, PrayerWithIqamah> {
  const labels = PRAYER_LABELS[locale] ?? PRAYER_LABELS.es;
  const prayers = {} as Record<DailyFivePrayerId, PrayerWithIqamah>;
  for (const item of ordered) {
    const iq = resolveIqamahTime(item.name, item.min, settings.iqamahRules);
    prayers[item.name] = {
      name: item.name,
      label: labels[item.name],
      adhan: minutesToHhMm(item.min),
      iqamah: iq.iqamah,
      adhanMinutes: item.min,
      iqamahMinutes: iq.iqamahMinutes,
      isActive: activePrayer === item.name,
      isNext: nextPrayer === item.name,
    };
  }
  return prayers;
}

function resolveCalculationMetadata(
  settings: IslamPluginSettings,
  source: "astronomical_engine" | "external_api"
): DailyPrayerTimetable["calculation"] {
  const methodSpec = resolveMethodSpec(settings.method);
  const schoolName =
    settings.school === "2" ? "Hanafi (Shadow Factor 2)" : "Shafi'i / Standard (Shadow Factor 1)";
  return {
    methodId: methodSpec.id,
    methodName: methodSpec.name,
    schoolId: settings.school,
    schoolName,
    calendarMethod: settings.calender,
    shifting: settings.shifting,
    source,
  };
}

function resolveJumuahSummary(settings: IslamPluginSettings): DailyPrayerTimetable["jumuah"] {
  const primaryJumuah = settings.jumuahShifts.find((s) => s.isPrimary) ?? settings.jumuahShifts[0];
  return {
    primaryKhutbahTime: primaryJumuah?.khutbahTime ?? "12:15",
    primaryPrayerTime: primaryJumuah?.prayerTime ?? "12:45",
    shifts: settings.jumuahShifts,
  };
}

function resolveRamadanSummary(
  settings: IslamPluginSettings,
  locale: SupportedLocale,
  isRamadanMonth: boolean,
  imsakMin: number,
  maghribMin: number
): DailyPrayerTimetable["ramadan"] {
  return {
    bannerActive: Boolean(settings.ramadan.bannerActive || isRamadanMonth),
    suhoorEndsAt: minutesToHhMm(imsakMin),
    iftarAt: minutesToHhMm(maghribMin),
    taraweehTime: settings.ramadan.taraweehTime || "20:00",
    notes: settings.ramadan.notes[locale] ?? settings.ramadan.notes.es ?? "",
  };
}

export function computeDailyPrayerTimetable(
  dateIsoOrDate: string | Date,
  settings: IslamPluginSettings,
  overrides?: TimetableOverrides
): DailyPrayerTimetable {
  const dateObj = normalizeDateInput(dateIsoOrDate);
  const dateGregorian = dateObj.toISOString().slice(0, 10);
  const locale = overrides?.locale ?? settings.defaultLocale;
  const { lat, lon } = sanitizeCoordinates(
    overrides?.lat ?? settings.defaultLat,
    overrides?.lon ?? settings.defaultLon,
    settings.defaultLat,
    settings.defaultLon
  );
  const city = overrides?.city ?? settings.city;
  const country = overrides?.country ?? settings.country;
  const timezone = settings.timezone;

  const baseMinutes = computeBaseSolarMinutes(dateObj, lat, lon, timezone, settings);
  const dayMinutes = applyExternalTimesOverride(baseMinutes, overrides?.externalTimesOverride);

  const imsakMin = dayMinutes.fajrMin - settings.ramadan.imsakOffsetMinutes;
  const nightDurationMinutes = (dayMinutes.fajrMin + 1440 - dayMinutes.sunsetMin) % 1440;
  const midnightMin = (dayMinutes.sunsetMin + Math.round(nightDurationMinutes / 2)) % 1440;
  const lastThirdMin = (dayMinutes.sunsetMin + Math.round((nightDurationMinutes * 2) / 3)) % 1440;

  const nowMinutes = resolveCurrentMinutesInTimezone(timezone, overrides?.nowMinutesOverride);
  const prohibitedTimes = computeProhibitedWindows(
    dayMinutes.sunriseMin,
    dayMinutes.dhuhrMin,
    dayMinutes.maghribMin,
    nowMinutes
  );

  const activePrayer = determineActivePrayer(
    nowMinutes,
    prohibitedTimes.isCurrentlyProhibited,
    dayMinutes
  );

  const ordered: Array<{ name: DailyFivePrayerId; min: number }> = [
    { name: "fajr", min: dayMinutes.fajrMin },
    { name: "dhuhr", min: dayMinutes.dhuhrMin },
    { name: "asr", min: dayMinutes.asrMin },
    { name: "maghrib", min: dayMinutes.maghribMin },
    { name: "isha", min: dayMinutes.ishaMin },
  ];

  const upcoming = ordered.find((p) => p.min > nowMinutes);
  const nextPrayer: DailyFivePrayerId = upcoming ? upcoming.name : "fajr";
  const minutesUntilNextAdhan = upcoming
    ? upcoming.min - nowMinutes
    : 1440 - nowMinutes + dayMinutes.fajrMin;

  const prayers = buildPrayersMap(ordered, locale, settings, activePrayer, nextPrayer);
  const hijri = gregorianToHijri(dateObj, Number(settings.shifting), locale);

  return {
    dateGregorian,
    hijri,
    location: { city, country, lat, lon, timezone },
    calculation: resolveCalculationMetadata(settings, dayMinutes.source),
    times: {
      imsak: minutesToHhMm(imsakMin),
      fajr: minutesToHhMm(dayMinutes.fajrMin),
      sunrise: minutesToHhMm(dayMinutes.sunriseMin),
      dhuhr: minutesToHhMm(dayMinutes.dhuhrMin),
      asr: minutesToHhMm(dayMinutes.asrMin),
      sunset: minutesToHhMm(dayMinutes.sunsetMin),
      maghrib: minutesToHhMm(dayMinutes.maghribMin),
      isha: minutesToHhMm(dayMinutes.ishaMin),
      midnight: minutesToHhMm(midnightMin),
      lastThird: minutesToHhMm(lastThirdMin),
    },
    prayers,
    jumuah: resolveJumuahSummary(settings),
    prohibitedTimes,
    activePrayer,
    nextPrayer,
    minutesUntilNextAdhan,
    qibla: calculateQiblaCompass(lat, lon, city, country),
    ramadan: resolveRamadanSummary(
      settings,
      locale,
      hijri.isRamadan,
      imsakMin,
      dayMinutes.maghribMin
    ),
  };
}

export function computeMonthlyPrayerTimetable(
  yearMonth: string,
  settings: IslamPluginSettings,
  overrides?: {
    lat?: number;
    lon?: number;
    city?: string;
    country?: string;
    locale?: SupportedLocale;
  }
): DailyPrayerTimetable[] {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const result: DailyPrayerTimetable[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const isoDay = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    result.push(computeDailyPrayerTimetable(isoDay, settings, overrides));
  }

  return result;
}

export function generatePrayerCalendarIcs(
  days: DailyPrayerTimetable[],
  mosqueName: string
): string {
  const safeMosque = sanitizeIcsText(mosqueName || "Central Mosque");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vicacha Devs//Strapi Plugin Islam Salah Timetable//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${safeMosque} — Salah & Iqamah`,
  ];

  const dtStamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const prayerKeys: DailyFivePrayerId[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

  for (const day of days) {
    const dateCompact = day.dateGregorian.replace(/-/g, "");
    const safeTz = sanitizeIcsText(day.location.timezone);
    for (const pKey of prayerKeys) {
      const p = day.prayers[pKey];
      const startCompact = p.adhan.replace(":", "");
      const endMin = Math.min(1439, p.iqamahMinutes + 15);
      const endCompact = minutesToHhMm(endMin).replace(":", "");
      const uid = `salah-${dateCompact}-${pKey}@vicacha-islam`;
      const summary = sanitizeIcsText(`${p.label} — Adhan ${p.adhan} / Iqamah ${p.iqamah}`);
      const description = sanitizeIcsText(
        `${safeMosque} (${day.hijri.formatted}) • Adhan: ${p.adhan} • Iqamah: ${p.iqamah}`
      );

      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;TZID=${safeTz}:${dateCompact}T${startCompact}00`,
        `DTEND;TZID=${safeTz}:${dateCompact}T${endCompact}00`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${safeMosque}`,
        "END:VEVENT"
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
