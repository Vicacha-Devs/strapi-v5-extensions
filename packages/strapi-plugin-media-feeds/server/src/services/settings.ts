import type { Core } from "@strapi/strapi";
import {
  FORBIDDEN_OBJECT_KEYS,
  isPlainObject,
  stripDangerousKeys,
} from "@vicacha-devs/plugin-shared";

import {
  ALLOWED_SOURCE_API_UID_REGEX,
  DEFAULT_MEDIA_FEEDS_SETTINGS,
  isAllowedMediaSourceUid,
  MASKED_SECRET_REGEX,
  MASKED_SECRET_VALUE,
  MEDIA_ITEM_UID,
  normalizeSpokenLanguages,
  parseMediaUrl,
  PLUGIN_ID,
  sanitizeOptionalMediaUrl,
  SETTINGS_STORE_KEY,
  type CalendarSystemConfig,
  type LiveBroadcastChannelItem,
  type LiveBroadcastConfig,
  type LiveBroadcastScheduleSlot,
  type MediaFeedsSettings,
  type MediaFeedsSourceConfig,
  type YouTubeSyncSourceConfig,
} from "../../../shared";

export { isPlainObject, stripDangerousKeys };

const settingsLocks = new WeakMap<object, Promise<void>>();

async function withSettingsLock<T>(
  lockTarget: object,
  task: () => Promise<T>
): Promise<T> {
  const previous = settingsLocks.get(lockTarget) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.then(
    () => current,
    () => current
  );
  settingsLocks.set(lockTarget, chained);

  await previous.catch(() => undefined);
  try {
    return await task();
  } finally {
    release();
    if (settingsLocks.get(lockTarget) === chained) {
      settingsLocks.delete(lockTarget);
    }
  }
}

export function maskSettingsSecrets(
  settings: MediaFeedsSettings
): MediaFeedsSettings {
  if (
    typeof settings.youtubeApiKey === "string" &&
    settings.youtubeApiKey.length > 0
  ) {
    return {
      ...settings,
      youtubeApiKey: MASKED_SECRET_VALUE,
    };
  }
  return { ...settings };
}

export function stripOverviewSecrets(
  settings: MediaFeedsSettings
): Omit<MediaFeedsSettings, "youtubeApiKey"> {
  const { youtubeApiKey: _omitted, ...publicSettings } = settings;
  return publicSettings;
}

function getPluginConfig(strapi: Core.Strapi): Partial<MediaFeedsSettings> {
  const raw = strapi.config.get<unknown>(`plugin::${PLUGIN_ID}`);
  return isPlainObject(raw)
    ? (stripDangerousKeys(raw) as Partial<MediaFeedsSettings>)
    : {};
}

function pickDefinedArray<T>(
  primary?: T[],
  secondary?: T[],
  fallback: T[] = []
): T[] {
  if (Array.isArray(primary)) return primary;
  if (Array.isArray(secondary)) return secondary;
  return fallback;
}

function resolveSupportedLocales(
  primary: unknown,
  secondary: unknown,
  defaultLocale: string
): string[] {
  const cleanList = (arr: unknown): string[] | undefined => {
    if (!Array.isArray(arr)) return undefined;
    const items = arr
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return items.length > 0 ? Array.from(new Set(items)) : [defaultLocale];
  };

  return (
    cleanList(primary) ??
    cleanList(secondary) ??
    DEFAULT_MEDIA_FEEDS_SETTINGS.supportedLocales
  );
}

export function sanitizeLiveStreamConfig(
  rawConfig: unknown,
  defaultLocale: string
): LiveBroadcastConfig {
  const base = DEFAULT_MEDIA_FEEDS_SETTINGS.liveStream;
  const obj = isPlainObject(rawConfig) ? rawConfig : {};
  const rawWatch =
    typeof obj.watchUrl === "string" ? obj.watchUrl : base.watchUrl;
  const rawProv =
    typeof obj.provider === "string" ? obj.provider : base.provider;
  const parsed = parseMediaUrl(rawWatch, rawProv);
  const rawSlots = Array.isArray(obj.recurringSlots)
    ? obj.recurringSlots
    : base.recurringSlots;

  return {
    enabled: typeof obj.enabled === "boolean" ? obj.enabled : base.enabled,
    title: typeof obj.title === "string" ? obj.title : base.title,
    description:
      typeof obj.description === "string" ? obj.description : base.description,
    scheduleLabel:
      typeof obj.scheduleLabel === "string"
        ? obj.scheduleLabel
        : base.scheduleLabel,
    provider: parsed.provider,
    watchUrl: parsed.canonicalUrl,
    embedUrl: sanitizeOptionalMediaUrl(obj.embedUrl),
    thumbnailUrl: sanitizeOptionalMediaUrl(obj.thumbnailUrl),
    spokenLanguages: normalizeSpokenLanguages(obj.spokenLanguages, [
      defaultLocale,
    ]),
    recurringSlots: Array.isArray(rawSlots)
      ? rawSlots.filter((s): s is LiveBroadcastScheduleSlot => isPlainObject(s))
      : undefined,
  };
}

