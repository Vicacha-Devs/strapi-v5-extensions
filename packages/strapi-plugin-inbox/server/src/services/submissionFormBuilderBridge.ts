import { randomBytes } from 'node:crypto';
import type { Core } from '@strapi/strapi';
import {
  DECORATIVE_FIELD_TYPES,
  FORM_BUILDER_CMS_FORM_UID,
  FORM_BUILDER_CMS_SUBMISSION_UID,
  FORM_UID,
  PLUGIN_ID,
  SUBMISSION_UID,
  convertIsoDateToCalendar,
  type ChecklistItem,
  type FormRecord,
  type InboxSettings,
  type SubmissionRecord,
} from '../../../shared';

let mirroringToFormBuilderCms = false;

export function generateReferenceCode(now = new Date()): string {
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = randomBytes(3).toString('hex').toUpperCase();
  return `INB-${datePart}-${randPart}`;
}

export async function mirrorSubmissionToFormBuilderCms(
  strapi: Core.Strapi,
  params: {
    settings: InboxSettings;
    form: FormRecord;
    cleanedData: Record<string, unknown>;
    ip: string;
    userAgent: string;
  }
): Promise<number | null> {
  const { settings, form, cleanedData, ip, userAgent } = params;
  if (
    settings.enableFormBuilderBridge === false ||
    !form.formBuilderId ||
    typeof strapi.db?.query !== 'function' ||
    !(
      strapi.contentTypes?.[
        FORM_BUILDER_CMS_SUBMISSION_UID as keyof typeof strapi.contentTypes
      ] ||
      Boolean((strapi as unknown as Record<string, unknown>).__hasFormBuilderCms)
    )
  ) {
    return null;
  }

  try {
    mirroringToFormBuilderCms = true;
    const fieldsSnapshot = (form.fields || [])
      .filter((f) => !DECORATIVE_FIELD_TYPES.includes(f.type))
      .map((f, idx) => ({
        name: f.name,
        label: f.label,
        type: f.type,
        order: idx,
        options: f.options,
      }));
    const cmsSub = await strapi.db
      .query(FORM_BUILDER_CMS_SUBMISSION_UID)
      .create({
        data: {
          form: form.formBuilderId,
          data: cleanedData,
          fields: fieldsSnapshot,
          ipAddress: ip,
          userAgent,
          status: 'new',
        },
      });
    return cmsSub?.id ? Number(cmsSub.id) : null;
  } catch {
    return null;
  } finally {
    mirroringToFormBuilderCms = false;
  }
}

function resolveCmsSubmissionFormRef(
  cmsSubmission: Record<string, unknown>,
  meta?: { formId?: number; formSlug?: string }
): { formId: number | null; formSlug: string } {
  let formId = meta?.formId ?? null;
  let formSlug = meta?.formSlug ?? '';
  const rawFormRel = cmsSubmission.form;
  if (typeof rawFormRel === 'number') {
    formId = rawFormRel;
  } else if (rawFormRel && typeof rawFormRel === 'object') {
    const relObj = rawFormRel as Record<string, unknown>;
    if (relObj.id) formId = Number(relObj.id);
    if (relObj.slug) formSlug = String(relObj.slug);
  }
  return { formId, formSlug };
}

async function resolveTargetInboxForm(
  strapi: Core.Strapi,
  formService: {
    findBySlug(slug: string): Promise<FormRecord | null>;
    syncFormFromBuilderCms(cmsForm: Record<string, unknown>): Promise<FormRecord | null>;
  },
  formId: number | null,
  formSlug: string
): Promise<FormRecord | null> {
  if (formId !== null && typeof strapi.db?.query === 'function') {
    const cmsForm = await strapi.db
      .query(FORM_BUILDER_CMS_FORM_UID)
      .findOne({ where: { id: formId } });
    if (cmsForm) {
      const synced = await formService.syncFormFromBuilderCms(cmsForm);
      if (synced) return synced;
    }
  }
  return formSlug ? formService.findBySlug(formSlug) : null;
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const val of values) {
    if (val !== undefined && val !== null) {
      const str = String(val).trim();
      if (str.length > 0) return str;
    }
  }
  return undefined;
}

