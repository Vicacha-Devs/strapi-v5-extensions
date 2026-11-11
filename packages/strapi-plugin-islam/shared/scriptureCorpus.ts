import { CURATED_DUAS, CURATED_HADITHS } from "./corpusHadithsAndDuas";
import { CURATED_AYAT, SURAH_DIRECTORY } from "./corpusSurahsAndAyat";
import type {
  AsmaUlHusnaItem,
  DailyInspirationBundle,
  DailyInspirationPins,
  LocalizedStringMap,
  SupportedLocale,
  TasbihPresetItem,
} from "./types";
import { sanitizeIsoDateYmd, sanitizeLocale } from "./validation";

export { CURATED_AYAT, CURATED_DUAS, CURATED_HADITHS, SURAH_DIRECTORY };

export const ASMA_UL_HUSNA: AsmaUlHusnaItem[] = [
  {
    number: 1,
    arabic: "الرَّحْمَٰنُ",
    transliteration: "Ar-Rahman",
    meanings: {
      es: "El Clemente / El Infinitamente Misericordioso",
      en: "The Entirely Merciful",
      ar: "ذو الرحمة الواسعة التي وسعت كل شيء",
      tr: "Er-Rahmân (Sonsuz Merhamet Sahibi)",
    },
    reflections: {
      es: "Su misericordia abarca a toda la creación sin excepción en esta vida.",
      en: "His encompassing mercy embraces all creation without exception.",
      ar: "رحمة شاملة لجميع الخلائق في الدنيا.",
      tr: "Dünyada bütün yaratılmışları kuşatan sınırsız rahmet sahibi.",
    },
    quranReference: "1:1, 55:1",
  },
  {
    number: 2,
    arabic: "الرَّحِيمُ",
    transliteration: "Ar-Rahim",
    meanings: {
      es: "El Misericordiosísimo / El Compasivo Especial",
      en: "The Especially Merciful",
      ar: "المتفضل بالرحمة الخاصة بالمؤمنين",
      tr: "Er-Rahîm (Çok Bağışlayıcı ve Merhamet Edici)",
    },
    reflections: {
      es: "Misericordia continua y eterna que guía, perdona y sostiene el corazón creyente.",
      en: "Continuous, intimate mercy that guides, forgives, and sustains the believer.",
      ar: "رحمة متصلة بالمؤمنين هدايةً ومغفرةً.",
      tr: "Müminlere ahirette ve dünyada özel merhamet ve mağfiret ihsan eden.",
    },
    quranReference: "1:3, 33:43",
  },
  {
    number: 3,
    arabic: "السَّلَامُ",
    transliteration: "As-Salam",
    meanings: {
      es: "La Paz / La Fuente de Toda Paz y Perfección",
      en: "The Source of Peace and Perfection",
      ar: "السالم من كل نقص ومانح السلام لعباده",
      tr: "Es-Selâm (Esenlik ve Barış Kaynağı)",
    },
    reflections: {
      es: "De Él proviene la serenidad interior y a Él pedimos paz para nuestra comunidad y el mundo.",
      en: "From Him comes inner tranquility, safety, and peace for humanity.",
      ar: "منه السلام وإليه يعود السلام.",
      tr: "Kalplere huzur ve dünyaya esenlik bahşeden.",
    },
    quranReference: "59:23",
  },
  {
    number: 4,
    arabic: "الرَّزَّاقُ",
    transliteration: "Ar-Razzaq",
    meanings: {
      es: "El Sustentador Supremo / El Proveedor",
      en: "The Total Provider and Sustainer",
      ar: "المتكفل بأرزاق الخلق المادية والروحية",
      tr: "Er-Rezzâk (Bütün Canlıların Rızkını Veren)",
    },
    reflections: {
      es: "Quien confía en Ar-Razzaq comparte su sustento con generosidad sabiendo que toda provisión viene de Él.",
      en: "Trusting in Ar-Razzaq inspires generosity, knowing all sustenance flows from His treasury.",
      ar: "اليقين بأن الرزق بيد الله يثمر التوكل والإنفاق.",
      tr: "Maddi ve manevi her türlü rızkı kesintisiz ihsan eden.",
    },
    quranReference: "51:58",
  },
  {
    number: 5,
    arabic: "الْغَفُورُ",
    transliteration: "Al-Ghafur",
    meanings: {
      es: "El Siempre Perdonador / El Indulgente",
      en: "The All-Forgiving",
      ar: "الذي يغفر الذنوب ويستر العيوب مهما عظمت",
      tr: "El-Gafûr (Çok Bağışlayan)",
    },
    reflections: {
      es: "Nunca desesperes de Su perdón; Él cubre las faltas y recibe con amor a quien vuelve a Él.",
      en: "Never despair of His mercy; He conceals faults and welcomes all who turn back to Him.",
      ar: "يغفر الذنب ويقبل التوب ويعفو عن الكثير.",
      tr: "Günahları örten ve tövbe edenleri sonsuzca bağışlayan.",
    },
    quranReference: "39:53",
  },
];

