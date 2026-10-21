import type { Core } from '@strapi/strapi';
import {
  DELIVERY_LOG_UID,
  PLUGIN_ID,
  computeIdempotencyKey,
  maskRecipientIdentifier,
  normalizeE164Phone,
  validateGatewayUrl,
  type BroadcastChannel,
  type BroadcastSettings,
  type ChannelDispatchResult,
  type DeliveryLogRecord,
} from '../../../shared';

export interface EmailSendPayload {
  campaignSlug: string;
  recipientEmail: string;
  locale: string;
  subject: string;
  text: string;
  html?: string;
  unsubscribeUrl?: string;
  emailTemplateRef?: string;
  secondaryDateLabel?: string;
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
    return strapi.plugin(PLUGIN_ID).service('settings') as {
      getSettings(): Promise<BroadcastSettings>;
    };
  },

  async hasAlreadyDelivered(idempotencyKey: string): Promise<boolean> {
    const existing = await strapi.documents(DELIVERY_LOG_UID).findMany({
      filters: {
        idempotencyKey,
        status: { $in: ['sent', 'simulated'] },
      },
      limit: 1,
    });
    return existing.length > 0;
  },

  async recordDeliveryLog(
    entry: Omit<DeliveryLogRecord, 'documentId' | 'sentAt'>
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

  async sendEmailBroadcast(payload: EmailSendPayload): Promise<ChannelDispatchResult> {
    const settings = await this.getSettingsService().getSettings();
    const idempotencyKey = computeIdempotencyKey(
      payload.campaignSlug,
      'email',
      payload.recipientEmail
    );
    const recipientMasked = maskRecipientIdentifier(payload.recipientEmail);

    if (await this.hasAlreadyDelivered(idempotencyKey)) {
      return {
        channel: 'email',
        driver: 'strapi-email',
        recipientMasked,
        locale: payload.locale,
        status: 'skipped_duplicate',
        idempotencyKey,
      };
    }

    if (settings.dryRun) {
      return this.persistResult(payload.campaignSlug, payload.secondaryDateLabel, {
        channel: 'email',
        driver: 'strapi-email-dryrun',
        recipientMasked,
        locale: payload.locale,
        status: 'simulated',
        idempotencyKey,
        externalMessageId: `sim_email_${Date.now()}`,
      });
    }

    try {
      const emailPlugin = strapi.plugin('email');
      const emailService = emailPlugin?.service<{
        send?: (opts: Record<string, unknown>) => Promise<unknown>;
      }>('email');

      if (!emailService?.send) {
        return this.persistResult(payload.campaignSlug, payload.secondaryDateLabel, {
          channel: 'email',
          driver: 'strapi-email-fallback',
          recipientMasked,
          locale: payload.locale,
          status: 'simulated',
          idempotencyKey,
          externalMessageId: `sim_fallback_${Date.now()}`,
        });
      }

      const headers: Record<string, string> = {};
      if (payload.unsubscribeUrl) {
        headers['List-Unsubscribe'] = `<${payload.unsubscribeUrl}>`;
      }

      await emailService.send({
        to: payload.recipientEmail,
        from: settings.emailFromAddress,
        replyTo: settings.emailReplyToAddress,
        subject: payload.subject,
        text: payload.text,
        html: payload.html || `<p>${payload.text}</p>`,
        headers,
      });

      return this.persistResult(payload.campaignSlug, payload.secondaryDateLabel, {
        channel: 'email',
        driver: 'strapi-email',
        recipientMasked,
        locale: payload.locale,
        status: 'sent',
        idempotencyKey,
        externalMessageId: `email_${Date.now()}`,
      });
    } catch (err) {
      return this.persistResult(payload.campaignSlug, payload.secondaryDateLabel, {
        channel: 'email',
        driver: 'strapi-email',
        recipientMasked,
        locale: payload.locale,
        status: 'failed',
        idempotencyKey,
        errorMessage: (err as Error)?.message || 'Email delivery failed',
      });
    }
  },

  async sendTelegramBroadcast(payload: TelegramSendPayload): Promise<ChannelDispatchResult> {
    const settings = await this.getSettingsService().getSettings();
    const targetChatId = payload.chatId || settings.telegramDefaultChatId;
    const idempotencyKey = computeIdempotencyKey(
      payload.campaignSlug,
      'telegram',
      `${targetChatId}:${payload.locale}`
    );
    const recipientMasked = maskRecipientIdentifier(targetChatId);

    if (await this.hasAlreadyDelivered(idempotencyKey)) {
      return {
        channel: 'telegram',
        driver: 'telegram-bot-api',
        recipientMasked,
        locale: payload.locale,
        status: 'skipped_duplicate',
        idempotencyKey,
      };
    }

    if (settings.dryRun || !settings.telegramBotToken) {
      return this.persistResult(payload.campaignSlug, payload.secondaryDateLabel, {
        channel: 'telegram',
        driver: 'telegram-bot-dryrun',
        recipientMasked,
        locale: payload.locale,
        status: 'simulated',
        idempotencyKey,
        externalMessageId: `sim_tg_${Date.now()}`,
      });
    }

    try {
      const endpoint = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
      const bodyPayload: Record<string, unknown> = {
        chat_id: targetChatId,
        text: `<b>${payload.subject}</b>\n\n${payload.htmlBody}`,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      };
      if (typeof payload.threadId === 'number' && payload.threadId > 0) {
        bodyPayload.message_thread_id = payload.threadId;
      }
      if (payload.ctaLabel && payload.ctaUrl) {
        bodyPayload.reply_markup = {
          inline_keyboard: [[{ text: payload.ctaLabel, url: payload.ctaUrl }]],
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        result?: { message_id?: number };
        description?: string;
      };
      if (!response.ok || !json.ok) {
        throw new Error(json.description || `Telegram HTTP ${response.status}`);
      }

      return this.persistResult(payload.campaignSlug, payload.secondaryDateLabel, {
        channel: 'telegram',
        driver: 'telegram-bot-api',
        recipientMasked,
        locale: payload.locale,
        status: 'sent',
        idempotencyKey,
        externalMessageId: String(json.result?.message_id || Date.now()),
      });
    } catch (err) {
      return this.persistResult(payload.campaignSlug, payload.secondaryDateLabel, {
        channel: 'telegram',
        driver: 'telegram-bot-api',
        recipientMasked,
        locale: payload.locale,
        status: 'failed',
        idempotencyKey,
        errorMessage: (err as Error)?.message || 'Telegram delivery failed',
      });
    }
  },

  async sendWhatsAppBroadcast(payload: WhatsAppSendPayload): Promise<ChannelDispatchResult> {
    const settings = await this.getSettingsService().getSettings();
    const normalizedPhone = normalizeE164Phone(payload.recipientPhone);
    const driver = settings.whatsappDriver || 'meta-cloud';
    const idempotencyKey = computeIdempotencyKey(payload.campaignSlug, 'whatsapp', normalizedPhone);
    const recipientMasked = maskRecipientIdentifier(normalizedPhone);

    if (await this.hasAlreadyDelivered(idempotencyKey)) {
      return {
        channel: 'whatsapp',
        driver,
        recipientMasked,
        locale: payload.locale,
        status: 'skipped_duplicate',
        idempotencyKey,
      };
    }

    const hasCredentials =
      driver === 'meta-cloud'
        ? Boolean(settings.whatsappPhoneNumberId && settings.whatsappAccessToken)
        : Boolean(settings.whatsappGatewayUrl);

    if (settings.dryRun || !hasCredentials) {
      return this.persistResult(payload.campaignSlug, payload.secondaryDateLabel, {
        channel: 'whatsapp',
        driver: `${driver}-dryrun`,
        recipientMasked,
        locale: payload.locale,
        status: 'simulated',
        idempotencyKey,
        externalMessageId: `sim_wa_${Date.now()}`,
      });
    }

    try {
      const fullText = payload.ctaUrl
        ? `${payload.textBody}\n\n🔗 ${payload.ctaUrl}`
        : payload.textBody;

      if (driver === 'meta-cloud') {
        const endpoint = `https://graph.facebook.com/v20.0/${encodeURIComponent(
          settings.whatsappPhoneNumberId || ''
        )}/messages`;
        const reqBody = payload.templateName
          ? {
              messaging_product: 'whatsapp',
              to: normalizedPhone.replace(/^\+/, ''),
              type: 'template',
              template: { name: payload.templateName, language: { code: payload.locale } },
            }
          : {
              messaging_product: 'whatsapp',
              to: normalizedPhone.replace(/^\+/, ''),
              type: 'text',
              text: { preview_url: true, body: fullText },
            };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.whatsappAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reqBody),
        });
        const json = (await res.json()) as {
          messages?: Array<{ id?: string }>;
          error?: { message?: string };
        };
        if (!res.ok) throw new Error(json.error?.message || `Meta Cloud HTTP ${res.status}`);

        return this.persistResult(payload.campaignSlug, payload.secondaryDateLabel, {
          channel: 'whatsapp',
          driver: 'meta-cloud',
          recipientMasked,
          locale: payload.locale,
          status: 'sent',
          idempotencyKey,
          externalMessageId: json.messages?.[0]?.id || `waba_${Date.now()}`,
        });
      }

      const gatewayCheck = validateGatewayUrl(settings.whatsappGatewayUrl || '', {
        allowLocalhost: Boolean(settings.allowLocalhostGateways),
      });
      if (!gatewayCheck.valid) throw new Error(gatewayCheck.errors.join('; '));

      const baseUrl = (settings.whatsappGatewayUrl || '').replace(/\/+$/, '');
      const session = encodeURIComponent(settings.whatsappGatewaySession || 'default');
      const endpoint =
        driver === 'evolution'
          ? `${baseUrl}/message/sendText/${session}`
          : `${baseUrl}/api/sendText`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (settings.whatsappGatewayApiKey) {
        headers.apikey = settings.whatsappGatewayApiKey;
        headers['X-Api-Key'] = settings.whatsappGatewayApiKey;
      }

      const body =
        driver === 'evolution'
          ? { number: normalizedPhone.replace(/^\+/, ''), text: fullText }
          : {
              session: settings.whatsappGatewaySession || 'default',
              chatId: `${normalizedPhone.replace(/^\+/, '')}@c.us`,
              text: fullText,
            };

      const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`${driver} gateway HTTP ${res.status}`);

      return this.persistResult(payload.campaignSlug, payload.secondaryDateLabel, {
        channel: 'whatsapp',
        driver,
        recipientMasked,
        locale: payload.locale,
        status: 'sent',
        idempotencyKey,
        externalMessageId: `${driver}_${Date.now()}`,
      });
    } catch (err) {
      return this.persistResult(payload.campaignSlug, payload.secondaryDateLabel, {
        channel: 'whatsapp',
        driver,
        recipientMasked,
        locale: payload.locale,
        status: 'failed',
        idempotencyKey,
        errorMessage: (err as Error)?.message || 'WhatsApp delivery failed',
      });
    }
  },
});

export default createTransportService;
