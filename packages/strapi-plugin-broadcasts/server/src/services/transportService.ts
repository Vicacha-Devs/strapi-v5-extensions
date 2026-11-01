import type { Core } from "@strapi/strapi";

import {
  DELIVERY_LOG_UID,
  PLUGIN_ID,
  computeIdempotencyKey,
  escapeHtml,
  interpolateBroadcastTemplate,
  maskRecipientIdentifier,
  normalizeWhatsAppTarget,
  type BroadcastChannel,
  type BroadcastSettings,
  type ChannelDispatchResult,
  type DeliveryLogRecord,
  type EmailDesignerTemplateSummary,
} from "../../../shared";
import {
  buildEmailTemplateVariables,
  buildTelegramIdempotencyKey,
  executeTelegramHttpSend,
  executeWhatsAppHttpSend,
  hasWhatsAppCredentials,
  makeResult,
  resolveEffectiveEmailTemplateRef,
} from "./campaignHelpers";
import {
  EMAIL_DESIGNER_TEMPLATE_UID,
  fetchRawEmailDesignerTemplates,
  listEmailDesignerTemplatesFromDb,
  resolveEmailDesignerTemplateFromDb,
  trySendEmailViaDesigner5,
  type EmailDesignerTemplateRow,
} from "./emailDesignerBridge";

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
}

export interface WhatsAppSendPayload {
  campaignSlug: string;
  recipientPhone: string;
  locale: string;
  textBody: string;
  templateName?: string;
  ctaUrl?: string;
  secondaryDateLabel?: string;
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
    const existing = await strapi.documents(DELIVERY_LOG_UID).findMany({
      filters: { idempotencyKey, status: { $in: ["sent", "simulated"] } },
      limit: 1,
    });
    return existing.length > 0;
  },

  async recordDeliveryLog(
    entry: Omit<DeliveryLogRecord, "documentId" | "sentAt">
  ): Promise<DeliveryLogRecord> {
    const created = await strapi.documents(DELIVERY_LOG_UID).create({
      data: { ...entry, sentAt: new Date().toISOString() },
    });
    return created as unknown as DeliveryLogRecord;
  },

  async listDeliveryLogs(params?: {
    campaignSlug?: string;
    channel?: BroadcastChannel;
    limit?: number;
  }): Promise<DeliveryLogRecord[]> {
    const filters: Record<string, unknown> = {};
    if (params?.campaignSlug) filters.campaignSlug = params.campaignSlug;
    if (params?.channel) filters.channel = params.channel;
    const docs = await strapi.documents(DELIVERY_LOG_UID).findMany({
      filters,
      limit: params?.limit || 100,
    });
    return docs as unknown as DeliveryLogRecord[];
  },

  async persistResult(
    campaignSlug: string,
    secondaryDateLabel: string | undefined,
    result: ChannelDispatchResult
  ): Promise<ChannelDispatchResult> {
    await this.recordDeliveryLog({
      ...result,
      campaignSlug,
      secondaryDateLabel,
    });
    return result;
  },

  async logOutcome(
    p: { campaignSlug: string; locale: string; secondaryDateLabel?: string },
    channel: BroadcastChannel,
    driver: string,
    recipientMasked: string,
    status: ChannelDispatchResult["status"],
    idempotencyKey: string,
    extra?: Partial<ChannelDispatchResult>
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
      )
    );
  },

  async simulateDryRunEmail(
    payload: EmailSendPayload,
    effectiveTemplateRef: string,
    recipientMasked: string,
    idempotencyKey: string
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
      }
    );
  },

  async executeLiveEmailSend(
    payload: EmailSendPayload,
    settings: BroadcastSettings,
    effectiveTemplateRef: string,
    recipientMasked: string,
    idempotencyKey: string
  ): Promise<ChannelDispatchResult> {
    const headers: Record<string, string> = payload.unsubscribeUrl
      ? { "List-Unsubscribe": `<${payload.unsubscribeUrl}>` }
      : {};
    const inlineHtml = payload.html || `<p>${escapeHtml(payload.text)}</p>`;
    const templateVars = buildEmailTemplateVariables(
      payload,
      settings,
      inlineHtml
    );

    if (effectiveTemplateRef) {
      const externalMessageId = await trySendEmailViaDesigner5({
        strapi,
        effectiveTemplateRef,
        locale: payload.locale,
        recipientEmail: payload.recipientEmail,
        fromAddress: settings.emailFromAddress,
        replyToAddress: settings.emailReplyToAddress,
        subject: payload.subject,
        text: payload.text,
        headers,
        templateVars,
        interpolate: interpolateBroadcastTemplate,
      });
      if (externalMessageId) {
        return this.logOutcome(
          payload,
          "email",
          "email-designer-5",
          recipientMasked,
          "sent",
          idempotencyKey,
          { externalMessageId }
        );
      }
    }

    const emailService = strapi.plugin("email")?.service<{
      send?: (opts: Record<string, unknown>) => Promise<unknown>;
    }>("email");

    if (!emailService?.send) {
      return this.logOutcome(
        payload,
        "email",
        "strapi-email-fallback",
        recipientMasked,
        "simulated",
        idempotencyKey,
        { externalMessageId: `sim_fallback_${Date.now()}` }
      );
    }

    await emailService.send({
      to: payload.recipientEmail,
      from: settings.emailFromAddress,
      replyTo: settings.emailReplyToAddress,
      subject: payload.subject,
      text: payload.text,
      html: inlineHtml,
      headers,
    });

    return this.logOutcome(
      payload,
      "email",
      "strapi-email",
      recipientMasked,
      "sent",
      idempotencyKey,
      { externalMessageId: `email_${Date.now()}` }
    );
  },

  async sendEmailBroadcast(
    payload: EmailSendPayload
  ): Promise<ChannelDispatchResult> {
    const settings = await this.getSettingsService().getSettings();
    const idempotencyKey = computeIdempotencyKey(
      payload.campaignSlug,
      "email",
      payload.recipientEmail
    );
    const recipientMasked = maskRecipientIdentifier(payload.recipientEmail);
    const effectiveTemplateRef = resolveEffectiveEmailTemplateRef(
      payload,
      settings
    );
    const defaultDriver = effectiveTemplateRef
      ? "email-designer-5"
      : "strapi-email";

    if (await this.hasAlreadyDelivered(idempotencyKey)) {
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
        idempotencyKey
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
        { errorMessage: (err as Error)?.message || "Email delivery failed" }
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

    if (await this.hasAlreadyDelivered(idempotencyKey)) {
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
        { externalMessageId: `sim_tg_${Date.now()}` }
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
        { externalMessageId }
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
        }
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
      target.normalized
    );
    const recipientMasked = maskRecipientIdentifier(target.normalized);

    if (await this.hasAlreadyDelivered(idempotencyKey)) {
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
        { externalMessageId: `sim_wa_${Date.now()}` }
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
        }
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
        { externalMessageId }
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
        }
      );
    }
  },
});

export default createTransportService;
