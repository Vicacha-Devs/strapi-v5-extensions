import {
  escapeHtml,
  interpolateBroadcastTemplate,
  isSafeHttpUrl,
  normalizeChannels,
  resolveLocalizedCampaignCopy,
  stripHeaderControlChars,
  type BroadcastChannel,
  type BroadcastSettings,
  type CampaignRecord,
  type CampaignStats,
  type ChannelDispatchResult,
  type SubscriberRecipient,
} from "../../../shared";
import {
  parseTargetList,
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
  sendTelegramBroadcast(
    payload: TelegramSendPayload
  ): Promise<ChannelDispatchResult>;
  sendWhatsAppBroadcast(
    payload: WhatsAppSendPayload
  ): Promise<ChannelDispatchResult>;
}

export function buildCampaignDocumentData(
  candidate: Partial<CampaignRecord>,
  channels: BroadcastChannel[],
  resolvedStatus: CampaignRecord["status"] = "draft"
): Record<string, unknown> {
  const safeBodyText = String(candidate.bodyText || "");
  return {
    title: candidate.title,
    slug: candidate.slug,
    topic: candidate.topic || "announcements",
    channels,
    priority: candidate.priority || "normal",
    status: resolvedStatus,
    scheduledAt: candidate.scheduledAt,
    subject: candidate.subject,
    bodyText: safeBodyText,
    bodyHtml: candidate.bodyHtml || `<p>${escapeHtml(safeBodyText)}</p>`,
    ctaLabel: candidate.ctaLabel,
    ctaUrl: candidate.ctaUrl,
    mediaUrl: candidate.mediaUrl,
    emailTemplateRef: candidate.emailTemplateRef,
    whatsappTemplateName: candidate.whatsappTemplateName,
    whatsappGroupIds: Array.isArray(candidate.whatsappGroupIds)
      ? candidate.whatsappGroupIds
      : [],
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
    locale:
      typeof sub.locale === "string" && sub.locale ? sub.locale : defaultLocale,
    topics: Array.isArray(sub.topics)
      ? sub.topics.map((t) => String(t))
      : ["announcements"],
    unsubscribeToken:
      typeof sub.unsubscribeToken === "string"
        ? sub.unsubscribeToken
        : undefined,
  };
}

async function dispatchTelegramChannel(
  transport: TransportServiceContract,
  campaign: CampaignRecord,
  settings: BroadcastSettings,
  secondaryDateLabel: string,
  isTestDispatch: boolean,
  testTelegramChatId: string | undefined,
  stats: CampaignStats,
  results: ChannelDispatchResult[]
): Promise<void> {
  if (isTestDispatch && !testTelegramChatId) {
    return;
  }
  const channelLocale = settings.defaultLocale || "es";
  const localized = resolveLocalizedCampaignCopy(
    campaign,
    channelLocale,
    settings.defaultLocale
  );
  const vars = {
    recipientName: "Comunidad",
    organizationName: settings.organizationName,
    secondaryDate: secondaryDateLabel,
    siteBaseUrl: settings.siteBaseUrl,
  };
  const tgTargets = isTestDispatch
    ? parseTargetList(testTelegramChatId)
    : resolveTelegramTargets(campaign, settings);
  const threadId =
    campaign.telegramThreadId ??
    settings.telegramTopicThreadMap?.[campaign.topic];

  const htmlBody = localized.bodyHtml
    ? interpolateBroadcastTemplate(localized.bodyHtml, vars, {
        escapeHtmlValues: true,
      })
    : escapeHtml(interpolateBroadcastTemplate(localized.bodyText, vars));

  const interpolatedCtaUrl = localized.ctaUrl
    ? interpolateBroadcastTemplate(localized.ctaUrl, vars)
    : undefined;

  for (const chatId of tgTargets) {
    const tgRes = await transport.sendTelegramBroadcast({
      campaignSlug: campaign.slug,
      chatId,
      threadId,
      locale: channelLocale,
      subject: interpolateBroadcastTemplate(localized.subject, vars),
      htmlBody,
      ctaLabel: localized.ctaLabel
        ? interpolateBroadcastTemplate(localized.ctaLabel, vars)
        : undefined,
      ctaUrl:
        interpolatedCtaUrl && isSafeHttpUrl(interpolatedCtaUrl)
          ? interpolatedCtaUrl
          : undefined,
      secondaryDateLabel,
      isTestDispatch,
    });
    results.push(tgRes);
    recordResultInStats(stats, tgRes);
  }
}

