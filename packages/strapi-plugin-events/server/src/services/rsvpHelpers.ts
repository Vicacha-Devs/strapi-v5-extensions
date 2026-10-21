import type { Core } from '@strapi/strapi';
import { EVENT_CONTENT_TYPE_UID } from '../../../shared/pluginId';
import type {
  EventSourceMapping,
  RsvpRegistrationRecord,
  RsvpStatus,
} from '../../../shared/types';
import { getDocumentsClient, getSettingsService } from '../types';

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
  const [local, domain] = (email || '').split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
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
        const title = String(doc[src.fields.title] ?? doc.title ?? 'Event');
        const startDate = String(doc[src.fields.startDate] ?? doc.startDate ?? '');
        const rsvpField = src.fields.rsvpEnabled ?? 'rsvpEnabled';
        const capField = src.fields.capacity ?? 'capacity';
        const rsvpEnabled =
          doc[rsvpField] !== undefined ? Boolean(doc[rsvpField]) : true;
        const rawCap = doc[capField];
        const capacity =
          typeof rawCap === 'number' && rawCap > 0 ? Math.floor(rawCap) : null;
        const waitlistEnabled =
          typeof doc.waitlistEnabled === 'boolean'
            ? doc.waitlistEnabled
            : settings.waitlistEnabledByDefault;
        const maxGuestsPerRegistration =
          typeof doc.maxGuestsPerRegistration === 'number' && doc.maxGuestsPerRegistration >= 1
            ? doc.maxGuestsPerRegistration
            : settings.defaultMaxGuestsPerRegistration;
        const registrationDeadline =
          typeof doc.registrationDeadline === 'string' ? doc.registrationDeadline : null;

        return {
          uid: src.uid,
          documentId: eventDocumentId,
          title,
          startDate,
          rsvpEnabled,
          capacity,
          waitlistEnabled,
          maxGuestsPerRegistration,
          registrationDeadline,
        };
      }
    } catch {
      // Continue searching next configured source
    }
  }

  return null;
}

export function formatRegistrationRecord(raw: Record<string, unknown>): RsvpRegistrationRecord {
  return {
    documentId: String(raw.documentId ?? ''),
    eventUid: String(raw.eventUid ?? EVENT_CONTENT_TYPE_UID),
    eventDocumentId: String(raw.eventDocumentId ?? ''),
    eventTitle: raw.eventTitle ? String(raw.eventTitle) : undefined,
    occurrenceDate: String(raw.occurrenceDate ?? ''),
    attendeeName: String(raw.attendeeName ?? ''),
    attendeeEmail: String(raw.attendeeEmail ?? ''),
    attendeePhone: raw.attendeePhone ? String(raw.attendeePhone) : undefined,
    guestsCount:
      typeof raw.guestsCount === 'number' && raw.guestsCount > 0 ? raw.guestsCount : 1,
    status: (raw.status as RsvpStatus) ?? 'confirmed',
    checkedInAt: raw.checkedInAt ? String(raw.checkedInAt) : null,
    locale: String(raw.locale ?? 'es'),
    notes: raw.notes ? String(raw.notes) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
  };
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

    const emailPlugin = strapi.plugin('email');
    const emailService = emailPlugin?.service('email') as
      | { send?: (msg: { to: string; subject: string; text: string }) => Promise<void> }
      | undefined;
    if (!emailService || typeof emailService.send !== 'function') return;

    const statusHeadline = payload.promotedFromWaitlist
      ? 'Your waitlist spot has been confirmed!'
      : payload.status === 'waitlisted'
        ? 'You have been added to the event waitlist'
        : 'Your event registration is confirmed';

    await emailService.send({
      to: payload.to,
      subject: `${statusHeadline} — ${payload.eventTitle}`,
      text: [
        `Hello ${payload.attendeeName},`,
        '',
        statusHeadline,
        `Event: ${payload.eventTitle}`,
        `Date: ${payload.occurrenceDate}`,
        `Seats: ${payload.guestsCount}`,
        `Status: ${payload.status.toUpperCase()}`,
      ].join('\n'),
    });
  } catch {
    strapi.log.debug(
      `[events] Could not send RSVP notification email to ${maskEmail(payload.to)}`
    );
  }
}
