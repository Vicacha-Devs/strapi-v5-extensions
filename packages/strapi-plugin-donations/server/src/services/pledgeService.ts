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
  type DonationPledgeItem,
  type DonationsSettings,
  type PaymentChannel,
  type PledgeStatus,
} from '../../../shared';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getTargetUid(settings: DonationsSettings): string {
    if (settings.pledgeMapping?.enabled && settings.pledgeMapping.uid) {
      return settings.pledgeMapping.uid;
    }
    return `plugin::${PLUGIN_ID}.pledge`;
  },

  normalizePledge(raw: any, settings: DonationsSettings): DonationPledgeItem {
    const f = settings.pledgeMapping?.enabled ? settings.pledgeMapping.fields : {};
    const get = (key: string, fallback?: any) => {
      const mappedKey = f[key] || key;
      return raw?.[mappedKey] !== undefined ? raw[mappedKey] : raw?.[key] ?? fallback;
    };

    const locale = String(raw?.locale || settings.defaultLocale || 'en');
    const createdAt = String(raw?.createdAt || new Date().toISOString());
    const secondaryDates = computeSecondaryDates(createdAt, settings.secondaryCalendars, locale);

    return {
      id: raw?.id ?? raw?.documentId ?? '',
      documentId: String(raw?.documentId ?? raw?.id ?? ''),
      referenceCode: String(get('referenceCode', '')),
      donorName: String(get('donorName', '')),
      donorEmail: String(get('donorEmail', '')),
      donorPhone: get('donorPhone', null),
      donorTaxId: get('donorTaxId', null),
      donorTaxIdType: get('donorTaxIdType', null),
      isAnonymous: Boolean(get('isAnonymous', false)),
      amount: Number(get('amount', 0)) || 0,
      currency: String(get('currency', settings.baseCurrency || 'COP')).toUpperCase(),
      convertedBaseAmount: Number(get('convertedBaseAmount', 0)) || 0,
      categoryKey: String(get('categoryKey', 'general_fund')),
      campaignSlug: get('campaignSlug', null),
      campaignKind: (get('campaignKind', 'major_campaign') as CampaignKind) || 'major_campaign',
      coversRemainingBalance: Boolean(get('coversRemainingBalance', false)),
      paymentChannel: (get('paymentChannel', 'bank_transfer') as PaymentChannel) || 'bank_transfer',
      paymentProvider: get('paymentProvider', null),
      transactionReference: get('transactionReference', null),
      receiptProofUrl: get('receiptProofUrl', null),
      donorNotes: get('donorNotes', null),
      status: (get('status', 'pending') as PledgeStatus) || 'pending',
      verifiedAt: get('verifiedAt', null),
      verifiedBy: get('verifiedBy', null),
      certificateSerialNumber: get('certificateSerialNumber', null),
      certificateVerifyUrl: get('certificateVerifyUrl', null),
      locale,
      createdAt,
      secondaryDates,
    };
  },

  async createPledge(input: {
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
  }): Promise<DonationPledgeItem> {
    const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
    const campaignService = strapi.plugin(PLUGIN_ID).service('campaign') as any;
    const settings: DonationsSettings = await settingsService.getSettings();

    let resolvedAmount = Number(input.amount || 0);
    let resolvedCampaignKind: CampaignKind = input.campaignKind || 'major_campaign';
    let resolvedCurrency = String(input.currency || settings.baseCurrency || 'COP').toUpperCase();

    if (input.campaignSlug) {
      const targetCampaign = await campaignService.findCampaignBySlug(
        input.campaignSlug,
        input.locale || settings.defaultLocale
      );
      if (targetCampaign) {
        resolvedCampaignKind = targetCampaign.campaignKind;
        if (!input.currency) {
          resolvedCurrency = targetCampaign.currency;
        }
        if (input.coversRemainingBalance && targetCampaign.remainingAmount > 0) {
          resolvedAmount = targetCampaign.remainingAmount;
        }
      }
    }

    if (!(resolvedAmount > 0)) {
      throw new Error('Contribution amount must be greater than zero.');
    }

    const convertedBaseAmount = convertToBaseCurrency(
      resolvedAmount,
      resolvedCurrency,
      settings.baseCurrency,
      settings.exchangeRatesToBase
    );

    const referenceCode = generateDonationReferenceCode(
      resolvedCampaignKind === 'utility_invoice' ? 'INV' : 'DON'
    );

    const uid = this.getTargetUid(settings);
    const f = settings.pledgeMapping?.enabled ? settings.pledgeMapping.fields : {};
    const mapField = (key: string) => f[key] || key;

    const payload: Record<string, any> = {
      [mapField('referenceCode')]: referenceCode,
      [mapField('donorName')]: input.donorName || 'Anonymous Donor',
      [mapField('donorEmail')]: input.donorEmail,
      [mapField('donorPhone')]: input.donorPhone || null,
      [mapField('donorTaxId')]: input.donorTaxId || null,
      [mapField('donorTaxIdType')]: input.donorTaxIdType || null,
      [mapField('isAnonymous')]: Boolean(input.isAnonymous),
      [mapField('amount')]: resolvedAmount,
      [mapField('currency')]: resolvedCurrency,
      [mapField('convertedBaseAmount')]: convertedBaseAmount,
      [mapField('categoryKey')]: input.categoryKey || 'general_fund',
      [mapField('campaignSlug')]: input.campaignSlug || null,
      [mapField('campaignKind')]: resolvedCampaignKind,
      [mapField('coversRemainingBalance')]: Boolean(input.coversRemainingBalance),
      [mapField('paymentChannel')]: input.paymentChannel || 'bank_transfer',
      [mapField('paymentProvider')]: input.paymentProvider || null,
      [mapField('transactionReference')]: input.transactionReference || null,
      [mapField('receiptProofUrl')]: input.receiptProofUrl || null,
      [mapField('donorNotes')]: input.donorNotes || null,
      [mapField('status')]: 'pending',
      locale: input.locale || settings.defaultLocale || 'en',
    };

    let created: any;
    try {
      created = await (strapi as any).documents(uid).create({ data: payload });
    } catch {
      created = await (strapi as any).entityService.create(uid, { data: payload });
    }

    return this.normalizePledge(created || payload, settings);
  },

  async findPledges(filters: { status?: PledgeStatus; campaignSlug?: string } = {}): Promise<DonationPledgeItem[]> {
    const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
    const settings: DonationsSettings = await settingsService.getSettings();
    const uid = this.getTargetUid(settings);

    let rawList: any[] = [];
    try {
      rawList = await (strapi as any).documents(uid).findMany({
        sort: { createdAt: 'desc' },
      });
    } catch {
      const res = await (strapi as any).entityService.findMany(uid, {
        sort: { createdAt: 'desc' },
      });
      rawList = Array.isArray(res) ? res : res ? [res] : [];
    }

    let normalized = rawList.map((item) => this.normalizePledge(item, settings));
    if (filters.status) {
      normalized = normalized.filter((p) => p.status === filters.status);
    }
    if (filters.campaignSlug) {
      normalized = normalized.filter((p) => p.campaignSlug === filters.campaignSlug);
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
    const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
    const campaignService = strapi.plugin(PLUGIN_ID).service('campaign') as any;
    const settings: DonationsSettings = await settingsService.getSettings();
    const uid = this.getTargetUid(settings);
    const f = settings.pledgeMapping?.enabled ? settings.pledgeMapping.fields : {};
    const mapField = (key: string) => f[key] || key;

    const refField = mapField('referenceCode');
    let existing: any = null;
    try {
      const list = await (strapi as any).documents(uid).findMany({
        filters: { [refField]: params.referenceCode },
      });
      existing = Array.isArray(list) ? list[0] : null;
    } catch {
      const list = await (strapi as any).entityService.findMany(uid, {
        filters: { [refField]: params.referenceCode },
      });
      existing = Array.isArray(list) ? list[0] : null;
    }

    if (!existing) return null;

    const currentPledge = this.normalizePledge(existing, settings);
    const wasAlreadyVerified =
      currentPledge.status === 'verified' || currentPledge.status === 'certificate_issued';

    let nextStatus: PledgeStatus = params.decision;
    let certificateSerialNumber = currentPledge.certificateSerialNumber;
    let certificateVerifyUrl = currentPledge.certificateVerifyUrl;

    if (params.decision === 'verified' && !wasAlreadyVerified) {
      if (currentPledge.campaignSlug) {
        await campaignService.recordVerifiedContribution({
          campaignSlug: currentPledge.campaignSlug,
          contributionAmount: currentPledge.amount,
        });
      }

      const shouldIssueCert =
        (params.issueTaxCertificate ?? settings.autoIssueCertificateOnVerify) &&
        settings.enableCertificatesBridge;

      if (shouldIssueCert) {
        try {
          const certPlugin = strapi.plugin('certificates') as any;
          const certService = certPlugin?.service('certificate') || certPlugin?.service('certificateService');
          if (certService && typeof certService.issueCertificate === 'function') {
            const issued = await certService.issueCertificate({
              templateSlug: settings.taxCertificateTemplateSlug || 'tax-donation-certificate',
              recipientName: currentPledge.donorName,
              recipientEmail: currentPledge.donorEmail,
              recipientDocumentNumber: currentPledge.donorTaxId || '',
              locale: currentPledge.locale || settings.defaultLocale,
              metadata: {
                referenceCode: currentPledge.referenceCode,
                amount: currentPledge.amount,
                currency: currentPledge.currency,
                categoryKey: currentPledge.categoryKey,
                campaignSlug: currentPledge.campaignSlug,
              },
            });
            if (issued?.serialNumber) {
              certificateSerialNumber = issued.serialNumber;
              certificateVerifyUrl = issued.verifyUrl || `/verify/${issued.serialNumber}`;
              nextStatus = 'certificate_issued';
            }
          }
        } catch {
          // Certificate plugin is optional; keep status as 'verified'
        }
      }
    }

    const updateData: Record<string, any> = {
      [mapField('status')]: nextStatus,
      [mapField('verifiedAt')]: new Date().toISOString(),
      [mapField('verifiedBy')]: params.verifiedBy || 'system',
    };
    if (params.transactionReference) {
      updateData[mapField('transactionReference')] = params.transactionReference;
    }
    if (certificateSerialNumber) {
      updateData[mapField('certificateSerialNumber')] = certificateSerialNumber;
    }
    if (certificateVerifyUrl) {
      updateData[mapField('certificateVerifyUrl')] = certificateVerifyUrl;
    }

    let updated: any;
    try {
      if (existing.documentId && (strapi as any).documents) {
        updated = await (strapi as any).documents(uid).update({
          documentId: existing.documentId,
          data: updateData,
        });
      } else {
        updated = await (strapi as any).entityService.update(uid, existing.id, {
          data: updateData,
        });
      }
    } catch {
      updated = { ...existing, ...updateData };
    }

    return this.normalizePledge(updated || { ...existing, ...updateData }, settings);
  },

  async handleGatewayWebhook(params: {
    rawBody: string;
    signatureHeader?: string;
    payload: Record<string, any>;
  }): Promise<{ handled: boolean; pledge: DonationPledgeItem | null }> {
    const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
    const settings: DonationsSettings = await settingsService.getSettings();

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

  async calculateAssessment(input: AssessmentCalculationInput): Promise<AssessmentCalculationResult> {
    const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
    const settings: DonationsSettings = await settingsService.getSettings();
    const profile =
      settings.assessmentProfiles.find((p) => p.key === input.profileKey) ||
      settings.assessmentProfiles[0];

    if (!profile) {
      throw new Error('No assessment calculator profile is configured.');
    }

    return evaluateAssessmentCalculation(profile, input);
  },
});
