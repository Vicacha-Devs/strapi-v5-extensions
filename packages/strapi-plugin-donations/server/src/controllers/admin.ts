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
    const { locale, status } = ctx.query || {};

    const [campaigns, pledges] = await Promise.all([
      campaignService.findCampaigns({
        locale: locale ? String(locale) : undefined,
        onlyActive: false,
      }),
      pledgeService.findPledges({
        status: status ? (String(status) as PledgeStatus) : undefined,
      }),
    ]);

    const majorCampaigns = campaigns.filter((c: any) => c.campaignKind === 'major_campaign');
    const utilityInvoices = campaigns.filter((c: any) => c.campaignKind === 'utility_invoice');

    ctx.body = {
      data: {
        campaigns,
        majorCampaigns,
        utilityInvoices,
        pledges,
      },
    };
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
