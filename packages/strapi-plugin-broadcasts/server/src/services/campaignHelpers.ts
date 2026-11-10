import {
  escapeHtml,
  isSafeHttpUrl,
  isValidGatewaySession,
  normalizeWhatsAppTarget,
  sanitizeTelegramHtml,
  validateGatewayUrl,
  type BroadcastChannel,
  type BroadcastSettings,
  type CampaignRecord,
  type CampaignStats,
  type ChannelDispatchCount,
  type ChannelDispatchResult,
  type SubscriberRecipient,
} from "../../../shared";
import { computeIdempotencyKey } from "./idempotency";
import type {
  EmailSendPayload,
  TelegramSendPayload,
  WhatsAppSendPayload,
} from "./transportService";

export { computeIdempotencyKey };

const TELEGRAM_BOT_TOKEN_RE = /^\d+:[A-Za-z0-9_-]+$/;
const FETCH_TIMEOUT_MS = 15_000;

export function clampLimit(val: unknown, defaultLimit: number): number {
  if (val === undefined || val === null || val === "") return defaultLimit;
  const parsed =
    typeof val === "number"
      ? val
      : typeof val === "string"
        ? Number(val)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return defaultLimit;
  return Math.min(100, Math.max(1, Math.trunc(parsed)));
}

export function buildTelegramIdempotencyKey(
  payload: TelegramSendPayload,
  targetChatId: string
): string {
  const hasThread =
    typeof payload.threadId === "number" && payload.threadId > 0;
  const threadKeySuffix = hasThread ? `:${payload.threadId}` : "";
  return computeIdempotencyKey(
    payload.campaignSlug,
    "telegram",
    `${targetChatId}${threadKeySuffix}:${payload.locale}`,
    { isTest: payload.isTestDispatch }
  );
}

export function makeResult(
  channel: BroadcastChannel,
  driver: string,
  recipientMasked: string,
  locale: string,
  status: ChannelDispatchResult["status"],
  idempotencyKey: string,
  extra?: Partial<ChannelDispatchResult>
): ChannelDispatchResult {
  return {
    channel,
    driver,
    recipientMasked,
    locale,
    status,
    idempotencyKey,
    ...extra,
  };
}

export function parseTargetList(raw?: string | string[]): string[] {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : String(raw).split(",");
  return Array.from(
    new Set(items.map((item) => String(item).trim()).filter(Boolean))
  );
}

export function resolveTelegramTargets(
  campaign: CampaignRecord,
  settings: BroadcastSettings
): string[] {
  const fromCampaign = parseTargetList(campaign.telegramChatId);
  if (fromCampaign.length > 0) return fromCampaign;
  const fromTopic = parseTargetList(
    settings.telegramTopicChatMap?.[campaign.topic]
  );
  if (fromTopic.length > 0) return fromTopic;
  return parseTargetList(settings.telegramDefaultChatId);
}

export function resolveWhatsAppRecipients(
  campaign: CampaignRecord,
  settings: BroadcastSettings,
  subscribers: SubscriberRecipient[],
  isTestDispatch: boolean
): SubscriberRecipient[] {
  const configuredGroupsAndNumbers = isTestDispatch
    ? []
    : [
        ...parseTargetList(settings.whatsappDefaultRecipients),
        ...parseTargetList(settings.whatsappTopicGroupMap?.[campaign.topic]),
        ...parseTargetList(campaign.whatsappGroupIds),
      ];

  const rawPhoneRecipients: SubscriberRecipient[] = [
    ...subscribers.filter((r) => Boolean(r.phone)),
    ...configuredGroupsAndNumbers.map((phone) => ({
      phone,
      fullName: "Comunidad",
      locale: settings.defaultLocale || "es",
      topics: [campaign.topic],
    })),
  ];

  const seenWhatsAppTargets = new Set<string>();
  const deduplicated: SubscriberRecipient[] = [];

  for (const recipient of rawPhoneRecipients) {
    if (!recipient.phone) continue;
    const normKey = normalizeWhatsAppTarget(recipient.phone).normalized;
    if (!normKey || seenWhatsAppTargets.has(normKey)) continue;
    seenWhatsAppTargets.add(normKey);
    deduplicated.push(recipient);
  }

  return deduplicated;
}

