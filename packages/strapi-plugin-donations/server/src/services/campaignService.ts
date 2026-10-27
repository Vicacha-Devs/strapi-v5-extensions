import type { Core } from '@strapi/strapi';
import {
  PLUGIN_ID,
  computeCampaignProgress,
  computeSecondaryDates,
  normalizeRichTextValue,
  type CampaignEvidenceItem,
  type CampaignEvidenceType,
  type CampaignKind,
  type DonationCampaignItem,
  type DonationsSettings,
  type InvoiceStatus,
} from '../../../shared';

function extractMediaUrl(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val.trim() || null;
  if (typeof val.url === 'string') return val.url;
  if (val.data?.attributes?.url) return val.data.attributes.url;
  return null;
}

function slugifyTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `campaign-${Date.now()}`
  );
}

const VALID_EVIDENCE_TYPES: CampaignEvidenceType[] = [
  'paid_receipt',
  'photo_gallery',
  'delivery_report',
  'audit_document',
  'beneficiary_update',
];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getTargetUid(settings: DonationsSettings): string {
    if (settings.campaignMapping?.enabled && settings.campaignMapping.uid) {
      return settings.campaignMapping.uid;
    }
    return `plugin::${PLUGIN_ID}.campaign`;
  },

  normalizeEvidence(
    rawEv: any,
    index: number,
    defaultCurrency: string,
    secondaryCalendars: string[],
    locale: string
  ): CampaignEvidenceItem {
    const rawType = String(rawEv?.evidenceType || 'paid_receipt') as CampaignEvidenceType;
    const evidenceType: CampaignEvidenceType = VALID_EVIDENCE_TYPES.includes(rawType)
      ? rawType
      : 'paid_receipt';
    const date = String(rawEv?.date || rawEv?.createdAt || new Date().toISOString().slice(0, 10));
    const rawMedia = Array.isArray(rawEv?.mediaUrls)
      ? rawEv.mediaUrls
      : typeof rawEv?.mediaUrls === 'string' && rawEv.mediaUrls.trim()
        ? rawEv.mediaUrls.split(',').map((s: string) => s.trim())
        : [];
    const mediaUrls = rawMedia.map(extractMediaUrl).filter((u: string | null): u is string => Boolean(u));
    const body = normalizeRichTextValue(rawEv?.body ?? rawEv?.description ?? '');
    const description = normalizeRichTextValue(rawEv?.description ?? rawEv?.body ?? '');

    return {
      id: String(rawEv?.id || `ev-${ index + 1 }`),
      title: String(rawEv?.title || 'Impact Evidence'),
      evidenceType,
      description,
      body,
      date,
      amountSpent: Math.max(0, Number(rawEv?.amountSpent) || 0),
      currency: String(rawEv?.currency || defaultCurrency).toUpperCase(),
      mediaUrls,
      documentUrl: extractMediaUrl(rawEv?.documentUrl ?? null),
      verifiedBy: rawEv?.verifiedBy ? String(rawEv.verifiedBy) : null,
      createdAt: String(rawEv?.createdAt || date),
      secondaryDates: computeSecondaryDates(date, secondaryCalendars, locale),
    };
  },

  normalizeCampaign(raw: any, settings: DonationsSettings, requestedLocale?: string): DonationCampaignItem {
    const f = settings.campaignMapping?.enabled ? settings.campaignMapping.fields : {};
    const get = (key: string, fallback?: any) => {
      const mappedKey = f[key] || key;
      return raw?.[mappedKey] !== undefined ? raw[mappedKey] : raw?.[key] ?? fallback;
    };

    const currency = String(get('currency', settings.baseCurrency || 'COP')).toUpperCase();
    const goalAmount = Number(get('goalAmount', 0)) || 0;
    const raisedAmount = Number(get('raisedAmount', 0)) || 0;
    const campaignKind = (get('campaignKind', 'major_campaign') as CampaignKind) || 'major_campaign';
    const dueDate = get('dueDate', null);
    const rawStatus = (get('invoiceStatus', 'open') as InvoiceStatus) || 'open';

    const progress = computeCampaignProgress({
      goalAmount,
      raisedAmount,
      campaignKind,
      dueDate,
      currentStatus: rawStatus,
    });
    const finalStatus: InvoiceStatus = rawStatus === 'paid' ? 'paid' : progress.invoiceStatus;

    const rawSuggested = get('suggestedAmounts', null);
    const suggestedAmounts =
      Array.isArray(rawSuggested) && rawSuggested.length > 0
        ? rawSuggested.map((n: any) => Number(n)).filter((n: number) => n > 0)
        : settings.defaultSuggestedAmounts?.[currency] || [20000, 50000, 100000];

    const locale = String(raw?.locale || requestedLocale || settings.defaultLocale || 'en');
    const localizations = Array.isArray(raw?.localizations) ? raw.localizations : [];
    const availableLocales = Array.from(
      new Set([locale, ...localizations.map((l: any) => l?.locale).filter(Boolean)])
    );

    const refDate = dueDate || get('startDate', null) || raw?.createdAt;
    const secondaryDates = computeSecondaryDates(refDate, settings.secondaryCalendars, locale);

    const rawEvidences = get('evidences', []);
    let parsedEvidences: any[] = [];
    if (Array.isArray(rawEvidences)) {
      parsedEvidences = rawEvidences;
    } else if (typeof rawEvidences === 'string' && rawEvidences.trim().startsWith('[')) {
      try {
        parsedEvidences = JSON.parse(rawEvidences);
      } catch {
        parsedEvidences = [];
      }
    }

    const evidences = parsedEvidences.map((ev: any, idx: number) =>
      this.normalizeEvidence(ev, idx, currency, settings.secondaryCalendars, locale)
    );
    const accountedAmount = Number(
      evidences.reduce((sum, ev) => sum + (Number(ev.amountSpent) || 0), 0).toFixed(2)
    );

    return {
      id: raw?.id ?? raw?.documentId ?? '',
      documentId: String(raw?.documentId ?? raw?.id ?? ''),
      title: String(get('title', '')),
      slug: String(get('slug', '')),
      description: normalizeRichTextValue(get('description', '')),
      body: normalizeRichTextValue(get('body', '')),
      campaignKind,
      categoryKey: String(get('categoryKey', 'general_fund')),
      goalAmount: progress.goalAmount,
      raisedAmount: progress.raisedAmount,
      remainingAmount: finalStatus === 'paid' ? 0 : progress.remainingAmount,
      progressPercent: finalStatus === 'paid' ? 100 : progress.progressPercent,
      currency,
      donorCount: Number(get('donorCount', 0)) || 0,
      isUrgent: Boolean(get('isUrgent', false)),
      isActive: get('isActive', true) !== false,
      startDate: get('startDate', null),
      endDate: get('endDate', null),
      dueDate,
      billingPeriod: get('billingPeriod', null),
      invoiceReference: get('invoiceReference', null),
      invoiceProvider: get('invoiceProvider', null),
      invoiceStatus: finalStatus,
      suggestedAmounts,
      allowCustomAmount: get('allowCustomAmount', true) !== false,
      allowFullBalancePayoff: get('allowFullBalancePayoff', true) !== false,
      coverUrl: extractMediaUrl(get('coverUrl', null)),
      invoiceDocumentUrl: extractMediaUrl(get('invoiceDocumentUrl', null)),
      paymentGatewayUrl: get('paymentGatewayUrl', null),
      icon: get('icon', null),
      evidences,
      evidenceCount: evidences.length,
      accountedAmount,
      locale,
      availableLocales,
      secondaryDates,
    };
  },

  async findCampaigns(params: {
    locale?: string;
    campaignKind?: CampaignKind;
    categoryKey?: string;
    invoiceStatus?: InvoiceStatus;
    onlyActive?: boolean;
  } = {}): Promise<DonationCampaignItem[]> {
    const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
    const settings: DonationsSettings = await settingsService.getSettings();
    const uid = this.getTargetUid(settings);
    const requestedLocale = params.locale || settings.defaultLocale || 'en';

    const populateFields = ['localizations'];
    if (settings.campaignMapping?.enabled && settings.campaignMapping.fields?.coverUrl) {
      populateFields.push(settings.campaignMapping.fields.coverUrl);
    }

    const fetchForLocale = async (loc?: string) => {
      const queryOpts: Record<string, any> = { populate: populateFields };
      if (loc) queryOpts.locale = loc;
      try {
        const docs = await (strapi as any).documents(uid).findMany(queryOpts);
        return Array.isArray(docs) ? docs : [];
      } catch {
        const entries = await (strapi as any).entityService.findMany(uid, queryOpts);
        return Array.isArray(entries) ? entries : entries ? [entries] : [];
      }
    };

    let rawItems = await fetchForLocale(requestedLocale);
    if (rawItems.length === 0 && requestedLocale !== settings.defaultLocale) {
      rawItems = await fetchForLocale(settings.defaultLocale);
    }
    if (rawItems.length === 0 && Array.isArray(settings.supportedLocales)) {
      for (const fallbackLoc of settings.supportedLocales) {
        if (fallbackLoc === requestedLocale || fallbackLoc === settings.defaultLocale) continue;
        rawItems = await fetchForLocale(fallbackLoc);
        if (rawItems.length > 0) break;
      }
    }
    if (rawItems.length === 0) {
      rawItems = await fetchForLocale(undefined);
    }

    let normalized = rawItems.map((item: any) =>
      this.normalizeCampaign(item, settings, requestedLocale)
    );

    if (params.onlyActive !== false) {
      normalized = normalized.filter((item) => item.isActive);
    }
    if (params.campaignKind) {
      normalized = normalized.filter((item) => item.campaignKind === params.campaignKind);
    }
    if (params.categoryKey) {
      normalized = normalized.filter((item) => item.categoryKey === params.categoryKey);
    }
    if (params.invoiceStatus) {
      normalized = normalized.filter((item) => item.invoiceStatus === params.invoiceStatus);
    }

    return normalized;
  },

  async findCampaignBySlug(slug: string, locale?: string): Promise<DonationCampaignItem | null> {
    if (!slug) return null;
    const all = await this.findCampaigns({ locale, onlyActive: false });
    return all.find((c) => c.slug === slug || c.documentId === slug || String(c.id) === slug) || null;
  },

  async findRawCampaignByIdentifier(identifier: string, settings: DonationsSettings): Promise<any | null> {
    if (!identifier) return null;
    const uid = this.getTargetUid(settings);
    const f = settings.campaignMapping?.enabled ? settings.campaignMapping.fields : {};
    const slugField = f.slug || 'slug';

    try {
      if ((strapi as any).documents) {
        const bySlug = await (strapi as any).documents(uid).findMany({
          filters: { [slugField]: identifier },
        });
        if (Array.isArray(bySlug) && bySlug[0]) return bySlug[0];

        const allDocs = await (strapi as any).documents(uid).findMany({});
        if (Array.isArray(allDocs)) {
          const found = allDocs.find(
            (d: any) =>
              d?.documentId === identifier ||
              String(d?.id) === identifier ||
              d?.[slugField] === identifier
          );
          if (found) return found;
        }
      }
    } catch {
      // fallback to entityService
    }

    if ((strapi as any).entityService) {
      const list = await (strapi as any).entityService.findMany(uid, {
        filters: { [slugField]: identifier },
      });
      if (Array.isArray(list) && list[0]) return list[0];

      const allEntries = await (strapi as any).entityService.findMany(uid, {});
      if (Array.isArray(allEntries)) {
        return (
          allEntries.find(
            (d: any) =>
              d?.documentId === identifier ||
              String(d?.id) === identifier ||
              d?.[slugField] === identifier
          ) || null
        );
      }
    }

    return null;
  },

  async createCampaign(input: Record<string, any>): Promise<DonationCampaignItem> {
    const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
    const settings: DonationsSettings = await settingsService.getSettings();
    const uid = this.getTargetUid(settings);
    const f = settings.campaignMapping?.enabled ? settings.campaignMapping.fields : {};
    const mapField = (key: string) => f[key] || key;

    const title = String(input.title || '').trim();
    if (!title) {
      throw new Error('Campaign title is required');
    }

    const slug = String(input.slug || slugifyTitle(title)).trim();
    const campaignKind: CampaignKind =
      input.campaignKind === 'utility_invoice' || input.campaignKind === 'micro_need'
        ? input.campaignKind
        : 'major_campaign';
    const currency = String(input.currency || settings.baseCurrency || 'COP').toUpperCase();
    const goalAmount = Math.max(0, Number(input.goalAmount) || 0);
    const raisedAmount = Math.max(0, Number(input.raisedAmount) || 0);
    const dueDate = input.dueDate || null;

    const progress = computeCampaignProgress({
      goalAmount,
      raisedAmount,
      campaignKind,
      dueDate,
      currentStatus: input.invoiceStatus || 'open',
    });

    const locale = String(input.locale || settings.defaultLocale || 'en');
    const rawEvidences = Array.isArray(input.evidences) ? input.evidences : [];
    const evidences = rawEvidences.map((ev: any, idx: number) =>
      this.normalizeEvidence(ev, idx, currency, settings.secondaryCalendars, locale)
    );

    const data: Record<string, any> = {
      [mapField('title')]: title,
      [mapField('slug')]: slug,
      [mapField('description')]: normalizeRichTextValue(input.description || title),
      [mapField('body')]: normalizeRichTextValue(input.body || ''),
      [mapField('campaignKind')]: campaignKind,
      [mapField('categoryKey')]: String(input.categoryKey || 'general_fund'),
      [mapField('goalAmount')]: goalAmount,
      [mapField('raisedAmount')]: raisedAmount,
      [mapField('currency')]: currency,
      [mapField('donorCount')]: Math.max(0, Number(input.donorCount) || 0),
      [mapField('isUrgent')]: Boolean(input.isUrgent),
      [mapField('isActive')]: input.isActive !== false,
      [mapField('startDate')]: input.startDate || null,
      [mapField('endDate')]: input.endDate || null,
      [mapField('dueDate')]: dueDate,
      [mapField('billingPeriod')]: input.billingPeriod || null,
      [mapField('invoiceReference')]: input.invoiceReference || null,
      [mapField('invoiceProvider')]: input.invoiceProvider || null,
      [mapField('invoiceStatus')]: input.invoiceStatus === 'paid' ? 'paid' : progress.invoiceStatus,
      [mapField('suggestedAmounts')]: Array.isArray(input.suggestedAmounts)
        ? input.suggestedAmounts
        : settings.defaultSuggestedAmounts?.[currency] || [20000, 50000, 100000],
      [mapField('allowCustomAmount')]: input.allowCustomAmount !== false,
      [mapField('allowFullBalancePayoff')]: input.allowFullBalancePayoff !== false,
      [mapField('coverUrl')]: input.coverUrl || null,
      [mapField('invoiceDocumentUrl')]: input.invoiceDocumentUrl || null,
      [mapField('paymentGatewayUrl')]: input.paymentGatewayUrl || null,
      [mapField('icon')]: input.icon || null,
      [mapField('evidences')]: evidences,
    };

    try {
      if ((strapi as any).documents) {
        const created = await (strapi as any).documents(uid).create({
          data,
          locale,
          status: 'published',
        });
        return this.normalizeCampaign(created || { ...data, locale }, settings, locale);
      }
    } catch {
      // fallback to entityService
    }

    const created = await (strapi as any).entityService.create(uid, {
      data: { ...data, locale, publishedAt: new Date().toISOString() },
    });
    return this.normalizeCampaign(created || { ...data, locale }, settings, locale);
  },

  async updateCampaign(
    identifier: string,
    patch: Record<string, any>
  ): Promise<DonationCampaignItem | null> {
    const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
    const settings: DonationsSettings = await settingsService.getSettings();
    const uid = this.getTargetUid(settings);
    const f = settings.campaignMapping?.enabled ? settings.campaignMapping.fields : {};
    const mapField = (key: string) => f[key] || key;

    const existing = await this.findRawCampaignByIdentifier(identifier, settings);
    if (!existing) return null;

    const current = this.normalizeCampaign(existing, settings);
    const goalAmount =
      patch.goalAmount !== undefined ? Math.max(0, Number(patch.goalAmount) || 0) : current.goalAmount;
    const raisedAmount =
      patch.raisedAmount !== undefined
        ? Math.max(0, Number(patch.raisedAmount) || 0)
        : current.raisedAmount;
    const campaignKind: CampaignKind = patch.campaignKind || current.campaignKind;
    const dueDate = patch.dueDate !== undefined ? patch.dueDate : current.dueDate;

    const progress = computeCampaignProgress({
      goalAmount,
      raisedAmount,
      campaignKind,
      dueDate,
      currentStatus: patch.invoiceStatus || current.invoiceStatus,
    });

    const updateData: Record<string, any> = {
      [mapField('goalAmount')]: goalAmount,
      [mapField('raisedAmount')]: raisedAmount,
      [mapField('invoiceStatus')]:
        patch.invoiceStatus === 'paid' ? 'paid' : patch.invoiceStatus || progress.invoiceStatus,
    };

    const directFields = [
      'title',
      'slug',
      'campaignKind',
      'categoryKey',
      'currency',
      'donorCount',
      'isUrgent',
      'isActive',
      'startDate',
      'endDate',
      'dueDate',
      'billingPeriod',
      'invoiceReference',
      'invoiceProvider',
      'suggestedAmounts',
      'allowCustomAmount',
      'allowFullBalancePayoff',
      'coverUrl',
      'invoiceDocumentUrl',
      'paymentGatewayUrl',
      'icon',
    ];

    for (const key of directFields) {
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
      updateData[mapField('evidences')] = patch.evidences.map((ev: any, idx: number) =>
        this.normalizeEvidence(ev, idx, current.currency, settings.secondaryCalendars, current.locale)
      );
    }

    try {
      if (existing.documentId && (strapi as any).documents) {
        const updated = await (strapi as any).documents(uid).update({
          documentId: existing.documentId,
          data: updateData,
        });
        return this.normalizeCampaign(updated || { ...existing, ...updateData }, settings);
      }
    } catch {
      // fallback to entityService
    }

    const updated = await (strapi as any).entityService.update(uid, existing.id, {
      data: updateData,
    });
    return this.normalizeCampaign(updated || { ...existing, ...updateData }, settings);
  },

  async addCampaignEvidence(
    identifier: string,
    evidenceInput: Record<string, any>
  ): Promise<DonationCampaignItem | null> {
    const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
    const settings: DonationsSettings = await settingsService.getSettings();
    const uid = this.getTargetUid(settings);
    const f = settings.campaignMapping?.enabled ? settings.campaignMapping.fields : {};
    const mapField = (key: string) => f[key] || key;

    const existing = await this.findRawCampaignByIdentifier(identifier, settings);
    if (!existing) return null;

    const current = this.normalizeCampaign(existing, settings);
    const newEvidence = this.normalizeEvidence(
      {
        ...evidenceInput,
        id:
          evidenceInput.id ||
          `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: evidenceInput.createdAt || new Date().toISOString(),
      },
      current.evidences.length,
      current.currency,
      settings.secondaryCalendars,
      current.locale
    );

    const updatedEvidences = [newEvidence, ...current.evidences];
    const updateData: Record<string, any> = {
      [mapField('evidences')]: updatedEvidences,
    };

    if (evidenceInput.markCampaignPaid) {
      updateData[mapField('invoiceStatus')] = 'paid';
      if (newEvidence.documentUrl && !current.invoiceDocumentUrl) {
        updateData[mapField('invoiceDocumentUrl')] = newEvidence.documentUrl;
      }
    }

    if (evidenceInput.appendToCampaignBody && newEvidence.body) {
      const sectionHeader = `### ${newEvidence.title} (${newEvidence.date})`;
      const nextBody = current.body
        ? `${current.body.trim()}\n\n${sectionHeader}\n${newEvidence.body.trim()}`
        : `${sectionHeader}\n${newEvidence.body.trim()}`;
      updateData[mapField('body')] = nextBody;
    }

    try {
      if (existing.documentId && (strapi as any).documents) {
        const updated = await (strapi as any).documents(uid).update({
          documentId: existing.documentId,
          data: updateData,
        });
        return this.normalizeCampaign(updated || { ...existing, ...updateData }, settings);
      }
    } catch {
      // fallback to entityService
    }

    const updated = await (strapi as any).entityService.update(uid, existing.id, {
      data: updateData,
    });
    return this.normalizeCampaign(updated || { ...existing, ...updateData }, settings);
  },

  async removeCampaignEvidence(
    identifier: string,
    evidenceId: string
  ): Promise<DonationCampaignItem | null> {
    const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
    const settings: DonationsSettings = await settingsService.getSettings();
    const uid = this.getTargetUid(settings);
    const f = settings.campaignMapping?.enabled ? settings.campaignMapping.fields : {};
    const mapField = (key: string) => f[key] || key;

    const existing = await this.findRawCampaignByIdentifier(identifier, settings);
    if (!existing) return null;

    const current = this.normalizeCampaign(existing, settings);
    const updatedEvidences = current.evidences.filter((ev) => ev.id !== evidenceId);
    const updateData: Record<string, any> = {
      [mapField('evidences')]: updatedEvidences,
    };

    try {
      if (existing.documentId && (strapi as any).documents) {
        const updated = await (strapi as any).documents(uid).update({
          documentId: existing.documentId,
          data: updateData,
        });
        return this.normalizeCampaign(updated || { ...existing, ...updateData }, settings);
      }
    } catch {
      // fallback to entityService
    }

    const updated = await (strapi as any).entityService.update(uid, existing.id, {
      data: updateData,
    });
    return this.normalizeCampaign(updated || { ...existing, ...updateData }, settings);
  },

  async recordVerifiedContribution(params: {
    campaignSlug: string;
    contributionAmount: number;
  }): Promise<DonationCampaignItem | null> {
    const { campaignSlug, contributionAmount } = params;
    if (!campaignSlug || !(contributionAmount > 0)) return null;

    const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
    const settings: DonationsSettings = await settingsService.getSettings();
    const uid = this.getTargetUid(settings);
    const f = settings.campaignMapping?.enabled ? settings.campaignMapping.fields : {};

    const raisedField = f.raisedAmount || 'raisedAmount';
    const donorCountField = f.donorCount || 'donorCount';
    const invoiceStatusField = f.invoiceStatus || 'invoiceStatus';

    const existing = await this.findRawCampaignByIdentifier(campaignSlug, settings);
    if (!existing) return null;

    const normalizedBefore = this.normalizeCampaign(existing, settings);
    const newRaised = Number((normalizedBefore.raisedAmount + contributionAmount).toFixed(2));
    const newDonorCount = normalizedBefore.donorCount + 1;
    const updatedProgress = computeCampaignProgress({
      goalAmount: normalizedBefore.goalAmount,
      raisedAmount: newRaised,
      campaignKind: normalizedBefore.campaignKind,
      dueDate: normalizedBefore.dueDate,
      currentStatus: normalizedBefore.invoiceStatus,
    });

    const updateData: Record<string, any> = {
      [raisedField]: newRaised,
      [donorCountField]: newDonorCount,
      [invoiceStatusField]: updatedProgress.invoiceStatus,
    };

    try {
      if (existing.documentId && (strapi as any).documents) {
        const updated = await (strapi as any).documents(uid).update({
          documentId: existing.documentId,
          data: updateData,
        });
        return this.normalizeCampaign(updated || { ...existing, ...updateData }, settings);
      }
    } catch {
      // fallback to entityService
    }

    const updated = await (strapi as any).entityService.update(uid, existing.id, {
      data: updateData,
    });
    return this.normalizeCampaign(updated || { ...existing, ...updateData }, settings);
  },
});

