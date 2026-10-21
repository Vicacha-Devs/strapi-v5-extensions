import type { Core } from '@strapi/strapi';
import {
  ALERT_BANNER_UID,
  PLUGIN_ID,
  convertIsoDateToCalendar,
  type AlertBannerRecord,
  type InboxSettings,
} from '../../../shared';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getActiveAlerts(params?: {
    locale?: string;
    nowIso?: string;
  }): Promise<AlertBannerRecord[]> {
    const settingsService = strapi.plugin(PLUGIN_ID).service<{
      getSettings(): Promise<InboxSettings>;
    }>('settings');
    const settings = await settingsService.getSettings();
    const locale = params?.locale || settings.defaultLocale || 'es';
    const nowMs = new Date(params?.nowIso || Date.now()).getTime();

    const docs = (await strapi.documents(ALERT_BANNER_UID).findMany({
      filters: { active: true },
      limit: 50,
    })) as unknown as AlertBannerRecord[];

    const activeInWindow = docs.filter((banner) => {
      if (!banner.active) return false;
      if (banner.startsAt) {
        const startMs = new Date(banner.startsAt).getTime();
        if (!Number.isNaN(startMs) && nowMs < startMs) return false;
      }
      if (banner.endsAt) {
        const endMs = new Date(banner.endsAt).getTime();
        if (!Number.isNaN(endMs) && nowMs > endMs) return false;
      }
      return true;
    });

    activeInWindow.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    const secondaryCal = settings.secondaryCalendars?.[0] || 'islamic-umalqura';
    const refDateIso = new Date(nowMs).toISOString().slice(0, 10);
    const secondaryDate = convertIsoDateToCalendar(refDateIso, secondaryCal, locale);

    return activeInWindow.map((banner) => {
      const tr = banner.translations?.[locale];
      return {
        ...banner,
        title: tr?.title || banner.title,
        message: tr?.message || banner.message,
        ctaLabel: tr?.ctaLabel || banner.ctaLabel,
        ctaUrl: tr?.ctaUrl || banner.ctaUrl,
        secondaryDateLabel: secondaryDate.formatted,
      };
    });
  },

  async upsertAlertBanner(
    input: Partial<AlertBannerRecord> & {
      code: string;
      title: string;
      message: string;
    }
  ): Promise<AlertBannerRecord> {
    const existingDocs = (await strapi.documents(ALERT_BANNER_UID).findMany({
      filters: { code: input.code },
      limit: 1,
    })) as unknown as AlertBannerRecord[];

    const existing = existingDocs[0] || null;
    const payload: Record<string, unknown> = {
      code: input.code,
      title: input.title,
      message: input.message,
      severity: input.severity || 'info',
      ctaLabel: input.ctaLabel || '',
      ctaUrl: input.ctaUrl || '',
      dismissible: input.dismissible ?? true,
      active: input.active ?? true,
      priority: input.priority ?? 10,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      translations: input.translations || {},
    };

    if (existing?.documentId) {
      const updated = await strapi.documents(ALERT_BANNER_UID).update({
        documentId: existing.documentId,
        data: payload,
      });
      return updated as unknown as AlertBannerRecord;
    }

    const created = await strapi.documents(ALERT_BANNER_UID).create({
      data: payload,
    });
    return created as unknown as AlertBannerRecord;
  },
});
