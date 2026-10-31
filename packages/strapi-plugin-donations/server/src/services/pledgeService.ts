import type { Core } from '@strapi/strapi';
import {
  PLUGIN_ID,
  computeSecondaryDates,
  convertToBaseCurrency,
  evaluateAssessmentCalculation,
  generateDonationReferenceCode,
  parseGatewayWebhookPayload,
  verifyWebhookSignature,
  type AssessmentCalculationInput,
  type AssessmentCalculationResult,
  type CampaignKind,
  type DonationCampaignItem,
  type DonationPledgeItem,
  type DonationsSettings,
  type PaymentChannel,
  type PledgeStatus,
} from '../../../shared';
import {
  createFieldGetter,
  createFieldMapper,
  numVal,
  persistCreatedRecord,
  persistUpdatedRecord,
  queryRecords,
  resolveDocIdentifiers,
  strOrNull,
  strVal,
} from './campaignNormalizers';
import type campaignServiceFactory from './campaignService';
import type settingsServiceFactory from './settings';

export interface CreatePledgeInput {
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  donorTaxId?: string;
  donorTaxIdType?: string;
  isAnonymous?: boolean;
  amount?: number;
  currency?: string;
  categoryKey?: string;
  campaignSlug?: string;
  campaignKind?: CampaignKind;
  coversRemainingBalance?: boolean;
  paymentChannel?: PaymentChannel;
  paymentProvider?: string;
  transactionReference?: string;
  receiptProofUrl?: string;
  donorNotes?: string;
  locale?: string;
}

interface CertificateServiceBridge {
  issueCertificate?: (params: Record<string, unknown>) => Promise<{
    serialNumber?: string;
    verifyUrl?: string;
  } | null>;
}

function resolveCampaignOverrides(
  input: CreatePledgeInput,
  targetCampaign: DonationCampaignItem | null,
  defaultCurrency: string
): {
  resolvedAmount: number;
  resolvedCampaignKind: CampaignKind;
  resolvedCurrency: string;
} {
  let resolvedAmount = numVal(input.amount, 0);
  let resolvedCampaignKind: CampaignKind = input.campaignKind || 'major_campaign';
  let resolvedCurrency = strVal(input.currency, defaultCurrency).toUpperCase();

  if (!targetCampaign) {
    return { resolvedAmount, resolvedCampaignKind, resolvedCurrency };
  }

  resolvedCampaignKind = targetCampaign.campaignKind;
  if (!input.currency) {
    resolvedCurrency = targetCampaign.currency;
  }
  if (input.coversRemainingBalance && targetCampaign.remainingAmount > 0) {
    resolvedAmount = targetCampaign.remainingAmount;
  }
  return { resolvedAmount, resolvedCampaignKind, resolvedCurrency };
}

function buildCreatePledgePayload(
  input: CreatePledgeInput,
  settings: DonationsSettings,
  resolved: {
    resolvedAmount: number;
    resolvedCampaignKind: CampaignKind;
    resolvedCurrency: string;
    convertedBaseAmount: number;
    referenceCode: string;
  }
): Record<string, unknown> {
  const mapField = createFieldMapper(settings.pledgeMapping);
  const locale = strVal(input.locale, strVal(settings.defaultLocale, 'en'));

  return {
    [mapField('referenceCode')]: resolved.referenceCode,
    [mapField('donorName')]: strVal(input.donorName, 'Anonymous Donor'),
    [mapField('donorEmail')]: input.donorEmail,
    [mapField('donorPhone')]: strOrNull(input.donorPhone),
    [mapField('donorTaxId')]: strOrNull(input.donorTaxId),
    [mapField('donorTaxIdType')]: strOrNull(input.donorTaxIdType),
    [mapField('isAnonymous')]: Boolean(input.isAnonymous),
    [mapField('amount')]: resolved.resolvedAmount,
    [mapField('currency')]: resolved.resolvedCurrency,
    [mapField('convertedBaseAmount')]: resolved.convertedBaseAmount,
    [mapField('categoryKey')]: strVal(input.categoryKey, 'general_fund'),
    [mapField('campaignSlug')]: strOrNull(input.campaignSlug),
    [mapField('campaignKind')]: resolved.resolvedCampaignKind,
    [mapField('coversRemainingBalance')]: Boolean(input.coversRemainingBalance),
    [mapField('paymentChannel')]: strVal(input.paymentChannel, 'bank_transfer'),
    [mapField('paymentProvider')]: strOrNull(input.paymentProvider),
    [mapField('transactionReference')]: strOrNull(input.transactionReference),
    [mapField('receiptProofUrl')]: strOrNull(input.receiptProofUrl),
    [mapField('donorNotes')]: strOrNull(input.donorNotes),
    [mapField('status')]: 'pending',
    locale,
  };
}

