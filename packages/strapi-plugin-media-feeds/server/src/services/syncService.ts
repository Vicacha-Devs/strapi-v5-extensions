import type { Core } from "@strapi/strapi";

import {
  buildYouTubeAtomFeedUrl,
  MAX_MEDIA_URL_LENGTH,
  MAX_YOUTUBE_ATOM_XML_LENGTH,
  MEDIA_ITEM_UID,
  parseMediaUrl,
  parseYouTubeAtomFeedXml,
  PLUGIN_ID,
  type MediaFeedsSettings,
  type ParsedMediaProviderInfo,
} from "../../../shared";
import { isPlainObject } from "./settings";

export interface EnrichedMediaMetadata extends ParsedMediaProviderInfo {
  title?: string | null;
  authorName?: string | null;
}

const FETCH_TIMEOUT_MS = 5000;
const MAX_OEMBED_BYTES = 64 * 1024;
const EXISTING_ID_BATCH_SIZE = 100;

const OEMBED_BUILDERS: Record<string, (url: string) => string> = {
  youtube: (url) =>
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  vimeo: (url) =>
    `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
  spotify: (url) =>
    `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
};

const syncLocks = new WeakMap<object, Promise<void>>();

async function withSyncLock<T>(
  lockTarget: object,
  task: () => Promise<T>
): Promise<T> {
  const previous = syncLocks.get(lockTarget) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.then(
    () => current,
    () => current
  );
  syncLocks.set(lockTarget, chained);

  await previous.catch(() => undefined);
  try {
    return await task();
  } finally {
    release();
    if (syncLocks.get(lockTarget) === chained) {
      syncLocks.delete(lockTarget);
    }
  }
}

function pickSafeHttpsThumbnail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_MEDIA_URL_LENGTH) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return null;
    parsed.username = "";
    parsed.password = "";
    return parsed.href;
  } catch {
    return null;
  }
}

function mergeOembedPayload(
  parsed: ParsedMediaProviderInfo,
  payload: Record<string, unknown>
): EnrichedMediaMetadata {
  const oembedThumb = pickSafeHttpsThumbnail(payload.thumbnail_url);
  return {
    ...parsed,
    title: typeof payload.title === "string" ? payload.title : null,
    authorName:
      typeof payload.author_name === "string" ? payload.author_name : null,
    thumbnailUrl: oembedThumb ?? parsed.thumbnailUrl,
  };
}

async function fetchBoundedText(
  url: string,
  maxBytes: number
): Promise<string | null> {
  const response = await globalThis.fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "error",
  });
  if (!response.ok) return null;

  const contentLength = response.headers?.get?.("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    return null;
  }

  if (response.body && typeof response.body.getReader === "function") {
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let totalBytes = 0;
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel().catch(() => undefined);
          return null;
        }
        text += decoder.decode(value, { stream: true });
      }
    }
    text += decoder.decode();
    return text;
  }

  if (typeof response.text === "function") {
    const rawText = await response.text();
    return Buffer.byteLength(rawText, "utf8") <= maxBytes ? rawText : null;
  }

  if (typeof response.json === "function") {
    const rawJson = await response.json();
    const serialized = JSON.stringify(rawJson);
    return Buffer.byteLength(serialized, "utf8") <= maxBytes
      ? serialized
      : null;
  }

  return null;
}

