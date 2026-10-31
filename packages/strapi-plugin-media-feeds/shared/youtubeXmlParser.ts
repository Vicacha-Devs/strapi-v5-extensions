import type { MediaFeedType, YouTubeSyncSourceConfig } from './types';

export interface ParsedYouTubeFeedVideo {
  videoId: string;
  title: string;
  slug: string;
  description: string;
  publishedAt: string;
  authorName: string;
  watchUrl: string;
  embedUrl: string;
  thumbnailUrl: string;
  type: MediaFeedType;
  seriesSlug: string | null;
  spokenLanguages: string[];
}

function unescapeXmlEntities(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function slugifyTitle(title: string, videoId: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base ? `${base}-${videoId.toLowerCase()}` : `yt-${videoId.toLowerCase()}`;
}

export function buildYouTubeAtomFeedUrl(
  source: Pick<YouTubeSyncSourceConfig, 'channelId' | 'playlistId'>
): string | null {
  if (source.playlistId?.trim()) {
    return `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(
      source.playlistId.trim()
    )}`;
  }
  if (source.channelId?.trim()) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(
      source.channelId.trim()
    )}`;
  }
  return null;
}

function matchXmlTag(entry: string, regex: RegExp): string | null {
  const m = entry.match(regex);
  return m?.[1]?.trim() || null;
}

function resolveAtomDefaults(sourceConfig?: Partial<YouTubeSyncSourceConfig>) {
  return {
    defaultSpeaker: sourceConfig?.defaultSpeaker || 'Official Channel',
    type: (sourceConfig?.defaultType || 'video') as MediaFeedType,
    seriesSlug: sourceConfig?.defaultSeriesSlug || null,
    spokenLanguages: sourceConfig?.defaultSpokenLanguages ?? ['es'],
  };
}

function parseSingleYouTubeAtomEntry(
  entry: string,
  sourceConfig?: Partial<YouTubeSyncSourceConfig>
): ParsedYouTubeFeedVideo | null {
  const videoId = matchXmlTag(entry, /<yt:videoId>([^<]+)<\/yt:videoId>/i);
  if (!videoId) return null;

  const defaults = resolveAtomDefaults(sourceConfig);
  const rawTitle =
    matchXmlTag(entry, /<title>([\s\S]*?)<\/title>/i) ?? `Video ${videoId}`;
  const title = unescapeXmlEntities(rawTitle);
  const rawDesc =
    matchXmlTag(
      entry,
      /<media:description>([\s\S]*?)<\/media:description>/i
    ) ?? title;
  const publishedAt =
    matchXmlTag(entry, /<published>([^<]+)<\/published>/i) ??
    new Date().toISOString();
  const rawAuthor =
    matchXmlTag(
      entry,
      /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i
    ) ?? defaults.defaultSpeaker;
  const thumbnailUrl =
    matchXmlTag(entry, /<media:thumbnail[^>]+url="([^"]+)"/i) ??
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    videoId,
    title,
    slug: slugifyTitle(title, videoId),
    description: unescapeXmlEntities(rawDesc),
    publishedAt,
    authorName: unescapeXmlEntities(rawAuthor),
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    thumbnailUrl,
    type: defaults.type,
    seriesSlug: defaults.seriesSlug,
    spokenLanguages: defaults.spokenLanguages,
  };
}

export function parseYouTubeAtomFeedXml(
  xml: string,
  sourceConfig?: Partial<YouTubeSyncSourceConfig>
): ParsedYouTubeFeedVideo[] {
  if (!xml || typeof xml !== 'string') return [];

  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];
  return entries
    .map((entry) => parseSingleYouTubeAtomEntry(entry, sourceConfig))
    .filter((v): v is ParsedYouTubeFeedVideo => v !== null);
}
