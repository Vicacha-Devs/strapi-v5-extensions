import type { Core } from "@strapi/strapi";

import {
  FORM_BUILDER_CMS_FORM_UID,
  STARTER_FORM_TEMPLATES,
  localizeFormForLocale,
  type FormBuilderCmsFormSummary,
  type FormCategory,
  type FormRecord,
} from "../../../shared";
import {
  fromFormBuilderCmsRow,
  mergeFormBuilderCmsIntoInboxForm,
  sanitizePublicForm,
  toFormBuilderCmsPayload,
} from "./formBuilderMapper";
import {
  countSubmissionsForForm,
  isFormBuilderCmsAvailable,
  listFormBuilderForms,
  syncFormFromBuilderCms,
  syncFormToBuilderCms,
} from "./formBuilderSync";
import { syncSubmissionsFromFormBuilderCms } from "./submissionFormBuilderBridge";

export {
  fromFormBuilderCmsRow,
  mergeFormBuilderCmsIntoInboxForm,
  sanitizePublicForm,
  toFormBuilderCmsPayload,
};

function pickVal<T>(...values: Array<T | undefined | null>): T {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return values[values.length - 1] as T;
}

function pickDefVal<T>(...values: Array<T | undefined | null>): T {
  for (const v of values) {
    if (v !== undefined && v !== null) return v;
  }
  return values[values.length - 1] as T;
}

async function findExistingCmsFormRow(
  query: ReturnType<Core.Strapi["db"]["query"]>,
  input: Partial<FormRecord> & { slug: string; title: string }
): Promise<Record<string, unknown> | null> {
  if (input.formBuilderId) {
    const byId = await query.findOne({ where: { id: input.formBuilderId } });
    if (byId) return byId as Record<string, unknown>;
  }
  if (input.slug) {
    const bySlug = await query.findOne({ where: { slug: input.slug } });
    if (bySlug) return bySlug as Record<string, unknown>;
  }
  return null;
}

function buildMergedFormRecord(
  input: Partial<FormRecord> & { slug: string; title: string },
  existing: FormRecord | null
): FormRecord {
  const publishedAt =
    input.publishedAt !== undefined
      ? input.publishedAt
      : pickDefVal(existing?.publishedAt, new Date().toISOString());

  return {
    documentId: existing?.documentId,
    title: pickVal(input.title, existing?.title, "Untitled Form"),
    slug: pickVal(input.slug, existing?.slug, "form"),
    description: pickDefVal(input.description, existing?.description, ""),
    category: pickVal(input.category, existing?.category, "contact"),
    fields: pickVal(input.fields, existing?.fields, []),
    checklistTemplate: pickDefVal(input.checklistTemplate, existing?.checklistTemplate, []),
    settings: {
      ...pickDefVal(existing?.settings, {}),
      ...pickDefVal(input.settings, {}),
    },
    translations: pickDefVal(input.translations, existing?.translations, {}),
    active: pickDefVal(input.active, existing?.active, true),
    submissionCount: pickDefVal(input.submissionCount, existing?.submissionCount, 0),
    formBuilderId: pickDefVal(input.formBuilderId, existing?.formBuilderId, null),
    formBuilderSlug: pickDefVal(input.formBuilderSlug, existing?.formBuilderSlug, input.slug),
    publishedAt,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  isFormBuilderCmsAvailable(): boolean {
    return isFormBuilderCmsAvailable(strapi);
  },

  async listFormBuilderForms(): Promise<{
    available: boolean;
    forms: FormBuilderCmsFormSummary[];
  }> {
    return listFormBuilderForms(strapi);
  },

  async syncFormToBuilderCms(
    form: FormRecord
  ): Promise<{ formBuilderId: number; formBuilderSlug: string } | null> {
    return syncFormToBuilderCms(strapi, form);
  },

  async syncFormFromBuilderCms(cmsForm: Record<string, unknown>): Promise<FormRecord | null> {
    return syncFormFromBuilderCms(strapi, cmsForm);
  },

  async syncWithFormBuilderCms(): Promise<{
    available: boolean;
    syncedToBuilder: number;
    syncedFromBuilder: number;
    forms: FormRecord[];
  }> {
    if (!this.isFormBuilderCmsAvailable()) {
      return {
        available: false,
        syncedToBuilder: 0,
        syncedFromBuilder: 0,
        forms: [],
      };
    }

    const cmsForms = (await strapi.db
      .query(FORM_BUILDER_CMS_FORM_UID)
      .findMany({ orderBy: { createdAt: "desc" } })) as Array<Record<string, unknown>>;

    let syncedFromBuilder = 0;
    for (const cmsForm of cmsForms || []) {
      const synced = await this.syncFormFromBuilderCms(cmsForm);
      if (synced) syncedFromBuilder += 1;
    }

    await syncSubmissionsFromFormBuilderCms(strapi);

    const forms = await this.listForms({ activeOnly: false });
    return {
      available: true,
      syncedToBuilder: 0,
      syncedFromBuilder,
      forms,
    };
  },

  async listForms(params?: {
    category?: FormCategory;
    activeOnly?: boolean;
    locale?: string;
    publicSafe?: boolean;
  }): Promise<FormRecord[]> {
    if (!this.isFormBuilderCmsAvailable()) return [];

    const cmsRows = (await strapi.db
      .query(FORM_BUILDER_CMS_FORM_UID)
      .findMany({ orderBy: { createdAt: "desc" } })) as Array<Record<string, unknown>>;

    const allForms = await Promise.all(
      (cmsRows || []).map(async (row) => {
        const parsed = fromFormBuilderCmsRow(row);
        const count = await countSubmissionsForForm(strapi, Number(row.id), parsed.slug);
        return {
          ...parsed,
          submissionCount: Math.max(count, parsed.submissionCount || 0),
        };
      })
    );

    const filtered = allForms.filter((doc) => {
      if (params?.category && doc.category !== params.category) return false;
      if (params?.activeOnly !== false && doc.active === false) return false;
      return true;
    });

    return filtered.map((doc) =>
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
    if (!this.isFormBuilderCmsAvailable()) return null;

    const cmsRow = (await strapi.db
      .query(FORM_BUILDER_CMS_FORM_UID)
      .findOne({ where: { slug } })) as Record<string, unknown> | null;

    if (!cmsRow) return null;

    const form = fromFormBuilderCmsRow(cmsRow);
    const count = await countSubmissionsForForm(strapi, Number(cmsRow.id), form.slug);
    form.submissionCount = Math.max(count, form.submissionCount || 0);

    if (options?.publicSafe) {
      return sanitizePublicForm(form, options?.locale);
    }
    if (options?.locale) {
      return localizeFormForLocale(form, options.locale);
    }
    return form;
  },

  async saveForm(
    input: Partial<FormRecord> & { slug: string; title: string }
  ): Promise<FormRecord> {
    const query = strapi.db.query(FORM_BUILDER_CMS_FORM_UID);
    const existingRow = await findExistingCmsFormRow(query, input);
    const existing = existingRow ? fromFormBuilderCmsRow(existingRow) : null;
    const mergedForm = buildMergedFormRecord(input, existing);
    const payload = toFormBuilderCmsPayload(mergedForm, existingRow);

    const savedRow = existingRow?.id
      ? await query.update({
          where: { id: existingRow.id },
          data: {
            ...payload,
            slug: existingRow.slug || payload.slug,
          },
        })
      : await query.create({ data: payload });

    return fromFormBuilderCmsRow(savedRow, mergedForm);
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
      ...overrides,
      slug: overrides?.slug || tpl.form.slug,
      title: overrides?.title || tpl.form.title,
    });
  },
});
