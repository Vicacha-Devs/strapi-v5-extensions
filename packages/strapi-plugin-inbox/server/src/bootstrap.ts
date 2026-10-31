import type { Core } from '@strapi/strapi';
import {
  FORM_BUILDER_CMS_FORM_UID,
  FORM_BUILDER_CMS_SUBMISSION_UID,
  PLUGIN_ID,
  type FormField,
  type FormRecord,
  type FormSettings,
  type InboxSettings,
  type SubmissionRecord,
} from '../../shared';

type FormServiceApi = {
  findBySlug(slug: string): Promise<FormRecord | null>;
  saveForm(
    input: Partial<FormRecord> & { slug: string; title: string }
  ): Promise<FormRecord>;
  syncFormFromBuilderCms(
    cmsForm: Record<string, unknown>
  ): Promise<FormRecord | null>;
  syncWithFormBuilderCms(): Promise<{
    available: boolean;
    syncedToBuilder: number;
    syncedFromBuilder: number;
    forms: FormRecord[];
  }>;
};

type SubmissionServiceApi = {
  ingestFormBuilderSubmission(
    cmsSubmission: Record<string, unknown>,
    meta?: { formId?: number; formSlug?: string }
  ): Promise<SubmissionRecord | null>;
};

async function registerPluginPermissions(strapi: Core.Strapi): Promise<void> {
  if (!strapi.admin?.services?.permission?.actionProvider?.registerMany) return;
  await strapi.admin.services.permission.actionProvider.registerMany([
    {
      section: 'plugins',
      displayName: 'Manage Forms & Builder',
      uid: 'forms.manage',
      pluginName: PLUGIN_ID,
    },
    {
      section: 'plugins',
      displayName: 'Manage Submissions & Casework',
      uid: 'submissions.manage',
      pluginName: PLUGIN_ID,
    },
    {
      section: 'plugins',
      displayName: 'Manage Subscribers & Alert Banners',
      uid: 'subscribers.manage',
      pluginName: PLUGIN_ID,
    },
    {
      section: 'plugins',
      displayName: 'Manage Inbox Settings',
      uid: 'settings.manage',
      pluginName: PLUGIN_ID,
    },
  ]);
}

function mergePresetFieldOptions(
  existingOptions: FormField['options'],
  presetOptions: FormField['options']
): FormField['options'] {
  if (!existingOptions) return undefined;
  return existingOptions.map((eo) => {
    const po = presetOptions?.find((o) => o.value === eo.value);
    const localizedLabels = eo.localizedLabels || po?.localizedLabels;
    return localizedLabels ? { ...eo, localizedLabels } : { ...eo };
  });
}

function mergePresetField(ef: FormField, presetFields?: FormField[]): FormField {
  const pf = presetFields?.find((f) => f.id === ef.id || f.name === ef.name);
  if (!pf) return ef;
  return {
    ...pf,
    ...ef,
    localizedLabels: ef.localizedLabels || pf.localizedLabels,
    localizedPlaceholders: ef.localizedPlaceholders || pf.localizedPlaceholders,
    localizedHelpTexts: ef.localizedHelpTexts || pf.localizedHelpTexts,
    options: mergePresetFieldOptions(ef.options, pf.options),
  };
}

function pickFirst<T>(...vals: Array<T | undefined | null>): T {
  for (const v of vals) {
    if (v !== undefined && v !== null) return v;
  }
  return vals[vals.length - 1] as T;
}

function pickNonDefault<T>(val: T | undefined, fallback: T | undefined, defaultVal: T): T {
  if (val && val !== defaultVal) return val;
  return fallback || defaultVal;
}

function mergePresetSettings(
  existingSettings?: FormSettings,
  presetSettings?: FormSettings
): FormSettings {
  return {
    ...pickFirst(presetSettings, {}),
    ...pickFirst(existingSettings, {}),
    department: pickNonDefault(
      existingSettings?.department,
      presetSettings?.department,
      'general'
    ),
    defaultPriority: pickNonDefault(
      existingSettings?.defaultPriority,
      presetSettings?.defaultPriority,
      'normal'
    ),
    enableBookingBridge: pickFirst(
      existingSettings?.enableBookingBridge,
      presetSettings?.enableBookingBridge
    ),
    enableCertificateBridge: pickFirst(
      existingSettings?.enableCertificateBridge,
      presetSettings?.enableCertificateBridge
    ),
    defaultBookingServiceSlug: pickFirst(
      existingSettings?.defaultBookingServiceSlug,
      presetSettings?.defaultBookingServiceSlug
    ),
    defaultCertificateTemplateId: pickFirst(
      existingSettings?.defaultCertificateTemplateId,
      presetSettings?.defaultCertificateTemplateId
    ),
  };
}

function needsPresetBackfill(
  existing: FormRecord,
  preset: Partial<FormRecord>
): boolean {
  const missingChecklist =
    Boolean(preset.checklistTemplate?.length) && !existing.checklistTemplate?.length;
  const missingTranslations =
    Boolean(preset.translations && Object.keys(preset.translations).length > 0) &&
    !Object.keys(existing.translations || {}).length;
  const missingCategory =
    Boolean(preset.category && preset.category !== 'contact') &&
    existing.category === 'contact';
  return missingChecklist || missingTranslations || missingCategory;
}

