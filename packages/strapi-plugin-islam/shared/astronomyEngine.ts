import { KAABA_COORDINATES, PRAYER_CALCULATION_METHODS } from './constants';
import { gregorianToHijri } from './hijriEngine';
import type {
  DailyFivePrayerId,
  DailyPrayerTimetable,
  IqamahRule,
  IslamPluginSettings,
  PrayerWithIqamah,
  ProhibitedTimesWindow,
  QiblaCompassResult,
  SupportedLocale,
} from './types';
import { sanitizeCoordinates, sanitizeIcsText } from './validation';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371.0088;

const COMPASS_16 = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const;

const PRAYER_LABELS: Record<SupportedLocale, Record<DailyFivePrayerId, string>> = {
  es: {
    fajr: 'Fajr (Alba)',
    dhuhr: 'Dhuhr (Mediodía)',
    asr: 'Asr (Tarde)',
    maghrib: 'Maghrib (Ocaso)',
    isha: 'Isha (Noche)',
  },
  en: {
    fajr: 'Fajr (Dawn)',
    dhuhr: 'Dhuhr (Noon)',
    asr: 'Asr (Afternoon)',
    maghrib: 'Maghrib (Sunset)',
    isha: 'Isha (Night)',
  },
  ar: {
    fajr: 'الفجر',
    dhuhr: 'الظهر',
    asr: 'العصر',
    maghrib: 'المغرب',
    isha: 'العشاء',
  },
  tr: {
    fajr: 'İmsak / Sabah (Fecr)',
    dhuhr: 'Öğle (Zuhur)',
    asr: 'İkindi (Asr)',
    maghrib: 'Akşam (Mağrib)',
    isha: 'Yatsı (İşa)',
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

  const dLon = lon2 - lon1;
  const y = Math.sin(dLon);
  const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(dLon);
  const rawBearing = Math.atan2(y, x) * RAD_TO_DEG;
  const degrees = Math.round(((rawBearing + 360) % 360) * 100) / 100;

  const dLat = lat2 - lat1;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  const kilometers = Math.round(EARTH_RADIUS_KM * c * 100) / 100;
  const miles = Math.round(kilometers * 0.621371 * 100) / 100;

  const compassIdx = Math.round(degrees / 22.5) % 16;

  return {
    origin: { lat, lon, city, country },
    kaaba: { lat: KAABA_COORDINATES.lat, lon: KAABA_COORDINATES.lon },
    direction: {
      degrees,
      from: 'True North',
      clockwise: true,
      cardinal: COMPASS_16[compassIdx],
    },
    distance: {
      kilometers,
      miles,
    },
  };
}

function getTimezoneOffsetHours(date: Date, timeZone: string): number {
  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
    return (tzDate.getTime() - utcDate.getTime()) / 3_600_000;
  } catch {
    return -5; // Default America/Bogota UTC-5
  }
}

