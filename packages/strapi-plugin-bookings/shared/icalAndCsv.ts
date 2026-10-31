import type { BookingRecord } from "./types";

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
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

export function generateBookingsICalFeed(
  bookings: BookingRecord[],
  calendarName = "Strapi Bookings & Reservations"
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
    const uid = `${booking.bookingCode || booking.documentId}@strapi-plugin-bookings`;
    const dtStart = formatICalDateUtc(booking.startDate);
    const dtEnd = formatICalDateUtc(booking.endDate);
    const statusMap: Record<BookingRecord["status"], string> = {
      confirmed: "CONFIRMED",
      completed: "CONFIRMED",
      pending: "TENTATIVE",
      cancelled: "CANCELLED",
      no_show: "CANCELLED",
    };
    const descriptionParts: string[] = [
      `Booking Code: ${booking.bookingCode}`,
      `Customer: ${booking.customerName}`,
      `Party Size: ${booking.partySize}`,
      `Status: ${booking.status}`,
    ];
    if (booking.resourceName) {
      descriptionParts.push(`Resource: ${booking.resourceName}`);
    }
    if (booking.assignedHost) {
      descriptionParts.push(`Assigned Staff/Host: ${booking.assignedHost}`);
    }
    if (booking.notes) {
      descriptionParts.push(`Notes: ${booking.notes}`);
    }

    lines.push("BEGIN:VEVENT");
    lines.push(foldICalLine(`UID:${escapeICalText(uid)}`));
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(foldICalLine(`SUMMARY:${escapeICalText(booking.title || booking.customerName)}`));
    lines.push(foldICalLine(`DESCRIPTION:${escapeICalText(descriptionParts.join("\n"))}`));
    lines.push(`STATUS:${statusMap[booking.status] || "TENTATIVE"}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

/**
 * Neutralizes CSV formula injection payloads (=, +, -, @, \t, \r) per OWASP guidelines
 * and formats the cell according to RFC 4180.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
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
