import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../../shared/pluginId";
import type {
  BookingsPluginSettings,
  BookingSourceMapping,
} from "../../../shared/types";
import { isSafeObjectKey } from "../errors";
import type {
  BookingsPluginConfig,
  DiscoveredCollectionField,
  DiscoveredCollectionSchema,
  SettingsService,
} from "../types";

const STORE_KEY = "settings";

const runtimeSourcesByStrapi = new WeakMap<
  Core.Strapi,
  Map<string, BookingSourceMapping>
>();

function getRuntimeSourceMap(
  strapi: Core.Strapi
): Map<string, BookingSourceMapping> {
  let map = runtimeSourcesByStrapi.get(strapi);
  if (!map) {
    map = new Map<string, BookingSourceMapping>();
    runtimeSourcesByStrapi.set(strapi, map);
  }
  return map;
}

export function clearRuntimeSettingsState(strapi: Core.Strapi): void {
  runtimeSourcesByStrapi.delete(strapi);
}

const VALID_THEMES = new Set([
  "breeze",
  "emerald",
  "sand",
  "midnight",
  "classic",
  "minimal",
  "warm",
  "ocean",
  "forest",
  "monarch",
  "forma",
  "pulse",
  "shadcn",
  "mui",
]);
const VALID_SECONDARY_LANGS = new Set(["local", "ar", "off"]);
const IGNORED_SYSTEM_UIDS = new Set([
  "plugin::upload.file",
  "plugin::upload.folder",
  "plugin::i18n.locale",
  "plugin::content-releases.release",
  "plugin::review-workflows.workflow",
]);
const BLOCKED_UID_PREFIXES = [
  "admin::",
  "strapi::",
  "plugin::users-permissions.",
  "plugin::inbox.",
  "plugin::donations.",
  "plugin::certificates.",
  "plugin::notes.",
  "plugin::broadcasts.",
];
const STRING_ATTR_TYPES = new Set(["string", "text", "email", "uid"]);
const NUMBER_ATTR_TYPES = new Set([
  "integer",
  "biginteger",
  "float",
  "decimal",
]);

export function isDiscoverableCollectionUid(
  uid: unknown,
  kind?: string
): uid is string {
  if (!isSafeObjectKey(uid)) return false;
  if (kind && kind !== "collectionType") return false;
  if (BLOCKED_UID_PREFIXES.some((prefix) => uid.startsWith(prefix))) {
    return false;
  }
  return !IGNORED_SYSTEM_UIDS.has(uid);
}

function sanitizeSourceMapping(raw: unknown): BookingSourceMapping | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const src = raw as BookingSourceMapping;
  if (!isDiscoverableCollectionUid(src.uid)) {
    return null;
  }
  let cleanSlotWindows:
    | Record<string, { start: string; end: string }>
    | undefined;
  if (src.slotWindows && typeof src.slotWindows === "object") {
    cleanSlotWindows = {};
    for (const [k, v] of Object.entries(src.slotWindows)) {
      if (
        isSafeObjectKey(k) &&
        v &&
        typeof v.start === "string" &&
        typeof v.end === "string"
      ) {
        cleanSlotWindows[k] = { start: v.start, end: v.end };
      }
    }
  }
  return {
    ...src,
    uid: src.uid,
    slotWindows: cleanSlotWindows,
  };
}

function sanitizeSourceArray(val: unknown): BookingSourceMapping[] {
  if (!Array.isArray(val)) return [];
  return val
    .map(sanitizeSourceMapping)
    .filter((item): item is BookingSourceMapping => item !== null);
}

function asArrayOr<T>(val: unknown, fallback?: T[]): T[] {
  if (Array.isArray(val)) return val as T[];
  return Array.isArray(fallback) ? fallback : [];
}

function finiteIntOr(
  val: unknown,
  fallback: number,
  min: number,
  max?: number
): number {
  const num = typeof val === "number" ? val : Number(val);
  const safe = Number.isFinite(num) ? Math.trunc(num) : fallback;
  const clamped = Math.max(min, safe);
  return max !== undefined ? Math.min(max, clamped) : clamped;
}

function buildDefaultSlotSettings(pluginConfig: BookingsPluginConfig) {
  return {
    defaultTimezone: pluginConfig.defaultTimezone ?? "UTC",
    defaultSlotDurationMinutes: finiteIntOr(
      pluginConfig.defaultSlotDurationMinutes,
      60,
      5,
      1440
    ),
    defaultBufferBeforeMinutes: finiteIntOr(
      pluginConfig.defaultBufferBeforeMinutes,
      0,
      0,
      720
    ),
    defaultBufferAfterMinutes: finiteIntOr(
      pluginConfig.defaultBufferAfterMinutes,
      0,
      0,
      720
    ),
    defaultCapacityPerSlot: finiteIntOr(
      pluginConfig.defaultCapacityPerSlot,
      1,
      1
    ),
    defaultMinLeadTimeHours: finiteIntOr(
      pluginConfig.defaultMinLeadTimeHours,
      2,
      0
    ),
    defaultMaxAdvanceDays: finiteIntOr(
      pluginConfig.defaultMaxAdvanceDays,
      90,
      1
    ),
  };
}

