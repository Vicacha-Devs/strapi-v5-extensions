import type {
  MediaChapterMarker,
  MediaFeedItem,
  MediaLanguageTrack,
  MediaProviderType,
  ParsedMediaProviderInfo,
} from './types';

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

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

export function parseMediaUrl(
  rawUrl?: string | null,
  explicitProvider?: MediaProviderType | string | null
): ParsedMediaProviderInfo {
  const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';

  const ytId = extractYouTubeVideoId(url);
  if (ytId) {
    return {
      provider: 'youtube',
      externalId: ytId,
      canonicalUrl: `https://www.youtube.com/watch?v=${ytId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
    };
  }

  const spotifyMatch = url.match(
    /open\.spotify\.com\/(episode|show|track)\/([a-zA-Z0-9]+)/
  );
  if (spotifyMatch?.[1] && spotifyMatch?.[2]) {
    const kind = spotifyMatch[1];
    const id = spotifyMatch[2];
    return {
      provider: 'spotify',
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
      provider: 'vimeo',
      externalId: id,
      canonicalUrl: `https://vimeo.com/${id}`,
      embedUrl: `https://player.vimeo.com/video/${id}`,
      thumbnailUrl: null,
    };
  }

  if (/podcasts\.apple\.com\//i.test(url)) {
    const idMatch = url.match(/id(\d+)/);
    return {
      provider: 'apple_podcasts',
      externalId: idMatch?.[1] ?? null,
      canonicalUrl: url,
      embedUrl: url.replace('podcasts.apple.com', 'embed.podcasts.apple.com'),
      thumbnailUrl: null,
    };
  }

  if (/soundcloud\.com\//i.test(url)) {
    return {
      provider: 'soundcloud',
      externalId: null,
      canonicalUrl: url,
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`,
      thumbnailUrl: null,
    };
  }

  const validProviders: MediaProviderType[] = [
    'youtube',
    'spotify',
    'apple_podcasts',
    'vimeo',
    'soundcloud',
    'direct',
    'upload',
  ];
  const fallbackProvider: MediaProviderType =
    explicitProvider && validProviders.includes(explicitProvider as MediaProviderType)
      ? (explicitProvider as MediaProviderType)
      : url.startsWith('/')
        ? 'upload'
        : 'direct';

  return {
    provider: fallbackProvider,
    externalId: null,
    canonicalUrl: url,
    embedUrl: null,
    thumbnailUrl: null,
  };
}

export function parseDurationToSeconds(raw?: string | number | null): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return Math.round(raw);
  }
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!text) return null;

  // HH:MM:SS or MM:SS
  const colonParts = text.split(':').map((p) => Number(p.trim()));
  if (
    colonParts.length >= 2 &&
    colonParts.length <= 3 &&
    colonParts.every((n) => Number.isFinite(n) && n >= 0)
  ) {
    if (colonParts.length === 3) {
      return colonParts[0] * 3600 + colonParts[1] * 60 + colonParts[2];
    }
    return colonParts[0] * 60 + colonParts[1];
  }

  // ISO-8601 duration e.g. PT1H28M40S
  const isoMatch = text.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (isoMatch && (isoMatch[1] || isoMatch[2] || isoMatch[3])) {
    const h = Number(isoMatch[1] ?? 0);
    const m = Number(isoMatch[2] ?? 0);
    const s = Number(isoMatch[3] ?? 0);
    return h * 3600 + m * 60 + s;
  }

  // Human labels e.g. "32 min", "28 دقائق", "24 dk"
  const minMatch = text.match(/(\d+)\s*(?:min|mins|minutes|dk|دقيقة|دقائق)/i);
  if (minMatch?.[1]) {
    return Number(minMatch[1]) * 60;
  }

  return null;
}

export function formatSecondsToDuration(seconds?: number | null): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  const total = Math.round(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

export function normalizeSpokenLanguages(
  raw: unknown,
  fallback: string[] = ['es']
): string[] {
  if (Array.isArray(raw)) {
    const cleaned = raw
      .map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : ''))
      .filter(Boolean);
    if (cleaned.length > 0) return Array.from(new Set(cleaned));
  }
  if (typeof raw === 'string' && raw.trim()) {
    const split = raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (split.length > 0) return Array.from(new Set(split));
  }
  return fallback;
}

export function normalizeLanguageTracks(raw: unknown): MediaLanguageTrack[] {
  if (!Array.isArray(raw)) return [];
  const tracks: MediaLanguageTrack[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    const locale =
      typeof obj.locale === 'string' ? obj.locale.trim().toLowerCase() : '';
    if (!locale) continue;
    tracks.push({
      locale,
      label: typeof obj.label === 'string' ? obj.label.trim() : undefined,
      audioUrl: typeof obj.audioUrl === 'string' ? obj.audioUrl.trim() : null,
      videoUrl: typeof obj.videoUrl === 'string' ? obj.videoUrl.trim() : null,
      captionsUrl:
        typeof obj.captionsUrl === 'string' ? obj.captionsUrl.trim() : null,
      transcriptUrl:
        typeof obj.transcriptUrl === 'string' ? obj.transcriptUrl.trim() : null,
      transcriptText:
        typeof obj.transcriptText === 'string' ? obj.transcriptText : null,
      translatedTitle:
        typeof obj.translatedTitle === 'string' ? obj.translatedTitle.trim() : null,
      translatedDescription:
        typeof obj.translatedDescription === 'string'
          ? obj.translatedDescription.trim()
          : null,
    });
  }
  return tracks;
}

export function normalizeChapterMarkers(raw: unknown): MediaChapterMarker[] {
  if (!Array.isArray(raw)) return [];
  const chapters: MediaChapterMarker[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const label = typeof obj.label === 'string' ? obj.label.trim() : '';
    if (!label) continue;
    const seconds =
      typeof obj.startSeconds === 'number'
        ? obj.startSeconds
        : parseDurationToSeconds(obj.timecode as string) ?? 0;
    chapters.push({
      startSeconds: Math.max(0, seconds),
      timecode:
        typeof obj.timecode === 'string'
          ? obj.timecode
          : formatSecondsToDuration(seconds) ?? '00:00',
      label,
    });
  }
  return chapters.sort((a, b) => a.startSeconds - b.startSeconds);
}

export function resolveEpisodeForLocale(
  episode: MediaFeedItem,
  requestedLocale?: string,
  defaultLocale = 'es'
): MediaFeedItem {
  const targetLocale = (requestedLocale || episode.locale || defaultLocale)
    .trim()
    .toLowerCase();
  const baseLang = targetLocale.split('-')[0];

  const exactTrack =
    episode.languageTracks.find((t) => t.locale.toLowerCase() === targetLocale) ??
    episode.languageTracks.find(
      (t) => t.locale.toLowerCase().split('-')[0] === baseLang
    ) ??
    episode.languageTracks.find(
      (t) => t.locale.toLowerCase() === defaultLocale.toLowerCase()
    ) ??
    null;

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
    audioUrl: exactTrack.audioUrl || episode.audioUrl,
    transcriptUrl: exactTrack.transcriptUrl || episode.transcriptUrl,
    activeLanguageTrack: exactTrack,
  };
}
