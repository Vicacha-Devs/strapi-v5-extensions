import type { BookingRecord } from "./types";

export function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

function formatICalDateUtc(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "19700101T000000Z";
  }
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function computeFallbackOpaqueUid(seed: string): string {
  let h1 = 0xdeadbeef ^ seed.length;
  let h2 = 0x41c6ce57 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `opaque-${hex1}${hex2}`;
}

export function foldICalLine(line: string): string {
  const encoder = new TextEncoder();
  const maxOctets = 75;
  if (encoder.encode(line).length <= maxOctets) {
    return line;
  }
  const chunks: string[] = [];
  let current = "";
  for (const char of line) {
    const candidate = current + char;
    const limit = chunks.length === 0 ? maxOctets : maxOctets - 1;
    if (encoder.encode(candidate).length > limit) {
      chunks.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks.join("\r\n ");
}

export interface GenerateBookingsICalOptions {
  /** When true, strips customer PII (customerName, bookingCode, notes, assignedHost) */
  anonymize?: boolean;
  /** Optional pre-hashed opaque UID map keyed by booking.documentId */
  opaqueUids?: Record<string, string>;
}

function buildBookingVEventLines(
  booking: BookingRecord,
  nowStamp: string,
  options?: GenerateBookingsICalOptions
): string[] {
  const anonymize = Boolean(options?.anonymize);
  const dtStart = formatICalDateUtc(booking.startDate);
  const dtEnd = formatICalDateUtc(booking.endDate);
  const statusMap: Record<BookingRecord["status"], string> = {
    confirmed: "CONFIRMED",
    completed: "CONFIRMED",
    pending: "TENTATIVE",
    cancelled: "CANCELLED",
    no_show: "CANCELLED",
  };

  const uidLocal = anonymize
    ? (options?.opaqueUids?.[booking.documentId] ??
      computeFallbackOpaqueUid(`${booking.documentId}:${booking.startDate}`))
    : booking.bookingCode || booking.documentId;
  const uid = `${uidLocal}@strapi-plugin-bookings`;

  const summary = anonymize
    ? "Reserved"
    : booking.title || booking.customerName;

  const descriptionParts: string[] = anonymize
    ? [
        "Status: Busy",
        ...(booking.resourceName ? [`Resource: ${booking.resourceName}`] : []),
      ]
    : [
        `Booking Code: ${booking.bookingCode}`,
        `Customer: ${booking.customerName}`,
        `Party Size: ${booking.partySize}`,
        `Status: ${booking.status}`,
        ...(booking.resourceName ? [`Resource: ${booking.resourceName}`] : []),
        ...(booking.assignedHost
          ? [`Assigned Staff/Host: ${booking.assignedHost}`]
          : []),
        ...(booking.notes ? [`Notes: ${booking.notes}`] : []),
      ];

  return [
    "BEGIN:VEVENT",
    foldICalLine(`UID:${escapeICalText(uid)}`),
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    foldICalLine(`SUMMARY:${escapeICalText(summary)}`),
    foldICalLine(`DESCRIPTION:${escapeICalText(descriptionParts.join("\n"))}`),
    `STATUS:${statusMap[booking.status] || "TENTATIVE"}`,
    "END:VEVENT",
  ];
}

export function generateBookingsICalFeed(
  bookings: BookingRecord[],
  calendarName = "Strapi Bookings & Reservations",
  options?: GenerateBookingsICalOptions
): string {
  const nowStamp = formatICalDateUtc(new Date().toISOString());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vicacha Devs//Strapi Plugin Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldICalLine(`X-WR-CALNAME:${escapeICalText(calendarName)}`),
  ];

  for (const booking of bookings) {
    lines.push(...buildBookingVEventLines(booking, nowStamp, options));
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

/**
 * Neutralizes CSV formula injection payloads (including leading whitespace/newlines
 * before =, +, -, @, |, and leading \t, \r, \n) per OWASP guidelines and RFC 4180.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  let str = String(value);
  if (/^[\s\u0085\u2028\u2029]*[=+\-@|]|^[\t\r\n]/.test(str)) {
    str = `'${str}`;
  }
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function generateBookingsCsv(bookings: BookingRecord[]): string {
  const headers = [
    "Booking Code",
    "Resource",
    "Customer Name",
    "Customer Email",
    "Customer Phone",
    "Organization",
    "Start Date",
    "End Date",
    "Slot Label",
    "Party Size",
    "Status",
    "Preferred Language",
    "Assigned Host",
    "Notes",
  ];

  const rows = bookings.map((b) =>
    [
      b.bookingCode,
      b.resourceName ?? "",
      b.customerName,
      b.customerEmail,
      b.customerPhone ?? "",
      b.organization ?? "",
      b.startDate,
      b.endDate,
      b.slotLabel ?? "",
      b.partySize,
      b.status,
      b.preferredLanguage ?? "",
      b.assignedHost ?? "",
      b.notes ?? "",
    ]
      .map(sanitizeCsvCell)
      .join(",")
  );

  return [headers.map(sanitizeCsvCell).join(","), ...rows].join("\r\n");
}
