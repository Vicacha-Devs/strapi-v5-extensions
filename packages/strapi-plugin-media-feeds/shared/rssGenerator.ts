import type { MediaFeedItem, PodcastFeedConfig } from './types';
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

export function generatePodcastRssXml(
  episodes: MediaFeedItem[],
  options: GeneratePodcastRssOptions
): string {
  const { feed, locale, defaultLocale = 'es', seriesTitle, seriesDescription } = options;
  const activeLocale = (locale || defaultLocale).trim().toLowerCase();
  const channelTitle = seriesTitle
    ? `${feed.title} — ${seriesTitle}`
    : feed.title;
  const channelDescription = seriesDescription || feed.description;
  const siteUrl = feed.siteUrl.replace(/\/$/, '');
  const selfFeedUrl =
    feed.feedUrl || `${siteUrl}/api/media-feeds/rss.xml?locale=${encodeURIComponent(activeLocale)}`;

  const resolvedItems = episodes.map((ep) =>
    resolveEpisodeForLocale(ep, activeLocale, defaultLocale)
  );

  const itemXmlBlocks = resolvedItems.map((item) => {
    const itemUrl =
      item.sourceUrl && /^https?:\/\//i.test(item.sourceUrl)
        ? item.sourceUrl
        : `${siteUrl}/${activeLocale}/media#${item.slug}`;
    const enclosureUrl =
      item.audioUrl && /^https?:\/\//i.test(item.audioUrl)
        ? item.audioUrl
        : item.audioUrl
          ? `${siteUrl}${item.audioUrl.startsWith('/') ? '' : '/'}${item.audioUrl}`
          : itemUrl;
    const mimeType =
      item.audioMimeType ||
      (enclosureUrl.endsWith('.m4a')
        ? 'audio/x-m4a'
        : enclosureUrl.endsWith('.mp4')
          ? 'video/mp4'
          : 'audio/mpeg');
    const byteLength = item.audioByteLength ?? 0;
    const durationFormatted =
      formatSecondsToDuration(item.durationSeconds) || item.duration || '00:30:00';
    const guid = `${item.documentId || item.slug}:${activeLocale}`;

    const transcriptLines = item.languageTracks
      .filter((t) => Boolean(t.transcriptUrl || t.captionsUrl))
      .map((t) => {
        const trUrl = t.transcriptUrl || t.captionsUrl || '';
        const absUrl = /^https?:\/\//i.test(trUrl)
          ? trUrl
          : `${siteUrl}${trUrl.startsWith('/') ? '' : '/'}${trUrl}`;
        const trType = absUrl.endsWith('.vtt')
          ? 'text/vtt'
          : absUrl.endsWith('.srt')
            ? 'application/x-subrip'
            : 'application/pdf';
        return `      <podcast:transcript url="${escapeXml(absUrl)}" type="${trType}" language="${escapeXml(t.locale)}" />`;
      })
      .join('\n');

    const imageTag = item.thumbnailUrl
      ? `\n      <itunes:image href="${escapeXml(
          /^https?:\/\//i.test(item.thumbnailUrl)
            ? item.thumbnailUrl
            : `${siteUrl}${item.thumbnailUrl}`
        )}" />`
      : '';

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
  });

  const channelImageXml = feed.imageUrl
    ? `    <itunes:image href="${escapeXml(feed.imageUrl)}" />`
    : '';
  const ownerXml =
    feed.ownerName || feed.ownerEmail
      ? [
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
          .join('\n')
      : '';

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
