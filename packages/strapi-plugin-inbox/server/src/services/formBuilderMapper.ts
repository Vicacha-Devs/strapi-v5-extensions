import {
  localizeFormForLocale,
  type ChecklistItem,
  type FormCategory,
  type FormField,
  type FormRecord,
  type FormSettings,
  type FormTranslation,
  type SubmissionPriority,
} from '../../../shared';

export interface EmbeddedInboxMetadata {
  category?: FormCategory;
  checklistTemplate?: ChecklistItem[];
  translations?: Record<string, FormTranslation>;
  active?: boolean;
  submissionCount?: number;
  department?: string;
  defaultPriority?: SubmissionPriority;
  honeypotField?: string;
  webhookUrl?: string;
  enableBookingBridge?: boolean;
  defaultBookingServiceSlug?: string;
  enableCertificateBridge?: boolean;
  defaultCertificateTemplateId?: string;
  localizedSubmitLabels?: Record<string, string>;
  localizedSuccessMessages?: Record<string, string>;
}

export function sanitizePublicForm(form: FormRecord, locale?: string): FormRecord {
  const localized = locale ? localizeFormForLocale(form, locale) : { ...form };
  const safeSettings = { ...(localized.settings || {}) };
  delete safeSettings.captchaSecretKey;
  delete safeSettings.notifyEmails;
  delete safeSettings.webhookUrl;

  return {
    ...localized,
    settings: safeSettings,
  };
}

function pick<T>(...values: Array<T | undefined | null>): T {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return values[values.length - 1] as T;
}

function pickDef<T>(...values: Array<T | undefined | null>): T {
  for (const v of values) {
    if (v !== undefined && v !== null) return v;
  }
  return values[values.length - 1] as T;
}

function asObj(val: unknown): Record<string, unknown> {
  return val && typeof val === 'object' ? (val as Record<string, unknown>) : {};
}

function resolveFieldWidth(width?: string): 'half' | 'third' | 'full' {
  if (width === 'half' || width === 'third') return width;
  return 'full';
}

function mapFieldToCms(f: FormField, idx: number): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    id: pick(f.id, `fld_${idx + 1}`),
    type: f.type === 'file' ? 'text' : f.type,
    name: f.name,
    label: f.label,
    placeholder: pick(f.placeholder, ''),
    helpText: pick(f.helpText, ''),
    defaultValue: f.defaultValue,
    required: Boolean(f.required),
    order: idx,
    width: resolveFieldWidth(f.width),
    options: (f.options ?? []).map((o) =>
      o.localizedLabels
        ? { label: o.label, value: o.value, localizedLabels: o.localizedLabels }
        : { label: o.label, value: o.value }
    ),
    validation: (f.validation ?? []).map((v) =>
      v.localizedMessages
        ? {
            type: v.type,
            value: v.value,
            message: v.message,
            localizedMessages: v.localizedMessages,
          }
        : { type: v.type, value: v.value, message: v.message }
    ),
  };
  if (f.localizedLabels) mapped.localizedLabels = f.localizedLabels;
  if (f.localizedPlaceholders) mapped.localizedPlaceholders = f.localizedPlaceholders;
  if (f.localizedHelpTexts) mapped.localizedHelpTexts = f.localizedHelpTexts;
  return mapped;
}

