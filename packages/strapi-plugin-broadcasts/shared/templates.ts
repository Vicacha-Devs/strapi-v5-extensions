import { createHmac } from 'node:crypto';
import type { CampaignRecord, CampaignTranslation } from './types';

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(raw: string): string {
  return String(raw).replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

export function interpolateBroadcastTemplate(
  template: string,
  variables: Record<string, string | number | undefined>,
  options: { escapeHtmlValues?: boolean } = {}
): string {
  if (!template) return '';
  const shouldEscape = Boolean(options.escapeHtmlValues);
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
    const rawValue = variables[key];
    if (rawValue === undefined || rawValue === null) {
      return '';
    }
    const strValue = String(rawValue);
    return shouldEscape ? escapeHtml(strValue) : strValue;
  });
}

export function maskEmail(email: string): string {
  const trimmed = String(email || '').trim().toLowerCase();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) {
    return '***@invalid';
  }
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (!domain) {
    return '***@invalid';
  }
  const visiblePrefix = local.slice(0, 1);
  return `${visiblePrefix}***@${domain}`;
}

export function maskPhone(phone: string): string {
  const normalized = normalizeE164Phone(phone);
  if (normalized.length <= 4) {
    return '***';
  }
  const prefix = normalized.startsWith('+') ? normalized.slice(0, 3) : normalized.slice(0, 2);
  const suffix = normalized.slice(-4);
  return `${prefix}***${suffix}`;
}

export function maskRecipientIdentifier(identifier: string): string {
  const trimmed = String(identifier || '').trim();
  if (!trimmed) return '***';
  if (trimmed.includes('@') && !trimmed.startsWith('@')) {
    return maskEmail(trimmed);
  }
  if (trimmed.startsWith('@') || trimmed.startsWith('-100')) {
    // Public/group Telegram channel IDs are non-PII channel identifiers
    return trimmed;
  }
  return maskPhone(trimmed);
}

export function normalizeE164Phone(phone: string, defaultCountryCode = '57'): string {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  const hasPlus = raw.startsWith('+');
  const digitsOnly = raw.replace(/\D+/g, '');
  if (!digitsOnly) return '';
  if (hasPlus) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.startsWith('00') && digitsOnly.length > 4) {
    return `+${digitsOnly.slice(2)}`;
  }
  if (digitsOnly.length === 10 && defaultCountryCode) {
    return `+${defaultCountryCode.replace(/\D+/g, '')}${digitsOnly}`;
  }
  return `+${digitsOnly}`;
}

export function computeIdempotencyKey(
  campaignSlug: string,
  channel: string,
  recipient: string
): string {
  const normalizedRecipient = String(recipient || '').trim().toLowerCase();
  const digest = createHmac('sha256', 'vicacha-broadcasts-idempotency-v1')
    .update(`${campaignSlug}:${channel}:${normalizedRecipient}`, 'utf8')
    .digest('hex')
    .slice(0, 24);
  return `${campaignSlug}:${channel}:${digest}`;
}

export function resolveLocalizedCampaignCopy(
  campaign: Pick<
    CampaignRecord,
    'subject' | 'bodyText' | 'bodyHtml' | 'ctaLabel' | 'ctaUrl' | 'translations'
  >,
  locale: string,
  defaultLocale = 'es'
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
