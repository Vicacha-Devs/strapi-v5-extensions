import { escapeHtml } from "@vicacha-devs/plugin-shared";

import type { CampaignRecord, CampaignTranslation } from "./types";

export { escapeHtml };

const TELEGRAM_INLINE_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "ins",
  "s",
  "strike",
  "del",
  "code",
  "pre",
  "tg-spoiler",
]);

export function stripHeaderControlChars(raw: string): string {
  return String(raw || "")
    .replace(/[\r\n<>]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
}

function extractSafeAnchorHref(attrs: string): string | null {
  const match = attrs.match(
    /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i
  );
  const rawHref = (match?.[1] ?? match?.[2] ?? match?.[3] ?? "")
    .replace(/&amp;/gi, "&")
    .trim();
  if (!rawHref || /[\u0000-\u001f\u007f]/.test(rawHref)) return null;
  try {
    const parsed = new URL(rawHref);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function sanitizeTelegramHtml(rawHtml: string): string {
  if (!rawHtml) return "";

  let text = String(rawHtml)
    .replace(/[\uE000\uE001]/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<h[1-6](?:\s[^>]*)?>/gi, "<b>")
    .replace(/<\/h[1-6]\s*>/gi, "</b>\n")
    .replace(/<p(?:\s[^>]*)?>/gi, "")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<div(?:\s[^>]*)?>/gi, "")
    .replace(/<\/div\s*>/gi, "\n")
    .replace(/<li(?:\s[^>]*)?>/gi, "• ")
    .replace(/<\/li\s*>/gi, "\n");

  let openAnchors = 0;
  text = text.replace(
    /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)(\s[^<>]*)?(\/?)>/g,
    (_full, slash: string, rawName: string, attrs = "", selfClose = "") => {
      const tag = rawName.toLowerCase();
      if (selfClose === "/") return "";
      if (slash === "/") {
        if (TELEGRAM_INLINE_TAGS.has(tag)) return `\uE000/${tag}\uE001`;
        if (tag === "a" && openAnchors > 0) {
          openAnchors -= 1;
          return "\uE000/a\uE001";
        }
        return "";
      }
      if (TELEGRAM_INLINE_TAGS.has(tag)) return `\uE000${tag}\uE001`;
      if (tag === "a") {
        const safeHref = extractSafeAnchorHref(attrs);
        if (!safeHref) return "";
        openAnchors += 1;
        return `\uE000a href="${escapeHtml(safeHref)}"\uE001`;
      }
      return "";
    }
  );

  while (openAnchors > 0) {
    text += "\uE000/a\uE001";
    openAnchors -= 1;
  }

  text = text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi, "&amp;")
    .replaceAll("\uE000", "<")
    .replaceAll("\uE001", ">")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

export function interpolateBroadcastTemplate(
  template: string,
  variables: Record<string, string | number | undefined>,
  options: { escapeHtmlValues?: boolean } = {}
): string {
  if (!template) return "";
  const shouldEscape = Boolean(options.escapeHtmlValues);
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
    (_match, key: string) => {
      if (!Object.hasOwn(variables, key)) {
        return "";
      }
      const rawValue = variables[key];
      if (rawValue === undefined || rawValue === null) {
        return "";
      }
      const strValue = String(rawValue);
      return shouldEscape ? escapeHtml(strValue) : strValue;
    }
  );
}

export function maskEmail(email: string): string {
  const trimmed = String(email || "")
    .trim()
    .toLowerCase();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) {
    return "***@invalid";
  }
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (!domain) {
    return "***@invalid";
  }
  const visiblePrefix = local.slice(0, 1);
  return `${visiblePrefix}***@${domain}`;
}

export function maskPhone(phone: string): string {
  const normalized = normalizeE164Phone(phone);
  if (normalized.length <= 4) {
    return "***";
  }
  const prefix = normalized.startsWith("+")
    ? normalized.slice(0, 3)
    : normalized.slice(0, 2);
  const suffix = normalized.slice(-4);
  return `${prefix}***${suffix}`;
}

