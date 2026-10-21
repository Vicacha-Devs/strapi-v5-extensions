import type { Core } from '@strapi/strapi';
import {
  PLUGIN_ID,
  computeCampaignProgress,
  computeSecondaryDates,
  type CampaignKind,
  type DonationCampaignItem,
  type DonationsSettings,
  type InvoiceStatus,
} from '../../../shared';

function extractMediaUrl(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val.url === 'string') return val.url;
  if (val.data?.attributes?.url) return val.data.attributes.url;
  return null;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getTargetUid(settings: DonationsSettings): string {
    if (settings.campaignMapping?.enabled && settings.campaignMapping.uid) {
      return settings.campaignMapping.uid;
    }
    return `plugin::${PLUGIN_ID}.campaign`;
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

    return {
      id: raw?.id ?? raw?.documentId ?? '',
      documentId: String(raw?.documentId ?? raw?.id ?? ''),
      title: String(get('title', '')),
      slug: String(get('slug', '')),
      description: String(get('description', '')),
      campaignKind,
      categoryKey: String(get('categoryKey', 'general_fund')),
      goalAmount: progress.goalAmount,
      raisedAmount: progress.raisedAmount,
      remainingAmount: progress.remainingAmount,
      progressPercent: progress.progressPercent,
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
      invoiceStatus: progress.invoiceStatus,
      suggestedAmounts,
      allowCustomAmount: get('allowCustomAmount', true) !== false,
      allowFullBalancePayoff: get('allowFullBalancePayoff', true) !== false,
      coverUrl: extractMediaUrl(get('coverUrl', null)),
      invoiceDocumentUrl: extractMediaUrl(get('invoiceDocumentUrl', null)),
      paymentGatewayUrl: get('paymentGatewayUrl', null),
      icon: get('icon', null),
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

    const fetchForLocale = async (loc: string) => {
      try {
        const docs = await (strapi as any).documents(uid).findMany({
          locale: loc,
          populate: ['localizations', 'coverImage'],
        });
        return Array.isArray(docs) ? docs : [];
      } catch {
        const entries = await (strapi as any).entityService.findMany(uid, {
          locale: loc,
          populate: ['localizations', 'coverImage'],
        });
        return Array.isArray(entries) ? entries : entries ? [entries] : [];
      }
    };

    let rawItems = await fetchForLocale(requestedLocale);
    if (rawItems.length === 0 && requestedLocale !== settings.defaultLocale) {
      rawItems = await fetchForLocale(settings.defaultLocale);
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
    return all.find((c) => c.slug === slug) || null;
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

    const slugField = f.slug || 'slug';
    const raisedField = f.raisedAmount || 'raisedAmount';
    const donorCountField = f.donorCount || 'donorCount';
    const invoiceStatusField = f.invoiceStatus || 'invoiceStatus';

    let existing: any = null;
    try {
      const list = await (strapi as any).documents(uid).findMany({
        filters: { [slugField]: campaignSlug },
      });
      existing = Array.isArray(list) ? list[0] : null;
    } catch {
      const list = await (strapi as any).entityService.findMany(uid, {
        filters: { [slugField]: campaignSlug },
      });
      existing = Array.isArray(list) ? list[0] : null;
    }

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