async function tryIssueTaxCertificate(
  strapi: Core.Strapi,
  currentPledge: DonationPledgeItem,
  settings: DonationsSettings
): Promise<{ serialNumber: string; verifyUrl: string } | null> {
  try {
    const certPlugin = strapi.plugin('certificates');
    const certService =
      certPlugin?.service<CertificateServiceBridge>('certificate') ||
      certPlugin?.service<CertificateServiceBridge>('certificateService');
    if (typeof certService?.issueCertificate !== 'function') return null;

    const issued = await certService.issueCertificate({
      templateSlug: strVal(
        settings.taxCertificateTemplateSlug,
        'tax-donation-certificate'
      ),
      recipientName: currentPledge.donorName,
      recipientEmail: currentPledge.donorEmail,
      recipientDocumentNumber: strVal(currentPledge.donorTaxId),
      locale: strVal(currentPledge.locale, settings.defaultLocale),
      metadata: {
        referenceCode: currentPledge.referenceCode,
        amount: currentPledge.amount,
        currency: currentPledge.currency,
        categoryKey: currentPledge.categoryKey,
        campaignSlug: currentPledge.campaignSlug,
      },
    });
    if (!issued?.serialNumber) return null;
    return {
      serialNumber: issued.serialNumber,
      verifyUrl: strVal(issued.verifyUrl, `/verify/${issued.serialNumber}`),
    };
  } catch {
    return null;
  }
}

async function maybeIssueCertificateForVerify(
  strapi: Core.Strapi,
  currentPledge: DonationPledgeItem,
  settings: DonationsSettings,
  issueTaxCertificate?: boolean
): Promise<{ serialNumber: string; verifyUrl: string } | null> {
  const shouldIssue = Boolean(
    (issueTaxCertificate ?? settings.autoIssueCertificateOnVerify) &&
      settings.enableCertificatesBridge
  );
  if (!shouldIssue) return null;
  return tryIssueTaxCertificate(strapi, currentPledge, settings);
}