export const TASBIH_PRESETS: TasbihPresetItem[] = [
  {
    id: "subhanallah-33",
    arabic: "سُبْحَانَ اللَّهِ",
    transliteration: "SubhanAllah",
    translations: {
      es: "Glorificado y libre de toda imperfección sea Alá",
      en: "Glory be to Allah (Free is He from all imperfection)",
      ar: "تنزيه الله وتعظيمه دبر كل صلاة",
      tr: "Allah her türlü eksiklikten münezzehtir",
    },
    targetCount: 33,
    virtue: {
      es: "Parte del Tasbih profético tras cada oración (33 veces).",
      en: "Part of the Prophetic post-prayer Tasbih (33 times).",
      ar: "تُقال ٣٣ مرة بعد كل صلاة مكتوبة.",
      tr: "Her farz namazın ardından 33 defa okunur.",
    },
  },
  {
    id: "alhamdulillah-33",
    arabic: "الْحَمْدُ لِلَّهِ",
    transliteration: "Alhamdulillah",
    translations: {
      es: "Toda alabanza y gratitud pertenece a Alá",
      en: "All praise and gratitude belong to Allah",
      ar: "ثناءٌ وشكرٌ لله على نعمه الظاهرة والباطنة",
      tr: "Hamd ve şükür yalnızca Allah’a mahsustur",
    },
    targetCount: 33,
    virtue: {
      es: "Llena la balanza de las buenas obras (Sahih Muslim #223).",
      en: "Fills the scale of good deeds (Sahih Muslim #223).",
      ar: "والحمد لله تملأ الميزان (صحيح مسلم).",
      tr: "Mizanı sevapla dolduran şükür zikri (Müslim #223).",
    },
  },
  {
    id: "allahu-akbar-34",
    arabic: "اللَّهُ أَكْبَرُ",
    transliteration: "Allahu Akbar",
    translations: {
      es: "Alá es el Más Grande",
      en: "Allah is the Greatest",
      ar: "تكبير الله وإجلاله فوق كل شيء",
      tr: "Allah en büyüktür",
    },
    targetCount: 34,
    virtue: {
      es: "Completa las 100 alabanzas tras cada oración obligatoria.",
      en: "Completes the 100 remembrances after each obligatory prayer.",
      ar: "تتمة المائة في تسبيح دبر الصلاة.",
      tr: "Namaz tesbihatını 100’e tamamlayan tekbir.",
    },
  },
  {
    id: "astaghfirullah-100",
    arabic: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
    transliteration: "Astaghfirullaha wa atubu ilayh",
    translations: {
      es: "Pido perdón a Alá y me vuelvo a Él en arrepentimiento",
      en: "I seek forgiveness from Allah and repent to Him",
      ar: "استغفار وتوبة تجلب الفرج والرزق",
      tr: "Allah’tan bağışlanma diler ve O’na tövbe ederim",
    },
    targetCount: 100,
    virtue: {
      es: "El Profeta (ﷺ) pedía perdón a Alá más de 70 o 100 veces al día.",
      en: "The Prophet (ﷺ) sought forgiveness from Allah 70 to 100 times daily.",
      ar: "سنة نبوية يومية تفتح أبواب الرزق والسكينة.",
      tr: "Peygamber Efendimizin (s.a.v.) her gün 100 defa okuduğu istiğfar.",
    },
  },
];

