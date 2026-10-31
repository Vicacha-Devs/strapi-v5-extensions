import type { Core } from '@strapi/strapi';
import {
  PLUGIN_ID,
  computeCampaignProgress,
  normalizeRichTextValue,
  type CampaignEvidenceItem,
  type CampaignKind,
  type DonationCampaignItem,
  type DonationsSettings,
  type InvoiceStatus,
} from '../../../shared';
import {
  createFieldMapper,
  normalizeCampaignRecord,
  normalizeEvidenceItem,
  numVal,
  persistCreatedRecord,
  persistUpdatedRecord,
  queryRecords,
  slugifyTitle,
  strOrNull,
  strVal,
} from './campaignNormalizers';
import type settingsServiceFactory from './settings';

function buildPopulateFields(settings: DonationsSettings): string[] {
  const populate = ['localizations'];
  if (settings.campaignMapping?.enabled && settings.campaignMapping.fields?.coverUrl) {
    populate.push(settings.campaignMapping.fields.coverUrl);
  }
  return populate;
}

function buildLocaleSearchOrder(
  requestedLocale: string,
  settings: DonationsSettings
): Array<string | undefined> {
  const supported = Array.isArray(settings.supportedLocales)
    ? settings.supportedLocales
    : [];
  const unique = Array.from(
    new Set([requestedLocale, settings.defaultLocale, ...supported].filter(Boolean))
  );
  return [...unique, undefined];
}

async function fetchRawCampaignsWithFallback(
  strapi: Core.Strapi,
  uid: string,
  populate: string[],
  requestedLocale: string,
  settings: DonationsSettings
): Promise<Array<Record<string, unknown>>> {
  const order = buildLocaleSearchOrder(requestedLocale, settings);
  for (const loc of order) {
    const items = await queryRecords(strapi, uid, {
      populate,
      ...(loc ? { locale: loc } : {}),
    });
    if (items.length > 0) return items;
  }
  return [];
}

function matchesCampaignFilters(
  item: DonationCampaignItem,
  params: {
    campaignKind?: CampaignKind;
    categoryKey?: string;
    invoiceStatus?: InvoiceStatus;
    onlyActive?: boolean;
  }
): boolean {
  if (params.onlyActive !== false && !item.isActive) return false;
  if (params.campaignKind && item.campaignKind !== params.campaignKind) return false;
  if (params.categoryKey && item.categoryKey !== params.categoryKey) return false;
  if (params.invoiceStatus && item.invoiceStatus !== params.invoiceStatus) return false;
  return true;
}

function matchesIdentifier(
  doc: Record<string, unknown>,
  identifier: string,
  slugField: string
): boolean {
  if (doc.documentId === identifier) return true;
  if (String(doc.id) === identifier) return true;
  return doc[slugField] === identifier;
}

function resolveCampaignKind(raw: unknown): CampaignKind {
  if (raw === 'utility_invoice' || raw === 'micro_need') return raw;
  return 'major_campaign';
}

