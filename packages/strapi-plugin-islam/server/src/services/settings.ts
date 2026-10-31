import type { Core } from '@strapi/strapi';
import {
  DEFAULT_ISLAM_SETTINGS,
  PLUGIN_ID,
  sanitizeAsrSchool,
  sanitizeCalendarMethod,
  sanitizeCoordinates,
  sanitizeHijriShift,
  sanitizeMethodId,
  type FiqhRatesConfig,
  type IqamahRule,
  type IslamPluginSettings,
  type QuranFoundationConfig,
  type SupportedCurrency,
  type SupportedLocale,
} from '../../../shared';

function getPluginStore(strapi: Core.Strapi) {
  return strapi.store({ type: 'plugin', name: PLUGIN_ID });
}

type PrayerMappingFields = NonNullable<
  IslamPluginSettings['prayerSettingMapping']
>['fields'];

interface CalendarSecondaryEntry {
  id?: string;
  intlCalendar?: string;
  dayOffset?: number;
  [key: string]: unknown;
}

interface CalendarBridgeSettings {
  secondaryCalendars?: CalendarSecondaryEntry[];
  [key: string]: unknown;
}

interface CalendarSettingsBridgeService {
  getSettings?: () => Promise<CalendarBridgeSettings>;
  updateSettings?: (patch: CalendarBridgeSettings) => Promise<CalendarBridgeSettings>;
}

function mergeCurrencyMap(
  base: Record<SupportedCurrency, number>,
  first?: Partial<Record<SupportedCurrency, number>>,
  second?: Partial<Record<SupportedCurrency, number>>
): Record<SupportedCurrency, number> {
  return {
    ...base,
    ...first,
    ...second,
  };
}

function mergeLocaleNotes(
  base: Record<SupportedLocale, string>,
  first?: Partial<Record<SupportedLocale, string>>,
  second?: Partial<Record<SupportedLocale, string>>
): Record<SupportedLocale, string> {
  return {
    ...base,
    ...first,
    ...second,
  };
}

function mergeFiqhRates(
  base: FiqhRatesConfig,
  first?: Partial<FiqhRatesConfig>,
  second?: Partial<FiqhRatesConfig>
): FiqhRatesConfig {
  return {
    ...base,
    ...first,
    ...second,
    goldPricePerGramByCurrency: mergeCurrencyMap(
      base.goldPricePerGramByCurrency,
      first?.goldPricePerGramByCurrency,
      second?.goldPricePerGramByCurrency
    ),
    silverPricePerGramByCurrency: mergeCurrencyMap(
      base.silverPricePerGramByCurrency,
      first?.silverPricePerGramByCurrency,
      second?.silverPricePerGramByCurrency
    ),
    zakatAlFitrPerPersonByCurrency: mergeCurrencyMap(
      base.zakatAlFitrPerPersonByCurrency,
      first?.zakatAlFitrPerPersonByCurrency,
      second?.zakatAlFitrPerPersonByCurrency
    ),
    fidyahPerDayByCurrency: mergeCurrencyMap(
      base.fidyahPerDayByCurrency,
      first?.fidyahPerDayByCurrency,
      second?.fidyahPerDayByCurrency
    ),
  };
}

function mergeQuranFoundationConfig(
  base: QuranFoundationConfig,
  first?: Partial<QuranFoundationConfig>,
  second?: Partial<QuranFoundationConfig>
): QuranFoundationConfig {
  return {
    ...base,
    ...first,
    ...second,
    defaultTranslationIdsByLocale: {
      ...base.defaultTranslationIdsByLocale,
      ...first?.defaultTranslationIdsByLocale,
      ...second?.defaultTranslationIdsByLocale,
    },
    defaultTafsirIdsByLocale: {
      ...base.defaultTafsirIdsByLocale,
      ...first?.defaultTafsirIdsByLocale,
      ...second?.defaultTafsirIdsByLocale,
    },
  };
}

