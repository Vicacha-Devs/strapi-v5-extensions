import { isSafeUploadPath, MAX_MEDIA_URL_LENGTH } from "./episodeHelpers";
import type { MediaProviderType, ParsedMediaProviderInfo } from "./types";

export {
  formatSecondsToDuration,
  isSafeUploadPath,
  MAX_MEDIA_URL_LENGTH,
  normalizeChapterMarkers,
  normalizeLanguageTracks,
  normalizeSpokenLanguages,
  parseDurationToSeconds,
  resolveEpisodeForLocale,
  sanitizeOptionalMediaUrl,
} from "./episodeHelpers";

export const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const YOUTUBE_WATCH_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);
const YOUTUBE_NOCOOKIE_HOSTS = new Set([
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com"]);
const APPLE_PODCAST_HOSTS = new Set([
  "podcasts.apple.com",
  "embed.podcasts.apple.com",
]);
const SOUNDCLOUD_HOSTS = new Set([
  "soundcloud.com",
  "www.soundcloud.com",
  "m.soundcloud.com",
]);
const SPOTIFY_KINDS = new Set(["episode", "show", "track"]);
const SPOTIFY_ID_REGEX = /^[a-zA-Z0-9]{1,64}$/;
const VIMEO_ID_REGEX = /^\d{1,20}$/;

const VALID_PROVIDERS = new Set<MediaProviderType>([
  "youtube",
  "spotify",
  "apple_podcasts",
  "vimeo",
  "soundcloud",
  "direct",
  "upload",
]);

function resolveExplicitProvider(
  explicitProvider: MediaProviderType | string | null | undefined,
  fallback: MediaProviderType
): MediaProviderType {
  if (
    typeof explicitProvider === "string" &&
    VALID_PROVIDERS.has(explicitProvider as MediaProviderType)
  ) {
    return explicitProvider as MediaProviderType;
  }
  return fallback;
}

function extractYouTubeIdFromParsedUrl(parsed: URL): string | null {
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    const candidate = segments.length === 1 ? segments[0] : undefined;
    return candidate && YOUTUBE_ID_REGEX.test(candidate) ? candidate : null;
  }

  if (YOUTUBE_NOCOOKIE_HOSTS.has(host)) {
    const candidate =
      segments.length === 2 && segments[0] === "embed"
        ? segments[1]
        : undefined;
    return candidate && YOUTUBE_ID_REGEX.test(candidate) ? candidate : null;
  }

  if (YOUTUBE_WATCH_HOSTS.has(host)) {
    if (parsed.pathname === "/watch") {
      const v = parsed.searchParams.get("v");
      return v && YOUTUBE_ID_REGEX.test(v) ? v : null;
    }
    const [prefix, id] = segments;
    if (
      segments.length === 2 &&
      (prefix === "embed" || prefix === "live" || prefix === "shorts") &&
      id &&
      YOUTUBE_ID_REGEX.test(id)
    ) {
      return id;
    }
  }

  return null;
}

export function extractYouTubeVideoId(rawUrl: string): string | null {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > MAX_MEDIA_URL_LENGTH) return null;
  if (YOUTUBE_ID_REGEX.test(trimmed)) return trimmed;

  try {
    return extractYouTubeIdFromParsedUrl(new URL(trimmed));
  } catch {
    return null;
  }
}

