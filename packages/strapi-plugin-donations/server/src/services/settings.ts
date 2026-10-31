import type { Core } from '@strapi/strapi';
import { DEFAULT_SETTINGS, PLUGIN_ID, type DonationsSettings } from '../../../shared';

function mergeMapping<T extends { fields: Record<string, string> }>(
  base: T,
  configMap?: Partial<T>,
  storedMap?: Partial<T>
): T {
  return {
    ...base,
    ...(configMap || {}),
    ...(storedMap || {}),
    fields: {
      ...base.fields,
      ...(configMap?.fields || {}),
      ...(storedMap?.fields || {}),
    },
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getStore() {
    return strapi.store({
      type: 'plugin',
      name: PLUGIN_ID,
    });
  },

  detectAvailableRichTextCustomFields(): string[] {
    const candidates: Array<{ pluginId: string; customFieldUid: string }> = [
      { pluginId: 'tiptap-editor', customFieldUid: 'plugin::tiptap-editor.RichText' },
      { pluginId: 'ckeditor5', customFieldUid: 'plugin::ckeditor5.CKEditor' },
      { pluginId: 'ckeditor', customFieldUid: 'plugin::ckeditor.CKEditor' },
    ];
    const detected: string[] = [];
    const pluginsRecord = (strapi as unknown as { plugins?: Record<string, unknown> }).plugins;

    for (const candidate of candidates) {
      let hasPlugin = Boolean(pluginsRecord && pluginsRecord[candidate.pluginId]);
      if (!hasPlugin && typeof strapi.plugin === 'function') {
        try {
          hasPlugin = Boolean(strapi.plugin(candidate.pluginId));
        } catch {
          hasPlugin = false;
        }
      }
      if (hasPlugin) {
        detected.push(candidate.customFieldUid);
      }
    }
    return detected;
  },

  async getSettings(): Promise<DonationsSettings> {
    const store = this.getStore();
    const stored = (await store.get({ key: 'settings' })) as Partial<DonationsSettings> | null;
    const pluginConfig = (strapi.config.get(`plugin::${PLUGIN_ID}`) || {}) as Partial<DonationsSettings>;
    const availableRichTextCustomFields = this.detectAvailableRichTextCustomFields();

    return {
      ...DEFAULT_SETTINGS,
      ...pluginConfig,
      ...(stored || {}),
      availableRichTextCustomFields,
      campaignMapping: mergeMapping(
        DEFAULT_SETTINGS.campaignMapping,
        pluginConfig.campaignMapping,
        stored?.campaignMapping
      ),
      pledgeMapping: mergeMapping(
        DEFAULT_SETTINGS.pledgeMapping,
        pluginConfig.pledgeMapping,
        stored?.pledgeMapping
      ),
    };
  },

  async updateSettings(newSettings: Partial<DonationsSettings>): Promise<DonationsSettings> {
    const current = await this.getSettings();
    const merged: DonationsSettings = {
      ...current,
      ...newSettings,
      campaignMapping: mergeMapping(
        current.campaignMapping,
        newSettings.campaignMapping
      ),
      pledgeMapping: mergeMapping(
        current.pledgeMapping,
        newSettings.pledgeMapping
      ),
    };

    const store = this.getStore();
    await store.set({ key: 'settings', value: merged });
    return merged;
  },
});