function buildEmailSendPayloadForRecipient(
  campaign: CampaignRecord,
  recipient: SubscriberRecipient & { email: string },
  settings: BroadcastSettings,
  secondaryDateLabel: string,
  isTestDispatch: boolean
): EmailSendPayload {
  const locale = recipient.locale || settings.defaultLocale || "es";
  const localized = resolveLocalizedCampaignCopy(
    campaign,
    locale,
    settings.defaultLocale
  );
  let baseSite = settings.siteBaseUrl;
  while (baseSite.endsWith("/")) {
    baseSite = baseSite.slice(0, -1);
  }
  const rawUnsubscribeUrl = recipient.unsubscribeToken
    ? `${baseSite}/api/inbox/public/unsubscribe?token=${encodeURIComponent(
        recipient.unsubscribeToken
      )}`
    : `${baseSite}/${encodeURIComponent(locale)}/unsubscribe`;
  const unsubscribeUrl = stripHeaderControlChars(rawUnsubscribeUrl);
  const recipientName = recipient.fullName || recipient.email;
  const vars = {
    recipientName,
    organizationName: settings.organizationName,
    secondaryDate: secondaryDateLabel,
    siteBaseUrl: settings.siteBaseUrl,
    unsubscribeUrl,
  };

  const html = localized.bodyHtml
    ? interpolateBroadcastTemplate(localized.bodyHtml, vars, {
        escapeHtmlValues: true,
      })
    : `<p>${escapeHtml(interpolateBroadcastTemplate(localized.bodyText, vars))}</p>`;

  const resolvedCtaUrl = localized.ctaUrl
    ? interpolateBroadcastTemplate(localized.ctaUrl, vars)
    : undefined;

  return {
    campaignSlug: campaign.slug,
    recipientEmail: recipient.email,
    locale,
    subject: stripHeaderControlChars(
      interpolateBroadcastTemplate(localized.subject, vars)
    ),
    text: interpolateBroadcastTemplate(localized.bodyText, vars),
    html,
    ctaLabel: localized.ctaLabel
      ? interpolateBroadcastTemplate(localized.ctaLabel, vars)
      : undefined,
    ctaUrl:
      resolvedCtaUrl && isSafeHttpUrl(resolvedCtaUrl)
        ? resolvedCtaUrl
        : undefined,
    unsubscribeUrl,
    emailTemplateRef: campaign.emailTemplateRef,
    secondaryDateLabel,
    templateData: {
      recipientName,
      title: campaign.title,
      topic: campaign.topic,
    },
    isTestDispatch,
  };
}

async function dispatchEmailChannel(
  transport: TransportServiceContract,
  campaign: CampaignRecord,
  settings: BroadcastSettings,
  recipients: SubscriberRecipient[],
  secondaryDateLabel: string,
  isTestDispatch: boolean,
  stats: CampaignStats,
  results: ChannelDispatchResult[]
): Promise<void> {
  for (const recipient of recipients) {
    if (!recipient.email) continue;
    const payload = buildEmailSendPayloadForRecipient(
      campaign,
      recipient as SubscriberRecipient & { email: string },
      settings,
      secondaryDateLabel,
      isTestDispatch
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
  const waRecipients = resolveWhatsAppRecipients(
    campaign,
    settings,
    recipients,
    isTestDispatch
  );
  for (const recipient of waRecipients) {
    if (!recipient.phone) continue;
    const locale = recipient.locale || settings.defaultLocale || "es";
    const localized = resolveLocalizedCampaignCopy(
      campaign,
      locale,
      settings.defaultLocale
    );
    const vars = {
      recipientName: recipient.fullName || "Comunidad",
      organizationName: settings.organizationName,
      secondaryDate: secondaryDateLabel,
      siteBaseUrl: settings.siteBaseUrl,
    };
    const resolvedCtaUrl = localized.ctaUrl
      ? interpolateBroadcastTemplate(localized.ctaUrl, vars)
      : undefined;
    const waRes = await transport.sendWhatsAppBroadcast({
      campaignSlug: campaign.slug,
      recipientPhone: recipient.phone,
      locale,
      textBody: interpolateBroadcastTemplate(localized.bodyText, vars),
      templateName: campaign.whatsappTemplateName,
      ctaUrl:
        resolvedCtaUrl && isSafeHttpUrl(resolvedCtaUrl)
          ? resolvedCtaUrl
          : undefined,
      secondaryDateLabel,
      isTestDispatch,
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
  testTelegramChatId?: string;
  secondaryDateLabel: string;
  stats: CampaignStats;
}): Promise<ChannelDispatchResult[]> {
  const {
    transport,
    campaign,
    settings,
    recipients,
    isTestDispatch,
    testTelegramChatId,
    secondaryDateLabel,
    stats,
  } = params;
  const results: ChannelDispatchResult[] = [];
  const activeChannels = normalizeChannels(campaign.channels);

  if (activeChannels.includes("telegram") && settings.telegramEnabled) {
    await dispatchTelegramChannel(
      transport,
      campaign,
      settings,
      secondaryDateLabel,
      isTestDispatch,
      testTelegramChatId,
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
      isTestDispatch,
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
