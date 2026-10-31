import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  SUBMISSION_UID,
  convertIsoDateToCalendar,
  defaultRateLimiter,
  isHoneypotTriggered,
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
} from "../../../shared";
import { getDocuments } from "./docHelper";
import {
  exportSubmissionsCsv,
  issueCertificateFromSubmission,
  scheduleBookingFromSubmission,
} from "./submissionEcosystemBridges";
import {
  generateReferenceCode,
  ingestFormBuilderSubmission,
  mirrorSubmissionToFormBuilderCms,
  syncSubmissionsFromFormBuilderCms,
} from "./submissionFormBuilderBridge";

function firstStr(...vals: unknown[]): string {
  for (const val of vals) {
    if (typeof val === "string" && val.trim().length > 0) return val.trim();
  }
  return "";
}

function enforceHoneypotAndRateLimit(
  form: FormRecord,
  settings: InboxSettings,
  payload: Record<string, unknown>,
  ip: string,
  nowMs?: number
): void {
  const honeypotField =
    firstStr(form.settings?.honeypotField, settings.defaultHoneypotField) || "_website_url";
  if (isHoneypotTriggered(payload, honeypotField)) {
    const err = new Error("Bot submission rejected by honeypot");
    err.name = "ForbiddenError";
    throw err;
  }

  const rateLimit = form.settings?.rateLimitPerHour ?? settings.defaultRateLimitPerHour ?? 15;
  const limitCheck = defaultRateLimiter.check(ip, form.slug, rateLimit, nowMs);
  if (!limitCheck.allowed) {
    const err = new Error(`Rate limit exceeded. Try again in ${limitCheck.retryAfterSeconds}s`);
    err.name = "TooManyRequestsError";
    throw err;
  }
}

async function enforceCaptchaVerification(
  form: FormRecord,
  settings: InboxSettings,
  payload: Record<string, unknown>,
  ip: string,
  meta?: { captchaToken?: string; fetchImpl?: FetchLike }
): Promise<void> {
  const captchaProvider =
    form.settings?.captchaProvider || settings.defaultCaptchaProvider || "none";
  if (captchaProvider === "none") return;

  const providerSecret =
    captchaProvider === "turnstile" ? settings.turnstileSecretKey : settings.recaptchaSecretKey;
  const secret = firstStr(form.settings?.captchaSecretKey, providerSecret);
  const token = firstStr(
    meta?.captchaToken,
    payload.captchaToken,
    payload["cf-turnstile-response"],
    payload["g-recaptcha-response"]
  );

  const verified = await verifyCaptchaToken(captchaProvider, secret, token, ip, meta?.fetchImpl);
  if (!verified) {
    const err = new Error("CAPTCHA verification failed");
    err.name = "ValidationError";
    throw err;
  }
}

function validateOrThrow(
  form: FormRecord,
  payload: Record<string, unknown>,
  locale: string
): Record<string, unknown> {
  const validation = validateFormSubmission(form.fields || [], payload, locale);
  if (!validation.valid) {
    const firstField = Object.keys(validation.errors)[0];
    const firstError = validation.errors[firstField]?.[0] || "Validation failed";
    const err = new Error(firstError) as Error & {
      details?: Record<string, string[]>;
    };
    err.name = "ValidationError";
    err.details = validation.errors;
    throw err;
  }
  return validation.cleanedData;
}