function buildInboxMetadata(
  form: FormRecord,
  existingInbox: EmbeddedInboxMetadata
): EmbeddedInboxMetadata {
  const fs = form.settings;
  return {
    ...existingInbox,
    category: pick(form.category, existingInbox.category, 'contact'),
    checklistTemplate: pickDef(
      form.checklistTemplate,
      existingInbox.checklistTemplate,
      []
    ),
    translations: pickDef(form.translations, existingInbox.translations, {}),
    active: pickDef(form.active, existingInbox.active, true),
    submissionCount: pickDef(
      form.submissionCount,
      existingInbox.submissionCount,
      0
    ),
    department: pickDef(fs?.department, existingInbox.department, 'general'),
    defaultPriority: pickDef(
      fs?.defaultPriority,
      existingInbox.defaultPriority,
      'normal'
    ),
    honeypotField: pickDef(fs?.honeypotField, existingInbox.honeypotField),
    webhookUrl: pickDef(fs?.webhookUrl, existingInbox.webhookUrl),
    enableBookingBridge: pickDef(
      fs?.enableBookingBridge,
      existingInbox.enableBookingBridge
    ),
    defaultBookingServiceSlug: pickDef(
      fs?.defaultBookingServiceSlug,
      existingInbox.defaultBookingServiceSlug
    ),
    enableCertificateBridge: pickDef(
      fs?.enableCertificateBridge,
      existingInbox.enableCertificateBridge
    ),
    defaultCertificateTemplateId: pickDef(
      fs?.defaultCertificateTemplateId,
      existingInbox.defaultCertificateTemplateId
    ),
    localizedSubmitLabels: pickDef(
      fs?.localizedSubmitLabels,
      existingInbox.localizedSubmitLabels
    ),
    localizedSuccessMessages: pickDef(
      fs?.localizedSuccessMessages,
      existingInbox.localizedSuccessMessages
    ),
  };
}

function buildCmsSettings(
  form: FormRecord,
  existingSettings: Record<string, unknown>,
  inboxMeta: EmbeddedInboxMetadata
): Record<string, unknown> {
  const fs = form.settings;
  const existingCaptcha = asObj(existingSettings.captcha);
  return {
    ...existingSettings,
    submitButtonText: pick(
      fs?.submitButtonLabel,
      existingSettings.submitButtonText as string,
      'Submit'
    ),
    successMessage: pick(
      fs?.successMessage,
      existingSettings.successMessage as string,
      'Form submitted successfully'
    ),
    enableHoneypot: Boolean(pickDef<unknown>(fs?.honeypotField, true)),
    enableRateLimit: Boolean(pickDef<unknown>(fs?.rateLimitPerHour, true)),
    maxSubmissionsPerHour: pickDef(
      fs?.rateLimitPerHour,
      existingSettings.maxSubmissionsPerHour as number,
      60
    ),
    notificationEmails: pickDef(
      fs?.notifyEmails,
      existingSettings.notificationEmails as string[],
      []
    ),
    redirectUrl: pickDef(
      fs?.redirectUrl,
      existingSettings.redirectUrl as string,
      ''
    ),
    customCss: pickDef(existingSettings.customCss as string, ''),
    publicPage: pickDef(existingSettings.publicPage as boolean, true),
    captcha: {
      provider: pick(
        fs?.captchaProvider,
        existingCaptcha.provider as string,
        'none'
      ),
      siteKey: pickDef(
        fs?.captchaSiteKey,
        existingCaptcha.siteKey as string,
        ''
      ),
      secretKey: pickDef(
        fs?.captchaSecretKey,
        existingCaptcha.secretKey as string,
        ''
      ),
    },
    inbox: inboxMeta,
  };
}

export function toFormBuilderCmsPayload(
  form: FormRecord,
  existingCms?: Record<string, unknown> | null
): Record<string, unknown> {
  const existingSettings = asObj(existingCms?.settings);
  const existingInbox = asObj(existingSettings.inbox) as EmbeddedInboxMetadata;
  const fields = (form.fields ?? []).map(mapFieldToCms);
  const inboxMeta = buildInboxMetadata(form, existingInbox);
  const settings = buildCmsSettings(form, existingSettings, inboxMeta);

  const conditionalLogic = Array.isArray(existingCms?.conditionalLogic)
    ? existingCms.conditionalLogic
    : [];
  const publishedAt =
    form.publishedAt !== undefined
      ? form.publishedAt
      : pickDef(existingCms?.publishedAt as string | null, new Date().toISOString());
  const description = pickDef(
    form.description,
    existingCms?.description as string,
    ''
  );

  return {
    title: form.title,
    slug: pick(form.formBuilderSlug, form.slug),
    description,
    fields,
    conditionalLogic,
    settings,
    publishedAt,
    publishedData: {
      title: form.title,
      description,
      fields,
      conditionalLogic,
      settings,
    },
  };
}

