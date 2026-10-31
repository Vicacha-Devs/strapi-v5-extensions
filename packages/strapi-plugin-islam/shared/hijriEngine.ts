import { HIJRI_MONTHS, LUNAR_HAWL_DAYS } from './constants';
import {
  MAJOR_OBSERVANCE_DEFINITIONS,
  type ObservanceDefinition,
} from './observanceDefinitions';
import type {
  HijriDateDetails,
  IslamicObservanceItem,
  LocalizedStringMap,
  SupportedLocale,
} from './types';

const ISLAMIC_EPOCH_JD = 1948439.5;

function gregorianToJulianDay(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
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

function julianDayToGregorian(jd: number): { year: number; month: number; day: number } {
  const z = Math.floor(jd + 0.5);
  const a = Math.floor((z - 1867216.25) / 36524.25);
  const b = z + 1 + a - Math.floor(a / 4);
  const c = b + 1524;
  const d = Math.floor((c - 122.1) / 365.25);
  const e = Math.floor(365.25 * d);
  const f = Math.floor((c - e) / 30.6001);

  const day = c - e - Math.floor(30.6001 * f);
  const month = f < 14 ? f - 1 : f - 13;
  const year = month > 2 ? d - 4716 : d - 4715;
  return { year, month, day };
}

export function hijriToJulianDay(year: number, month: number, day: number): number {
  return (
    day +
    Math.ceil(29.5 * (month - 1)) +
    (year - 1) * 354 +
    Math.floor((3 + 11 * year) / 30) +
    ISLAMIC_EPOCH_JD -
    1
  );
}

export function julianDayToHijri(jd: number): { year: number; month: number; day: number } {
  const normalizedJd = Math.floor(jd) + 0.5;
  const year = Math.floor(
    (30 * (normalizedJd - ISLAMIC_EPOCH_JD) + 10646) / 10631
  );
  const month = Math.min(
    12,
    Math.ceil((normalizedJd - (29 + hijriToJulianDay(year, 1, 1))) / 29.5) + 1
  );
  const day = Math.max(
    1,
    Math.min(30, Math.floor(normalizedJd - hijriToJulianDay(year, month, 1) + 1))
  );
  return { year, month, day };
}

export function getHolidaysForHijriDate(
  month: number,
  day: number,
  locale: SupportedLocale = 'es'
): string[] {
  const results: string[] = [];
  for (const obs of MAJOR_OBSERVANCE_DEFINITIONS) {
    if (obs.hijriMonth === month && obs.hijriDay === day) {
      results.push(obs.titles[locale] || obs.titles.en);
    }
  }
  if (month === 9 && day >= 21 && day % 2 === 1) {
    const oddNightLabel: LocalizedStringMap = {
      es: `Noche impar de las últimas 10 noches de Ramadán (${day} Ramadán)`,
      en: `Odd night of the Last 10 Nights of Ramadan (${day} Ramadan)`,
      ar: `ليلة وترية من العشر الأواخر (${day} رمضان)`,
      tr: `Ramazan'ın son 10 gününün tek gecesi (${day} Ramazan)`,
    };
    results.push(oddNightLabel[locale] || oddNightLabel.en);
  }
  return results;
}

function isValidHijriTriplet(
  year: number,
  month: number,
  day: number
): boolean {
  return year > 1300 && month >= 1 && month <= 12 && day >= 1 && day <= 30;
}

function tryFormatIntlHijri(
  shifted: Date
): { year: number; month: number; day: number } | null {
  try {
    const formatter = new Intl.DateTimeFormat(
      'en-u-ca-islamic-umalqura-nu-latn',
      {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        timeZone: 'UTC',
      }
    );
    const parts = formatter.formatToParts(shifted);
    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);
    if (isValidHijriTriplet(year, month, day)) {
      return { year, month, day };
    }
    return null;
  } catch {
    return null;
  }
}

function resolveHijriYearMonthDay(shifted: Date): {
  year: number;
  month: number;
  day: number;
} {
  const fromIntl = tryFormatIntlHijri(shifted);
  if (fromIntl) {
    return fromIntl;
  }
  const jd = gregorianToJulianDay(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate()
  );
  return julianDayToHijri(jd);
}

