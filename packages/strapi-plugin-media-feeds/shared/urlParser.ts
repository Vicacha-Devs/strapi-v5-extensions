import type {
  MediaChapterMarker,
  MediaFeedItem,
  MediaLanguageTrack,
  MediaProviderType,
  ParsedMediaProviderInfo,
} from "./types";

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const VALID_PROVIDERS: MediaProviderType[] = [
  "youtube",
  "spotify",
  "apple_podcasts",
  "vimeo",
  "soundcloud",
  "direct",
  "upload",
];

export function extractYouTubeVideoId(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (YOUTUBE_ID_REGEX.test(trimmed)) return trimmed;

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube(?:-nocookie)?\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function tryParseKnownPlatformUrl(url: string): ParsedMediaProviderInfo | null {
  const ytId = extractYouTubeVideoId(url);
  if (ytId) {
    return {
      provider: "youtube",
      externalId: ytId,
      canonicalUrl: `https://www.youtube.com/watch?v=${ytId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
    };
  }

  const spotifyMatch = url.match(/open\.spotify\.com\/(episode|show|track)\/([a-zA-Z0-9]+)/);
  if (spotifyMatch?.[1] && spotifyMatch?.[2]) {
    const [, kind, id] = spotifyMatch;
    return {
      provider: "spotify",
      externalId: id,
      canonicalUrl: `https://open.spotify.com/${kind}/${id}`,
      embedUrl: `https://open.spotify.com/embed/${kind}/${id}`,
      thumbnailUrl: null,
    };
  }

  const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  if (vimeoMatch?.[1]) {
    const id = vimeoMatch[1];
    return {
      provider: "vimeo",
      externalId: id,
      canonicalUrl: `https://vimeo.com/${id}`,
      embedUrl: `https://player.vimeo.com/video/${id}`,
      thumbnailUrl: null,
    };
  }

  return null;
}

function tryParsePodcastPlatformUrl(url: string): ParsedMediaProviderInfo | null {
  if (/podcasts\.apple\.com\//i.test(url)) {
    const idMatch = url.match(/id(\d+)/);
    return {
      provider: "apple_podcasts",
      externalId: idMatch?.[1] ?? null,
      canonicalUrl: url,
      embedUrl: url.replace("podcasts.apple.com", "embed.podcasts.apple.com"),
      thumbnailUrl: null,
    };
  }

  if (/soundcloud\.com\//i.test(url)) {
    return {
      provider: "soundcloud",
      externalId: null,
      canonicalUrl: url,
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`,
      thumbnailUrl: null,
    };
  }

  return null;
}

export function parseMediaUrl(
  rawUrl?: string | null,
  explicitProvider?: MediaProviderType | string | null
): ParsedMediaProviderInfo {
  const url = typeof rawUrl === "string" ? rawUrl.trim() : "";

  const matchedPlatform = tryParseKnownPlatformUrl(url) ?? tryParsePodcastPlatformUrl(url);
  if (matchedPlatform) {
    return matchedPlatform;
  }

  const isExplicitValid =
    Boolean(explicitProvider) && VALID_PROVIDERS.includes(explicitProvider as MediaProviderType);
  const fallbackProvider: MediaProviderType = isExplicitValid
    ? (explicitProvider as MediaProviderType)
    : url.startsWith("/")
      ? "upload"
      : "direct";

  return {
    provider: fallbackProvider,
    externalId: null,
    canonicalUrl: url,
    embedUrl: null,
    thumbnailUrl: null,
  };
}

function tryParseColonDuration(text: string): number | null {
  const colonParts = text.split(":").map((p) => Number(p.trim()));
  const validParts =
    (colonParts.length === 2 || colonParts.length === 3) &&
    colonParts.every((n) => Number.isFinite(n) && n >= 0);
  if (!validParts) return null;

  if (colonParts.length === 3) {
    return colonParts[0] * 3600 + colonParts[1] * 60 + colonParts[2];
  }
  return colonParts[0] * 60 + colonParts[1];
}

function tryParseIso8601Duration(text: string): number | null {
  const isoMatch = text.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!isoMatch || !(isoMatch[1] || isoMatch[2] || isoMatch[3])) {
    return null;
  }
  const h = Number(isoMatch[1] ?? 0);
  const m = Number(isoMatch[2] ?? 0);
  const s = Number(isoMatch[3] ?? 0);
  return h * 3600 + m * 60 + s;
}

export function parseDurationToSeconds(raw?: string | number | null): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return Math.round(raw);
  }
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text) return null;

  const colonResult = tryParseColonDuration(text);
  if (colonResult !== null) return colonResult;

  const isoResult = tryParseIso8601Duration(text);
  if (isoResult !== null) return isoResult;

  const minMatch = text.match(/(\d+)\s*(?:min|mins|minutes|dk|دقيقة|دقائق)/i);
  return minMatch?.[1] ? Number(minMatch[1]) * 60 : null;
}

export function formatSecondsToDuration(seconds?: number | null): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  const total = Math.round(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

export function normalizeSpokenLanguages(raw: unknown, fallback: string[] = ["es"]): string[] {
  if (Array.isArray(raw)) {
    const cleaned = raw
      .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
      .filter(Boolean);
    if (cleaned.length > 0) return Array.from(new Set(cleaned));
  }
  if (typeof raw === "string" && raw.trim()) {
    const split = raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (split.length > 0) return Array.from(new Set(split));
  }
  return fallback;
}

function trimmedStringOrNull(val: unknown): string | null {
  return typeof val === "string" ? val.trim() : null;
}

function parseSingleLanguageTrack(entry: unknown): MediaLanguageTrack | null {
  if (!entry || typeof entry !== "object") return null;
  const obj = entry as Record<string, unknown>;
  const locale = (trimmedStringOrNull(obj.locale) ?? "").toLowerCase();
  if (!locale) return null;

  return {
    locale,
    label: trimmedStringOrNull(obj.label) ?? undefined,
    audioUrl: trimmedStringOrNull(obj.audioUrl),
    videoUrl: trimmedStringOrNull(obj.videoUrl),
    captionsUrl: trimmedStringOrNull(obj.captionsUrl),
    transcriptUrl: trimmedStringOrNull(obj.transcriptUrl),
    transcriptText: typeof obj.transcriptText === "string" ? obj.transcriptText : null,
    translatedTitle: trimmedStringOrNull(obj.translatedTitle),
    translatedDescription: trimmedStringOrNull(obj.translatedDescription),
  };
}

export function normalizeLanguageTracks(raw: unknown): MediaLanguageTrack[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseSingleLanguageTrack).filter((t): t is MediaLanguageTrack => t !== null);
}

function parseSingleChapterMarker(item: unknown): MediaChapterMarker | null {
  if (!item || typeof item !== "object") return null;
  const obj = item as Record<string, unknown>;
  const label = trimmedStringOrNull(obj.label) ?? "";
  if (!label) return null;

  const seconds =
    typeof obj.startSeconds === "number"
      ? obj.startSeconds
      : (parseDurationToSeconds(obj.timecode as string) ?? 0);
  const timecode =
    typeof obj.timecode === "string" ? obj.timecode : (formatSecondsToDuration(seconds) ?? "00:00");

  return {
    startSeconds: Math.max(0, seconds),
    timecode,
    label,
  };
}

export function normalizeChapterMarkers(raw: unknown): MediaChapterMarker[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(parseSingleChapterMarker)
    .filter((c): c is MediaChapterMarker => c !== null)
    .sort((a, b) => a.startSeconds - b.startSeconds);
}

function findMatchingTrack(
  tracks: MediaLanguageTrack[],
  targetLocale: string,
  defaultLocale: string
): MediaLanguageTrack | null {
  const baseLang = targetLocale.split("-")[0];
  const defaultLower = defaultLocale.toLowerCase();

  return (
    tracks.find((t) => t.locale.toLowerCase() === targetLocale) ??
    tracks.find((t) => t.locale.toLowerCase().split("-")[0] === baseLang) ??
    tracks.find((t) => t.locale.toLowerCase() === defaultLower) ??
    null
  );
}

export function resolveEpisodeForLocale(
  episode: MediaFeedItem,
  requestedLocale?: string,
  defaultLocale = "es"
): MediaFeedItem {
  const targetLocale = (requestedLocale || episode.locale || defaultLocale).trim().toLowerCase();
  const exactTrack = findMatchingTrack(episode.languageTracks, targetLocale, defaultLocale);

  if (!exactTrack) {
    return {
      ...episode,
      activeLanguageTrack: null,
    };
  }

  return {
    ...episode,
    title: exactTrack.translatedTitle || episode.title,
    description: exactTrack.translatedDescription || episode.description,
    transcript: episode.transcript || exactTrack.transcriptText || null,
    audioUrl: exactTrack.audioUrl || episode.audioUrl,
    transcriptUrl: exactTrack.transcriptUrl || episode.transcriptUrl,
    activeLanguageTrack: exactTrack,
  };
}
