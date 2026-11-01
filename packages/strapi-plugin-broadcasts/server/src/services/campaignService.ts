import type { Core } from "@strapi/strapi";

import {
  CAMPAIGN_UID,
  PLUGIN_ID,
  STARTER_CAMPAIGN_TEMPLATES,
  formatSecondaryDate,
  normalizeChannels,
  validateCampaignInput,
  type BroadcastSettings,
  type CampaignRecord,
  type CampaignStats,
  type ChannelDispatchResult,
  type SubscriberRecipient,
} from "../../../shared";
import {
  buildCampaignDocumentData,
  buildPresetCampaignPayload,
  dispatchAllActiveChannels,
  mapRawSubscriber,
  type TransportServiceContract,
} from "./campaignChannelDispatch";
import { createEmptyStats } from "./campaignHelpers";

function computeCampaignSecondaryDate(
  campaign: CampaignRecord,
  settings: BroadcastSettings
): NonNullable<CampaignRecord["secondaryDate"]> {
  if (campaign.secondaryDate?.formatted) {
    return campaign.secondaryDate;
  }
  const secondaryCal = settings.secondaryCalendars?.[0] || "islamic-umalqura";
  return formatSecondaryDate(
    new Date().toISOString().slice(0, 10),
    secondaryCal,
    settings.defaultLocale || "es"
  );
}

