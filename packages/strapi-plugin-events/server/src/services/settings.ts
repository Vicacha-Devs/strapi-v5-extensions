import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../../shared/pluginId";
import { normalizeRRuleString } from "../../../shared/rruleEngine";
import { isSafeObjectKey } from "../../../shared/spotlightHelpers";
import type {
  CalendarSystemConfig,
  EventSourceMapping,
  EventsPluginSettings,
  RecurrencePreset,
  TimeSlotWindow,
} from "../../../shared/types";
import { DEFAULT_PLUGIN_SETTINGS } from "../config";
import { PluginValidationError } from "../types";
import { isAllowedEventSourceUid } from "./occurrenceRsvpBatch";

const STORE_KEY = "settings";

function sanitizeStringRecord(
  raw: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (isSafeObjectKey(k) && typeof v === "string") {
      clean[k] = v;
    }
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

function sanitizeTimeSlotMap(
  raw: Record<string, TimeSlotWindow> | undefined
): Record<string, TimeSlotWindow> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }
  const clean: Record<string, TimeSlotWindow> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (
      isSafeObjectKey(k) &&
      v &&
      typeof v === "object" &&
      typeof v.start === "string" &&
      typeof v.end === "string"
    ) {
      clean[k] = { start: v.start, end: v.end };
    }
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

function sanitizeSourceFields(
  fields: EventSourceMapping["fields"] | undefined
): EventSourceMapping["fields"] {
  const safeFields: EventSourceMapping["fields"] = {
    title:
      typeof fields?.title === "string" && isSafeObjectKey(fields.title)
        ? fields.title
        : "title",
    startDate:
      typeof fields?.startDate === "string" && isSafeObjectKey(fields.startDate)
        ? fields.startDate
        : "startDate",
  };
  const optionalKeys = [
    "endDate",
    "rrule",
    "location",
    "category",
    "status",
    "summary",
    "slug",
    "capacity",
    "rsvpEnabled",
    "timeSlot",
    "poster",
    "actionLinks",
    "spotlightConfig",
  ] as const;

  for (const key of optionalKeys) {
    const val = fields?.[key];
    if (typeof val === "string" && isSafeObjectKey(val)) {
      safeFields[key] = val;
    }
  }

  const altFields = sanitizeStringRecord(fields?.alternateDateFields);
  if (altFields) {
    safeFields.alternateDateFields = altFields;
  }

  if (Array.isArray(fields?.customFields)) {
    safeFields.customFields = fields.customFields.filter(isSafeObjectKey);
  }

  return safeFields;
}

function sanitizeSourceMapping(
  src: EventSourceMapping | undefined | null
): EventSourceMapping | null {
  if (!src || typeof src !== "object") return null;
  if (!isSafeObjectKey(src.id) || !isAllowedEventSourceUid(src.uid)) {
    return null;
  }
  return {
    id: src.id.trim(),
    label: typeof src.label === "string" && src.label ? src.label : src.id,
    uid: src.uid.trim(),
    color:
      typeof src.color === "string" && src.color.startsWith("#")
        ? src.color
        : "#0D9488",
    enabled: typeof src.enabled === "boolean" ? src.enabled : true,
    fields: sanitizeSourceFields(src.fields),
    ...(sanitizeTimeSlotMap(src.timeSlotMap)
      ? { timeSlotMap: sanitizeTimeSlotMap(src.timeSlotMap) }
      : {}),
    ...(sanitizeStringRecord(src.categoryColors)
      ? { categoryColors: sanitizeStringRecord(src.categoryColors) }
      : {}),
    ...(typeof src.defaultAllDay === "boolean"
      ? { defaultAllDay: src.defaultAllDay }
      : {}),
  };
}

