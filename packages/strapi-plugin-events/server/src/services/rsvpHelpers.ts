import type { Core } from "@strapi/strapi";

import { EVENT_CONTENT_TYPE_UID } from "../../../shared/pluginId";
import type {
  EventSourceMapping,
  EventsPluginSettings,
  RsvpRegistrationInput,
  RsvpRegistrationRecord,
  RsvpStats,
  RsvpStatus,
} from "../../../shared/types";
import { getDocumentsClient, getSettingsService } from "../types";

export interface ResolvedTargetEvent {
  uid: string;
  documentId: string;
  title: string;
  startDate: string;
  rsvpEnabled: boolean;
  capacity: number | null;
  waitlistEnabled: boolean;
  maxGuestsPerRegistration: number;
  registrationDeadline: string | null;
}

export function maskEmail(email: string): string {
  const [local, domain] = (email || "").split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function readNullablePositiveInt(val: unknown): number | null {
  return typeof val === "number" && val > 0 ? Math.floor(val) : null;
}

function readBooleanWithDefault(val: unknown, fallback: boolean): boolean {
  return typeof val === "boolean" ? val : fallback;
}

function readMaxGuestsWithDefault(val: unknown, fallback: number): number {
  return typeof val === "number" && val >= 1 ? val : fallback;
}

function buildResolvedTargetEvent(
  doc: Record<string, unknown>,
  src: EventSourceMapping,
  eventDocumentId: string,
  settings: EventsPluginSettings
): ResolvedTargetEvent {
  const title = String(doc[src.fields.title] ?? doc.title ?? "Event");
  const startDate = String(doc[src.fields.startDate] ?? doc.startDate ?? "");
  const rsvpField = src.fields.rsvpEnabled ?? "rsvpEnabled";
  const capField = src.fields.capacity ?? "capacity";
  const rsvpEnabled =
    doc[rsvpField] !== undefined ? Boolean(doc[rsvpField]) : true;

  return {
    uid: src.uid,
    documentId: eventDocumentId,
    title,
    startDate,
    rsvpEnabled,
    capacity: readNullablePositiveInt(doc[capField]),
    waitlistEnabled: readBooleanWithDefault(
      doc.waitlistEnabled,
      settings.waitlistEnabledByDefault
    ),
    maxGuestsPerRegistration: readMaxGuestsWithDefault(
      doc.maxGuestsPerRegistration,
      settings.defaultMaxGuestsPerRegistration
    ),
    registrationDeadline:
      typeof doc.registrationDeadline === "string"
        ? doc.registrationDeadline
        : null,
  };
}

export async function resolveTargetEvent(
  strapi: Core.Strapi,
  eventDocumentId: string,
  preferredUid?: string
): Promise<ResolvedTargetEvent | null> {
  const settings = await getSettingsService(strapi).getSettings();
  const sources: EventSourceMapping[] = settings.sources ?? [];

  const candidateSources = preferredUid
    ? [
        ...sources.filter((s) => s.uid === preferredUid),
        ...sources.filter((s) => s.uid !== preferredUid),
      ]
    : sources;

  for (const src of candidateSources) {
    try {
      const doc = await getDocumentsClient(strapi, src.uid).findOne({
        documentId: eventDocumentId,
      });
      if (doc) {
        return buildResolvedTargetEvent(doc, src, eventDocumentId, settings);
      }
    } catch {
      // Continue searching next configured source
    }
  }

  return null;
}

function readOptionalText(val: unknown): string | undefined {
  return val ? String(val) : undefined;
}

function readPositiveGuestsCount(val: unknown): number {
  return typeof val === "number" && val > 0 ? Math.floor(val) : 1;
}

export function formatRegistrationRecord(
  raw: Record<string, unknown>
): RsvpRegistrationRecord {
  return {
    documentId: String(raw.documentId ?? ""),
    eventUid: String(raw.eventUid ?? EVENT_CONTENT_TYPE_UID),
    eventDocumentId: String(raw.eventDocumentId ?? ""),
    eventTitle: readOptionalText(raw.eventTitle),
    occurrenceDate: String(raw.occurrenceDate ?? ""),
    attendeeName: String(raw.attendeeName ?? ""),
    attendeeEmail: String(raw.attendeeEmail ?? ""),
    attendeePhone: readOptionalText(raw.attendeePhone),
    guestsCount: readPositiveGuestsCount(raw.guestsCount),
    status: (raw.status as RsvpStatus) ?? "confirmed",
    checkedInAt: raw.checkedInAt ? String(raw.checkedInAt) : null,
    locale: String(raw.locale ?? "es"),
    notes: readOptionalText(raw.notes),
    createdAt: readOptionalText(raw.createdAt),
  };
}

export function aggregateRsvpCounts(
  records: Array<Record<string, unknown>>
): Pick<
  RsvpStats,
  | "confirmedCount"
  | "confirmedSeats"
  | "checkedInSeats"
  | "waitlistedCount"
  | "waitlistedSeats"
  | "cancelledCount"
> {
  let confirmedCount = 0;
  let confirmedSeats = 0;
  let checkedInSeats = 0;
  let waitlistedCount = 0;
  let waitlistedSeats = 0;
  let cancelledCount = 0;

  for (const rec of records) {
    const guests = readPositiveGuestsCount(rec.guestsCount);
    const st = rec.status as RsvpStatus;
    if (st === "confirmed" || st === "checked_in") {
      confirmedCount++;
      confirmedSeats += guests;
      if (st === "checked_in") {
        checkedInSeats += guests;
      }
    } else if (st === "waitlisted") {
      waitlistedCount++;
      waitlistedSeats += guests;
    } else if (st === "cancelled") {
      cancelledCount++;
    }
  }

  return {
    confirmedCount,
    confirmedSeats,
    checkedInSeats,
    waitlistedCount,
    waitlistedSeats,
    cancelledCount,
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertValidAttendeeIdentity(
  attendeeName: string,
  attendeeEmail: string
): void {
  if (!attendeeName || attendeeName.length > 160) {
    throw new Error(
      "Invalid attendeeName: must be between 1 and 160 characters."
    );
  }
  if (!attendeeEmail || !EMAIL_REGEX.test(attendeeEmail)) {
    throw new Error("Invalid attendeeEmail: must be a valid email address.");
  }
}

export function validateRegistrationInputAndEvent(
  input: RsvpRegistrationInput,
  targetEvent: ResolvedTargetEvent
): { attendeeName: string; attendeeEmail: string; guestsCount: number } {
  const attendeeName = (input.attendeeName ?? "").trim();
  const attendeeEmail = (input.attendeeEmail ?? "").trim().toLowerCase();

  assertValidAttendeeIdentity(attendeeName, attendeeEmail);
  if (!targetEvent.rsvpEnabled) {
    throw new Error("Registrations are closed for this event.");
  }
  assertRegistrationBeforeDeadline(targetEvent.registrationDeadline);

  const guestsCount = readPositiveGuestsCount(input.guestsCount);
  if (guestsCount > targetEvent.maxGuestsPerRegistration) {
    throw new Error(
      `Maximum guests per registration is ${targetEvent.maxGuestsPerRegistration}.`
    );
  }

  return { attendeeName, attendeeEmail, guestsCount };
}

function assertRegistrationBeforeDeadline(deadline: string | null): void {
  if (!deadline) return;
  const deadlineMs = new Date(deadline).getTime();
  if (!Number.isNaN(deadlineMs) && Date.now() > deadlineMs) {
    throw new Error("The registration deadline for this event has passed.");
  }
}

export function resolveAssignedRsvpStatus(
  targetEvent: ResolvedTargetEvent,
  confirmedSeats: number,
  guestsCount: number
): RsvpStatus {
  if (
    targetEvent.capacity !== null &&
    confirmedSeats + guestsCount > targetEvent.capacity
  ) {
    if (targetEvent.waitlistEnabled) {
      return "waitlisted";
    }
    throw new Error("Event has reached maximum capacity.");
  }
  return "confirmed";
}

export async function trySendNotificationEmail(
  strapi: Core.Strapi,
  payload: {
    to: string;
    attendeeName: string;
    eventTitle: string;
    occurrenceDate: string;
    guestsCount: number;
    status: RsvpStatus;
    promotedFromWaitlist?: boolean;
  }
): Promise<void> {
  try {
    const settings = await getSettingsService(strapi).getSettings();
    if (!settings.sendRsvpEmails) return;

    const emailPlugin = strapi.plugin("email");
    const emailService = emailPlugin?.service("email") as
      | {
          send?: (msg: {
            to: string;
            subject: string;
            text: string;
          }) => Promise<void>;
        }
      | undefined;
    if (!emailService || typeof emailService.send !== "function") return;

    const statusHeadline = payload.promotedFromWaitlist
      ? "Your waitlist spot has been confirmed!"
      : payload.status === "waitlisted"
        ? "You have been added to the event waitlist"
        : "Your event registration is confirmed";

    await emailService.send({
      to: payload.to,
      subject: `${statusHeadline} — ${payload.eventTitle}`,
      text: [
        `Hello ${payload.attendeeName},`,
        "",
        statusHeadline,
        `Event: ${payload.eventTitle}`,
        `Date: ${payload.occurrenceDate}`,
        `Seats: ${payload.guestsCount}`,
        `Status: ${payload.status.toUpperCase()}`,
      ].join("\n"),
    });
  } catch {
    strapi.log.debug(
      `[events] Could not send RSVP notification email to ${maskEmail(payload.to)}`
    );
  }
}