export const SHAHADA_REFERENCE = {
  arabic: "أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّٰهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّٰهِ",
  transliteration:
    "Ash-hadu an la ilaha illa Allah, wa ash-hadu anna Muhammadan Rasulu Allah",
  translations: {
    es: "Atestiguo que no hay divinidad digna de adoración sino Alá, y atestiguo que Muhammad es el Mensajero de Alá.",
    en: "I bear witness that there is no deity worthy of worship except Allah, and I bear witness that Muhammad is the Messenger of Allah.",
    ar: "شهادة التوحيد والرسالة، مفتاح الدخول في الإسلام وركنه الأول.",
    tr: "Şahitlik ederim ki Allah’tan başka ilah yoktur ve yine şahitlik ederim ki Muhammed O’nun kulu ve elçisiidir.",
  } as LocalizedStringMap,
};

export const FIVE_PILLARS_REFERENCE: Array<{
  order: number;
  slug: string;
  arabicName: string;
  transliteration: string;
  titles: LocalizedStringMap;
  summaries: LocalizedStringMap;
}> = [
  {
    order: 1,
    slug: "shahada",
    arabicName: "الشَّهَادَتَان",
    transliteration: "Ash-Shahadatan",
    titles: {
      es: "1. Shahada (Testimonio de Fe)",
      en: "1. Shahada (Declaration of Faith)",
      ar: "١. الشهادتان",
      tr: "1. Kelime-i Şehâdet",
    },
    summaries: {
      es: "Reconocer con sinceridad la Unicidad absoluta de Dios (Alá) y la profecía de Muhammad (ﷺ).",
      en: "Sincerely affirming the absolute Oneness of God (Allah) and the prophethood of Muhammad (ﷺ).",
      ar: "الإقرار بوحدانية الله جل وعلا وبرسالة نبيه محمد ﷺ.",
      tr: "Allah’ın birliğine ve Hz. Muhammed’in (s.a.v.) O’nun elçisi olduğuna kalpten inanıp dil ile ikrar etmek.",
    },
  },
  {
    order: 2,
    slug: "salah",
    arabicName: "الصَّلَاة",
    transliteration: "As-Salah",
    titles: {
      es: "2. Salah (Las Cinco Oraciones Diarias)",
      en: "2. Salah (The Five Daily Prayers)",
      ar: "٢. إقام الصلاة",
      tr: "2. Namaz (Salât)",
    },
    summaries: {
      es: "Vínculo espiritual directo con el Creador cinco veces al día en dirección a la Qibla (Fajr, Dhuhr, Asr, Maghrib e Isha).",
      en: "Direct spiritual connection with the Creator five times daily facing the Qibla (Fajr, Dhuhr, Asr, Maghrib, and Isha).",
      ar: "الصلة اليومية المباشرة بين العبد وربه خمس مرات في اليوم والليلة.",
      tr: "Günde beş vakit Kıble’ye yönelerek Allah’ın huzurunda durmak ve kulluğu yenilemek.",
    },
  },
  {
    order: 3,
    slug: "zakat",
    arabicName: "الزَّكَاة",
    transliteration: "Az-Zakah",
    titles: {
      es: "3. Zakat (Purificación Solidaria de la Riqueza — 2.5%)",
      en: "3. Zakat (Obligatory Almsgiving — 2.5%)",
      ar: "٣. إيتاء الزكاة",
      tr: "3. Zekât",
    },
    summaries: {
      es: "Aporte anual del 2.5% del patrimonio neto que supera el Nisab para dignificar a los vulnerables y sostener la comunidad.",
      en: "Annual contribution of 2.5% of net wealth above the Nisab threshold to uplift those in need.",
      ar: "تطهير المال ومواساة الفقراء والمستحقين بنسبة ٢.٥٪ ممن بلغ النصاب وحال عليه الحول.",
      tr: "Nisap miktarını aşan mal varlığının yılda %2,5’ini ihtiyaç sahipleriyle paylaşarak malı arındırmak.",
    },
  },
  {
    order: 4,
    slug: "sawm",
    arabicName: "الصَّوْم",
    transliteration: "As-Sawm",
    titles: {
      es: "4. Sawm (Ayuno del Mes de Ramadán)",
      en: "4. Sawm (Fasting in the Month of Ramadan)",
      ar: "٤. صوم رمضان",
      tr: "4. Ramazan Orucu (Savm)",
    },
    summaries: {
      es: "Abstinencia desde el alba (Fajr) hasta el ocaso (Maghrib) durante Ramadán para cultivar Taqwa, gratitud y empatía.",
      en: "Abstaining from dawn (Fajr) to sunset (Maghrib) during Ramadan to nurture Taqwa, gratitude, and compassion.",
      ar: "الإمساك عن المفطرات من الفجر إلى المغرب إيماناً واحتساباً طوال شهر رمضان.",
      tr: "Ramazan ayı boyunca imsak vaktinden akşam ezanına kadar ibadet niyetiyle oruç tutmak.",
    },
  },
  {
    order: 5,
    slug: "hajj",
    arabicName: "الْحَجّ",
    transliteration: "Al-Hajj",
    titles: {
      es: "5. Hajj (Peregrinación a La Meca)",
      en: "5. Hajj (Pilgrimage to Makkah)",
      ar: "٥. حج البيت لمن استطاع إليه سبيلا",
      tr: "5. Hac",
    },
    summaries: {
      es: "Peregrinación a la Sagrada Kaaba en La Meca al menos una vez en la vida para quien disponga de salud y medios.",
      en: "Pilgrimage to the Sacred Kaaba in Makkah once in a lifetime for those physically and financially able.",
      ar: "قصد بيت الله الحرام بمكة المكرمة لأداء المناسك مرة في العمر للمستطيع.",
      tr: "Sağlık ve mali imkânı elverenlerin ömründe bir kez Mekke’deki Kâbe-i Muazzama’yı ziyaret ederek hac menasikini yerine getirmesi.",
    },
  },
];

