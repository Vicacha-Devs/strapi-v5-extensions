import type { Core } from '@strapi/strapi';
import {
  PLUGIN_ID,
  STARTER_FORM_TEMPLATES,
  type AlertBannerRecord,
  type CaptchaProvider,
  type ChecklistItem,
  type FormCategory,
  type FormRecord,
  type InboxSettings,
  type SubmissionPriority,
  type SubmissionRecord,
  type SubmissionStatus,
  type SubscriberRecord,
  type SubscriberStatus,
} from '../../../shared';

interface ControllerCtx {
  params?: Record<string, string>;
  query?: Record<string, string>;
  request: {
    body?: Record<string, unknown>;
    ip?: string;
    headers?: Record<string, string | undefined>;
  };
  set?: (header: string, value: string) => void;
  status?: number;
  body?: unknown;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getSettings(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      getSettings(): Promise<InboxSettings>;
    }>('settings');
    const data = await svc.getSettings();
    ctx.body = { data };
  },

  async updateSettings(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      updateSettings(patch: Partial<InboxSettings>): Promise<InboxSettings>;
    }>('settings');
    const data = await svc.updateSettings(
      (ctx.request.body || {}) as Partial<InboxSettings>
    );
    ctx.body = { data };
  },

  async listTemplates(ctx: ControllerCtx) {
    ctx.body = { data: STARTER_FORM_TEMPLATES };
  },

  async listForms(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      listForms(params?: {
        category?: FormCategory;
        activeOnly?: boolean;
        locale?: string;
        publicSafe?: boolean;
      }): Promise<FormRecord[]>;
    }>('formService');

    const data = await svc.listForms({
      category: ctx.query?.category as FormCategory | undefined,
      activeOnly: ctx.query?.activeOnly !== 'false',
      locale: ctx.query?.locale,
      publicSafe: true,
    });
    ctx.body = { data };
  },

  async getFormBySlug(ctx: ControllerCtx) {
    const slug = ctx.params?.slug || '';
    const svc = strapi.plugin(PLUGIN_ID).service<{
      findBySlug(
        slug: string,
        opts?: { locale?: string; publicSafe?: boolean }
      ): Promise<FormRecord | null>;
    }>('formService');

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
    }>('formService');
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
    }>('formService');
    const body = (ctx.request.body || {}) as {
      templateId: string;
      overrides?: Partial<FormRecord>;
    };
    const data = await svc.createFromTemplate(body.templateId, body.overrides);
    ctx.body = { data };
  },

  async submitForm(ctx: ControllerCtx) {
    const slug = ctx.params?.slug || '';
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
    }>('submissionService');

    try {
      const payload = (ctx.request.body || {}) as Record<string, unknown>;
      const data = await svc.submitForm(slug, payload, {
        ip:
          ctx.request.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
          ctx.request.ip ||
          '127.0.0.1',
        userAgent: ctx.request.headers?.['user-agent'] || '',
        locale: (payload.locale as string) || ctx.query?.locale,
        captchaToken: payload.captchaToken as string | undefined,
      });
      ctx.status = 201;
      ctx.body = { data };
    } catch (err) {
      const error = err as Error & { details?: Record<string, string[]> };
      ctx.status =
        error.name === 'NotFoundError'
          ? 404
          : error.name === 'TooManyRequestsError'
            ? 429
            : error.name === 'ForbiddenError'
              ? 403
              : 400;
      ctx.body = {
        error: error.message,
        details: error.details || {},
      };
    }
  },

  async listSubmissions(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      listSubmissions(filters?: {
        formSlug?: string;
        status?: SubmissionStatus;
        priority?: SubmissionPriority;
        department?: string;
      }): Promise<SubmissionRecord[]>;
    }>('submissionService');

    const data = await svc.listSubmissions({
      formSlug: ctx.query?.formSlug,
      status: ctx.query?.status as SubmissionStatus | undefined,
      priority: ctx.query?.priority as SubmissionPriority | undefined,
      department: ctx.query?.department,
    });
    ctx.body = { data };
  },

  async updateCasework(ctx: ControllerCtx) {
    const documentId = ctx.params?.documentId || '';
    const svc = strapi.plugin(PLUGIN_ID).service<{
      updateCasework(
        documentId: string,
        patch: {
          status?: SubmissionStatus;
          priority?: SubmissionPriority;
          department?: string;
          staffNotes?: string;
          assignedTo?: string;
          checklistItems?: ChecklistItem[];
        }
      ): Promise<SubmissionRecord>;
    }>('submissionService');

    const data = await svc.updateCasework(
      documentId,
      (ctx.request.body || {}) as Record<string, unknown>
    );
    ctx.body = { data };
  },

  async scheduleBooking(ctx: ControllerCtx) {
    const documentId = ctx.params?.documentId || '';
    const svc = strapi.plugin(PLUGIN_ID).service<{
      scheduleBookingFromSubmission(
        documentId: string,
        bookingInput: {
          serviceSlug: string;
          date: string;
          startTime: string;
          endTime?: string;
          notes?: string;
        }
      ): Promise<{ submission: SubmissionRecord; bookingId: string }>;
    }>('submissionService');

    const body = (ctx.request.body || {}) as {
      serviceSlug: string;
      date: string;
      startTime: string;
      endTime?: string;
      notes?: string;
    };
    const data = await svc.scheduleBookingFromSubmission(documentId, body);
    ctx.body = { data };
  },

  async issueCertificate(ctx: ControllerCtx) {
    const documentId = ctx.params?.documentId || '';
    const svc = strapi.plugin(PLUGIN_ID).service<{
      issueCertificateFromSubmission(
        documentId: string,
        certInput?: {
          templateSlug?: string;
          recipientName?: string;
          requireChecklistVerified?: boolean;
        }
      ): Promise<{ submission: SubmissionRecord; certificateNumber: string }>;
    }>('submissionService');

    const body = (ctx.request.body || {}) as {
      templateSlug?: string;
      recipientName?: string;
      requireChecklistVerified?: boolean;
    };
    const data = await svc.issueCertificateFromSubmission(documentId, body);
    ctx.body = { data };
  },

  async exportCsv(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      exportCsv(formSlug?: string): Promise<string>;
    }>('submissionService');

    const csv = await svc.exportCsv(ctx.query?.formSlug);
    ctx.set?.('Content-Type', 'text/csv; charset=utf-8');
    ctx.body = csv;
  },

  async testCaptcha(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      testCaptchaSecret(
        provider: CaptchaProvider,
        secret: string
      ): Promise<{ ok: boolean; reason?: string }>;
    }>('submissionService');
    const body = (ctx.request.body || {}) as {
      provider: CaptchaProvider;
      secret: string;
    };
    const data = await svc.testCaptchaSecret(body.provider, body.secret);
    ctx.body = { data };
  },

  async subscribe(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      subscribe(input: {
        email: string;
        fullName?: string;
        phone?: string;
        locale?: string;
        topics?: string[];
        sourceFormSlug?: string;
      }): Promise<SubscriberRecord>;
    }>('subscriberService');

    try {
      const body = (ctx.request.body || {}) as {
        email: string;
        fullName?: string;
        phone?: string;
        locale?: string;
        topics?: string[];
        sourceFormSlug?: string;
      };
      const subscriber = await svc.subscribe(body);
      ctx.status = 201;
      ctx.body = {
        data: {
          email: subscriber.email,
          status: subscriber.status,
          topics: subscriber.topics,
          locale: subscriber.locale,
        },
      };
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async confirmSubscription(ctx: ControllerCtx) {
    const token =
      ctx.params?.token ||
      ctx.query?.token ||
      ((ctx.request.body?.token as string) ?? '');
    const svc = strapi.plugin(PLUGIN_ID).service<{
      confirmSubscription(token: string): Promise<SubscriberRecord>;
    }>('subscriberService');

    try {
      const subscriber = await svc.confirmSubscription(token);
      ctx.body = {
        data: {
          email: subscriber.email,
          status: subscriber.status,
          confirmedAt: subscriber.confirmedAt,
        },
      };
    } catch (err) {
      ctx.status = 404;
      ctx.body = { error: (err as Error).message };
    }
  },

  async unsubscribe(ctx: ControllerCtx) {
    const token =
      ctx.params?.token ||
      ctx.query?.token ||
      ((ctx.request.body?.token as string) ?? '');
    const svc = strapi.plugin(PLUGIN_ID).service<{
      unsubscribe(token: string): Promise<SubscriberRecord>;
    }>('subscriberService');

    try {
      const subscriber = await svc.unsubscribe(token);
      ctx.body = {
        data: {
          email: subscriber.email,
          status: subscriber.status,
          unsubscribedAt: subscriber.unsubscribedAt,
        },
      };
    } catch (err) {
      ctx.status = 404;
      ctx.body = { error: (err as Error).message };
    }
  },

  async listSubscribers(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      listSubscribers(filters?: {
        status?: SubscriberStatus;
        topic?: string;
        locale?: string;
      }): Promise<SubscriberRecord[]>;
    }>('subscriberService');

    const data = await svc.listSubscribers({
      status: ctx.query?.status as SubscriberStatus | undefined,
      topic: ctx.query?.topic,
      locale: ctx.query?.locale,
    });
    ctx.body = { data };
  },

  async getActiveAlerts(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      getActiveAlerts(params?: {
        locale?: string;
        nowIso?: string;
      }): Promise<AlertBannerRecord[]>;
    }>('alertService');

    const data = await svc.getActiveAlerts({
      locale: ctx.query?.locale,
      nowIso: ctx.query?.now,
    });
    ctx.body = { data };
  },

  async upsertAlertBanner(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      upsertAlertBanner(
        input: Partial<AlertBannerRecord> & {
          code: string;
          title: string;
          message: string;
        }
      ): Promise<AlertBannerRecord>;
    }>('alertService');

    const body = (ctx.request.body || {}) as Partial<AlertBannerRecord> & {
      code: string;
      title: string;
      message: string;
    };
    const data = await svc.upsertAlertBanner(body);
    ctx.body = { data };
  },
});
