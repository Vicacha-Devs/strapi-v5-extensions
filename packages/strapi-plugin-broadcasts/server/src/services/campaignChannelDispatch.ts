import {
  interpolateBroadcastTemplate,
  normalizeChannels,
  resolveLocalizedCampaignCopy,
  type BroadcastChannel,
  type BroadcastSettings,
  type CampaignRecord,
  type CampaignStats,
  type ChannelDispatchResult,
  type SubscriberRecipient,
} from "../../../shared";
import {
  recordResultInStats,
  resolveTelegramTargets,
  resolveWhatsAppRecipients,
} from "./campaignHelpers";
import type {
  EmailSendPayload,
  TelegramSendPayload,
  WhatsAppSendPayload,
} from "./transportService";

export interface TransportServiceContract {
  sendEmailBroadcast(payload: EmailSendPayload): Promise<ChannelDispatchResult>;
  sendTelegramBroadcast(payload: TelegramSendPayload): Promise<ChannelDispatchResult>;
  sendWhatsAppBroadcast(payload: WhatsAppSendPayload): Promise<ChannelDispatchResult>;
}

export function buildCampaignDocumentData(
  candidate: Partial<CampaignRecord>,
  channels: BroadcastChannel[],
  fallbackStatus = "draft"
): Record<string, unknown> {
  return {
    title: candidate.title,
    slug: candidate.slug,
    topic: candidate.topic || "announcements",
    channels,
    priority: candidate.priority || "normal",
    status: candidate.status || fallbackStatus,
    scheduledAt: candidate.scheduledAt,
    subject: candidate.subject,
    bodyText: candidate.bodyText,
    bodyHtml: candidate.bodyHtml || `<p>${candidate.bodyText}</p>`,
    ctaLabel: candidate.ctaLabel,
    ctaUrl: candidate.ctaUrl,
    mediaUrl: candidate.mediaUrl,
    emailTemplateRef: candidate.emailTemplateRef,
    whatsappTemplateName: candidate.whatsappTemplateName,
    whatsappGroupIds: Array.isArray(candidate.whatsappGroupIds) ? candidate.whatsappGroupIds : [],
    telegramChatId: candidate.telegramChatId,
    telegramThreadId: candidate.telegramThreadId,
    translations: candidate.translations || {},
  };
}

export function buildPresetCampaignPayload(
  preset: Partial<CampaignRecord>
): Partial<CampaignRecord> {
  return {
    slug: preset.slug,
    title: preset.title,
    topic: preset.topic || "announcements",
    channels: preset.channels || ["email", "telegram"],
    priority: preset.priority || "normal",
    subject: preset.subject || preset.title,
    bodyText: preset.bodyText || preset.title,
    bodyHtml: preset.bodyHtml,
    ctaLabel: preset.ctaLabel,
    ctaUrl: preset.ctaUrl,
    emailTemplateRef: preset.emailTemplateRef,
    translations: preset.translations || {},
  };
}

export function mapRawSubscriber(
  sub: Record<string, unknown>,
  defaultLocale: string
): SubscriberRecipient {
  return {
    email: typeof sub.email === "string" ? sub.email : undefined,
    phone: typeof sub.phone === "string" ? sub.phone : undefined,
    fullName: typeof sub.fullName === "string" ? sub.fullName : undefined,
    locale: typeof sub.locale === "string" && sub.locale ? sub.locale : defaultLocale,
    topics: Array.isArray(sub.topics) ? sub.topics.map((t) => String(t)) : ["announcements"],
    unsubscribeToken: typeof sub.unsubscribeToken === "string" ? sub.unsubscribeToken : undefined,
  };
}

