import type { Core } from "@strapi/strapi";

import { DEFAULT_SEO_CHECKS, type SeoSettingsMap } from "../../../shared";

export const settingsService = ({ strapi }: { strapi: Core.Strapi }) => {
  const getPluginStore = () => {
    return strapi.store({
      environment: "",
      type: "plugin",
      name: "seo",
    });
  };

  const createDefaultConfig = async (): Promise<SeoSettingsMap> => {
    const pluginStore = getPluginStore();
    const newContentTypes: SeoSettingsMap = {};

    const keys = Object.keys(strapi.contentTypes || {});
    keys.forEach((key) => {
      if (key.includes("api::") || key.includes("plugin::")) {
        newContentTypes[key] = {
          collectionName: key.split(".").pop() || key,
          seoChecks: { ...DEFAULT_SEO_CHECKS },
        };
      }
    });

    await pluginStore.set({ key: "settings", value: newContentTypes });
    return pluginStore.get<SeoSettingsMap>({ key: "settings" });
  };

  const createConfigFromData = async (
    settings: SeoSettingsMap
  ): Promise<SeoSettingsMap> => {
    const pluginStore = getPluginStore();
    await pluginStore.set({ key: "settings", value: settings });
    return pluginStore.get<SeoSettingsMap>({ key: "settings" });
  };

  const getSettings = async (): Promise<SeoSettingsMap> => {
    const pluginStore = getPluginStore();

    let config = await pluginStore.get<SeoSettingsMap>({ key: "settings" });
    if (!config || typeof config !== "object") {
      config = await createDefaultConfig();
    } else {
      let updated = false;
      const keys = Object.keys(strapi.contentTypes || {});
      keys.forEach((key) => {
        if (
          (key.includes("api::") || key.includes("plugin::")) &&
          !config[key]
        ) {
          config[key] = {
            collectionName: key.split(".").pop() || key,
            seoChecks: { ...DEFAULT_SEO_CHECKS },
          };
          updated = true;
        }
      });
      if (updated) {
        await pluginStore.set({ key: "settings", value: config });
      }
    }
    return config;
  };

  const setSettings = async (data: SeoSettingsMap): Promise<SeoSettingsMap> => {
    return createConfigFromData(data);
  };

  return {
    getSettings,
    setSettings,
  };
};