export function sanitizeLiveStreamItems(
  rawStreams: unknown,
  defaultLocale: string
): LiveBroadcastChannelItem[] {
  if (!Array.isArray(rawStreams)) return [];
  const sanitized: LiveBroadcastChannelItem[] = [];

  rawStreams.forEach((entry, idx) => {
    if (!isPlainObject(entry)) return;
    const rawWatch = typeof entry.watchUrl === "string" ? entry.watchUrl : "";
    const rawProv =
      typeof entry.provider === "string" ? entry.provider : "youtube";
    const parsed = parseMediaUrl(rawWatch, rawProv);
    const id =
      typeof entry.id === "string" && entry.id.trim()
        ? entry.id.trim()
        : `stream-${idx + 1}`;

    const item: LiveBroadcastChannelItem = {
      id,
      enabled: Boolean(entry.enabled),
      title: typeof entry.title === "string" ? entry.title : "",
      scheduleLabel:
        typeof entry.scheduleLabel === "string"
          ? entry.scheduleLabel
          : undefined,
      eventSlug:
        typeof entry.eventSlug === "string" ? entry.eventSlug : undefined,
      provider: parsed.provider,
      watchUrl: parsed.canonicalUrl,
    };

    if (entry.embedUrl !== undefined) {
      item.embedUrl = sanitizeOptionalMediaUrl(entry.embedUrl);
    }
    if (entry.thumbnailUrl !== undefined) {
      item.thumbnailUrl = sanitizeOptionalMediaUrl(entry.thumbnailUrl);
    }
    if (entry.spokenLanguages !== undefined) {
      item.spokenLanguages = normalizeSpokenLanguages(entry.spokenLanguages, [
        defaultLocale,
      ]);
    }

    sanitized.push(item);
  });

  return sanitized;
}

export function sanitizeYouTubeSyncSources(
  rawSources: unknown,
  defaultLocale: string
): YouTubeSyncSourceConfig[] {
  if (!Array.isArray(rawSources)) return [];
  const sanitized: YouTubeSyncSourceConfig[] = [];

  for (const entry of rawSources) {
    if (!isPlainObject(entry)) continue;
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    if (!id) continue;

    sanitized.push({
      ...(entry as unknown as YouTubeSyncSourceConfig),
      id,
      label: typeof entry.label === "string" && entry.label ? entry.label : id,
      enabled: Boolean(entry.enabled),
      defaultSpokenLanguages:
        entry.defaultSpokenLanguages !== undefined
          ? normalizeSpokenLanguages(entry.defaultSpokenLanguages, [
              defaultLocale,
            ])
          : undefined,
    });
  }

  return sanitized;
}

function sanitizeSources(sources: unknown): MediaFeedsSourceConfig[] {
  if (!Array.isArray(sources)) return [];
  return sources.filter(
    (entry): entry is MediaFeedsSourceConfig =>
      isPlainObject(entry) &&
      isAllowedMediaSourceUid(entry.uid) &&
      isPlainObject(entry.fields)
  );
}

function sanitizeCalendars(calendars: unknown): CalendarSystemConfig[] {
  if (!Array.isArray(calendars)) return [];
  return calendars.filter(
    (sys): sys is CalendarSystemConfig =>
      isPlainObject(sys) &&
      typeof sys.id === "string" &&
      sys.id.length > 0 &&
      !FORBIDDEN_OBJECT_KEYS.has(sys.id)
  );
}

