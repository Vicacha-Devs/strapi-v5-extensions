import type { CalendarSystemId, SecondaryDateDisplay } from "./calendarSystems";

export type BroadcastChannel = "email" | "telegram" | "whatsapp";

export type WhatsAppDriver = "meta-cloud" | "openwa" | "evolution";

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed" | "cancelled";

export type DeliveryStatus = "sent" | "simulated" | "skipped_duplicate" | "failed";

export type BroadcastPriority = "low" | "normal" | "high" | "urgent";

export interface CampaignTranslation {
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface ChannelDispatchCount {
  sent: number;
  simulated: number;
  skipped: number;
  failed: number;
}

export interface CampaignStats {
  totalRecipients: number;
  sentCount: number;
  simulatedCount: number;
  skippedCount: number;
  failedCount: number;
  byChannel: Partial<Record<BroadcastChannel, ChannelDispatchCount>>;
}

export interface CampaignRecord {
  documentId?: string;
  slug: string;
  title: string;
  topic: string;
  channels: BroadcastChannel[];
  priority: BroadcastPriority;
  status: CampaignStatus;
  scheduledAt?: string;
  sentAt?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  mediaUrl?: string;
  emailTemplateRef?: string;
  whatsappTemplateName?: string;
  whatsappGroupIds?: string[];
  telegramChatId?: string;
  telegramThreadId?: number;
  translations?: Record<string, CampaignTranslation>;
  secondaryDate?: SecondaryDateDisplay;
  secondaryDateLabel?: string;
  stats?: CampaignStats;
  metadata?: Record<string, unknown>;
}

export interface AutomationRuleRecord {
  documentId?: string;
  slug: string;
  name: string;
  eventName: string;
  targetContentType?: string;
  topic: string;
  channels: BroadcastChannel[];
  active: boolean;
  priority: BroadcastPriority;
  subjectTemplate: string;
  bodyTextTemplate: string;
  bodyHtmlTemplate?: string;
  ctaLabelTemplate?: string;
  ctaUrlTemplate?: string;
  translations?: Record<
    string,
    {
      subjectTemplate: string;
      bodyTextTemplate: string;
      bodyHtmlTemplate?: string;
      ctaLabelTemplate?: string;
    }
  >;
  lastTriggeredAt?: string;
  triggerCount?: number;
}

export interface DeliveryLogRecord {
  documentId?: string;
  idempotencyKey: string;
  campaignSlug: string;
  channel: BroadcastChannel;
  driver: string;
  recipientMasked: string;
  locale: string;
  status: DeliveryStatus;
  externalMessageId?: string;
  errorMessage?: string;
  sentAt: string;
  secondaryDateLabel?: string;
}

export interface SubscriberRecipient {
  email?: string;
  phone?: string;
  telegramChatId?: string;
  fullName?: string;
  locale: string;
  topics: string[];
  unsubscribeToken?: string;
}

export interface PublicChannelLink {
  id: string;
  channel: BroadcastChannel;
  label: string;
  handle: string;
  inviteUrl: string;
  locale?: string;
  topic?: string;
  localizedLabels?: Record<string, string>;
  localizedDescriptions?: Record<string, string>;
}

export interface BroadcastSettings {
  primaryCalendar: CalendarSystemId;
  secondaryCalendars: CalendarSystemId[];
  defaultLocale: string;
  supportedLocales: string[];
  availableTopics: string[];
  dryRun: boolean;
  enableInboxSubscriberBridge: boolean;
  enableEventHubAutomations: boolean;
  enableEmailDesignerBridge?: boolean;
  defaultEmailTemplateRef?: string;
  siteBaseUrl: string;
  organizationName: string;
  emailFromAddress: string;
  emailReplyToAddress: string;
  telegramEnabled: boolean;
  telegramBotToken?: string;
  telegramDefaultChatId: string;
  telegramTopicChatMap?: Record<string, string | string[]>;
  telegramTopicThreadMap?: Record<string, number>;
  whatsappEnabled: boolean;
  whatsappDriver: WhatsAppDriver;
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  whatsappGatewayUrl?: string;
  whatsappGatewaySession?: string;
  whatsappGatewayApiKey?: string;
  whatsappDefaultRecipients?: string[];
  whatsappTopicGroupMap?: Record<string, string | string[]>;
  allowLocalhostGateways?: boolean;
  publicChannelLinks: PublicChannelLink[];
  presetCampaigns?: Array<Partial<CampaignRecord> & { slug: string; title: string }>;
  presetAutomationRules?: Array<
    Partial<AutomationRuleRecord> & { slug: string; name: string; eventName: string }
  >;
}

export interface EmailDesignerTemplateSummary {
  templateReferenceId: number;
  name: string;
  subject?: string;
  tags?: string[];
  updatedAt?: string;
}

export interface ChannelDispatchResult {
  channel: BroadcastChannel;
  driver: string;
  recipientMasked: string;
  locale: string;
  status: DeliveryStatus;
  idempotencyKey: string;
  externalMessageId?: string;
  errorMessage?: string;
}

export interface StarterCampaignTemplate {
  id: string;
  slug: string;
  title: string;
  topic: string;
  channels: BroadcastChannel[];
  priority: BroadcastPriority;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  emailTemplateRef?: string;
  translations: Record<string, CampaignTranslation>;
}
