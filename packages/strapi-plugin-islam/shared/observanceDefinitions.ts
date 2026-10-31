import type { IslamicObservanceItem, LocalizedStringMap } from './types';

export interface ObservanceDefinition {
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
