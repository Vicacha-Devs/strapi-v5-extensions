import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";

import bootstrapPlugin from "../server/src/bootstrap";
import registerPlugin from "../server/src/register";
import campaignServiceFactory from "../server/src/services/campaignService";
import pledgeServiceFactory from "../server/src/services/pledgeService";
import settingsServiceFactory from "../server/src/services/settings";
import {
  DEFAULT_SETTINGS,
  ISO_3166_COUNTRIES,
  ISO_4217_CURRENCIES,
  computeCampaignProgress,
  convertToBaseCurrency,
  evaluateAssessmentCalculation,
  extractRichTextPlainText,
  formatCountryOptionLabel,
  formatCurrencyOptionLabel,
  generateDonationReferenceCode,
  getOrderedCurrencyOptions,
  normalizeRichTextValue,
  parseGatewayWebhookPayload,
  verifyWebhookSignature,
} from "../shared";

describe("@vicacha-devs/strapi-plugin-donations", () => {
  it("computes campaign and utility invoice remaining balance and status transitions accurately", () => {
    const openInvoice = computeCampaignProgress({
      goalAmount: 1850000,
      raisedAmount: 0,
      campaignKind: "utility_invoice",
      dueDate: "2099-12-31",
    });
    assert.equal(openInvoice.remainingAmount, 1850000);
    assert.equal(openInvoice.progressPercent, 0);
    assert.equal(openInvoice.invoiceStatus, "open");

    const partialInvoice = computeCampaignProgress({
      goalAmount: 1850000,
      raisedAmount: 925000,
      campaignKind: "utility_invoice",
      dueDate: "2099-12-31",
    });
    assert.equal(partialInvoice.remainingAmount, 925000);
    assert.equal(partialInvoice.progressPercent, 50);
    assert.equal(partialInvoice.invoiceStatus, "partially_funded");

    const paidInvoice = computeCampaignProgress({
      goalAmount: 1850000,
      raisedAmount: 1850000,
      campaignKind: "utility_invoice",
      dueDate: "2020-01-01",
    });
    assert.equal(paidInvoice.remainingAmount, 0);
    assert.equal(paidInvoice.progressPercent, 100);
    assert.equal(paidInvoice.invoiceStatus, "paid");

    const overdueInvoice = computeCampaignProgress({
      goalAmount: 650000,
      raisedAmount: 150000,
      campaignKind: "utility_invoice",
      dueDate: "2020-01-01",
      referenceDate: new Date("2026-02-15T00:00:00Z"),
    });
    assert.equal(overdueInvoice.remainingAmount, 500000);
    assert.equal(overdueInvoice.invoiceStatus, "overdue");
  });

  it("evaluates rule-based net asset assessment calculator against commodity benchmarks", () => {
    const profile = DEFAULT_SETTINGS.assessmentProfiles[0];

    // Gold 85g in COP = 85 * 365,000 = 31,025,000 COP
    const aboveThreshold = evaluateAssessmentCalculation(profile, {
      currency: "COP",
      benchmarkKey: "gold_85g",
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
      currency: "COP",
      benchmarkKey: "gold_85g",
      values: {
        cash_and_bank: 12000000,
        short_term_liabilities: 2000000,
      },
    });
    assert.equal(belowThreshold.netAssessableWealth, 10000000);
    assert.equal(belowThreshold.meetsThreshold, false);
    assert.equal(belowThreshold.payableAmount, 0);
  });

  it("converts multi-currency donations to base currency and generates reference codes", () => {
    const converted = convertToBaseCurrency(100, "USD", "COP", {
      COP: 1,
      USD: 4150,
    });
    assert.equal(converted, 415000);

    const refInv = generateDonationReferenceCode("INV");
    assert.match(refInv, /^INV-\d{8}-[A-Z0-9]{5}$/);
  });

  it("verifies HMAC-SHA256 webhook signatures and normalizes Wompi & Stripe payloads", () => {
    const secret = "whsec_test_secret_key";
    const rawPayload = JSON.stringify({
      data: {
        transaction: {
          id: "tx_wompi_9981",
          reference: "INV-20260210-ABC12",
          status: "APPROVED",
          amount_in_cents: 42000000,
          currency: "COP",
        },
      },
    });

    const sig = createHmac("sha256", secret)
      .update(rawPayload, "utf8")
      .digest("hex");
    assert.equal(
      verifyWebhookSignature(rawPayload, `sha256=${sig}`, secret),
      true
    );
    assert.equal(
      verifyWebhookSignature(rawPayload, "sha256=deadbeef", secret),
      false
    );

    const parsed = parseGatewayWebhookPayload(JSON.parse(rawPayload));
    assert.ok(parsed);
    assert.equal(parsed.provider, "wompi");
    assert.equal(parsed.referenceCode, "INV-20260210-ABC12");
    assert.equal(parsed.status, "verified");
    assert.equal(parsed.amount, 420000);
  });

  it("supports paying remaining utility invoice balance, auto-marking invoice paid, and issuing tax certificate", async () => {
    const campaignsStore: any[] = [
      {
        id: 1,
        documentId: "doc-inv-electricity",
        title: "Electricity Bill - February 2026",
        slug: "electricity-bill-feb-2026",
        description: "Monthly electricity utility invoice",
        campaignKind: "utility_invoice",
        categoryKey: "utility_bills",
        goalAmount: 1200000,
        raisedAmount: 850000,
        currency: "COP",
        donorCount: 6,
        invoiceStatus: "partially_funded",
        dueDate: "2099-03-05",
        billingPeriod: "February 2026",
        locale: "en",
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
          const list = uid.includes("campaign") ? campaignsStore : pledgesStore;
          if (!filters) return list;
          return list.filter((item) =>
            Object.entries(filters).every(([k, v]) => item[k] === v)
          );
        },
        create: async ({ data }: any) => {
          const item = {
            id: pledgesStore.length + 1,
            documentId: `pledge-${pledgesStore.length + 1}`,
            ...data,
          };
          pledgesStore.push(item);
          return item;
        },
        update: async ({ documentId, data }: any) => {
          const list = uid.includes("campaign") ? campaignsStore : pledgesStore;
          const idx = list.findIndex((i) => i.documentId === documentId);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...data };
            return list[idx];
          }
          return null;
        },
      }),
      plugin: (name: string) => {
        if (name === "certificates") {
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
      donorName: "Amina Rodriguez",
      donorEmail: "amina@example.org",
      donorTaxId: "1020304050",
      campaignSlug: "electricity-bill-feb-2026",
      coversRemainingBalance: true,
      paymentChannel: "digital_wallet",
      paymentProvider: "Nequi",
    });

    assert.equal(createdPledge.amount, 350000);
    assert.equal(createdPledge.coversRemainingBalance, true);
    assert.equal(createdPledge.campaignKind, "utility_invoice");
    assert.equal(createdPledge.status, "pending");

    // Admin or webhook verifies the pledge -> invoice becomes 100% funded ('paid') & tax certificate is issued
    const verifiedPledge = await servicesMap.pledge.verifyPledge({
      referenceCode: createdPledge.referenceCode,
      decision: "verified",
      verifiedBy: "treasurer@example.org",
    });

    assert.ok(verifiedPledge);
    assert.equal(verifiedPledge.status, "certificate_issued");
    assert.equal(
      verifiedPledge.certificateSerialNumber,
      `CERT-TAX-${createdPledge.referenceCode}`
    );

    const updatedInvoice = await servicesMap.campaign.findCampaignBySlug(
      "electricity-bill-feb-2026",
      "en"
    );
    assert.ok(updatedInvoice);
    assert.equal(updatedInvoice.raisedAmount, 1200000);
    assert.equal(updatedInvoice.remainingAmount, 0);
    assert.equal(updatedInvoice.progressPercent, 100);
    assert.equal(updatedInvoice.invoiceStatus, "paid");
    assert.equal(updatedInvoice.donorCount, 7);
  });

  it("creates campaigns, manages rich text body (Markdown, HTML, Tiptap JSON), and attaches impact evidences (paid bills, computer photos, Kurban/Ramadan gifts)", async () => {
    const campaignsStore: any[] = [];
    let storedSettings: any = null;

    const fakeStrapi: any = {
      config: { get: () => ({}) },
      store: () => ({
        get: async () => storedSettings,
        set: async ({ value }: any) => {
          storedSettings = value;
        },
      }),
      documents: () => ({
        findMany: async ({ filters }: any = {}) => {
          if (!filters) return campaignsStore;
          return campaignsStore.filter((item) =>
            Object.entries(filters).every(([k, v]) => item[k] === v)
          );
        },
        create: async ({ data }: any) => {
          const item = {
            id: campaignsStore.length + 1,
            documentId: `camp-doc-${campaignsStore.length + 1}`,
            ...data,
          };
          campaignsStore.push(item);
          return item;
        },
        update: async ({ documentId, data }: any) => {
          const idx = campaignsStore.findIndex(
            (i) => i.documentId === documentId
          );
          if (idx >= 0) {
            campaignsStore[idx] = { ...campaignsStore[idx], ...data };
            return campaignsStore[idx];
          }
          return null;
        },
      }),
      plugin: () => ({
        service: (svc: string) => servicesMap[svc],
      }),
    };

    const servicesMap: Record<string, any> = {
      settings: settingsServiceFactory({ strapi: fakeStrapi }),
      campaign: campaignServiceFactory({ strapi: fakeStrapi }),
    };

    // 1. Verify Tiptap ProseMirror JSON, HTML, and Markdown rich text compatibility
    const tiptapDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "10 classroom computers donated and installed.",
            },
          ],
        },
      ],
    };
    assert.equal(
      normalizeRichTextValue(tiptapDoc),
      "10 classroom computers donated and installed."
    );
    assert.equal(
      extractRichTextPlainText(
        "<p><strong>Paid utility bill</strong> receipt attached.</p>"
      ),
      "Paid utility bill receipt attached."
    );

    // 2. Open a new Micro-Need Campaign for Computers & Seasonal Gifts
    const created = await servicesMap.campaign.createCampaign({
      title: "Computers & Ramadan/Kurban Solidarity Drive",
      campaignKind: "micro_need",
      categoryKey: "general_fund",
      goalAmount: 15000000,
      raisedAmount: 9000000,
      currency: "COP",
      description:
        "Equipping study labs with computers and delivering seasonal gift packages.",
      body: "## Campaign Story\n\nSupporting student education and seasonal family gifts.",
    });

    assert.equal(created.slug, "computers-ramadan-kurban-solidarity-drive");
    assert.equal(created.campaignKind, "micro_need");
    assert.equal(created.progressPercent, 60);
    assert.equal(created.evidenceCount, 0);

    // 3. Attach photo evidence of donated computers
    const withComputers = await servicesMap.campaign.addCampaignEvidence(
      created.documentId,
      {
        id: "ev-computers-1",
        title: "10 Donated Computers Installed in Study Lab",
        evidenceType: "photo_gallery",
        date: "2026-03-10",
        amountSpent: 8500000,
        mediaUrls: [
          "https://example.org/uploads/donated-computers-1.jpg",
          "https://example.org/uploads/donated-computers-2.jpg",
        ],
        body: "Delivered 10 desktop workstations for community students.",
        appendToCampaignBody: true,
      }
    );

    assert.ok(withComputers);
    assert.equal(withComputers.evidenceCount, 1);
    assert.equal(withComputers.accountedAmount, 8500000);
    assert.equal(withComputers.evidences[0].mediaUrls.length, 2);
    assert.match(
      withComputers.body,
      /10 Donated Computers Installed in Study Lab/
    );

    // 4. Attach Kurban & Ramadan gift distribution report + Paid service bill receipt
    const withGifts = await servicesMap.campaign.addCampaignEvidence(
      created.documentId,
      {
        id: "ev-kurban-ramadan-2",
        title: "Kurban & Ramadan Gift Baskets Distribution + Paid Service Bill",
        evidenceType: "delivery_report",
        date: "2026-03-20",
        amountSpent: 6500000,
        documentUrl:
          "https://example.org/uploads/paid-bill-and-distribution-voucher.pdf",
        mediaUrls: ["https://example.org/uploads/kurban-ramadan-gifts.jpg"],
        body: "Distributed 120 Kurban and Ramadan food gift packages and settled logistics bill.",
        markCampaignPaid: true,
      }
    );

    assert.ok(withGifts);
    assert.equal(withGifts.evidenceCount, 2);
    assert.equal(withGifts.accountedAmount, 15000000);
    assert.equal(withGifts.invoiceStatus, "paid");
    assert.equal(withGifts.progressPercent, 100);

    // 5. Remove one evidence
    const afterRemove = await servicesMap.campaign.removeCampaignEvidence(
      created.documentId,
      "ev-computers-1"
    );
    assert.ok(afterRemove);
    assert.equal(afterRemove.evidenceCount, 1);
    assert.equal(afterRemove.evidences[0].id, "ev-kurban-ramadan-2");
  });

  it("registers ISO 4217 currency and ISO 3166-1 country custom fields and orders configured currencies first", () => {
    const registeredFields: Array<{
      name: string;
      plugin: string;
      type: string;
    }> = [];
    registerPlugin({
      strapi: {
        customFields: {
          register: (field: { name: string; plugin: string; type: string }) => {
            registeredFields.push(field);
          },
        },
        config: { get: () => ({}) },
        log: { debug: () => {} },
      } as any,
    });

    assert.equal(registeredFields.length, 2);
    assert.deepEqual(
      registeredFields.map((f) => `${f.plugin}.${f.name}:${f.type}`),
      ["donations.currency:string", "donations.country:string"]
    );

    assert.ok(
      ISO_4217_CURRENCIES.some((c) => c.code === "COP" && c.flag === "🇨🇴")
    );
    assert.ok(
      ISO_3166_COUNTRIES.some(
        (c) => c.code === "CO" && c.defaultCurrency === "COP"
      )
    );
    assert.match(formatCurrencyOptionLabel("COP", "es"), /COP/);
    assert.match(formatCountryOptionLabel("CO", "es"), /CO/);

    const ordered = getOrderedCurrencyOptions(["TRY", "COP"], "en", "SAR");
    assert.equal(ordered[0].code, "TRY");
    assert.equal(ordered[0].isConfigured, true);
    assert.equal(ordered[1].code, "COP");
    assert.equal(ordered[1].isConfigured, true);
    assert.equal(ordered[2].code, "SAR");
  });

  it("detects only installed Rich Text plugins and prevents bootstrap from applying uninstalled custom fields", async () => {
    let storedSettings: Record<string, unknown> = {
      richTextCustomField: "plugin::ckeditor5.CKEditor",
    };
    const campaignSchema = {
      attributes: {
        body: {
          type: "richtext" as string,
          customField: undefined as string | undefined,
        },
      },
      __schema__: {
        attributes: {
          body: {
            type: "richtext" as string,
            customField: undefined as string | undefined,
          },
        },
      },
    };
    const mockStrapi: any = {
      plugins: {
        "tiptap-editor": {},
      },
      store: () => ({
        get: async () => storedSettings,
        set: async ({ value }: { value: Record<string, unknown> }) => {
          storedSettings = value;
        },
      }),
      config: {
        get: () => ({
          richTextCustomField: "plugin::tiptap-editor.RichText",
        }),
      },
      contentTypes: {
        "plugin::donations.campaign": campaignSchema,
      },
      plugin: (name: string) => {
        if (name === "donations") {
          return {
            service: (svc: string) => {
              if (svc === "settings") {
                return settingsServiceFactory({ strapi: mockStrapi });
              }
              return null;
            },
          };
        }
        return mockStrapi.plugins[name];
      },
    };

    const settingsSvc = settingsServiceFactory({ strapi: mockStrapi });
    const loaded = await settingsSvc.getSettings();
    assert.deepEqual(loaded.availableRichTextCustomFields, [
      "plugin::tiptap-editor.RichText",
    ]);

    // Uninstalled plugin (ckeditor5) in storedSettings must NOT be applied to campaign schema
    await bootstrapPlugin({ strapi: mockStrapi });
    assert.equal(campaignSchema.attributes.body.customField, undefined);

    // Installed plugin (tiptap-editor) IS applied to campaign schema
    storedSettings = { richTextCustomField: "plugin::tiptap-editor.RichText" };
    await bootstrapPlugin({ strapi: mockStrapi });
    assert.equal(
      campaignSchema.attributes.body.customField,
      "plugin::tiptap-editor.RichText"
    );
    assert.equal(
      campaignSchema.__schema__.attributes.body.customField,
      "plugin::tiptap-editor.RichText"
    );
  });
});