function mergeBasePluginSettings(
  fileConfig: Partial<IslamPluginSettings>,
  stored: Partial<IslamPluginSettings>
): IslamPluginSettings {
  const base = DEFAULT_ISLAM_SETTINGS;
  return {
    ...base,
    ...fileConfig,
    ...stored,
    minuteAdjustments: {
      ...base.minuteAdjustments,
      ...fileConfig.minuteAdjustments,
      ...stored.minuteAdjustments,
    },
    ramadan: {
      ...base.ramadan,
      ...fileConfig.ramadan,
      ...stored.ramadan,
      notes: mergeLocaleNotes(
        base.ramadan.notes,
        fileConfig.ramadan?.notes,
        stored.ramadan?.notes
      ),
    },
    eid: {
      ...base.eid,
      ...fileConfig.eid,
      ...stored.eid,
      notes: mergeLocaleNotes(base.eid.notes, fileConfig.eid?.notes, stored.eid?.notes),
    },
    fiqhRates: mergeFiqhRates(base.fiqhRates, fileConfig.fiqhRates, stored.fiqhRates),
    dailyPins: {
      ...base.dailyPins,
      ...fileConfig.dailyPins,
      ...stored.dailyPins,
    },
    quranFoundation: mergeQuranFoundationConfig(
      base.quranFoundation,
      fileConfig.quranFoundation,
      stored.quranFoundation
    ),
  };
}

function applyHostPrayerCoreFields(
  merged: IslamPluginSettings,
  doc: Record<string, unknown>,
  f: PrayerMappingFields
): void {
  if (doc[f.method] !== undefined) {
    merged.method = sanitizeMethodId(doc[f.method], merged.method);
  }
  if (doc[f.school] !== undefined) {
    merged.school = sanitizeAsrSchool(doc[f.school], merged.school);
  }
  if (doc[f.calender] !== undefined) {
    merged.calender = sanitizeCalendarMethod(doc[f.calender], merged.calender);
  }
  if (doc[f.shifting] !== undefined) {
    merged.shifting = sanitizeHijriShift(doc[f.shifting], merged.shifting);
  }
}

function applyHostPrayerExtendedFields(
  merged: IslamPluginSettings,
  doc: Record<string, unknown>,
  f: PrayerMappingFields
): void {
  if (doc[f.defaultLat] !== undefined || doc[f.defaultLon] !== undefined) {
    const coords = sanitizeCoordinates(
      doc[f.defaultLat] ?? merged.defaultLat,
      doc[f.defaultLon] ?? merged.defaultLon,
      merged.defaultLat,
      merged.defaultLon
    );
    merged.defaultLat = coords.lat;
    merged.defaultLon = coords.lon;
  }
  const rawRules = doc[f.iqamahRules];
  if (Array.isArray(rawRules) && rawRules.length > 0) {
    merged.iqamahRules = rawRules as IqamahRule[];
  }
  if (typeof doc[f.ramadanBannerActive] === 'boolean') {
    merged.ramadan.bannerActive = Boolean(doc[f.ramadanBannerActive]);
  }
  const rawNotes = doc[f.ramadanNotes];
  if (typeof rawNotes === 'string' && rawNotes.trim()) {
    merged.ramadan.notes[merged.defaultLocale] = rawNotes;
  }
}

async function hydrateFromHostPrayerSetting(
  strapi: Core.Strapi,
  merged: IslamPluginSettings
): Promise<void> {
  const mapping = merged.prayerSettingMapping;
  if (!mapping?.enabled || !mapping.uid || !strapi.contentTypes?.[mapping.uid]) {
    return;
  }
  try {
    const docs = await strapi.documents(mapping.uid).findMany({
      limit: 1,
      locale: merged.defaultLocale || 'es',
      populate: [mapping.fields.iqamahRules],
    });
    const doc = docs?.[0];
    if (!doc) return;
    applyHostPrayerCoreFields(merged, doc, mapping.fields);
    applyHostPrayerExtendedFields(merged, doc, mapping.fields);
  } catch {
    // Resilient fallback if host table is not yet migrated
  }
}

function mergePatchedPluginSettings(
  current: IslamPluginSettings,
  patch: Partial<IslamPluginSettings>
): IslamPluginSettings {
  const coords = sanitizeCoordinates(
    patch.defaultLat ?? current.defaultLat,
    patch.defaultLon ?? current.defaultLon,
    current.defaultLat,
    current.defaultLon
  );

  return {
    ...current,
    ...patch,
    defaultLat: coords.lat,
    defaultLon: coords.lon,
    method: sanitizeMethodId(patch.method ?? current.method, current.method),
    school: sanitizeAsrSchool(patch.school ?? current.school, current.school),
    calender: sanitizeCalendarMethod(patch.calender ?? current.calender, current.calender),
    shifting: sanitizeHijriShift(patch.shifting ?? current.shifting, current.shifting),
    ramadan: {
      ...current.ramadan,
      ...patch.ramadan,
      notes: mergeLocaleNotes(current.ramadan.notes, patch.ramadan?.notes),
    },
    eid: {
      ...current.eid,
      ...patch.eid,
      notes: mergeLocaleNotes(current.eid.notes, patch.eid?.notes),
    },
    fiqhRates: mergeFiqhRates(current.fiqhRates, patch.fiqhRates),
    dailyPins: {
      ...current.dailyPins,
      ...patch.dailyPins,
    },
    quranFoundation: mergeQuranFoundationConfig(
      current.quranFoundation,
      patch.quranFoundation
    ),
  };
}

