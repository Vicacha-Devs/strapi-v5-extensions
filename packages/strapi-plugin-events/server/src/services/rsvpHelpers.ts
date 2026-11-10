import type { Core } from "@strapi/strapi";
import { isValidEmail } from "@vicacha-devs/plugin-shared";

import { EVENT_CONTENT_TYPE_UID } from "../../../shared/pluginId";
import { parseRRuleFieldValue } from "../../../shared/rruleEngine";
import {
  isSafeObjectKey,
  mapEventStatus,
  resolveStartEndFromDocument,
  sanitizePlainRecord,
} from "../../../shared/spotlightHelpers";
import type {
  EventLifecycleStatus,
  EventSourceMapping,
  EventsPluginSettings,
  RRuleFieldValue,
  RsvpRegistrationInput,
  RsvpRegistrationRecord,
  RsvpStats,
  RsvpStatus,
} from "../../../shared/types";
import {
  PluginValidationError,
  getDocumentsClient,
  getSettingsService,
} from "../types";
import { isAllowedEventSourceUid } from "./occurrenceRsvpBatch";

export interface ResolvedTargetEvent {
  uid: string;
  documentId: string;
  title: string;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  recurrence: RRuleFieldValue;
  eventStatus: EventLifecycleStatus;
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

export function readNullablePositiveInt(val: unknown): number | null {
  if (typeof val === "number") {
    return Number.isFinite(val) && val >= 1 ? Math.floor(val) : null;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
  }
  return null;
}

function readBooleanWithDefault(val: unknown, fallback: boolean): boolean {
  return typeof val === "boolean" ? val : fallback;
}

function readMaxGuestsWithDefault(val: unknown, fallback: number): number {
  const parsed = readNullablePositiveInt(val);
  return parsed !== null ? Math.min(50, parsed) : fallback;
}

function extractRawDeadline(rawDeadline: unknown): string | null {
  if (rawDeadline === null || rawDeadline === undefined || rawDeadline === "") {
    return null;
  }
  if (rawDeadline instanceof Date) {
    return Number.isNaN(rawDeadline.getTime())
      ? "INVALID_DEADLINE"
      : rawDeadline.toISOString();
  }
  if (typeof rawDeadline === "string") {
    const trimmed = rawDeadline.trim();
    return trimmed ? trimmed : null;
  }
  return "INVALID_DEADLINE";
}

function buildResolvedTargetEvent(
  doc: Record<string, unknown>,
  src: EventSourceMapping,
  eventDocumentId: string,
  settings: EventsPluginSettings
): ResolvedTargetEvent | null {
  const startEnd = resolveStartEndFromDocument(doc, src);
  if (!startEnd) {
    return null;
  }
  const f = src.fields;
  const title = String(
    (isSafeObjectKey(f.title) ? doc[f.title] : undefined) ??
      doc.title ??
      "Event"
  );
  const rsvpField =
    f.rsvpEnabled && isSafeObjectKey(f.rsvpEnabled)
      ? f.rsvpEnabled
      : "rsvpEnabled";
  const capField =
    f.capacity && isSafeObjectKey(f.capacity) ? f.capacity : "capacity";
  const statusField =
    f.status && isSafeObjectKey(f.status) ? f.status : "eventStatus";
  const rruleField = f.rrule && isSafeObjectKey(f.rrule) ? f.rrule : undefined;
  const docTz =
    typeof doc.timezone === "string" && doc.timezone
      ? doc.timezone
      : settings.defaultTimezone;
  const recurrence = parseRRuleFieldValue(
    rruleField ? doc[rruleField] : doc.recurrence,
    docTz
  );
  if (startEnd.allDay) {
    recurrence.allDay = true;
  }

  return {
    uid: src.uid,
    documentId: eventDocumentId,
    title,
    startDate: startEnd.startDate,
    endDate: startEnd.endDate,
    allDay: startEnd.allDay,
    recurrence,
    eventStatus: mapEventStatus(doc[statusField]),
    rsvpEnabled: doc[rsvpField] !== undefined ? Boolean(doc[rsvpField]) : false,
    capacity: readNullablePositiveInt(doc[capField]),
    waitlistEnabled: readBooleanWithDefault(
      doc.waitlistEnabled,
      settings.waitlistEnabledByDefault
    ),
    maxGuestsPerRegistration: readMaxGuestsWithDefault(
      doc.maxGuestsPerRegistration,
      settings.defaultMaxGuestsPerRegistration
    ),
    registrationDeadline: extractRawDeadline(doc.registrationDeadline),
  };
}

export async function resolveTargetEvent(
  strapi: Core.Strapi,
  eventDocumentId: string,
  preferredUid?: string,
  options?: { includeDrafts?: boolean }
): Promise<ResolvedTargetEvent | null> {
  const includeDrafts = options?.includeDrafts ?? false;
  const settings = await getSettingsService(strapi).getSettings();
  const sources = (settings.sources ?? []).filter((s) =>
    isAllowedEventSourceUid(s.uid)
  );

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
        ...(includeDrafts ? {} : { status: "published" }),
      });
      if (!doc) continue;
      if (!includeDrafts && doc.publishedAt === null) {
        continue;
      }
      const resolved = buildResolvedTargetEvent(
        doc,
        src,
        eventDocumentId,
        settings
      );
      if (resolved) return resolved;
    } catch {
      // Continue searching next configured source
    }
  }

  return null;
}

