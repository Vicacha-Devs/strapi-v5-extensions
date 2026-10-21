/**
 * Field validation, Honeypot check, Sliding-Window IP Rate Limiter & CAPTCHA Verifier.
 * Adapted and extended from devCluna/strapi-plugin-form-builder-cms (MIT License).
 */
import { CAPTCHA_ENDPOINTS, DECORATIVE_FIELD_TYPES } from './constants';
import type {
  CaptchaProvider,
  FormField,
  ValidationResult,
  ValidationRule,
} from './types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LOCALIZED_REQUIRED_FALLBACK: Record<string, (label: string) => string> = {
  es: (label) => `${label} es obligatorio`,
  en: (label) => `${label} is required`,
  ar: (label) => `${label} مطلوب`,
};

export function isValueEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'boolean') return value === false;
  return false;
}

function resolveRuleMessage(
  rule: ValidationRule | undefined,
  locale: string,
  fallback: string
): string {
  if (!rule) return fallback;
  if (rule.localizedMessages && rule.localizedMessages[locale]) {
    return rule.localizedMessages[locale];
  }
  if (rule.message) return rule.message;
  return fallback;
}

export function validateFormSubmission(
  fields: FormField[],
  data: Record<string, unknown>,
  locale = 'en'
): ValidationResult {
  const errors: Record<string, string[]> = {};
  const cleanedData: Record<string, unknown> = {};

  for (const field of fields) {
    if (DECORATIVE_FIELD_TYPES.includes(field.type)) {
      continue;
    }

    const rawValue = data[field.name] ?? field.defaultValue;
    const fieldLabel = field.localizedLabels?.[locale] || field.label || field.name;
    const fieldErrors: string[] = [];
    const rules = field.validation || [];

    if (field.required && isValueEmpty(rawValue)) {
      const reqRule = rules.find((r) => r.type === 'required');
      const fallbackFn = LOCALIZED_REQUIRED_FALLBACK[locale] || LOCALIZED_REQUIRED_FALLBACK.en;
      fieldErrors.push(resolveRuleMessage(reqRule, locale, fallbackFn(fieldLabel)));
      errors[field.name] = fieldErrors;
      continue;
    }

    if (isValueEmpty(rawValue)) {
      cleanedData[field.name] = rawValue ?? null;
      continue;
    }

    const strVal = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue);

    if (field.type === 'email' && !EMAIL_REGEX.test(strVal)) {
      const emailRule = rules.find((r) => r.type === 'email');
      fieldErrors.push(
        resolveRuleMessage(emailRule, locale, `${fieldLabel} must be a valid email address`)
      );
    }

    if (field.type === 'url') {
      try {
        const parsed = new URL(strVal);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Invalid protocol');
        }
      } catch {
        const urlRule = rules.find((r) => r.type === 'url');
        fieldErrors.push(resolveRuleMessage(urlRule, locale, `${fieldLabel} must be a valid URL`));
      }
    }

    if (
      (field.type === 'select' || field.type === 'radio') &&
      Array.isArray(field.options) &&
      field.options.length > 0
    ) {
      const allowed = new Set(field.options.map((o) => o.value));
      if (!allowed.has(strVal)) {
        fieldErrors.push(`${fieldLabel} contains an invalid selection`);
      }
    }

    if (
      field.type === 'checkbox-group' &&
      Array.isArray(field.options) &&
      field.options.length > 0
    ) {
      const allowed = new Set(field.options.map((o) => o.value));
      const values = Array.isArray(rawValue) ? rawValue.map(String) : [strVal];
      if (values.some((v) => !allowed.has(v))) {
        fieldErrors.push(`${fieldLabel} contains an invalid selection`);
      }
    }

    for (const rule of rules) {
      if (rule.type === 'required') continue;

      if (rule.type === 'minLength' && typeof rule.value === 'number') {
        if (strVal.length < rule.value) {
          fieldErrors.push(
            resolveRuleMessage(
              rule,
              locale,
              `${fieldLabel} must be at least ${rule.value} characters`
            )
          );
        }
      } else if (rule.type === 'maxLength' && typeof rule.value === 'number') {
        if (strVal.length > rule.value) {
          fieldErrors.push(
            resolveRuleMessage(
              rule,
              locale,
              `${fieldLabel} must be at most ${rule.value} characters`
            )
          );
        }
      } else if (rule.type === 'min' && typeof rule.value === 'number') {
        const num = Number(rawValue);
        if (Number.isNaN(num) || num < rule.value) {
          fieldErrors.push(
            resolveRuleMessage(rule, locale, `${fieldLabel} must be at least ${rule.value}`)
          );
        }
      } else if (rule.type === 'max' && typeof rule.value === 'number') {
        const num = Number(rawValue);
        if (Number.isNaN(num) || num > rule.value) {
          fieldErrors.push(
            resolveRuleMessage(rule, locale, `${fieldLabel} must be at most ${rule.value}`)
          );
        }
      } else if (rule.type === 'pattern' && typeof rule.value === 'string') {
        try {
          const regex = new RegExp(rule.value);
          if (!regex.test(strVal)) {
            fieldErrors.push(
              resolveRuleMessage(rule, locale, `${fieldLabel} format is invalid`)
            );
          }
        } catch {
          // Ignore malformed regex pattern
        }
      } else if (rule.type === 'email' && field.type !== 'email') {
        if (!EMAIL_REGEX.test(strVal)) {
          fieldErrors.push(
            resolveRuleMessage(rule, locale, `${fieldLabel} must be a valid email address`)
          );
        }
      }
    }

    if (fieldErrors.length > 0) {
      errors[field.name] = fieldErrors;
    } else {
      cleanedData[field.name] = typeof rawValue === 'string' ? strVal : rawValue;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    cleanedData,
  };
}

