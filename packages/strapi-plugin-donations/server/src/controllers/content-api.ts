import type { Core } from '@strapi/strapi';
import { PLUGIN_ID, type CampaignKind, type InvoiceStatus } from '../../../shared';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async listCampaigns(ctx: any) {
    const campaignService = strapi.plugin(PLUGIN_ID).service('campaign') as any;
    const { locale, kind, category, invoiceStatus } = ctx.query || {};
    const data = await campaignService.findCampaigns({
      locale: locale ? String(locale) : undefined,
      campaignKind: kind ? (String(kind) as CampaignKind) : undefined,
      categoryKey: category ? String(category) : undefined,
      invoiceStatus: invoiceStatus ? (String(invoiceStatus) as InvoiceStatus) : undefined,
      onlyActive: true,
    });
    ctx.body = { data };
  },

  async listUtilityInvoices(ctx: any) {
    const campaignService = strapi.plugin(PLUGIN_ID).service('campaign') as any;
    const { locale, invoiceStatus } = ctx.query || {};
    const data = await campaignService.findCampaigns({
      locale: locale ? String(locale) : undefined,
      campaignKind: 'utility_invoice',
      invoiceStatus: invoiceStatus ? (String(invoiceStatus) as InvoiceStatus) : undefined,
      onlyActive: true,
    });
    ctx.body = { data };
  },

  async getCampaignBySlug(ctx: any) {
    const campaignService = strapi.plugin(PLUGIN_ID).service('campaign') as any;
    const { slug } = ctx.params || {};
    const { locale } = ctx.query || {};
    const item = await campaignService.findCampaignBySlug(
      String(slug || ''),
      locale ? String(locale) : undefined
    );
    if (!item) {
      return ctx.notFound('Campaign or utility invoice not found');
    }
    ctx.body = { data: item };
  },

  async getCalculatorAndDirectory(ctx: any) {
    const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
    const settings = await settingsService.getSettings();
    ctx.body = {
      data: {
        baseCurrency: settings.baseCurrency,
        supportedCurrencies: settings.supportedCurrencies,
        exchangeRatesToBase: settings.exchangeRatesToBase,
        defaultSuggestedAmounts: settings.defaultSuggestedAmounts,
        categories: settings.categories,
        assessmentProfiles: settings.assessmentProfiles,
        paymentMethods: settings.paymentMethods,
      },
    };
  },

  async calculateAssessment(ctx: any) {
    const pledgeService = strapi.plugin(PLUGIN_ID).service('pledge') as any;
    try {
      const body = ctx.request?.body?.data || ctx.request?.body || {};
      const result = await pledgeService.calculateAssessment(body);
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.badRequest(err?.message || 'Unable to evaluate assessment calculation');
    }
  },

  async submitPledge(ctx: any) {
    const pledgeService = strapi.plugin(PLUGIN_ID).service('pledge') as any;
    try {
      const body = ctx.request?.body?.data || ctx.request?.body || {};
      if (!body.donorEmail) {
        return ctx.badRequest('donorEmail is required');
      }
      const created = await pledgeService.createPledge(body);
      ctx.status = 201;
      ctx.body = { data: created };
    } catch (err: any) {
      ctx.badRequest(err?.message || 'Unable to submit donation pledge');
    }
  },

  async handleWebhook(ctx: any) {
    const pledgeService = strapi.plugin(PLUGIN_ID).service('pledge') as any;
    try {
      const payload = ctx.request?.body || {};
      const rawBody =
        typeof ctx.request?.rawBody === 'string'
          ? ctx.request.rawBody
          : JSON.stringify(payload);
      const signatureHeader =
        ctx.request?.headers?.['x-webhook-signature'] ||
        ctx.request?.headers?.['x-signature'] ||
        ctx.request?.headers?.['stripe-signature'];

      const result = await pledgeService.handleGatewayWebhook({
        rawBody,
        signatureHeader: signatureHeader ? String(signatureHeader) : undefined,
        payload,
      });
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.status = 401;
      ctx.body = { error: err?.message || 'Webhook verification failed' };
    }
  },
});