function buildHostPrayerDataPayload(
  next: IslamPluginSettings,
  f: PrayerMappingFields
): Record<string, unknown> {
  const primaryJumuah = next.jumuahShifts?.[0];
  return {
    [f.method]: next.method,
    [f.school]: next.school,
    [f.calender]: next.calender,
    [f.shifting]: next.shifting,
    [f.defaultLat]: next.defaultLat,
    [f.defaultLon]: next.defaultLon,
    [f.jumuahKhutbahTime]: primaryJumuah?.khutbahTime || '12:15 PM',
    [f.jumuahPrayerTime]: primaryJumuah?.prayerTime || '12:45 PM',
    [f.ramadanBannerActive]: next.ramadan.bannerActive,
    [f.ramadanNotes]:
      next.ramadan.notes[next.defaultLocale] || next.ramadan.notes.es || '',
  };
}

async function syncToHostPrayerSetting(
  strapi: Core.Strapi,
  next: IslamPluginSettings
): Promise<void> {
  const mapping = next.prayerSettingMapping;
  if (!mapping?.enabled || !mapping.uid || !strapi.contentTypes?.[mapping.uid]) {
    return;
  }
  try {
    const locale = next.defaultLocale || 'es';
    const docs = await strapi.documents(mapping.uid).findMany({ limit: 1, locale });
    const existingDoc = docs?.[0];
    if (!existingDoc?.documentId) return;
    await strapi.documents(mapping.uid).update({
      documentId: String(existingDoc.documentId),
      locale,
      data: buildHostPrayerDataPayload(next, mapping.fields),
    });
  } catch {
    // Non-fatal if host model validation differs
  }
}

function isHijriSecondaryCalendar(entry: CalendarSecondaryEntry): boolean {
  return (
    entry.id === 'hijri' || String(entry.intlCalendar || '').startsWith('islamic')
  );
}

async function syncHijriOffsetToCalendarBridge(
  strapi: Core.Strapi,
  next: IslamPluginSettings
): Promise<void> {
  if (!next.enableCalendarBridge) return;
  try {
    const calService = strapi
      .plugin('calendar')
      ?.service<CalendarSettingsBridgeService | undefined>('settings');
    if (!calService?.getSettings || !calService?.updateSettings) return;
    const calSettings = await calService.getSettings();
    if (!Array.isArray(calSettings?.secondaryCalendars)) return;

    const updatedCalendars = calSettings.secondaryCalendars.map((c) =>
      isHijriSecondaryCalendar(c) ? { ...c, dayOffset: Number(next.shifting || 0) } : c
    );
    await calService.updateSettings({
      ...calSettings,
      secondaryCalendars: updatedCalendars,
    });
  } catch {
    // Calendar plugin optional
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getSettings(): Promise<IslamPluginSettings> {
    const fileConfig = strapi.config.get<Partial<IslamPluginSettings>>(
      `plugin::${PLUGIN_ID}`,
      {}
    );
    const store = getPluginStore(strapi);
    const rawStored = await store.get({ key: 'settings' });
    const stored = (rawStored ?? {}) as Partial<IslamPluginSettings>;

    const merged = mergeBasePluginSettings(fileConfig, stored);
    await hydrateFromHostPrayerSetting(strapi, merged);
    return merged;
  },

  async updateSettings(patch: Partial<IslamPluginSettings>): Promise<IslamPluginSettings> {
    const current = await this.getSettings();
    const next = mergePatchedPluginSettings(current, patch);

    const store = getPluginStore(strapi);
    await store.set({ key: 'settings', value: next });

    await syncToHostPrayerSetting(strapi, next);
    await syncHijriOffsetToCalendarBridge(strapi, next);

    return next;
  },
});
