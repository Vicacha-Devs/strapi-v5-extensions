import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  maskRecipientIdentifier,
  normalizeWhatsAppTarget,
  type BroadcastChannel,
  type BroadcastSettings,
  type ChannelDispatchResult,
  type DeliveryLogRecord,
  type EmailDesignerTemplateSummary,
} from "../../../shared";
import {
  buildTelegramIdempotencyKey,
  executeTelegramHttpSend,
  executeWhatsAppHttpSend,
  hasWhatsAppCredentials,
  makeResult,
  resolveEffectiveEmailTemplateRef,
} from "./campaignHelpers";
import {
  extractSecretList,
  hasAlreadyDeliveredInDb,
  listDeliveryLogsFromDb,
  sanitizeDispatchResult,
  sendLiveEmailViaProviders,
  upsertDeliveryLogInDb,
} from "./deliveryLedger";
import {
  EMAIL_DESIGNER_TEMPLATE_UID,
  fetchRawEmailDesignerTemplates,
  listEmailDesignerTemplatesFromDb,
  resolveEmailDesignerTemplateFromDb,
  type EmailDesignerTemplateRow,
} from "./emailDesignerBridge";
import { computeIdempotencyKey, redactSecretsFromMessage } from "./idempotency";

export { EMAIL_DESIGNER_TEMPLATE_UID, type EmailDesignerTemplateRow };

export interface EmailSendPayload {
  campaignSlug: string;
  recipientEmail: string;
  locale: string;
  subject: string;
  text: string;
  html?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  unsubscribeUrl?: string;
  emailTemplateRef?: string;
  secondaryDateLabel?: string;
  templateData?: Record<string, string | number | undefined>;
  isTestDispatch?: boolean;
}

export interface TelegramSendPayload {
  campaignSlug: string;
  chatId: string;
  threadId?: number;
  locale: string;
  subject: string;
  htmlBody: string;
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryDateLabel?: string;
  isTestDispatch?: boolean;
}

export interface WhatsAppSendPayload {
  campaignSlug: string;
  recipientPhone: string;
  locale: string;
  textBody: string;
  templateName?: string;
  ctaUrl?: string;
  secondaryDateLabel?: string;
  isTestDispatch?: boolean;
}

