import { DEFAULT_MEDIA_FEEDS_SETTINGS } from "./constants";
import type {
  MediaFeedItem,
  MediaLanguageTrack,
  PodcastFeedConfig,
} from "./types";
import {
  formatSecondsToDuration,
  isSafeUploadPath,
  MAX_MEDIA_URL_LENGTH,
  resolveEpisodeForLocale,
} from "./urlParser";

const INVALID_XML_10_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function stripInvalidXmlChars(value?: string | null): string {
  if (!value) return "";
  return String(value).replace(INVALID_XML_10_CHARS, "");
}

export function escapeXml(value?: string | null): string {
  const cleaned = stripInvalidXmlChars(value);
  if (!cleaned) return "";
  return cleaned
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function wrapCdata(value?: string | null): string {
  const cleaned = stripInvalidXmlChars(value).replace(
    /]]>/g,
    "]]]]><![CDATA[>"
  );
  return `<![CDATA[${cleaned}]]>`;
}

export function toRfc2822Date(isoDate?: string | null): string {
  if (typeof isoDate === "string" && isoDate.trim()) {
    const parsed = new Date(isoDate.trim());
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toUTCString();
    }
    return new Date(0).toUTCString();
  }
  return new Date().toUTCString();
}

export interface GeneratePodcastRssOptions {
  feed: PodcastFeedConfig;
  locale?: string;
  defaultLocale?: string;
  seriesTitle?: string;
  seriesDescription?: string;
}

function trimTrailingSlashes(value: string): string {
  let out = value;
  while (out.endsWith("/")) {
    out = out.slice(0, -1);
  }
  return out;
}

function sanitizeSiteUrl(rawSiteUrl?: string | null): string {
  const fallback = trimTrailingSlashes(
    DEFAULT_MEDIA_FEEDS_SETTINGS.podcastFeed.siteUrl
  );
  if (typeof rawSiteUrl !== "string") return fallback;
  const trimmed = rawSiteUrl.trim();
  if (!trimmed || trimmed.length > MAX_MEDIA_URL_LENGTH) return fallback;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return fallback;
    }
    parsed.username = "";
    parsed.password = "";
    const cleanPath =
      parsed.pathname === "/" ? "" : trimTrailingSlashes(parsed.pathname);
    return `${parsed.origin}${cleanPath}`;
  } catch {
    return fallback;
  }
}

function toSafeAbsoluteHttpUrl(
  rawUrl: string | null | undefined,
  siteUrl: string
): string | null {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > MAX_MEDIA_URL_LENGTH) return null;

  if (trimmed.startsWith("//")) return null;

  if (trimmed.startsWith("/")) {
    if (!isSafeUploadPath(trimmed)) return null;
    try {
      return new URL(trimmed, `${siteUrl}/`).href;
    } catch {
      return null;
    }
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return null;
      }
      parsed.username = "";
      parsed.password = "";
      return parsed.href;
    } catch {
      return null;
    }
  }

  const relCandidate = `/${trimmed}`;
  if (!isSafeUploadPath(relCandidate)) return null;
  try {
    return new URL(relCandidate, `${siteUrl}/`).href;
  } catch {
    return null;
  }
}

