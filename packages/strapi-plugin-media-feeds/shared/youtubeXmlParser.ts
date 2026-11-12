import type { MediaFeedType, YouTubeSyncSourceConfig } from "./types";
import { YOUTUBE_ID_REGEX } from "./urlParser";

export const MAX_YOUTUBE_ATOM_XML_LENGTH = 2 * 1024 * 1024;
const MAX_ATOM_ENTRIES = 200;
const YOUTUBE_CHANNEL_ID_REGEX = /^(?:UC)?[a-zA-Z0-9_-]{10,64}$/;
const YOUTUBE_PLAYLIST_ID_REGEX = /^[a-zA-Z0-9_-]{10,64}$/;

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
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function slugifyTitle(title: string, videoId: string): string {
  let base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "");
  while (base.endsWith("-")) {
    base = base.slice(0, -1);
  }
  base = base.slice(0, 60);
  return base ? `${base}-${videoId}` : `yt-${videoId}`;
}

export function buildYouTubeAtomFeedUrl(
  source: Pick<YouTubeSyncSourceConfig, "channelId" | "playlistId">
): string | null {
  const playlistId =
    typeof source?.playlistId === "string" ? source.playlistId.trim() : "";
  if (playlistId) {
    if (!YOUTUBE_PLAYLIST_ID_REGEX.test(playlistId)) return null;
    return `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(
      playlistId
    )}`;
  }

  const channelId =
    typeof source?.channelId === "string" ? source.channelId.trim() : "";
  if (channelId) {
    if (!YOUTUBE_CHANNEL_ID_REGEX.test(channelId)) return null;
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(
      channelId
    )}`;
  }

  return null;
}

function extractXmlTagContent(source: string, tagName: string): string | null {
  const lower = source.toLowerCase();
  const openToken = `<${tagName.toLowerCase()}`;
  const closeToken = `</${tagName.toLowerCase()}>`;

  let searchFrom = 0;
  while (searchFrom < lower.length) {
    const startIdx = lower.indexOf(openToken, searchFrom);
    if (startIdx === -1) return null;

    const afterNameChar = lower[startIdx + openToken.length];
    if (
      afterNameChar !== ">" &&
      afterNameChar !== "/" &&
      afterNameChar !== " " &&
      afterNameChar !== "\t" &&
      afterNameChar !== "\r" &&
      afterNameChar !== "\n"
    ) {
      searchFrom = startIdx + openToken.length;
      continue;
    }

    const openEndIdx = lower.indexOf(">", startIdx + openToken.length);
    if (openEndIdx === -1) return null;
    if (lower[openEndIdx - 1] === "/") return null;

    const closeIdx = lower.indexOf(closeToken, openEndIdx + 1);
    if (closeIdx === -1) return null;

    let content = source.slice(openEndIdx + 1, closeIdx).trim();
    if (content.startsWith("<![CDATA[") && content.endsWith("]]>")) {
      content = content.slice(9, -3).trim();
    }
    return content || null;
  }
  return null;
}

function extractXmlBlocks(
  xml: string,
  tagName: string,
  maxBlocks: number
): string[] {
  const lower = xml.toLowerCase();
  const openToken = `<${tagName.toLowerCase()}`;
  const closeToken = `</${tagName.toLowerCase()}>`;
  const blocks: string[] = [];

  let cursor = 0;
  while (cursor < lower.length && blocks.length < maxBlocks) {
    const startIdx = lower.indexOf(openToken, cursor);
    if (startIdx === -1) break;

    const nextChar = lower[startIdx + openToken.length];
    if (
      nextChar !== ">" &&
      nextChar !== " " &&
      nextChar !== "\t" &&
      nextChar !== "\r" &&
      nextChar !== "\n"
    ) {
      cursor = startIdx + openToken.length;
      continue;
    }

    const closeIdx = lower.indexOf(closeToken, startIdx + openToken.length);
    if (closeIdx === -1) break;

    const blockEnd = closeIdx + closeToken.length;
    blocks.push(xml.slice(startIdx, blockEnd));
    cursor = blockEnd;
  }

  return blocks;
}

function sanitizeHttpsThumbnailUrl(
  rawUrl: string | null,
  videoId: string
): string {
  const fallback = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  if (!rawUrl || rawUrl.length > 2048) return fallback;
  try {
    const parsed = new URL(unescapeXmlEntities(rawUrl.trim()));
    if (parsed.protocol === "https:") {
      parsed.username = "";
      parsed.password = "";
      return parsed.href;
    }
  } catch {
    // Fall back to canonical ytimg HTTPS thumbnail
  }
  return fallback;
}

function extractMediaThumbnailAttr(entry: string): string | null {
  const lower = entry.toLowerCase();
  const tagIdx = lower.indexOf("<media:thumbnail");
  if (tagIdx === -1) return null;
  const endIdx = lower.indexOf(">", tagIdx);
  if (endIdx === -1) return null;

  const tagSlice = entry.slice(tagIdx, endIdx + 1);
  const urlMatch = tagSlice.match(/\burl\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
  return (urlMatch?.[1] ?? urlMatch?.[2] ?? "").trim() || null;
}

function resolveAtomDefaults(sourceConfig?: Partial<YouTubeSyncSourceConfig>) {
  return {
    defaultSpeaker: sourceConfig?.defaultSpeaker || "Official Channel",
    type: (sourceConfig?.defaultType || "video") as MediaFeedType,
    seriesSlug: sourceConfig?.defaultSeriesSlug || null,
    spokenLanguages: sourceConfig?.defaultSpokenLanguages ?? ["es"],
  };
}

function parseSingleYouTubeAtomEntry(
  entry: string,
  sourceConfig?: Partial<YouTubeSyncSourceConfig>
): ParsedYouTubeFeedVideo | null {
  const videoId = extractXmlTagContent(entry, "yt:videoId");
  if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
    return null;
  }

  const defaults = resolveAtomDefaults(sourceConfig);
  const rawTitle = extractXmlTagContent(entry, "title") ?? `Video ${videoId}`;
  const title = unescapeXmlEntities(rawTitle);
  const rawDesc = extractXmlTagContent(entry, "media:description") ?? rawTitle;

  const rawPublished = extractXmlTagContent(entry, "published");
  const publishedAt =
    rawPublished && !Number.isNaN(Date.parse(rawPublished))
      ? rawPublished
      : new Date().toISOString();

  const authorBlock = extractXmlTagContent(entry, "author");
  const rawAuthor =
    (authorBlock ? extractXmlTagContent(authorBlock, "name") : null) ??
    defaults.defaultSpeaker;

  const thumbnailUrl = sanitizeHttpsThumbnailUrl(
    extractMediaThumbnailAttr(entry),
    videoId
  );

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
  if (
    !xml ||
    typeof xml !== "string" ||
    xml.length > MAX_YOUTUBE_ATOM_XML_LENGTH
  ) {
    return [];
  }

  const entries = extractXmlBlocks(xml, "entry", MAX_ATOM_ENTRIES);
  return entries
    .map((entry) => parseSingleYouTubeAtomEntry(entry, sourceConfig))
    .filter((v): v is ParsedYouTubeFeedVideo => v !== null);
}
