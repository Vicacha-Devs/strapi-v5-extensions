export const PLUGIN_ID = "islam";

export const KAABA_COORDINATES = {
  lat: 21.422487,
  lon: 39.826206,
} as const;

export interface CalculationMethodSpec {
  id: string;
  key: string;
  name: string;
  fajrAngle: number;
  ishaAngle: number;
  ishaIntervalMinutes?: number;
  maghribAngle?: number;
}

export const PRAYER_CALCULATION_METHODS: Record<string, CalculationMethodSpec> = {
  "0": {
    id: "0",
    key: "JAFARI",
    name: "Shia Ithna-Ashari (Leva Institute, Qum)",
    fajrAngle: 16,
    ishaAngle: 14,
    maghribAngle: 4,
  },
  "1": {
    id: "1",
    key: "KARACHI",
    name: "University of Islamic Sciences, Karachi",
    fajrAngle: 18,
    ishaAngle: 18,
  },
  "2": {
    id: "2",
    key: "ISNA",
    name: "Islamic Society of North America (ISNA)",
    fajrAngle: 15,
    ishaAngle: 15,
  },
  "3": {
    id: "3",
    key: "MWL",
    name: "Muslim World League (MWL)",
    fajrAngle: 18,
    ishaAngle: 17,
  },
  "4": {
    id: "4",
    key: "MAKKAH",
    name: "Umm Al-Qura University, Makkah",
    fajrAngle: 18.5,
    ishaAngle: 0,
    ishaIntervalMinutes: 90,
  },
  "5": {
    id: "5",
    key: "EGYPT",
    name: "Egyptian General Authority of Survey",
    fajrAngle: 19.5,
    ishaAngle: 17.5,
  },
  "7": {
    id: "7",
    key: "TEHRAN",
    name: "Institute of Geophysics, University of Tehran",
    fajrAngle: 17.7,
    ishaAngle: 14,
    maghribAngle: 4.5,
  },
  "8": {
    id: "8",
    key: "GULF",
    name: "Gulf Region",
    fajrAngle: 19.5,
    ishaAngle: 0,
    ishaIntervalMinutes: 90,
  },
  "9": {
    id: "9",
    key: "KUWAIT",
    name: "Kuwait",
    fajrAngle: 18,
    ishaAngle: 17.5,
  },
  "10": {
    id: "10",
    key: "QATAR",
    name: "Qatar",
    fajrAngle: 18,
    ishaAngle: 0,
    ishaIntervalMinutes: 90,
  },
  "11": {
    id: "11",
    key: "SINGAPORE",
    name: "Majlis Ugama Islam Singapura, Singapore",
    fajrAngle: 20,
    ishaAngle: 18,
  },
  "12": {
    id: "12",
    key: "FRANCE",
    name: "Union Organization Islamic de France (UOIF)",
    fajrAngle: 12,
    ishaAngle: 12,
  },
  "13": {
    id: "13",
    key: "DIYANET",
    name: "Diyanet İşleri Başkanlığı, Türkiye",
    fajrAngle: 18,
    ishaAngle: 17,
  },
  "14": {
    id: "14",
    key: "RUSSIA",
    name: "Spiritual Administration of Muslims of Russia",
    fajrAngle: 16,
    ishaAngle: 15,
  },
  "15": {
    id: "15",
    key: "MOONSIGHTING",
    name: "Moonsighting Committee Worldwide",
    fajrAngle: 18,
    ishaAngle: 18,
  },
  "16": {
    id: "16",
    key: "DUBAI",
    name: "Dubai (UAE)",
    fajrAngle: 18.2,
    ishaAngle: 18.2,
  },
  "17": {
    id: "17",
    key: "JAKIM",
    name: "Jabatan Kemajuan Islam Malaysia (JAKIM)",
    fajrAngle: 20,
    ishaAngle: 18,
  },
  "18": {
    id: "18",
    key: "TUNISIA",
    name: "Tunisia",
    fajrAngle: 18,
    ishaAngle: 18,
  },
  "19": {
    id: "19",
    key: "ALGERIA",
    name: "Algeria",
    fajrAngle: 18,
    ishaAngle: 17,
  },
  "20": {
    id: "20",
    key: "KEMENAG",
    name: "Kementerian Agama Republik Indonesia",
    fajrAngle: 20,
    ishaAngle: 18,
  },
  "21": {
    id: "21",
    key: "MOROCCO",
    name: "Morocco",
    fajrAngle: 19,
    ishaAngle: 17,
  },
  "22": {
    id: "22",
    key: "PORTUGAL",
    name: "Comunidade Islâmica de Lisboa",
    fajrAngle: 18,
    ishaAngle: 0,
    ishaIntervalMinutes: 77,
  },
  "23": {
    id: "23",
    key: "JORDAN",
    name: "Ministry of Awqaf, Islamic Affairs and Holy Places, Jordan",
    fajrAngle: 18,
    ishaAngle: 18,
  },
};