function findById<T extends { id: string }>(
  items: readonly T[],
  id?: string | null
): T | undefined {
  return id ? items.find((item) => item.id === id) : undefined;
}

export function getDailyInspirationBundle(
  dateIso: string,
  locale: SupportedLocale = "es",
  pins?: DailyInspirationPins
): DailyInspirationBundle {
  const cleanDate = sanitizeIsoDateYmd(dateIso);
  const safeLocale = sanitizeLocale(locale, "es");
  const rawSeed = cleanDate.split("-").reduce((acc, part) => {
    const parsed = Number(part);
    const safePart = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    return acc * 31 + safePart;
  }, 7);
  const seed = Number.isFinite(rawSeed) ? Math.abs(Math.trunc(rawSeed)) : 7;

  const pinnedAyah = findById(CURATED_AYAT, pins?.pinnedAyahId);
  const pinnedHadith = findById(CURATED_HADITHS, pins?.pinnedHadithId);
  const pinnedDua = findById(CURATED_DUAS, pins?.pinnedDuaId);
  const pinnedAsma = pins?.pinnedAsmaNumber
    ? ASMA_UL_HUSNA.find((n) => n.number === pins.pinnedAsmaNumber)
    : undefined;

  return {
    date: cleanDate,
    locale: safeLocale,
    ayahOfTheDay: pinnedAyah ?? CURATED_AYAT[seed % CURATED_AYAT.length],
    hadithOfTheDay:
      pinnedHadith ?? CURATED_HADITHS[(seed + 3) % CURATED_HADITHS.length],
    duaOfTheDay: pinnedDua ?? CURATED_DUAS[(seed + 5) % CURATED_DUAS.length],
    nameOfAllahOfTheDay:
      pinnedAsma ?? ASMA_UL_HUSNA[(seed + 7) % ASMA_UL_HUSNA.length],
    isPinnedOverride: {
      ayah: Boolean(pinnedAyah),
      hadith: Boolean(pinnedHadith),
      dua: Boolean(pinnedDua),
      asma: Boolean(pinnedAsma),
    },
  };
}