function buildDefaultSettings(strapi: Core.Strapi): BookingsPluginSettings {
  const pluginConfig = (strapi.config.get(`plugin::${PLUGIN_ID}`) ??
    {}) as BookingsPluginConfig;

  return {
    theme: pluginConfig.theme ?? "breeze",
    defaultLocale: pluginConfig.defaultLocale ?? "es",
    secondaryCalendarLanguage:
      pluginConfig.secondaryCalendarLanguage ?? "local",
    ...buildDefaultSlotSettings(pluginConfig),
    defaultRequiresApproval: pluginConfig.defaultRequiresApproval ?? false,
    sendEmailNotifications: pluginConfig.sendEmailNotifications ?? true,
    icalFeedToken:
      typeof pluginConfig.icalFeedToken === "string" &&
      pluginConfig.icalFeedToken.trim()
        ? pluginConfig.icalFeedToken.trim()
        : undefined,
    secondaryCalendars: asArrayOr(pluginConfig.secondaryCalendars, []),
    defaultSeasonalSchedules: asArrayOr(
      pluginConfig.defaultSeasonalSchedules,
      []
    ),
    holidays: asArrayOr(pluginConfig.holidays, []),
    sources: sanitizeSourceArray(pluginConfig.sources),
  };
}

function mergeConfiguredSources(
  strapi: Core.Strapi,
  defaults: BookingsPluginSettings,
  stored?: Partial<BookingsPluginSettings>
): BookingSourceMapping[] {
  const mergedSources = new Map<string, BookingSourceMapping>();
  for (const src of defaults.sources) {
    mergedSources.set(src.uid, src);
  }
  for (const [uid, src] of getRuntimeSourceMap(strapi).entries()) {
    if (isDiscoverableCollectionUid(uid)) {
      mergedSources.set(uid, src);
    }
  }
  for (const src of sanitizeSourceArray(stored?.sources)) {
    mergedSources.set(src.uid, src);
  }
  return Array.from(mergedSources.values());
}

function resolveSlotSettings(
  primary: Partial<BookingsPluginSettings> | undefined,
  fallback: BookingsPluginSettings
) {
  const defaultTimezone =
    typeof primary?.defaultTimezone === "string" &&
    primary.defaultTimezone.trim()
      ? primary.defaultTimezone.trim()
      : fallback.defaultTimezone;

  return {
    defaultTimezone,
    defaultSlotDurationMinutes: finiteIntOr(
      primary?.defaultSlotDurationMinutes,
      fallback.defaultSlotDurationMinutes,
      5,
      1440
    ),
    defaultBufferBeforeMinutes: finiteIntOr(
      primary?.defaultBufferBeforeMinutes,
      fallback.defaultBufferBeforeMinutes,
      0,
      720
    ),
    defaultBufferAfterMinutes: finiteIntOr(
      primary?.defaultBufferAfterMinutes,
      fallback.defaultBufferAfterMinutes,
      0,
      720
    ),
    defaultCapacityPerSlot: finiteIntOr(
      primary?.defaultCapacityPerSlot,
      fallback.defaultCapacityPerSlot,
      1
    ),
    defaultMinLeadTimeHours: finiteIntOr(
      primary?.defaultMinLeadTimeHours,
      fallback.defaultMinLeadTimeHours,
      0
    ),
    defaultMaxAdvanceDays: finiteIntOr(
      primary?.defaultMaxAdvanceDays,
      fallback.defaultMaxAdvanceDays,
      1
    ),
  };
}

function resolveUpdatedAppearance(
  partial: Partial<BookingsPluginSettings>,
  current: BookingsPluginSettings
) {
  const theme =
    partial.theme && VALID_THEMES.has(partial.theme)
      ? partial.theme
      : (current.theme ?? "breeze");
  const defaultLocale =
    typeof partial.defaultLocale === "string" && partial.defaultLocale.trim()
      ? partial.defaultLocale.trim()
      : (current.defaultLocale ?? "es");
  const secondaryCalendarLanguage =
    partial.secondaryCalendarLanguage &&
    VALID_SECONDARY_LANGS.has(partial.secondaryCalendarLanguage)
      ? partial.secondaryCalendarLanguage
      : (current.secondaryCalendarLanguage ?? "local");
  return { theme, defaultLocale, secondaryCalendarLanguage };
}