export function isHoneypotTriggered(
  payload: Record<string, unknown>,
  honeypotField = '_website_url'
): boolean {
  if (!honeypotField) return false;
  const val = payload[honeypotField];
  return typeof val === 'string' && val.trim().length > 0;
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  public check(
    ip: string,
    bucketKey: string,
    limitPerHour: number,
    nowMs = Date.now()
  ): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
    if (limitPerHour <= 0) {
      return { allowed: true, remaining: 999, retryAfterSeconds: 0 };
    }
    const windowMs = 60 * 60 * 1000;
    const key = `${bucketKey}::${ip || 'unknown'}`;
    const cutoff = nowMs - windowMs;
    const previous = (this.hits.get(key) || []).filter((ts) => ts > cutoff);

    if (previous.length >= limitPerHour) {
      const oldest = previous[0] ?? nowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - nowMs) / 1000));
      this.hits.set(key, previous);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    previous.push(nowMs);
    this.hits.set(key, previous);
    return {
      allowed: true,
      remaining: Math.max(0, limitPerHour - previous.length),
      retryAfterSeconds: 0,
    };
  }

  public reset(): void {
    this.hits.clear();
  }
}

export const defaultRateLimiter = new SlidingWindowRateLimiter();

export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<{ json(): Promise<unknown> }>;

export async function verifyCaptchaToken(
  provider: CaptchaProvider,
  secret: string,
  token: string,
  ip = '',
  fetchImpl?: FetchLike
): Promise<boolean> {
  if (provider === 'none') return true;
  const url = CAPTCHA_ENDPOINTS[provider];
  if (!url) return false;
  const trimmedSecret = (secret || '').trim();
  const trimmedToken = (token || '').trim();
  if (!trimmedSecret || !trimmedToken) return false;

  const params = new URLSearchParams({
    secret: trimmedSecret,
    response: trimmedToken,
  });
  if (ip) params.append('remoteip', ip);

  const runner: FetchLike | undefined =
    fetchImpl ?? ((globalThis as unknown as { fetch?: FetchLike }).fetch);
  if (!runner) return false;

  try {
    const res = await runner(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const json = (await res.json()) as { success?: boolean };
    return Boolean(json && json.success);
  } catch {
    return false;
  }
}

export async function testCaptchaSecretKey(
  provider: CaptchaProvider,
  secret: string,
  fetchImpl?: FetchLike
): Promise<{ ok: boolean; reason?: string }> {
  if (provider === 'none') return { ok: true };
  const url = CAPTCHA_ENDPOINTS[provider];
  if (!url) return { ok: false, reason: 'Unknown CAPTCHA provider' };
  const trimmedSecret = (secret || '').trim();
  if (!trimmedSecret) return { ok: false, reason: 'Secret key is empty' };

  const runner: FetchLike | undefined =
    fetchImpl ?? ((globalThis as unknown as { fetch?: FetchLike }).fetch);
  if (!runner) return { ok: false, reason: 'Fetch implementation unavailable' };

  const params = new URLSearchParams({
    secret: trimmedSecret,
    response: 'test-token',
  });

  try {
    const res = await runner(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const json = (await res.json()) as { 'error-codes'?: string[] };
    const codes = json?.['error-codes'] || [];
    if (codes.includes('invalid-input-secret') || codes.includes('missing-input-secret')) {
      return { ok: false, reason: 'Secret key is invalid' };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'Could not reach the CAPTCHA provider' };
  }
}
