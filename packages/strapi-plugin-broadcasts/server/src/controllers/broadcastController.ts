import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  STARTER_CAMPAIGN_TEMPLATES,
  SUPPORTED_CHANNELS,
  isSafeHttpUrl,
  type AutomationRuleRecord,
  type BroadcastChannel,
  type BroadcastSettings,
  type CampaignRecord,
  type ChannelDispatchResult,
  type DeliveryLogRecord,
  type EmailDesignerTemplateSummary,
  type SubscriberRecipient,
} from "../../../shared";
import { clampLimit } from "../services/campaignHelpers";

export interface ControllerCtx {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  request: {
    body?: Record<string, unknown>;
  };
  status?: number;
  body?: unknown;
  badRequest?: (message: string) => unknown;
  notFound?: (message: string) => unknown;
}

function toPlainString(val: unknown): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function respondError(ctx: ControllerCtx, err: unknown): unknown {
  const message = (err as Error)?.message || "Invalid request";
  if (/not found$/i.test(message)) {
    if (typeof ctx.notFound === "function") {
      return ctx.notFound(message);
    }
    ctx.status = 404;
    ctx.body = { error: message };
    return undefined;
  }
  if (typeof ctx.badRequest === "function") {
    return ctx.badRequest(message);
  }
  ctx.status = 400;
  ctx.body = { error: message };
  return undefined;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getSettings(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      getPublicSafeSettings(): Promise<BroadcastSettings>;
    }>("settings");
    const data = await svc.getPublicSafeSettings();
    ctx.body = { data };
  },

  async updateSettings(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      updateSettings(
        patch: Partial<BroadcastSettings>
      ): Promise<BroadcastSettings>;
      getPublicSafeSettings(): Promise<BroadcastSettings>;
    }>("settings");

    try {
      await svc.updateSettings(
        (ctx.request.body || {}) as Partial<BroadcastSettings>
      );
      const data = await svc.getPublicSafeSettings();
      ctx.body = { data };
      return undefined;
    } catch (err) {
      return respondError(ctx, err);
    }
  },

  async listStarterTemplates(ctx: ControllerCtx) {
    ctx.body = { data: STARTER_CAMPAIGN_TEMPLATES };
  },

  async listEmailTemplates(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      listEmailDesignerTemplates(): Promise<EmailDesignerTemplateSummary[]>;
    }>("transportService");
    const data = await svc.listEmailDesignerTemplates();
    ctx.body = { data };
  },

  async listCampaigns(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      listCampaigns(params?: {
        status?: string;
        topic?: string;
      }): Promise<CampaignRecord[]>;
    }>("campaignService");

    const data = await svc.listCampaigns({
      status: toPlainString(ctx.query?.status),
      topic: toPlainString(ctx.query?.topic),
    });
    ctx.body = { data };
  },

  async createCampaign(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      createCampaign(input: Partial<CampaignRecord>): Promise<CampaignRecord>;
    }>("campaignService");

    try {
      const data = await svc.createCampaign(
        (ctx.request.body || {}) as Partial<CampaignRecord>
      );
      ctx.status = 201;
      ctx.body = { data };
      return undefined;
    } catch (err) {
      return respondError(ctx, err);
    }
  },

  async updateCampaign(ctx: ControllerCtx) {
    const documentId = toPlainString(ctx.params?.documentId) || "";
    const svc = strapi.plugin(PLUGIN_ID).service<{
      updateCampaign(
        documentIdOrSlug: string,
        input: Partial<CampaignRecord>
      ): Promise<CampaignRecord>;
    }>("campaignService");

    try {
      const data = await svc.updateCampaign(
        documentId,
        (ctx.request.body || {}) as Partial<CampaignRecord>
      );
      ctx.body = { data };
      return undefined;
    } catch (err) {
      return respondError(ctx, err);
    }
  },

  async createFromTemplate(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      createFromStarterTemplate(templateId: string): Promise<CampaignRecord>;
    }>("campaignService");

    try {
      const body = (ctx.request.body || {}) as { templateId?: unknown };
      const templateId = toPlainString(body.templateId) || "";
      const data = await svc.createFromStarterTemplate(templateId);
      ctx.status = 201;
      ctx.body = { data };
      return undefined;
    } catch (err) {
      return respondError(ctx, err);
    }
  },

  async sendCampaign(ctx: ControllerCtx) {
    const documentId = toPlainString(ctx.params?.documentId) || "";
    const svc = strapi.plugin(PLUGIN_ID).service<{
      dispatchCampaign(
        documentIdOrSlug: string,
        options?: {
          customRecipients?: SubscriberRecipient[];
          testRecipientEmail?: string;
          testRecipientPhone?: string;
          testTelegramChatId?: string;
        }
      ): Promise<{
        campaign: CampaignRecord;
        results: ChannelDispatchResult[];
      }>;
    }>("campaignService");

    try {
      const rawBody =
        ctx.request.body &&
        typeof ctx.request.body === "object" &&
        !Array.isArray(ctx.request.body)
          ? ctx.request.body
          : {};
      const customRecipients = Array.isArray(rawBody.customRecipients)
        ? (rawBody.customRecipients.filter(
            (item): item is Record<string, unknown> =>
              Boolean(item) && typeof item === "object" && !Array.isArray(item)
          ) as unknown as SubscriberRecipient[])
        : undefined;

      const data = await svc.dispatchCampaign(documentId, {
        customRecipients,
        testRecipientEmail: toPlainString(rawBody.testRecipientEmail),
        testRecipientPhone: toPlainString(rawBody.testRecipientPhone),
        testTelegramChatId: toPlainString(rawBody.testTelegramChatId),
      });
      ctx.body = { data };
      return undefined;
    } catch (err) {
      return respondError(ctx, err);
    }
  },

  async listAutomationRules(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      listRules(): Promise<AutomationRuleRecord[]>;
    }>("automationService");

    const data = await svc.listRules();
    ctx.body = { data };
  },

  async createAutomationRule(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      createRule(
        input: Partial<AutomationRuleRecord>
      ): Promise<AutomationRuleRecord>;
    }>("automationService");

    try {
      const data = await svc.createRule(
        (ctx.request.body || {}) as Partial<AutomationRuleRecord>
      );
      ctx.status = 201;
      ctx.body = { data };
      return undefined;
    } catch (err) {
      return respondError(ctx, err);
    }
  },

  async updateAutomationRule(ctx: ControllerCtx) {
    const documentId = toPlainString(ctx.params?.documentId) || "";
    const svc = strapi.plugin(PLUGIN_ID).service<{
      updateRule(
        documentIdOrSlug: string,
        input: Partial<AutomationRuleRecord>
      ): Promise<AutomationRuleRecord>;
    }>("automationService");

    try {
      const data = await svc.updateRule(
        documentId,
        (ctx.request.body || {}) as Partial<AutomationRuleRecord>
      );
      ctx.body = { data };
      return undefined;
    } catch (err) {
      return respondError(ctx, err);
    }
  },

  async listDeliveryLogs(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      listDeliveryLogs(params?: {
        campaignSlug?: string;
        channel?: BroadcastChannel;
        limit?: number;
      }): Promise<DeliveryLogRecord[]>;
    }>("transportService");

    const rawChannel = toPlainString(ctx.query?.channel);
    const channel =
      rawChannel &&
      (SUPPORTED_CHANNELS as readonly string[]).includes(rawChannel)
        ? (rawChannel as BroadcastChannel)
        : undefined;

    const data = await svc.listDeliveryLogs({
      campaignSlug: toPlainString(ctx.query?.campaignSlug),
      channel,
      limit: clampLimit(ctx.query?.limit, 100),
    });
    ctx.body = { data };
  },

  async listPublicChannels(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      getSettings(): Promise<BroadcastSettings>;
    }>("settings");
    const settings = await svc.getSettings();
    const safeLinks = (settings.publicChannelLinks || []).filter((link) =>
      isSafeHttpUrl(link?.inviteUrl)
    );
    ctx.body = {
      data: {
        organizationName: settings.organizationName,
        defaultLocale: settings.defaultLocale,
        supportedLocales: settings.supportedLocales,
        availableTopics: settings.availableTopics,
        publicChannelLinks: safeLinks,
      },
    };
  },

  async listPublicArchive(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      listPublicArchive(params?: {
        topic?: string;
        limit?: number;
      }): Promise<Array<Partial<CampaignRecord>>>;
    }>("campaignService");

    const data = await svc.listPublicArchive({
      topic: toPlainString(ctx.query?.topic),
      limit: clampLimit(ctx.query?.limit, 20),
    });
    ctx.body = { data };
  },
});