function mergeSourcesList(
  defaults: EventSourceMapping[],
  userSources?: EventSourceMapping[]
): EventSourceMapping[] {
  const merged = defaults
    .map((d) => sanitizeSourceMapping(d))
    .filter((d): d is EventSourceMapping => d !== null);
  if (!Array.isArray(userSources)) return merged;

  for (const rawSrc of userSources) {
    const src = sanitizeSourceMapping(rawSrc);
    if (!src) continue;
    const existingIdx = merged.findIndex(
      (s) => s.id === src.id || s.uid === src.uid
    );
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

function sanitizeCalendarConfig(
  cal: CalendarSystemConfig | undefined | null
): CalendarSystemConfig | null {
  if (!cal || typeof cal !== "object") return null;
  if (!isSafeObjectKey(cal.id) || typeof cal.intlCalendar !== "string") {
    return null;
  }
  const intlCal = cal.intlCalendar.trim();
  if (!intlCal) return null;
  return {
    id: cal.id.trim(),
    label: typeof cal.label === "string" && cal.label ? cal.label : cal.id,
    intlCalendar: intlCal,
    ...(typeof cal.locale === "string" && cal.locale
      ? { locale: cal.locale }
      : {}),
    ...(typeof cal.dayOffset === "number" && Number.isFinite(cal.dayOffset)
      ? { dayOffset: Math.max(-2, Math.min(2, Math.round(cal.dayOffset))) }
      : {}),
    ...(isSafeObjectKey(cal.overrideField)
      ? { overrideField: cal.overrideField }
      : {}),
    enabled: Boolean(cal.enabled),
  };
}

function mergeCalendarsList(
  defaults: CalendarSystemConfig[] | undefined,
  userCalendars?: CalendarSystemConfig[]
): CalendarSystemConfig[] {
  const merged = (defaults ?? [])
    .map((c) => sanitizeCalendarConfig(c))
    .filter((c): c is CalendarSystemConfig => c !== null);
  if (!Array.isArray(userCalendars)) return merged;

  for (const rawCal of userCalendars) {
    const cal = sanitizeCalendarConfig(rawCal);
    if (!cal) continue;
    const idx = merged.findIndex((c) => c.id === cal.id);
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], ...cal };
    } else {
      merged.push(cal);
    }
  }
  return merged;
}

function sanitizeRecurrencePreset(
  item: RecurrencePreset | undefined | null
): RecurrencePreset | null {
  if (!item || typeof item !== "object") return null;
  if (!isSafeObjectKey(item.id) || typeof item.rrule !== "string") {
    return null;
  }
  const cleanRule = normalizeRRuleString(item.rrule);
  if (!cleanRule) return null;
  return {
    id: item.id.trim(),
    label: typeof item.label === "string" && item.label ? item.label : item.id,
    rrule: cleanRule,
  };
}

function mergePresetLists(
  defaults: RecurrencePreset[] | undefined,
  stored?: RecurrencePreset[]
): RecurrencePreset[] {
  const result = (defaults ?? [])
    .map((p) => sanitizeRecurrencePreset(p))
    .filter((p): p is RecurrencePreset => p !== null);
  if (!Array.isArray(stored)) return result;

  for (const rawItem of stored) {
    const item = sanitizeRecurrencePreset(rawItem);
    if (!item) continue;
    const idx = result.findIndex(
      (p) => p.id === item.id || p.rrule === item.rrule
    );
    if (idx >= 0) {
      result[idx] = { ...result[idx], ...item };
    } else {
      result.push(item);
    }
  }
  return result;
}

function resolveNonEmptyString(
  patchVal: unknown,
  fallback: string,
  maxLen?: number
): string {
  if (typeof patchVal === "string" && patchVal.trim()) {
    const trimmed = patchVal.trim();
    return maxLen ? trimmed.slice(0, maxLen) : trimmed;
  }
  return fallback;
}

function resolvePositiveInt(
  patchVal: unknown,
  fallback: number,
  maxLimit?: number
): number {
  if (
    typeof patchVal === "number" &&
    Number.isFinite(patchVal) &&
    patchVal >= 1
  ) {
    const floored = Math.floor(patchVal);
    return maxLimit ? Math.min(maxLimit, floored) : floored;
  }
  return fallback;
}

function resolveBoolean(patchVal: unknown, fallback: boolean): boolean {
  return typeof patchVal === "boolean" ? patchVal : fallback;
}

