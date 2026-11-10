import { defaults, isPlainObject, validator } from "../config";
import type { PluginSettings, StrapiLike } from "../types";
import { PLUGIN_ID } from "../utils/constants";

const STORE_KEY = "settings";
const ALLOWED_KEYS = Object.keys(defaults);

const getStore = (strapi: StrapiLike) =>
  strapi.store({ type: "plugin", name: PLUGIN_ID });

const pickAllowed = (source: unknown): Partial<PluginSettings> => {
  if (!isPlainObject(source)) return {};
  return Object.entries(source).reduce((acc, [key, value]) => {
    if (ALLOWED_KEYS.includes(key) && value !== undefined) {
      (acc as Record<string, unknown>)[key] = value;
    }
    return acc;
  }, {} as Partial<PluginSettings>);
};

export default ({ strapi }: { strapi: StrapiLike }) => ({
  /**
   * Resolution order: values saved from the Settings page, then `config/plugins.js`,
   * then the built-in defaults. Every key always resolves to something usable.
   */
  async get(): Promise<PluginSettings> {
    const fromFile = pickAllowed(strapi.config.get(`plugin::${PLUGIN_ID}`, {}));
    const fromStore = pickAllowed(
      await getStore(strapi).get({ key: STORE_KEY })
    );

    return { ...defaults, ...fromFile, ...fromStore };
  },

  async set(patch: Partial<PluginSettings> = {}): Promise<PluginSettings> {
    if (!isPlainObject(patch)) {
      throw new Error("[global-search] settings payload must be an object");
    }
    const sanitized = pickAllowed(patch);

    validator(sanitized);

    const current = pickAllowed(await getStore(strapi).get({ key: STORE_KEY }));
    const next = { ...current, ...sanitized };

    await getStore(strapi).set({ key: STORE_KEY, value: next });

    // Field lists and depth feed the introspection cache — rebuild it.
    strapi.plugin(PLUGIN_ID).service("schema").clearCache();

    return this.get();
  },

  async reset(): Promise<PluginSettings> {
    await getStore(strapi).set({ key: STORE_KEY, value: {} });
    strapi.plugin(PLUGIN_ID).service("schema").clearCache();

    return this.get();
  },

  defaults,
});
