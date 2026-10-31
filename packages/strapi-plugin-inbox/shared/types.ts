import type { CalendarSystemId } from './calendarSystems';

export type FormFieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'phone'
  | 'url'
  | 'password'
  | 'date'
  | 'time'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'checkbox-group'
  | 'file'
  | 'hidden'
  | 'heading'
  | 'paragraph'
  | 'divider';

export type ValidationRuleType =
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'min'
  | 'max'
  | 'pattern'
  | 'email'
  | 'url';

export interface ValidationRule {
  type: ValidationRuleType;
  value?: string | number;
  message?: string;
  localizedMessages?: Record<string, string>;
}

export interface FormFieldOption {
  label: string;
  value: string;
  localizedLabels?: Record<string, string>;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  required: boolean;
  width?: 'full' | 'half' | 'third';
  options?: FormFieldOption[];
  validation?: ValidationRule[];
  localizedLabels?: Record<string, string>;
  localizedPlaceholders?: Record<string, string>;
  localizedHelpTexts?: Record<string, string>;
}

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  verified?: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  localizedLabels?: Record<string, string>;
}

export type CaptchaProvider = 'none' | 'turnstile' | 'recaptcha';

export type FormCategory =
  | 'contact'
  | 'service_desk'
  | 'inquiry'
  | 'application'
  | 'volunteer'
  | 'custom';

export type SubmissionStatus =
  | 'new'
  | 'read'
  | 'under_review'
  | 'scheduled'
  | 'completed'
  | 'rejected'
  | 'archived';

export type SubmissionPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface FormSettings {
  submitButtonLabel?: string;
  localizedSubmitLabels?: Record<string, string>;
  successMessage?: string;
  localizedSuccessMessages?: Record<string, string>;
  redirectUrl?: string;
  honeypotField?: string;
  rateLimitPerHour?: number;
  captchaProvider?: CaptchaProvider;
  captchaSiteKey?: string;
  captchaSecretKey?: string;
  notifyEmails?: string[];
  webhookUrl?: string;
  enableBookingBridge?: boolean;
  defaultBookingServiceSlug?: string;
  enableCertificateBridge?: boolean;
  defaultCertificateTemplateId?: string;
  defaultPriority?: SubmissionPriority;
  department?: string;
}

export interface FormTranslation {
  title?: string;
  description?: string;
  submitButtonLabel?: string;
  successMessage?: string;
}

export interface FormRecord {
  documentId?: string;
  title: string;
  slug: string;
  description?: string;
  category: FormCategory;
  fields: FormField[];
  checklistTemplate?: ChecklistItem[];
  settings: FormSettings;
  translations?: Record<string, FormTranslation>;
  active: boolean;
  submissionCount?: number;
  formBuilderId?: number | null;
  formBuilderSlug?: string | null;
  publishedAt?: string | null;
}

export interface FormBuilderCmsFormSummary {
  id: number;
  documentId?: string;
  slug: string;
  title: string;
  description?: string;
  fieldCount: number;
  submissionCount: number;
  publishedAt?: string | null;
  linkedInboxSlug?: string;
  linkedCategory?: FormCategory;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
  cleanedData: Record<string, unknown>;
}

export interface SubmissionRecord {
  documentId?: string;
  referenceCode: string;
  formSlug: string;
  formTitle?: string;
  category?: FormCategory;
  status: SubmissionStatus;
  priority: SubmissionPriority;
  department?: string;
  locale: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  data: Record<string, unknown>;
  checklistItems?: ChecklistItem[];
  staffNotes?: string;
  assignedTo?: string;
  linkedBookingId?: string;
  linkedCertificateNumber?: string;
  formBuilderSubmissionId?: number | null;
  ipAddress?: string;
  userAgent?: string;
  submittedAt: string;
  secondaryDate?: {
    formatted?: string;
    year?: number;
    month?: number;
    day?: number;
  };
}

export type SubscriberStatus = 'pending' | 'confirmed' | 'unsubscribed';

export interface SubscriberRecord {
  documentId?: string;
  email: string;
  fullName?: string;
  phone?: string;
  locale: string;
  topics: string[];
  status: SubscriberStatus;
  confirmToken?: string | null;
  unsubscribeToken: string;
  confirmedAt?: string | null;
  unsubscribedAt?: string | null;
  sourceFormSlug?: string;
}

export type AlertSeverity = 'info' | 'warning' | 'urgent' | 'celebration';

export interface AlertTranslation {
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface AlertBannerRecord {
  documentId?: string;
  code: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  ctaLabel?: string;
  ctaUrl?: string;
  dismissible: boolean;
  active: boolean;
  priority: number;
  startsAt?: string | null;
  endsAt?: string | null;
  translations?: Record<string, AlertTranslation>;
  secondaryDateLabel?: string;
}

export interface InboxSettings {
  primaryCalendar: CalendarSystemId;
  secondaryCalendars: CalendarSystemId[];
  defaultLocale: string;
  supportedLocales: string[];
  defaultRateLimitPerHour: number;
  defaultHoneypotField: string;
  defaultCaptchaProvider: CaptchaProvider;
  turnstileSiteKey?: string;
  turnstileSecretKey?: string;
  recaptchaSiteKey?: string;
  recaptchaSecretKey?: string;
  enableDoubleOptIn: boolean;
  availableTopics: string[];
  availableDepartments: string[];
  enableFormBuilderBridge: boolean;
  autoSyncFormBuilderForms: boolean;
  enableBookingBridge: boolean;
  enableCertificateBridge: boolean;
  defaultNotifyEmails: string[];
  outboundWebhookUrl?: string;
}