const createCampaignService = ({ strapi }: { strapi: Core.Strapi }) => ({
  getSettingsService() {
    return strapi.plugin(PLUGIN_ID).service("settings") as {
      getSettings(): Promise<BroadcastSettings>;
    };
  },

  getTransportService(): TransportServiceContract {
    return strapi
      .plugin(PLUGIN_ID)
      .service("transportService") as TransportServiceContract;
  },

  async listCampaigns(params?: {
    status?: string;
    topic?: string;
  }): Promise<CampaignRecord[]> {
    const filters: Record<string, unknown> = {};
    if (params?.status) filters.status = params.status;
    if (params?.topic) filters.topic = params.topic;
    const docs = await strapi
      .documents(CAMPAIGN_UID)
      .findMany({ filters, limit: 100 });
    return docs as unknown as CampaignRecord[];
  },

  async listPublicArchive(params?: { topic?: string; limit?: number }) {
    const filters: Record<string, unknown> = { status: "sent" };
    if (params?.topic) filters.topic = params.topic;
    const docs = (await strapi.documents(CAMPAIGN_UID).findMany({
      filters,
      limit: params?.limit || 20,
    })) as unknown as CampaignRecord[];

    return docs.map((c) => ({
      slug: c.slug,
      title: c.title,
      topic: c.topic,
      subject: c.subject,
      bodyText: c.bodyText,
      ctaLabel: c.ctaLabel,
      ctaUrl: c.ctaUrl,
      sentAt: c.sentAt,
      secondaryDateLabel: c.secondaryDateLabel,
      translations: c.translations,
    }));
  },

  async getCampaignBySlug(slug: string): Promise<CampaignRecord | null> {
    const docs = await strapi.documents(CAMPAIGN_UID).findMany({
      filters: { slug },
      limit: 1,
    });
    return (docs[0] as unknown as CampaignRecord) || null;
  },

  async findCampaignByDocIdOrSlug(
    documentIdOrSlug: string
  ): Promise<CampaignRecord | null> {
    const byDoc = (await strapi.documents(CAMPAIGN_UID).findOne({
      documentId: documentIdOrSlug,
    })) as unknown as CampaignRecord | null;
    return byDoc ?? (await this.getCampaignBySlug(documentIdOrSlug));
  },

  async createCampaign(
    input: Partial<CampaignRecord>
  ): Promise<CampaignRecord> {
    const channels = normalizeChannels(input.channels);
    const candidate: Partial<CampaignRecord> = { ...input, channels };
    const validation = validateCampaignInput(candidate);
    if (!validation.valid) {
      throw new Error(validation.errors.join("; "));
    }

    const settings = await this.getSettingsService().getSettings();
    const secondaryCal = settings.secondaryCalendars?.[0] || "islamic-umalqura";
    const referenceIso = (input.scheduledAt || new Date().toISOString()).slice(
      0,
      10
    );
    const secondaryDate = formatSecondaryDate(
      referenceIso,
      secondaryCal,
      settings.defaultLocale || "es"
    );

    const created = await strapi.documents(CAMPAIGN_UID).create({
      data: {
        ...buildCampaignDocumentData(candidate, channels, "draft"),
        secondaryDate,
        secondaryDateLabel: secondaryDate.formatted,
        stats: candidate.stats || createEmptyStats(),
        metadata: candidate.metadata || {},
      },
      status: "published",
    });

    return created as unknown as CampaignRecord;
  },

  async updateCampaign(
    documentIdOrSlug: string,
    input: Partial<CampaignRecord>
  ): Promise<CampaignRecord> {
    const existing = await this.findCampaignByDocIdOrSlug(documentIdOrSlug);
    if (!existing?.documentId) {
      throw new Error(`Campaign "${documentIdOrSlug}" not found`);
    }

    const channels = normalizeChannels(input.channels ?? existing.channels);
    const merged: Partial<CampaignRecord> = {
      ...existing,
      ...input,
      channels,
    };
    const validation = validateCampaignInput(merged);
    if (!validation.valid) {
      throw new Error(validation.errors.join("; "));
    }

    const updated = await strapi.documents(CAMPAIGN_UID).update({
      documentId: existing.documentId,
      data: buildCampaignDocumentData(
        merged,
        channels,
        existing.status || "draft"
      ),
    });

    return (updated as unknown as CampaignRecord) || (merged as CampaignRecord);
  },

  async createFromStarterTemplate(templateId: string): Promise<CampaignRecord> {
    const tpl = STARTER_CAMPAIGN_TEMPLATES.find(
      (item) => item.id === templateId || item.slug === templateId
    );
    if (!tpl) {
      throw new Error(`Starter campaign template "${templateId}" not found`);
    }
    const existing = await this.getCampaignBySlug(tpl.slug);
    if (existing) return existing;

    return this.createCampaign(buildPresetCampaignPayload(tpl));
  },

  async seedStarterCampaigns(): Promise<number> {
    const settings = await this.getSettingsService().getSettings();
    const presets = settings.presetCampaigns?.length
      ? settings.presetCampaigns
      : STARTER_CAMPAIGN_TEMPLATES;

    let seededCount = 0;
    for (const preset of presets) {
      if (!preset.slug || !preset.title) continue;
      const existing = await this.getCampaignBySlug(preset.slug);
      if (existing) continue;
      await this.createCampaign(buildPresetCampaignPayload(preset));
      seededCount += 1;
    }
    return seededCount;
  },

  async resolveRecipientsForTopic(
    topic: string
  ): Promise<SubscriberRecipient[]> {
    const settings = await this.getSettingsService().getSettings();
    if (!settings.enableInboxSubscriberBridge) return [];

    try {
      const inboxPlugin = strapi.plugin("inbox");
      const subscriberService = inboxPlugin?.service<{
        listSubscribers?: (params: {
          status?: string;
          topic?: string;
        }) => Promise<Array<Record<string, unknown>>>;
      }>("subscriberService");

      if (subscriberService?.listSubscribers) {
        const list = await subscriberService.listSubscribers({
          status: "confirmed",
          topic,
        });
        return list.map((sub) =>
          mapRawSubscriber(sub, settings.defaultLocale || "es")
        );
      }
    } catch {
      // Fallback when inbox plugin is not registered in isolated unit tests
    }
    return [];
  },

  async selectCampaignRecipients(
    campaign: CampaignRecord,
    settings: BroadcastSettings,
    options: {
      customRecipients?: SubscriberRecipient[];
      testRecipientEmail?: string;
      testRecipientPhone?: string;
    }
  ): Promise<{ isTestDispatch: boolean; recipients: SubscriberRecipient[] }> {
    const isTestDispatch = Boolean(
      options.testRecipientEmail || options.testRecipientPhone
    );
    if (isTestDispatch) {
      return {
        isTestDispatch: true,
        recipients: [
          {
            email: options.testRecipientEmail,
            phone: options.testRecipientPhone,
            fullName: "Test Recipient",
            locale: settings.defaultLocale,
            topics: [campaign.topic],
          },
        ],
      };
    }
    if (options.customRecipients && options.customRecipients.length > 0) {
      return { isTestDispatch: false, recipients: options.customRecipients };
    }
    return {
      isTestDispatch: false,
      recipients: await this.resolveRecipientsForTopic(campaign.topic),
    };
  },

  async finalizeDispatchedCampaign(
    campaign: CampaignRecord,
    secondaryDate: CampaignRecord["secondaryDate"],
    secondaryDateLabel: string,
    stats: CampaignStats
  ): Promise<CampaignRecord> {
    const finalStatus =
      stats.totalRecipients > 0 && stats.failedCount === stats.totalRecipients
        ? "failed"
        : "sent";
    const sentAt = new Date().toISOString();

    let updatedCampaign: CampaignRecord = {
      ...campaign,
      status: finalStatus,
      sentAt,
      secondaryDateLabel,
      stats,
    };

    if (campaign.documentId) {
      const updated = await strapi.documents(CAMPAIGN_UID).update({
        documentId: campaign.documentId,
        data: {
          status: finalStatus,
          sentAt,
          secondaryDate,
          secondaryDateLabel,
          stats,
        },
      });
      if (updated) updatedCampaign = updated as unknown as CampaignRecord;
    }

    strapi.eventHub?.emit("broadcasts.campaign.sent", {
      slug: updatedCampaign.slug,
      topic: updatedCampaign.topic,
      stats,
    });

    return updatedCampaign;
  },

  async dispatchCampaign(
    documentIdOrSlug: string,
    options: {
      customRecipients?: SubscriberRecipient[];
      testRecipientEmail?: string;
      testRecipientPhone?: string;
    } = {}
  ): Promise<{ campaign: CampaignRecord; results: ChannelDispatchResult[] }> {
    const campaign = await this.findCampaignByDocIdOrSlug(documentIdOrSlug);
    if (!campaign) throw new Error(`Campaign "${documentIdOrSlug}" not found`);

    const settings = await this.getSettingsService().getSettings();
    const transport = this.getTransportService();
    const secondaryDate = computeCampaignSecondaryDate(campaign, settings);
    const secondaryDateLabel =
      campaign.secondaryDateLabel || secondaryDate.formatted;

    const { isTestDispatch, recipients } = await this.selectCampaignRecipients(
      campaign,
      settings,
      options
    );

    const stats = createEmptyStats();
    const results = await dispatchAllActiveChannels({
      transport,
      campaign,
      settings,
      recipients,
      isTestDispatch,
      secondaryDateLabel,
      stats,
    });

    const updatedCampaign = await this.finalizeDispatchedCampaign(
      campaign,
      secondaryDate,
      secondaryDateLabel,
      stats
    );

    return { campaign: updatedCampaign, results };
  },
});

export default createCampaignService;
