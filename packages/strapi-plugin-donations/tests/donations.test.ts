import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  DEFAULT_SETTINGS,
  computeCampaignProgress,
  convertToBaseCurrency,
  evaluateAssessmentCalculation,
  generateDonationReferenceCode,
  parseGatewayWebhookPayload,
  verifyWebhookSignature,
} from '../shared';
import settingsServiceFactory from '../server/src/services/settings';
import campaignServiceFactory from '../server/src/services/campaignService';
import pledgeServiceFactory from '../server/src/services/pledgeService';

describe('@vicacha-devs/strapi-plugin-donations', () => {
  it('computes campaign and utility invoice remaining balance and status transitions accurately', () => {
    const openInvoice = computeCampaignProgress({
      goalAmount: 1850000,
      raisedAmount: 0,
      campaignKind: 'utility_invoice',
      dueDate: '2099-12-31',
    });
    assert.equal(openInvoice.remainingAmount, 1850000);
    assert.equal(openInvoice.progressPercent, 0);
    assert.equal(openInvoice.invoiceStatus, 'open');

    const partialInvoice = computeCampaignProgress({
      goalAmount: 1850000,
      raisedAmount: 925000,
      campaignKind: 'utility_invoice',
      dueDate: '2099-12-31',
    });
    assert.equal(partialInvoice.remainingAmount, 925000);
    assert.equal(partialInvoice.progressPercent, 50);
    assert.equal(partialInvoice.invoiceStatus, 'partially_funded');

    const paidInvoice = computeCampaignProgress({
      goalAmount: 1850000,
      raisedAmount: 1850000,
      campaignKind: 'utility_invoice',
      dueDate: '2020-01-01',
    });
    assert.equal(paidInvoice.remainingAmount, 0);
    assert.equal(paidInvoice.progressPercent, 100);
    assert.equal(paidInvoice.invoiceStatus, 'paid');

    const overdueInvoice = computeCampaignProgress({
      goalAmount: 650000,
      raisedAmount: 150000,
      campaignKind: 'utility_invoice',
      dueDate: '2020-01-01',
      referenceDate: new Date('2026-02-15T00:00:00Z'),
    });
    assert.equal(overdueInvoice.remainingAmount, 500000);
    assert.equal(overdueInvoice.invoiceStatus, 'overdue');
  });

  it('evaluates rule-based net asset assessment calculator against commodity benchmarks', () => {
    const profile = DEFAULT_SETTINGS.assessmentProfiles[0];

    // Gold 85g in COP = 85 * 365,000 = 31,025,000 COP
    const aboveThreshold = evaluateAssessmentCalculation(profile, {
      currency: 'COP',
      benchmarkKey: 'gold_85g',
      values: {
        cash_and_bank: 45000000,
        precious_metals: 5000000,
        investments_and_inventory: 10000000,
        short_term_liabilities: 10000000,
      },
    });
    assert.equal(aboveThreshold.netAssessableWealth, 50000000);
    assert.equal(aboveThreshold.thresholdAmount, 31025000);
    assert.equal(aboveThreshold.meetsThreshold, true);
    assert.equal(aboveThreshold.payableAmount, 1250000); // 2.5% of 50,000,000

    // Below threshold
    const belowThreshold = evaluateAssessmentCalculation(profile, {
      currency: 'COP',
      benchmarkKey: 'gold_85g',
      values: {
        cash_and_bank: 12000000,
        short_term_liabilities: 2000000,
      },
    });
    assert.equal(belowThreshold.netAssessableWealth, 10000000);
    assert.equal(belowThreshold.meetsThreshold, false);
    assert.equal(belowThreshold.payableAmount, 0);
  });

  it('converts multi-currency donations to base currency and generates reference codes', () => {
    const converted = convertToBaseCurrency(100, 'USD', 'COP', { COP: 1, USD: 4150 });
    assert.equal(converted, 415000);

    const refInv = generateDonationReferenceCode('INV');
    assert.match(refInv, /^INV-\d{8}-[A-Z0-9]{5}$/);
  });

  it('verifies HMAC-SHA256 webhook signatures and normalizes Wompi & Stripe payloads', () => {
    const secret = 'whsec_test_secret_key';
    const rawPayload = JSON.stringify({
      data: {
        transaction: {
          id: 'tx_wompi_9981',
          reference: 'INV-20260210-ABC12',
          status: 'APPROVED',
          amount_in_cents: 42000000,
          currency: 'COP',
        },
      },
    });

    const sig = createHmac('sha256', secret).update(rawPayload, 'utf8').digest('hex');
    assert.equal(verifyWebhookSignature(rawPayload, `sha256=${sig}`, secret), true);
    assert.equal(verifyWebhookSignature(rawPayload, 'sha256=deadbeef', secret), false);

    const parsed = parseGatewayWebhookPayload(JSON.parse(rawPayload));
    assert.ok(parsed);
    assert.equal(parsed.provider, 'wompi');
    assert.equal(parsed.referenceCode, 'INV-20260210-ABC12');
    assert.equal(parsed.status, 'verified');
    assert.equal(parsed.amount, 420000);
  });

  it('supports paying remaining utility invoice balance, auto-marking invoice paid, and issuing tax certificate', async () => {
    const campaignsStore: any[] = [
      {
        id: 1,
        documentId: 'doc-inv-electricity',
        title: 'Electricity Bill - February 2026',
        slug: 'electricity-bill-feb-2026',
        description: 'Monthly electricity utility invoice',
        campaignKind: 'utility_invoice',
        categoryKey: 'utility_bills',
        goalAmount: 1200000,
        raisedAmount: 850000,
        currency: 'COP',
        donorCount: 6,
        invoiceStatus: 'partially_funded',
        dueDate: '2099-03-05',
        billingPeriod: 'February 2026',
        locale: 'en',
      },
    ];
    const pledgesStore: any[] = [];
    let storedSettings: any = null;

    const fakeStrapi: any = {
      config: {
        get: () => ({}),
      },
      store: () => ({
        get: async () => storedSettings,
        set: async ({ value }: any) => {
          storedSettings = value;
        },
      }),
      documents: (uid: string) => ({
        findMany: async ({ filters }: any = {}) => {
          const list = uid.includes('campaign') ? campaignsStore : pledgesStore;
          if (!filters) return list;
          return list.filter((item) =>
            Object.entries(filters).every(([k, v]) => item[k] === v)
          );
        },
        create: async ({ data }: any) => {
          const item = { id: pledgesStore.length + 1, documentId: `pledge-${pledgesStore.length + 1}`, ...data };
          pledgesStore.push(item);
          return item;
        },
        update: async ({ documentId, data }: any) => {
          const list = uid.includes('campaign') ? campaignsStore : pledgesStore;
          const idx = list.findIndex((i) => i.documentId === documentId);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...data };
            return list[idx];
          }
          return null;
        },
      }),
      plugin: (name: string) => {
        if (name === 'certificates') {
          return {
            service: () => ({
              issueCertificate: async ({ recipientName, metadata }: any) => ({
                serialNumber: `CERT-TAX-${metadata.referenceCode}`,
                verifyUrl: `/verify/CERT-TAX-${metadata.referenceCode}`,
                recipientName,
              }),
            }),
          };
        }
        return {
          service: (svc: string) => servicesMap[svc],
        };
      },
    };

    const servicesMap: Record<string, any> = {
      settings: settingsServiceFactory({ strapi: fakeStrapi }),
      campaign: campaignServiceFactory({ strapi: fakeStrapi }),
      pledge: pledgeServiceFactory({ strapi: fakeStrapi }),
    };

    // Donor clicks "Cover Remaining Balance" on the Electricity Bill (remaining = 350,000 COP)
    const createdPledge = await servicesMap.pledge.createPledge({
      donorName: 'Amina Rodriguez',
      donorEmail: 'amina@example.org',
      donorTaxId: '1020304050',
      campaignSlug: 'electricity-bill-feb-2026',
      coversRemainingBalance: true,
      paymentChannel: 'digital_wallet',
      paymentProvider: 'Nequi',
    });

    assert.equal(createdPledge.amount, 350000);
    assert.equal(createdPledge.coversRemainingBalance, true);
    assert.equal(createdPledge.campaignKind, 'utility_invoice');
    assert.equal(createdPledge.status, 'pending');

    // Admin or webhook verifies the pledge -> invoice becomes 100% funded ('paid') & tax certificate is issued
    const verifiedPledge = await servicesMap.pledge.verifyPledge({
      referenceCode: createdPledge.referenceCode,
      decision: 'verified',
      verifiedBy: 'treasurer@example.org',
    });

    assert.ok(verifiedPledge);
    assert.equal(verifiedPledge.status, 'certificate_issued');
    assert.equal(
      verifiedPledge.certificateSerialNumber,
      `CERT-TAX-${createdPledge.referenceCode}`
    );

    const updatedInvoice = await servicesMap.campaign.findCampaignBySlug(
      'electricity-bill-feb-2026',
      'en'
    );
    assert.ok(updatedInvoice);
    assert.equal(updatedInvoice.raisedAmount, 1200000);
    assert.equal(updatedInvoice.remainingAmount, 0);
    assert.equal(updatedInvoice.progressPercent, 100);
    assert.equal(updatedInvoice.invoiceStatus, 'paid');
    assert.equal(updatedInvoice.donorCount, 7);
  });
});
