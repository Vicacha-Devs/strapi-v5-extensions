import type { SeoPluginConfig } from "../../../shared";

const DEFAULT_CONFIG: SeoPluginConfig = {
  autoCreateComponent: false,
  autoPopulateOnSave: false,
};

export default {
  default: DEFAULT_CONFIG,
  validator(config: unknown) {
    if (!config || typeof config !== "object") {
      throw new Error("SEO plugin config must be an object");
    }
    const cfg = config as Record<string, unknown>;
    for (const boolKey of ["autoCreateComponent", "autoPopulateOnSave"]) {
      if (cfg[boolKey] !== undefined && typeof cfg[boolKey] !== "boolean") {
        throw new Error(`SEO plugin config.${boolKey} must be a boolean`);
      }
    }
    for (const fnKey of [
      "generateTitle",
      "generateDescription",
      "generateImage",
      "generateURL",
    ]) {
      if (cfg[fnKey] !== undefined && typeof cfg[fnKey] !== "function") {
        throw new Error(`SEO plugin config.${fnKey} must be a function`);
      }
    }
  },
};