function extractApplicantDetails(rawData: Record<string, unknown>): {
  applicantName?: string;
  applicantEmail?: string;
  applicantPhone?: string;
} {
  const firstLast = [rawData.firstName, rawData.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return {
    applicantName: firstNonEmptyString(
      rawData.applicantName,
      rawData.fullName,
      rawData.name,
      firstLast
    ),
    applicantEmail: firstNonEmptyString(rawData.applicantEmail, rawData.email),
    applicantPhone: firstNonEmptyString(
      rawData.applicantPhone,
      rawData.phone,
      rawData.tel
    ),
  };
}

function extractRawSubmissionData(
  cmsSubmission: Record<string, unknown>
): Record<string, unknown> {
  return cmsSubmission.data && typeof cmsSubmission.data === 'object'
    ? (cmsSubmission.data as Record<string, unknown>)
    : {};
}

function resolveIngestionTimestamp(
  cmsSubmission: Record<string, unknown>,
  nowMs?: number
): string {
  if (cmsSubmission.createdAt) {
    return new Date(String(cmsSubmission.createdAt)).toISOString();
  }
  return new Date(nowMs ?? Date.now()).toISOString();
}

function buildIngestedSubmissionPayload(params: {
  cmsSubmission: Record<string, unknown>;
  inboxForm: FormRecord | null;
  formSlug: string;
  cmsSubId: number | null;
  settings: InboxSettings;
  nowMs?: number;
}): { resolvedSlug: string; submissionData: Omit<SubmissionRecord, 'documentId'> } {
  const { cmsSubmission, inboxForm, formSlug, cmsSubId, settings, nowMs } = params;
  const rawData = extractRawSubmissionData(cmsSubmission);
  const applicant = extractApplicantDetails(rawData);
  const locale = firstNonEmptyString(rawData.locale, settings.defaultLocale, 'es')!;
  const nowIso = resolveIngestionTimestamp(cmsSubmission, nowMs);
  const secondaryCal = firstNonEmptyString(
    settings.secondaryCalendars?.[0],
    'islamic-umalqura'
  )!;
  const converted = convertIsoDateToCalendar(nowIso.slice(0, 10), secondaryCal, locale);
  const templateItems = inboxForm?.checklistTemplate;
  const checklistItems: ChecklistItem[] = (templateItems ? templateItems : []).map(
    (item) => ({ ...item, verified: false })
  );
  const resolvedSlug = firstNonEmptyString(
    inboxForm?.slug,
    formSlug,
    'visual-form'
  )!;

  return {
    resolvedSlug,
    submissionData: {
      referenceCode: generateReferenceCode(new Date(nowIso)),
      formSlug: resolvedSlug,
      formTitle: firstNonEmptyString(inboxForm?.title, resolvedSlug)!,
      category: (firstNonEmptyString(inboxForm?.category, 'contact') as FormRecord['category'])!,
      status: 'new',
      priority: (firstNonEmptyString(
        inboxForm?.settings?.defaultPriority,
        'normal'
      ) as SubmissionRecord['priority'])!,
      department: firstNonEmptyString(inboxForm?.settings?.department, 'general')!,
      locale,
      ...applicant,
      data: rawData,
      checklistItems,
      formBuilderSubmissionId: cmsSubId,
      ipAddress: firstNonEmptyString(cmsSubmission.ipAddress, '127.0.0.1')!,
      userAgent: firstNonEmptyString(cmsSubmission.userAgent) || '',
      submittedAt: nowIso,
      secondaryDate: {
        formatted: converted.formatted,
        year: converted.year,
        month: converted.month,
        day: converted.day,
      },
    },
  };
}

async function findExistingByCmsSubId(
  strapi: Core.Strapi,
  cmsSubId: number | null
): Promise<SubmissionRecord | null> {
  if (cmsSubId === null) return null;
  const existingSub = await strapi.documents(SUBMISSION_UID).findMany({
    filters: { formBuilderSubmissionId: cmsSubId },
    limit: 1,
  });
  return existingSub && existingSub.length > 0
    ? (existingSub[0] as unknown as SubmissionRecord)
    : null;
}

export async function ingestFormBuilderSubmission(
  strapi: Core.Strapi,
  cmsSubmission: Record<string, unknown>,
  meta?: {
    formId?: number;
    formSlug?: string;
    nowMs?: number;
  }
): Promise<SubmissionRecord | null> {
  if (mirroringToFormBuilderCms || !cmsSubmission) return null;

  const settingsService = strapi.plugin(PLUGIN_ID).service<{
    getSettings(): Promise<InboxSettings>;
  }>('settings');
  const formService = strapi.plugin(PLUGIN_ID).service<{
    findBySlug(slug: string): Promise<FormRecord | null>;
    syncFormFromBuilderCms(cmsForm: Record<string, unknown>): Promise<FormRecord | null>;
  }>('formService');

  const settings = await settingsService.getSettings();
  if (settings.enableFormBuilderBridge === false) return null;

  const cmsSubId = cmsSubmission.id ? Number(cmsSubmission.id) : null;
  const existing = await findExistingByCmsSubId(strapi, cmsSubId);
  if (existing) return existing;

  const { formId, formSlug } = resolveCmsSubmissionFormRef(cmsSubmission, meta);
  const inboxForm = await resolveTargetInboxForm(strapi, formService, formId, formSlug);
  const { resolvedSlug, submissionData } = buildIngestedSubmissionPayload({
    cmsSubmission,
    inboxForm,
    formSlug,
    cmsSubId,
    settings,
    nowMs: meta?.nowMs,
  });

  const created = (await strapi.documents(SUBMISSION_UID).create({
    data: submissionData as unknown as Record<string, unknown>,
  })) as unknown as SubmissionRecord;

  strapi.eventHub?.emit('inbox.submission.created', {
    submission: created,
    formSlug: resolvedSlug,
    source: 'strapi-plugin-form-builder-cms',
  });

  return created;
}
