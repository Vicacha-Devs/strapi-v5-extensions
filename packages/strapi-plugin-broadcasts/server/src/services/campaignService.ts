import type { Core } from '@strapi/strapi';
import {
  CAMPAIGN_UID,
  PLUGIN_ID,
  STARTER_CAMPAIGN_TEMPLATES,
  formatSecondaryDate,
  interpolateBroadcastTemplate,
  normalizeChannels,
  resolveLocalizedCampaignCopy,
  validateCampaignInput,
  type BroadcastChannel,
  type BroadcastSettings,
  type CampaignRecord,
  type CampaignStats,
  type ChannelDispatchCount,
  type ChannelDispatchResult,
  type SubscriberRecipient,
} from '../../../shared';
import type {
  EmailSendPayload,
  TelegramSendPayload,
  WhatsAppSendPayload,
} from './transportService';

function createEmptyStats(): CampaignStats {
  return {
    totalRecipients: 0,
    sentCount: 0,
    simulatedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    byChannel: {},
  };
}

function recordResultInStats(stats: CampaignStats, result: ChannelDispatchResult): void {
  stats.totalRecipients += 1;
  const bucket: ChannelDispatchCount = stats.byChannel[result.channel] || {
    sent: 0,
    simulated: 0,
    skipped: 0,
    failed: 0,
  };
  if (result.status === 'sent') {
    stats.sentCount += 1;
    bucket.sent += 1;
  } else if (result.status === 'simulated') {
    stats.simulatedCount += 1;
    bucket.simulated += 1;
  } else if (result.status === 'skipped_duplicate') {
    stats.skippedCount += 1;
    bucket.skipped += 1;
  } else {
    stats.failedCount += 1;
    bucket.failed += 1;
  }
  stats.byChannel[result.channel] = bucket;
}