function mapCmsOption(
  opt: Record<string, unknown> | string,
  prevOptions?: FormField['options']
): NonNullable<FormField['options']>[number] {
  if (typeof opt === 'string') {
    const value = opt.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const prevLoc = prevOptions?.find((po) => po.value === value)?.localizedLabels;
    return prevLoc
      ? { label: opt, value, localizedLabels: prevLoc }
      : { label: opt, value };
  }
  const label = String(pick(opt.label, opt.value, ''));
  const value = String(pick(opt.value, opt.label, ''));
  const prevLoc = prevOptions?.find((po) => po.value === value)?.localizedLabels;
  const optLoc = pickDef(
    opt.localizedLabels as Record<string, string> | undefined,
    prevLoc
  );
  return optLoc
    ? { label, value, localizedLabels: optLoc }
    : { label, value };
}

function resolveOptionalString(
  raw: unknown,
  fallback?: string
): string | undefined {
  return raw !== undefined ? String(pickDef(raw, '')) : fallback;
}

function mapCmsFieldToInbox(
  cf: Record<string, unknown>,
  index: number,
  existingFields: FormField[]
): FormField {
  const fieldName = String(pick(cf.name, `field_${index + 1}`));
  const fieldId = String(pick(cf.id, `fld_${fieldName}`));
  const prev = existingFields.find(
    (ef) => ef.id === fieldId || ef.name === fieldName
  );
  const rawOpts = Array.isArray(cf.options)
    ? (cf.options as Array<Record<string, unknown> | string>)
    : undefined;
  const mergedOptions = rawOpts?.map((opt) => mapCmsOption(opt, prev?.options));
  const width = resolveFieldWidth(
    pick(cf.width as string | undefined, prev?.width)
  );

  return {
    ...(prev || {}),
    id: fieldId,
    type: pick(cf.type as FormField['type'], prev?.type, 'text'),
    name: fieldName,
    label: String(pick(cf.label, prev?.label, fieldName)),
    placeholder: resolveOptionalString(cf.placeholder, prev?.placeholder),
    helpText: resolveOptionalString(cf.helpText, prev?.helpText),
    defaultValue: pickDef(cf.defaultValue, prev?.defaultValue),
    required: Boolean(pickDef(cf.required, prev?.required, false)),
    width,
    ...(mergedOptions ? { options: mergedOptions } : {}),
    validation: Array.isArray(cf.validation)
      ? (cf.validation as FormField['validation'])
      : prev?.validation,
    localizedLabels: pick(
      cf.localizedLabels as Record<string, string>,
      prev?.localizedLabels
    ),
    localizedPlaceholders: pick(
      cf.localizedPlaceholders as Record<string, string>,
      prev?.localizedPlaceholders
    ),
    localizedHelpTexts: pick(
      cf.localizedHelpTexts as Record<string, string>,
      prev?.localizedHelpTexts
    ),
  };
}

function buildInboxSettingsFromCms(
  cmsSettings: Record<string, unknown>,
  inboxMeta: EmbeddedInboxMetadata,
  prevSettings: FormSettings
): FormSettings {
  const cmsCaptcha = asObj(cmsSettings.captcha);
  const rateLimit =
    typeof cmsSettings.maxSubmissionsPerHour === 'number'
      ? cmsSettings.maxSubmissionsPerHour
      : prevSettings.rateLimitPerHour;
  const notifyEmails = Array.isArray(cmsSettings.notificationEmails)
    ? (cmsSettings.notificationEmails as string[])
    : prevSettings.notifyEmails;

  return {
    ...prevSettings,
    submitButtonLabel: pick(
      cmsSettings.submitButtonText as string,
      prevSettings.submitButtonLabel
    ),
    localizedSubmitLabels: pick(
      inboxMeta.localizedSubmitLabels,
      prevSettings.localizedSubmitLabels
    ),
    successMessage: pick(
      cmsSettings.successMessage as string,
      prevSettings.successMessage
    ),
    localizedSuccessMessages: pick(
      inboxMeta.localizedSuccessMessages,
      prevSettings.localizedSuccessMessages
    ),
    redirectUrl: pickDef(
      cmsSettings.redirectUrl as string,
      prevSettings.redirectUrl
    ),
    honeypotField: pickDef(inboxMeta.honeypotField, prevSettings.honeypotField),
    rateLimitPerHour: rateLimit,
    notifyEmails,
    webhookUrl: pickDef(inboxMeta.webhookUrl, prevSettings.webhookUrl),
    captchaProvider: pick(
      cmsCaptcha.provider as FormSettings['captchaProvider'],
      prevSettings.captchaProvider
    ),
    captchaSiteKey: pickDef(
      cmsCaptcha.siteKey as string,
      prevSettings.captchaSiteKey
    ),
    captchaSecretKey: pickDef(
      cmsCaptcha.secretKey as string,
      prevSettings.captchaSecretKey
    ),
    department: pick(inboxMeta.department, prevSettings.department, 'general'),
    defaultPriority: pick(
      inboxMeta.defaultPriority,
      prevSettings.defaultPriority,
      'normal'
    ),
    enableBookingBridge: pickDef(
      inboxMeta.enableBookingBridge,
      prevSettings.enableBookingBridge
    ),
    defaultBookingServiceSlug: pickDef(
      inboxMeta.defaultBookingServiceSlug,
      prevSettings.defaultBookingServiceSlug
    ),
    enableCertificateBridge: pickDef(
      inboxMeta.enableCertificateBridge,
      prevSettings.enableCertificateBridge
    ),
    defaultCertificateTemplateId: pickDef(
      inboxMeta.defaultCertificateTemplateId,
      prevSettings.defaultCertificateTemplateId
    ),
  };
}