export interface NormalizedWhatsAppTarget {
  /** Canonical identifier used for idempotency keys & masking */
  normalized: string;
  /** True when target is a WhatsApp Group (@g.us) or Channel (@newsletter) */
  isGroupOrChannel: boolean;
  /** JID for WAHA / OpenWA gateways */
  chatId: string;
  /** Recipient identifier for Evolution API v2 */
  evolutionNumber: string;
}

export function isWhatsAppGroupOrChannelJid(raw: string): boolean {
  const trimmed = String(raw || "")
    .trim()
    .toLowerCase();
  return /^[\d-]+@g\.us$/.test(trimmed) || /^[\d-]+@newsletter$/.test(trimmed);
}

export function normalizeWhatsAppTarget(
  raw: string,
  defaultCountryCode = "57"
): NormalizedWhatsAppTarget {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    return {
      normalized: "",
      isGroupOrChannel: false,
      chatId: "",
      evolutionNumber: "",
    };
  }

  const lower = trimmed.toLowerCase();
  if (isWhatsAppGroupOrChannelJid(lower)) {
    return {
      normalized: lower,
      isGroupOrChannel: true,
      chatId: lower,
      evolutionNumber: lower,
    };
  }

  if (lower.endsWith("@c.us") || lower.endsWith("@s.whatsapp.net")) {
    const userPart = lower.split("@")[0];
    const e164 = normalizeE164Phone(userPart, defaultCountryCode);
    const digits = e164.replace(/^\+/, "");
    return {
      normalized: e164,
      isGroupOrChannel: false,
      chatId: digits ? `${digits}@c.us` : "",
      evolutionNumber: digits,
    };
  }

  const e164 = normalizeE164Phone(trimmed, defaultCountryCode);
  const digits = e164.replace(/^\+/, "");
  return {
    normalized: e164,
    isGroupOrChannel: false,
    chatId: digits ? `${digits}@c.us` : "",
    evolutionNumber: digits,
  };
}

export function maskRecipientIdentifier(identifier: string): string {
  const trimmed = String(identifier || "").trim();
  if (!trimmed) return "***";
  const lower = trimmed.toLowerCase();
  if (isWhatsAppGroupOrChannelJid(lower)) {
    // WhatsApp Group (@g.us) & Channel (@newsletter) JIDs are non-PII group/channel identifiers
    return lower;
  }
  if (trimmed.includes("@") && !trimmed.startsWith("@")) {
    return maskEmail(trimmed);
  }
  if (trimmed.startsWith("@") || /^-\d+$/.test(trimmed)) {
    // Public/group Telegram channel and group/supergroup IDs (@handle or -100...) are non-PII channel identifiers
    return trimmed;
  }
  return maskPhone(trimmed);
}

export function normalizeE164Phone(
  phone: string,
  defaultCountryCode = "57"
): string {
  const raw = String(phone || "").trim();
  if (!raw) return "";
  if (isWhatsAppGroupOrChannelJid(raw)) {
    return raw.toLowerCase();
  }
  const hasPlus = raw.startsWith("+");
  const digitsOnly = raw.replace(/\D+/g, "");
  if (!digitsOnly) return "";
  if (hasPlus) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.startsWith("00") && digitsOnly.length > 4) {
    return `+${digitsOnly.slice(2)}`;
  }
  if (digitsOnly.length === 10 && defaultCountryCode) {
    return `+${defaultCountryCode.replace(/\D+/g, "")}${digitsOnly}`;
  }
  return `+${digitsOnly}`;
}

export function resolveLocalizedCampaignCopy(
  campaign: Pick<
    CampaignRecord,
    "subject" | "bodyText" | "bodyHtml" | "ctaLabel" | "ctaUrl" | "translations"
  >,
  locale: string,
  defaultLocale = "es"
): CampaignTranslation {
  const translations = campaign.translations || {};
  const match = translations[locale] || translations[defaultLocale];
  return {
    subject: match?.subject || campaign.subject,
    bodyText: match?.bodyText || campaign.bodyText,
    bodyHtml: match?.bodyHtml || campaign.bodyHtml,
    ctaLabel: match?.ctaLabel || campaign.ctaLabel,
    ctaUrl: match?.ctaUrl || campaign.ctaUrl,
  };
}
