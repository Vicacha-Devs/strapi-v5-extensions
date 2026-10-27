import type { SecondaryCalendarDate } from './calendarSystems';

export type CampaignKind = 'major_campaign' | 'utility_invoice' | 'micro_need';

export type InvoiceStatus = 'open' | 'partially_funded' | 'paid' | 'overdue';

export type PledgeStatus = 'pending' | 'verified' | 'rejected' | 'certificate_issued';

export type PaymentChannel =
  | 'bank_transfer'
  | 'digital_wallet'
  | 'card_gateway'
  | 'qr_code'
  | 'cash'
  | 'other';

export type CampaignEvidenceType =
  | 'paid_receipt'
  | 'photo_gallery'
  | 'delivery_report'
  | 'audit_document'
  | 'beneficiary_update';

export interface CampaignEvidenceItem {
  id: string;
  title: string;
  evidenceType: CampaignEvidenceType;
  description: string;
  body: string;
  date: string;
  amountSpent: number;
  currency: string;
  mediaUrls: string[];
  documentUrl: string | null;
  verifiedBy: string | null;
  createdAt: string;
  secondaryDates?: SecondaryCalendarDate[];
}

export interface DonationCategoryConfig {
  key: string;
  labels: Record<string, string>;
  descriptions?: Record<string, string>;
  taxDeductible?: boolean;
  requiresAssessmentCalculator?: boolean;
}

export interface DonationCampaignItem {
  id: string | number;
  documentId: string;
  title: string;
  slug: string;
  description: string;
  body: string;
  campaignKind: CampaignKind;
  categoryKey: string;
  goalAmount: number;
  raisedAmount: number;
  remainingAmount: number;
  progressPercent: number;
  currency: string;
  donorCount: number;
  isUrgent: boolean;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  dueDate: string | null;
  billingPeriod: string | null;
  invoiceReference: string | null;
  invoiceProvider: string | null;
  invoiceStatus: InvoiceStatus;
  suggestedAmounts: number[];
  allowCustomAmount: boolean;
  allowFullBalancePayoff: boolean;
  coverUrl: string | null;
  invoiceDocumentUrl: string | null;
  paymentGatewayUrl: string | null;
  icon: string | null;
  evidences: CampaignEvidenceItem[];
  evidenceCount: number;
  accountedAmount: number;
  locale: string;
  availableLocales: string[];
  secondaryDates?: SecondaryCalendarDate[];
}

export interface DonationPledgeItem {
  id: string | number;
  documentId: string;
  referenceCode: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string | null;
  donorTaxId: string | null;
  donorTaxIdType: string | null;
  isAnonymous: boolean;
  amount: number;
  currency: string;
  convertedBaseAmount: number;
  categoryKey: string;
  campaignSlug: string | null;
  campaignKind: CampaignKind;
  coversRemainingBalance: boolean;
  paymentChannel: PaymentChannel;
  paymentProvider: string | null;
  transactionReference: string | null;
  receiptProofUrl: string | null;
  donorNotes: string | null;
  status: PledgeStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  certificateSerialNumber: string | null;
  certificateVerifyUrl: string | null;
  locale: string;
  createdAt: string;
  secondaryDates?: SecondaryCalendarDate[];
}

export interface AssessmentBenchmarkConfig {
  key: string;
  labels: Record<string, string>;
  unitType: 'gram_weight' | 'fixed_currency';
  thresholdUnits: number;
  unitPricesByCurrency: Record<string, number>;
}

export interface AssessmentAssetFieldConfig {
  key: string;
  labels: Record<string, string>;
  kind: 'asset' | 'deductible_liability';
}

export interface AssessmentProfileConfig {
  key: string;
  labels: Record<string, string>;
  descriptions?: Record<string, string>;
  ratePercent: number;
  defaultBenchmarkKey: string;
  benchmarks: AssessmentBenchmarkConfig[];
  fields: AssessmentAssetFieldConfig[];
}

export interface AssessmentCalculationInput {
  profileKey?: string;
  currency: string;
  benchmarkKey?: string;
  values: Record<string, number>;
}

export interface AssessmentCalculationResult {
  profileKey: string;
  currency: string;
  benchmarkKey: string;
  ratePercent: number;
  totalAssets: number;
  totalLiabilities: number;
  netAssessableWealth: number;
  thresholdAmount: number;
  meetsThreshold: boolean;
  payableAmount: number;
}

export interface PaymentMethodDirectoryItem {
  key: string;
  channel: PaymentChannel;
  providerName: string;
  accountTitle: string;
  accountNumber: string;
  accountType?: string;
  taxId?: string;
  routingCode?: string;
  qrImageUrl?: string;
  checkoutUrl?: string;
  supportedCurrencies: string[];
  instructions: Record<string, string>;
}

export interface CollectionMapping {
  enabled: boolean;
  uid: string;
  fields: Record<string, string>;
}

export interface DonationsSettings {
  defaultLocale: string;
  supportedLocales: string[];
  baseCurrency: string;
  supportedCurrencies: string[];
  exchangeRatesToBase: Record<string, number>;
  defaultSuggestedAmounts: Record<string, number[]>;
  categories: DonationCategoryConfig[];
  assessmentProfiles: AssessmentProfileConfig[];
  paymentMethods: PaymentMethodDirectoryItem[];
  webhookSigningSecret?: string;
  enableCertificatesBridge: boolean;
  taxCertificateTemplateSlug: string;
  autoIssueCertificateOnVerify: boolean;
  richTextCustomField?: string;
  secondaryCalendars: string[];
  campaignMapping: CollectionMapping;
  pledgeMapping: CollectionMapping;
}