function buildCreateCampaignData(
  input: Record<string, unknown>,
  settings: DonationsSettings
): { data: Record<string, unknown>; locale: string } {
  const mapField = createFieldMapper(settings.campaignMapping);
  const title = strVal(input.title).trim();
  if (!title) {
    throw new Error('Campaign title is required');
  }

  const slug = strVal(input.slug, slugifyTitle(title)).trim();
  const campaignKind = resolveCampaignKind(input.campaignKind);
  const currency = strVal(input.currency, strVal(settings.baseCurrency, 'COP')).toUpperCase();
  const goalAmount = Math.max(0, numVal(input.goalAmount, 0));
  const raisedAmount = Math.max(0, numVal(input.raisedAmount, 0));
  const dueDate = strOrNull(input.dueDate);
  const rawStatus = strVal(input.invoiceStatus, 'open') as InvoiceStatus;

  const progress = computeCampaignProgress({
    goalAmount,
    raisedAmount,
    campaignKind,
    dueDate,
    currentStatus: rawStatus,
  });

  const locale = strVal(input.locale, strVal(settings.defaultLocale, 'en'));
  const rawEvidences = Array.isArray(input.evidences)
    ? (input.evidences as Array<Record<string, unknown>>)
    : [];
  const evidences = rawEvidences.map((ev, idx) =>
    normalizeEvidenceItem(ev, idx, currency, settings.secondaryCalendars, locale)
  );
  const defaultSuggested = settings.defaultSuggestedAmounts?.[currency] || [20000, 50000, 100000];

  const data: Record<string, unknown> = {
    [mapField('title')]: title,
    [mapField('slug')]: slug,
    [mapField('description')]: normalizeRichTextValue(strVal(input.description, title)),
    [mapField('body')]: normalizeRichTextValue(strVal(input.body)),
    [mapField('campaignKind')]: campaignKind,
    [mapField('categoryKey')]: strVal(input.categoryKey, 'general_fund'),
    [mapField('goalAmount')]: goalAmount,
    [mapField('raisedAmount')]: raisedAmount,
    [mapField('currency')]: currency,
    [mapField('donorCount')]: Math.max(0, numVal(input.donorCount, 0)),
    [mapField('isUrgent')]: Boolean(input.isUrgent),
    [mapField('isActive')]: input.isActive !== false,
    [mapField('startDate')]: strOrNull(input.startDate),
    [mapField('endDate')]: strOrNull(input.endDate),
    [mapField('dueDate')]: dueDate,
    [mapField('billingPeriod')]: strOrNull(input.billingPeriod),
    [mapField('invoiceReference')]: strOrNull(input.invoiceReference),
    [mapField('invoiceProvider')]: strOrNull(input.invoiceProvider),
    [mapField('invoiceStatus')]: rawStatus === 'paid' ? 'paid' : progress.invoiceStatus,
    [mapField('suggestedAmounts')]: Array.isArray(input.suggestedAmounts)
      ? input.suggestedAmounts
      : defaultSuggested,
    [mapField('allowCustomAmount')]: input.allowCustomAmount !== false,
    [mapField('allowFullBalancePayoff')]: input.allowFullBalancePayoff !== false,
    [mapField('coverUrl')]: strOrNull(input.coverUrl),
    [mapField('invoiceDocumentUrl')]: strOrNull(input.invoiceDocumentUrl),
    [mapField('paymentGatewayUrl')]: strOrNull(input.paymentGatewayUrl),
    [mapField('icon')]: strOrNull(input.icon),
    [mapField('evidences')]: evidences,
  };

  return { data, locale };
}

const DIRECT_CAMPAIGN_FIELDS = [
  'title', 'slug', 'campaignKind', 'categoryKey', 'currency', 'donorCount',
  'isUrgent', 'isActive', 'startDate', 'endDate', 'dueDate', 'billingPeriod',
  'invoiceReference', 'invoiceProvider', 'suggestedAmounts', 'allowCustomAmount',
  'allowFullBalancePayoff', 'coverUrl', 'invoiceDocumentUrl', 'paymentGatewayUrl', 'icon',
];

function applyOptionalPatchFields(
  updateData: Record<string, unknown>,
  patch: Record<string, unknown>,
  current: DonationCampaignItem,
  settings: DonationsSettings,
  mapField: (key: string) => string
): void {
  for (const key of DIRECT_CAMPAIGN_FIELDS) {
    if (patch[key] !== undefined) {
      updateData[mapField(key)] = patch[key];
    }
  }
  if (patch.description !== undefined) {
    updateData[mapField('description')] = normalizeRichTextValue(patch.description);
  }
  if (patch.body !== undefined) {
    updateData[mapField('body')] = normalizeRichTextValue(patch.body);
  }
  if (Array.isArray(patch.evidences)) {
    updateData[mapField('evidences')] = (
      patch.evidences as Array<Record<string, unknown>>
    ).map((ev, idx) =>
      normalizeEvidenceItem(
        ev,
        idx,
        current.currency,
        settings.secondaryCalendars,
        current.locale
      )
    );
  }
}

function buildUpdateCampaignData(
  current: DonationCampaignItem,
  patch: Record<string, unknown>,
  settings: DonationsSettings
): Record<string, unknown> {
  const mapField = createFieldMapper(settings.campaignMapping);
  const goalAmount =
    patch.goalAmount !== undefined
      ? Math.max(0, numVal(patch.goalAmount, 0))
      : current.goalAmount;
  const raisedAmount =
    patch.raisedAmount !== undefined
      ? Math.max(0, numVal(patch.raisedAmount, 0))
      : current.raisedAmount;
  const campaignKind = strVal(patch.campaignKind, current.campaignKind) as CampaignKind;
  const dueDate =
    patch.dueDate !== undefined ? strOrNull(patch.dueDate) : current.dueDate;
  const rawStatus = strVal(patch.invoiceStatus, current.invoiceStatus) as InvoiceStatus;

  const progress = computeCampaignProgress({
    goalAmount,
    raisedAmount,
    campaignKind,
    dueDate,
    currentStatus: rawStatus,
  });

  const nextStatus = strVal(patch.invoiceStatus, progress.invoiceStatus);
  const updateData: Record<string, unknown> = {
    [mapField('goalAmount')]: goalAmount,
    [mapField('raisedAmount')]: raisedAmount,
    [mapField('invoiceStatus')]: patch.invoiceStatus === 'paid' ? 'paid' : nextStatus,
  };

  applyOptionalPatchFields(updateData, patch, current, settings, mapField);
  return updateData;
}