function classifySchemaAttributes(
  attributes: Record<string, { type?: string }>
) {
  const fields: DiscoveredCollectionField[] = [];
  const dateFields: string[] = [];
  const stringFields: string[] = [];
  const numberFields: string[] = [];
  const enumFields: string[] = [];

  for (const [attrName, attrDef] of Object.entries(attributes)) {
    if (!isSafeObjectKey(attrName) || !Object.hasOwn(attributes, attrName)) {
      continue;
    }
    const attrType = String(attrDef?.type ?? "string");
    fields.push({ name: attrName, type: attrType });
    if (attrType === "date" || attrType === "datetime") {
      dateFields.push(attrName);
    } else if (STRING_ATTR_TYPES.has(attrType)) {
      stringFields.push(attrName);
    } else if (NUMBER_ATTR_TYPES.has(attrType)) {
      numberFields.push(attrName);
    } else if (attrType === "enumeration") {
      enumFields.push(attrName);
      stringFields.push(attrName);
    }
  }

  return { fields, dateFields, stringFields, numberFields, enumFields };
}

export default ({ strapi }: { strapi: Core.Strapi }): SettingsService => ({
  registerSource(source: BookingSourceMapping): void {
    const clean = sanitizeSourceMapping(source);
    if (!clean) return;
    getRuntimeSourceMap(strapi).set(clean.uid, clean);
  },

  async getSettings(): Promise<BookingsPluginSettings> {
    const defaults = buildDefaultSettings(strapi);
    const store = strapi.store({
      type: "plugin",
      name: PLUGIN_ID,
    });
    const stored = (await store.get({ key: STORE_KEY })) as
      | Partial<BookingsPluginSettings>
      | undefined;

    return {
      theme: stored?.theme ?? defaults.theme ?? "breeze",
      defaultLocale: stored?.defaultLocale ?? defaults.defaultLocale ?? "es",
      secondaryCalendarLanguage:
        stored?.secondaryCalendarLanguage ??
        defaults.secondaryCalendarLanguage ??
        "local",
      ...resolveSlotSettings(stored, defaults),
      defaultRequiresApproval:
        stored?.defaultRequiresApproval ?? defaults.defaultRequiresApproval,
      sendEmailNotifications:
        stored?.sendEmailNotifications ?? defaults.sendEmailNotifications,
      icalFeedToken:
        typeof stored?.icalFeedToken === "string" && stored.icalFeedToken.trim()
          ? stored.icalFeedToken.trim()
          : defaults.icalFeedToken,
      secondaryCalendars: asArrayOr(
        stored?.secondaryCalendars,
        defaults.secondaryCalendars
      ),
      defaultSeasonalSchedules: asArrayOr(
        stored?.defaultSeasonalSchedules,
        defaults.defaultSeasonalSchedules
      ),
      holidays: asArrayOr(stored?.holidays, defaults.holidays),
      sources: mergeConfiguredSources(strapi, defaults, stored),
    };
  },

  async updateSettings(
    partial: Partial<BookingsPluginSettings>
  ): Promise<BookingsPluginSettings> {
    const current = await this.getSettings();
    const sources =
      partial.sources !== undefined
        ? sanitizeSourceArray(partial.sources)
        : current.sources;
    const icalFeedToken =
      partial.icalFeedToken !== undefined
        ? typeof partial.icalFeedToken === "string" &&
          partial.icalFeedToken.trim()
          ? partial.icalFeedToken.trim()
          : undefined
        : current.icalFeedToken;

    const updated: BookingsPluginSettings = {
      ...resolveUpdatedAppearance(partial, current),
      ...resolveSlotSettings(partial, current),
      defaultRequiresApproval:
        typeof partial.defaultRequiresApproval === "boolean"
          ? partial.defaultRequiresApproval
          : current.defaultRequiresApproval,
      sendEmailNotifications:
        typeof partial.sendEmailNotifications === "boolean"
          ? partial.sendEmailNotifications
          : current.sendEmailNotifications,
      icalFeedToken,
      secondaryCalendars: asArrayOr(
        partial.secondaryCalendars,
        current.secondaryCalendars
      ),
      defaultSeasonalSchedules: asArrayOr(
        partial.defaultSeasonalSchedules,
        current.defaultSeasonalSchedules
      ),
      holidays: asArrayOr(partial.holidays, current.holidays),
      sources,
    };

    const store = strapi.store({
      type: "plugin",
      name: PLUGIN_ID,
    });
    await store.set({
      key: STORE_KEY,
      value: updated,
    });
    return updated;
  },

  async discoverSchemas(): Promise<DiscoveredCollectionSchema[]> {
    const contentTypes = (strapi.contentTypes ?? {}) as Record<
      string,
      {
        uid?: string;
        kind?: string;
        info?: {
          displayName?: string;
          singularName?: string;
          pluralName?: string;
        };
        attributes?: Record<string, { type?: string }>;
      }
    >;

    const result: DiscoveredCollectionSchema[] = [];

    for (const [key, ct] of Object.entries(contentTypes)) {
      if (!isSafeObjectKey(key)) continue;
      const uid = ct?.uid || key;
      if (!isDiscoverableCollectionUid(uid, ct?.kind)) continue;

      const classified = classifySchemaAttributes(ct?.attributes ?? {});
      result.push({
        uid,
        displayName: ct.info?.displayName || uid,
        singularName: ct.info?.singularName || uid,
        pluralName: ct.info?.pluralName || uid,
        ...classified,
      });
    }

    return result;
  },
});