function readOptionalText(val: unknown): string | undefined {
  return val ? String(val) : undefined;
}

export function readStoredGuestsCount(val: unknown): number {
  const parsed = readNullablePositiveInt(val);
  return parsed ?? 1;
}

export function assertValidGuestsCount(val: unknown): number {
  if (val === undefined) {
    return 1;
  }
  if (typeof val !== "number" || !Number.isInteger(val) || val < 1) {
    throw new PluginValidationError(
      "Invalid guestsCount: must be an integer >= 1."
    );
  }
  return val;
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
    guestsCount: readStoredGuestsCount(raw.guestsCount),
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
    const guests = readStoredGuestsCount(rec.guestsCount);
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

function assertValidAttendeeIdentity(
  attendeeName: string,
  attendeeEmail: string
): void {
  if (!attendeeName || attendeeName.length > 160) {
    throw new PluginValidationError(
      "Invalid attendeeName: must be between 1 and 160 characters."
    );
  }
  if (
    !attendeeEmail ||
    attendeeEmail.length > 254 ||
    !isValidEmail(attendeeEmail)
  ) {
    throw new PluginValidationError(
      "Invalid attendeeEmail: must be a valid email address."
    );
  }
}

export function validateRegistrationInputAndEvent(
  input: RsvpRegistrationInput,
  targetEvent: ResolvedTargetEvent
): { attendeeName: string; attendeeEmail: string; guestsCount: number } {
  const attendeeName = (input.attendeeName ?? "").trim();
  const attendeeEmail = (input.attendeeEmail ?? "").trim().toLowerCase();

  assertValidAttendeeIdentity(attendeeName, attendeeEmail);
  if (
    targetEvent.eventStatus === "cancelled" ||
    targetEvent.eventStatus === "postponed"
  ) {
    throw new PluginValidationError(
      `Registrations are unavailable because this event is ${targetEvent.eventStatus}.`
    );
  }
  if (!targetEvent.rsvpEnabled) {
    throw new PluginValidationError("Registrations are closed for this event.");
  }
  assertRegistrationBeforeDeadline(targetEvent.registrationDeadline);

  const guestsCount = assertValidGuestsCount(input.guestsCount);
  if (guestsCount > targetEvent.maxGuestsPerRegistration) {
    throw new PluginValidationError(
      `Maximum guests per registration is ${targetEvent.maxGuestsPerRegistration}.`
    );
  }

  return { attendeeName, attendeeEmail, guestsCount };
}

function assertRegistrationBeforeDeadline(deadline: string | null): void {
  if (deadline === null) return;
  const deadlineMs = new Date(deadline).getTime();
  if (!Number.isFinite(deadlineMs) || Date.now() > deadlineMs) {
    throw new PluginValidationError(
      "The registration deadline for this event has passed."
    );
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
    throw new PluginValidationError("Event has reached maximum capacity.");
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

    const safeTitle = payload.eventTitle.replace(/[\r\n]+/g, " ").trim();
    const safeSubject = `${statusHeadline} — ${safeTitle}`
      .replace(/[\r\n]+/g, " ")
      .trim();
    const safeAttendeeName = payload.attendeeName
      .replace(/[\r\n]+/g, " ")
      .trim();

    await emailService.send({
      to: payload.to,
      subject: safeSubject,
      text: [
        `Hello ${safeAttendeeName},`,
        "",
        statusHeadline,
        `Event: ${safeTitle}`,
        `Date: ${payload.occurrenceDate}`,
        `Seats: ${payload.guestsCount}`,
        `Status: ${payload.status.toUpperCase()}`,
      ].join("\n"),
    });
  } catch {
    strapi.log?.debug?.(
      `[events] Could not send RSVP notification email to ${maskEmail(payload.to)}`
    );
  }
}

export function buildRegistrationCreateData(args: {
  targetEvent: ResolvedTargetEvent;
  eventDocumentId: string;
  occurrenceDate: string;
  attendeeName: string;
  attendeeEmail: string;
  guestsCount: number;
  assignedStatus: RsvpStatus;
  tokenHash: string;
  input: RsvpRegistrationInput;
}): Record<string, unknown> {
  const {
    targetEvent,
    eventDocumentId,
    occurrenceDate,
    attendeeName,
    attendeeEmail,
    guestsCount,
    assignedStatus,
    tokenHash,
    input,
  } = args;
  return {
    eventUid: targetEvent.uid,
    eventDocumentId,
    eventTitle: targetEvent.title,
    occurrenceDate,
    attendeeName,
    attendeeEmail,
    attendeePhone: input.attendeePhone
      ? String(input.attendeePhone).trim().slice(0, 50)
      : "",
    guestsCount,
    status: assignedStatus,
    checkInToken: tokenHash,
    locale: input.locale ? String(input.locale).slice(0, 10) : "es",
    notes: input.notes ? String(input.notes).trim().slice(0, 2000) : "",
    metadata: sanitizePlainRecord(input.metadata),
  };
}