function buildAddEvidenceUpdateData(
  current: DonationCampaignItem,
  newEvidence: CampaignEvidenceItem,
  evidenceInput: Record<string, unknown>,
  mapField: (key: string) => string
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    [mapField('evidences')]: [newEvidence, ...current.evidences],
  };

  if (evidenceInput.markCampaignPaid) {
    updateData[mapField('invoiceStatus')] = 'paid';
    if (newEvidence.documentUrl && !current.invoiceDocumentUrl) {
      updateData[mapField('invoiceDocumentUrl')] = newEvidence.documentUrl;
    }
  }

  if (evidenceInput.appendToCampaignBody && newEvidence.body) {
    const sectionHeader = `### ${newEvidence.title} (${newEvidence.date})`;
    const trimmedBody = newEvidence.body.trim();
    updateData[mapField('body')] = current.body
      ? `${current.body.trim()}\n\n${sectionHeader}\n${trimmedBody}`
      : `${sectionHeader}\n${trimmedBody}`;
  }

  return updateData;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsSvc = () =>
    strapi.plugin(PLUGIN_ID).service('settings') as ReturnType<
      typeof settingsServiceFactory
    >;

  return {
    getTargetUid(settings: DonationsSettings): string {
      if (settings.campaignMapping?.enabled && settings.campaignMapping.uid) {
        return settings.campaignMapping.uid;
      }
      return `plugin::${PLUGIN_ID}.campaign`;
    },

    normalizeEvidence(
      rawEv: Record<string, unknown>,
      index: number,
      defaultCurrency: string,
      secondaryCalendars: string[],
      locale: string
    ): CampaignEvidenceItem {
      return normalizeEvidenceItem(
        rawEv,
        index,
        defaultCurrency,
        secondaryCalendars,
        locale
      );
    },

    normalizeCampaign(
      raw: Record<string, unknown>,
      settings: DonationsSettings,
      requestedLocale?: string
    ): DonationCampaignItem {
      return normalizeCampaignRecord(raw, settings, requestedLocale);
    },

    async findCampaigns(
      params: {
        locale?: string;
        campaignKind?: CampaignKind;
        categoryKey?: string;
        invoiceStatus?: InvoiceStatus;
        onlyActive?: boolean;
      } = {}
    ): Promise<DonationCampaignItem[]> {
      const settings = await getSettingsSvc().getSettings();
      const uid = this.getTargetUid(settings);
      const requestedLocale = strVal(
        params.locale,
        strVal(settings.defaultLocale, 'en')
      );
      const populate = buildPopulateFields(settings);
      const rawItems = await fetchRawCampaignsWithFallback(
        strapi,
        uid,
        populate,
        requestedLocale,
        settings
      );

      return rawItems
        .map((item) => this.normalizeCampaign(item, settings, requestedLocale))
        .filter((item) => matchesCampaignFilters(item, params));
    },

    async findCampaignBySlug(
      slug: string,
      locale?: string
    ): Promise<DonationCampaignItem | null> {
      if (!slug) return null;
      const all = await this.findCampaigns({ locale, onlyActive: false });
      return (
        all.find(
          (c) => c.slug === slug || c.documentId === slug || String(c.id) === slug
        ) || null
      );
    },

    async findRawCampaignByIdentifier(
      identifier: string,
      settings: DonationsSettings
    ): Promise<Record<string, unknown> | null> {
      if (!identifier) return null;
      const uid = this.getTargetUid(settings);
      const mapField = createFieldMapper(settings.campaignMapping);
      const slugField = mapField('slug');

      const bySlug = await queryRecords(strapi, uid, {
        filters: { [slugField]: identifier },
      });
      if (bySlug[0]) return bySlug[0];

      const allDocs = await queryRecords(strapi, uid, {});
      return allDocs.find((d) => matchesIdentifier(d, identifier, slugField)) || null;
    },

    async createCampaign(
      input: Record<string, unknown>
    ): Promise<DonationCampaignItem> {
      const settings = await getSettingsSvc().getSettings();
      const uid = this.getTargetUid(settings);
      const { data, locale } = buildCreateCampaignData(input, settings);
      const created = await persistCreatedRecord(strapi, uid, data, locale);
      return this.normalizeCampaign(created, settings, locale);
    },

    async updateCampaign(
      identifier: string,
      patch: Record<string, unknown>
    ): Promise<DonationCampaignItem | null> {
      const settings = await getSettingsSvc().getSettings();
      const uid = this.getTargetUid(settings);
      const existing = await this.findRawCampaignByIdentifier(identifier, settings);
      if (!existing) return null;

      const current = this.normalizeCampaign(existing, settings);
      const updateData = buildUpdateCampaignData(current, patch, settings);
      const updated = await persistUpdatedRecord(strapi, uid, existing, updateData);
      return this.normalizeCampaign(updated, settings);
    },

    async addCampaignEvidence(
      identifier: string,
      evidenceInput: Record<string, unknown>
    ): Promise<DonationCampaignItem | null> {
      const settings = await getSettingsSvc().getSettings();
      const uid = this.getTargetUid(settings);
      const mapField = createFieldMapper(settings.campaignMapping);

      const existing = await this.findRawCampaignByIdentifier(identifier, settings);
      if (!existing) return null;

      const current = this.normalizeCampaign(existing, settings);
      const fallbackId = `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newEvidence = this.normalizeEvidence(
        {
          ...evidenceInput,
          id: strVal(evidenceInput.id, fallbackId),
          createdAt: strVal(evidenceInput.createdAt, new Date().toISOString()),
        },
        current.evidences.length,
        current.currency,
        settings.secondaryCalendars,
        current.locale
      );

      const updateData = buildAddEvidenceUpdateData(
        current,
        newEvidence,
        evidenceInput,
        mapField
      );
      const updated = await persistUpdatedRecord(strapi, uid, existing, updateData);
      return this.normalizeCampaign(updated, settings);
    },

    async removeCampaignEvidence(
      identifier: string,
      evidenceId: string
    ): Promise<DonationCampaignItem | null> {
      const settings = await getSettingsSvc().getSettings();
      const uid = this.getTargetUid(settings);
      const mapField = createFieldMapper(settings.campaignMapping);

      const existing = await this.findRawCampaignByIdentifier(identifier, settings);
      if (!existing) return null;

      const current = this.normalizeCampaign(existing, settings);
      const updatedEvidences = current.evidences.filter((ev) => ev.id !== evidenceId);
      const updateData: Record<string, unknown> = {
        [mapField('evidences')]: updatedEvidences,
      };

      const updated = await persistUpdatedRecord(strapi, uid, existing, updateData);
      return this.normalizeCampaign(updated, settings);
    },

    async recordVerifiedContribution(params: {
      campaignSlug: string;
      contributionAmount: number;
    }): Promise<DonationCampaignItem | null> {
      const { campaignSlug, contributionAmount } = params;
      if (!campaignSlug || !(contributionAmount > 0)) return null;

      const settings = await getSettingsSvc().getSettings();
      const uid = this.getTargetUid(settings);
      const mapField = createFieldMapper(settings.campaignMapping);

      const existing = await this.findRawCampaignByIdentifier(campaignSlug, settings);
      if (!existing) return null;

      const normalizedBefore = this.normalizeCampaign(existing, settings);
      const newRaised = Number(
        (normalizedBefore.raisedAmount + contributionAmount).toFixed(2)
      );
      const newDonorCount = normalizedBefore.donorCount + 1;
      const updatedProgress = computeCampaignProgress({
        goalAmount: normalizedBefore.goalAmount,
        raisedAmount: newRaised,
        campaignKind: normalizedBefore.campaignKind,
        dueDate: normalizedBefore.dueDate,
        currentStatus: normalizedBefore.invoiceStatus,
      });

      const updateData: Record<string, unknown> = {
        [mapField('raisedAmount')]: newRaised,
        [mapField('donorCount')]: newDonorCount,
        [mapField('invoiceStatus')]: updatedProgress.invoiceStatus,
      };

      const updated = await persistUpdatedRecord(strapi, uid, existing, updateData);
      return this.normalizeCampaign(updated, settings);
    },
  };
};
