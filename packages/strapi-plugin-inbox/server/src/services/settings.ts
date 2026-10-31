import type { Core } from "@strapi/strapi";

import { DEFAULT_INBOX_SETTINGS, PLUGIN_ID, type InboxSettings } from "../../../shared";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getSettings(): Promise<InboxSettings> {
    const pluginStore = strapi.store({
      type: "plugin",
      name: PLUGIN_ID,
    });

    const configDefaults = strapi.config.get<Partial<InboxSettings>>(`plugin::${PLUGIN_ID}`, {});
    const stored = (await pluginStore.get({
      key: "settings",
    })) as Partial<InboxSettings> | null;

    return {
      ...DEFAULT_INBOX_SETTINGS,
      ...configDefaults,
      ...stored,
    };
  },

  async updateSettings(patch: Partial<InboxSettings>): Promise<InboxSettings> {
    const current = await this.getSettings();
    const updated: InboxSettings = {
      ...current,
      ...patch,
    };

    const pluginStore = strapi.store({
      type: "plugin",
      name: PLUGIN_ID,
    });
    await pluginStore.set({
      key: "settings",
      value: updated,
    });

    return updated;
  },
});
