import type { Core } from '@strapi/strapi';
import { DEFAULT_SETTINGS, PLUGIN_ID, type DonationsSettings } from '../../../shared';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getStore() {
    return strapi.store({
      type: 'plugin',
      name: PLUGIN_ID,
    });
  },

  async getSettings(): Promise<DonationsSettings> {
    const store = this.getStore();
    const stored = (await store.get({ key: 'settings' })) as Partial<DonationsSettings> | null;
    const pluginConfig = (strapi.config.get(`plugin::${PLUGIN_ID}`) || {}) as Partial<DonationsSettings>;

    return {
      ...DEFAULT_SETTINGS,
      ...pluginConfig,
      ...(stored || {}),
      campaignMapping: {
        ...DEFAULT_SETTINGS.campaignMapping,
        ...(pluginConfig.campaignMapping || {}),
        ...(stored?.campaignMapping || {}),
        fields: {
          ...DEFAULT_SETTINGS.campaignMapping.fields,
          ...(pluginConfig.campaignMapping?.fields || {}),
          ...(stored?.campaignMapping?.fields || {}),
        },
      },
      pledgeMapping: {
        ...DEFAULT_SETTINGS.pledgeMapping,
        ...(pluginConfig.pledgeMapping || {}),
        ...(stored?.pledgeMapping || {}),
        fields: {
          ...DEFAULT_SETTINGS.pledgeMapping.fields,
          ...(pluginConfig.pledgeMapping?.fields || {}),
          ...(stored?.pledgeMapping?.fields || {}),
        },
      },
    };
  },

  async updateSettings(newSettings: Partial<DonationsSettings>): Promise<DonationsSettings> {
    const current = await this.getSettings();
    const merged: DonationsSettings = {
      ...current,
      ...newSettings,
      campaignMapping: {
        ...current.campaignMapping,
        ...(newSettings.campaignMapping || {}),
        fields: {
          ...current.campaignMapping.fields,
          ...(newSettings.campaignMapping?.fields || {}),
        },
      },
      pledgeMapping: {
        ...current.pledgeMapping,
        ...(newSettings.pledgeMapping || {}),
        fields: {
          ...current.pledgeMapping.fields,
          ...(newSettings.pledgeMapping?.fields || {}),
        },
      },
    };

    const store = this.getStore();
    await store.set({ key: 'settings', value: merged });
    return merged;
  },
});
