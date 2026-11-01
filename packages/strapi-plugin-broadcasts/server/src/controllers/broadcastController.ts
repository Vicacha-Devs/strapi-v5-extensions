import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  STARTER_CAMPAIGN_TEMPLATES,
  type AutomationRuleRecord,
  type BroadcastChannel,
  type BroadcastSettings,
  type CampaignRecord,
  type ChannelDispatchResult,
  type DeliveryLogRecord,
  type EmailDesignerTemplateSummary,
  type SubscriberRecipient,
} from "../../../shared";

interface ControllerCtx {
  params?: Record<string, string>;
  query?: Record<string, string>;
  request: {
    body?: Record<string, unknown>;
  };
  status?: number;
  body?: unknown;
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
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: (err as Error).message };
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
      status: ctx.query?.status,
      topic: ctx.query?.topic,
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
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async updateCampaign(ctx: ControllerCtx) {
    const documentId = ctx.params?.documentId || "";
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
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async createFromTemplate(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      createFromStarterTemplate(templateId: string): Promise<CampaignRecord>;
    }>("campaignService");

    try {
      const body = (ctx.request.body || {}) as { templateId: string };
      const data = await svc.createFromStarterTemplate(body.templateId);
      ctx.status = 201;
      ctx.body = { data };
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async sendCampaign(ctx: ControllerCtx) {
    const documentId = ctx.params?.documentId || "";
    const svc = strapi.plugin(PLUGIN_ID).service<{
      dispatchCampaign(
        documentIdOrSlug: string,
        options?: {
          customRecipients?: SubscriberRecipient[];
          testRecipientEmail?: string;
          testRecipientPhone?: string;
        }
      ): Promise<{
        campaign: CampaignRecord;
        results: ChannelDispatchResult[];
      }>;
    }>("campaignService");

    try {
      const body = (ctx.request.body || {}) as {
        customRecipients?: SubscriberRecipient[];
        testRecipientEmail?: string;
        testRecipientPhone?: string;
      };
      const data = await svc.dispatchCampaign(documentId, body);
      ctx.body = { data };
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: (err as Error).message };
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
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async updateAutomationRule(ctx: ControllerCtx) {
    const documentId = ctx.params?.documentId || "";
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
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async listDeliveryLogs(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      listDeliveryLogs(params?: {
        campaignSlug?: string;
        channel?: BroadcastChannel;
      }): Promise<DeliveryLogRecord[]>;
    }>("transportService");

    const data = await svc.listDeliveryLogs({
      campaignSlug: ctx.query?.campaignSlug,
      channel: ctx.query?.channel as BroadcastChannel | undefined,
    });
    ctx.body = { data };
  },

  async listPublicChannels(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      getSettings(): Promise<BroadcastSettings>;
    }>("settings");
    const settings = await svc.getSettings();
    ctx.body = {
      data: {
        organizationName: settings.organizationName,
        defaultLocale: settings.defaultLocale,
        supportedLocales: settings.supportedLocales,
        availableTopics: settings.availableTopics,
        publicChannelLinks: settings.publicChannelLinks || [],
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
      topic: ctx.query?.topic,
      limit: ctx.query?.limit ? Number(ctx.query.limit) : 20,
    });
    ctx.body = { data };
  },
});