function validateAndSanitizeSourcesPatch(
  patchSources: unknown,
  fallback: EventSourceMapping[]
): EventSourceMapping[] {
  if (patchSources === undefined) return fallback;
  if (!Array.isArray(patchSources)) {
    throw new PluginValidationError("Invalid sources: must be an array.");
  }
  const validated: EventSourceMapping[] = [];
  for (const rawItem of patchSources) {
    const rawObj = rawItem as EventSourceMapping | undefined;
    if (!rawObj || !isAllowedEventSourceUid(rawObj.uid)) {
      throw new PluginValidationError(
        `Disallowed event source UID "${String(rawObj?.uid ?? "")}". Only api::* and plugin::events.event are permitted.`
      );
    }
    const sanitized = sanitizeSourceMapping(rawObj);
    if (!sanitized) {
      throw new PluginValidationError("Invalid event source configuration.");
    }
    validated.push(sanitized);
  }
  return validated;
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
      sources: mergeSourcesList(
        DEFAULT_PLUGIN_SETTINGS.sources,
        userConfig.sources
      ),
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

      const storedSources = Array.isArray(existing.sources)
        ? existing.sources
            .map((s) => sanitizeSourceMapping(s))
            .filter((s): s is EventSourceMapping => s !== null)
        : [];
      for (const defSource of defaults.sources) {
        if (
          !storedSources.some(
            (s) => s.id === defSource.id || s.uid === defSource.uid
          )
        ) {
          storedSources.push(defSource);
        }
      }

      const storedCalendars = Array.isArray(existing.secondaryCalendars)
        ? existing.secondaryCalendars
            .map((c) => sanitizeCalendarConfig(c))
            .filter((c): c is CalendarSystemConfig => c !== null)
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
        recurrencePresets: mergePresetLists(
          defaults.recurrencePresets,
          existing.recurrencePresets
        ),
      };
      await store.set({ key: STORE_KEY, value: merged });
      return merged;
    },

    async getSettings(): Promise<EventsPluginSettings> {
      const store = getStore();
      const stored = (await store.get({
        key: STORE_KEY,
      })) as Partial<EventsPluginSettings> | null;
      const defaults = getConfigDefaults();
      if (!stored) {
        return defaults;
      }
      const cleanSources = Array.isArray(stored.sources)
        ? stored.sources
            .map((s) => sanitizeSourceMapping(s))
            .filter((s): s is EventSourceMapping => s !== null)
        : [];
      const cleanCalendars = Array.isArray(stored.secondaryCalendars)
        ? stored.secondaryCalendars
            .map((c) => sanitizeCalendarConfig(c))
            .filter((c): c is CalendarSystemConfig => c !== null)
        : [];

      return {
        ...defaults,
        ...stored,
        sources: cleanSources.length > 0 ? cleanSources : defaults.sources,
        secondaryCalendars:
          cleanCalendars.length > 0
            ? cleanCalendars
            : (defaults.secondaryCalendars ?? []),
        recurrencePresets: mergePresetLists(
          defaults.recurrencePresets,
          stored.recurrencePresets
        ),
      };
    },

    async updateSettings(
      patch: Partial<EventsPluginSettings>
    ): Promise<EventsPluginSettings> {
      const current = await this.getSettings();
      const nextSources = validateAndSanitizeSourcesPatch(
        patch.sources,
        current.sources
      );
      const nextCalendars = Array.isArray(patch.secondaryCalendars)
        ? patch.secondaryCalendars
            .map((c) => sanitizeCalendarConfig(c))
            .filter((c): c is CalendarSystemConfig => c !== null)
        : (current.secondaryCalendars ?? []);
      const nextPresets = Array.isArray(patch.recurrencePresets)
        ? patch.recurrencePresets
            .map((p) => sanitizeRecurrencePreset(p))
            .filter((p): p is RecurrencePreset => p !== null)
        : (current.recurrencePresets ?? []);

      const next: EventsPluginSettings = {
        ...current,
        defaultTimezone: resolveNonEmptyString(
          patch.defaultTimezone,
          current.defaultTimezone
        ),
        defaultCapacity: resolvePositiveInt(
          patch.defaultCapacity,
          current.defaultCapacity
        ),
        waitlistEnabledByDefault: resolveBoolean(
          patch.waitlistEnabledByDefault,
          current.waitlistEnabledByDefault
        ),
        defaultMaxGuestsPerRegistration: resolvePositiveInt(
          patch.defaultMaxGuestsPerRegistration,
          current.defaultMaxGuestsPerRegistration,
          50
        ),
        sendRsvpEmails: resolveBoolean(
          patch.sendRsvpEmails,
          current.sendRsvpEmails
        ),
        feedTitle: resolveNonEmptyString(
          patch.feedTitle,
          current.feedTitle,
          140
        ),
        sources: nextSources,
        secondaryCalendars: nextCalendars,
        recurrencePresets: nextPresets,
      };

      const store = getStore();
      await store.set({ key: STORE_KEY, value: next });
      return next;
    },
  };
};
