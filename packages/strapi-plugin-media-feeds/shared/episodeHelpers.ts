import type {
  MediaChapterMarker,
  MediaFeedItem,
  MediaLanguageTrack,
} from "./types";

export const MAX_MEDIA_URL_LENGTH = 2048;

export function isSafeUploadPath(value: string): boolean {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.length > MAX_MEDIA_URL_LENGTH ||
    value.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(value)
  ) {
    return false;
  }

  const rawPath = value.split(/[?#]/)[0] ?? "";
  if (rawPath.split("/").includes("..")) return false;

  try {
    const decoded = decodeURIComponent(rawPath);
    if (decoded.includes("\\") || decoded.split("/").includes("..")) {
      return false;
    }
  } catch {
    return false;
  }
  return true;
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
  const isoMatch = text.match(
    /^PT(?:(\d{1,5})H)?(?:(\d{1,5})M)?(?:(\d{1,5})S)?$/i
  );
  if (!isoMatch || !(isoMatch[1] || isoMatch[2] || isoMatch[3])) {
    return null;
  }
  const h = Number(isoMatch[1] ?? 0);
  const m = Number(isoMatch[2] ?? 0);
  const s = Number(isoMatch[3] ?? 0);
  return h * 3600 + m * 60 + s;
}

export function parseDurationToSeconds(
  raw?: string | number | null
): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return Math.round(raw);
  }
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text || text.length > 64) return null;

  const colonResult = tryParseColonDuration(text);
  if (colonResult !== null) return colonResult;

  const isoResult = tryParseIso8601Duration(text);
  if (isoResult !== null) return isoResult;

  const minMatch = text.match(
    /^(\d{1,6})\s*(?:min|mins|minutes|dk|دقيقة|دقائق)/i
  );
  return minMatch?.[1] ? Number(minMatch[1]) * 60 : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatSecondsToDuration(
  seconds?: number | null
): string | null {
  if (
    typeof seconds !== "number" ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return null;
  }
  const total = Math.round(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hrs > 0
    ? `${hrs}:${pad(mins)}:${pad(secs)}`
    : `${pad(mins)}:${pad(secs)}`;
}

export function normalizeSpokenLanguages(
  raw: unknown,
  fallback: string[] = ["es"]
): string[] {
  if (Array.isArray(raw)) {
    const cleaned = raw
      .map((item) =>
        typeof item === "string" ? item.trim().toLowerCase() : ""
      )
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

export function sanitizeOptionalMediaUrl(val: unknown): string | null {
  const raw = trimmedStringOrNull(val);
  if (!raw || raw.length > MAX_MEDIA_URL_LENGTH) return null;
  if (raw.startsWith("/")) {
    return isSafeUploadPath(raw) ? raw : null;
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    parsed.username = "";
    parsed.password = "";
    return parsed.pathname === "/" && !raw.endsWith("/") && !parsed.search
      ? `${parsed.origin}${parsed.hash}`
      : parsed.href;
  } catch {
    return null;
  }
}

function parseSingleLanguageTrack(entry: unknown): MediaLanguageTrack | null {
  if (!entry || typeof entry !== "object") return null;
  const obj = entry as Record<string, unknown>;
  const locale = (trimmedStringOrNull(obj.locale) ?? "").toLowerCase();
  if (!locale) return null;

  return {
    locale,
    label: trimmedStringOrNull(obj.label) ?? undefined,
    audioUrl: sanitizeOptionalMediaUrl(obj.audioUrl),
    videoUrl: sanitizeOptionalMediaUrl(obj.videoUrl),
    captionsUrl: sanitizeOptionalMediaUrl(obj.captionsUrl),
    transcriptUrl: sanitizeOptionalMediaUrl(obj.transcriptUrl),
    transcriptText:
      typeof obj.transcriptText === "string" ? obj.transcriptText : null,
    translatedTitle: trimmedStringOrNull(obj.translatedTitle),
    translatedDescription: trimmedStringOrNull(obj.translatedDescription),
  };
}

export function normalizeLanguageTracks(raw: unknown): MediaLanguageTrack[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(parseSingleLanguageTrack)
    .filter((t): t is MediaLanguageTrack => t !== null);
}

function parseSingleChapterMarker(item: unknown): MediaChapterMarker | null {
  if (!item || typeof item !== "object") return null;
  const obj = item as Record<string, unknown>;
  const label = trimmedStringOrNull(obj.label) ?? "";
  if (!label) return null;

  const seconds =
    typeof obj.startSeconds === "number" && Number.isFinite(obj.startSeconds)
      ? obj.startSeconds
      : (parseDurationToSeconds(obj.timecode as string) ?? 0);
  const timecode =
    typeof obj.timecode === "string"
      ? obj.timecode
      : (formatSecondsToDuration(seconds) ?? "00:00");

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
  const targetLocale = (requestedLocale || episode.locale || defaultLocale)
    .trim()
    .toLowerCase();
  const exactTrack = findMatchingTrack(
    episode.languageTracks,
    targetLocale,
    defaultLocale
  );

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