function extractLowerPathname(absUrl: string): string {
  try {
    return new URL(absUrl).pathname.toLowerCase();
  } catch {
    return absUrl.split(/[?#]/)[0]?.toLowerCase() ?? "";
  }
}

function resolveEnclosureMimeType(
  audioMimeType: string | undefined,
  enclosureUrl: string
): string {
  if (
    typeof audioMimeType === "string" &&
    /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(audioMimeType.trim())
  ) {
    return audioMimeType.trim();
  }
  const pathname = extractLowerPathname(enclosureUrl);
  if (pathname.endsWith(".m4a")) return "audio/x-m4a";
  if (pathname.endsWith(".mp4")) return "video/mp4";
  return "audio/mpeg";
}

function resolveTranscriptMimeType(absUrl: string): string {
  const pathname = extractLowerPathname(absUrl);
  if (pathname.endsWith(".vtt")) return "text/vtt";
  if (pathname.endsWith(".srt")) return "application/x-subrip";
  return "application/pdf";
}

function sanitizeAudioByteLength(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.trunc(value);
}

function renderTranscriptLines(
  tracks: MediaLanguageTrack[],
  siteUrl: string
): string {
  return tracks
    .map((t) => {
      const trUrl = t.transcriptUrl || t.captionsUrl || "";
      const absUrl = toSafeAbsoluteHttpUrl(trUrl, siteUrl);
      if (!absUrl) return "";
      const trType = resolveTranscriptMimeType(absUrl);
      return `      <podcast:transcript url="${escapeXml(absUrl)}" type="${trType}" language="${escapeXml(t.locale)}" />`;
    })
    .filter(Boolean)
    .join("\n");
}

function resolveItemUrl(
  item: MediaFeedItem,
  siteUrl: string,
  activeLocale: string
): string {
  if (item.sourceUrl && /^https?:\/\//i.test(item.sourceUrl.trim())) {
    const safeSource = toSafeAbsoluteHttpUrl(item.sourceUrl, siteUrl);
    if (safeSource) return safeSource;
  }
  const encodedLocale = encodeURIComponent(activeLocale);
  const encodedSlug = encodeURIComponent(item.slug || "episode");
  return `${siteUrl}/${encodedLocale}/media#${encodedSlug}`;
}

function renderItemImageTag(
  thumbnailUrl: string | null | undefined,
  siteUrl: string
): string {
  const safeImg = toSafeAbsoluteHttpUrl(thumbnailUrl, siteUrl);
  if (!safeImg) return "";
  return `\n      <itunes:image href="${escapeXml(safeImg)}" />`;
}

function renderPodcastItemXml(
  item: MediaFeedItem,
  feed: PodcastFeedConfig,
  siteUrl: string,
  activeLocale: string
): string {
  const itemUrl = resolveItemUrl(item, siteUrl, activeLocale);
  const enclosureUrl = toSafeAbsoluteHttpUrl(item.audioUrl, siteUrl) ?? itemUrl;
  const mimeType = resolveEnclosureMimeType(item.audioMimeType, enclosureUrl);
  const byteLength = sanitizeAudioByteLength(item.audioByteLength);
  const durationFormatted =
    formatSecondsToDuration(item.durationSeconds) ||
    item.duration ||
    "00:30:00";
  const guid = `${item.documentId || item.slug}:${activeLocale}`;
  const transcriptLines = renderTranscriptLines(item.languageTracks, siteUrl);
  const imageTag = renderItemImageTag(item.thumbnailUrl, siteUrl);

  return [
    "    <item>",
    `      <title>${escapeXml(item.title)}</title>`,
    `      <link>${escapeXml(itemUrl)}</link>`,
    `      <guid isPermaLink="false">${escapeXml(guid)}</guid>`,
    `      <pubDate>${escapeXml(toRfc2822Date(item.publishedAt))}</pubDate>`,
    `      <description>${escapeXml(item.description)}</description>`,
    `      <itunes:summary>${escapeXml(item.description)}</itunes:summary>`,
    `      <itunes:author>${escapeXml(item.speaker || feed.author)}</itunes:author>`,
    `      <itunes:duration>${escapeXml(durationFormatted)}</itunes:duration>`,
    `      <itunes:explicit>${feed.explicit ? "true" : "false"}</itunes:explicit>`,
    `      <enclosure url="${escapeXml(enclosureUrl)}" length="${byteLength}" type="${escapeXml(mimeType)}" />${imageTag}`,
    transcriptLines,
    "    </item>",
  ]
    .filter(Boolean)
    .join("\n");
}

function renderOwnerXml(feed: PodcastFeedConfig): string {
  if (!feed.ownerName && !feed.ownerEmail) return "";
  return [
    "    <itunes:owner>",
    feed.ownerName
      ? `      <itunes:name>${escapeXml(feed.ownerName)}</itunes:name>`
      : "",
    feed.ownerEmail
      ? `      <itunes:email>${escapeXml(feed.ownerEmail)}</itunes:email>`
      : "",
    "    </itunes:owner>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function generatePodcastRssXml(
  episodes: MediaFeedItem[],
  options: GeneratePodcastRssOptions
): string {
  const {
    feed,
    locale,
    defaultLocale = "es",
    seriesTitle,
    seriesDescription,
  } = options;
  const activeLocale = (locale || defaultLocale || "es").trim().toLowerCase();
  const channelTitle = seriesTitle
    ? `${feed.title} — ${seriesTitle}`
    : feed.title;
  const channelDescription = seriesDescription || feed.description;
  const siteUrl = sanitizeSiteUrl(feed.siteUrl);
  const selfFeedUrl =
    toSafeAbsoluteHttpUrl(feed.feedUrl, siteUrl) ||
    `${siteUrl}/api/media-feeds/rss.xml?locale=${encodeURIComponent(activeLocale)}`;

  const itemXmlBlocks = episodes.map((ep) =>
    renderPodcastItemXml(
      resolveEpisodeForLocale(ep, activeLocale, defaultLocale),
      feed,
      siteUrl,
      activeLocale
    )
  );

  const safeChannelImage = toSafeAbsoluteHttpUrl(feed.imageUrl, siteUrl);
  const channelImageXml = safeChannelImage
    ? `    <itunes:image href="${escapeXml(safeChannelImage)}" />`
    : "";
  const ownerXml = renderOwnerXml(feed);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://podcastindex.org/namespace/1.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(channelTitle)}</title>`,
    `    <link>${escapeXml(siteUrl)}</link>`,
    `    <atom:link href="${escapeXml(selfFeedUrl)}" rel="self" type="application/rss+xml" />`,
    `    <description>${escapeXml(channelDescription)}</description>`,
    `    <language>${escapeXml(activeLocale)}</language>`,
    `    <itunes:author>${escapeXml(feed.author)}</itunes:author>`,
    `    <itunes:explicit>${feed.explicit ? "true" : "false"}</itunes:explicit>`,
    `    <itunes:category text="${escapeXml(feed.category)}" />`,
    channelImageXml,
    ownerXml,
    ...itemXmlBlocks,
    "  </channel>",
    "</rss>",
  ]
    .filter(Boolean)
    .join("\n");
}