async function dispatchTelegramChannel(
  transport: TransportServiceContract,
  campaign: CampaignRecord,
  settings: BroadcastSettings,
  secondaryDateLabel: string,
  stats: CampaignStats,
  results: ChannelDispatchResult[]
): Promise<void> {
  const channelLocale = settings.defaultLocale || "es";
  const localized = resolveLocalizedCampaignCopy(campaign, channelLocale, settings.defaultLocale);
  const vars = {
    recipientName: "Comunidad",
    organizationName: settings.organizationName,
    secondaryDate: secondaryDateLabel,
    siteBaseUrl: settings.siteBaseUrl,
  };
  const tgTargets = resolveTelegramTargets(campaign, settings);
  const threadId = campaign.telegramThreadId ?? settings.telegramTopicThreadMap?.[campaign.topic];

  for (const chatId of tgTargets) {
    const tgRes = await transport.sendTelegramBroadcast({
      campaignSlug: campaign.slug,
      chatId,
      threadId,
      locale: channelLocale,
      subject: interpolateBroadcastTemplate(localized.subject, vars, {
        escapeHtmlValues: true,
      }),
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
}

function buildEmailSendPayloadForRecipient(
  campaign: CampaignRecord,
  recipient: SubscriberRecipient & { email: string },
  settings: BroadcastSettings,
  secondaryDateLabel: string
): EmailSendPayload {
  const locale = recipient.locale || settings.defaultLocale || "es";
  const localized = resolveLocalizedCampaignCopy(campaign, locale, settings.defaultLocale);
  const baseSite = settings.siteBaseUrl.replace(/\/+$/, "");
  const unsubscribeUrl = recipient.unsubscribeToken
    ? `${baseSite}/api/inbox/public/unsubscribe?token=${encodeURIComponent(
        recipient.unsubscribeToken
      )}`
    : `${baseSite}/${locale}/unsubscribe`;
  const recipientName = recipient.fullName || recipient.email;
  const vars = {
    recipientName,
    organizationName: settings.organizationName,
    secondaryDate: secondaryDateLabel,
    siteBaseUrl: settings.siteBaseUrl,
    unsubscribeUrl,
  };

  return {
    campaignSlug: campaign.slug,
    recipientEmail: recipient.email,
    locale,
    subject: interpolateBroadcastTemplate(localized.subject, vars),
    text: interpolateBroadcastTemplate(localized.bodyText, vars),
    html: interpolateBroadcastTemplate(localized.bodyHtml || `<p>${localized.bodyText}</p>`, vars, {
      escapeHtmlValues: true,
    }),
    ctaLabel: localized.ctaLabel
      ? interpolateBroadcastTemplate(localized.ctaLabel, vars)
      : undefined,
    ctaUrl: localized.ctaUrl ? interpolateBroadcastTemplate(localized.ctaUrl, vars) : undefined,
    unsubscribeUrl,
    emailTemplateRef: campaign.emailTemplateRef,
    secondaryDateLabel,
    templateData: {
      recipientName,
      title: campaign.title,
      topic: campaign.topic,
    },
  };
}

async function dispatchEmailChannel(
  transport: TransportServiceContract,
  campaign: CampaignRecord,
  settings: BroadcastSettings,
  recipients: SubscriberRecipient[],
  secondaryDateLabel: string,
  stats: CampaignStats,
  results: ChannelDispatchResult[]
): Promise<void> {
  for (const recipient of recipients) {
    if (!recipient.email) continue;
    const payload = buildEmailSendPayloadForRecipient(
      campaign,
      recipient as SubscriberRecipient & { email: string },
      settings,
      secondaryDateLabel
    );
    const emailRes = await transport.sendEmailBroadcast(payload);
    results.push(emailRes);
    recordResultInStats(stats, emailRes);
  }
}

async function dispatchWhatsAppChannel(
  transport: TransportServiceContract,
  campaign: CampaignRecord,
  settings: BroadcastSettings,
  recipients: SubscriberRecipient[],
  isTestDispatch: boolean,
  secondaryDateLabel: string,
  stats: CampaignStats,
  results: ChannelDispatchResult[]
): Promise<void> {
  const waRecipients = resolveWhatsAppRecipients(campaign, settings, recipients, isTestDispatch);
  for (const recipient of waRecipients) {
    if (!recipient.phone) continue;
    const locale = recipient.locale || settings.defaultLocale || "es";
    const localized = resolveLocalizedCampaignCopy(campaign, locale, settings.defaultLocale);
    const vars = {
      recipientName: recipient.fullName || "Comunidad",
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

export async function dispatchAllActiveChannels(params: {
  transport: TransportServiceContract;
  campaign: CampaignRecord;
  settings: BroadcastSettings;
  recipients: SubscriberRecipient[];
  isTestDispatch: boolean;
  secondaryDateLabel: string;
  stats: CampaignStats;
}): Promise<ChannelDispatchResult[]> {
  const { transport, campaign, settings, recipients, isTestDispatch, secondaryDateLabel, stats } =
    params;
  const results: ChannelDispatchResult[] = [];
  const activeChannels = normalizeChannels(campaign.channels);

  if (activeChannels.includes("telegram") && settings.telegramEnabled) {
    await dispatchTelegramChannel(
      transport,
      campaign,
      settings,
      secondaryDateLabel,
      stats,
      results
    );
  }

  if (activeChannels.includes("email")) {
    await dispatchEmailChannel(
      transport,
      campaign,
      settings,
      recipients,
      secondaryDateLabel,
      stats,
      results
    );
  }

  if (activeChannels.includes("whatsapp") && settings.whatsappEnabled) {
    await dispatchWhatsAppChannel(
      transport,
      campaign,
      settings,
      recipients,
      isTestDispatch,
      secondaryDateLabel,
      stats,
      results
    );
  }

  return results;
}
