import type {
  AlertSeverity,
  CaptchaProvider,
  FormCategory,
  FormFieldType,
  InboxSettings,
  SubmissionPriority,
  SubmissionStatus,
  SubscriberStatus,
} from "./types";

export const PLUGIN_ID = "inbox";

export const FORM_BUILDER_CMS_PLUGIN_ID = "strapi-plugin-form-builder-cms";
export const FORM_BUILDER_CMS_FORM_UID = `plugin::${FORM_BUILDER_CMS_PLUGIN_ID}.form`;
export const FORM_BUILDER_CMS_SUBMISSION_UID = `plugin::${FORM_BUILDER_CMS_PLUGIN_ID}.form-submission`;

export const FORM_UID = FORM_BUILDER_CMS_FORM_UID;
export const SUBMISSION_UID = `plugin::${PLUGIN_ID}.submission`;
export const SUBSCRIBER_UID = `plugin::${PLUGIN_ID}.subscriber`;
export const ALERT_BANNER_UID = `plugin::${PLUGIN_ID}.alert-banner`;

export const DECORATIVE_FIELD_TYPES: readonly FormFieldType[] = ["heading", "paragraph", "divider"];

export const FORM_FIELD_TYPES: readonly FormFieldType[] = [
  "text",
  "email",
  "number",
  "phone",
  "url",
  "password",
  "date",
  "time",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "checkbox-group",
  "file",
  "hidden",
  "heading",
  "paragraph",
  "divider",
];

export const FORM_CATEGORIES: readonly FormCategory[] = [
  "contact",
  "service_desk",
  "inquiry",
  "application",
  "volunteer",
  "custom",
];

export const SUBMISSION_STATUSES: readonly SubmissionStatus[] = [
  "new",
  "read",
  "under_review",
  "scheduled",
  "completed",
  "rejected",
  "archived",
];

export const SUBMISSION_PRIORITIES: readonly SubmissionPriority[] = [
  "low",
  "normal",
  "high",
  "urgent",
];

export const SUBSCRIBER_STATUSES: readonly SubscriberStatus[] = [
  "pending",
  "confirmed",
  "unsubscribed",
];

export const ALERT_SEVERITIES: readonly AlertSeverity[] = [
  "info",
  "warning",
  "urgent",
  "celebration",
];

export const CAPTCHA_PROVIDERS: readonly CaptchaProvider[] = ["none", "turnstile", "recaptcha"];

export const CAPTCHA_ENDPOINTS: Record<Exclude<CaptchaProvider, "none">, string> = {
  turnstile: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  recaptcha: "https://www.google.com/recaptcha/api/siteverify",
};

export const DEFAULT_INBOX_SETTINGS: InboxSettings = {
  primaryCalendar: "gregory",
  secondaryCalendars: ["islamic-umalqura"],
  defaultLocale: "es",
  supportedLocales: ["es", "en", "ar"],
  defaultRateLimitPerHour: 15,
  defaultHoneypotField: "_website_url",
  defaultCaptchaProvider: "none",
  turnstileSiteKey: "",
  turnstileSecretKey: "",
  recaptchaSiteKey: "",
  recaptchaSecretKey: "",
  enableDoubleOptIn: true,
  availableTopics: ["announcements", "events", "courses", "newsletter"],
  availableDepartments: ["general", "administration", "services", "education", "social_aid"],
  enableFormBuilderBridge: true,
  autoSyncFormBuilderForms: true,
  enableBookingBridge: true,
  enableCertificateBridge: true,
  defaultNotifyEmails: [],
  outboundWebhookUrl: "",
};
