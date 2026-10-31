import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../../shared/pluginId';
import type {
  BookingsPluginSettings,
  BookingSourceMapping,
} from '../../../shared/types';
import type {
  BookingsPluginConfig,
  DiscoveredCollectionField,
  DiscoveredCollectionSchema,
  SettingsService,
} from '../types';

const STORE_KEY = 'settings';

const runtimeSources = new Map<string, BookingSourceMapping>();

const VALID_THEMES = new Set(['breeze', 'emerald', 'sand', 'midnight', 'classic']);
const VALID_SECONDARY_LANGS = new Set(['local', 'ar', 'off']);
const IGNORED_SYSTEM_UIDS = new Set([
  'plugin::upload.file',
  'plugin::upload.folder',
  'plugin::users-permissions.permission',
  'plugin::users-permissions.role',
]);
const STRING_ATTR_TYPES = new Set(['string', 'text', 'email', 'uid']);
const NUMBER_ATTR_TYPES = new Set(['integer', 'biginteger', 'float', 'decimal']);

function asArrayOr<T>(val: unknown, fallback?: T[]): T[] {
  if (Array.isArray(val)) return val as T[];
  return Array.isArray(fallback) ? fallback : [];
}

function buildDefaultSlotSettings(pluginConfig: BookingsPluginConfig) {
  return {
    defaultTimezone: pluginConfig.defaultTimezone ?? 'UTC',
    defaultSlotDurationMinutes: pluginConfig.defaultSlotDurationMinutes ?? 60,
    defaultBufferBeforeMinutes: pluginConfig.defaultBufferBeforeMinutes ?? 0,
    defaultBufferAfterMinutes: pluginConfig.defaultBufferAfterMinutes ?? 0,
    defaultCapacityPerSlot: pluginConfig.defaultCapacityPerSlot ?? 1,
    defaultMinLeadTimeHours: pluginConfig.defaultMinLeadTimeHours ?? 2,
    defaultMaxAdvanceDays: pluginConfig.defaultMaxAdvanceDays ?? 90,
  };
}

function buildDefaultSettings(strapi: Core.Strapi): BookingsPluginSettings {
  const pluginConfig = (strapi.config.get(`plugin::${PLUGIN_ID}`) ??
    {}) as BookingsPluginConfig;

  return {
    theme: pluginConfig.theme ?? 'breeze',
    defaultLocale: pluginConfig.defaultLocale ?? 'es',
    secondaryCalendarLanguage: pluginConfig.secondaryCalendarLanguage ?? 'local',
    ...buildDefaultSlotSettings(pluginConfig),
    defaultRequiresApproval: pluginConfig.defaultRequiresApproval ?? false,
    sendEmailNotifications: pluginConfig.sendEmailNotifications ?? true,
    secondaryCalendars: asArrayOr(pluginConfig.secondaryCalendars, []),
    defaultSeasonalSchedules: asArrayOr(pluginConfig.defaultSeasonalSchedules, []),
    holidays: asArrayOr(pluginConfig.holidays, []),
    sources: asArrayOr(pluginConfig.sources, []),
  };
}

function mergeConfiguredSources(
  defaults: BookingsPluginSettings,
  stored?: Partial<BookingsPluginSettings>
): BookingSourceMapping[] {
  const mergedSources = new Map<string, BookingSourceMapping>();
  for (const src of defaults.sources) {
    mergedSources.set(src.uid, src);
  }
  for (const [uid, src] of runtimeSources.entries()) {
    mergedSources.set(uid, src);
  }
  for (const src of asArrayOr<BookingSourceMapping>(stored?.sources, [])) {
    mergedSources.set(src.uid, src);
  }
  return Array.from(mergedSources.values());
}

function mergeSlotSettings(
  defaults: BookingsPluginSettings,
  stored?: Partial<BookingsPluginSettings>
) {
  return {
    defaultTimezone: stored?.defaultTimezone ?? defaults.defaultTimezone,
    defaultSlotDurationMinutes:
      stored?.defaultSlotDurationMinutes ?? defaults.defaultSlotDurationMinutes,
    defaultBufferBeforeMinutes:
      stored?.defaultBufferBeforeMinutes ?? defaults.defaultBufferBeforeMinutes,
    defaultBufferAfterMinutes:
      stored?.defaultBufferAfterMinutes ?? defaults.defaultBufferAfterMinutes,
    defaultCapacityPerSlot:
      stored?.defaultCapacityPerSlot ?? defaults.defaultCapacityPerSlot,
    defaultMinLeadTimeHours:
      stored?.defaultMinLeadTimeHours ?? defaults.defaultMinLeadTimeHours,
    defaultMaxAdvanceDays:
      stored?.defaultMaxAdvanceDays ?? defaults.defaultMaxAdvanceDays,
  };
}

function resolveUpdatedAppearance(
  partial: Partial<BookingsPluginSettings>,
  current: BookingsPluginSettings
) {
  const theme =
    partial.theme && VALID_THEMES.has(partial.theme)
      ? partial.theme
      : (current.theme ?? 'breeze');
  const defaultLocale =
    typeof partial.defaultLocale === 'string' && partial.defaultLocale.trim()
      ? partial.defaultLocale.trim()
      : (current.defaultLocale ?? 'es');
  const secondaryCalendarLanguage =
    partial.secondaryCalendarLanguage &&
    VALID_SECONDARY_LANGS.has(partial.secondaryCalendarLanguage)
      ? partial.secondaryCalendarLanguage
      : (current.secondaryCalendarLanguage ?? 'local');
  return { theme, defaultLocale, secondaryCalendarLanguage };
}