function resolveCmsDocId(
  cmsForm: Record<string, unknown>,
  existing: FormRecord | null | undefined,
  cmsId: number | null
): string | undefined {
  if (cmsForm.documentId) return String(cmsForm.documentId);
  if (existing?.documentId) return existing.documentId;
  return cmsId ? `cms_doc_${cmsId}` : undefined;
}

export function fromFormBuilderCmsRow(
  cmsForm: Record<string, unknown>,
  existing?: FormRecord | null
): FormRecord {
  const cmsSettings = asObj(cmsForm.settings);
  const publishedSettings = asObj(asObj(cmsForm.publishedData).settings);
  const inboxMeta = pick(
    cmsSettings.inbox as EmbeddedInboxMetadata | undefined,
    publishedSettings.inbox as EmbeddedInboxMetadata | undefined,
    {}
  );

  const rawFields = Array.isArray(cmsForm.fields)
    ? (cmsForm.fields as Array<Record<string, unknown>>)
    : [];
  const existingFields = pickDef(existing?.fields, []);
  const mergedFields = rawFields.map((cf, index) =>
    mapCmsFieldToInbox(cf, index, existingFields)
  );
  const mergedSettings = buildInboxSettingsFromCms(
    cmsSettings,
    inboxMeta,
    pickDef(existing?.settings, {})
  );

  const cmsSlug = String(pick(cmsForm.slug, existing?.slug, 'form'));
  const cmsId = cmsForm.id ? Number(cmsForm.id) : pickDef(existing?.formBuilderId, null);
  const submissionCount =
    typeof cmsForm.submissionCount === 'number'
      ? cmsForm.submissionCount
      : pickDef(inboxMeta.submissionCount, existing?.submissionCount, 0);

  return {
    documentId: resolveCmsDocId(cmsForm, existing, cmsId),
    title: String(pick(cmsForm.title, existing?.title, 'Untitled Form')),
    slug: cmsSlug,
    description: pickDef(
      resolveOptionalString(cmsForm.description, existing?.description),
      ''
    ),
    category: pick(inboxMeta.category, existing?.category, 'contact'),
    fields: mergedFields.length > 0 ? mergedFields : existingFields,
    checklistTemplate: pick(
      inboxMeta.checklistTemplate,
      existing?.checklistTemplate,
      []
    ),
    settings: mergedSettings,
    translations: pick(inboxMeta.translations, existing?.translations, {}),
    active: pickDef(inboxMeta.active, existing?.active, true),
    submissionCount,
    formBuilderId: cmsId,
    formBuilderSlug: cmsSlug,
    publishedAt: pickDef(
      cmsForm.publishedAt as string | null | undefined,
      existing?.publishedAt,
      new Date().toISOString()
    ),
  };
}

export const mergeFormBuilderCmsIntoInboxForm = fromFormBuilderCmsRow;