function clampShiftingDays(shiftingDays: number): number {
  return Number.isFinite(shiftingDays)
    ? Math.max(-2, Math.min(2, Math.trunc(shiftingDays)))
    : 0;
}

export function gregorianToHijri(
  isoDateOrDate: string | Date,
  shiftingDays = 0,
  locale: SupportedLocale = 'es'
): HijriDateDetails {
  const baseDate =
    typeof isoDateOrDate === 'string'
      ? new Date(`${isoDateOrDate.slice(0, 10)}T12:00:00Z`)
      : new Date(isoDateOrDate.getTime());

  const safeShift = clampShiftingDays(shiftingDays);
  const shifted = new Date(baseDate.getTime() + safeShift * 86_400_000);
  const { year: hYear, month: hMonth, day: hDay } =
    resolveHijriYearMonthDay(shifted);

  const monthMeta = HIJRI_MONTHS[hMonth - 1] ?? HIJRI_MONTHS[0];
  const monthNameLocalized = monthMeta[locale] ?? monthMeta.en;
  const dateStr = `${String(hDay).padStart(2, '0')}-${String(hMonth).padStart(2, '0')}-${hYear}`;
  const formatted =
    locale === 'ar'
      ? `${hDay} ${monthMeta.ar} ${hYear} هـ`
      : `${hDay} ${monthNameLocalized} ${hYear} AH`;

  return {
    date: dateStr,
    day: hDay,
    monthNumber: hMonth,
    monthNameAr: monthMeta.ar,
    monthNameEn: monthMeta.en,
    monthNameEs: monthMeta.es,
    monthNameTr: monthMeta.tr,
    monthNameLocalized,
    year: hYear,
    formatted,
    shiftingApplied: safeShift,
    isAyyamAlBeed: hDay >= 13 && hDay <= 15,
    isRamadan: hMonth === 9,
    holidays: getHolidaysForHijriDate(hMonth, hDay, locale),
  };
}

export function hijriToGregorian(
  hijriYear: number,
  hijriMonth: number,
  hijriDay: number,
  shiftingDays = 0
): string {
  const safeShift = Number.isFinite(shiftingDays)
    ? Math.max(-2, Math.min(2, Math.trunc(shiftingDays)))
    : 0;
  const jd = hijriToJulianDay(hijriYear, hijriMonth, hijriDay) - safeShift;
  const greg = julianDayToGregorian(jd);
  const candidate = new Date(Date.UTC(greg.year, greg.month - 1, greg.day, 12, 0, 0));

  for (let delta = -3; delta <= 3; delta++) {
    const probe = new Date(candidate.getTime() + delta * 86_400_000);
    const check = gregorianToHijri(probe, safeShift, 'en');
    if (
      check.year === hijriYear &&
      check.monthNumber === hijriMonth &&
      check.day === hijriDay
    ) {
      return probe.toISOString().slice(0, 10);
    }
  }

  return candidate.toISOString().slice(0, 10);
}

export function calculateHawlMaturity(nisabReachedGregorianDate: string, shiftingDays = 0): {
  startDateGregorian: string;
  startHijri: HijriDateDetails;
  hawlMaturityDateGregorian: string;
  maturityHijri: HijriDateDetails;
  lunarDays: number;
  daysRemaining: number;
  isMatured: boolean;
} {
  const start = new Date(`${nisabReachedGregorianDate.slice(0, 10)}T12:00:00Z`);
  const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
  const maturity = new Date(safeStart.getTime() + LUNAR_HAWL_DAYS * 86_400_000);
  const now = new Date();
  const diffDays = Math.ceil((maturity.getTime() - now.getTime()) / 86_400_000);

  return {
    startDateGregorian: safeStart.toISOString().slice(0, 10),
    startHijri: gregorianToHijri(safeStart, shiftingDays, 'en'),
    hawlMaturityDateGregorian: maturity.toISOString().slice(0, 10),
    maturityHijri: gregorianToHijri(maturity, shiftingDays, 'en'),
    lunarDays: LUNAR_HAWL_DAYS,
    daysRemaining: Math.max(0, diffDays),
    isMatured: diffDays <= 0,
  };
}

