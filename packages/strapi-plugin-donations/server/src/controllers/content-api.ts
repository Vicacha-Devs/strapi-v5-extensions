import type { Core } from '@strapi/strapi';
import {
  PLUGIN_ID,
  type AssessmentCalculationInput,
  type CampaignKind,
  type InvoiceStatus,
} from '../../../shared';
import type campaignServiceFactory from '../services/campaignService';
import type pledgeServiceFactory from '../services/pledgeService';
import type settingsServiceFactory from '../services/settings';

export interface ContentApiControllerContext {
  query?: Record<string, string | undefined>;
  params?: Record<string, string | undefined>;
  request?: {
    body?: {
      data?: Record<string, unknown>;
      [key: string]: unknown;
    };
    rawBody?: string;
    headers?: Record<string, string | string[] | undefined>;
  };
  status?: number;
  body?: unknown;
  badRequest: (message: string) => unknown;
  notFound: (message: string) => unknown;
}

function extractBody(
  ctx: ContentApiControllerContext
): Record<string, unknown> {
  const rawBody = ctx.request?.body;
  if (rawBody?.data && typeof rawBody.data === 'object') {
    return rawBody.data;
  }
  return rawBody || {};
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsSvc = () =>
    strapi.plugin(PLUGIN_ID).service('settings') as ReturnType<
      typeof settingsServiceFactory
    >;
  const getCampaignSvc = () =>
    strapi.plugin(PLUGIN_ID).service('campaign') as ReturnType<
      typeof campaignServiceFactory
    >;
  const getPledgeSvc = () =>
    strapi.plugin(PLUGIN_ID).service('pledge') as ReturnType<
      typeof pledgeServiceFactory
    >;

  return {
    async listCampaigns(ctx: ContentApiControllerContext) {
      const { locale, kind, category, invoiceStatus } = ctx.query || {};
      const data = await getCampaignSvc().findCampaigns({
        locale: locale ? String(locale) : undefined,
        campaignKind: kind ? (String(kind) as CampaignKind) : undefined,
        categoryKey: category ? String(category) : undefined,
        invoiceStatus: invoiceStatus
          ? (String(invoiceStatus) as InvoiceStatus)
          : undefined,
        onlyActive: true,
      });
      ctx.body = { data };
    },

    async listUtilityInvoices(ctx: ContentApiControllerContext) {
      const { locale, invoiceStatus } = ctx.query || {};
      const data = await getCampaignSvc().findCampaigns({
        locale: locale ? String(locale) : undefined,
        campaignKind: 'utility_invoice',
        invoiceStatus: invoiceStatus
          ? (String(invoiceStatus) as InvoiceStatus)
          : undefined,
        onlyActive: true,
      });
      ctx.body = { data };
    },

    async getCampaignBySlug(ctx: ContentApiControllerContext) {
      const { slug } = ctx.params || {};
      const { locale } = ctx.query || {};
      const item = await getCampaignSvc().findCampaignBySlug(
        String(slug || ''),
        locale ? String(locale) : undefined
      );
      if (!item) {
        return ctx.notFound('Campaign or utility invoice not found');
      }
      ctx.body = { data: item };
    },

    async getCalculatorAndDirectory(ctx: ContentApiControllerContext) {
      const settings = await getSettingsSvc().getSettings();
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

    async calculateAssessment(ctx: ContentApiControllerContext) {
      try {
        const body = extractBody(ctx) as unknown as AssessmentCalculationInput;
        const result = await getPledgeSvc().calculateAssessment(body);
        ctx.body = { data: result };
      } catch (err: unknown) {
        ctx.badRequest(
          (err as Error)?.message || 'Unable to evaluate assessment calculation'
        );
      }
    },

    async submitPledge(ctx: ContentApiControllerContext) {
      try {
        const body = extractBody(ctx);
        if (!body.donorEmail) {
          return ctx.badRequest('donorEmail is required');
        }
        const created = await getPledgeSvc().createPledge(body as never);
        ctx.status = 201;
        ctx.body = { data: created };
      } catch (err: unknown) {
        ctx.badRequest(
          (err as Error)?.message || 'Unable to submit donation pledge'
        );
      }
    },

    async handleWebhook(ctx: ContentApiControllerContext) {
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

        const result = await getPledgeSvc().handleGatewayWebhook({
          rawBody,
          signatureHeader: signatureHeader ? String(signatureHeader) : undefined,
          payload,
        });
        ctx.body = { data: result };
      } catch (err: unknown) {
        ctx.status = 401;
        ctx.body = {
          error: (err as Error)?.message || 'Webhook verification failed',
        };
      }
    },
  };
};
