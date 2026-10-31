import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../../shared/pluginId';
import {
  CALENDAR_COLOR_PALETTES,
  CALENDAR_THEME_PRESETS,
  type CalendarPluginSettings,
  type CalendarSourceMapping,
  type CalendarSystemConfig,
  type DiscoveredContentType,
  type RecurrencePreset as RecurrencePresetItem,
} from '../../../shared/types';
import { DEFAULT_CALENDAR_SETTINGS } from '../config';
import { getCalendarService, type SettingsService } from '../types';

const STORE_KEY = 'settings';

const BUILTIN_EVENTS_SOURCE: CalendarSourceMapping = {
  id: 'events',
  label: 'Events',
  uid: 'plugin::events.event',
  color: '#4945FF',
  enabled: true,
  fields: {
    title: 'title',
    startDate: 'startDate',
    endDate: 'endDate',
    rrule: 'recurrence',
    location: 'location',
    category: 'category',
    status: 'eventStatus',
    summary: 'summary',
    slug: 'slug',
    color: 'color',
  },
};

const BUILTIN_BOOKINGS_SOURCE: CalendarSourceMapping = {
  id: 'bookings',
  label: 'Bookings & Reservations',
  uid: 'plugin::bookings.booking',
  color: '#0D9488',
  enabled: true,
  fields: {
    title: 'title',
    startDate: 'startDate',
    endDate: 'endDate',
    status: 'status',
    location: 'assignedHost',
    summary: 'notes',
    category: 'status',
  },
};

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

function appendAutoDetectedPluginSources(
  mergedSources: CalendarSourceMapping[],
  contentTypes: Record<string, unknown>
): void {
  for (const builtin of [BUILTIN_EVENTS_SOURCE, BUILTIN_BOOKINGS_SOURCE]) {
    if (contentTypes[builtin.uid] && !mergedSources.some((s) => s.uid === builtin.uid)) {
      mergedSources.push({ ...builtin, fields: { ...builtin.fields } });
    }
  }
}

function mergeUserConfigSources(
  mergedSources: CalendarSourceMapping[],
  userSources?: CalendarSourceMapping[]
): void {
  if (!Array.isArray(userSources)) return;
  for (const src of userSources) {
    if (!src?.id || !src.uid) continue;
    const idx = mergedSources.findIndex((s) => s.id === src.id || s.uid === src.uid);
    if (idx >= 0) {
      mergedSources[idx] = {
        ...mergedSources[idx],
        ...src,
        fields: { ...mergedSources[idx].fields, ...(src.fields ?? {}) },
      };
    } else {
      mergedSources.push(src);
    }
  }
}

function mergeUserSecondaryCalendars(
  mergedCalendars: CalendarSystemConfig[],
  userCalendars?: CalendarSystemConfig[]
): void {
  if (!Array.isArray(userCalendars)) return;
  for (const cal of userCalendars) {
    if (!cal?.id || !cal.intlCalendar) continue;
    const idx = mergedCalendars.findIndex((c) => c.id === cal.id);
    if (idx >= 0) {
      mergedCalendars[idx] = { ...mergedCalendars[idx], ...cal };
    } else {
      mergedCalendars.push(cal);
    }
  }
}