export function createEmptyStats(): CampaignStats {
  return {
    totalRecipients: 0,
    sentCount: 0,
    simulatedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    byChannel: {},
  };
}

export function recordResultInStats(
  stats: CampaignStats,
  result: ChannelDispatchResult
): void {
  stats.totalRecipients += 1;
  const bucket: ChannelDispatchCount = stats.byChannel[result.channel] || {
    sent: 0,
    simulated: 0,
    skipped: 0,
    failed: 0,
  };
  if (result.status === "sent") {
    stats.sentCount += 1;
    bucket.sent += 1;
  } else if (result.status === "simulated") {
    stats.simulatedCount += 1;
    bucket.simulated += 1;
  } else if (result.status === "skipped_duplicate") {
    stats.skippedCount += 1;
    bucket.skipped += 1;
  } else {
    stats.failedCount += 1;
    bucket.failed += 1;
  }
  stats.byChannel[result.channel] = bucket;
}

export function resolveEffectiveEmailTemplateRef(
  payload: EmailSendPayload,
  settings: BroadcastSettings
): string {
  if (settings.enableEmailDesignerBridge === false) return "";
  return String(
    payload.emailTemplateRef || settings.defaultEmailTemplateRef || ""
  ).trim();
}

export function buildEmailTemplateVariables(
  payload: EmailSendPayload,
  settings: BroadcastSettings,
  inlineHtml: string
): Record<string, string | number | undefined> {
  const extraEntries = Object.entries(payload.templateData || {}).map(
    ([k, v]) => [
      k,
      v !== undefined && v !== null ? escapeHtml(String(v)) : undefined,
    ]
  );

  return {
    subject: escapeHtml(payload.subject),
    bodyText: escapeHtml(payload.text),
    bodyHtml: inlineHtml,
    text: escapeHtml(payload.text),
    html: inlineHtml,
    ctaLabel: escapeHtml(payload.ctaLabel || ""),
    ctaUrl: escapeHtml(payload.ctaUrl || settings.siteBaseUrl),
    unsubscribeUrl: escapeHtml(payload.unsubscribeUrl || ""),
    secondaryDate: escapeHtml(payload.secondaryDateLabel || ""),
    organizationName: escapeHtml(settings.organizationName),
    siteBaseUrl: escapeHtml(settings.siteBaseUrl),
    ...Object.fromEntries(extraEntries),
  };
}

export function buildTelegramRequestPayload(
  payload: TelegramSendPayload,
  targetChatId: string
): Record<string, unknown> {
  const normalizedSubject = String(payload.subject || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim();
  const safeSubject = escapeHtml(normalizedSubject);
  const safeBody = sanitizeTelegramHtml(payload.htmlBody);
  const text = safeBody
    ? `<b>${safeSubject}</b>\n\n${safeBody}`
    : `<b>${safeSubject}</b>`;

  const bodyPayload: Record<string, unknown> = {
    chat_id: targetChatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
  };
  if (typeof payload.threadId === "number" && payload.threadId > 0) {
    bodyPayload.message_thread_id = payload.threadId;
  }
  if (payload.ctaLabel && payload.ctaUrl && isSafeHttpUrl(payload.ctaUrl)) {
    bodyPayload.reply_markup = {
      inline_keyboard: [[{ text: payload.ctaLabel, url: payload.ctaUrl }]],
    };
  }
  return bodyPayload;
}

export async function executeTelegramHttpSend(
  payload: TelegramSendPayload,
  targetChatId: string,
  botToken: string
): Promise<string> {
  const cleanToken = String(botToken || "").trim();
  if (!TELEGRAM_BOT_TOKEN_RE.test(cleanToken)) {
    throw new Error("Invalid Telegram bot token format");
  }

  const endpoint = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
  const bodyPayload = buildTelegramRequestPayload(payload, targetChatId);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyPayload),
    redirect: "error",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const json = (await response.json()) as {
    ok?: boolean;
    result?: { message_id?: number };
    description?: string;
  };
  if (!response.ok || !json.ok) {
    throw new Error(json.description || `Telegram HTTP ${response.status}`);
  }
  return String(json.result?.message_id || Date.now());
}

