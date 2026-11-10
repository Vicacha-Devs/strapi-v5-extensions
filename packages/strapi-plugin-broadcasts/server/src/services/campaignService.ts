import type { Core } from "@strapi/strapi";

import {
  CAMPAIGN_UID,
  PLUGIN_ID,
  STARTER_CAMPAIGN_TEMPLATES,
  escapeHtml,
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
import { clampLimit, createEmptyStats } from "./campaignHelpers";
import {
  buildSelectedRecipients,
  computeCampaignSecondaryDate,
  resolveInitialStatus,
  resolveUpdatedStatus,
  type RawDispatchOptions,
} from "./campaignLifecycle";

const createCampaignService = ({ strapi }: { strapi: Core.Strapi }) => {
  const activeDispatches = new Set<string>();

  return {
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
      if (typeof params?.status === "string" && params.status.trim()) {
        filters.status = params.status.trim();
      }
      if (typeof params?.topic === "string" && params.topic.trim()) {
        filters.topic = params.topic.trim();
      }
      const docs = await strapi
        .documents(CAMPAIGN_UID)
        .findMany({ filters, limit: 100 });
      return docs as unknown as CampaignRecord[];
    },

    async listPublicArchive(params?: { topic?: string; limit?: number }) {
      const filters: Record<string, unknown> = { status: "sent" };
      if (typeof params?.topic === "string" && params.topic.trim()) {
        filters.topic = params.topic.trim();
      }
      const docs = (await strapi.documents(CAMPAIGN_UID).findMany({
        filters,
        limit: clampLimit(params?.limit, 20),
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
      const initialStatus = resolveInitialStatus(input.status);
      const rawChannels =
        input.channels === undefined ? ["email"] : input.channels;
      const validation = validateCampaignInput({
        ...input,
        channels: rawChannels as CampaignRecord["channels"],
      });
      if (!validation.valid) {
        throw new Error(validation.errors.join("; "));
      }

      const channels = normalizeChannels(rawChannels);
      const candidate: Partial<CampaignRecord> = {
        ...input,
        channels,
        emailTemplateRef:
          input.emailTemplateRef !== undefined
            ? String(input.emailTemplateRef).trim()
            : undefined,
      };

      const settings = await this.getSettingsService().getSettings();
      const secondaryCal =
        settings.secondaryCalendars?.[0] || "islamic-umalqura";
      const baseIso = input.scheduledAt || new Date().toISOString();
      const referenceIso = baseIso.slice(0, 10);
      const secondaryDate = formatSecondaryDate(
        referenceIso,
        secondaryCal,
        settings.defaultLocale || "es"
      );

      const created = await strapi.documents(CAMPAIGN_UID).create({
        data: {
          ...buildCampaignDocumentData(candidate, channels, initialStatus),
          secondaryDate,
          secondaryDateLabel: secondaryDate.formatted,
          stats: createEmptyStats(),
          metadata: candidate.metadata || {},
        },
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

      const nextStatus = resolveUpdatedStatus(
        existing.status || "draft",
        input.status
      );
      const rawChannels =
        input.channels === undefined ? existing.channels : input.channels;

      const resolvedBodyHtml =
        input.bodyHtml !== undefined
          ? input.bodyHtml
          : input.bodyText !== undefined &&
              (input.bodyText !== existing.bodyText || !existing.bodyHtml)
            ? `<p>${escapeHtml(String(input.bodyText))}</p>`
            : existing.bodyHtml;

      const resolvedEmailTemplateRef =
        input.emailTemplateRef !== undefined
          ? String(input.emailTemplateRef).trim()
          : existing.emailTemplateRef;

      const mergedForValidation: Partial<CampaignRecord> = {
        ...existing,
        ...input,
        bodyHtml: resolvedBodyHtml,
        emailTemplateRef: resolvedEmailTemplateRef,
        channels: rawChannels as CampaignRecord["channels"],
        status: nextStatus,
      };
      const validation = validateCampaignInput(mergedForValidation);
      if (!validation.valid) {
        throw new Error(validation.errors.join("; "));
      }

      const channels = normalizeChannels(rawChannels);
      const merged: Partial<CampaignRecord> = {
        ...mergedForValidation,
        channels,
      };

      const updated = await strapi.documents(CAMPAIGN_UID).update({
        documentId: existing.documentId,
        data: buildCampaignDocumentData(merged, channels, nextStatus),
      });

      return (
        (updated as unknown as CampaignRecord) || (merged as CampaignRecord)
      );
    },

    async createFromStarterTemplate(
      templateId: string
    ): Promise<CampaignRecord> {
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
      options: RawDispatchOptions
    ) {
      return buildSelectedRecipients(campaign, settings, options, (topic) =>
        this.resolveRecipientsForTopic(topic)
      );
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
        testTelegramChatId?: string;
      } = {}
    ): Promise<{ campaign: CampaignRecord; results: ChannelDispatchResult[] }> {
      const acquiredLocks: string[] = [];
      const tryAcquireBatch = (keys: string[], label: string): void => {
        const toAcquire = Array.from(
          new Set(keys.filter((k) => Boolean(k) && !acquiredLocks.includes(k)))
        );
        for (const key of toAcquire) {
          if (activeDispatches.has(key)) {
            throw new Error(`Campaign "${label}" is already being dispatched`);
          }
        }
        for (const key of toAcquire) {
          activeDispatches.add(key);
          acquiredLocks.push(key);
        }
      };

      const rawRef = String(documentIdOrSlug || "").trim();
      tryAcquireBatch([`req:${rawRef}`], rawRef || documentIdOrSlug);

      let campaign: CampaignRecord | null = null;
      let transitionedToSending = false;

      try {
        campaign = await this.findCampaignByDocIdOrSlug(rawRef);
        if (!campaign) {
          throw new Error(`Campaign "${documentIdOrSlug}" not found`);
        }

        const canonicalKeys = [`slug:${campaign.slug}`, `req:${campaign.slug}`];
        if (campaign.documentId) {
          canonicalKeys.push(
            `doc:${campaign.documentId}`,
            `req:${campaign.documentId}`
          );
        }
        tryAcquireBatch(canonicalKeys, campaign.slug);

        if (campaign.status === "cancelled") {
          throw new Error(
            `Cannot dispatch cancelled campaign "${campaign.slug}"`
          );
        }
        if (campaign.status === "sending") {
          throw new Error(`Campaign "${campaign.slug}" is already sending`);
        }

        const settings = await this.getSettingsService().getSettings();
        const transport = this.getTransportService();
        const secondaryDate = computeCampaignSecondaryDate(campaign, settings);
        const secondaryDateLabel =
          campaign.secondaryDateLabel || secondaryDate.formatted;

        const { isTestDispatch, testTelegramChatId, recipients } =
          await this.selectCampaignRecipients(
            campaign,
            settings,
            options as RawDispatchOptions
          );

        if (!isTestDispatch && campaign.documentId) {
          await strapi.documents(CAMPAIGN_UID).update({
            documentId: campaign.documentId,
            data: { status: "sending" },
          });
          transitionedToSending = true;
        }

        const stats = createEmptyStats();
        const results = await dispatchAllActiveChannels({
          transport,
          campaign,
          settings,
          recipients,
          isTestDispatch,
          testTelegramChatId,
          secondaryDateLabel,
          stats,
        });

        if (isTestDispatch) {
          return { campaign, results };
        }

        const updatedCampaign = await this.finalizeDispatchedCampaign(
          campaign,
          secondaryDate,
          secondaryDateLabel,
          stats
        );

        return { campaign: updatedCampaign, results };
      } catch (err) {
        if (transitionedToSending && campaign?.documentId) {
          try {
            await strapi.documents(CAMPAIGN_UID).update({
              documentId: campaign.documentId,
              data: { status: "failed" },
            });
          } catch {
            // Preserve primary dispatch error if fallback status update fails
          }
        }
        throw err;
      } finally {
        for (const key of acquiredLocks) {
          activeDispatches.delete(key);
        }
      }
    },
  };
};

export default createCampaignService;
