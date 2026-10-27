import type { Core } from '@strapi/strapi';
import { PLUGIN_ID, type PledgeStatus } from '../../../shared';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getSettings(ctx: any) {
    const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
    const data = await settingsService.getSettings();
    ctx.body = { data };
  },

  async updateSettings(ctx: any) {
    const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const data = await settingsService.updateSettings(body);
    ctx.body = { data };
  },

  async getOverview(ctx: any) {
    const campaignService = strapi.plugin(PLUGIN_ID).service('campaign') as any;
    const pledgeService = strapi.plugin(PLUGIN_ID).service('pledge') as any;
    const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
    const { locale, status } = ctx.query || {};

    const [campaigns, pledges, settings] = await Promise.all([
      campaignService.findCampaigns({
        locale: locale ? String(locale) : undefined,
        onlyActive: false,
      }),
      pledgeService.findPledges({
        status: status ? (String(status) as PledgeStatus) : undefined,
      }),
      settingsService.getSettings(),
    ]);

    const majorCampaigns = campaigns.filter((c: any) => c.campaignKind === 'major_campaign');
    const utilityInvoices = campaigns.filter((c: any) => c.campaignKind === 'utility_invoice');
    const microNeeds = campaigns.filter((c: any) => c.campaignKind === 'micro_need');

    ctx.body = {
      data: {
        campaigns,
        majorCampaigns,
        utilityInvoices,
        microNeeds,
        pledges,
        settings,
      },
    };
  },

  async createCampaign(ctx: any) {
    const campaignService = strapi.plugin(PLUGIN_ID).service('campaign') as any;
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    try {
      const created = await campaignService.createCampaign(body);
      ctx.status = 201;
      ctx.body = { data: created };
    } catch (err: any) {
      return ctx.badRequest(err?.message || 'Unable to create campaign');
    }
  },

  async updateCampaign(ctx: any) {
    const campaignService = strapi.plugin(PLUGIN_ID).service('campaign') as any;
    const { identifier } = ctx.params || {};
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const updated = await campaignService.updateCampaign(String(identifier || ''), body);
    if (!updated) {
      return ctx.notFound('Campaign not found');
    }
    ctx.body = { data: updated };
  },

  async addEvidence(ctx: any) {
    const campaignService = strapi.plugin(PLUGIN_ID).service('campaign') as any;
    const { identifier } = ctx.params || {};
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const updated = await campaignService.addCampaignEvidence(String(identifier || ''), {
      ...body,
      verifiedBy: body.verifiedBy || ctx.state?.user?.email || 'admin',
    });
    if (!updated) {
      return ctx.notFound('Campaign not found');
    }
    ctx.body = { data: updated };
  },

  async removeEvidence(ctx: any) {
    const campaignService = strapi.plugin(PLUGIN_ID).service('campaign') as any;
    const { identifier, evidenceId } = ctx.params || {};
    const updated = await campaignService.removeCampaignEvidence(
      String(identifier || ''),
      String(evidenceId || '')
    );
    if (!updated) {
      return ctx.notFound('Campaign not found');
    }
    ctx.body = { data: updated };
  },

  async verifyPledge(ctx: any) {
    const pledgeService = strapi.plugin(PLUGIN_ID).service('pledge') as any;
    const { referenceCode } = ctx.params || {};
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const decision = body.decision === 'rejected' ? 'rejected' : 'verified';

    const updated = await pledgeService.verifyPledge({
      referenceCode: String(referenceCode || ''),
      decision,
      verifiedBy: body.verifiedBy || ctx.state?.user?.email || 'admin',
      transactionReference: body.transactionReference,
      issueTaxCertificate: body.issueTaxCertificate,
    });

    if (!updated) {
      return ctx.notFound('Pledge not found');
    }
    ctx.body = { data: updated };
  },
});

