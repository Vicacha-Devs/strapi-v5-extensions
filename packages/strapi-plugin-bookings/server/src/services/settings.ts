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

function buildDefaultSettings(strapi: Core.Strapi): BookingsPluginSettings {
  const pluginConfig = (strapi.config.get(`plugin::${PLUGIN_ID}`) ??
    {}) as BookingsPluginConfig;

  return {
    defaultTimezone: pluginConfig.defaultTimezone ?? 'UTC',
    defaultSlotDurationMinutes: pluginConfig.defaultSlotDurationMinutes ?? 60,
    defaultBufferBeforeMinutes: pluginConfig.defaultBufferBeforeMinutes ?? 0,
    defaultBufferAfterMinutes: pluginConfig.defaultBufferAfterMinutes ?? 0,
    defaultCapacityPerSlot: pluginConfig.defaultCapacityPerSlot ?? 1,
    defaultMinLeadTimeHours: pluginConfig.defaultMinLeadTimeHours ?? 2,
    defaultMaxAdvanceDays: pluginConfig.defaultMaxAdvanceDays ?? 90,
    defaultRequiresApproval: pluginConfig.defaultRequiresApproval ?? false,
    sendEmailNotifications: pluginConfig.sendEmailNotifications ?? true,
    secondaryCalendars: Array.isArray(pluginConfig.secondaryCalendars)
      ? pluginConfig.secondaryCalendars
      : [],
    defaultSeasonalSchedules: Array.isArray(pluginConfig.defaultSeasonalSchedules)
      ? pluginConfig.defaultSeasonalSchedules
      : [],
    holidays: Array.isArray(pluginConfig.holidays) ? pluginConfig.holidays : [],
    sources: Array.isArray(pluginConfig.sources) ? pluginConfig.sources : [],
  };
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

    const mergedSources = new Map<string, BookingSourceMapping>();
    for (const src of defaults.sources) {
      mergedSources.set(src.uid, src);
    }
    for (const [uid, src] of runtimeSources.entries()) {
      mergedSources.set(uid, src);
    }
    if (Array.isArray(stored?.sources)) {
      for (const src of stored.sources) {
        mergedSources.set(src.uid, src);
      }
    }

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
      defaultRequiresApproval:
        stored?.defaultRequiresApproval ?? defaults.defaultRequiresApproval,
      sendEmailNotifications:
        stored?.sendEmailNotifications ?? defaults.sendEmailNotifications,
      secondaryCalendars: Array.isArray(stored?.secondaryCalendars)
        ? stored.secondaryCalendars
        : defaults.secondaryCalendars,
      defaultSeasonalSchedules: Array.isArray(stored?.defaultSeasonalSchedules)
        ? stored.defaultSeasonalSchedules
        : defaults.defaultSeasonalSchedules,
      holidays: Array.isArray(stored?.holidays)
        ? stored.holidays
        : defaults.holidays,
      sources: Array.from(mergedSources.values()),
    };
  },

  async updateSettings(
    partial: Partial<BookingsPluginSettings>
  ): Promise<BookingsPluginSettings> {
    const current = await this.getSettings();
    const updated: BookingsPluginSettings = {
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
      defaultRequiresApproval:
        typeof partial.defaultRequiresApproval === 'boolean'
          ? partial.defaultRequiresApproval
          : current.defaultRequiresApproval,
      sendEmailNotifications:
        typeof partial.sendEmailNotifications === 'boolean'
          ? partial.sendEmailNotifications
          : current.sendEmailNotifications,
      secondaryCalendars: Array.isArray(partial.secondaryCalendars)
        ? partial.secondaryCalendars
        : current.secondaryCalendars,
      defaultSeasonalSchedules: Array.isArray(partial.defaultSeasonalSchedules)
        ? partial.defaultSeasonalSchedules
        : current.defaultSeasonalSchedules,
      holidays: Array.isArray(partial.holidays)
        ? partial.holidays
        : current.holidays,
      sources: Array.isArray(partial.sources) ? partial.sources : current.sources,
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
      if (ct.kind && ct.kind !== 'collectionType') continue;
      if (
        uid.startsWith('admin::') ||
        uid.startsWith('strapi::') ||
        uid === 'plugin::upload.file' ||
        uid === 'plugin::upload.folder' ||
        uid === 'plugin::users-permissions.permission' ||
        uid === 'plugin::users-permissions.role'
      ) {
        continue;
      }

      const attributes = ct.attributes ?? {};
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
        } else if (
          attrType === 'string' ||
          attrType === 'text' ||
          attrType === 'email' ||
          attrType === 'uid'
        ) {
          stringFields.push(attrName);
        } else if (
          attrType === 'integer' ||
          attrType === 'biginteger' ||
          attrType === 'float' ||
          attrType === 'decimal'
        ) {
          numberFields.push(attrName);
        } else if (attrType === 'enumeration') {
          enumFields.push(attrName);
          stringFields.push(attrName);
        }
      }

      result.push({
        uid,
        displayName: ct.info?.displayName || uid,
        singularName: ct.info?.singularName || uid,
        pluralName: ct.info?.pluralName || uid,
        dateFields,
        stringFields,
        numberFields,
        enumFields,
        fields,
      });
    }

    return result;
  },
});