function mergePresetLists(
  defaults: RecurrencePresetItem[] | undefined,
  stored: RecurrencePresetItem[] | undefined
): RecurrencePresetItem[] {
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

function mergeSourceLists(
  defaults: CalendarSourceMapping[],
  stored?: CalendarSourceMapping[]
): CalendarSourceMapping[] {
  const result = Array.isArray(stored) ? [...stored] : [];
  for (const defSource of defaults ?? []) {
    if (!result.some((s) => s.id === defSource.id || s.uid === defSource.uid)) {
      result.push(defSource);
    }
  }
  return result;
}

function mergeCalendarLists(
  defaults: CalendarSystemConfig[] | undefined,
  stored?: CalendarSystemConfig[]
): CalendarSystemConfig[] {
  const result = Array.isArray(stored) ? [...stored] : [];
  for (const defCal of defaults ?? []) {
    if (!result.some((c) => c.id === defCal.id)) {
      result.push(defCal);
    }
  }
  return result;
}

function pickNonEmptyStr(val: unknown, fallback: string, maxLen?: number): string {
  if (typeof val === 'string' && val.trim()) {
    const trimmed = val.trim();
    return maxLen ? trimmed.slice(0, maxLen) : trimmed;
  }
  return fallback;
}

function pickBool(val: unknown, fallback: boolean): boolean {
  return typeof val === 'boolean' ? val : fallback;
}

function pickEnum<T extends string>(val: unknown, allowed: readonly T[], fallback: T): T {
  return typeof val === 'string' && (allowed as readonly string[]).includes(val)
    ? (val as T)
    : fallback;
}

function pickArray<T>(val: unknown, fallback: T[]): T[] {
  return Array.isArray(val) ? (val as T[]) : fallback;
}

function pickRecordKey<T extends string>(
  val: unknown,
  record: Record<string, unknown>,
  fallback: T
): T {
  return typeof val === 'string' && val in record ? (val as T) : fallback;
}

function pickPrimaryHex(val: unknown, fallback: string): string {
  return typeof val === 'string' && val.startsWith('#') ? val.trim() : fallback;
}

function resolveThemePatch(
  current: CalendarPluginSettings,
  patch: Partial<CalendarPluginSettings>
): Pick<
  CalendarPluginSettings,
  'theme' | 'colorScheme' | 'themePalette' | 'secondaryCalendarLanguage' | 'primaryColor'
> {
  return {
    theme: pickRecordKey(patch.theme, CALENDAR_THEME_PRESETS, current.theme ?? 'breeze'),
    colorScheme: pickEnum(
      patch.colorScheme,
      ['auto', 'light', 'dark'] as const,
      current.colorScheme ?? 'auto'
    ),
    themePalette: pickRecordKey(
      patch.themePalette,
      CALENDAR_COLOR_PALETTES,
      current.themePalette ?? 'default'
    ),
    secondaryCalendarLanguage: pickEnum(
      patch.secondaryCalendarLanguage,
      ['local', 'ar', 'off'] as const,
      current.secondaryCalendarLanguage ?? 'local'
    ),
    primaryColor: pickPrimaryHex(patch.primaryColor, current.primaryColor),
  };
}

function resolveViewBooleansPatch(
  current: CalendarPluginSettings,
  patch: Partial<CalendarPluginSettings>
): Pick<
  CalendarPluginSettings,
  | 'weekNumbers'
  | 'timeFormat24h'
  | 'showWeekends'
  | 'showTodayButton'
  | 'showCreateButton'
  | 'monthView'
  | 'weekView'
  | 'dayView'
  | 'agendaView'
  | 'yearView'
> {
  return {
    weekNumbers: pickBool(patch.weekNumbers, current.weekNumbers ?? false),
    timeFormat24h: pickBool(patch.timeFormat24h, current.timeFormat24h ?? true),
    showWeekends: pickBool(patch.showWeekends, current.showWeekends),
    showTodayButton: pickBool(patch.showTodayButton, current.showTodayButton),
    showCreateButton: pickBool(patch.showCreateButton, current.showCreateButton),
    monthView: pickBool(patch.monthView, current.monthView),
    weekView: pickBool(patch.weekView, current.weekView),
    dayView: pickBool(patch.dayView, current.dayView),
    agendaView: pickBool(patch.agendaView, current.agendaView),
    yearView: pickBool(patch.yearView, current.yearView),
  };
}

function buildUpdatedSettings(
  current: CalendarPluginSettings,
  patch: Partial<CalendarPluginSettings>
): CalendarPluginSettings {
  const firstDay =
    typeof patch.firstDayOfWeek === 'number' &&
    patch.firstDayOfWeek >= 0 &&
    patch.firstDayOfWeek <= 6
      ? Math.floor(patch.firstDayOfWeek)
      : current.firstDayOfWeek;

  return {
    ...current,
    ...resolveThemePatch(current, patch),
    ...resolveViewBooleansPatch(current, patch),
    defaultTimezone: pickNonEmptyStr(patch.defaultTimezone, current.defaultTimezone),
    defaultLocale: pickNonEmptyStr(patch.defaultLocale, current.defaultLocale ?? 'auto'),
    direction: pickEnum(
      patch.direction,
      ['auto', 'ltr', 'rtl'] as const,
      current.direction ?? 'auto'
    ),
    defaultView:
      typeof patch.defaultView === 'string' ? patch.defaultView : current.defaultView,
    firstDayOfWeek: firstDay,
    weekNumberCalculation: pickEnum(
      patch.weekNumberCalculation,
      ['local', 'ISO'] as const,
      current.weekNumberCalculation ?? 'ISO'
    ),
    startHour: pickNonEmptyStr(patch.startHour, current.startHour),
    endHour: pickNonEmptyStr(patch.endHour, current.endHour),
    slotDuration: pickNonEmptyStr(patch.slotDuration, current.slotDuration),
    feedTitle: pickNonEmptyStr(patch.feedTitle, current.feedTitle, 140),
    businessHours: pickArray(patch.businessHours, current.businessHours),
    sources: pickArray(patch.sources, current.sources),
    secondaryCalendars: pickArray(
      patch.secondaryCalendars,
      current.secondaryCalendars ?? []
    ),
    recurrencePresets: pickArray(
      patch.recurrencePresets,
      current.recurrencePresets ?? []
    ),
  };
}

interface RawSchemaShape {
  kind?: string;
  info?: { displayName?: string };
  attributes?: Record<string, { type?: string; customField?: string }>;
}

function isDiscoverableSchema(uid: string, schema: unknown): schema is RawSchemaShape {
  if (!schema || typeof schema !== 'object') return false;
  if (!uid.startsWith('api::') && !uid.startsWith('plugin::')) return false;
  if (INTERNAL_PLUGIN_PREFIXES.some((prefix) => uid.startsWith(prefix))) return false;
  const typed = schema as RawSchemaShape;
  return !typed.kind || typed.kind === 'collectionType';
}

function extractSchemaFields(
  attributes: Record<string, { type?: string; customField?: string }>
): Array<{ name: string; type: string }> {
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
  return fields;
}

function scoreContentTypeUid(uid: string): number {
  if (uid === 'plugin::events.event') return 0;
  if (uid === 'plugin::bookings.booking') return 1;
  return uid.startsWith('api::') ? 2 : 3;
}

export default ({ strapi }: { strapi: Core.Strapi }): SettingsService => {
  const getStore = () => strapi.store({ type: 'plugin', name: PLUGIN_ID });
  const getRegistryService = () => getCalendarService(strapi, PLUGIN_ID, 'registry');

  const getConfigDefaults = (): CalendarPluginSettings => {
    const userConfig = (strapi.config.get(`plugin::${PLUGIN_ID}`) ??
      {}) as Partial<CalendarPluginSettings>;
    const registry = getRegistryService();

    const mergedSources: CalendarSourceMapping[] = [
      ...DEFAULT_CALENDAR_SETTINGS.sources,
      ...(registry?.getRegisteredSources?.() ?? []),
    ];
    appendAutoDetectedPluginSources(
      mergedSources,
      (strapi.contentTypes ?? {}) as Record<string, unknown>
    );
    mergeUserConfigSources(mergedSources, userConfig.sources);

    const mergedCalendars: CalendarSystemConfig[] = [
      ...(DEFAULT_CALENDAR_SETTINGS.secondaryCalendars ?? []),
      ...(registry?.getRegisteredSecondaryCalendars?.() ?? []),
    ];
    mergeUserSecondaryCalendars(mergedCalendars, userConfig.secondaryCalendars);

    const mergedPresets = mergePresetLists(
      DEFAULT_CALENDAR_SETTINGS.recurrencePresets,
      userConfig.recurrencePresets
    );

    return {
      ...DEFAULT_CALENDAR_SETTINGS,
      ...userConfig,
      sources: mergedSources,
      secondaryCalendars: mergedCalendars,
      recurrencePresets: mergedPresets,
    };
  };

  const mergeStoredWithDefaults = (
    defaults: CalendarPluginSettings,
    stored: Partial<CalendarPluginSettings>
  ): CalendarPluginSettings => ({
    ...defaults,
    ...stored,
    sources: mergeSourceLists(defaults.sources, stored.sources),
    secondaryCalendars: mergeCalendarLists(
      defaults.secondaryCalendars,
      stored.secondaryCalendars
    ),
    recurrencePresets: mergePresetLists(
      defaults.recurrencePresets,
      stored.recurrencePresets
    ),
  });

  const service: SettingsService = {
    async ensureInitialized(): Promise<CalendarPluginSettings> {
      const store = getStore();
      const existing = (await store.get({
        key: STORE_KEY,
      })) as Partial<CalendarPluginSettings> | null;
      const defaults = getConfigDefaults();
      const merged = existing ? mergeStoredWithDefaults(defaults, existing) : defaults;
      await store.set({ key: STORE_KEY, value: merged });
      return merged;
    },

    async getSettings(): Promise<CalendarPluginSettings> {
      const store = getStore();
      const stored = (await store.get({
        key: STORE_KEY,
      })) as Partial<CalendarPluginSettings> | null;
      const defaults = getConfigDefaults();
      return stored ? mergeStoredWithDefaults(defaults, stored) : defaults;
    },

    async updateSettings(
      patch: Partial<CalendarPluginSettings>
    ): Promise<CalendarPluginSettings> {
      const current = await service.getSettings();
      const next = buildUpdatedSettings(current, patch);
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

      for (const [uid, schema] of Object.entries(contentTypes)) {
        if (!isDiscoverableSchema(uid, schema)) continue;
        const fields = extractSchemaFields(schema.attributes ?? {});
        if (fields.length === 0) continue;
        discovered.push({
          uid,
          displayName: String(schema.info?.displayName || uid),
          kind: String(schema.kind || 'collectionType'),
          fields,
        });
      }

      discovered.sort(
        (a, b) =>
          scoreContentTypeUid(a.uid) - scoreContentTypeUid(b.uid) ||
          a.displayName.localeCompare(b.displayName)
      );
      return discovered;
    },
  };

  return service;
};