function buildVerifyPledgeUpdateData(
  mapField: (key: string) => string,
  params: {
    nextStatus: PledgeStatus;
    verifiedBy?: string;
    transactionReference?: string;
    certificateSerialNumber: string | null;
    certificateVerifyUrl: string | null;
  }
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    [mapField('status')]: params.nextStatus,
    [mapField('verifiedAt')]: new Date().toISOString(),
    [mapField('verifiedBy')]: strVal(params.verifiedBy, 'system'),
  };
  if (params.transactionReference) {
    updateData[mapField('transactionReference')] = params.transactionReference;
  }
  if (params.certificateSerialNumber) {
    updateData[mapField('certificateSerialNumber')] = params.certificateSerialNumber;
  }
  if (params.certificateVerifyUrl) {
    updateData[mapField('certificateVerifyUrl')] = params.certificateVerifyUrl;
  }
  return updateData;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsSvc = () =>
    strapi.plugin(PLUGIN_ID).service('settings') as ReturnType<
      typeof settingsServiceFactory
    >;
  const getCampaignSvc = () =>
    strapi.plugin(PLUGIN_ID).service('campaign') as ReturnType<
      typeof campaignServiceFactory
    >;

  return {
    getTargetUid(settings: DonationsSettings): string {
      if (settings.pledgeMapping?.enabled && settings.pledgeMapping.uid) {
        return settings.pledgeMapping.uid;
      }
      return `plugin::${PLUGIN_ID}.pledge`;
    },

    normalizePledge(
      raw: Record<string, unknown>,
      settings: DonationsSettings
    ): DonationPledgeItem {
      const get = createFieldGetter(raw, settings.pledgeMapping);
      const locale = strVal(raw.locale, strVal(settings.defaultLocale, 'en'));
      const createdAt = strVal(raw.createdAt, new Date().toISOString());
      const secondaryDates = computeSecondaryDates(
        createdAt,
        settings.secondaryCalendars,
        locale
      );
      const ids = resolveDocIdentifiers(raw);
      const defaultCurr = strVal(settings.baseCurrency, 'COP');

      return {
        id: ids.id,
        documentId: ids.documentId,
        referenceCode: strVal(get('referenceCode')),
        donorName: strVal(get('donorName')),
        donorEmail: strVal(get('donorEmail')),
        donorPhone: strOrNull(get('donorPhone')),
        donorTaxId: strOrNull(get('donorTaxId')),
        donorTaxIdType: strOrNull(get('donorTaxIdType')),
        isAnonymous: Boolean(get('isAnonymous', false)),
        amount: numVal(get('amount'), 0),
        currency: strVal(get('currency'), defaultCurr).toUpperCase(),
        convertedBaseAmount: numVal(get('convertedBaseAmount'), 0),
        categoryKey: strVal(get('categoryKey'), 'general_fund'),
        campaignSlug: strOrNull(get('campaignSlug')),
        campaignKind: strVal(get('campaignKind'), 'major_campaign') as CampaignKind,
        coversRemainingBalance: Boolean(get('coversRemainingBalance', false)),
        paymentChannel: strVal(
          get('paymentChannel'),
          'bank_transfer'
        ) as PaymentChannel,
        paymentProvider: strOrNull(get('paymentProvider')),
        transactionReference: strOrNull(get('transactionReference')),
        receiptProofUrl: strOrNull(get('receiptProofUrl')),
        donorNotes: strOrNull(get('donorNotes')),
        status: strVal(get('status'), 'pending') as PledgeStatus,
        verifiedAt: strOrNull(get('verifiedAt')),
        verifiedBy: strOrNull(get('verifiedBy')),
        certificateSerialNumber: strOrNull(get('certificateSerialNumber')),
        certificateVerifyUrl: strOrNull(get('certificateVerifyUrl')),
        locale,
        createdAt,
        secondaryDates,
      };
    },

    async createPledge(input: CreatePledgeInput): Promise<DonationPledgeItem> {
      const settings = await getSettingsSvc().getSettings();
      const targetCampaign = input.campaignSlug
        ? await getCampaignSvc().findCampaignBySlug(
            input.campaignSlug,
            strVal(input.locale, settings.defaultLocale)
          )
        : null;

      const { resolvedAmount, resolvedCampaignKind, resolvedCurrency } =
        resolveCampaignOverrides(
          input,
          targetCampaign,
          strVal(settings.baseCurrency, 'COP')
        );

      if (!(resolvedAmount > 0)) {
        throw new Error('Contribution amount must be greater than zero.');
      }

      const convertedBaseAmount = convertToBaseCurrency(
        resolvedAmount,
        resolvedCurrency,
        settings.baseCurrency,
        settings.exchangeRatesToBase
      );

      const prefix = resolvedCampaignKind === 'utility_invoice' ? 'INV' : 'DON';
      const referenceCode = generateDonationReferenceCode(prefix);
      const uid = this.getTargetUid(settings);

      const payload = buildCreatePledgePayload(input, settings, {
        resolvedAmount,
        resolvedCampaignKind,
        resolvedCurrency,
        convertedBaseAmount,
        referenceCode,
      });

      const created = await persistCreatedRecord(strapi, uid, payload);
      return this.normalizePledge(created, settings);
    },

    async findPledges(
      filters: { status?: PledgeStatus; campaignSlug?: string } = {}
    ): Promise<DonationPledgeItem[]> {
      const settings = await getSettingsSvc().getSettings();
      const uid = this.getTargetUid(settings);
      const rawList = await queryRecords(strapi, uid, {
        sort: { createdAt: 'desc' },
      });

      let normalized = rawList.map((item) => this.normalizePledge(item, settings));
      if (filters.status) {
        normalized = normalized.filter((p) => p.status === filters.status);
      }
      if (filters.campaignSlug) {
        normalized = normalized.filter(
          (p) => p.campaignSlug === filters.campaignSlug
        );
      }
      return normalized;
    },

    async verifyPledge(params: {
      referenceCode: string;
      decision: 'verified' | 'rejected';
      verifiedBy?: string;
      transactionReference?: string;
      issueTaxCertificate?: boolean;
    }): Promise<DonationPledgeItem | null> {
      const settings = await getSettingsSvc().getSettings();
      const uid = this.getTargetUid(settings);
      const mapField = createFieldMapper(settings.pledgeMapping);
      const refField = mapField('referenceCode');

      const list = await queryRecords(strapi, uid, {
        filters: { [refField]: params.referenceCode },
      });
      const existing = list[0];
      if (!existing) return null;

      const currentPledge = this.normalizePledge(existing, settings);
      const wasAlreadyVerified =
        currentPledge.status === 'verified' ||
        currentPledge.status === 'certificate_issued';

      let nextStatus: PledgeStatus = params.decision;
      let certificateSerialNumber = currentPledge.certificateSerialNumber;
      let certificateVerifyUrl = currentPledge.certificateVerifyUrl;

      if (params.decision === 'verified' && !wasAlreadyVerified) {
        if (currentPledge.campaignSlug) {
          await getCampaignSvc().recordVerifiedContribution({
            campaignSlug: currentPledge.campaignSlug,
            contributionAmount: currentPledge.amount,
          });
        }

        const cert = await maybeIssueCertificateForVerify(
          strapi,
          currentPledge,
          settings,
          params.issueTaxCertificate
        );
        if (cert) {
          certificateSerialNumber = cert.serialNumber;
          certificateVerifyUrl = cert.verifyUrl;
          nextStatus = 'certificate_issued';
        }
      }

      const updateData = buildVerifyPledgeUpdateData(mapField, {
        nextStatus,
        verifiedBy: params.verifiedBy,
        transactionReference: params.transactionReference,
        certificateSerialNumber,
        certificateVerifyUrl,
      });

      const updated = await persistUpdatedRecord(strapi, uid, existing, updateData);
      return this.normalizePledge(updated, settings);
    },

    async handleGatewayWebhook(params: {
      rawBody: string;
      signatureHeader?: string;
      payload: Record<string, unknown>;
    }): Promise<{ handled: boolean; pledge: DonationPledgeItem | null }> {
      const settings = await getSettingsSvc().getSettings();

      if (settings.webhookSigningSecret) {
        const valid = verifyWebhookSignature(
          params.rawBody,
          params.signatureHeader,
          settings.webhookSigningSecret
        );
        if (!valid) {
          throw new Error('Invalid webhook HMAC-SHA256 signature.');
        }
      }

      const event = parseGatewayWebhookPayload(params.payload);
      if (!event || event.status === 'pending') {
        return { handled: false, pledge: null };
      }

      const updatedPledge = await this.verifyPledge({
        referenceCode: event.referenceCode,
        decision: event.status,
        verifiedBy: `webhook:${event.provider}`,
        transactionReference: event.transactionReference,
      });

      return {
        handled: Boolean(updatedPledge),
        pledge: updatedPledge,
      };
    },

    async calculateAssessment(
      input: AssessmentCalculationInput
    ): Promise<AssessmentCalculationResult> {
      const settings = await getSettingsSvc().getSettings();
      const profile =
        settings.assessmentProfiles.find((p) => p.key === input.profileKey) ||
        settings.assessmentProfiles[0];

      if (!profile) {
        throw new Error('No assessment calculator profile is configured.');
      }

      return evaluateAssessmentCalculation(profile, input);
    },
  };
};
