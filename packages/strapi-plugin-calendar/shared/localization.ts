import type {
  CalendarDirection,
  CalendarDirectionSetting,
  FullCalendarLocaleDefinition,
} from './types';

const RTL_LANGUAGE_PREFIXES = new Set(['ar', 'he', 'iw', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi']);

export const SUPPORTED_CALENDAR_LOCALES: FullCalendarLocaleDefinition[] = [
  {
    code: 'en',
    label: 'English',
    nativeName: 'English',
    direction: 'ltr',
    week: { dow: 0, doy: 4 },
    buttonText: {
      prev: 'Prev',
      next: 'Next',
      today: 'Today',
      year: 'Year',
      month: 'Month',
      week: 'Week',
      day: 'Day',
      list: 'Agenda',
    },
    weekText: 'Wk',
    allDayText: 'all-day',
    moreLinkText: 'more',
    noEventsText: 'No events to display',
  },
  {
    code: 'es',
    label: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    week: { dow: 1, doy: 4 },
    buttonText: {
      prev: 'Ant',
      next: 'Sig',
      today: 'Hoy',
      year: 'Año',
      month: 'Mes',
      week: 'Semana',
      day: 'Día',
      list: 'Agenda',
    },
    weekText: 'Sm',
    allDayText: 'todo el día',
    moreLinkText: 'más',
    noEventsText: 'No hay eventos para mostrar',
  },
  {
    code: 'fr',
    label: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    week: { dow: 1, doy: 4 },
    buttonText: {
      prev: 'Préc',
      next: 'Suiv',
      today: "Aujourd'hui",
      year: 'Année',
      month: 'Mois',
      week: 'Semaine',
      day: 'Jour',
      list: 'Planning',
    },
    weekText: 'Sem.',
    allDayText: 'toute la journée',
    moreLinkText: 'en plus',
    noEventsText: 'Aucun événement à afficher',
  },
  {
    code: 'de',
    label: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    week: { dow: 1, doy: 4 },
    buttonText: {
      prev: 'Zurück',
      next: 'Weiter',
      today: 'Heute',
      year: 'Jahr',
      month: 'Monat',
      week: 'Woche',
      day: 'Tag',
      list: 'Terminübersicht',
    },
    weekText: 'KW',
    allDayText: 'ganztägig',
    moreLinkText: 'weitere',
    noEventsText: 'Keine Ereignisse anzuzeigen',
  },
  {
    code: 'pt',
    label: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    week: { dow: 0, doy: 4 },
    buttonText: {
      prev: 'Ant',
      next: 'Próx',
      today: 'Hoje',
      year: 'Ano',
      month: 'Mês',
      week: 'Semana',
      day: 'Dia',
      list: 'Agenda',
    },
    weekText: 'Sem',
    allDayText: 'dia inteiro',
    moreLinkText: 'mais',
    noEventsText: 'Não há eventos para mostrar',
  },
  {
    code: 'it',
    label: 'Italian',
    nativeName: 'Italiano',
    direction: 'ltr',
    week: { dow: 1, doy: 4 },
    buttonText: {
      prev: 'Prec',
      next: 'Succ',
      today: 'Oggi',
      year: 'Anno',
      month: 'Mese',
      week: 'Settimana',
      day: 'Giorno',
      list: 'Agenda',
    },
    weekText: 'Set',
    allDayText: 'tutto il giorno',
    moreLinkText: 'altri',
    noEventsText: 'Non ci sono eventi da visualizzare',
  },
  {
    code: 'nl',
    label: 'Dutch',
    nativeName: 'Nederlands',
    direction: 'ltr',
    week: { dow: 1, doy: 4 },
    buttonText: {
      prev: 'Vorige',
      next: 'Volgende',
      today: 'Vandaag',
      year: 'Jaar',
      month: 'Maand',
      week: 'Week',
      day: 'Dag',
      list: 'Lijst',
    },
    weekText: 'Wk',
    allDayText: 'hele dag',
    moreLinkText: 'extra',
    noEventsText: 'Geen evenementen om te laten zien',
  },
  {
    code: 'pl',
    label: 'Polish',
    nativeName: 'Polski',
    direction: 'ltr',
    week: { dow: 1, doy: 4 },
    buttonText: {
      prev: 'Poprzedni',
      next: 'Następny',
      today: 'Dziś',
      year: 'Rok',
      month: 'Miesiąc',
      week: 'Tydzień',
      day: 'Dzień',
      list: 'Plan dnia',
    },
    weekText: 'Tydz',
    allDayText: 'cały dzień',
    moreLinkText: 'więcej',
    noEventsText: 'Brak wydarzeń do wyświetlenia',
  },
  {
    code: 'tr',
    label: 'Turkish',
    nativeName: 'Türkçe',
    direction: 'ltr',
    week: { dow: 1, doy: 7 },
    buttonText: {
      prev: 'geri',
      next: 'ileri',
      today: 'bugün',
      year: 'Yıl',
      month: 'Ay',
      week: 'Hafta',
      day: 'Gün',
      list: 'Ajanda',
    },
    weekText: 'Hf',
    allDayText: 'tüm gün',
    moreLinkText: 'daha fazla',
    noEventsText: 'Gösterilecek etkinlik yok',
  },
  {
    code: 'ar',
    label: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    week: { dow: 6, doy: 12 },
    buttonText: {
      prev: 'السابق',
      next: 'التالي',
      today: 'اليوم',
      year: 'سنة',
      month: 'شهر',
      week: 'أسبوع',
      day: 'يوم',
      list: 'أجندة',
    },
    weekText: 'أسبوع',
    allDayText: 'اليوم كله',
    moreLinkText: 'أخرى',
    noEventsText: 'أي أحداث لعرض',
  },
];

export function normalizeLocaleCode(locale?: string): string {
  if (!locale || typeof locale !== 'string') {
    return 'en';
  }
  const cleaned = locale.trim().toLowerCase().replace('_', '-');
  if (!cleaned || cleaned === 'auto') {
    return 'en';
  }
  const exact = SUPPORTED_CALENDAR_LOCALES.find((l) => l.code === cleaned);
  if (exact) {
    return exact.code;
  }
  const baseLang = cleaned.split('-')[0];
  const baseMatch = SUPPORTED_CALENDAR_LOCALES.find((l) => l.code === baseLang);
  return baseMatch ? baseMatch.code : baseLang || 'en';
}

export function isRtlLocale(locale?: string): boolean {
  const normalized = normalizeLocaleCode(locale);
  const baseLang = normalized.split('-')[0];
  return RTL_LANGUAGE_PREFIXES.has(baseLang);
}

export function getLocalizedCalendarBundle(
  locale?: string
): FullCalendarLocaleDefinition {
  const code = normalizeLocaleCode(locale);
  return (
    SUPPORTED_CALENDAR_LOCALES.find((l) => l.code === code) ??
    SUPPORTED_CALENDAR_LOCALES[0]
  );
}

export function resolveFullCalendarLocale(
  uiLocale?: string,
  defaultLocaleSetting?: string,
  runtimeOverrideLocale?: string
): string {
  if (
    runtimeOverrideLocale &&
    runtimeOverrideLocale !== 'auto' &&
    runtimeOverrideLocale.trim()
  ) {
    return normalizeLocaleCode(runtimeOverrideLocale);
  }
  if (
    defaultLocaleSetting &&
    defaultLocaleSetting !== 'auto' &&
    defaultLocaleSetting.trim()
  ) {
    return normalizeLocaleCode(defaultLocaleSetting);
  }
  return normalizeLocaleCode(uiLocale || 'en');
}

export function resolveCalendarDirection(
  locale: string,
  directionSetting?: CalendarDirectionSetting
): CalendarDirection {
  if (directionSetting === 'ltr' || directionSetting === 'rtl') {
    return directionSetting;
  }
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}

export function resolveLocaleFirstDay(
  locale: string,
  configuredFirstDay?: number | null
): number {
  if (
    typeof configuredFirstDay === 'number' &&
    configuredFirstDay >= 0 &&
    configuredFirstDay <= 6
  ) {
    return configuredFirstDay;
  }
  const bundle = getLocalizedCalendarBundle(locale);
  return bundle.week.dow;
}

export function buildFullCalendarTimeFormat(timeFormat24h = true): {
  hour: '2-digit' | 'numeric';
  minute: '2-digit';
  meridiem: false | 'short';
  hour12: boolean;
} {
  if (timeFormat24h) {
    return {
      hour: '2-digit',
      minute: '2-digit',
      meridiem: false,
      hour12: false,
    };
  }
  return {
    hour: 'numeric',
    minute: '2-digit',
    meridiem: 'short',
    hour12: true,
  };
}