function solarPosition(julianDay: number): { declinationRad: number; equationOfTimeHours: number } {
  const d = julianDay - 2451545.0;
  const g = ((357.529 + 0.98560028 * d) % 360) * DEG_TO_RAD;
  const q = (280.459 + 0.98564736 * d) % 360;
  const l = ((q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360) * DEG_TO_RAD;
  const e = (23.439 - 0.00000036 * d) * DEG_TO_RAD;

  const ra =
    ((Math.atan2(Math.cos(e) * Math.sin(l), Math.cos(l)) * RAD_TO_DEG + 360) % 360) /
    15;
  const declinationRad = Math.asin(Math.sin(e) * Math.sin(l));

  let eqt = q / 15 - ra;
  if (eqt > 12) eqt -= 24;
  if (eqt < -12) eqt += 24;

  return { declinationRad, equationOfTimeHours: eqt };
}

function computeHourAngleHours(
  latRad: number,
  declinationRad: number,
  altitudeDeg: number
): number {
  const altRad = altitudeDeg * DEG_TO_RAD;
  const num = Math.sin(altRad) - Math.sin(latRad) * Math.sin(declinationRad);
  const den = Math.cos(latRad) * Math.cos(declinationRad);
  const cosH = Math.max(-1, Math.min(1, num / den));
  return (Math.acos(cosH) * RAD_TO_DEG) / 15;
}

export function minutesToHhMm(totalMinutes: number): string {
  const wrapped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(wrapped / 60);
  const mm = wrapped % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function parseHhMmToMinutes(rawTime: string | undefined | null): number | null {
  if (!rawTime || typeof rawTime !== 'string') return null;
  const clean = rawTime.trim().toUpperCase();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];
  if (minutes < 0 || minutes > 59 || hours < 0 || hours > 23) return null;
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function resolveIqamahTime(
  prayerName: DailyFivePrayerId,
  adhanMinutes: number,
  rules: IqamahRule[]
): { iqamah: string; iqamahMinutes: number } {
  const rule = rules.find((r) => r.prayerName === prayerName);
  if (!rule) {
    const defaultOffset = prayerName === 'maghrib' ? 10 : 15;
    const mins = adhanMinutes + defaultOffset;
    return { iqamah: minutesToHhMm(mins), iqamahMinutes: mins };
  }

  if (rule.mode === 'fixed_time' && rule.fixedTime) {
    const parsed = parseHhMmToMinutes(rule.fixedTime);
    if (parsed !== null && parsed >= adhanMinutes) {
      return { iqamah: minutesToHhMm(parsed), iqamahMinutes: parsed };
    }
  }

  const offset = Number.isFinite(rule.offsetMinutes) ? Math.max(0, rule.offsetMinutes) : 15;
  const mins = adhanMinutes + offset;
  return { iqamah: minutesToHhMm(mins), iqamahMinutes: mins };
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

  let activeProhibitedReason: 'sunrise' | 'zawal' | 'sunset' | null = null;
  if (nowMinutes >= sunriseMin && nowMinutes < sunriseEnd) {
    activeProhibitedReason = 'sunrise';
  } else if (nowMinutes >= zawalStart && nowMinutes < dhuhrMin) {
    activeProhibitedReason = 'zawal';
  } else if (nowMinutes >= sunsetStart && nowMinutes < maghribMin) {
    activeProhibitedReason = 'sunset';
  }

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

export function computeDailyPrayerTimetable(
  dateIsoOrDate: string | Date,
  settings: IslamPluginSettings,
  overrides?: {
    lat?: number;
    lon?: number;
    city?: string;
    country?: string;
    locale?: SupportedLocale;
    nowMinutesOverride?: number;
    externalTimesOverride?: Partial<Record<string, string>>;
  }
): DailyPrayerTimetable {
  const dateObj =
    typeof dateIsoOrDate === 'string'
      ? new Date(`${dateIsoOrDate.slice(0, 10)}T12:00:00Z`)
      : new Date(dateIsoOrDate.getTime());
  const dateGregorian = dateObj.toISOString().slice(0, 10);

  const locale = overrides?.locale || settings.defaultLocale || 'es';
  const { lat, lon } = sanitizeCoordinates(
    overrides?.lat ?? settings.defaultLat,
    overrides?.lon ?? settings.defaultLon,
    settings.defaultLat,
    settings.defaultLon
  );
  const city = overrides?.city || settings.city || 'Bogotá';
  const country = overrides?.country || settings.country || 'Colombia';
  const timezone = settings.timezone || 'America/Bogota';

  const methodSpec =
    PRAYER_CALCULATION_METHODS[settings.method] || PRAYER_CALCULATION_METHODS['3'];
  const shadowFactor = settings.school === '2' ? 2 : 1;

  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth() + 1;
  const day = dateObj.getUTCDate();

  // Julian Day at noon UTC
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd =
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    b -
    1524.5;

  const tzOffsetHours = getTimezoneOffsetHours(dateObj, timezone);
  const { declinationRad, equationOfTimeHours } = solarPosition(jd - lon / 360);
  const latRad = lat * DEG_TO_RAD;

  const solarNoonHours = 12 + tzOffsetHours - lon / 15 - equationOfTimeHours;
  const horizonAltitudeDeg = -0.8333 - 0.0347 * Math.sqrt(Math.max(0, settings.elevationMeters || 0));

  const sunriseDiffHours = computeHourAngleHours(
    latRad,
    declinationRad,
    horizonAltitudeDeg
  );
  const fajrDiffHours = computeHourAngleHours(
    latRad,
    declinationRad,
    -methodSpec.fajrAngle
  );

  const asrAltitudeRad = Math.atan(
    1 / (shadowFactor + Math.tan(Math.abs(latRad - declinationRad)))
  );
  const asrDiffHours = computeHourAngleHours(
    latRad,
    declinationRad,
    asrAltitudeRad * RAD_TO_DEG
  );

  const maghribDiffHours = methodSpec.maghribAngle
    ? computeHourAngleHours(latRad, declinationRad, -methodSpec.maghribAngle)
    : sunriseDiffHours;

  const ishaHours = methodSpec.ishaIntervalMinutes
    ? solarNoonHours + maghribDiffHours + methodSpec.ishaIntervalMinutes / 60
    : solarNoonHours +
      computeHourAngleHours(latRad, declinationRad, -methodSpec.ishaAngle);

  const adj = settings.minuteAdjustments || {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  };

  let fajrMin = Math.round((solarNoonHours - fajrDiffHours) * 60) + (adj.fajr || 0);
  let sunriseMin =
    Math.round((solarNoonHours - sunriseDiffHours) * 60) + (adj.sunrise || 0);
  let dhuhrMin = Math.round(solarNoonHours * 60) + 1 + (adj.dhuhr || 0);
  let asrMin = Math.round((solarNoonHours + asrDiffHours) * 60) + (adj.asr || 0);
  const sunsetMin = Math.round((solarNoonHours + sunriseDiffHours) * 60);
  let maghribMin =
    Math.round((solarNoonHours + maghribDiffHours) * 60) + 1 + (adj.maghrib || 0);
  let ishaMin = Math.round(ishaHours * 60) + (adj.isha || 0);

  let source: 'astronomical_engine' | 'external_api' = 'astronomical_engine';
  if (overrides?.externalTimesOverride) {
    const ext = overrides.externalTimesOverride;
    const pFajr = parseHhMmToMinutes(ext.Fajr || ext.fajr);
    const pSun = parseHhMmToMinutes(ext.Sunrise || ext.sunrise);
    const pDhuhr = parseHhMmToMinutes(ext.Dhuhr || ext.dhuhr);
    const pAsr = parseHhMmToMinutes(ext.Asr || ext.asr);
    const pMaghrib = parseHhMmToMinutes(ext.Maghrib || ext.maghrib);
    const pIsha = parseHhMmToMinutes(ext.Isha || ext.isha);
    if (
      pFajr !== null &&
      pSun !== null &&
      pDhuhr !== null &&
      pAsr !== null &&
      pMaghrib !== null &&
      pIsha !== null
    ) {
      fajrMin = pFajr;
      sunriseMin = pSun;
      dhuhrMin = pDhuhr;
      asrMin = pAsr;
      maghribMin = pMaghrib;
      ishaMin = pIsha;
      source = 'external_api';
    }
  }

  const imsakOffset = settings.ramadan?.imsakOffsetMinutes || 10;
  const imsakMin = fajrMin - imsakOffset;
  const nightDurationMinutes = (fajrMin + 1440 - sunsetMin) % 1440;
  const midnightMin = (sunsetMin + Math.round(nightDurationMinutes / 2)) % 1440;
  const lastThirdMin = (sunsetMin + Math.round((nightDurationMinutes * 2) / 3)) % 1440;

  let nowMinutes = overrides?.nowMinutesOverride;
  if (nowMinutes === undefined) {
    try {
      const nowParts = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        timeZone: timezone,
      }).formatToParts(new Date());
      const h = Number(nowParts.find((p) => p.type === 'hour')?.value || 0) % 24;
      const min = Number(nowParts.find((p) => p.type === 'minute')?.value || 0);
      nowMinutes = h * 60 + min;
    } catch {
      const now = new Date();
      nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    }
  }

  const prohibitedTimes = computeProhibitedWindows(
    sunriseMin,
    dhuhrMin,
    maghribMin,
    nowMinutes
  );

  let activePrayer: DailyFivePrayerId | null = null;
  if (!prohibitedTimes.isCurrentlyProhibited) {
    if (nowMinutes >= ishaMin || nowMinutes < fajrMin) activePrayer = 'isha';
    else if (nowMinutes >= fajrMin && nowMinutes < sunriseMin) activePrayer = 'fajr';
    else if (nowMinutes >= dhuhrMin && nowMinutes < asrMin) activePrayer = 'dhuhr';
    else if (nowMinutes >= asrMin && nowMinutes < maghribMin) activePrayer = 'asr';
    else if (nowMinutes >= maghribMin && nowMinutes < ishaMin) activePrayer = 'maghrib';
  }

  const ordered: Array<{ name: DailyFivePrayerId; min: number }> = [
    { name: 'fajr', min: fajrMin },
    { name: 'dhuhr', min: dhuhrMin },
    { name: 'asr', min: asrMin },
    { name: 'maghrib', min: maghribMin },
    { name: 'isha', min: ishaMin },
  ];

  const upcoming = ordered.find((p) => p.min > nowMinutes);
  const nextPrayer: DailyFivePrayerId = upcoming ? upcoming.name : 'fajr';
  const minutesUntilNextAdhan = upcoming
    ? upcoming.min - nowMinutes
    : 1440 - nowMinutes + fajrMin;

  const labels = PRAYER_LABELS[locale] || PRAYER_LABELS.es;
  const prayers = {} as Record<DailyFivePrayerId, PrayerWithIqamah>;
  for (const item of ordered) {
    const iq = resolveIqamahTime(item.name, item.min, settings.iqamahRules || []);
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

  const hijri = gregorianToHijri(dateObj, Number(settings.shifting || 0), locale);
  const qibla = calculateQiblaCompass(lat, lon, city, country);
  const primaryJumuah =
    settings.jumuahShifts?.find((s) => s.isPrimary) || settings.jumuahShifts?.[0];

  return {
    dateGregorian,
    hijri,
    location: {
      city,
      country,
      lat,
      lon,
      timezone,
    },
    calculation: {
      methodId: methodSpec.id,
      methodName: methodSpec.name,
      schoolId: settings.school,
      schoolName:
        settings.school === '2' ? 'Hanafi (Shadow Factor 2)' : "Shafi'i / Standard (Shadow Factor 1)",
      calendarMethod: settings.calender,
      shifting: settings.shifting,
      source,
    },
    times: {
      imsak: minutesToHhMm(imsakMin),
      fajr: minutesToHhMm(fajrMin),
      sunrise: minutesToHhMm(sunriseMin),
      dhuhr: minutesToHhMm(dhuhrMin),
      asr: minutesToHhMm(asrMin),
      sunset: minutesToHhMm(sunsetMin),
      maghrib: minutesToHhMm(maghribMin),
      isha: minutesToHhMm(ishaMin),
      midnight: minutesToHhMm(midnightMin),
      lastThird: minutesToHhMm(lastThirdMin),
    },
    prayers,
    jumuah: {
      primaryKhutbahTime: primaryJumuah?.khutbahTime || '12:15',
      primaryPrayerTime: primaryJumuah?.prayerTime || '12:45',
      shifts: settings.jumuahShifts || [],
    },
    prohibitedTimes,
    activePrayer,
    nextPrayer,
    minutesUntilNextAdhan,
    qibla,
    ramadan: {
      bannerActive: Boolean(settings.ramadan?.bannerActive || hijri.isRamadan),
      suhoorEndsAt: minutesToHhMm(imsakMin),
      iftarAt: minutesToHhMm(maghribMin),
      taraweehTime: settings.ramadan?.taraweehTime || '20:00',
      notes:
        settings.ramadan?.notes?.[locale] ||
        settings.ramadan?.notes?.es ||
        '',
    },
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
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const result: DailyPrayerTimetable[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const isoDay = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    result.push(computeDailyPrayerTimetable(isoDay, settings, overrides));
  }

  return result;
}

export function generatePrayerCalendarIcs(
  days: DailyPrayerTimetable[],
  mosqueName: string
): string {
  const safeMosque = sanitizeIcsText(mosqueName || 'Central Mosque');
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vicacha Devs//Strapi Plugin Islam Salah Timetable//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${safeMosque} — Salah & Iqamah`,
  ];

  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const prayerKeys: DailyFivePrayerId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  for (const day of days) {
    const dateCompact = day.dateGregorian.replace(/-/g, '');
    for (const pKey of prayerKeys) {
      const p = day.prayers[pKey];
      const startCompact = p.adhan.replace(':', '');
      const endMin = Math.min(1439, p.iqamahMinutes + 15);
      const endCompact = minutesToHhMm(endMin).replace(':', '');
      const uid = `salah-${dateCompact}-${pKey}@vicacha-islam`;
      const summary = sanitizeIcsText(`${p.label} — Adhan ${p.adhan} / Iqamah ${p.iqamah}`);
      const description = sanitizeIcsText(
        `${safeMosque} (${day.hijri.formatted}) • Adhan: ${p.adhan} • Iqamah: ${p.iqamah}`
      );

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;TZID=${sanitizeIcsText(day.location.timezone)}:${dateCompact}T${startCompact}00`,
        `DTEND;TZID=${sanitizeIcsText(day.location.timezone)}:${dateCompact}T${endCompact}00`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${safeMosque}`,
        'END:VEVENT'
      );
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
