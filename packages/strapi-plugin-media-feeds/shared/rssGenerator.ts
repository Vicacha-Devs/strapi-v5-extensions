import type {
  MediaFeedItem,
  MediaLanguageTrack,
  PodcastFeedConfig,
} from './types';
import { formatSecondsToDuration, resolveEpisodeForLocale } from './urlParser';

export function escapeXml(value?: string | null): string {
  if (!value) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function toRfc2822Date(isoDate?: string | null): string {
  const parsed = isoDate ? new Date(isoDate) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return new Date('2026-01-01T00:00:00Z').toUTCString();
  }
  return parsed.toUTCString();
}

export interface GeneratePodcastRssOptions {
  feed: PodcastFeedConfig;
  locale?: string;
  defaultLocale?: string;
  seriesTitle?: string;
  seriesDescription?: string;
}

function toAbsoluteUrl(rawUrl: string, siteUrl: string): string {
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  return `${siteUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
}

function resolveEnclosureMimeType(
  audioMimeType: string | undefined,
  enclosureUrl: string
): string {
  if (audioMimeType) return audioMimeType;
  if (enclosureUrl.endsWith('.m4a')) return 'audio/x-m4a';
  if (enclosureUrl.endsWith('.mp4')) return 'video/mp4';
  return 'audio/mpeg';
}

function resolveTranscriptMimeType(absUrl: string): string {
  if (absUrl.endsWith('.vtt')) return 'text/vtt';
  if (absUrl.endsWith('.srt')) return 'application/x-subrip';
  return 'application/pdf';
}

function renderTranscriptLines(
  tracks: MediaLanguageTrack[],
  siteUrl: string
): string {
  return tracks
    .filter((t) => Boolean(t.transcriptUrl || t.captionsUrl))
    .map((t) => {
      const trUrl = t.transcriptUrl || t.captionsUrl || '';
      const absUrl = toAbsoluteUrl(trUrl, siteUrl);
      const trType = resolveTranscriptMimeType(absUrl);
      return `      <podcast:transcript url="${escapeXml(absUrl)}" type="${trType}" language="${escapeXml(t.locale)}" />`;
    })
    .join('\n');
}

function resolveItemUrl(
  item: MediaFeedItem,
  siteUrl: string,
  activeLocale: string
): string {
  if (item.sourceUrl && /^https?:\/\//i.test(item.sourceUrl)) {
    return item.sourceUrl;
  }
  return `${siteUrl}/${activeLocale}/media#${item.slug}`;
}

function renderItemImageTag(
  thumbnailUrl: string | null | undefined,
  siteUrl: string
): string {
  if (!thumbnailUrl) return '';
  return `\n      <itunes:image href="${escapeXml(
    toAbsoluteUrl(thumbnailUrl, siteUrl)
  )}" />`;
}

function renderPodcastItemXml(
  item: MediaFeedItem,
  feed: PodcastFeedConfig,
  siteUrl: string,
  activeLocale: string
): string {
  const itemUrl = resolveItemUrl(item, siteUrl, activeLocale);
  const enclosureUrl = item.audioUrl
    ? toAbsoluteUrl(item.audioUrl, siteUrl)
    : itemUrl;
  const mimeType = resolveEnclosureMimeType(item.audioMimeType, enclosureUrl);
  const byteLength = item.audioByteLength ?? 0;
  const durationFormatted =
    formatSecondsToDuration(item.durationSeconds) || item.duration || '00:30:00';
  const guid = `${item.documentId || item.slug}:${activeLocale}`;
  const transcriptLines = renderTranscriptLines(item.languageTracks, siteUrl);
  const imageTag = renderItemImageTag(item.thumbnailUrl, siteUrl);

  return [
    '    <item>',
    `      <title>${escapeXml(item.title)}</title>`,
    `      <link>${escapeXml(itemUrl)}</link>`,
    `      <guid isPermaLink="false">${escapeXml(guid)}</guid>`,
    `      <pubDate>${escapeXml(toRfc2822Date(item.publishedAt))}</pubDate>`,
    `      <description>${escapeXml(item.description)}</description>`,
    `      <itunes:summary>${escapeXml(item.description)}</itunes:summary>`,
    `      <itunes:author>${escapeXml(item.speaker || feed.author)}</itunes:author>`,
    `      <itunes:duration>${escapeXml(durationFormatted)}</itunes:duration>`,
    `      <itunes:explicit>${feed.explicit ? 'true' : 'false'}</itunes:explicit>`,
    `      <enclosure url="${escapeXml(enclosureUrl)}" length="${byteLength}" type="${escapeXml(mimeType)}" />${imageTag}`,
    transcriptLines,
    '    </item>',
  ]
    .filter(Boolean)
    .join('\n');
}

function renderOwnerXml(feed: PodcastFeedConfig): string {
  if (!feed.ownerName && !feed.ownerEmail) return '';
  return [
    '    <itunes:owner>',
    feed.ownerName
      ? `      <itunes:name>${escapeXml(feed.ownerName)}</itunes:name>`
      : '',
    feed.ownerEmail
      ? `      <itunes:email>${escapeXml(feed.ownerEmail)}</itunes:email>`
      : '',
    '    </itunes:owner>',
  ]
    .filter(Boolean)
    .join('\n');
}

export function generatePodcastRssXml(
  episodes: MediaFeedItem[],
  options: GeneratePodcastRssOptions
): string {
  const {
    feed,
    locale,
    defaultLocale = 'es',
    seriesTitle,
    seriesDescription,
  } = options;
  const activeLocale = (locale || defaultLocale).trim().toLowerCase();
  const channelTitle = seriesTitle
    ? `${feed.title} — ${seriesTitle}`
    : feed.title;
  const channelDescription = seriesDescription || feed.description;
  const siteUrl = feed.siteUrl.replace(/\/$/, '');
  const selfFeedUrl =
    feed.feedUrl ||
    `${siteUrl}/api/media-feeds/rss.xml?locale=${encodeURIComponent(activeLocale)}`;

  const itemXmlBlocks = episodes.map((ep) =>
    renderPodcastItemXml(
      resolveEpisodeForLocale(ep, activeLocale, defaultLocale),
      feed,
      siteUrl,
      activeLocale
    )
  );

  const channelImageXml = feed.imageUrl
    ? `    <itunes:image href="${escapeXml(feed.imageUrl)}" />`
    : '';
  const ownerXml = renderOwnerXml(feed);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://podcastindex.org/namespace/1.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(channelTitle)}</title>`,
    `    <link>${escapeXml(siteUrl)}</link>`,
    `    <atom:link href="${escapeXml(selfFeedUrl)}" rel="self" type="application/rss+xml" />`,
    `    <description>${escapeXml(channelDescription)}</description>`,
    `    <language>${escapeXml(activeLocale)}</language>`,
    `    <itunes:author>${escapeXml(feed.author)}</itunes:author>`,
    `    <itunes:explicit>${feed.explicit ? 'true' : 'false'}</itunes:explicit>`,
    `    <itunes:category text="${escapeXml(feed.category)}" />`,
    channelImageXml,
    ownerXml,
    ...itemXmlBlocks,
    '  </channel>',
    '</rss>',
  ]
    .filter(Boolean)
    .join('\n');
}
