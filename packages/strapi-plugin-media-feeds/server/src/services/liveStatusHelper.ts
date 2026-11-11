import {
  normalizeSpokenLanguages,
  parseMediaUrl,
  sanitizeOptionalMediaUrl,
  type AlternateDateValue,
  type LiveBroadcastScheduleSlot,
  type LiveBroadcastState,
  type MediaFeedItem,
  type MediaFeedsSettings,
} from "../../../shared";
import { sanitizeLiveStreamItems } from "./settings";

const WEEKDAY_MAP: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

function parseClockMinutes(rawTime: unknown, allowEndOfDay = false): number {
  if (typeof rawTime !== "string") return -1;
  const trimmed = rawTime.trim();
  if (allowEndOfDay && trimmed === "24:00") return 1440;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return -1;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return -1;
  return hours * 60 + minutes;
}

function resolveLocalClockInZone(
  date: Date,
  timeZone: string
): { isoDay: number; minutes: number } {
  const safeZone = timeZone?.trim() || "UTC";
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: safeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  }

  const parts = formatter.formatToParts(date);
  const weekdayPart = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hourRaw = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minuteRaw = Number(
    parts.find((p) => p.type === "minute")?.value ?? "0"
  );
  const hour = Number.isFinite(hourRaw) ? hourRaw % 24 : 0;
  const minute = Number.isFinite(minuteRaw) ? minuteRaw : 0;
  const isoDay = Object.hasOwn(WEEKDAY_MAP, weekdayPart)
    ? WEEKDAY_MAP[weekdayPart]
    : 1;

  return { isoDay, minutes: hour * 60 + minute };
}

export function findActiveRecurringSlot(
  slots: LiveBroadcastScheduleSlot[] | undefined,
  timeZone: string,
  now: Date = new Date()
): LiveBroadcastScheduleSlot | null {
  if (!Array.isArray(slots) || slots.length === 0) return null;
  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
  const { isoDay, minutes } = resolveLocalClockInZone(safeNow, timeZone);

  for (const slot of slots) {
    if (!slot || typeof slot !== "object") continue;
    const rawDay = Number(slot.dayOfWeek);
    const slotDay = rawDay === 0 ? 7 : Math.trunc(rawDay);
    if (!Number.isFinite(slotDay) || slotDay < 1 || slotDay > 7) continue;

    const startMins = parseClockMinutes(slot.startTime, false);
    const endMins = parseClockMinutes(slot.endTime, true);
    if (startMins < 0 || endMins < 0 || startMins === endMins) continue;

    if (startMins < endMins) {
      if (isoDay === slotDay && minutes >= startMins && minutes < endMins) {
        return slot;
      }
    } else {
      const nextDay = (slotDay % 7) + 1;
      const isLateSameDay = isoDay === slotDay && minutes >= startMins;
      const isEarlyNextDay = isoDay === nextDay && minutes < endMins;
      if (isLateSameDay || isEarlyNextDay) {
        return slot;
      }
    }
  }
  return null;
}

export function buildActiveLiveBroadcastState(
  liveEpisode: MediaFeedItem,
  settings: MediaFeedsSettings,
  secondaryDates?: Record<string, AlternateDateValue>
): LiveBroadcastState {
  const defaultLoc = settings.defaultLocale || "es";
  const fallbackWatch = parseMediaUrl(
    settings.liveStream.watchUrl,
    settings.liveStream.provider
  ).canonicalUrl;
  const safeEpisodeWatch = parseMediaUrl(
    liveEpisode.sourceUrl,
    liveEpisode.provider
  ).canonicalUrl;
  const safeStreams = sanitizeLiveStreamItems(settings.liveStreams, defaultLoc);
  const safeConfigThumb = sanitizeOptionalMediaUrl(
    settings.liveStream.thumbnailUrl
  );

  return {
    status: "live",
    title: liveEpisode.title,
    description: liveEpisode.description,
    scheduleLabel:
      liveEpisode.publishedAtLabel || settings.liveStream.scheduleLabel,
    provider: liveEpisode.provider,
    watchUrl: safeEpisodeWatch || fallbackWatch,
    embedUrl: sanitizeOptionalMediaUrl(liveEpisode.embedUrl),
    thumbnailUrl:
      sanitizeOptionalMediaUrl(liveEpisode.thumbnailUrl) ?? safeConfigThumb,
    spokenLanguages: normalizeSpokenLanguages(liveEpisode.spokenLanguages, [
      defaultLoc,
    ]),
    activeEpisodeDocumentId: liveEpisode.documentId,
    secondaryDates,
    streams: safeStreams,
  };
}

export function buildStandbyLiveBroadcastState(
  settings: MediaFeedsSettings,
  episodes: MediaFeedItem[],
  secondaryDates: Record<string, AlternateDateValue> | undefined,
  now: Date
): LiveBroadcastState {
  const defaultLoc = settings.defaultLocale || "es";
  const parsedWatch = parseMediaUrl(
    settings.liveStream.watchUrl,
    settings.liveStream.provider
  );
  const safeEmbed =
    sanitizeOptionalMediaUrl(settings.liveStream.embedUrl) ??
    parsedWatch.embedUrl;
  const thumbnailUrl =
    sanitizeOptionalMediaUrl(settings.liveStream.thumbnailUrl) ??
    parsedWatch.thumbnailUrl ??
    sanitizeOptionalMediaUrl(episodes[0]?.thumbnailUrl) ??
    null;

  const activeSlot = settings.liveStream.enabled
    ? findActiveRecurringSlot(
        settings.liveStream.recurringSlots,
        settings.defaultTimezone,
        now
      )
    : null;

  const status: LiveBroadcastState["status"] = !settings.liveStream.enabled
    ? "offline"
    : activeSlot
      ? "live"
      : "upcoming";

  return {
    status,
    title: settings.liveStream.title,
    description: settings.liveStream.description,
    scheduleLabel: activeSlot?.label || settings.liveStream.scheduleLabel,
    provider: parsedWatch.provider,
    watchUrl: parsedWatch.canonicalUrl,
    embedUrl: safeEmbed,
    thumbnailUrl,
    spokenLanguages: normalizeSpokenLanguages(
      settings.liveStream.spokenLanguages,
      [defaultLoc]
    ),
    activeEpisodeDocumentId: null,
    secondaryDates,
    streams: sanitizeLiveStreamItems(settings.liveStreams, defaultLoc),
  };
}
