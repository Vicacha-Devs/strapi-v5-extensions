import { normalizeRRuleString } from "./rruleEngine";
import type {
  CalendarLinkSet,
  ExpandedOccurrence,
  RsvpRegistrationRecord,
} from "./types";

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

export function escapeIcsText(value: string | undefined | null): string {
  if (!value) return "";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function foldIcsLine(line: string): string {
  if (line.length <= 75) {
    return line;
  }
  const chunks: string[] = [];
  let remaining = line;
  chunks.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    chunks.push(` ${remaining.slice(0, 74)}`);
    remaining = remaining.slice(74);
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
  const icsEnd = toIcsTimestamp(endDate, allDay);

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
  return ICS_STATUS_MAP[status] ?? "CONFIRMED";
}

function appendVEventDateLines(lines: string[], occ: ExpandedOccurrence): void {
  const isAllDay = Boolean(occ.allDay);
  const prefix = isAllDay ? ";VALUE=DATE" : "";
  lines.push(`DTSTART${prefix}:${toIcsTimestamp(occ.startDate, isAllDay)}`);
  lines.push(`DTEND${prefix}:${toIcsTimestamp(occ.endDate, isAllDay)}`);
}

function appendVEventOptionalLines(
  lines: string[],
  occ: ExpandedOccurrence
): void {
  if (occ.summary)
    lines.push(foldIcsLine(`DESCRIPTION:${escapeIcsText(occ.summary)}`));
  if (occ.location)
    lines.push(foldIcsLine(`LOCATION:${escapeIcsText(occ.location)}`));
  if (occ.virtualUrl)
    lines.push(foldIcsLine(`URL:${escapeIcsText(occ.virtualUrl)}`));
  if (occ.isRecurring && occ.rrule) {
    const normalized = normalizeRRuleString(occ.rrule);
    if (normalized) lines.push(foldIcsLine(`RRULE:${normalized}`));
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
 * Prevents CSV Formula Injection (CWE-1236) and escapes quotes/newlines.
 */
export function sanitizeCsvCell(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return '""';
  }
  let text = String(raw);
  if (/^[=+\-@\t\r]/.test(text)) {
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
