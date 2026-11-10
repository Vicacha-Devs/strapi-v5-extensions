import type { Core } from "@strapi/strapi";

import {
  DELIVERY_LOG_UID,
  SUPPORTED_CHANNELS,
  escapeHtml,
  interpolateBroadcastTemplate,
  isSafeHttpUrl,
  stripHeaderControlChars,
  type BroadcastChannel,
  type BroadcastSettings,
  type ChannelDispatchResult,
  type DeliveryLogRecord,
} from "../../../shared";
import { buildEmailTemplateVariables, clampLimit } from "./campaignHelpers";
import { trySendEmailViaDesigner5 } from "./emailDesignerBridge";
import { redactSecretsFromMessage } from "./idempotency";
import type { EmailSendPayload } from "./transportService";

export function buildSafeListUnsubscribeHeader(
  rawUnsubscribeUrl?: string
): Record<string, string> {
  if (!rawUnsubscribeUrl) return {};
  const cleaned = stripHeaderControlChars(rawUnsubscribeUrl);
  if (!cleaned || !isSafeHttpUrl(cleaned)) return {};
  return { "List-Unsubscribe": `<${cleaned}>` };
}

export async function hasAlreadyDeliveredInDb(
  strapi: Core.Strapi,
  idempotencyKey: string
): Promise<boolean> {
  const existing = await strapi.documents(DELIVERY_LOG_UID).findMany({
    filters: { idempotencyKey, status: { $in: ["sent", "simulated"] } },
    limit: 1,
  });
  return existing.length > 0;
}

export async function upsertDeliveryLogInDb(
  strapi: Core.Strapi,
  entry: Omit<DeliveryLogRecord, "documentId" | "sentAt">,
  secrets: Array<string | undefined> = []
): Promise<DeliveryLogRecord> {
  const sentAt = new Date().toISOString();
  const safeEntry: Omit<DeliveryLogRecord, "documentId" | "sentAt"> = {
    ...entry,
    errorMessage: entry.errorMessage
      ? redactSecretsFromMessage(entry.errorMessage, secrets)
      : undefined,
  };

  const existing = await strapi.documents(DELIVERY_LOG_UID).findMany({
    filters: { idempotencyKey: safeEntry.idempotencyKey },
    limit: 1,
  });

  const existingDocId =
    typeof existing[0]?.documentId === "string"
      ? existing[0].documentId
      : undefined;

  if (existingDocId) {
    const updated = await strapi.documents(DELIVERY_LOG_UID).update({
      documentId: existingDocId,
      data: { ...safeEntry, sentAt },
    });
    return (
      (updated as unknown as DeliveryLogRecord) ?? {
        ...safeEntry,
        documentId: existingDocId,
        sentAt,
      }
    );
  }

  const created = await strapi.documents(DELIVERY_LOG_UID).create({
    data: { ...safeEntry, sentAt },
  });
  return created as unknown as DeliveryLogRecord;
}

export async function listDeliveryLogsFromDb(
  strapi: Core.Strapi,
  params?: {
    campaignSlug?: string;
    channel?: BroadcastChannel;
    limit?: number;
  }
): Promise<DeliveryLogRecord[]> {
  const filters: Record<string, unknown> = {};
  if (typeof params?.campaignSlug === "string" && params.campaignSlug.trim()) {
    filters.campaignSlug = params.campaignSlug.trim();
  }
  if (
    typeof params?.channel === "string" &&
    (SUPPORTED_CHANNELS as readonly string[]).includes(params.channel)
  ) {
    filters.channel = params.channel;
  }
  const docs = await strapi.documents(DELIVERY_LOG_UID).findMany({
    filters,
    limit: clampLimit(params?.limit, 100),
  });
  return docs as unknown as DeliveryLogRecord[];
}

export function extractSecretList(
  settings?: BroadcastSettings
): Array<string | undefined> {
  if (!settings) return [];
  return [
    settings.telegramBotToken,
    settings.whatsappAccessToken,
    settings.whatsappGatewayApiKey,
  ];
}

export function sanitizeDispatchResult(
  result: ChannelDispatchResult,
  secrets: Array<string | undefined>
): ChannelDispatchResult {
  return {
    ...result,
    errorMessage: result.errorMessage
      ? redactSecretsFromMessage(result.errorMessage, secrets)
      : undefined,
  };
}

export async function sendLiveEmailViaProviders(
  strapi: Core.Strapi,
  payload: EmailSendPayload,
  settings: BroadcastSettings,
  effectiveTemplateRef: string
): Promise<{
  driver: string;
  status: "sent" | "simulated";
  externalMessageId: string;
}> {
  const headers = buildSafeListUnsubscribeHeader(payload.unsubscribeUrl);
  const safeSubject = stripHeaderControlChars(payload.subject);
  const safeFrom = stripHeaderControlChars(settings.emailFromAddress);
  const safeReplyTo = stripHeaderControlChars(settings.emailReplyToAddress);
  const safeRecipient = stripHeaderControlChars(payload.recipientEmail);
  const inlineHtml = payload.html || `<p>${escapeHtml(payload.text)}</p>`;
  const templateVars = buildEmailTemplateVariables(
    { ...payload, subject: safeSubject },
    settings,
    inlineHtml
  );

  if (effectiveTemplateRef) {
    const externalMessageId = await trySendEmailViaDesigner5({
      strapi,
      effectiveTemplateRef,
      locale: payload.locale,
      recipientEmail: safeRecipient,
      fromAddress: safeFrom,
      replyToAddress: safeReplyTo,
      subject: safeSubject,
      text: payload.text,
      headers,
      templateVars,
      interpolate: interpolateBroadcastTemplate,
    });
    if (externalMessageId) {
      return {
        driver: "email-designer-5",
        status: "sent",
        externalMessageId,
      };
    }
  }

  const emailService = strapi.plugin("email")?.service<{
    send?: (opts: Record<string, unknown>) => Promise<unknown>;
  }>("email");

  if (!emailService?.send) {
    return {
      driver: "strapi-email-fallback",
      status: "simulated",
      externalMessageId: `sim_fallback_${Date.now()}`,
    };
  }

  await emailService.send({
    to: safeRecipient,
    from: safeFrom,
    replyTo: safeReplyTo,
    subject: safeSubject,
    text: payload.text,
    html: inlineHtml,
    headers,
  });

  return {
    driver: "strapi-email",
    status: "sent",
    externalMessageId: `email_${Date.now()}`,
  };
}
