import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  type DonationCampaignItem,
  type DonationsSettings,
  type PledgeStatus,
} from "../../../shared";
import type campaignServiceFactory from "../services/campaignService";
import type pledgeServiceFactory from "../services/pledgeService";
import type settingsServiceFactory from "../services/settings";

export interface AdminControllerContext {
  query?: Record<string, string | undefined>;
  params?: Record<string, string | undefined>;
  request?: {
    body?: {
      data?: Record<string, unknown>;
      [key: string]: unknown;
    };
  };
  state?: {
    user?: {
      email?: string;
    };
  };
  status?: number;
  body?: unknown;
  badRequest: (message: string) => unknown;
  notFound: (message: string) => unknown;
}

function extractBody(ctx: AdminControllerContext): Record<string, unknown> {
  const rawBody = ctx.request?.body;
  if (rawBody?.data && typeof rawBody.data === "object") {
    return rawBody.data;
  }
  return rawBody || {};
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsSvc = () =>
    strapi.plugin(PLUGIN_ID).service("settings") as ReturnType<typeof settingsServiceFactory>;
  const getCampaignSvc = () =>
    strapi.plugin(PLUGIN_ID).service("campaign") as ReturnType<typeof campaignServiceFactory>;
  const getPledgeSvc = () =>
    strapi.plugin(PLUGIN_ID).service("pledge") as ReturnType<typeof pledgeServiceFactory>;

  return {
    async getSettings(ctx: AdminControllerContext) {
      const data = await getSettingsSvc().getSettings();
      ctx.body = { data };
    },

    async updateSettings(ctx: AdminControllerContext) {
      const body = extractBody(ctx) as Partial<DonationsSettings>;
      const data = await getSettingsSvc().updateSettings(body);
      ctx.body = { data };
    },

    async getOverview(ctx: AdminControllerContext) {
      const { locale, status } = ctx.query || {};

      const [campaigns, pledges, settings] = await Promise.all([
        getCampaignSvc().findCampaigns({
          locale: locale ? String(locale) : undefined,
          onlyActive: false,
        }),
        getPledgeSvc().findPledges({
          status: status ? (String(status) as PledgeStatus) : undefined,
        }),
        getSettingsSvc().getSettings(),
      ]);

      const majorCampaigns = campaigns.filter(
        (c: DonationCampaignItem) => c.campaignKind === "major_campaign"
      );
      const utilityInvoices = campaigns.filter(
        (c: DonationCampaignItem) => c.campaignKind === "utility_invoice"
      );
      const microNeeds = campaigns.filter(
        (c: DonationCampaignItem) => c.campaignKind === "micro_need"
      );

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

    async createCampaign(ctx: AdminControllerContext) {
      const body = extractBody(ctx);
      try {
        const created = await getCampaignSvc().createCampaign(body);
        ctx.status = 201;
        ctx.body = { data: created };
      } catch (err: unknown) {
        return ctx.badRequest((err as Error)?.message || "Unable to create campaign");
      }
    },

    async updateCampaign(ctx: AdminControllerContext) {
      const { identifier } = ctx.params || {};
      const body = extractBody(ctx);
      const updated = await getCampaignSvc().updateCampaign(String(identifier || ""), body);
      if (!updated) {
        return ctx.notFound("Campaign not found");
      }
      ctx.body = { data: updated };
    },

    async addEvidence(ctx: AdminControllerContext) {
      const { identifier } = ctx.params || {};
      const body = extractBody(ctx);
      const verifiedBy =
        (typeof body.verifiedBy === "string" && body.verifiedBy) ||
        ctx.state?.user?.email ||
        "admin";
      const updated = await getCampaignSvc().addCampaignEvidence(String(identifier || ""), {
        ...body,
        verifiedBy,
      });
      if (!updated) {
        return ctx.notFound("Campaign not found");
      }
      ctx.body = { data: updated };
    },

    async removeEvidence(ctx: AdminControllerContext) {
      const { identifier, evidenceId } = ctx.params || {};
      const updated = await getCampaignSvc().removeCampaignEvidence(
        String(identifier || ""),
        String(evidenceId || "")
      );
      if (!updated) {
        return ctx.notFound("Campaign not found");
      }
      ctx.body = { data: updated };
    },

    async verifyPledge(ctx: AdminControllerContext) {
      const { referenceCode } = ctx.params || {};
      const body = extractBody(ctx);
      const decision = body.decision === "rejected" ? "rejected" : "verified";
      const verifiedBy =
        (typeof body.verifiedBy === "string" && body.verifiedBy) ||
        ctx.state?.user?.email ||
        "admin";

      const updated = await getPledgeSvc().verifyPledge({
        referenceCode: String(referenceCode || ""),
        decision,
        verifiedBy,
        transactionReference:
          typeof body.transactionReference === "string" ? body.transactionReference : undefined,
        issueTaxCertificate:
          typeof body.issueTaxCertificate === "boolean" ? body.issueTaxCertificate : undefined,
      });

      if (!updated) {
        return ctx.notFound("Pledge not found");
      }
      ctx.body = { data: updated };
    },
  };
};