async function collectExistingExternalIds(
  strapi: Core.Strapi,
  locale: string,
  videoIds: string[]
): Promise<Set<string>> {
  const found = new Set<string>();
  if (videoIds.length === 0) return found;

  for (let i = 0; i < videoIds.length; i += EXISTING_ID_BATCH_SIZE) {
    const batch = videoIds.slice(i, i + EXISTING_ID_BATCH_SIZE);
    const baseQuery = {
      locale,
      filters: { externalId: { $in: batch } },
      limit: Math.max(batch.length * 2, 100),
    };

    const [draftRecords, publishedRecords] = await Promise.all([
      strapi.documents(MEDIA_ITEM_UID).findMany({
        ...baseQuery,
        status: "draft",
      }),
      strapi.documents(MEDIA_ITEM_UID).findMany({
        ...baseQuery,
        status: "published",
      }),
    ]);

    for (const rec of [...draftRecords, ...publishedRecords]) {
      if (typeof rec.externalId === "string" && rec.externalId) {
        found.add(rec.externalId);
      }
    }
  }

  return found;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsService = () =>
    strapi.plugin(PLUGIN_ID).service("settings") as {
      getSettings(): Promise<MediaFeedsSettings>;
    };

  const syncYouTubeFeedXmlUnlocked = async (
    xmlContent: string,
    sourceId?: string
  ): Promise<{ syncedCount: number; skippedCount: number }> => {
    const settings = await getSettingsService().getSettings();
    const safeSyncSources = Array.isArray(settings.youtubeSyncSources)
      ? settings.youtubeSyncSources.filter((s) => isPlainObject(s))
      : [];
    const sourceConfig = safeSyncSources.find((s) => s.id === sourceId);
    const videos = parseYouTubeAtomFeedXml(xmlContent, sourceConfig);
    if (videos.length === 0) {
      return { syncedCount: 0, skippedCount: 0 };
    }

    const uniqueVideoIds = Array.from(new Set(videos.map((v) => v.videoId)));
    const existingIds = await collectExistingExternalIds(
      strapi,
      settings.defaultLocale,
      uniqueVideoIds
    );

    let syncedCount = 0;
    let skippedCount = 0;

    for (const video of videos) {
      if (existingIds.has(video.videoId)) {
        skippedCount += 1;
        continue;
      }

      try {
        await strapi.documents(MEDIA_ITEM_UID).create({
          locale: settings.defaultLocale,
          status: "published",
          data: {
            title: video.title,
            slug: video.slug,
            description: video.description,
            type: video.type,
            provider: "youtube",
            externalId: video.videoId,
            sourceUrl: video.watchUrl,
            embedUrl: video.embedUrl,
            imageUrl: video.thumbnailUrl,
            imageAlt: video.title,
            speaker: video.authorName,
            seriesSlug: video.seriesSlug,
            spokenLanguages: video.spokenLanguages,
            featured: false,
            isLive: false,
          },
        });
        existingIds.add(video.videoId);
        syncedCount += 1;
      } catch (err) {
        skippedCount += 1;
        strapi.log?.warn?.(
          `[${PLUGIN_ID}] Skipping YouTube video "${video.videoId}": ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    return { syncedCount, skippedCount };
  };

  return {
    getSettingsService,

    async enrichUrl(
      rawUrl: string,
      fetchOembed = false
    ): Promise<EnrichedMediaMetadata> {
      const parsed = parseMediaUrl(rawUrl);
      const buildEndpoint = Object.hasOwn(OEMBED_BUILDERS, parsed.provider)
        ? OEMBED_BUILDERS[parsed.provider]
        : undefined;

      if (
        !fetchOembed ||
        !parsed.canonicalUrl ||
        !buildEndpoint ||
        typeof globalThis.fetch !== "function"
      ) {
        return parsed;
      }

      try {
        const rawJsonText = await fetchBoundedText(
          buildEndpoint(parsed.canonicalUrl),
          MAX_OEMBED_BYTES
        );
        if (!rawJsonText) return parsed;
        const payload: unknown = JSON.parse(rawJsonText);
        if (!isPlainObject(payload)) return parsed;
        return mergeOembedPayload(parsed, payload);
      } catch {
        return parsed;
      }
    },

    async syncYouTubeFeedXml(
      xmlContent: string,
      sourceId?: string
    ): Promise<{ syncedCount: number; skippedCount: number }> {
      return withSyncLock(strapi, () =>
        syncYouTubeFeedXmlUnlocked(xmlContent, sourceId)
      );
    },

    async syncConfiguredYouTubeSources(sourceId?: string): Promise<{
      syncedCount: number;
      skippedCount: number;
      sourcesProcessed: number;
    }> {
      if (typeof globalThis.fetch !== "function") {
        return { syncedCount: 0, skippedCount: 0, sourcesProcessed: 0 };
      }

      return withSyncLock(strapi, async () => {
        const settings = await getSettingsService().getSettings();
        const targets = (
          Array.isArray(settings.youtubeSyncSources)
            ? settings.youtubeSyncSources
            : []
        ).filter(
          (s) =>
            isPlainObject(s) &&
            Boolean(s.enabled) &&
            (!sourceId || s.id === sourceId)
        );

        let totalSynced = 0;
        let totalSkipped = 0;
        let sourcesProcessed = 0;

        for (const src of targets) {
          const feedUrl = buildYouTubeAtomFeedUrl(src);
          if (!feedUrl) continue;
          try {
            const xml = await fetchBoundedText(
              feedUrl,
              MAX_YOUTUBE_ATOM_XML_LENGTH
            );
            if (!xml) continue;
            const { syncedCount, skippedCount } =
              await syncYouTubeFeedXmlUnlocked(xml, src.id);
            totalSynced += syncedCount;
            totalSkipped += skippedCount;
            sourcesProcessed += 1;
          } catch (err) {
            strapi.log.warn(
              `[${PLUGIN_ID}] Failed to sync YouTube source "${src.id}": ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
        }

        return {
          syncedCount: totalSynced,
          skippedCount: totalSkipped,
          sourcesProcessed,
        };
      });
    },
  };
};
