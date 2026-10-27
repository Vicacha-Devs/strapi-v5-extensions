import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../../shared/pluginId';
import type { EventSourceMapping, EventsPluginSettings } from '../../../shared/types';
import { DEFAULT_PLUGIN_SETTINGS } from '../config';

const STORE_KEY = 'settings';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getStore = () =>
    strapi.store({
      type: 'plugin',
      name: PLUGIN_ID,
    });

  const getConfigDefaults = (): EventsPluginSettings => {
    const userConfig = (strapi.config.get(`plugin::${PLUGIN_ID}`) ??
      {}) as Partial<EventsPluginSettings>;

    const mergedSources: EventSourceMapping[] = [...DEFAULT_PLUGIN_SETTINGS.sources];
    if (Array.isArray(userConfig.sources)) {
      for (const src of userConfig.sources) {
        if (!src || !src.id || !src.uid) continue;
        const existingIdx = mergedSources.findIndex((s) => s.id === src.id || s.uid === src.uid);
        if (existingIdx >= 0) {
          mergedSources[existingIdx] = {
            ...mergedSources[existingIdx],
            ...src,
            fields: {
              ...mergedSources[existingIdx].fields,
              ...(src.fields ?? {}),
            },
          };
        } else {
          mergedSources.push(src);
        }
      }
    }

    const mergedCalendars = [...(DEFAULT_PLUGIN_SETTINGS.secondaryCalendars ?? [])];
    if (Array.isArray(userConfig.secondaryCalendars)) {
      for (const cal of userConfig.secondaryCalendars) {
        if (!cal || !cal.id || !cal.intlCalendar) continue;
        const idx = mergedCalendars.findIndex((c) => c.id === cal.id);
        if (idx >= 0) {
          mergedCalendars[idx] = { ...mergedCalendars[idx], ...cal };
        } else {
          mergedCalendars.push(cal);
        }
      }
    }

    const mergedPresets = [...(DEFAULT_PLUGIN_SETTINGS.recurrencePresets ?? [])];
    if (Array.isArray(userConfig.recurrencePresets)) {
      for (const preset of userConfig.recurrencePresets) {
        if (!preset || !preset.id || !preset.rrule) continue;
        const idx = mergedPresets.findIndex(
          (p) => p.id === preset.id || p.rrule === preset.rrule
        );
        if (idx >= 0) {
          mergedPresets[idx] = { ...mergedPresets[idx], ...preset };
        } else {
          mergedPresets.push(preset);
        }
      }
    }

    return {
      ...DEFAULT_PLUGIN_SETTINGS,
      ...userConfig,
      sources: mergedSources,
      secondaryCalendars: mergedCalendars,
      recurrencePresets: mergedPresets,
    };
  };

  const mergePresetLists = (
    defaults: EventsPluginSettings['recurrencePresets'],
    stored: EventsPluginSettings['recurrencePresets']
  ) => {
    const result = [...(defaults ?? [])];
    if (Array.isArray(stored)) {
      for (const item of stored) {
        if (!item || !item.id || !item.rrule) continue;
        const idx = result.findIndex(
          (p) => p.id === item.id || p.rrule === item.rrule
        );
        if (idx >= 0) {
          result[idx] = { ...result[idx], ...item };
        } else {
          result.push(item);
        }
      }
    }
    return result;
  };

  return {
    async ensureInitialized(): Promise<EventsPluginSettings> {
      const store = getStore();
      const existing = (await store.get({ key: STORE_KEY })) as Partial<EventsPluginSettings> | null;
      const defaults = getConfigDefaults();

      if (!existing) {
        await store.set({ key: STORE_KEY, value: defaults });
        return defaults;
      }

      const storedSources = Array.isArray(existing.sources) ? [...existing.sources] : [];
      for (const defSource of defaults.sources) {
        if (!storedSources.some((s) => s.id === defSource.id || s.uid === defSource.uid)) {
          storedSources.push(defSource);
        }
      }

      const storedCalendars = Array.isArray(existing.secondaryCalendars)
        ? [...existing.secondaryCalendars]
        : [];
      for (const defCal of defaults.secondaryCalendars ?? []) {
        if (!storedCalendars.some((c) => c.id === defCal.id)) {
          storedCalendars.push(defCal);
        }
      }

      const storedPresets = mergePresetLists(
        defaults.recurrencePresets,
        existing.recurrencePresets
      );

      const merged: EventsPluginSettings = {
        ...defaults,
        ...existing,
        sources: storedSources,
        secondaryCalendars: storedCalendars,
        recurrencePresets: storedPresets,
      };
      await store.set({ key: STORE_KEY, value: merged });
      return merged;
    },

    async getSettings(): Promise<EventsPluginSettings> {
      const store = getStore();
      const stored = (await store.get({ key: STORE_KEY })) as Partial<EventsPluginSettings> | null;
      const defaults = getConfigDefaults();
      if (!stored) {
        return defaults;
      }
      return {
        ...defaults,
        ...stored,
        sources:
          Array.isArray(stored.sources) && stored.sources.length > 0
            ? stored.sources
            : defaults.sources,
        secondaryCalendars:
          Array.isArray(stored.secondaryCalendars) && stored.secondaryCalendars.length > 0
            ? stored.secondaryCalendars
            : defaults.secondaryCalendars ?? [],
        recurrencePresets: mergePresetLists(
          defaults.recurrencePresets,
          stored.recurrencePresets
        ),
      };
    },

    async updateSettings(patch: Partial<EventsPluginSettings>): Promise<EventsPluginSettings> {
      const current = await this.getSettings();
      const next: EventsPluginSettings = {
        ...current,
        defaultTimezone:
          typeof patch.defaultTimezone === 'string' && patch.defaultTimezone.trim()
            ? patch.defaultTimezone.trim()
            : current.defaultTimezone,
        defaultCapacity:
          typeof patch.defaultCapacity === 'number' && patch.defaultCapacity >= 1
            ? Math.floor(patch.defaultCapacity)
            : current.defaultCapacity,
        waitlistEnabledByDefault:
          typeof patch.waitlistEnabledByDefault === 'boolean'
            ? patch.waitlistEnabledByDefault
            : current.waitlistEnabledByDefault,
        defaultMaxGuestsPerRegistration:
          typeof patch.defaultMaxGuestsPerRegistration === 'number' &&
          patch.defaultMaxGuestsPerRegistration >= 1
            ? Math.min(50, Math.floor(patch.defaultMaxGuestsPerRegistration))
            : current.defaultMaxGuestsPerRegistration,
        sendRsvpEmails:
          typeof patch.sendRsvpEmails === 'boolean'
            ? patch.sendRsvpEmails
            : current.sendRsvpEmails,
        feedTitle:
          typeof patch.feedTitle === 'string' && patch.feedTitle.trim()
            ? patch.feedTitle.trim().slice(0, 140)
            : current.feedTitle,
        sources: Array.isArray(patch.sources) ? patch.sources : current.sources,
        secondaryCalendars: Array.isArray(patch.secondaryCalendars)
          ? patch.secondaryCalendars
          : current.secondaryCalendars ?? [],
        recurrencePresets: Array.isArray(patch.recurrencePresets)
          ? patch.recurrencePresets
          : current.recurrencePresets ?? [],
      };

      const store = getStore();
      await store.set({ key: STORE_KEY, value: next });
      return next;
    },
  };
};
