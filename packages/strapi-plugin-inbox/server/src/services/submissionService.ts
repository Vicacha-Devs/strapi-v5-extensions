import { randomBytes } from 'node:crypto';
import type { Core } from '@strapi/strapi';
import {
  FORM_UID,
  PLUGIN_ID,
  SUBMISSION_UID,
  convertIsoDateToCalendar,
  defaultRateLimiter,
  isHoneypotTriggered,
  submissionsToCsv,
  testCaptchaSecretKey,
  validateFormSubmission,
  verifyCaptchaToken,
  type ChecklistItem,
  type FetchLike,
  type FormRecord,
  type InboxSettings,
  type SubmissionPriority,
  type SubmissionRecord,
  type SubmissionStatus,
} from '../../../shared';

function generateReferenceCode(now = new Date()): string {
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = randomBytes(3).toString('hex').toUpperCase();
  return `INB-${datePart}-${randPart}`;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async testCaptchaSecret(provider: 'none' | 'turnstile' | 'recaptcha', secret: string, fetchImpl?: FetchLike) {
    return testCaptchaSecretKey(provider, secret, fetchImpl);
  },

  async submitForm(
    slug: string,
    payload: Record<string, unknown>,
    meta?: {
      ip?: string;
      userAgent?: string;
      locale?: string;
      captchaToken?: string;
      nowMs?: number;
      fetchImpl?: FetchLike;
    }
  ): Promise<SubmissionRecord> {
    const settingsService = strapi.plugin(PLUGIN_ID).service<{
      getSettings(): Promise<InboxSettings>;
    }>('settings');
    const formService = strapi.plugin(PLUGIN_ID).service<{
      findBySlug(slug: string): Promise<FormRecord | null>;
    }>('formService');

    const settings = await settingsService.getSettings();
    const form = await formService.findBySlug(slug);

    if (!form || form.active === false) {
      const err = new Error(`Active form "${slug}" not found`);
      err.name = 'NotFoundError';
      throw err;
    }

    const locale = meta?.locale || (payload.locale as string) || settings.defaultLocale || 'es';
    const honeypotField = form.settings?.honeypotField || settings.defaultHoneypotField || '_website_url';

    if (isHoneypotTriggered(payload, honeypotField)) {
      const err = new Error('Bot submission rejected by honeypot');
      err.name = 'ForbiddenError';
      throw err;
    }

    const rateLimit =
      form.settings?.rateLimitPerHour ?? settings.defaultRateLimitPerHour ?? 15;
    const ip = meta?.ip || '127.0.0.1';
    const limitCheck = defaultRateLimiter.check(ip, slug, rateLimit, meta?.nowMs);
    if (!limitCheck.allowed) {
      const err = new Error(
        `Rate limit exceeded. Try again in ${limitCheck.retryAfterSeconds}s`
      );
      err.name = 'TooManyRequestsError';
      throw err;
    }

    const captchaProvider =
      form.settings?.captchaProvider || settings.defaultCaptchaProvider || 'none';
    if (captchaProvider !== 'none') {
      const secret =
        form.settings?.captchaSecretKey ||
        (captchaProvider === 'turnstile'
          ? settings.turnstileSecretKey
          : settings.recaptchaSecretKey) ||
        '';
      const token =
        meta?.captchaToken ||
        (payload.captchaToken as string) ||
        (payload['cf-turnstile-response'] as string) ||
        (payload['g-recaptcha-response'] as string) ||
        '';

      const verified = await verifyCaptchaToken(
        captchaProvider,
        secret,
        token,
        ip,
        meta?.fetchImpl
      );
      if (!verified) {
        const err = new Error('CAPTCHA verification failed');
        err.name = 'ValidationError';
        throw err;
      }
    }

    const validation = validateFormSubmission(form.fields || [], payload, locale);
    if (!validation.valid) {
      const firstField = Object.keys(validation.errors)[0];
      const firstError = validation.errors[firstField]?.[0] || 'Validation failed';
      const err = new Error(firstError) as Error & { details?: Record<string, string[]> };
      err.name = 'ValidationError';
      err.details = validation.errors;
      throw err;
    }

    const cleaned = validation.cleanedData;
    const applicantName = String(
      cleaned.applicantName || cleaned.fullName || cleaned.name || payload.applicantName || ''
    ).trim();
    const applicantEmail = String(
      cleaned.applicantEmail || cleaned.email || payload.applicantEmail || ''
    ).trim();
    const applicantPhone = String(
      cleaned.applicantPhone || cleaned.phone || payload.applicantPhone || ''
    ).trim();

    const nowIso = new Date(meta?.nowMs ?? Date.now()).toISOString();
    const secondaryCal = settings.secondaryCalendars?.[0] || 'islamic-umalqura';
    const converted = convertIsoDateToCalendar(nowIso.slice(0, 10), secondaryCal, locale);

    const checklistItems: ChecklistItem[] = (form.checklistTemplate || []).map((item) => ({
      ...item,
      verified: false,
    }));

    const submissionData: Omit<SubmissionRecord, 'documentId'> = {
      referenceCode: generateReferenceCode(new Date(meta?.nowMs ?? Date.now())),
      formSlug: form.slug,
      formTitle: form.title,
      category: form.category || 'contact',
      status: 'new',
      priority: form.settings?.defaultPriority || 'normal',
      department: form.settings?.department || 'general',
      locale,
      applicantName: applicantName || undefined,
      applicantEmail: applicantEmail || undefined,
      applicantPhone: applicantPhone || undefined,
      data: cleaned,
      checklistItems,
      ipAddress: ip,
      userAgent: meta?.userAgent || '',
      submittedAt: nowIso,
      secondaryDate: {
        formatted: converted.formatted,
        year: converted.year,
        month: converted.month,
        day: converted.day,
      },
    };

    const created = (await strapi.documents(SUBMISSION_UID).create({
      data: submissionData as unknown as Record<string, unknown>,
    })) as unknown as SubmissionRecord;

    if (form.documentId) {
      await strapi.documents(FORM_UID).update({
        documentId: form.documentId,
        data: {
          submissionCount: (form.submissionCount || 0) + 1,
        },
      });
    }

    strapi.eventHub?.emit('inbox.submission.created', {
      submission: created,
      formSlug: form.slug,
    });

    return created;
  },

  async listSubmissions(filters?: {
    formSlug?: string;
    status?: SubmissionStatus;
    priority?: SubmissionPriority;
    department?: string;
    limit?: number;
  }): Promise<SubmissionRecord[]> {
    const queryFilters: Record<string, unknown> = {};
    if (filters?.formSlug) queryFilters.formSlug = filters.formSlug;
    if (filters?.status) queryFilters.status = filters.status;
    if (filters?.priority) queryFilters.priority = filters.priority;
    if (filters?.department) queryFilters.department = filters.department;

    const docs = (await strapi.documents(SUBMISSION_UID).findMany({
      filters: queryFilters,
      limit: filters?.limit || 100,
    })) as unknown as SubmissionRecord[];

    return docs;
  },

  async updateCasework(
    documentId: string,
    patch: {
      status?: SubmissionStatus;
      priority?: SubmissionPriority;
      department?: string;
      staffNotes?: string;
      assignedTo?: string;
      checklistItems?: ChecklistItem[];
    }
  ): Promise<SubmissionRecord> {
    const existing = (await strapi.documents(SUBMISSION_UID).findOne({
      documentId,
    })) as unknown as SubmissionRecord | null;

    if (!existing) {
      throw new Error(`Submission "${documentId}" not found`);
    }

    const updated = (await strapi.documents(SUBMISSION_UID).update({
      documentId,
      data: {
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.priority ? { priority: patch.priority } : {}),
        ...(patch.department !== undefined ? { department: patch.department } : {}),
        ...(patch.staffNotes !== undefined ? { staffNotes: patch.staffNotes } : {}),
        ...(patch.assignedTo !== undefined ? { assignedTo: patch.assignedTo } : {}),
        ...(patch.checklistItems ? { checklistItems: patch.checklistItems } : {}),
      },
    })) as unknown as SubmissionRecord;

    strapi.eventHub?.emit('inbox.submission.updated', {
      submission: updated,
    });

    return updated;
  },

  async scheduleBookingFromSubmission(
    documentId: string,
    bookingInput: {
      serviceSlug: string;
      date: string;
      startTime: string;
      endTime?: string;
      notes?: string;
    }
  ): Promise<{ submission: SubmissionRecord; bookingId: string }> {
    const existing = (await strapi.documents(SUBMISSION_UID).findOne({
      documentId,
    })) as unknown as SubmissionRecord | null;

    if (!existing) {
      throw new Error(`Submission "${documentId}" not found`);
    }

    let bookingId = `BKG-${existing.referenceCode}`;

    try {
      const bookingsPlugin = strapi.plugin('bookings');
      const bookingSvc = bookingsPlugin?.service<{
        createBooking?: (data: Record<string, unknown>) => Promise<{ documentId?: string; referenceCode?: string }>;
      }>('bookingService');

      if (bookingSvc?.createBooking) {
        const createdBooking = await bookingSvc.createBooking({
          serviceSlug: bookingInput.serviceSlug,
          date: bookingInput.date,
          startTime: bookingInput.startTime,
          endTime: bookingInput.endTime || '11:00',
          requesterName: existing.applicantName || 'Applicant',
          requesterEmail: existing.applicantEmail || 'noreply@example.org',
          requesterPhone: existing.applicantPhone || '',
          notes: bookingInput.notes || `Casework Ref: ${existing.referenceCode}`,
        });
        bookingId =
          createdBooking?.referenceCode || createdBooking?.documentId || bookingId;
      }
    } catch {
      // Fallback to deterministic booking reference if bookings plugin is not mounted
    }

    const updated = (await strapi.documents(SUBMISSION_UID).update({
      documentId,
      data: {
        status: 'scheduled',
        linkedBookingId: bookingId,
      },
    })) as unknown as SubmissionRecord;

    return { submission: updated, bookingId };
  },

  async issueCertificateFromSubmission(
    documentId: string,
    certInput?: {
      templateSlug?: string;
      recipientName?: string;
      requireChecklistVerified?: boolean;
    }
  ): Promise<{ submission: SubmissionRecord; certificateNumber: string }> {
    const existing = (await strapi.documents(SUBMISSION_UID).findOne({
      documentId,
    })) as unknown as SubmissionRecord | null;

    if (!existing) {
      throw new Error(`Submission "${documentId}" not found`);
    }

    if (certInput?.requireChecklistVerified !== false) {
      const unverifiedRequired = (existing.checklistItems || []).filter(
        (item) => item.required && !item.verified
      );
      if (unverifiedRequired.length > 0) {
        throw new Error(
          `Cannot issue certificate: ${unverifiedRequired.length} required document(s) are not yet verified`
        );
      }
    }

    let certificateNumber = `CERT-${existing.referenceCode}`;

    try {
      const certsPlugin = strapi.plugin('certificates');
      const certSvc = certsPlugin?.service<{
        issueCertificate?: (data: Record<string, unknown>) => Promise<{ certificateNumber?: string }>;
      }>('certificateService');

      if (certSvc?.issueCertificate) {
        const issued = await certSvc.issueCertificate({
          templateSlug: certInput?.templateSlug || 'official-service-certificate',
          recipientName:
            certInput?.recipientName || existing.applicantName || 'Applicant',
          recipientEmail: existing.applicantEmail,
          metadata: {
            submissionReference: existing.referenceCode,
            formSlug: existing.formSlug,
          },
        });
        if (issued?.certificateNumber) {
          certificateNumber = issued.certificateNumber;
        }
      }
    } catch {
      // Fallback to deterministic certificate reference when certificates plugin is not mounted
    }

    const updated = (await strapi.documents(SUBMISSION_UID).update({
      documentId,
      data: {
        status: 'completed',
        linkedCertificateNumber: certificateNumber,
      },
    })) as unknown as SubmissionRecord;

    return { submission: updated, certificateNumber };
  },

  async exportCsv(formSlug?: string): Promise<string> {
    const submissions = await this.listSubmissions(
      formSlug ? { formSlug, limit: 1000 } : { limit: 1000 }
    );
    let fields: FormRecord['fields'] = [];
    if (formSlug) {
      const formService = strapi.plugin(PLUGIN_ID).service<{
        findBySlug(slug: string): Promise<FormRecord | null>;
      }>('formService');
      const form = await formService.findBySlug(formSlug);
      fields = form?.fields || [];
    }
    return submissionsToCsv(submissions, fields);
  },
});
