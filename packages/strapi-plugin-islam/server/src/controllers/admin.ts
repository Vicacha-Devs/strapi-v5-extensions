import type { Core } from '@strapi/strapi';
import { PLUGIN_ID, sanitizePlainText } from '../../../shared';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsService = () => strapi.plugin(PLUGIN_ID).service('settings') as any;
  const getIslamService = () => strapi.plugin(PLUGIN_ID).service('islamService') as any;

  return {
    async getOverview(ctx: any) {
      const locale = typeof ctx.query?.locale === 'string' ? ctx.query.locale : undefined;
      const data = await getIslamService().getAdminOverview(locale);
      ctx.body = { data };
    },

    async getSettings(ctx: any) {
      const data = await getSettingsService().getSettings();
      ctx.body = { data };
    },

    async updateSettings(ctx: any) {
      const patch =
        ctx.request?.body && typeof ctx.request.body === 'object'
          ? ctx.request.body
          : {};
      const data = await getSettingsService().updateSettings(patch);
      ctx.body = { data };
    },

    async confirmHilal(ctx: any) {
      const body =
        ctx.request?.body && typeof ctx.request.body === 'object'
          ? ctx.request.body
          : {};
      const allowedOccasions = [
        'ramadan',
        'eid_al_fitr',
        'dhul_hijjah_eid_al_adha',
        'monthly_hilal',
      ];
      const occasion = allowedOccasions.includes(body.occasion)
        ? body.occasion
        : 'ramadan';

      const data = await getIslamService().confirmHilalSighting({
        occasion,
        hijriYear: Number(body.hijriYear) || undefined,
        hijriMonth: Number(body.hijriMonth) || undefined,
        confirmedGregorianDate: sanitizePlainText(body.confirmedGregorianDate, 20),
        shifting: sanitizePlainText(body.shifting, 5),
        approvedByImam: sanitizePlainText(body.approvedByImam, 120),
        notes: typeof body.notes === 'object' && body.notes ? body.notes : {},
        activateBanner: Boolean(body.activateBanner),
        dispatchBroadcast: Boolean(body.dispatchBroadcast),
      });
      ctx.body = { data };
    },

    async updateDailyPins(ctx: any) {
      const body =
        ctx.request?.body && typeof ctx.request.body === 'object'
          ? ctx.request.body
          : {};
      const data = await getSettingsService().updateSettings({
        dailyPins: {
          pinnedAyahId: body.pinnedAyahId ? sanitizePlainText(body.pinnedAyahId, 80) : null,
          pinnedHadithId: body.pinnedHadithId
            ? sanitizePlainText(body.pinnedHadithId, 80)
            : null,
          pinnedDuaId: body.pinnedDuaId ? sanitizePlainText(body.pinnedDuaId, 80) : null,
          pinnedAsmaNumber: body.pinnedAsmaNumber ? Number(body.pinnedAsmaNumber) : null,
        },
      });
      ctx.body = { data };
    },
  };
};
