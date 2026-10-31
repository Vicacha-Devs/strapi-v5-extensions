import type { Core } from '@strapi/strapi';
import {
  FORM_BUILDER_CMS_FORM_UID,
  FORM_BUILDER_CMS_SUBMISSION_UID,
  STARTER_FORM_TEMPLATES,
  SUBMISSION_UID,
  type FormBuilderCmsFormSummary,
  type FormRecord,
} from '../../../shared';
import {
  fromFormBuilderCmsRow,
  toFormBuilderCmsPayload,
} from './formBuilderMapper';

export function isFormBuilderCmsAvailable(strapi: Core.Strapi): boolean {
  const hasContentType = Boolean(
    strapi.contentTypes?.[
      FORM_BUILDER_CMS_FORM_UID as keyof typeof strapi.contentTypes
    ]
  );
  const hasDbQuery = typeof strapi.db?.query === 'function';
  return (
    hasDbQuery &&
    (hasContentType ||
      Boolean((strapi as unknown as Record<string, unknown>).__hasFormBuilderCms))
  );
}

export async function countSubmissionsForForm(
  strapi: Core.Strapi,
  formId: number,
  slug: string
): Promise<number> {
  let cmsCount = 0;
  let inboxCount = 0;
  try {
    cmsCount = await strapi.db
      .query(FORM_BUILDER_CMS_SUBMISSION_UID)
      .count({ where: { form: formId } });
  } catch {
    cmsCount = 0;
  }
  try {
    const inboxSubs = await strapi.documents(SUBMISSION_UID).findMany({
      filters: { formSlug: slug },
      limit: 1000,
    });
    inboxCount = Array.isArray(inboxSubs) ? inboxSubs.length : 0;
  } catch {
    inboxCount = 0;
  }
  return Math.max(cmsCount, inboxCount);
}

export async function listFormBuilderForms(strapi: Core.Strapi): Promise<{
  available: boolean;
  forms: FormBuilderCmsFormSummary[];
}> {
  if (!isFormBuilderCmsAvailable(strapi)) {
    return { available: false, forms: [] };
  }

  const cmsForms = (await strapi.db
    .query(FORM_BUILDER_CMS_FORM_UID)
    .findMany({ orderBy: { createdAt: 'desc' } })) as Array<Record<string, unknown>>;

  const summaries: FormBuilderCmsFormSummary[] = await Promise.all(
    (cmsForms || []).map(async (cf) => {
      const parsed = fromFormBuilderCmsRow(cf);
      const id = Number(cf.id);
      const slug = parsed.slug;
      const submissionCount = await countSubmissionsForForm(strapi, id, slug);
      return {
        id,
        documentId: parsed.documentId,
        slug,
        title: parsed.title,
        description: parsed.description || '',
        fieldCount: parsed.fields.length,
        submissionCount: Math.max(submissionCount, parsed.submissionCount || 0),
        publishedAt: parsed.publishedAt || null,
        linkedInboxSlug: slug,
        linkedCategory: parsed.category,
      };
    })
  );

  return { available: true, forms: summaries };
}

export async function syncFormToBuilderCms(
  strapi: Core.Strapi,
  form: FormRecord
): Promise<{ formBuilderId: number; formBuilderSlug: string } | null> {
  if (!isFormBuilderCmsAvailable(strapi)) return null;

  const query = strapi.db.query(FORM_BUILDER_CMS_FORM_UID);
  let existingCms: Record<string, unknown> | null = null;

  if (form.formBuilderId) {
    existingCms = await query.findOne({ where: { id: form.formBuilderId } });
  }
  if (!existingCms && form.formBuilderSlug) {
    existingCms = await query.findOne({ where: { slug: form.formBuilderSlug } });
  }
  if (!existingCms) {
    existingCms = await query.findOne({ where: { slug: form.slug } });
  }

  const payload = toFormBuilderCmsPayload(form, existingCms);
  let savedCms: Record<string, unknown>;
  if (existingCms?.id) {
    savedCms = await query.update({
      where: { id: existingCms.id },
      data: {
        ...payload,
        slug: existingCms.slug || payload.slug,
      },
    });
  } else {
    savedCms = await query.create({
      data: payload,
    });
  }

  return {
    formBuilderId: Number(savedCms.id),
    formBuilderSlug: String(savedCms.slug || form.slug),
  };
}

function shouldBackfillStarterTemplate(
  parsed: FormRecord,
  starterTpl?: FormRecord
): boolean {
  if (!starterTpl) return false;
  const hasTranslations = Object.keys(parsed.translations || {}).length > 0;
  if (hasTranslations) return false;
  return !parsed.checklistTemplate?.length || !starterTpl.checklistTemplate?.length;
}

function pickNonDefaultSetting<T>(
  val: T | undefined,
  fallback: T | undefined,
  defaultVal: T
): T {
  if (val && val !== defaultVal) return val;
  return fallback || defaultVal;
}

function mergeStarterSettings(
  parsedSettings: FormRecord['settings'],
  starterSettings: FormRecord['settings']
): FormRecord['settings'] {
  const baseStarter = starterSettings ?? {};
  const baseParsed = parsedSettings ?? {};
  return {
    ...baseStarter,
    ...baseParsed,
    department: pickNonDefaultSetting(
      baseParsed.department,
      baseStarter.department,
      'general'
    ),
    defaultPriority: pickNonDefaultSetting(
      baseParsed.defaultPriority,
      baseStarter.defaultPriority,
      'normal'
    ),
    enableBookingBridge:
      baseParsed.enableBookingBridge ?? baseStarter.enableBookingBridge,
    enableCertificateBridge:
      baseParsed.enableCertificateBridge ?? baseStarter.enableCertificateBridge,
  };
}

function enrichFormWithStarterTemplate(
  parsed: FormRecord,
  starterTpl?: FormRecord
): FormRecord {
  if (!starterTpl) return parsed;
  const category =
    parsed.category && parsed.category !== 'contact'
      ? parsed.category
      : starterTpl.category;
  const checklistTemplate = parsed.checklistTemplate?.length
    ? parsed.checklistTemplate
    : starterTpl.checklistTemplate || [];
  const translations = Object.keys(parsed.translations || {}).length
    ? parsed.translations
    : starterTpl.translations || {};

  return {
    ...parsed,
    category,
    checklistTemplate,
    translations,
    settings: mergeStarterSettings(parsed.settings, starterTpl.settings),
  };
}

export async function syncFormFromBuilderCms(
  strapi: Core.Strapi,
  cmsForm: Record<string, unknown>
): Promise<FormRecord | null> {
  if (!cmsForm) return null;
  const parsed = fromFormBuilderCmsRow(cmsForm);
  const rawSettings = (cmsForm.settings || {}) as Record<string, unknown>;
  const starterTpl = STARTER_FORM_TEMPLATES.find(
    (t) => t.form.slug === parsed.slug || t.id === parsed.slug
  )?.form;

  const needsBackfill =
    !rawSettings.inbox || shouldBackfillStarterTemplate(parsed, starterTpl);

  if (needsBackfill && cmsForm.id && isFormBuilderCmsAvailable(strapi)) {
    const enriched = enrichFormWithStarterTemplate(parsed, starterTpl);
    const payload = toFormBuilderCmsPayload(enriched, cmsForm);
    const updated = await strapi.db.query(FORM_BUILDER_CMS_FORM_UID).update({
      where: { id: cmsForm.id },
      data: {
        settings: payload.settings,
        publishedData: payload.publishedData,
      },
    });
    return fromFormBuilderCmsRow(updated || cmsForm, enriched);
  }
  return parsed;
}
