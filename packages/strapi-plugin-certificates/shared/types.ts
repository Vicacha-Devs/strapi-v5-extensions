import type { AlternateDateValue, CalendarSystemConfig } from "./calendarSystems";

export type CertificateStatus = "pending_approval" | "issued" | "revoked" | "expired";

export type ESignProviderType = "none" | "docusign" | "webhook";

export type ESignEnvelopeStatus =
  | "not_sent"
  | "sent"
  | "delivered"
  | "completed"
  | "declined"
  | "voided";

export interface DocuSignProviderConfig {
  enabled: boolean;
  provider: ESignProviderType;
  baseUrl: string;
  accountId: string;
  integrationKey?: string;
  emailSubjectPrefix?: string;
}

export interface CertificateSignatory {
  name: string;
  title: string;
  role?: string;
  email?: string;
  routingOrder?: number;
  signatureImageUrl?: string;
  signedAt?: string;
}

export interface CertificateWitness {
  fullName: string;
  documentIdMasked?: string;
  role?: string;
  email?: string;
  routingOrder?: number;
  signedAt?: string;
}

export interface CertificateCustomFieldDef {
  key: string;
  label: string;
  required?: boolean;
}

export interface CertificateTemplate {
  id?: number | string;
  documentId: string;
  name: string;
  slug: string;
  description?: string;
  serialPrefix: string;
  defaultValidityDays?: number | null;
  requiresWitnesses: boolean;
  minWitnesses: number;
  requiresApproval: boolean;
  esignEnabled?: boolean;
  esignProvider?: ESignProviderType;
  organizationName: string;
  organizationSubheader?: string;
  headerText?: string;
  titleText: string;
  bodyTemplate: string;
  footerText?: string;
  defaultSignatories: CertificateSignatory[];
  customFieldsSchema?: CertificateCustomFieldDef[];
  secondaryCalendars?: CalendarSystemConfig[];
  accentColor?: string;
  active: boolean;
}

export interface CertificateRecord {
  id?: number | string;
  documentId: string;
  serialNumber: string;
  templateDocumentId: string;
  templateSlug: string;
  templateName: string;
  status: CertificateStatus;
  recipientFullName: string;
  recipientChosenName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientNationality?: string;
  nationalIdMasked?: string;
  nationalIdHash?: string;
  issuedAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  revocationReason?: string | null;
  signatories: CertificateSignatory[];
  witnesses: CertificateWitness[];
  customData?: Record<string, string>;
  secondaryDates?: Record<string, AlternateDateValue>;
  canonicalPayloadHash: string;
  cryptographicSignature: string;
  publicKeyFingerprint: string;
  verificationToken?: string;
  esignProvider?: ESignProviderType;
  esignEnvelopeId?: string;
  esignEnvelopeStatus?: ESignEnvelopeStatus;
  esignCompletedAt?: string | null;
  linkedBookingCode?: string;
  notes?: string;
}

export interface CertificateIssueInput {
  templateDocumentId?: string;
  templateSlug?: string;
  recipientFullName: string;
  recipientChosenName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientNationality?: string;
  nationalIdRaw?: string;
  issuedAt?: string;
  expiresAt?: string | null;
  signatories?: CertificateSignatory[];
  witnesses?: Array<{
    fullName: string;
    documentIdRaw?: string;
    documentIdMasked?: string;
    role?: string;
    email?: string;
    routingOrder?: number;
    signedAt?: string;
  }>;
  customData?: Record<string, string>;
  linkedBookingCode?: string;
  notes?: string;
  autoApprove?: boolean;
  sendViaESign?: boolean;
  locale?: string;
}

export interface CanonicalCertificatePayload {
  version: "1.0";
  serialNumber: string;
  templateSlug: string;
  organizationName: string;
  recipientFullName: string;
  recipientChosenName: string;
  nationalIdHash: string;
  issuedAt: string;
  expiresAt: string;
  signatories: Array<{ name: string; title: string }>;
  witnesses: Array<{ fullName: string; role: string }>;
}

export interface CertificateVerificationResult {
  valid: boolean;
  cryptographicallyVerified: boolean;
  status: CertificateStatus;
  serialNumber: string;
  templateSlug: string;
  templateName: string;
  organizationName: string;
  recipientNameDisplay: string;
  recipientChosenName?: string;
  nationalIdMasked?: string;
  nationalIdMatches?: boolean;
  issuedAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  revocationReason?: string | null;
  secondaryDates?: Record<string, AlternateDateValue>;
  signatories: CertificateSignatory[];
  witnesses: Array<{ fullName: string; role?: string }>;
  canonicalPayloadHash: string;
  cryptographicSignature: string;
  publicKeyFingerprint: string;
  publicKeyPem: string;
  esignProvider?: ESignProviderType;
  esignEnvelopeId?: string;
  esignEnvelopeStatus?: ESignEnvelopeStatus;
  esignCompletedAt?: string | null;
  isUnmasked: boolean;
  verifiedAt: string;
}

export interface CertificatesPluginSettings {
  organizationName: string;
  organizationSubheader: string;
  verificationBaseUrl: string;
  defaultTimezone: string;
  defaultLocale: string;
  maskPublicRecipientName: boolean;
  allowPublicApplications: boolean;
  publicKeyPem: string;
  publicKeyFingerprint: string;
  secondaryCalendars: CalendarSystemConfig[];
  esign: DocuSignProviderConfig;
  defaultTemplates?: Array<Omit<CertificateTemplate, "documentId">>;
}

export interface CertificateStats {
  total: number;
  issued: number;
  pending_approval: number;
  revoked: number;
  expired: number;
}
