/**
 * Field validation, Honeypot check, Sliding-Window IP Rate Limiter & CAPTCHA Verifier.
 * Adapted and extended from devCluna/strapi-plugin-form-builder-cms (MIT License).
 */
import { CAPTCHA_ENDPOINTS, DECORATIVE_FIELD_TYPES } from "./constants";
import type {
  CaptchaProvider,
  FormField,
  ValidationResult,
  ValidationRule,
} from "./types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LOCALIZED_REQUIRED_FALLBACK: Record<string, (label: string) => string> = {
  es: (label) => `${label} es obligatorio`,
  en: (label) => `${label} is required`,
  ar: (label) => `${label} مطلوب`,
};

export function isValueEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "boolean") return value === false;
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

function isValidHttpUrl(strVal: string): boolean {
  try {
    const parsed = new URL(strVal);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function checkFieldOptions(
  field: FormField,
  rawValue: unknown,
  strVal: string,
  fieldLabel: string
): string | null {
  if (!Array.isArray(field.options) || field.options.length === 0) return null;
  const allowed = new Set(field.options.map((o) => o.value));
  if (field.type === "select" || field.type === "radio") {
    return allowed.has(strVal)
      ? null
      : `${fieldLabel} contains an invalid selection`;
  }
  if (field.type === "checkbox-group") {
    const values = Array.isArray(rawValue) ? rawValue.map(String) : [strVal];
    return values.some((v) => !allowed.has(v))
      ? `${fieldLabel} contains an invalid selection`
      : null;
  }
  return null;
}

function validateFieldTypeAndOptions(
  field: FormField,
  rawValue: unknown,
  strVal: string,
  fieldLabel: string,
  locale: string,
  rules: ValidationRule[]
): string[] {
  const fieldErrors: string[] = [];
  if (field.type === "email" && !EMAIL_REGEX.test(strVal)) {
    const emailRule = rules.find((r) => r.type === "email");
    fieldErrors.push(
      resolveRuleMessage(
        emailRule,
        locale,
        `${fieldLabel} must be a valid email address`
      )
    );
  }
  if (field.type === "url" && !isValidHttpUrl(strVal)) {
    const urlRule = rules.find((r) => r.type === "url");
    fieldErrors.push(
      resolveRuleMessage(urlRule, locale, `${fieldLabel} must be a valid URL`)
    );
  }
  const optError = checkFieldOptions(field, rawValue, strVal, fieldLabel);
  if (optError) fieldErrors.push(optError);
  return fieldErrors;
}

function checkLengthRule(
  rule: ValidationRule,
  limit: number,
  strVal: string,
  fieldLabel: string,
  locale: string
): string | null {
  if (rule.type === "minLength" && strVal.length < limit) {
    return resolveRuleMessage(
      rule,
      locale,
      `${fieldLabel} must be at least ${limit} characters`
    );
  }
  if (rule.type === "maxLength" && strVal.length > limit) {
    return resolveRuleMessage(
      rule,
      locale,
      `${fieldLabel} must be at most ${limit} characters`
    );
  }
  return null;
}

function checkNumericBoundRule(
  rule: ValidationRule,
  limit: number,
  rawValue: unknown,
  fieldLabel: string,
  locale: string
): string | null {
  const num = Number(rawValue);
  if (rule.type === "min" && (Number.isNaN(num) || num < limit)) {
    return resolveRuleMessage(
      rule,
      locale,
      `${fieldLabel} must be at least ${limit}`
    );
  }
  if (rule.type === "max" && (Number.isNaN(num) || num > limit)) {
    return resolveRuleMessage(
      rule,
      locale,
      `${fieldLabel} must be at most ${limit}`
    );
  }
  return null;
}

function checkLengthOrNumberRule(
  rule: ValidationRule,
  rawValue: unknown,
  strVal: string,
  fieldLabel: string,
  locale: string
): string | null {
  if (typeof rule.value !== "number") return null;
  return (
    checkLengthRule(rule, rule.value, strVal, fieldLabel, locale) ??
    checkNumericBoundRule(rule, rule.value, rawValue, fieldLabel, locale)
  );
}

function checkPatternOrEmailRule(
  rule: ValidationRule,
  fieldType: string,
  strVal: string,
  fieldLabel: string,
  locale: string
): string | null {
  if (rule.type === "pattern" && typeof rule.value === "string") {
    try {
      const regex = new RegExp(rule.value);
      if (!regex.test(strVal)) {
        return resolveRuleMessage(
          rule,
          locale,
          `${fieldLabel} format is invalid`
        );
      }
    } catch {
      // Ignore malformed regex pattern
    }
  }
  if (
    rule.type === "email" &&
    fieldType !== "email" &&
    !EMAIL_REGEX.test(strVal)
  ) {
    return resolveRuleMessage(
      rule,
      locale,
      `${fieldLabel} must be a valid email address`
    );
  }
  return null;
}

function evaluateCustomRules(
  field: FormField,
  rawValue: unknown,
  strVal: string,
  fieldLabel: string,
  locale: string,
  rules: ValidationRule[]
): string[] {
  const errors: string[] = [];
  for (const rule of rules) {
    if (rule.type === "required") continue;
    const lenOrNumErr = checkLengthOrNumberRule(
      rule,
      rawValue,
      strVal,
      fieldLabel,
      locale
    );
    if (lenOrNumErr) errors.push(lenOrNumErr);
    const patOrEmailErr = checkPatternOrEmailRule(
      rule,
      field.type,
      strVal,
      fieldLabel,
      locale
    );
    if (patOrEmailErr) errors.push(patOrEmailErr);
  }
  return errors;
}

function resolveFieldLabel(field: FormField, locale: string): string {
  return field.localizedLabels?.[locale] || field.label || field.name;
}

function buildRequiredError(
  rules: ValidationRule[],
  locale: string,
  fieldLabel: string
): string {
  const reqRule = rules.find((r) => r.type === "required");
  const fallbackFn =
    LOCALIZED_REQUIRED_FALLBACK[locale] || LOCALIZED_REQUIRED_FALLBACK.en;
  return resolveRuleMessage(reqRule, locale, fallbackFn(fieldLabel));
}

function validateSingleField(
  field: FormField,
  data: Record<string, unknown>,
  locale: string
): { fieldErrors: string[]; cleanedValue: unknown } {
  const rawValue = data[field.name] ?? field.defaultValue;
  const fieldLabel = resolveFieldLabel(field, locale);
  const rules = field.validation || [];

  if (field.required && isValueEmpty(rawValue)) {
    return {
      fieldErrors: [buildRequiredError(rules, locale, fieldLabel)],
      cleanedValue: null,
    };
  }
  if (isValueEmpty(rawValue)) {
    return { fieldErrors: [], cleanedValue: rawValue ?? null };
  }

  const strVal =
    typeof rawValue === "string" ? rawValue.trim() : String(rawValue);
  const fieldErrors = [
    ...validateFieldTypeAndOptions(
      field,
      rawValue,
      strVal,
      fieldLabel,
      locale,
      rules
    ),
    ...evaluateCustomRules(field, rawValue, strVal, fieldLabel, locale, rules),
  ];
  return {
    fieldErrors,
    cleanedValue: typeof rawValue === "string" ? strVal : rawValue,
  };
}

export function validateFormSubmission(
  fields: FormField[],
  data: Record<string, unknown>,
  locale = "en"
): ValidationResult {
  const errors: Record<string, string[]> = {};
  const cleanedData: Record<string, unknown> = {};

  for (const field of fields) {
    if (DECORATIVE_FIELD_TYPES.includes(field.type)) continue;
    const { fieldErrors, cleanedValue } = validateSingleField(
      field,
      data,
      locale
    );
    if (fieldErrors.length > 0) {
      errors[field.name] = fieldErrors;
    } else {
      cleanedData[field.name] = cleanedValue;
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
  honeypotField = "_website_url"
): boolean {
  if (!honeypotField) return false;
  const val = payload[honeypotField];
  return typeof val === "string" && val.trim().length > 0;
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
    const key = `${bucketKey}::${ip || "unknown"}`;
    const cutoff = nowMs - windowMs;
    const previous = (this.hits.get(key) || []).filter((ts) => ts > cutoff);

    if (previous.length >= limitPerHour) {
      const oldest = previous[0] ?? nowMs;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldest + windowMs - nowMs) / 1000)
      );
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

function resolveFetchRunner(fetchImpl?: FetchLike): FetchLike | undefined {
  return fetchImpl ?? (globalThis as unknown as { fetch?: FetchLike }).fetch;
}

async function postCaptchaVerify(
  runner: FetchLike,
  url: string,
  params: URLSearchParams
): Promise<Record<string, unknown> | null> {
  try {
    const res = await runner(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function verifyCaptchaToken(
  provider: CaptchaProvider,
  secret: string,
  token: string,
  ip = "",
  fetchImpl?: FetchLike
): Promise<boolean> {
  if (provider === "none") return true;
  const url = CAPTCHA_ENDPOINTS[provider];
  const trimmedSecret = (secret || "").trim();
  const trimmedToken = (token || "").trim();
  const runner = resolveFetchRunner(fetchImpl);
  if (!url || !trimmedSecret || !trimmedToken || !runner) return false;

  const params = new URLSearchParams({
    secret: trimmedSecret,
    response: trimmedToken,
  });
  if (ip) params.append("remoteip", ip);

  const json = await postCaptchaVerify(runner, url, params);
  return Boolean(json?.success);
}

export async function testCaptchaSecretKey(
  provider: CaptchaProvider,
  secret: string,
  fetchImpl?: FetchLike
): Promise<{ ok: boolean; reason?: string }> {
  if (provider === "none") return { ok: true };
  const url = CAPTCHA_ENDPOINTS[provider];
  if (!url) return { ok: false, reason: "Unknown CAPTCHA provider" };
  const trimmedSecret = (secret || "").trim();
  if (!trimmedSecret) return { ok: false, reason: "Secret key is empty" };

  const runner = resolveFetchRunner(fetchImpl);
  if (!runner) return { ok: false, reason: "Fetch implementation unavailable" };

  const params = new URLSearchParams({
    secret: trimmedSecret,
    response: "test-token",
  });

  const json = await postCaptchaVerify(runner, url, params);
  if (!json) {
    return { ok: false, reason: "Could not reach the CAPTCHA provider" };
  }
  const codes = (json["error-codes"] as string[] | undefined) || [];
  if (
    codes.includes("invalid-input-secret") ||
    codes.includes("missing-input-secret")
  ) {
    return { ok: false, reason: "Secret key is invalid" };
  }
  return { ok: true };
}
