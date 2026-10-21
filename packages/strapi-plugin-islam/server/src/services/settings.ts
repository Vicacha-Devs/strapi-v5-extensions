import type { Core } from '@strapi/strapi';
import {
  DEFAULT_ISLAM_SETTINGS,
  PLUGIN_ID,
  sanitizeAsrSchool,
  sanitizeCalendarMethod,
  sanitizeCoordinates,
  sanitizeHijriShift,
  sanitizeMethodId,
  type IqamahRule,
  type IslamPluginSettings,
} from '../../../shared';

function getPluginStore(strapi: Core.Strapi) {
  return strapi.store({ type: 'plugin', name: PLUGIN_ID });
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getSettings(): Promise<IslamPluginSettings> {
    const fileConfig = strapi.config.get<Partial<IslamPluginSettings>>(
      `plugin::${PLUGIN_ID}`,
      {}
    );
    const store = getPluginStore(strapi);
    const stored = ((await store.get({ key: 'settings' })) ||
      {}) as Partial<IslamPluginSettings>;

    const merged: IslamPluginSettings = {
      ...DEFAULT_ISLAM_SETTINGS,
      ...fileConfig,
      ...stored,
      minuteAdjustments: {
        ...DEFAULT_ISLAM_SETTINGS.minuteAdjustments,
        ...(fileConfig.minuteAdjustments || {}),
        ...(stored.minuteAdjustments || {}),
      },
      ramadan: {
        ...DEFAULT_ISLAM_SETTINGS.ramadan,
        ...(fileConfig.ramadan || {}),
        ...(stored.ramadan || {}),
        notes: {
          ...DEFAULT_ISLAM_SETTINGS.ramadan.notes,
          ...(fileConfig.ramadan?.notes || {}),
          ...(stored.ramadan?.notes || {}),
        },
      },
      eid: {
        ...DEFAULT_ISLAM_SETTINGS.eid,
        ...(fileConfig.eid || {}),
        ...(stored.eid || {}),
        notes: {
          ...DEFAULT_ISLAM_SETTINGS.eid.notes,
          ...(fileConfig.eid?.notes || {}),
          ...(stored.eid?.notes || {}),
        },
      },
      fiqhRates: {
        ...DEFAULT_ISLAM_SETTINGS.fiqhRates,
        ...(fileConfig.fiqhRates || {}),
        ...(stored.fiqhRates || {}),
        goldPricePerGramByCurrency: {
          ...DEFAULT_ISLAM_SETTINGS.fiqhRates.goldPricePerGramByCurrency,
          ...(fileConfig.fiqhRates?.goldPricePerGramByCurrency || {}),
          ...(stored.fiqhRates?.goldPricePerGramByCurrency || {}),
        },
        silverPricePerGramByCurrency: {
          ...DEFAULT_ISLAM_SETTINGS.fiqhRates.silverPricePerGramByCurrency,
          ...(fileConfig.fiqhRates?.silverPricePerGramByCurrency || {}),
          ...(stored.fiqhRates?.silverPricePerGramByCurrency || {}),
        },
        zakatAlFitrPerPersonByCurrency: {
          ...DEFAULT_ISLAM_SETTINGS.fiqhRates.zakatAlFitrPerPersonByCurrency,
          ...(fileConfig.fiqhRates?.zakatAlFitrPerPersonByCurrency || {}),
          ...(stored.fiqhRates?.zakatAlFitrPerPersonByCurrency || {}),
        },
        fidyahPerDayByCurrency: {
          ...DEFAULT_ISLAM_SETTINGS.fiqhRates.fidyahPerDayByCurrency,
          ...(fileConfig.fiqhRates?.fidyahPerDayByCurrency || {}),
          ...(stored.fiqhRates?.fidyahPerDayByCurrency || {}),
        },
      },
      dailyPins: {
        ...DEFAULT_ISLAM_SETTINGS.dailyPins,
        ...(fileConfig.dailyPins || {}),
        ...(stored.dailyPins || {}),
      },
      quranFoundation: {
        ...DEFAULT_ISLAM_SETTINGS.quranFoundation,
        ...(fileConfig.quranFoundation || {}),
        ...(stored.quranFoundation || {}),
        defaultTranslationIdsByLocale: {
          ...DEFAULT_ISLAM_SETTINGS.quranFoundation.defaultTranslationIdsByLocale,
          ...(fileConfig.quranFoundation?.defaultTranslationIdsByLocale || {}),
          ...(stored.quranFoundation?.defaultTranslationIdsByLocale || {}),
        },
        defaultTafsirIdsByLocale: {
          ...DEFAULT_ISLAM_SETTINGS.quranFoundation.defaultTafsirIdsByLocale,
          ...(fileConfig.quranFoundation?.defaultTafsirIdsByLocale || {}),
          ...(stored.quranFoundation?.defaultTafsirIdsByLocale || {}),
        },
      },
    };

    // Hydrate from host Single-Type `api::prayer-setting.prayer-setting` when mapped & present
    const mapping = merged.prayerSettingMapping;
    if (mapping?.enabled && mapping.uid && strapi.contentTypes?.[mapping.uid]) {
      try {
        const docs = await strapi.documents(mapping.uid).findMany({
          limit: 1,
          locale: merged.defaultLocale || 'es',
          populate: [mapping.fields.iqamahRules],
        });
        const doc = docs?.[0];
        if (doc) {
          const f = mapping.fields;
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
          if (Array.isArray(doc[f.iqamahRules]) && doc[f.iqamahRules].length > 0) {
            merged.iqamahRules = doc[f.iqamahRules] as IqamahRule[];
          }
          if (typeof doc[f.ramadanBannerActive] === 'boolean') {
            merged.ramadan.bannerActive = Boolean(doc[f.ramadanBannerActive]);
          }
          if (typeof doc[f.ramadanNotes] === 'string' && doc[f.ramadanNotes].trim()) {
            merged.ramadan.notes[merged.defaultLocale] = doc[f.ramadanNotes] as string;
          }
        }
      } catch {
        // Resilient fallback if host table is not yet migrated
      }
    }

    return merged;
  },

  async updateSettings(patch: Partial<IslamPluginSettings>): Promise<IslamPluginSettings> {
    const current = await this.getSettings();
    const coords = sanitizeCoordinates(
      patch.defaultLat ?? current.defaultLat,
      patch.defaultLon ?? current.defaultLon,
      current.defaultLat,
      current.defaultLon
    );

    const next: IslamPluginSettings = {
      ...current,
      ...patch,
      defaultLat: coords.lat,
      defaultLon: coords.lon,
      method: sanitizeMethodId(patch.method ?? current.method, current.method),
      school: sanitizeAsrSchool(patch.school ?? current.school, current.school),
      calender: sanitizeCalendarMethod(
        patch.calender ?? current.calender,
        current.calender
      ),
      shifting: sanitizeHijriShift(patch.shifting ?? current.shifting, current.shifting),
      ramadan: {
        ...current.ramadan,
        ...(patch.ramadan || {}),
        notes: {
          ...current.ramadan.notes,
          ...(patch.ramadan?.notes || {}),
        },
      },
      eid: {
        ...current.eid,
        ...(patch.eid || {}),
        notes: {
          ...current.eid.notes,
          ...(patch.eid?.notes || {}),
        },
      },
      fiqhRates: {
        ...current.fiqhRates,
        ...(patch.fiqhRates || {}),
        goldPricePerGramByCurrency: {
          ...current.fiqhRates.goldPricePerGramByCurrency,
          ...(patch.fiqhRates?.goldPricePerGramByCurrency || {}),
        },
        silverPricePerGramByCurrency: {
          ...current.fiqhRates.silverPricePerGramByCurrency,
          ...(patch.fiqhRates?.silverPricePerGramByCurrency || {}),
          ...(patch.fiqhRates?.silverPricePerGramByCurrency || {}),
        },
        zakatAlFitrPerPersonByCurrency: {
          ...current.fiqhRates.zakatAlFitrPerPersonByCurrency,
          ...(patch.fiqhRates?.zakatAlFitrPerPersonByCurrency || {}),
        },
        fidyahPerDayByCurrency: {
          ...current.fiqhRates.fidyahPerDayByCurrency,
          ...(patch.fiqhRates?.fidyahPerDayByCurrency || {}),
        },
      },
      dailyPins: {
        ...current.dailyPins,
        ...(patch.dailyPins || {}),
      },
      quranFoundation: {
        ...current.quranFoundation,
        ...(patch.quranFoundation || {}),
        defaultTranslationIdsByLocale: {
          ...current.quranFoundation.defaultTranslationIdsByLocale,
          ...(patch.quranFoundation?.defaultTranslationIdsByLocale || {}),
        },
        defaultTafsirIdsByLocale: {
          ...current.quranFoundation.defaultTafsirIdsByLocale,
          ...(patch.quranFoundation?.defaultTafsirIdsByLocale || {}),
        },
      },
    };

    const store = getPluginStore(strapi);
    await store.set({ key: 'settings', value: next });

    // Sync back to host `api::prayer-setting.prayer-setting` when mapped
    const mapping = next.prayerSettingMapping;
    if (mapping?.enabled && mapping.uid && strapi.contentTypes?.[mapping.uid]) {
      try {
        const f = mapping.fields;
        const primaryJumuah = next.jumuahShifts?.[0];
        const docs = await strapi.documents(mapping.uid).findMany({
          limit: 1,
          locale: next.defaultLocale || 'es',
        });
        const existingDoc = docs?.[0];
        const dataPayload: Record<string, unknown> = {
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
        if (existingDoc?.documentId) {
          await strapi.documents(mapping.uid).update({
            documentId: String(existingDoc.documentId),
            locale: next.defaultLocale || 'es',
            data: dataPayload,
          });
        }
      } catch {
        // Non-fatal if host model validation differs
      }
    }

    // Bridge Hijri shifting offset to `@vicacha-devs/strapi-plugin-calendar` if enabled
    if (next.enableCalendarBridge) {
      try {
        const calService = strapi.plugin('calendar')?.service('settings') as
          | { getSettings?: () => Promise<any>; updateSettings?: (v: any) => Promise<any> }
          | undefined;
        if (calService?.getSettings && calService?.updateSettings) {
          const calSettings = await calService.getSettings();
          if (Array.isArray(calSettings?.secondaryCalendars)) {
            const updatedCalendars = calSettings.secondaryCalendars.map((c: any) =>
              c.id === 'hijri' || String(c.intlCalendar || '').startsWith('islamic')
                ? { ...c, dayOffset: Number(next.shifting || 0) }
                : c
            );
            await calService.updateSettings({
              ...calSettings,
              secondaryCalendars: updatedCalendars,
            });
          }
        }
      } catch {
        // Calendar plugin optional
      }
    }

    return next;
  },
});