const createCampaignService = ({ strapi }: { strapi: Core.Strapi }) => ({
  getSettingsService() {
    return strapi.plugin(PLUGIN_ID).service('settings') as {
      getSettings(): Promise<BroadcastSettings>;
    };
  },

  getTransportService() {
    return strapi.plugin(PLUGIN_ID).service('transportService') as {
      sendEmailBroadcast(payload: EmailSendPayload): Promise<ChannelDispatchResult>;
      sendTelegramBroadcast(payload: TelegramSendPayload): Promise<ChannelDispatchResult>;
      sendWhatsAppBroadcast(payload: WhatsAppSendPayload): Promise<ChannelDispatchResult>;
    };
  },

  async listCampaigns(params?: { status?: string; topic?: string }): Promise<CampaignRecord[]> {
    const filters: Record<string, unknown> = {};
    if (params?.status) filters.status = params.status;
    if (params?.topic) filters.topic = params.topic;
    const docs = await strapi.documents(CAMPAIGN_UID).findMany({ filters, limit: 100 });
    return docs as unknown as CampaignRecord[];
  },

  async listPublicArchive(params?: { topic?: string; limit?: number }) {
    const filters: Record<string, unknown> = { status: 'sent' };
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

  async createCampaign(input: Partial<CampaignRecord>): Promise<CampaignRecord> {
    const channels = normalizeChannels(input.channels);
    const candidate: Partial<CampaignRecord> = { ...input, channels };
    const validation = validateCampaignInput(candidate);
    if (!validation.valid) {
      throw new Error(validation.errors.join('; '));
    }

    const settings = await this.getSettingsService().getSettings();
    const secondaryCal = settings.secondaryCalendars?.[0] || 'islamic-umalqura';
    const referenceIso = (input.scheduledAt || new Date().toISOString()).slice(0, 10);
    const secondaryDate = formatSecondaryDate(
      referenceIso,
      secondaryCal,
      settings.defaultLocale || 'es'
    );

    const created = await strapi.documents(CAMPAIGN_UID).create({
      data: {
        title: candidate.title,
        slug: candidate.slug,
        topic: candidate.topic || 'announcements',
        channels,
        priority: candidate.priority || 'normal',
        status: candidate.status || 'draft',
        scheduledAt: candidate.scheduledAt,
        subject: candidate.subject,
        bodyText: candidate.bodyText,
        bodyHtml: candidate.bodyHtml || `<p>${candidate.bodyText}</p>`,
        ctaLabel: candidate.ctaLabel,
        ctaUrl: candidate.ctaUrl,
        mediaUrl: candidate.mediaUrl,
        emailTemplateRef: candidate.emailTemplateRef,
        whatsappTemplateName: candidate.whatsappTemplateName,
        telegramThreadId: candidate.telegramThreadId,
        translations: candidate.translations || {},
        secondaryDate,
        secondaryDateLabel: secondaryDate.formatted,
        stats: candidate.stats || createEmptyStats(),
        metadata: candidate.metadata || {},
      },
      status: 'published',
    });

    return created as unknown as CampaignRecord;
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

    return this.createCampaign({
      slug: tpl.slug,
      title: tpl.title,
      topic: tpl.topic,
      channels: tpl.channels,
      priority: tpl.priority,
      subject: tpl.subject,
      bodyText: tpl.bodyText,
      bodyHtml: tpl.bodyHtml,
      ctaLabel: tpl.ctaLabel,
      ctaUrl: tpl.ctaUrl,
      translations: tpl.translations,
    });
  },

  async seedStarterCampaigns(): Promise<number> {
    const settings = await this.getSettingsService().getSettings();
    const presets =
      Array.isArray(settings.presetCampaigns) && settings.presetCampaigns.length > 0
        ? settings.presetCampaigns
        : STARTER_CAMPAIGN_TEMPLATES;

    let seededCount = 0;
    for (const preset of presets) {
      if (!preset.slug || !preset.title) continue;
      const existing = await this.getCampaignBySlug(preset.slug);
      if (!existing) {
        await this.createCampaign({
          slug: preset.slug,
          title: preset.title,
          topic: preset.topic || 'announcements',
          channels: preset.channels || ['email', 'telegram'],
          priority: preset.priority || 'normal',
          subject: preset.subject || preset.title,
          bodyText: preset.bodyText || preset.title,
          bodyHtml: preset.bodyHtml,
          ctaLabel: preset.ctaLabel,
          ctaUrl: preset.ctaUrl,
          translations: preset.translations || {},
        });
        seededCount += 1;
      }
    }
    return seededCount;
  },

  async resolveRecipientsForTopic(topic: string): Promise<SubscriberRecipient[]> {
    const settings = await this.getSettingsService().getSettings();
    if (!settings.enableInboxSubscriberBridge) return [];

    try {
      const inboxPlugin = strapi.plugin('inbox');
      const subscriberService = inboxPlugin?.service<{
        listSubscribers?: (params: {
          status?: string;
          topic?: string;
        }) => Promise<Array<Record<string, unknown>>>;
      }>('subscriberService');

      if (subscriberService?.listSubscribers) {
        const list = await subscriberService.listSubscribers({ status: 'confirmed', topic });
        return list.map((sub) => ({
          email: typeof sub.email === 'string' ? sub.email : undefined,
          phone: typeof sub.phone === 'string' ? sub.phone : undefined,
          fullName: typeof sub.fullName === 'string' ? sub.fullName : undefined,
          locale: typeof sub.locale === 'string' && sub.locale ? sub.locale : settings.defaultLocale,
          topics: Array.isArray(sub.topics) ? sub.topics.map((t) => String(t)) : ['announcements'],
          unsubscribeToken:
            typeof sub.unsubscribeToken === 'string' ? sub.unsubscribeToken : undefined,
        }));
      }
    } catch {
      // Fallback when inbox plugin is not registered in isolated unit tests
    }
    return [];
  },

  async dispatchCampaign(
    documentIdOrSlug: string,
    options: {
      customRecipients?: SubscriberRecipient[];
      testRecipientEmail?: string;
      testRecipientPhone?: string;
    } = {}
  ): Promise<{ campaign: CampaignRecord; results: ChannelDispatchResult[] }> {
    let campaign = (await strapi
      .documents(CAMPAIGN_UID)
      .findOne({ documentId: documentIdOrSlug })) as unknown as CampaignRecord | null;

    if (!campaign) campaign = await this.getCampaignBySlug(documentIdOrSlug);
    if (!campaign) throw new Error(`Campaign "${documentIdOrSlug}" not found`);

    const settings = await this.getSettingsService().getSettings();
    const transport = this.getTransportService();
    const secondaryCal = settings.secondaryCalendars?.[0] || 'islamic-umalqura';
    const secondaryDate = campaign.secondaryDate?.formatted
      ? campaign.secondaryDate
      : formatSecondaryDate(
          new Date().toISOString().slice(0, 10),
          secondaryCal,
          settings.defaultLocale || 'es'
        );
    const secondaryDateLabel = campaign.secondaryDateLabel || secondaryDate.formatted;

    let recipients: SubscriberRecipient[] = [];
    if (options.testRecipientEmail || options.testRecipientPhone) {
      recipients = [
        {
          email: options.testRecipientEmail,
          phone: options.testRecipientPhone,
          fullName: 'Test Recipient',
          locale: settings.defaultLocale,
          topics: [campaign.topic],
        },
      ];
    } else if (Array.isArray(options.customRecipients) && options.customRecipients.length > 0) {
      recipients = options.customRecipients;
    } else {
      recipients = await this.resolveRecipientsForTopic(campaign.topic);
    }

    const stats = createEmptyStats();
    const results: ChannelDispatchResult[] = [];
    const activeChannels: BroadcastChannel[] = normalizeChannels(campaign.channels);

    if (activeChannels.includes('telegram') && settings.telegramEnabled) {
      const channelLocale = settings.defaultLocale || 'es';
      const localized = resolveLocalizedCampaignCopy(campaign, channelLocale, settings.defaultLocale);
      const vars = {
        recipientName: 'Comunidad',
        organizationName: settings.organizationName,
        secondaryDate: secondaryDateLabel,
        siteBaseUrl: settings.siteBaseUrl,
      };
      const tgRes = await transport.sendTelegramBroadcast({
        campaignSlug: campaign.slug,
        chatId: settings.telegramDefaultChatId,
        threadId: campaign.telegramThreadId ?? settings.telegramTopicThreadMap?.[campaign.topic],
        locale: channelLocale,
        subject: interpolateBroadcastTemplate(localized.subject, vars, { escapeHtmlValues: true }),
        htmlBody: interpolateBroadcastTemplate(localized.bodyHtml || localized.bodyText, vars, {
          escapeHtmlValues: true,
        }),
        ctaLabel: localized.ctaLabel,
        ctaUrl: localized.ctaUrl,
        secondaryDateLabel,
      });
      results.push(tgRes);
      recordResultInStats(stats, tgRes);
    }

    if (activeChannels.includes('email')) {
      for (const recipient of recipients) {
        if (!recipient.email) continue;
        const locale = recipient.locale || settings.defaultLocale || 'es';
        const localized = resolveLocalizedCampaignCopy(campaign, locale, settings.defaultLocale);
        const baseSite = settings.siteBaseUrl.replace(/\/+$/, '');
        const unsubscribeUrl = recipient.unsubscribeToken
          ? `${baseSite}/api/inbox/public/unsubscribe?token=${encodeURIComponent(
              recipient.unsubscribeToken
            )}`
          : `${baseSite}/${locale}/unsubscribe`;

        const vars = {
          recipientName: recipient.fullName || recipient.email,
          organizationName: settings.organizationName,
          secondaryDate: secondaryDateLabel,
          siteBaseUrl: settings.siteBaseUrl,
          unsubscribeUrl,
        };
        const emailRes = await transport.sendEmailBroadcast({
          campaignSlug: campaign.slug,
          recipientEmail: recipient.email,
          locale,
          subject: interpolateBroadcastTemplate(localized.subject, vars),
          text: interpolateBroadcastTemplate(localized.bodyText, vars),
          html: interpolateBroadcastTemplate(
            localized.bodyHtml || `<p>${localized.bodyText}</p>`,
            vars,
            { escapeHtmlValues: true }
          ),
          unsubscribeUrl,
          emailTemplateRef: campaign.emailTemplateRef,
          secondaryDateLabel,
        });
        results.push(emailRes);
        recordResultInStats(stats, emailRes);
      }
    }

    if (activeChannels.includes('whatsapp') && settings.whatsappEnabled) {
      const phoneRecipients: SubscriberRecipient[] = [
        ...recipients.filter((r) => Boolean(r.phone)),
        ...(settings.whatsappDefaultRecipients || []).map((phone) => ({
          phone,
          fullName: 'Comunidad',
          locale: settings.defaultLocale || 'es',
          topics: [campaign.topic],
        })),
      ];

      for (const recipient of phoneRecipients) {
        if (!recipient.phone) continue;
        const locale = recipient.locale || settings.defaultLocale || 'es';
        const localized = resolveLocalizedCampaignCopy(campaign, locale, settings.defaultLocale);
        const vars = {
          recipientName: recipient.fullName || 'Comunidad',
          organizationName: settings.organizationName,
          secondaryDate: secondaryDateLabel,
          siteBaseUrl: settings.siteBaseUrl,
        };
        const waRes = await transport.sendWhatsAppBroadcast({
          campaignSlug: campaign.slug,
          recipientPhone: recipient.phone,
          locale,
          textBody: interpolateBroadcastTemplate(localized.bodyText, vars),
          templateName: campaign.whatsappTemplateName,
          ctaUrl: localized.ctaUrl,
          secondaryDateLabel,
        });
        results.push(waRes);
        recordResultInStats(stats, waRes);
      }
    }

    const finalStatus =
      stats.totalRecipients > 0 && stats.failedCount === stats.totalRecipients ? 'failed' : 'sent';
    const sentAt = new Date().toISOString();

    if (campaign.documentId) {
      const updated = await strapi.documents(CAMPAIGN_UID).update({
        documentId: campaign.documentId,
        data: { status: finalStatus, sentAt, secondaryDate, secondaryDateLabel, stats },
      });
      if (updated) campaign = updated as unknown as CampaignRecord;
    } else {
      campaign = { ...campaign, status: finalStatus, sentAt, secondaryDateLabel, stats };
    }

    strapi.eventHub?.emit('broadcasts.campaign.sent', {
      slug: campaign.slug,
      topic: campaign.topic,
      stats,
    });

    return { campaign, results };
  },
});

export default createCampaignService;