const createTransportService = ({ strapi }: { strapi: Core.Strapi }) => ({
  getSettingsService() {
    return strapi.plugin(PLUGIN_ID).service("settings") as {
      getSettings(): Promise<BroadcastSettings>;
    };
  },

  async fetchRawEmailDesignerTemplates(): Promise<EmailDesignerTemplateRow[]> {
    return fetchRawEmailDesignerTemplates(strapi);
  },

  async listEmailDesignerTemplates(): Promise<EmailDesignerTemplateSummary[]> {
    return listEmailDesignerTemplatesFromDb(strapi);
  },

  async resolveEmailDesignerTemplate(
    templateRef: string,
    locale?: string
  ): Promise<EmailDesignerTemplateRow | null> {
    return resolveEmailDesignerTemplateFromDb(strapi, templateRef, locale);
  },

  async hasAlreadyDelivered(idempotencyKey: string): Promise<boolean> {
    return hasAlreadyDeliveredInDb(strapi, idempotencyKey);
  },

  async recordDeliveryLog(
    entry: Omit<DeliveryLogRecord, "documentId" | "sentAt">,
    secrets: Array<string | undefined> = []
  ): Promise<DeliveryLogRecord> {
    return upsertDeliveryLogInDb(strapi, entry, secrets);
  },

  async listDeliveryLogs(params?: {
    campaignSlug?: string;
    channel?: BroadcastChannel;
    limit?: number;
  }): Promise<DeliveryLogRecord[]> {
    return listDeliveryLogsFromDb(strapi, params);
  },

  async persistResult(
    campaignSlug: string,
    secondaryDateLabel: string | undefined,
    result: ChannelDispatchResult,
    settings?: BroadcastSettings
  ): Promise<ChannelDispatchResult> {
    const secrets = extractSecretList(settings);
    const safeResult = sanitizeDispatchResult(result, secrets);

    try {
      await this.recordDeliveryLog(
        {
          ...safeResult,
          campaignSlug,
          secondaryDateLabel,
        },
        secrets
      );
    } catch (logErr) {
      const safeErr = redactSecretsFromMessage(
        (logErr as Error)?.message || "log write error",
        secrets
      );
      strapi.log?.warn?.(
        `[@vicacha-devs/strapi-plugin-broadcasts] Delivery log fallback for ${safeResult.idempotencyKey}: ${safeErr}`
      );
    }

    return safeResult;
  },

  async logOutcome(
    p: { campaignSlug: string; locale: string; secondaryDateLabel?: string },
    channel: BroadcastChannel,
    driver: string,
    recipientMasked: string,
    status: ChannelDispatchResult["status"],
    idempotencyKey: string,
    extra?: Partial<ChannelDispatchResult>,
    settings?: BroadcastSettings
  ): Promise<ChannelDispatchResult> {
    return this.persistResult(
      p.campaignSlug,
      p.secondaryDateLabel,
      makeResult(
        channel,
        driver,
        recipientMasked,
        p.locale,
        status,
        idempotencyKey,
        extra
      ),
      settings
    );
  },

  async simulateDryRunEmail(
    payload: EmailSendPayload,
    effectiveTemplateRef: string,
    recipientMasked: string,
    idempotencyKey: string,
    settings: BroadcastSettings
  ): Promise<ChannelDispatchResult> {
    const resolvedDryRunTpl = effectiveTemplateRef
      ? await this.resolveEmailDesignerTemplate(
          effectiveTemplateRef,
          payload.locale
        )
      : null;
    const useDesigner = Boolean(effectiveTemplateRef);
    const refSuffix =
      resolvedDryRunTpl?.templateReferenceId || effectiveTemplateRef;

    return this.logOutcome(
      payload,
      "email",
      useDesigner ? "email-designer-5-dryrun" : "strapi-email-dryrun",
      recipientMasked,
      "simulated",
      idempotencyKey,
      {
        externalMessageId: useDesigner
          ? `sim_ed5_${refSuffix}_${Date.now()}`
          : `sim_email_${Date.now()}`,
      },
      settings
    );
  },

  async executeLiveEmailSend(
    payload: EmailSendPayload,
    settings: BroadcastSettings,
    effectiveTemplateRef: string,
    recipientMasked: string,
    idempotencyKey: string
  ): Promise<ChannelDispatchResult> {
    const sent = await sendLiveEmailViaProviders(
      strapi,
      payload,
      settings,
      effectiveTemplateRef
    );
    return this.logOutcome(
      payload,
      "email",
      sent.driver,
      recipientMasked,
      sent.status,
      idempotencyKey,
      { externalMessageId: sent.externalMessageId },
      settings
    );
  },

  async sendEmailBroadcast(
    payload: EmailSendPayload
  ): Promise<ChannelDispatchResult> {
    const settings = await this.getSettingsService().getSettings();
    const idempotencyKey = computeIdempotencyKey(
      payload.campaignSlug,
      "email",
      payload.recipientEmail,
      { isTest: payload.isTestDispatch }
    );
    const recipientMasked = maskRecipientIdentifier(payload.recipientEmail);
    const effectiveTemplateRef = resolveEffectiveEmailTemplateRef(
      payload,
      settings
    );
    const defaultDriver = effectiveTemplateRef
      ? "email-designer-5"
      : "strapi-email";

    if (
      !payload.isTestDispatch &&
      (await this.hasAlreadyDelivered(idempotencyKey))
    ) {
      return makeResult(
        "email",
        defaultDriver,
        recipientMasked,
        payload.locale,
        "skipped_duplicate",
        idempotencyKey
      );
    }

    if (settings.dryRun) {
      return this.simulateDryRunEmail(
        payload,
        effectiveTemplateRef,
        recipientMasked,
        idempotencyKey,
        settings
      );
    }

    try {
      return await this.executeLiveEmailSend(
        payload,
        settings,
        effectiveTemplateRef,
        recipientMasked,
        idempotencyKey
      );
    } catch (err) {
      return this.logOutcome(
        payload,
        "email",
        defaultDriver,
        recipientMasked,
        "failed",
        idempotencyKey,
        { errorMessage: (err as Error)?.message || "Email delivery failed" },
        settings
      );
    }
  },

  async sendTelegramBroadcast(
    payload: TelegramSendPayload
  ): Promise<ChannelDispatchResult> {
    const settings = await this.getSettingsService().getSettings();
    const targetChatId = payload.chatId || settings.telegramDefaultChatId;
    const idempotencyKey = buildTelegramIdempotencyKey(payload, targetChatId);
    const recipientMasked = maskRecipientIdentifier(targetChatId);

    if (
      !payload.isTestDispatch &&
      (await this.hasAlreadyDelivered(idempotencyKey))
    ) {
      return makeResult(
        "telegram",
        "telegram-bot-api",
        recipientMasked,
        payload.locale,
        "skipped_duplicate",
        idempotencyKey
      );
    }

    if (settings.dryRun || !settings.telegramBotToken) {
      return this.logOutcome(
        payload,
        "telegram",
        "telegram-bot-dryrun",
        recipientMasked,
        "simulated",
        idempotencyKey,
        { externalMessageId: `sim_tg_${Date.now()}` },
        settings
      );
    }

    try {
      const externalMessageId = await executeTelegramHttpSend(
        payload,
        targetChatId,
        settings.telegramBotToken
      );
      return this.logOutcome(
        payload,
        "telegram",
        "telegram-bot-api",
        recipientMasked,
        "sent",
        idempotencyKey,
        { externalMessageId },
        settings
      );
    } catch (err) {
      return this.logOutcome(
        payload,
        "telegram",
        "telegram-bot-api",
        recipientMasked,
        "failed",
        idempotencyKey,
        {
          errorMessage: (err as Error)?.message || "Telegram delivery failed",
        },
        settings
      );
    }
  },

  async sendWhatsAppBroadcast(
    payload: WhatsAppSendPayload
  ): Promise<ChannelDispatchResult> {
    const settings = await this.getSettingsService().getSettings();
    const target = normalizeWhatsAppTarget(payload.recipientPhone);
    const driver = settings.whatsappDriver || "meta-cloud";
    const idempotencyKey = computeIdempotencyKey(
      payload.campaignSlug,
      "whatsapp",
      target.normalized,
      { isTest: payload.isTestDispatch }
    );
    const recipientMasked = maskRecipientIdentifier(target.normalized);

    if (
      !payload.isTestDispatch &&
      (await this.hasAlreadyDelivered(idempotencyKey))
    ) {
      return makeResult(
        "whatsapp",
        driver,
        recipientMasked,
        payload.locale,
        "skipped_duplicate",
        idempotencyKey
      );
    }

    if (settings.dryRun || !hasWhatsAppCredentials(driver, settings)) {
      return this.logOutcome(
        payload,
        "whatsapp",
        `${driver}-dryrun`,
        recipientMasked,
        "simulated",
        idempotencyKey,
        { externalMessageId: `sim_wa_${Date.now()}` },
        settings
      );
    }

    if (driver === "meta-cloud" && target.isGroupOrChannel) {
      return this.logOutcome(
        payload,
        "whatsapp",
        "meta-cloud",
        recipientMasked,
        "failed",
        idempotencyKey,
        {
          errorMessage:
            "Meta WhatsApp Cloud API does not support @g.us group or @newsletter channel JIDs; use evolution or openwa gateway driver",
        },
        settings
      );
    }

    try {
      const externalMessageId = await executeWhatsAppHttpSend(
        driver,
        payload,
        settings,
        target
      );
      return this.logOutcome(
        payload,
        "whatsapp",
        driver,
        recipientMasked,
        "sent",
        idempotencyKey,
        { externalMessageId },
        settings
      );
    } catch (err) {
      return this.logOutcome(
        payload,
        "whatsapp",
        driver,
        recipientMasked,
        "failed",
        idempotencyKey,
        {
          errorMessage: (err as Error)?.message || "WhatsApp delivery failed",
        },
        settings
      );
    }
  },
});

export default createTransportService;
