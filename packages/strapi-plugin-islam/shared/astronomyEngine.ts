import { generatePrayerCalendarIcs } from "./astronomyIcs";
import {
  calculateQiblaCompass,
  computeHourAngleHours,
  computeProhibitedWindows,
  minutesToHhMm,
  parseHhMmToMinutes,
  PRAYER_LABELS,
  resolveIqamahTime,
} from "./astronomyMath";
import {
  computeBaseSolarMinutes,
  resolveMethodSpec,
  type BaseSolarMinutes,
} from "./astronomySolarSolver";
import { gregorianToHijri } from "./hijriEngine";
import type {
  DailyFivePrayerId,
  DailyPrayerTimetable,
  IslamPluginSettings,
  PrayerWithIqamah,
  SupportedLocale,
} from "./types";
import {
  sanitizeCoordinates,
  sanitizeImsakOffsetMinutes,
  sanitizeIsoDateYmd,
  sanitizeIsoYearMonth,
  sanitizeTimezone,
} from "./validation";

export {
  calculateQiblaCompass,
  computeHourAngleHours,
  computeProhibitedWindows,
  generatePrayerCalendarIcs,
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

interface ComputedDayMinutes extends BaseSolarMinutes {
  source: "astronomical_engine" | "external_api";
}

function normalizeDateInput(dateIsoOrDate: string | Date): Date {
  if (typeof dateIsoOrDate === "string") {
    const cleanIso = sanitizeIsoDateYmd(dateIsoOrDate);
    return new Date(`${cleanIso}T12:00:00Z`);
  }
  const copy = new Date(dateIsoOrDate.getTime());
  return Number.isNaN(copy.getTime()) ? new Date() : copy;
}

function applyExternalTimesOverride(
  base: BaseSolarMinutes,
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
  const [fajrMin, sunriseMin, dhuhrMin, asrMin, maghribMin, ishaMin] =
    parsed as number[];
  if (
    !(
      fajrMin < sunriseMin &&
      sunriseMin < dhuhrMin &&
      dhuhrMin < asrMin &&
      asrMin < maghribMin &&
      maghribMin < ishaMin
    )
  ) {
    return { ...base, source: "astronomical_engine" };
  }
  return {
    fajrMin,
    sunriseMin,
    dhuhrMin,
    asrMin,
    sunsetMin: Math.min(maghribMin, base.sunsetMin),
    maghribMin,
    ishaMin,
    source: "external_api",
  };
}

function resolveCurrentMinutesInTimezone(
  timezone: string,
  nowMinutesOverride?: number
): number {
  if (nowMinutesOverride !== undefined && Number.isFinite(nowMinutesOverride)) {
    return ((Math.trunc(nowMinutesOverride) % 1440) + 1440) % 1440;
  }
  const safeTz = sanitizeTimezone(timezone, "UTC");
  try {
    const nowParts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
      timeZone: safeTz,
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
  times: BaseSolarMinutes
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
  const matched = windows.find(
    ([, start, end]) => nowMinutes >= start && nowMinutes < end
  );
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
    settings.school === "2"
      ? "Hanafi (Shadow Factor 2)"
      : "Shafi'i / Standard (Shadow Factor 1)";
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

function resolveJumuahSummary(
  settings: IslamPluginSettings
): DailyPrayerTimetable["jumuah"] {
  const shifts = Array.isArray(settings.jumuahShifts)
    ? settings.jumuahShifts
    : [];
  const primaryJumuah = shifts.find((s) => s.isPrimary) ?? shifts[0];
  return {
    primaryKhutbahTime: primaryJumuah?.khutbahTime ?? "12:15",
    primaryPrayerTime: primaryJumuah?.prayerTime ?? "12:45",
    shifts,
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
  const timezone = sanitizeTimezone(settings.timezone, "UTC");

  const baseMinutes = computeBaseSolarMinutes(
    dateObj,
    lat,
    lon,
    timezone,
    settings
  );
  const dayMinutes = applyExternalTimesOverride(
    baseMinutes,
    overrides?.externalTimesOverride
  );

  const imsakOffset = sanitizeImsakOffsetMinutes(
    settings.ramadan?.imsakOffsetMinutes,
    10
  );
  const imsakMin = Math.max(0, dayMinutes.fajrMin - imsakOffset);
  const nightDurationMinutes =
    (dayMinutes.fajrMin + 1440 - dayMinutes.sunsetMin) % 1440;
  const midnightMin =
    (dayMinutes.sunsetMin + Math.round(nightDurationMinutes / 2)) % 1440;
  const lastThirdMin =
    (dayMinutes.sunsetMin + Math.round((nightDurationMinutes * 2) / 3)) % 1440;

  const nowMinutes = resolveCurrentMinutesInTimezone(
    timezone,
    overrides?.nowMinutesOverride
  );
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

  const prayers = buildPrayersMap(
    ordered,
    locale,
    settings,
    activePrayer,
    nextPrayer
  );
  const hijri = gregorianToHijri(
    dateObj,
    Number(settings.shifting),
    locale,
    settings.calender
  );

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
  const safeYm = sanitizeIsoYearMonth(yearMonth);
  const [yearStr, monthStr] = safeYm.split("-");
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