function buildMergedPresetForm(
  existing: FormRecord,
  preset: Partial<FormRecord> & { slug: string; title: string }
): Partial<FormRecord> & { slug: string; title: string } {
  const baseFields = existing.fields?.length
    ? existing.fields
    : pickFirst(preset.fields, []);
  const mergedFields = baseFields.map((ef) => mergePresetField(ef, preset.fields));
  const checklistTemplate = existing.checklistTemplate?.length
    ? existing.checklistTemplate
    : pickFirst(preset.checklistTemplate, []);
  const translations = Object.keys(existing.translations || {}).length
    ? existing.translations
    : pickFirst(preset.translations, {});

  return {
    ...preset,
    ...existing,
    slug: existing.slug,
    title: existing.title || preset.title,
    category: pickNonDefault(existing.category, preset.category, 'contact'),
    fields: mergedFields,
    checklistTemplate,
    translations,
    settings: mergePresetSettings(existing.settings, preset.settings),
  };
}

async function seedSinglePresetForm(
  formService: FormServiceApi,
  preset: Partial<FormRecord> & { slug: string; title: string }
): Promise<void> {
  if (!preset?.slug || !preset?.title) return;
  const existing = await formService.findBySlug(preset.slug);
  if (!existing) {
    await formService.saveForm(preset);
    return;
  }
  if (needsPresetBackfill(existing, preset)) {
    await formService.saveForm(buildMergedPresetForm(existing, preset));
  }
}

async function seedPresetForms(
  strapi: Core.Strapi,
  formService: FormServiceApi
): Promise<void> {
  try {
    const rawConfig = strapi.config.get<Record<string, unknown>>(
      `plugin::${PLUGIN_ID}`,
      {}
    );
    const presetForms = Array.isArray(rawConfig?.presetForms)
      ? (rawConfig.presetForms as Array<
          Partial<FormRecord> & { slug: string; title: string }
        >)
      : [];
    for (const preset of presetForms) {
      await seedSinglePresetForm(formService, preset);
    }
  } catch (err) {
    strapi.log?.warn?.(
      `[${PLUGIN_ID}] Could not seed presetForms: ${(err as Error).message}`
    );
  }
}

async function preserveCmsFormInboxSettings(
  strapi: Core.Strapi,
  event: {
    params?: {
      where?: Record<string, unknown>;
      data?: Record<string, unknown>;
    };
  }
): Promise<void> {
  const data = event.params?.data;
  const where = event.params?.where;
  if (!data || !where) return;
  const incomingSettings = data.settings as Record<string, unknown> | undefined;
  if (!incomingSettings || incomingSettings.inbox) return;

  const existing = (await strapi.db
    .query(FORM_BUILDER_CMS_FORM_UID)
    .findOne({ where })) as Record<string, unknown> | null;
  const prevInbox = (existing?.settings as Record<string, unknown> | undefined)?.inbox;
  if (!prevInbox) return;

  incomingSettings.inbox = prevInbox;
  if (data.publishedData && typeof data.publishedData === 'object') {
    const pd = data.publishedData as Record<string, unknown>;
    pd.settings = {
      ...((pd.settings as Record<string, unknown>) || {}),
      inbox: prevInbox,
    };
  }
}

function extractLifecycleFormId(event: {
  result?: Record<string, unknown>;
  params?: { data?: Record<string, unknown> };
}): number | undefined {
  const rawFormId = event.params?.data?.form ?? event.result?.form ?? undefined;
  if (typeof rawFormId === 'number') return rawFormId;
  if (typeof rawFormId === 'object' && rawFormId !== null && 'id' in rawFormId) {
    return Number((rawFormId as { id: unknown }).id);
  }
  return undefined;
}

function subscribeFormBuilderLifecycles(
  strapi: Core.Strapi,
  formService: FormServiceApi,
  submissionService: SubmissionServiceApi
): void {
  if (!strapi.db?.lifecycles?.subscribe) return;

  if (
    strapi.contentTypes?.[
      FORM_BUILDER_CMS_FORM_UID as keyof typeof strapi.contentTypes
    ]
  ) {
    strapi.db.lifecycles.subscribe({
      models: [FORM_BUILDER_CMS_FORM_UID],
      async beforeUpdate(event) {
        await preserveCmsFormInboxSettings(strapi, event);
      },
      async afterCreate(event: { result?: Record<string, unknown> }) {
        if (event.result) {
          await formService.syncFormFromBuilderCms(event.result);
        }
      },
    });
  }

  if (
    strapi.contentTypes?.[
      FORM_BUILDER_CMS_SUBMISSION_UID as keyof typeof strapi.contentTypes
    ]
  ) {
    strapi.db.lifecycles.subscribe({
      models: [FORM_BUILDER_CMS_SUBMISSION_UID],
      async afterCreate(event: {
        result?: Record<string, unknown>;
        params?: { data?: Record<string, unknown> };
      }) {
        if (event.result) {
          await submissionService.ingestFormBuilderSubmission(event.result, {
            formId: extractLifecycleFormId(event),
          });
        }
      },
    });
  }
}

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const settingsService = strapi.plugin(PLUGIN_ID).service<{
    getSettings(): Promise<InboxSettings>;
  }>('settings');
  const formService = strapi
    .plugin(PLUGIN_ID)
    .service<FormServiceApi>('formService');
  const submissionService = strapi
    .plugin(PLUGIN_ID)
    .service<SubmissionServiceApi>('submissionService');

  const settings = await settingsService.getSettings();
  await registerPluginPermissions(strapi);
  await seedPresetForms(strapi, formService);

  // Sync with strapi-plugin-form-builder-cms and register lifecycle hooks
  try {
    if (
      settings.enableFormBuilderBridge !== false &&
      settings.autoSyncFormBuilderForms !== false
    ) {
      await formService.syncWithFormBuilderCms();
    }
    subscribeFormBuilderLifecycles(strapi, formService, submissionService);
  } catch (err) {
    strapi.log?.warn?.(
      `[${PLUGIN_ID}] Could not initialize Form Builder CMS bridge: ${(err as Error).message}`
    );
  }
};

export default bootstrap;
