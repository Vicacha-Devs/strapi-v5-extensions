import type { CalendarLinkSet, ExpandedCalendarOccurrence } from "./types";

function escapeIcsText(value?: string): string {
  if (!value) return "";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function foldIcsLine(line: string): string {
  const maxOctets = 73;
  if (line.length <= maxOctets) {
    return line;
  }
  const chunks: string[] = [];
  let offset = 0;
  while (offset < line.length) {
    const sliceLen = offset === 0 ? maxOctets : maxOctets - 1;
    const part = line.slice(offset, offset + sliceLen);
    chunks.push(offset === 0 ? part : ` ${part}`);
    offset += sliceLen;
  }
  return chunks.join("\r\n");
}

export function toIcsTimestamp(iso: string, allDay = false): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "19700101T000000Z";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  if (allDay) {
    return `${y}${m}${d}`;
  }
  const hh = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
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
  const startStamp = toIcsTimestamp(params.startDate, params.allDay);
  const endStamp = toIcsTimestamp(params.endDate, params.allDay);

  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${startStamp}/${endStamp}`,
  });
  if (params.summary) googleParams.set("details", params.summary);
  if (params.location) googleParams.set("location", params.location);

  const outlookParams = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: params.title,
    startdt: params.startDate,
    enddt: params.endDate,
  });
  if (params.summary) outlookParams.set("body", params.summary);
  if (params.location) outlookParams.set("location", params.location);

  const yahooParams = new URLSearchParams({
    v: "60",
    title: params.title,
    st: startStamp,
    et: endStamp,
  });
  if (params.summary) yahooParams.set("desc", params.summary);
  if (params.location) yahooParams.set("in_loc", params.location);

  const querySuffix = params.occurrenceDate
    ? `?occurrenceDate=${encodeURIComponent(params.occurrenceDate)}`
    : "";

  return {
    google: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`,
    yahoo: `https://calendar.yahoo.com/?${yahooParams.toString()}`,
    icsPath: `/api/calendar/${encodeURIComponent(params.documentId)}/invite.ics${querySuffix}`,
  };
}

export function generateIcsCalendar(params: {
  calendarTitle: string;
  timezone: string;
  occurrences: ExpandedCalendarOccurrence[];
}): string {
  const nowStamp = toIcsTimestamp(new Date().toISOString());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vicacha Devs//Strapi Plugin Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(params.calendarTitle)}`,
    `X-WR-TIMEZONE:${escapeIcsText(params.timezone)}`,
  ];

  for (const occ of params.occurrences) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeIcsText(occ.occurrenceId)}@strapi-plugin-calendar`);
    lines.push(`DTSTAMP:${nowStamp}`);
    if (occ.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${toIcsTimestamp(occ.startDate, true)}`);
      lines.push(`DTEND;VALUE=DATE:${toIcsTimestamp(occ.endDate, true)}`);
    } else {
      lines.push(`DTSTART:${toIcsTimestamp(occ.startDate, false)}`);
      lines.push(`DTEND:${toIcsTimestamp(occ.endDate, false)}`);
    }
    lines.push(`SUMMARY:${escapeIcsText(occ.title)}`);
    if (occ.summary) {
      lines.push(`DESCRIPTION:${escapeIcsText(occ.summary)}`);
    }
    if (occ.location) {
      lines.push(`LOCATION:${escapeIcsText(occ.location)}`);
    }
    if (occ.category) {
      lines.push(`CATEGORIES:${escapeIcsText(occ.category)}`);
    }
    if (occ.alternateDates) {
      for (const alt of Object.values(occ.alternateDates)) {
        lines.push(`X-ALT-DATE-${alt.calendarId.toUpperCase()}:${escapeIcsText(alt.formatted)}`);
      }
    }
    const icsStatus =
      occ.status === "cancelled"
        ? "CANCELLED"
        : occ.status === "postponed"
          ? "TENTATIVE"
          : "CONFIRMED";
    lines.push(`STATUS:${icsStatus}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
