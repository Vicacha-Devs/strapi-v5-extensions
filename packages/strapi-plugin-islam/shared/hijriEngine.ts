import { HIJRI_MONTHS, LUNAR_HAWL_DAYS } from './constants';
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

export function gregorianToHijri(
  isoDateOrDate: string | Date,
  shiftingDays = 0,
  locale: SupportedLocale = 'es'
): HijriDateDetails {
  const baseDate =
    typeof isoDateOrDate === 'string'
      ? new Date(`${isoDateOrDate.slice(0, 10)}T12:00:00Z`)
      : new Date(isoDateOrDate.getTime());

  const safeShift = Number.isFinite(shiftingDays)
    ? Math.max(-2, Math.min(2, Math.trunc(shiftingDays)))
    : 0;

  const shifted = new Date(baseDate.getTime() + safeShift * 86_400_000);

  let hYear = 1448;
  let hMonth = 1;
  let hDay = 1;
  let usedIntl = false;

  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const parts = formatter.formatToParts(shifted);
    const pYear = Number(parts.find((p) => p.type === 'year')?.value);
    const pMonth = Number(parts.find((p) => p.type === 'month')?.value);
    const pDay = Number(parts.find((p) => p.type === 'day')?.value);
    if (pYear > 1300 && pMonth >= 1 && pMonth <= 12 && pDay >= 1 && pDay <= 30) {
      hYear = pYear;
      hMonth = pMonth;
      hDay = pDay;
      usedIntl = true;
    }
  } catch {
    usedIntl = false;
  }

  if (!usedIntl) {
    const jd = gregorianToJulianDay(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth() + 1,
      shifted.getUTCDate()
    );
    const fallback = julianDayToHijri(jd);
    hYear = fallback.year;
    hMonth = fallback.month;
    hDay = fallback.day;
  }

  const monthMeta = HIJRI_MONTHS[hMonth - 1] || HIJRI_MONTHS[0];
  const monthNameLocalized = monthMeta[locale] || monthMeta.en;
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
    isAyyamAlBeed: hDay === 13 || hDay === 14 || hDay === 15,
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

interface ObservanceDefinition {
  slug: string;
  hijriMonth: number;
  hijriDay: number;
  category: IslamicObservanceItem['category'];
  isPublicHolidayInIslam: boolean;
  fastingRecommendedOrObligatory: IslamicObservanceItem['fastingRecommendedOrObligatory'];
  titles: LocalizedStringMap;
  descriptions: LocalizedStringMap;
}

