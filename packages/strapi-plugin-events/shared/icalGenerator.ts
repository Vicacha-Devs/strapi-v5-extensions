import { escapeIcsText } from "@vicacha-devs/plugin-shared";

import { normalizeRRuleString } from "./rruleEngine";
import type {
  CalendarLinkSet,
  ExpandedOccurrence,
  RsvpRegistrationRecord,
} from "./types";

export { escapeIcsText };

const utf8Encoder = new TextEncoder();

export function toIcsTimestamp(isoString: string, allDay = false): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const iso = d.toISOString();
  if (allDay) {
    return iso.slice(0, 10).replace(/-/g, "");
  }
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function resolveExclusiveAllDayEndStamp(
  startDate: string,
  endDate: string,
  dtStartStamp: string
): string {
  const rawEndStamp = toIcsTimestamp(endDate, true);
  if (rawEndStamp && rawEndStamp > dtStartStamp) {
    return rawEndStamp;
  }
  const startObj = new Date(startDate);
  if (Number.isNaN(startObj.getTime())) {
    return rawEndStamp;
  }
  const nextDay = new Date(
    Date.UTC(
      startObj.getUTCFullYear(),
      startObj.getUTCMonth(),
      startObj.getUTCDate() + 1
    )
  );
  return nextDay.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * Folds an iCalendar line at 75 UTF-8 octets per RFC 5545 Section 3.1,
 * iterating over Unicode code points so surrogate pairs are never split.
 */
export function foldIcsLine(line: string): string {
  if (utf8Encoder.encode(line).byteLength <= 75) {
    return line;
  }
  const chunks: string[] = [];
  let currentChunk = "";
  let currentBytes = 0;
  let maxBytes = 75;

  for (const codePoint of line) {
    const byteLen = utf8Encoder.encode(codePoint).byteLength;
    if (currentBytes + byteLen > maxBytes && currentChunk.length > 0) {
      chunks.push(chunks.length === 0 ? currentChunk : ` ${currentChunk}`);
      currentChunk = codePoint;
      currentBytes = byteLen;
      maxBytes = 74;
    } else {
      currentChunk += codePoint;
      currentBytes += byteLen;
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(chunks.length === 0 ? currentChunk : ` ${currentChunk}`);
  }
  return chunks.join("\r\n");
}

export function buildCalendarLinks(params: {
  documentId: string;
  title: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  summary?: string;
  location?: string;
  occurrenceDate?: string;
}): CalendarLinkSet {
  const {
    documentId,
    title,
    startDate,
    endDate,
    allDay = false,
    summary = "",
    location = "",
    occurrenceDate,
  } = params;

  const icsStart = toIcsTimestamp(startDate, allDay);
  const icsEnd = allDay
    ? resolveExclusiveAllDayEndStamp(startDate, endDate, icsStart)
    : toIcsTimestamp(endDate, false);

  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${icsStart}/${icsEnd}`,
    details: summary,
    location,
  });

  const outlookParams = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    startdt: startDate,
    enddt: endDate,
    body: summary,
    location,
    allday: allDay ? "true" : "false",
  });

  const yahooParams = new URLSearchParams({
    v: "60",
    title,
    st: icsStart,
    et: icsEnd,
    desc: summary,
    in_loc: location,
  });

  const querySuffix = occurrenceDate
    ? `?occurrenceDate=${encodeURIComponent(occurrenceDate)}`
    : "";

  return {
    google: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`,
    yahoo: `https://calendar.yahoo.com/?${yahooParams.toString()}`,
    icsPath: `/api/events/${encodeURIComponent(documentId)}/invite.ics${querySuffix}`,
  };
}

const ICS_STATUS_MAP: Record<string, string> = {
  cancelled: "CANCELLED",
  postponed: "TENTATIVE",
};

function resolveIcsStatus(status: string): string {
  return Object.hasOwn(ICS_STATUS_MAP, status)
    ? ICS_STATUS_MAP[status]
    : "CONFIRMED";
}

function appendVEventDateLines(lines: string[], occ: ExpandedOccurrence): void {
  const isAllDay = Boolean(occ.allDay);
  const prefix = isAllDay ? ";VALUE=DATE" : "";
  const startStamp = toIcsTimestamp(occ.startDate, isAllDay);
  const endStamp = isAllDay
    ? resolveExclusiveAllDayEndStamp(occ.startDate, occ.endDate, startStamp)
    : toIcsTimestamp(occ.endDate, false);
  lines.push(`DTSTART${prefix}:${startStamp}`);
  lines.push(`DTEND${prefix}:${endStamp}`);
}

function appendVEventOptionalLines(
  lines: string[],
  occ: ExpandedOccurrence
): void {
  if (occ.summary) {
    lines.push(foldIcsLine(`DESCRIPTION:${escapeIcsText(occ.summary)}`));
  }
  if (occ.location) {
    lines.push(foldIcsLine(`LOCATION:${escapeIcsText(occ.location)}`));
  }
  if (occ.virtualUrl) {
    lines.push(foldIcsLine(`URL:${escapeIcsText(occ.virtualUrl)}`));
  }
  if (occ.isRecurring && occ.rrule) {
    const normalized = normalizeRRuleString(occ.rrule).replace(/[\r\n]+/g, "");
    if (normalized) {
      lines.push(foldIcsLine(`RRULE:${normalized}`));
    }
  }
}

export function generateIcsCalendar(
  occurrences: ExpandedOccurrence[],
  feedTitle = "Events Calendar"
): string {
  const nowStamp = toIcsTimestamp(new Date().toISOString(), false);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Strapi v5//strapi-plugin-events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldIcsLine(`X-WR-CALNAME:${escapeIcsText(feedTitle)}`),
  ];

  for (const occ of occurrences) {
    const uid = `${occ.documentId}-${occ.occurrenceDate}@strapi-plugin-events`;
    lines.push("BEGIN:VEVENT");
    lines.push(foldIcsLine(`UID:${escapeIcsText(uid)}`));
    lines.push(`DTSTAMP:${nowStamp}`);
    appendVEventDateLines(lines, occ);
    lines.push(foldIcsLine(`SUMMARY:${escapeIcsText(occ.title)}`));
    appendVEventOptionalLines(lines, occ);
    lines.push(`STATUS:${resolveIcsStatus(occ.status)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

/**
 * Prevents CSV Formula Injection (CWE-1236) including leading-whitespace
 * bypasses and escapes quotes/newlines.
 */
export function sanitizeCsvCell(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return '""';
  }
  let text = String(raw);
  if (/^[\s\u0085\u2028\u2029]*[=+\-@|]|^[\t\r\n]/.test(text)) {
    text = `'${text}`;
  }
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function generateRegistrationsCsv(
  records: RsvpRegistrationRecord[]
): string {
  const headers = [
    "Document ID",
    "Event UID",
    "Event Document ID",
    "Event Title",
    "Occurrence Date",
    "Attendee Name",
    "Attendee Email",
    "Attendee Phone",
    "Guests Count",
    "Status",
    "Checked In At",
    "Locale",
    "Notes",
    "Created At",
  ];

  const rows: string[] = [headers.map(sanitizeCsvCell).join(",")];

  for (const r of records) {
    rows.push(
      [
        r.documentId,
        r.eventUid,
        r.eventDocumentId,
        r.eventTitle ?? "",
        r.occurrenceDate,
        r.attendeeName,
        r.attendeeEmail,
        r.attendeePhone ?? "",
        r.guestsCount,
        r.status,
        r.checkedInAt ?? "",
        r.locale,
        r.notes ?? "",
        r.createdAt ?? "",
      ]
        .map(sanitizeCsvCell)
        .join(",")
    );
  }

  return `${rows.join("\r\n")}\r\n`;
}