function buildSubmissionDataRecord(params: {
  form: FormRecord;
  settings: InboxSettings;
  cleaned: Record<string, unknown>;
  payload: Record<string, unknown>;
  locale: string;
  ip: string;
  userAgent: string;
  nowMs?: number;
  mirroredCmsSubmissionId: number | null;
}): Omit<SubmissionRecord, "documentId"> {
  const {
    form,
    settings,
    cleaned,
    payload,
    locale,
    ip,
    userAgent,
    nowMs,
    mirroredCmsSubmissionId,
  } = params;
  const applicantName = firstStr(
    cleaned.applicantName,
    cleaned.fullName,
    cleaned.name,
    payload.applicantName
  );
  const applicantEmail = firstStr(cleaned.applicantEmail, cleaned.email, payload.applicantEmail);
  const applicantPhone = firstStr(cleaned.applicantPhone, cleaned.phone, payload.applicantPhone);

  const timestamp = nowMs ?? Date.now();
  const nowIso = new Date(timestamp).toISOString();
  const secondaryCal = settings.secondaryCalendars?.[0] ?? "islamic-umalqura";
  const converted = convertIsoDateToCalendar(nowIso.slice(0, 10), secondaryCal, locale);
  const checklistItems: ChecklistItem[] = (form.checklistTemplate ?? []).map((item) => ({
    ...item,
    verified: false,
  }));

  return {
    referenceCode: generateReferenceCode(new Date(timestamp)),
    formSlug: form.slug,
    formTitle: form.title,
    category: form.category ?? "contact",
    status: "new",
    priority: form.settings?.defaultPriority ?? "normal",
    department: form.settings?.department ?? "general",
    locale,
    applicantName: applicantName || undefined,
    applicantEmail: applicantEmail || undefined,
    applicantPhone: applicantPhone || undefined,
    data: cleaned,
    checklistItems,
    formBuilderSubmissionId: mirroredCmsSubmissionId,
    ipAddress: ip,
    userAgent,
    submittedAt: nowIso,
    secondaryDate: {
      formatted: converted.formatted,
      year: converted.year,
      month: converted.month,
      day: converted.day,
    },
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async testCaptchaSecret(
    provider: "none" | "turnstile" | "recaptcha",
    secret: string,
    fetchImpl?: FetchLike
  ) {
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
    }>("settings");
    const formService = strapi.plugin(PLUGIN_ID).service<{
      findBySlug(slug: string): Promise<FormRecord | null>;
    }>("formService");

    const settings = await settingsService.getSettings();
    const form = await formService.findBySlug(slug);

    if (!form || form.active === false) {
      const err = new Error(`Active form "${slug}" not found`);
      err.name = "NotFoundError";
      throw err;
    }

    const locale = firstStr(meta?.locale, payload.locale, settings.defaultLocale) || "es";
    const ip = firstStr(meta?.ip) || "127.0.0.1";
    const userAgent = firstStr(meta?.userAgent);

    enforceHoneypotAndRateLimit(form, settings, payload, ip, meta?.nowMs);
    await enforceCaptchaVerification(form, settings, payload, ip, meta);
    const cleaned = validateOrThrow(form, payload, locale);

    const mirroredCmsSubmissionId = await mirrorSubmissionToFormBuilderCms(strapi, {
      settings,
      form,
      cleanedData: cleaned,
      ip,
      userAgent,
    });

    const submissionData = buildSubmissionDataRecord({
      form,
      settings,
      cleaned,
      payload,
      locale,
      ip,
      userAgent,
      nowMs: meta?.nowMs,
      mirroredCmsSubmissionId,
    });

    const created = (await getDocuments(strapi, SUBMISSION_UID).create({
      data: submissionData as unknown as Record<string, unknown>,
    })) as unknown as SubmissionRecord;

    strapi.eventHub?.emit("inbox.submission.created", {
      submission: created,
      formSlug: form.slug,
    });

    return created;
  },

  async ingestFormBuilderSubmission(
    cmsSubmission: Record<string, unknown>,
    meta?: {
      formId?: number;
      formSlug?: string;
      nowMs?: number;
    }
  ): Promise<SubmissionRecord | null> {
    return ingestFormBuilderSubmission(strapi, cmsSubmission, meta);
  },

  async listSubmissions(filters?: {
    formSlug?: string;
    status?: SubmissionStatus;
    priority?: SubmissionPriority;
    department?: string;
    limit?: number;
  }): Promise<SubmissionRecord[]> {
    await syncSubmissionsFromFormBuilderCms(strapi);

    const queryFilters: Record<string, unknown> = {};
    if (filters?.formSlug) queryFilters.formSlug = filters.formSlug;
    if (filters?.status) queryFilters.status = filters.status;
    if (filters?.priority) queryFilters.priority = filters.priority;
    if (filters?.department) queryFilters.department = filters.department;

    const docs = (await getDocuments(strapi, SUBMISSION_UID).findMany({
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
    const existing = (await getDocuments(strapi, SUBMISSION_UID).findOne({
      documentId,
    })) as unknown as SubmissionRecord | null;

    if (!existing) {
      throw new Error(`Submission "${documentId}" not found`);
    }

    const updated = (await getDocuments(strapi, SUBMISSION_UID).update({
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

    strapi.eventHub?.emit("inbox.submission.updated", {
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
    return scheduleBookingFromSubmission(strapi, documentId, bookingInput);
  },

  async issueCertificateFromSubmission(
    documentId: string,
    certInput?: {
      templateSlug?: string;
      recipientName?: string;
      requireChecklistVerified?: boolean;
    }
  ): Promise<{ submission: SubmissionRecord; certificateNumber: string }> {
    return issueCertificateFromSubmission(strapi, documentId, certInput);
  },

  async exportCsv(formSlug?: string): Promise<string> {
    const submissions = await this.listSubmissions(
      formSlug ? { formSlug, limit: 1000 } : { limit: 1000 }
    );
    return exportSubmissionsCsv(strapi, submissions, formSlug);
  },
});