export { MAJOR_OBSERVANCE_DEFINITIONS, type ObservanceDefinition };

function resolveTargetHijriYear(
  def: ObservanceDefinition,
  refHijri: HijriDateDetails
): number {
  const isBeforeMonth = def.hijriMonth < refHijri.monthNumber;
  const isSameMonthBeforeDay =
    def.hijriMonth === refHijri.monthNumber && def.hijriDay < refHijri.day;
  return isBeforeMonth || isSameMonthBeforeDay
    ? refHijri.year + 1
    : refHijri.year;
}

function applyObservanceDateOverride(
  slug: string,
  estimatedGregorian: string,
  overrides?: {
    ramadanStartGregorian?: string;
    eidAlFitrDateGregorian?: string;
    eidAlAdhaDateGregorian?: string;
  }
): string {
  if (!overrides) return estimatedGregorian;
  const overrideMap: Record<string, string | undefined> = {
    'start-of-ramadan': overrides.ramadanStartGregorian,
    'eid-al-fitr': overrides.eidAlFitrDateGregorian,
    'eid-al-adha': overrides.eidAlAdhaDateGregorian,
  };
  return overrideMap[slug] || estimatedGregorian;
}

function buildObservanceItem(params: {
  def: ObservanceDefinition;
  ref: Date;
  refHijri: HijriDateDetails;
  shiftingDays: number;
  locale: SupportedLocale;
  overrides?: {
    ramadanStartGregorian?: string;
    eidAlFitrDateGregorian?: string;
    eidAlAdhaDateGregorian?: string;
  };
}): IslamicObservanceItem {
  const { def, ref, refHijri, shiftingDays, locale, overrides } = params;
  const targetHijriYear = resolveTargetHijriYear(def, refHijri);
  const rawEstimated = hijriToGregorian(
    targetHijriYear,
    def.hijriMonth,
    def.hijriDay,
    shiftingDays
  );
  const estimatedGregorian = applyObservanceDateOverride(
    def.slug,
    rawEstimated,
    overrides
  );
  const estDateObj = new Date(`${estimatedGregorian}T12:00:00Z`);
  const daysUntil = Math.max(
    0,
    Math.round((estDateObj.getTime() - ref.getTime()) / 86_400_000)
  );
  const monthMeta = HIJRI_MONTHS[def.hijriMonth - 1] ?? HIJRI_MONTHS[0];
  const monthLabel = monthMeta[locale] ?? monthMeta.en;

  return {
    id: `${def.slug}-${targetHijriYear}`,
    slug: def.slug,
    hijriMonth: def.hijriMonth,
    hijriDay: def.hijriDay,
    hijriYear: targetHijriYear,
    hijriFormatted: `${def.hijriDay} ${monthLabel} ${targetHijriYear} AH`,
    estimatedGregorianDate: estimatedGregorian,
    daysUntil,
    category: def.category,
    isPublicHolidayInIslam: def.isPublicHolidayInIslam,
    fastingRecommendedOrObligatory: def.fastingRecommendedOrObligatory,
    titles: def.titles,
    descriptions: def.descriptions,
  };
}

export function computeUpcomingObservances(
  referenceDate: string | Date = new Date(),
  shiftingDays = 0,
  locale: SupportedLocale = 'es',
  overrides?: {
    ramadanStartGregorian?: string;
    eidAlFitrDateGregorian?: string;
    eidAlAdhaDateGregorian?: string;
  }
): IslamicObservanceItem[] {
  const ref =
    typeof referenceDate === 'string'
      ? new Date(`${referenceDate.slice(0, 10)}T12:00:00Z`)
      : new Date(referenceDate.getTime());
  const refHijri = gregorianToHijri(ref, shiftingDays, locale);

  const items = MAJOR_OBSERVANCE_DEFINITIONS.map((def) =>
    buildObservanceItem({
      def,
      ref,
      refHijri,
      shiftingDays,
      locale,
      overrides,
    })
  );

  return items.sort((a, b) => a.daysUntil - b.daysUntil);
}
