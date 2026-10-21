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

export function parseYouTubeAtomFeedXml(
  xml: string,
  sourceConfig?: Partial<YouTubeSyncSourceConfig>
): ParsedYouTubeFeedVideo[] {
  if (!xml || typeof xml !== 'string') return [];

  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];
  const results: ParsedYouTubeFeedVideo[] = [];

  for (const entry of entries) {
    const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i);
    const videoId = idMatch?.[1]?.trim();
    if (!videoId) continue;

    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/i);
    const rawTitle = titleMatch?.[1]?.trim() ?? `Video ${videoId}`;
    const title = unescapeXmlEntities(rawTitle);

    const descMatch = entry.match(
      /<media:description>([\s\S]*?)<\/media:description>/i
    );
    const description = unescapeXmlEntities(descMatch?.[1]?.trim() ?? title);

    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/i);
    const publishedAt = publishedMatch?.[1]?.trim() ?? new Date().toISOString();

    const authorMatch = entry.match(
      /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i
    );
    const authorName = unescapeXmlEntities(
      authorMatch?.[1]?.trim() || sourceConfig?.defaultSpeaker || 'Official Channel'
    );

    const thumbMatch = entry.match(/<media:thumbnail[^>]+url="([^"]+)"/i);
    const thumbnailUrl =
      thumbMatch?.[1]?.trim() || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    results.push({
      videoId,
      title,
      slug: slugifyTitle(title, videoId),
      description,
      publishedAt,
      authorName,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      thumbnailUrl,
      type: sourceConfig?.defaultType || 'video',
      seriesSlug: sourceConfig?.defaultSeriesSlug || null,
      spokenLanguages: sourceConfig?.defaultSpokenLanguages ?? ['es'],
    });
  }

  return results;
}