function resolveUpdatedSlotNumbers(
  partial: Partial<BookingsPluginSettings>,
  current: BookingsPluginSettings
) {
  return {
    defaultTimezone: partial.defaultTimezone ?? current.defaultTimezone,
    defaultSlotDurationMinutes: Math.max(
      5,
      Number(partial.defaultSlotDurationMinutes ?? current.defaultSlotDurationMinutes)
    ),
    defaultBufferBeforeMinutes: Math.max(
      0,
      Number(partial.defaultBufferBeforeMinutes ?? current.defaultBufferBeforeMinutes)
    ),
    defaultBufferAfterMinutes: Math.max(
      0,
      Number(partial.defaultBufferAfterMinutes ?? current.defaultBufferAfterMinutes)
    ),
    defaultCapacityPerSlot: Math.max(
      1,
      Number(partial.defaultCapacityPerSlot ?? current.defaultCapacityPerSlot)
    ),
    defaultMinLeadTimeHours: Math.max(
      0,
      Number(partial.defaultMinLeadTimeHours ?? current.defaultMinLeadTimeHours)
    ),
    defaultMaxAdvanceDays: Math.max(
      1,
      Number(partial.defaultMaxAdvanceDays ?? current.defaultMaxAdvanceDays)
    ),
  };
}

function isDiscoverableCollectionUid(uid: string, kind?: string): boolean {
  if (kind && kind !== 'collectionType') return false;
  if (uid.startsWith('admin::') || uid.startsWith('strapi::')) return false;
  return !IGNORED_SYSTEM_UIDS.has(uid);
}

function classifySchemaAttributes(attributes: Record<string, { type?: string }>) {
  const fields: DiscoveredCollectionField[] = [];
  const dateFields: string[] = [];
  const stringFields: string[] = [];
  const numberFields: string[] = [];
  const enumFields: string[] = [];

  for (const [attrName, attrDef] of Object.entries(attributes)) {
    const attrType = String(attrDef?.type ?? 'string');
    fields.push({ name: attrName, type: attrType });
    if (attrType === 'date' || attrType === 'datetime') {
      dateFields.push(attrName);
    } else if (STRING_ATTR_TYPES.has(attrType)) {
      stringFields.push(attrName);
    } else if (NUMBER_ATTR_TYPES.has(attrType)) {
      numberFields.push(attrName);
    } else if (attrType === 'enumeration') {
      enumFields.push(attrName);
      stringFields.push(attrName);
    }
  }

  return { fields, dateFields, stringFields, numberFields, enumFields };
}

export default ({ strapi }: { strapi: Core.Strapi }): SettingsService => ({
  registerSource(source: BookingSourceMapping): void {
    if (!source?.uid) return;
    runtimeSources.set(source.uid, source);
  },

  async getSettings(): Promise<BookingsPluginSettings> {
    const defaults = buildDefaultSettings(strapi);
    const store = strapi.store({
      type: 'plugin',
      name: PLUGIN_ID,
    });
    const stored = (await store.get({ key: STORE_KEY })) as
      | Partial<BookingsPluginSettings>
      | undefined;

    return {
      theme: stored?.theme ?? defaults.theme ?? 'breeze',
      defaultLocale: stored?.defaultLocale ?? defaults.defaultLocale ?? 'es',
      secondaryCalendarLanguage:
        stored?.secondaryCalendarLanguage ?? defaults.secondaryCalendarLanguage ?? 'local',
      ...mergeSlotSettings(defaults, stored),
      defaultRequiresApproval:
        stored?.defaultRequiresApproval ?? defaults.defaultRequiresApproval,
      sendEmailNotifications:
        stored?.sendEmailNotifications ?? defaults.sendEmailNotifications,
      secondaryCalendars: asArrayOr(
        stored?.secondaryCalendars,
        defaults.secondaryCalendars
      ),
      defaultSeasonalSchedules: asArrayOr(
        stored?.defaultSeasonalSchedules,
        defaults.defaultSeasonalSchedules
      ),
      holidays: asArrayOr(stored?.holidays, defaults.holidays),
      sources: mergeConfiguredSources(defaults, stored),
    };
  },

  async updateSettings(
    partial: Partial<BookingsPluginSettings>
  ): Promise<BookingsPluginSettings> {
    const current = await this.getSettings();
    const updated: BookingsPluginSettings = {
      ...resolveUpdatedAppearance(partial, current),
      ...resolveUpdatedSlotNumbers(partial, current),
      defaultRequiresApproval:
        typeof partial.defaultRequiresApproval === 'boolean'
          ? partial.defaultRequiresApproval
          : current.defaultRequiresApproval,
      sendEmailNotifications:
        typeof partial.sendEmailNotifications === 'boolean'
          ? partial.sendEmailNotifications
          : current.sendEmailNotifications,
      secondaryCalendars: asArrayOr(
        partial.secondaryCalendars,
        current.secondaryCalendars
      ),
      defaultSeasonalSchedules: asArrayOr(
        partial.defaultSeasonalSchedules,
        current.defaultSeasonalSchedules
      ),
      holidays: asArrayOr(partial.holidays, current.holidays),
      sources: asArrayOr(partial.sources, current.sources),
    };

    const store = strapi.store({
      type: 'plugin',
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
      const uid = ct.uid || key;
      if (!isDiscoverableCollectionUid(uid, ct.kind)) continue;

      const classified = classifySchemaAttributes(ct.attributes ?? {});
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
