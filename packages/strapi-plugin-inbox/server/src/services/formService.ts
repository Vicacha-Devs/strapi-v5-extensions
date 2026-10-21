import type { Core } from '@strapi/strapi';
import {
  FORM_UID,
  STARTER_FORM_TEMPLATES,
  localizeFormForLocale,
  type FormCategory,
  type FormRecord,
} from '../../../shared';

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

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async listForms(params?: {
    category?: FormCategory;
    activeOnly?: boolean;
    locale?: string;
    publicSafe?: boolean;
  }): Promise<FormRecord[]> {
    const filters: Record<string, unknown> = {};
    if (params?.category) filters.category = params.category;
    if (params?.activeOnly !== false) filters.active = true;

    const docs = (await strapi.documents(FORM_UID).findMany({
      filters,
      limit: 100,
    })) as unknown as FormRecord[];

    return docs.map((doc) =>
      params?.publicSafe
        ? sanitizePublicForm(doc, params?.locale)
        : params?.locale
          ? localizeFormForLocale(doc, params.locale)
          : doc
    );
  },

  async findBySlug(
    slug: string,
    options?: { locale?: string; publicSafe?: boolean }
  ): Promise<FormRecord | null> {
    const docs = (await strapi.documents(FORM_UID).findMany({
      filters: { slug },
      limit: 1,
    })) as unknown as FormRecord[];

    const form = docs[0] || null;
    if (!form) return null;

    if (options?.publicSafe) {
      return sanitizePublicForm(form, options?.locale);
    }
    if (options?.locale) {
      return localizeFormForLocale(form, options.locale);
    }
    return form;
  },

  async saveForm(input: Partial<FormRecord> & { slug: string; title: string }): Promise<FormRecord> {
    const existing = await this.findBySlug(input.slug);
    const payload: Record<string, unknown> = {
      title: input.title,
      slug: input.slug,
      description: input.description || '',
      category: input.category || 'contact',
      fields: input.fields || [],
      checklistTemplate: input.checklistTemplate || [],
      settings: input.settings || {},
      translations: input.translations || {},
      active: input.active ?? true,
      submissionCount: input.submissionCount ?? existing?.submissionCount ?? 0,
      publishedAt: input.publishedAt ?? existing?.publishedAt ?? new Date().toISOString(),
    };

    if (existing?.documentId) {
      const updated = await strapi.documents(FORM_UID).update({
        documentId: existing.documentId,
        data: payload,
      });
      return updated as unknown as FormRecord;
    }

    const created = await strapi.documents(FORM_UID).create({
      data: payload,
      status: 'published',
    });
    return created as unknown as FormRecord;
  },

  async createFromTemplate(
    templateId: string,
    overrides?: Partial<FormRecord>
  ): Promise<FormRecord> {
    const tpl = STARTER_FORM_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) {
      throw new Error(`Starter template "${templateId}" not found`);
    }

    return this.saveForm({
      ...tpl.form,
      ...(overrides || {}),
      slug: overrides?.slug || tpl.form.slug,
      title: overrides?.title || tpl.form.title,
    });
  },
});
