import type { Core } from "@strapi/strapi";
import {
  FORBIDDEN_OBJECT_KEYS as FORBIDDEN_KEYS,
  isPlainObject as isPlainRecord,
} from "@vicacha-devs/plugin-shared";

import {
  DEFAULT_SEO_CHECKS,
  type SeoChecksConfig,
  type SeoSettingsMap,
} from "../../../shared";

const SEO_CHECK_KEYS = Object.keys(DEFAULT_SEO_CHECKS) as Array<
  keyof SeoChecksConfig
>;

export const sanitizeSeoChecks = (raw: unknown): SeoChecksConfig => {
  const source = isPlainRecord(raw) ? raw : {};
  const checks = { ...DEFAULT_SEO_CHECKS };

  SEO_CHECK_KEYS.forEach((key) => {
    if (typeof source[key] === "boolean") {
      checks[key] = source[key] as boolean;
    }
  });

  return checks;
};

export const sanitizeSeoSettingsMap = (raw: unknown): SeoSettingsMap => {
  const result: SeoSettingsMap = {};
  if (!isPlainRecord(raw)) {
    return result;
  }

  Object.keys(raw).forEach((key) => {
    const trimmedKey = key.trim();
    if (
      !trimmedKey ||
      trimmedKey.length > 128 ||
      FORBIDDEN_KEYS.has(trimmedKey)
    ) {
      return;
    }

    const entry = raw[key];
    if (!isPlainRecord(entry)) {
      return;
    }

    const fallbackName = trimmedKey.split(".").pop() || trimmedKey;
    const rawName = entry.collectionName;
    const collectionName =
      typeof rawName === "string" && rawName.trim().length > 0
        ? rawName.trim().slice(0, 128)
        : fallbackName;

    result[trimmedKey] = {
      collectionName,
      seoChecks: sanitizeSeoChecks(entry.seoChecks),
    };
  });

  return result;
};

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

  const getSettings = async (): Promise<SeoSettingsMap> => {
    const pluginStore = getPluginStore();

    const stored = await pluginStore.get<SeoSettingsMap>({ key: "settings" });
    if (!isPlainRecord(stored)) {
      return createDefaultConfig();
    }

    const config = sanitizeSeoSettingsMap(stored);
    let updated = false;
    const keys = Object.keys(strapi.contentTypes || {});

    keys.forEach((key) => {
      if (
        (key.includes("api::") || key.includes("plugin::")) &&
        !Object.prototype.hasOwnProperty.call(config, key)
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
    return config;
  };

  const setSettings = async (data: SeoSettingsMap): Promise<SeoSettingsMap> => {
    const pluginStore = getPluginStore();
    const sanitized = sanitizeSeoSettingsMap(data);
    const existingRaw = await pluginStore.get<SeoSettingsMap>({
      key: "settings",
    });
    const existing = isPlainRecord(existingRaw)
      ? sanitizeSeoSettingsMap(existingRaw)
      : {};
    const merged: SeoSettingsMap = {
      ...existing,
      ...sanitized,
    };

    await pluginStore.set({ key: "settings", value: merged });
    return pluginStore.get<SeoSettingsMap>({ key: "settings" });
  };

  return {
    getSettings,
    setSettings,
  };
};
