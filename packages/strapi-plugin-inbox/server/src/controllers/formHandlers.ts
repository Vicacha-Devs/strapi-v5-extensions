import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  STARTER_FORM_TEMPLATES,
  type FormCategory,
  type FormRecord,
  type InboxSettings,
  type SubmissionRecord,
} from "../../../shared";
import type { ControllerCtx } from "./inboxController";

function extractPlainObject(val: unknown): Record<string, unknown> | null {
  return val && typeof val === "object" && !Array.isArray(val)
    ? (val as Record<string, unknown>)
    : null;
}

function normalizeSubmitPayload(
  rawBody: Record<string, unknown>
): Record<string, unknown> {
  const nestedData =
    extractPlainObject(rawBody.data) || extractPlainObject(rawBody.payload);
  return nestedData ? { ...rawBody, ...nestedData } : rawBody;
}

function resolveClientIp(ctx: ControllerCtx): string {
  const directIp = (ctx as unknown as { ip?: string }).ip || ctx.request.ip;
  if (directIp && directIp.trim()) return directIp.trim();
  const forwarded = ctx.request.headers?.["x-forwarded-for"]
    ?.split(",")[0]
    ?.trim();
  return forwarded || "127.0.0.1";
}

function isAuthenticatedAdminContext(ctx: ControllerCtx): boolean {
  const state = (
    ctx as unknown as {
      state?: {
        user?: unknown;
        isAuthenticatedAdmin?: boolean;
        route?: { info?: { type?: string } };
      };
    }
  ).state;
  return Boolean(
    state?.user ||
    state?.isAuthenticatedAdmin ||
    state?.route?.info?.type === "admin"
  );
}

const ERROR_STATUS_MAP: Record<string, number> = {
  NotFoundError: 404,
  TooManyRequestsError: 429,
  ForbiddenError: 403,
};

export const createFormHandlers = (strapi: Core.Strapi) => ({
  async getSettings(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      getSettings(): Promise<InboxSettings>;
    }>("settings");
    const data = await svc.getSettings();
    ctx.body = { data };
  },

  async updateSettings(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      updateSettings(patch: Partial<InboxSettings>): Promise<InboxSettings>;
    }>("settings");
    const data = await svc.updateSettings(
      (ctx.request.body || {}) as Partial<InboxSettings>
    );
    ctx.body = { data };
  },

  async listTemplates(ctx: ControllerCtx) {
    ctx.body = { data: STARTER_FORM_TEMPLATES };
  },

  async listFormBuilderForms(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      listFormBuilderForms(): Promise<{
        available: boolean;
        forms: unknown[];
      }>;
    }>("formService");
    const data = await svc.listFormBuilderForms();
    ctx.body = { data };
  },

  async syncFormBuilder(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      syncWithFormBuilderCms(): Promise<{
        available: boolean;
        syncedToBuilder: number;
        syncedFromBuilder: number;
        forms: FormRecord[];
      }>;
    }>("formService");
    const data = await svc.syncWithFormBuilderCms();
    ctx.body = { data };
  },

  async listForms(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      listForms(params?: {
        category?: FormCategory;
        activeOnly?: boolean;
        locale?: string;
        publicSafe?: boolean;
      }): Promise<FormRecord[]>;
    }>("formService");

    const isAdmin = isAuthenticatedAdminContext(ctx);
    const data = await svc.listForms({
      category: ctx.query?.category as FormCategory | undefined,
      activeOnly: isAdmin ? ctx.query?.activeOnly !== "false" : true,
      locale: ctx.query?.locale,
      publicSafe: isAdmin ? ctx.query?.admin !== "true" : true,
    });
    ctx.body = { data };
  },

  async getFormBySlug(ctx: ControllerCtx) {
    const slug = ctx.params?.slug || "";
    const svc = strapi.plugin(PLUGIN_ID).service<{
      findBySlug(
        slug: string,
        opts?: { locale?: string; publicSafe?: boolean }
      ): Promise<FormRecord | null>;
    }>("formService");

    const form = await svc.findBySlug(slug, {
      locale: ctx.query?.locale,
      publicSafe: true,
    });
    if (!form || form.active === false) {
      ctx.status = 404;
      ctx.body = { error: `Form "${slug}" not found` };
      return;
    }
    ctx.body = { data: form };
  },

  async saveForm(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      saveForm(
        input: Partial<FormRecord> & { slug: string; title: string }
      ): Promise<FormRecord>;
    }>("formService");
    const body = (ctx.request.body || {}) as Partial<FormRecord> & {
      slug: string;
      title: string;
    };
    const data = await svc.saveForm(body);
    ctx.body = { data };
  },

  async createFromTemplate(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      createFromTemplate(
        templateId: string,
        overrides?: Partial<FormRecord>
      ): Promise<FormRecord>;
    }>("formService");
    const body = (ctx.request.body || {}) as {
      templateId: string;
      overrides?: Partial<FormRecord>;
    };
    const data = await svc.createFromTemplate(body.templateId, body.overrides);
    ctx.body = { data };
  },

  async submitForm(ctx: ControllerCtx) {
    const slug = ctx.params?.slug || "";
    const svc = strapi.plugin(PLUGIN_ID).service<{
      submitForm(
        slug: string,
        payload: Record<string, unknown>,
        meta?: {
          ip?: string;
          userAgent?: string;
          locale?: string;
          captchaToken?: string;
        }
      ): Promise<SubmissionRecord>;
    }>("submissionService");

    try {
      const rawBody = (ctx.request.body || {}) as Record<string, unknown>;
      const payload = normalizeSubmitPayload(rawBody);
      const data = await svc.submitForm(slug, payload, {
        ip: resolveClientIp(ctx),
        userAgent: ctx.request.headers?.["user-agent"] || "",
        locale: (rawBody.locale as string) || ctx.query?.locale,
        captchaToken:
          (rawBody.captchaToken as string) ||
          (payload.captchaToken as string | undefined),
      });
      const {
        ipAddress: _ipAddress,
        userAgent: _userAgent,
        staffNotes: _staffNotes,
        ...publicData
      } = data;
      ctx.status = 201;
      ctx.body = { data: publicData };
    } catch (err) {
      const error = err as Error & { details?: Record<string, string[]> };
      ctx.status = ERROR_STATUS_MAP[error.name] ?? 400;
      ctx.body = {
        error: error.message,
        details: error.details || {},
      };
    }
  },
});