function tryMatchVideoOrSpotifyPlatform(
  parsed: URL
): ParsedMediaProviderInfo | null {
  const ytId = extractYouTubeIdFromParsedUrl(parsed);
  if (ytId) {
    return {
      provider: "youtube",
      externalId: ytId,
      canonicalUrl: `https://www.youtube.com/watch?v=${ytId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
    };
  }

  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split("/").filter(Boolean);

  if (host === "open.spotify.com") {
    const offset = segments[0]?.startsWith("intl-") ? 1 : 0;
    const kind = segments[offset];
    const id = segments[offset + 1];
    if (kind && SPOTIFY_KINDS.has(kind) && id && SPOTIFY_ID_REGEX.test(id)) {
      return {
        provider: "spotify",
        externalId: id,
        canonicalUrl: `https://open.spotify.com/${kind}/${id}`,
        embedUrl: `https://open.spotify.com/embed/${kind}/${id}`,
        thumbnailUrl: null,
      };
    }
  }

  const vimeoId = VIMEO_HOSTS.has(host)
    ? segments[0]
    : host === "player.vimeo.com" && segments[0] === "video"
      ? segments[1]
      : undefined;
  if (vimeoId && VIMEO_ID_REGEX.test(vimeoId)) {
    return {
      provider: "vimeo",
      externalId: vimeoId,
      canonicalUrl: `https://vimeo.com/${vimeoId}`,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      thumbnailUrl: null,
    };
  }

  return null;
}

function tryMatchPodcastPlatform(parsed: URL): ParsedMediaProviderInfo | null {
  const host = parsed.hostname.toLowerCase();

  if (APPLE_PODCAST_HOSTS.has(host)) {
    const idMatch = parsed.pathname.match(/\/id(\d{1,20})(?:\/|$)/);
    const canonical = new URL(parsed.href);
    canonical.protocol = "https:";
    canonical.username = "";
    canonical.password = "";
    canonical.hostname = "podcasts.apple.com";

    const embed = new URL(canonical.href);
    embed.hostname = "embed.podcasts.apple.com";

    return {
      provider: "apple_podcasts",
      externalId: idMatch?.[1] ?? null,
      canonicalUrl: canonical.href,
      embedUrl: embed.href,
      thumbnailUrl: null,
    };
  }

  if (SOUNDCLOUD_HOSTS.has(host)) {
    const canonical = new URL(parsed.href);
    canonical.protocol = "https:";
    canonical.username = "";
    canonical.password = "";
    canonical.hostname = "soundcloud.com";

    return {
      provider: "soundcloud",
      externalId: null,
      canonicalUrl: canonical.href,
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(
        canonical.href
      )}`,
      thumbnailUrl: null,
    };
  }

  return null;
}

export function parseMediaUrl(
  rawUrl?: string | null,
  explicitProvider?: MediaProviderType | string | null
): ParsedMediaProviderInfo {
  const trimmed = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!trimmed || trimmed.length > MAX_MEDIA_URL_LENGTH) {
    return {
      provider: resolveExplicitProvider(explicitProvider, "direct"),
      externalId: null,
      canonicalUrl: "",
      embedUrl: null,
      thumbnailUrl: null,
    };
  }

  if (trimmed.startsWith("/")) {
    if (!isSafeUploadPath(trimmed)) {
      return {
        provider: "direct",
        externalId: null,
        canonicalUrl: "",
        embedUrl: null,
        thumbnailUrl: null,
      };
    }
    return {
      provider: resolveExplicitProvider(explicitProvider, "upload"),
      externalId: null,
      canonicalUrl: trimmed,
      embedUrl: null,
      thumbnailUrl: null,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      provider: "direct",
      externalId: null,
      canonicalUrl: "",
      embedUrl: null,
      thumbnailUrl: null,
    };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      provider: "direct",
      externalId: null,
      canonicalUrl: "",
      embedUrl: null,
      thumbnailUrl: null,
    };
  }

  const matched =
    tryMatchVideoOrSpotifyPlatform(parsed) ?? tryMatchPodcastPlatform(parsed);
  if (matched) {
    return matched;
  }

  parsed.username = "";
  parsed.password = "";
  const safeHref =
    parsed.pathname === "/" && !trimmed.endsWith("/") && !parsed.search
      ? parsed.origin + parsed.hash
      : parsed.href;

  return {
    provider: resolveExplicitProvider(explicitProvider, "direct"),
    externalId: null,
    canonicalUrl: safeHref,
    embedUrl: null,
    thumbnailUrl: null,
  };
}
