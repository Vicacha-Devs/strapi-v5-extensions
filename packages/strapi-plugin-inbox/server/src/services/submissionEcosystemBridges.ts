import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  SUBMISSION_UID,
  submissionsToCsv,
  type FormRecord,
  type SubmissionRecord,
} from "../../../shared";
import { getDocuments } from "./docHelper";

async function tryCreatePluginBooking(
  strapi: Core.Strapi,
  existing: SubmissionRecord,
  bookingInput: {
    serviceSlug: string;
    date: string;
    startTime: string;
    endTime?: string;
    notes?: string;
  },
  fallbackId: string
): Promise<string> {
  try {
    const bookingsPlugin = strapi.plugin("bookings");
    const bookingSvc = bookingsPlugin?.service<{
      createBooking?: (data: Record<string, unknown>) => Promise<{
        documentId?: string;
        referenceCode?: string;
      }>;
    }>("bookingService");

    if (!bookingSvc?.createBooking) return fallbackId;
    const createdBooking = await bookingSvc.createBooking({
      serviceSlug: bookingInput.serviceSlug,
      date: bookingInput.date,
      startTime: bookingInput.startTime,
      endTime: bookingInput.endTime ?? "11:00",
      requesterName: existing.applicantName ?? "Applicant",
      requesterEmail: existing.applicantEmail ?? "noreply@example.org",
      requesterPhone: existing.applicantPhone ?? "",
      notes: bookingInput.notes ?? `Casework Ref: ${existing.referenceCode}`,
    });
    return (
      createdBooking?.referenceCode || createdBooking?.documentId || fallbackId
    );
  } catch {
    return fallbackId;
  }
}

export async function scheduleBookingFromSubmission(
  strapi: Core.Strapi,
  documentId: string,
  bookingInput: {
    serviceSlug: string;
    date: string;
    startTime: string;
    endTime?: string;
    notes?: string;
  }
): Promise<{ submission: SubmissionRecord; bookingId: string }> {
  const existing = (await getDocuments(strapi, SUBMISSION_UID).findOne({
    documentId,
  })) as unknown as SubmissionRecord | null;

  if (!existing) {
    throw new Error(`Submission "${documentId}" not found`);
  }

  const bookingId = await tryCreatePluginBooking(
    strapi,
    existing,
    bookingInput,
    `BKG-${existing.referenceCode}`
  );

  const updated = (await getDocuments(strapi, SUBMISSION_UID).update({
    documentId,
    data: {
      status: "scheduled",
      linkedBookingId: bookingId,
    },
  })) as unknown as SubmissionRecord;

  return { submission: updated, bookingId };
}

function assertRequiredChecklistVerified(
  existing: SubmissionRecord,
  requireVerified?: boolean
): void {
  if (requireVerified === false) return;
  const unverifiedRequired = (existing.checklistItems || []).filter(
    (item) => item.required && !item.verified
  );
  if (unverifiedRequired.length > 0) {
    throw new Error(
      `Cannot issue certificate: ${unverifiedRequired.length} required document(s) are not yet verified`
    );
  }
}

async function tryIssuePluginCertificate(
  strapi: Core.Strapi,
  existing: SubmissionRecord,
  certInput:
    | {
        templateSlug?: string;
        recipientName?: string;
      }
    | undefined,
  fallbackCertNumber: string
): Promise<string> {
  try {
    const certsPlugin = strapi.plugin("certificates");
    const certSvc =
      certsPlugin?.service<{
        issueCertificate?: (data: Record<string, unknown>) => Promise<{
          serialNumber?: string;
          certificateNumber?: string;
        }>;
      }>("issuance") ??
      certsPlugin?.service<{
        issueCertificate?: (data: Record<string, unknown>) => Promise<{
          serialNumber?: string;
          certificateNumber?: string;
        }>;
      }>("certificateService");

    if (!certSvc?.issueCertificate) return fallbackCertNumber;
    const recipientFullName =
      certInput?.recipientName || existing.applicantName || "Applicant";
    const issued = await certSvc.issueCertificate({
      templateSlug: certInput?.templateSlug || "official-service-certificate",
      recipientName: recipientFullName,
      recipientFullName,
      recipientEmail: existing.applicantEmail,
      metadata: {
        submissionReference: existing.referenceCode,
        formSlug: existing.formSlug,
      },
    });
    return (
      issued?.serialNumber || issued?.certificateNumber || fallbackCertNumber
    );
  } catch {
    return fallbackCertNumber;
  }
}

export async function issueCertificateFromSubmission(
  strapi: Core.Strapi,
  documentId: string,
  certInput?: {
    templateSlug?: string;
    recipientName?: string;
    requireChecklistVerified?: boolean;
  }
): Promise<{ submission: SubmissionRecord; certificateNumber: string }> {
  const existing = (await getDocuments(strapi, SUBMISSION_UID).findOne({
    documentId,
  })) as unknown as SubmissionRecord | null;

  if (!existing) {
    throw new Error(`Submission "${documentId}" not found`);
  }

  assertRequiredChecklistVerified(
    existing,
    certInput?.requireChecklistVerified
  );

  const certificateNumber = await tryIssuePluginCertificate(
    strapi,
    existing,
    certInput,
    `CERT-${existing.referenceCode}`
  );

  const updated = (await getDocuments(strapi, SUBMISSION_UID).update({
    documentId,
    data: {
      status: "completed",
      linkedCertificateNumber: certificateNumber,
    },
  })) as unknown as SubmissionRecord;

  return { submission: updated, certificateNumber };
}

export async function exportSubmissionsCsv(
  strapi: Core.Strapi,
  submissions: SubmissionRecord[],
  formSlug?: string
): Promise<string> {
  let fields: FormRecord["fields"] = [];
  if (formSlug) {
    const formService = strapi.plugin(PLUGIN_ID).service<{
      findBySlug(slug: string): Promise<FormRecord | null>;
    }>("formService");
    const form = await formService.findBySlug(formSlug);
    fields = form?.fields || [];
  }
  return submissionsToCsv(submissions, fields);
}