export async function sendViaMetaCloudApi(
  payload: WhatsAppSendPayload,
  settings: BroadcastSettings,
  evolutionNumber: string,
  fullText: string
): Promise<string> {
  const phoneId = String(settings.whatsappPhoneNumberId || "").trim();
  if (!/^[A-Za-z0-9_-]+$/.test(phoneId)) {
    throw new Error("Invalid Meta WABA phoneNumberId format");
  }
  const endpoint = `https://graph.facebook.com/v20.0/${encodeURIComponent(
    phoneId
  )}/messages`;
  const reqBody = payload.templateName
    ? {
        messaging_product: "whatsapp",
        to: evolutionNumber,
        type: "template",
        template: {
          name: payload.templateName,
          language: { code: payload.locale },
        },
      }
    : {
        messaging_product: "whatsapp",
        to: evolutionNumber,
        type: "text",
        text: { preview_url: true, body: fullText },
      };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${settings.whatsappAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqBody),
    redirect: "error",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const json = (await res.json()) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message || `Meta Cloud HTTP ${res.status}`);
  }
  return json.messages?.[0]?.id || `waba_${Date.now()}`;
}

export async function sendViaSelfHostedGateway(
  driver: string,
  settings: BroadcastSettings,
  target: ReturnType<typeof normalizeWhatsAppTarget>,
  fullText: string
): Promise<string> {
  const gatewayCheck = validateGatewayUrl(settings.whatsappGatewayUrl || "", {
    allowLocalhost: Boolean(settings.allowLocalhostGateways),
  });
  if (!gatewayCheck.valid) throw new Error(gatewayCheck.errors.join("; "));

  const rawSession = String(
    settings.whatsappGatewaySession || "default"
  ).trim();
  if (!isValidGatewaySession(rawSession)) {
    throw new Error("Invalid WhatsApp gateway session identifier");
  }

  let baseUrl = settings.whatsappGatewayUrl || "";
  while (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }
  const session = encodeURIComponent(rawSession);
  const endpoint =
    driver === "evolution"
      ? `${baseUrl}/message/sendText/${session}`
      : `${baseUrl}/api/sendText`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (settings.whatsappGatewayApiKey) {
    headers.apikey = settings.whatsappGatewayApiKey;
    headers["X-Api-Key"] = settings.whatsappGatewayApiKey;
  }

  const body =
    driver === "evolution"
      ? { number: target.evolutionNumber, text: fullText }
      : {
          session: rawSession,
          chatId: target.chatId,
          text: fullText,
        };

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${driver} gateway HTTP ${res.status}`);
  return `${driver}_${Date.now()}`;
}

export async function executeWhatsAppHttpSend(
  driver: string,
  payload: WhatsAppSendPayload,
  settings: BroadcastSettings,
  target: ReturnType<typeof normalizeWhatsAppTarget>
): Promise<string> {
  const safeCtaUrl =
    payload.ctaUrl && isSafeHttpUrl(payload.ctaUrl)
      ? payload.ctaUrl
      : undefined;
  const fullText = safeCtaUrl
    ? `${payload.textBody}\n\n🔗 ${safeCtaUrl}`
    : payload.textBody;
  if (driver === "meta-cloud") {
    return sendViaMetaCloudApi(
      payload,
      settings,
      target.evolutionNumber,
      fullText
    );
  }
  return sendViaSelfHostedGateway(driver, settings, target, fullText);
}

export function hasWhatsAppCredentials(
  driver: string,
  settings: BroadcastSettings
): boolean {
  if (driver === "meta-cloud") {
    return Boolean(
      settings.whatsappPhoneNumberId && settings.whatsappAccessToken
    );
  }
  return Boolean(settings.whatsappGatewayUrl);
}