export const MAJOR_OBSERVANCE_DEFINITIONS: ObservanceDefinition[] = [
  {
    slug: 'islamic-new-year',
    hijriMonth: 1,
    hijriDay: 1,
    category: 'commemoration',
    isPublicHolidayInIslam: true,
    fastingRecommendedOrObligatory: 'sunnah',
    titles: {
      es: 'Año Nuevo Islámico (1 Muharram — Ra’s as-Sanah al-Hijriyyah)',
      en: 'Islamic New Year (1 Muharram — Hijri New Year)',
      ar: 'رأس السنة الهجرية (١ محرم)',
      tr: 'Hicri Yılbaşı (1 Muharrem)',
    },
    descriptions: {
      es: 'Inicio del nuevo año lunar islámico en conmemoración de la Hégira del Profeta Muhammad (ﷺ) de La Meca a Medina.',
      en: 'Beginning of the Islamic lunar year commemorating the Hijrah of Prophet Muhammad (ﷺ) from Makkah to Madinah.',
      ar: 'بداية العام الهجري الجديد إحياءً لذكرى هجرة النبي محمد ﷺ من مكة المكرمة إلى المدينة المنورة.',
      tr: 'Hz. Muhammed (s.a.v.) Mekke’den Medine’ye hicretini anan yeni Hicri yılın başlangıcı.',
    },
  },
  {
    slug: 'day-of-ashura',
    hijriMonth: 1,
    hijriDay: 10,
    category: 'fasting',
    isPublicHolidayInIslam: false,
    fastingRecommendedOrObligatory: 'sunnah',
    titles: {
      es: 'Día de Ashura (10 Muharram)',
      en: 'Day of Ashura (10 Muharram)',
      ar: 'يوم عاشوراء (١٠ محرم)',
      tr: 'Aşure Günü (10 Muharrem)',
    },
    descriptions: {
      es: 'Día de ayuno voluntario altamente recomendado (junto con el 9 o 11 de Muharram) que expía las faltas menores del año anterior.',
      en: 'Highly recommended Sunnah fast (paired with the 9th or 11th of Muharram) that expiates minor sins of the preceding year.',
      ar: 'يوم صيام مستحب (مع تاسوعاء) يكفّر السنة الماضية كما صح عن النبي ﷺ.',
      tr: 'Önceki yılın küçük günahlarına kefaret olan müstehap oruç günü (9 veya 11 Muharrem ile birlikte).',
    },
  },
  {
    slug: 'mawlid-al-nabi',
    hijriMonth: 3,
    hijriDay: 12,
    category: 'commemoration',
    isPublicHolidayInIslam: false,
    fastingRecommendedOrObligatory: 'sunnah',
    titles: {
      es: 'Natalicio del Profeta Muhammad ﷺ (12 Rabi’ al-Awwal — Mawlid)',
      en: 'Birth of Prophet Muhammad ﷺ (12 Rabi’ al-Awwal — Mawlid)',
      ar: 'ذكرى المولد النبوي الشريف (١٢ ربيع الأول)',
      tr: 'Mevlid Kandili (12 Rebiülevvel)',
    },
    descriptions: {
      es: 'Jornada de estudio de la Seerah (biografía profética), envío de Salawat y reflexión sobre la misericordia profética.',
      en: 'Day of reflection on the Prophetic Seerah, sending Salawat, and studying the character of Prophet Muhammad (ﷺ).',
      ar: 'مناسبة لمدارسة السيرة النبوية العطرة والإكثار من الصلاة والسلام على رسول الله ﷺ.',
      tr: 'Siyer-i Nebi okumaları ve Peygamber Efendimize (s.a.v.) salavatlarla idrak edilen mübarek gün.',
    },
  },
  {
    slug: 'isra-and-miraj',
    hijriMonth: 7,
    hijriDay: 27,
    category: 'sacred_night',
    isPublicHolidayInIslam: false,
    fastingRecommendedOrObligatory: 'none',
    titles: {
      es: 'Al-Isra’ wal-Mi’raj (27 Rajab — Viaje Nocturno y Ascensión)',
      en: 'Al-Isra’ wal-Mi’raj (27 Rajab — Night Journey & Ascension)',
      ar: 'ليلة الإسراء والمعراج (٢٧ رجب)',
      tr: 'Miraç Kandili (27 Recep)',
    },
    descriptions: {
      es: 'Conmemoración del viaje nocturno a Al-Quds y la ascensión celestial donde fueron prescritas las cinco oraciones diarias (Salah).',
      en: 'Commemoration of the miraculous Night Journey to Al-Aqsa and Ascension where the five daily prayers (Salah) were enjoined.',
      ar: 'ذكرى معجزة الإسراء إلى المسجد الأقصى والمعراج إلى السماوات العلى حيث فُرضت الصلوات الخمس.',
      tr: 'Beş vakit namazın farz kılındığı İsra ve Miraç mucizesinin yıl dönümü.',
    },
  },
  {
    slug: 'start-of-ramadan',
    hijriMonth: 9,
    hijriDay: 1,
    category: 'ramadan',
    isPublicHolidayInIslam: false,
    fastingRecommendedOrObligatory: 'obligatory',
    titles: {
      es: 'Inicio del Sagrado Mes de Ramadán (1 Ramadán)',
      en: 'First Day of Blessed Ramadan (1 Ramadan)',
      ar: 'غرة شهر رمضان المبارك (١ رمضان)',
      tr: 'Ramazan Ayı Başlangıcı (1 Ramazan)',
    },
    descriptions: {
      es: 'Inicio del mes de ayuno obligatorio (Sawm), revelación del Sagrado Corán, oración nocturna de Taraweeh e Iftar comunitario.',
      en: 'Start of the month of obligatory fasting (Sawm), Quranic revelation, nightly Taraweeh prayers, and community Iftars.',
      ar: 'بداية شهر الصيام والقرآن والقيام وتفطير الصائمين في المسجد.',
      tr: 'Farz oruç, Kur’an tilaveti, teravih namazları ve topluluk iftarlarının başladığı mübarek ay.',
    },
  },
  {
    slug: 'laylat-al-qadr',
    hijriMonth: 9,
    hijriDay: 27,
    category: 'sacred_night',
    isPublicHolidayInIslam: false,
    fastingRecommendedOrObligatory: 'obligatory',
    titles: {
      es: 'Laylat al-Qadr — La Noche del Decreto (27 Ramadán / Últimas 10 Noches)',
      en: 'Laylat al-Qadr — Night of Decree (27 Ramadan / Last 10 Nights)',
      ar: 'ليلة القدر خير من ألف شهر (٢٧ رمضان / العشر الأواخر)',
      tr: 'Kadir Gecesi (27 Ramazan / Son 10 Gece)',
    },
    descriptions: {
      es: 'La noche en que fue revelado el Corán, mejor que mil meses. Buscada en las noches impares de los últimos diez días de Ramadán.',
      en: 'The night the Quran was revealed, better than a thousand months, sought in the odd nights of the last ten days of Ramadan.',
      ar: 'ليلة نزول القرآن الكريم وهي خير من ألف شهر، تُلتمس في الوتر من العشر الأواخر من رمضان.',
      tr: 'Bin aydan daha hayırlı olan Kur’an’ın indirildiği mübarek gece.',
    },
  },
  {
    slug: 'eid-al-fitr',
    hijriMonth: 10,
    hijriDay: 1,
    category: 'eid',
    isPublicHolidayInIslam: true,
    fastingRecommendedOrObligatory: 'forbidden',
    titles: {
      es: 'Eid al-Fitr — Fiesta de Ruptura del Ayuno (1 Shawwal)',
      en: 'Eid al-Fitr — Festival of Breaking the Fast (1 Shawwal)',
      ar: 'عيد الفطر السعيد (١ شوال)',
      tr: 'Ramazan Bayramı — İd-ül Fıtr (1 Şevval)',
    },
    descriptions: {
      es: 'Celebración solemne al culminar Ramadán con oración congregacional de Eid, Takbirat y entrega previa de Zakat al-Fitr.',
      en: 'Joyous festival marking the completion of Ramadan with congregational Eid prayer, Takbirat, and Zakat al-Fitr distribution.',
      ar: 'عيد إتمام الصيام وتُقام فيه صلاة العيد والتكبيرات بعد إخراج زكاة الفطر.',
      tr: 'Ramazan orucunun tamamlanmasını kutlayan bayram namazı, tekbirler ve فıtır sadakası günü.',
    },
  },
  {
    slug: 'day-of-arafah',
    hijriMonth: 12,
    hijriDay: 9,
    category: 'hajj',
    isPublicHolidayInIslam: false,
    fastingRecommendedOrObligatory: 'sunnah',
    titles: {
      es: 'Día de Arafah (9 Dhu al-Hijjah)',
      en: 'Day of Arafah (9 Dhu al-Hijjah)',
      ar: 'يوم عرفة (٩ ذو الحجة)',
      tr: 'Arefe Günü (9 Zilhicce)',
    },
    descriptions: {
      es: 'Pilar culminante del Hajj. Para quienes no peregrinan, el ayuno de este día expía las faltas menores del año anterior y el siguiente.',
      en: 'Pinnacle day of Hajj. Fasting on this day for non-pilgrims expiates minor sins of the previous and coming year.',
      ar: 'ركن الحج الأعظم، وصيامه لغير الحاج يكفّر السنة الماضية والباقية.',
      tr: 'Haccın en önemli rüknü; hacda olmayanlar için tutulan oruç geçmiş ve gelecek yılın küçük günahlarına kefarettir.',
    },
  },
  {
    slug: 'eid-al-adha',
    hijriMonth: 12,
    hijriDay: 10,
    category: 'eid',
    isPublicHolidayInIslam: true,
    fastingRecommendedOrObligatory: 'forbidden',
    titles: {
      es: 'Eid al-Adha — Fiesta del Sacrificio (10 Dhu al-Hijjah)',
      en: 'Eid al-Adha — Festival of the Sacrifice (10 Dhu al-Hijjah)',
      ar: 'عيد الأضحى المبارك (١٠ ذو الحجة)',
      tr: 'Kurban Bayramı — İd-ül Edha (10 Zilhicce)',
    },
    descriptions: {
      es: 'Gran festividad islámica en recuerdo de la devoción del Profeta Ibrahim (AS), con oración de Eid y distribución solidaria de Qurbani/Udhiyah.',
      en: 'Major Islamic festival honoring the devotion of Prophet Ibrahim (AS), featuring Eid prayer and Qurbani/Udhiyah meat distribution.',
      ar: 'العيد الأكبر تخليداً لطاعة نبي الله إبراهيم عليه السلام، وفيه صلاة العيد وشعيرة الأضحية.',
      tr: 'Hz. İbrahim’in (a.s.) teslimiyetini anan bayram namazı ve kurban ibadeti günü.',
    },
  },
];

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

  const items: IslamicObservanceItem[] = MAJOR_OBSERVANCE_DEFINITIONS.map((def) => {
    let targetHijriYear = refHijri.year;
    if (
      def.hijriMonth < refHijri.monthNumber ||
      (def.hijriMonth === refHijri.monthNumber && def.hijriDay < refHijri.day)
    ) {
      targetHijriYear += 1;
    }

    let estimatedGregorian = hijriToGregorian(
      targetHijriYear,
      def.hijriMonth,
      def.hijriDay,
      shiftingDays
    );

    if (def.slug === 'start-of-ramadan' && overrides?.ramadanStartGregorian) {
      estimatedGregorian = overrides.ramadanStartGregorian;
    } else if (def.slug === 'eid-al-fitr' && overrides?.eidAlFitrDateGregorian) {
      estimatedGregorian = overrides.eidAlFitrDateGregorian;
    } else if (def.slug === 'eid-al-adha' && overrides?.eidAlAdhaDateGregorian) {
      estimatedGregorian = overrides.eidAlAdhaDateGregorian;
    }

    const estDateObj = new Date(`${estimatedGregorian}T12:00:00Z`);
    const daysUntil = Math.max(
      0,
      Math.round((estDateObj.getTime() - ref.getTime()) / 86_400_000)
    );
    const monthMeta = HIJRI_MONTHS[def.hijriMonth - 1] || HIJRI_MONTHS[0];

    return {
      id: `${def.slug}-${targetHijriYear}`,
      slug: def.slug,
      hijriMonth: def.hijriMonth,
      hijriDay: def.hijriDay,
      hijriYear: targetHijriYear,
      hijriFormatted: `${def.hijriDay} ${monthMeta[locale] || monthMeta.en} ${targetHijriYear} AH`,
      estimatedGregorianDate: estimatedGregorian,
      daysUntil,
      category: def.category,
      isPublicHolidayInIslam: def.isPublicHolidayInIslam,
      fastingRecommendedOrObligatory: def.fastingRecommendedOrObligatory,
      titles: def.titles,
      descriptions: def.descriptions,
    };
  });

  return items.sort((a, b) => a.daysUntil - b.daysUntil);
}
