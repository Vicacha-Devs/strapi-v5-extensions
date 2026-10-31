import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../../shared/pluginId";
import type {
  CalendarSystemConfig,
  EventSourceMapping,
  EventsPluginSettings,
  RecurrencePreset,
} from "../../../shared/types";
import { DEFAULT_PLUGIN_SETTINGS } from "../config";

const STORE_KEY = "settings";

function mergeSourcesList(
  defaults: EventSourceMapping[],
  userSources?: EventSourceMapping[]
): EventSourceMapping[] {
  const merged = [...defaults];
  if (!Array.isArray(userSources)) return merged;

  for (const src of userSources) {
    if (!src?.id || !src.uid) continue;
    const existingIdx = merged.findIndex((s) => s.id === src.id || s.uid === src.uid);
    if (existingIdx >= 0) {
      merged[existingIdx] = {
        ...merged[existingIdx],
        ...src,
        fields: { ...merged[existingIdx].fields, ...src.fields },
      };
    } else {
      merged.push(src);
    }
  }
  return merged;
}

function mergeCalendarsList(
  defaults: CalendarSystemConfig[] | undefined,
  userCalendars?: CalendarSystemConfig[]
): CalendarSystemConfig[] {
  const merged = [...(defaults ?? [])];
  if (!Array.isArray(userCalendars)) return merged;

  for (const cal of userCalendars) {
    if (!cal?.id || !cal.intlCalendar) continue;
    const idx = merged.findIndex((c) => c.id === cal.id);
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], ...cal };
    } else {
      merged.push(cal);
    }
  }
  return merged;
}

function mergePresetLists(
  defaults: RecurrencePreset[] | undefined,
  stored?: RecurrencePreset[]
): RecurrencePreset[] {
  const result = [...(defaults ?? [])];
  if (!Array.isArray(stored)) return result;

  for (const item of stored) {
    if (!item?.id || !item.rrule) continue;
    const idx = result.findIndex((p) => p.id === item.id || p.rrule === item.rrule);
    if (idx >= 0) {
      result[idx] = { ...result[idx], ...item };
    } else {
      result.push(item);
    }
  }
  return result;
}

function resolveNonEmptyString(patchVal: unknown, fallback: string, maxLen?: number): string {
  if (typeof patchVal === "string" && patchVal.trim()) {
    const trimmed = patchVal.trim();
    return maxLen ? trimmed.slice(0, maxLen) : trimmed;
  }
  return fallback;
}

function resolvePositiveInt(patchVal: unknown, fallback: number, maxLimit?: number): number {
  if (typeof patchVal === "number" && patchVal >= 1) {
    const floored = Math.floor(patchVal);
    return maxLimit ? Math.min(maxLimit, floored) : floored;
  }
  return fallback;
}

function resolveBoolean(patchVal: unknown, fallback: boolean): boolean {
  return typeof patchVal === "boolean" ? patchVal : fallback;
}

function resolveArray<T>(patchVal: unknown, fallback: T[]): T[] {
  return Array.isArray(patchVal) ? (patchVal as T[]) : fallback;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getStore = () =>
    strapi.store({
      type: "plugin",
      name: PLUGIN_ID,
    });

  const getConfigDefaults = (): EventsPluginSettings => {
    const userConfig = (strapi.config.get(`plugin::${PLUGIN_ID}`) ??
      {}) as Partial<EventsPluginSettings>;

    return {
      ...DEFAULT_PLUGIN_SETTINGS,
      ...userConfig,
      sources: mergeSourcesList(DEFAULT_PLUGIN_SETTINGS.sources, userConfig.sources),
      secondaryCalendars: mergeCalendarsList(
        DEFAULT_PLUGIN_SETTINGS.secondaryCalendars,
        userConfig.secondaryCalendars
      ),
      recurrencePresets: mergePresetLists(
        DEFAULT_PLUGIN_SETTINGS.recurrencePresets,
        userConfig.recurrencePresets
      ),
    };
  };

  return {
    async ensureInitialized(): Promise<EventsPluginSettings> {
      const store = getStore();
      const existing = (await store.get({
        key: STORE_KEY,
      })) as Partial<EventsPluginSettings> | null;
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

      const merged: EventsPluginSettings = {
        ...defaults,
        ...existing,
        sources: storedSources,
        secondaryCalendars: storedCalendars,
        recurrencePresets: mergePresetLists(defaults.recurrencePresets, existing.recurrencePresets),
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
            : (defaults.secondaryCalendars ?? []),
        recurrencePresets: mergePresetLists(defaults.recurrencePresets, stored.recurrencePresets),
      };
    },

    async updateSettings(patch: Partial<EventsPluginSettings>): Promise<EventsPluginSettings> {
      const current = await this.getSettings();
      const next: EventsPluginSettings = {
        ...current,
        defaultTimezone: resolveNonEmptyString(patch.defaultTimezone, current.defaultTimezone),
        defaultCapacity: resolvePositiveInt(patch.defaultCapacity, current.defaultCapacity),
        waitlistEnabledByDefault: resolveBoolean(
          patch.waitlistEnabledByDefault,
          current.waitlistEnabledByDefault
        ),
        defaultMaxGuestsPerRegistration: resolvePositiveInt(
          patch.defaultMaxGuestsPerRegistration,
          current.defaultMaxGuestsPerRegistration,
          50
        ),
        sendRsvpEmails: resolveBoolean(patch.sendRsvpEmails, current.sendRsvpEmails),
        feedTitle: resolveNonEmptyString(patch.feedTitle, current.feedTitle, 140),
        sources: resolveArray(patch.sources, current.sources),
        secondaryCalendars: resolveArray(
          patch.secondaryCalendars,
          current.secondaryCalendars ?? []
        ),
        recurrencePresets: resolveArray(patch.recurrencePresets, current.recurrencePresets ?? []),
      };

      const store = getStore();
      await store.set({ key: STORE_KEY, value: next });
      return next;
    },
  };
};
