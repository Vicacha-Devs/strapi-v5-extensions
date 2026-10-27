import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../../shared/pluginId';
import {
  CALENDAR_COLOR_PALETTES,
  CALENDAR_THEME_PRESETS,
  type CalendarPluginSettings,
  type CalendarSourceMapping,
  type DiscoveredContentType,
} from '../../../shared/types';
import { DEFAULT_CALENDAR_SETTINGS } from '../config';
import { getCalendarService, type SettingsService } from '../types';

const STORE_KEY = 'settings';

export default ({ strapi }: { strapi: Core.Strapi }): SettingsService => {
  const getStore = () =>
    strapi.store({
      type: 'plugin',
      name: PLUGIN_ID,
    });

  const getRegistryService = () =>
    getCalendarService(strapi, PLUGIN_ID, 'registry');

  const getConfigDefaults = (): CalendarPluginSettings => {
    const userConfig = (strapi.config.get(`plugin::${PLUGIN_ID}`) ??
      {}) as Partial<CalendarPluginSettings>;

    const mergedSources: CalendarSourceMapping[] = [
      ...DEFAULT_CALENDAR_SETTINGS.sources,
      ...(getRegistryService()?.getRegisteredSources?.() ?? []),
    ];

    if (Array.isArray(userConfig.sources)) {
      for (const src of userConfig.sources) {
        if (!src || !src.id || !src.uid) continue;
        const existingIdx = mergedSources.findIndex(
          (s) => s.id === src.id || s.uid === src.uid
        );
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

    const mergedCalendars = [
      ...(DEFAULT_CALENDAR_SETTINGS.secondaryCalendars ?? []),
      ...(getRegistryService()?.getRegisteredSecondaryCalendars?.() ?? []),
    ];
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

    const mergedPresets = [...(DEFAULT_CALENDAR_SETTINGS.recurrencePresets ?? [])];
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
      ...DEFAULT_CALENDAR_SETTINGS,
      ...userConfig,
      sources: mergedSources,
      secondaryCalendars: mergedCalendars,
      recurrencePresets: mergedPresets,
    };
  };

  const mergePresetLists = (
    defaults: CalendarPluginSettings['recurrencePresets'],
    stored: CalendarPluginSettings['recurrencePresets']
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

  const service: SettingsService = {
    async ensureInitialized(): Promise<CalendarPluginSettings> {
      const store = getStore();
      const existing = (await store.get({
        key: STORE_KEY,
      })) as Partial<CalendarPluginSettings> | null;
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

      const merged: CalendarPluginSettings = {
        ...defaults,
        ...existing,
        sources: storedSources,
        secondaryCalendars: storedCalendars,
        recurrencePresets: storedPresets,
      };
      await store.set({ key: STORE_KEY, value: merged });
      return merged;
    },

    async getSettings(): Promise<CalendarPluginSettings> {
      const store = getStore();
      const stored = (await store.get({
        key: STORE_KEY,
      })) as Partial<CalendarPluginSettings> | null;
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

    async updateSettings(
      patch: Partial<CalendarPluginSettings>
    ): Promise<CalendarPluginSettings> {
      const current = await service.getSettings();
      const next: CalendarPluginSettings = {
        ...current,
        theme:
          patch.theme && patch.theme in CALENDAR_THEME_PRESETS
            ? patch.theme
            : current.theme ?? 'breeze',
        colorScheme:
          patch.colorScheme === 'auto' ||
          patch.colorScheme === 'light' ||
          patch.colorScheme === 'dark'
            ? patch.colorScheme
            : current.colorScheme ?? 'auto',
        themePalette:
          patch.themePalette && patch.themePalette in CALENDAR_COLOR_PALETTES
            ? patch.themePalette
            : current.themePalette ?? 'default',
        secondaryCalendarLanguage:
          patch.secondaryCalendarLanguage === 'local' ||
          patch.secondaryCalendarLanguage === 'ar' ||
          patch.secondaryCalendarLanguage === 'off'
            ? patch.secondaryCalendarLanguage
            : current.secondaryCalendarLanguage ?? 'local',
        defaultTimezone:
          typeof patch.defaultTimezone === 'string' && patch.defaultTimezone.trim()
            ? patch.defaultTimezone.trim()
            : current.defaultTimezone,
        defaultLocale:
          typeof patch.defaultLocale === 'string' && patch.defaultLocale.trim()
            ? patch.defaultLocale.trim()
            : current.defaultLocale ?? 'auto',
        direction:
          patch.direction === 'auto' ||
          patch.direction === 'ltr' ||
          patch.direction === 'rtl'
            ? patch.direction
            : current.direction ?? 'auto',
        defaultView:
          typeof patch.defaultView === 'string'
            ? patch.defaultView
            : current.defaultView,
        firstDayOfWeek:
          typeof patch.firstDayOfWeek === 'number' &&
          patch.firstDayOfWeek >= 0 &&
          patch.firstDayOfWeek <= 6
            ? Math.floor(patch.firstDayOfWeek)
            : current.firstDayOfWeek,
        weekNumbers:
          typeof patch.weekNumbers === 'boolean'
            ? patch.weekNumbers
            : current.weekNumbers ?? false,
        weekNumberCalculation:
          patch.weekNumberCalculation === 'local' ||
          patch.weekNumberCalculation === 'ISO'
            ? patch.weekNumberCalculation
            : current.weekNumberCalculation ?? 'ISO',
        timeFormat24h:
          typeof patch.timeFormat24h === 'boolean'
            ? patch.timeFormat24h
            : current.timeFormat24h ?? true,
        startHour:
          typeof patch.startHour === 'string' && patch.startHour.trim()
            ? patch.startHour.trim()
            : current.startHour,
        endHour:
          typeof patch.endHour === 'string' && patch.endHour.trim()
            ? patch.endHour.trim()
            : current.endHour,
        slotDuration:
          typeof patch.slotDuration === 'string' && patch.slotDuration.trim()
            ? patch.slotDuration.trim()
            : current.slotDuration,
        primaryColor:
          typeof patch.primaryColor === 'string' && patch.primaryColor.startsWith('#')
            ? patch.primaryColor.trim()
            : current.primaryColor,
        showWeekends:
          typeof patch.showWeekends === 'boolean' ? patch.showWeekends : current.showWeekends,
        showTodayButton:
          typeof patch.showTodayButton === 'boolean'
            ? patch.showTodayButton
            : current.showTodayButton,
        showCreateButton:
          typeof patch.showCreateButton === 'boolean'
            ? patch.showCreateButton
            : current.showCreateButton,
        monthView:
          typeof patch.monthView === 'boolean' ? patch.monthView : current.monthView,
        weekView:
          typeof patch.weekView === 'boolean' ? patch.weekView : current.weekView,
        dayView: typeof patch.dayView === 'boolean' ? patch.dayView : current.dayView,
        agendaView:
          typeof patch.agendaView === 'boolean' ? patch.agendaView : current.agendaView,
        yearView: typeof patch.yearView === 'boolean' ? patch.yearView : current.yearView,
        businessHours: Array.isArray(patch.businessHours)
          ? patch.businessHours
          : current.businessHours,
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

    async clearSettings(): Promise<CalendarPluginSettings> {
      const defaults = getConfigDefaults();
      const store = getStore();
      await store.set({ key: STORE_KEY, value: defaults });
      return defaults;
    },

    discoverContentTypes(): DiscoveredContentType[] {
      const contentTypes = strapi.contentTypes ?? {};
      const discovered: DiscoveredContentType[] = [];
      const INTERNAL_PLUGIN_PREFIXES = [
        'plugin::upload',
        'plugin::i18n',
        'plugin::users-permissions',
        'plugin::content-releases',
        'plugin::review-workflows',
        'plugin::navigation',
        'plugin::email-designer-5',
        'plugin::strapi-cache',
        'plugin::typesense',
        'plugin::preview-button',
        'plugin::seo',
      ];

      for (const [uid, schema] of Object.entries(contentTypes)) {
        if (!schema || typeof schema !== 'object') continue;
        if (!uid.startsWith('api::') && !uid.startsWith('plugin::')) continue;
        if (INTERNAL_PLUGIN_PREFIXES.some((prefix) => uid.startsWith(prefix))) {
          continue;
        }
        if (schema.kind && schema.kind !== 'collectionType') continue;

        const attributes = schema.attributes ?? {};
        const fields = Object.entries(attributes)
          .filter(([, def]) => def && typeof def.type === 'string')
          .map(([name, def]) => ({
            name,
            type: String(def.customField || def.type),
          }));

        if (!fields.some((f) => f.name === 'publishedAt')) {
          fields.push({ name: 'publishedAt', type: 'datetime' });
        }
        if (!fields.some((f) => f.name === 'createdAt')) {
          fields.push({ name: 'createdAt', type: 'datetime' });
        }

        if (fields.length === 0) continue;

        discovered.push({
          uid,
          displayName: String(schema.info?.displayName || uid),
          kind: String(schema.kind || 'collectionType'),
          fields,
        });
      }

      discovered.sort((a, b) => {
        const score = (u: string) =>
          u === 'plugin::events.event'
            ? 0
            : u === 'plugin::bookings.booking'
              ? 1
              : u.startsWith('api::')
                ? 2
                : 3;
        return score(a.uid) - score(b.uid) || a.displayName.localeCompare(b.displayName);
      });

      return discovered;
    },
  };

  return service;
};
