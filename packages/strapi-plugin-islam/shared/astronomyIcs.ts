import { minutesToHhMm } from "./astronomyMath";
import type { DailyFivePrayerId, DailyPrayerTimetable } from "./types";
import { sanitizeIcsText, sanitizeTimezone } from "./validation";

function advanceIsoDateDays(isoDate: string, daysToAdd: number): string {
  if (daysToAdd <= 0) return isoDate;
  const base = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(base.getTime())) return isoDate;
  const advanced = new Date(base.getTime() + daysToAdd * 86_400_000);
  return advanced.toISOString().slice(0, 10);
}

export function generatePrayerCalendarIcs(
  days: DailyPrayerTimetable[],
  mosqueName: string
): string {
  const safeMosque = sanitizeIcsText(mosqueName || "Central Mosque");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vicacha Devs//Strapi Plugin Islam Salah Timetable//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${safeMosque} — Salah & Iqamah`,
  ];

  const dtStamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const prayerKeys: DailyFivePrayerId[] = [
    "fajr",
    "dhuhr",
    "asr",
    "maghrib",
    "isha",
  ];

  for (const day of days) {
    const startDateCompact = day.dateGregorian.replace(/-/g, "");
    const safeTz = sanitizeIcsText(
      sanitizeTimezone(day.location.timezone, "UTC")
    );
    for (const pKey of prayerKeys) {
      const p = day.prayers[pKey];
      const startMin = Math.max(0, Math.min(1439, Math.round(p.adhanMinutes)));
      const startCompact = minutesToHhMm(startMin).replace(":", "");
      const rawEndMin = Math.max(
        startMin + 15,
        Math.round(p.iqamahMinutes) + 15
      );
      const dayAdvance = Math.floor(rawEndMin / 1440);
      const endDateCompact = advanceIsoDateDays(
        day.dateGregorian,
        dayAdvance
      ).replace(/-/g, "");
      const endCompact = minutesToHhMm(rawEndMin % 1440).replace(":", "");

      const uid = `salah-${startDateCompact}-${pKey}@vicacha-islam`;
      const summary = sanitizeIcsText(
        `${p.label} — Adhan ${p.adhan} / Iqamah ${p.iqamah}`
      );
      const description = sanitizeIcsText(
        `${safeMosque} (${day.hijri.formatted}) • Adhan: ${p.adhan} • Iqamah: ${p.iqamah}`
      );

      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;TZID=${safeTz}:${startDateCompact}T${startCompact}00`,
        `DTEND;TZID=${safeTz}:${endDateCompact}T${endCompact}00`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${safeMosque}`,
        "END:VEVENT"
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