function sanitizeSchemaExtensions(
  ext: unknown
): Record<string, Record<string, unknown>> {
  if (!isPlainObject(ext)) return {};
  const result: Record<string, Record<string, unknown>> = {};
  for (const key of Object.keys(ext)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key)) continue;
    const isAllowed =
      key === "media-item" ||
      key === "mediaItem" ||
      key === MEDIA_ITEM_UID ||
      ALLOWED_SOURCE_API_UID_REGEX.test(key);
    if (isAllowed && isPlainObject(ext[key])) {
      result[key] = stripDangerousKeys(ext[key]);
    }
  }
  return result;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getStore() {
    return strapi.store({
      type: "plugin",
      name: PLUGIN_ID,
    });
  },

  mergeSettings(
    fileConfig: Partial<MediaFeedsSettings>,
    stored: Partial<MediaFeedsSettings> | null
  ): MediaFeedsSettings {
    const safeFile = isPlainObject(fileConfig)
      ? stripDangerousKeys(fileConfig)
      : {};
    const safeStored = isPlainObject(stored) ? stripDangerousKeys(stored) : {};

    const defaultLocale =
      (typeof safeStored.defaultLocale === "string" &&
        safeStored.defaultLocale.trim()) ||
      (typeof safeFile.defaultLocale === "string" &&
        safeFile.defaultLocale.trim()) ||
      DEFAULT_MEDIA_FEEDS_SETTINGS.defaultLocale;

    const mergedLiveStream = {
      ...DEFAULT_MEDIA_FEEDS_SETTINGS.liveStream,
      ...(isPlainObject(safeFile.liveStream) ? safeFile.liveStream : {}),
      ...(isPlainObject(safeStored.liveStream) ? safeStored.liveStream : {}),
    };

    const rawLiveStreams = pickDefinedArray(
      safeStored.liveStreams,
      safeFile.liveStreams,
      DEFAULT_MEDIA_FEEDS_SETTINGS.liveStreams ?? []
    );
    const rawYtSources = pickDefinedArray(
      safeStored.youtubeSyncSources,
      safeFile.youtubeSyncSources,
      []
    );
    const rawSources = pickDefinedArray(
      safeStored.sources,
      safeFile.sources,
      []
    );
    const rawCalendars = pickDefinedArray(
      safeStored.secondaryCalendars,
      safeFile.secondaryCalendars,
      []
    );
    const rawExtensions =
      safeStored.schemaExtensions ?? safeFile.schemaExtensions ?? {};

    return {
      ...DEFAULT_MEDIA_FEEDS_SETTINGS,
      ...safeFile,
      ...safeStored,
      defaultLocale,
      podcastFeed: {
        ...DEFAULT_MEDIA_FEEDS_SETTINGS.podcastFeed,
        ...(isPlainObject(safeFile.podcastFeed) ? safeFile.podcastFeed : {}),
        ...(isPlainObject(safeStored.podcastFeed)
          ? safeStored.podcastFeed
          : {}),
      },
      liveStream: sanitizeLiveStreamConfig(mergedLiveStream, defaultLocale),
      liveStreams: sanitizeLiveStreamItems(rawLiveStreams, defaultLocale),
      supportedLocales: resolveSupportedLocales(
        safeStored.supportedLocales,
        safeFile.supportedLocales,
        defaultLocale
      ),
      youtubeSyncSources: sanitizeYouTubeSyncSources(
        rawYtSources,
        defaultLocale
      ),
      secondaryCalendars: sanitizeCalendars(rawCalendars),
      schemaExtensions: sanitizeSchemaExtensions(rawExtensions),
      sources: sanitizeSources(rawSources),
    };
  },

  async getSettings(): Promise<MediaFeedsSettings> {
    const store = this.getStore();
    const rawStored = await store.get({ key: SETTINGS_STORE_KEY });
    const stored = isPlainObject(rawStored)
      ? (rawStored as Partial<MediaFeedsSettings>)
      : null;
    const fileConfig = getPluginConfig(strapi);
    return this.mergeSettings(fileConfig, stored);
  },

  async updateSettings(
    partial: Partial<MediaFeedsSettings>
  ): Promise<MediaFeedsSettings> {
    if (!isPlainObject(partial)) {
      throw new TypeError("Settings update payload must be a plain object");
    }
    const cleanPartial = stripDangerousKeys(partial);

    return withSettingsLock(strapi, async () => {
      const current = await this.getSettings();
      const nextPartial = { ...cleanPartial };

      if (
        typeof nextPartial.youtubeApiKey === "string" &&
        MASKED_SECRET_REGEX.test(nextPartial.youtubeApiKey.trim())
      ) {
        nextPartial.youtubeApiKey = current.youtubeApiKey;
      }

      const updated = this.mergeSettings(current, nextPartial);
      await this.getStore().set({
        key: SETTINGS_STORE_KEY,
        value: updated,
      });
      return updated;
    });
  },

  async ensureDefaultSettings(): Promise<MediaFeedsSettings> {
    return withSettingsLock(strapi, async () => {
      const store = this.getStore();
      const rawExisting = await store.get({ key: SETTINGS_STORE_KEY });
      const existing = isPlainObject(rawExisting)
        ? (rawExisting as Partial<MediaFeedsSettings>)
        : null;
      const fileConfig = getPluginConfig(strapi);
      const merged = this.mergeSettings(fileConfig, existing);
      await store.set({
        key: SETTINGS_STORE_KEY,
        value: merged,
      });
      return merged;
    });
  },
});