export const ALLOWED_METHOD_IDS = Object.keys(PRAYER_CALCULATION_METHODS);
export const ALLOWED_ASR_SCHOOLS = ["1", "2"] as const;
export const ALLOWED_CALENDAR_METHODS = ["MATHEMATICAL", "UAQ", "HJCoSA", "DIYANET"] as const;
export const ALLOWED_HIJRI_SHIFTS = ["-2", "-1", "0", "1", "2"] as const;
export const ALLOWED_CURRENCIES = ["COP", "USD", "EUR", "TRY"] as const;
export const ALLOWED_LOCALES = ["es", "en", "ar", "tr"] as const;

export const NISAB_STANDARDS = {
  common: {
    goldGrams: 85,
    silverGrams: 595,
    label: "Common Contemporary Standard (85g Gold / 595g Silver)",
  },
  classical: {
    goldGrams: 87.48,
    silverGrams: 612.36,
    label: "Classical Hanafi/20 Mithqal Standard (87.48g Gold / 612.36g Silver)",
  },
} as const;

export const GOLD_CARAT_PURITY_FACTORS: Record<string, number> = {
  "24K": 1.0,
  "22K": 22 / 24,
  "21K": 21 / 24,
  "18K": 18 / 24,
  "14K": 14 / 24,
};

export const TROY_OUNCE_IN_GRAMS = 31.1034768;
export const LUNAR_HAWL_DAYS = 354;

export const HIJRI_MONTHS: Array<{
  number: number;
  ar: string;
  en: string;
  es: string;
  tr: string;
}> = [
  { number: 1, ar: "مُحَرَّم", en: "Muharram", es: "Muharram", tr: "Muharrem" },
  { number: 2, ar: "صَفَر", en: "Safar", es: "Safar", tr: "Safer" },
  { number: 3, ar: "رَبِيع الأَوَّل", en: "Rabi' al-Awwal", es: "Rabi' al-Awwal", tr: "Rebiülevvel" },
  { number: 4, ar: "رَبِيع الثَّانِي", en: "Rabi' al-Thani", es: "Rabi' al-Thani", tr: "Rebiülahir" },
  { number: 5, ar: "جُمَادَىٰ الأُولَىٰ", en: "Jumada al-Ula", es: "Yumada al-Ula", tr: "Cemaziyelevvel" },
  {
    number: 6,
    ar: "جُمَادَىٰ الآخِرَة",
    en: "Jumada al-Akhirah",
    es: "Yumada al-Ajirah",
    tr: "Cemaziyelahir",
  },
  { number: 7, ar: "رَجَب", en: "Rajab", es: "Rayab", tr: "Recep" },
  { number: 8, ar: "شَعْبَان", en: "Sha'ban", es: "Sha'ban", tr: "Şaban" },
  { number: 9, ar: "رَمَضَان", en: "Ramadan", es: "Ramadán", tr: "Ramazan" },
  { number: 10, ar: "شَوَّال", en: "Shawwal", es: "Shawwal", tr: "Şevval" },
  { number: 11, ar: "ذُو القَعْدَة", en: "Dhu al-Qi'dah", es: "Dhu al-Qa'dah", tr: "Zilkade" },
  { number: 12, ar: "ذُو الحِجَّة", en: "Dhu al-Hijjah", es: "Dhu al-Hiyyah", tr: "Zilhicce" },
];
