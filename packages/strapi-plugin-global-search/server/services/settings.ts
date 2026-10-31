import { PLUGIN_ID } from '../utils/constants';
import { defaults, validator } from '../config';
import type { PluginSettings, StrapiLike } from '../types';

const STORE_KEY = 'settings';

const getStore = (strapi: StrapiLike) => strapi.store({ type: 'plugin', name: PLUGIN_ID });

export default ({ strapi }: { strapi: StrapiLike }) => ({
  /**
   * Resolution order: values saved from the Settings page, then `config/plugins.js`,
   * then the built-in defaults. Every key always resolves to something usable.
   */
  async get(): Promise<PluginSettings> {
    const fromFile = strapi.config.get(`plugin::${PLUGIN_ID}`, {}) || {};
    const fromStore = (await getStore(strapi).get({ key: STORE_KEY })) || {};

    return { ...defaults, ...fromFile, ...fromStore };
  },

  async set(patch: Partial<PluginSettings> = {}): Promise<PluginSettings> {
    const allowedKeys = Object.keys(defaults);
    const sanitized = Object.entries(patch).reduce(
      (acc, [key, value]) => {
        if (allowedKeys.includes(key) && value !== undefined) (acc as Record<string, unknown>)[key] = value;
        return acc;
      },
      {} as Partial<PluginSettings>
    );

    validator(sanitized);

    const current = (await getStore(strapi).get({ key: STORE_KEY })) || {};
    const next = { ...current, ...sanitized };

    await getStore(strapi).set({ key: STORE_KEY, value: next });

    // Field lists and depth feed the introspection cache — rebuild it.
    strapi.plugin(PLUGIN_ID).service('schema').clearCache();

    return this.get();
  },

  async reset(): Promise<PluginSettings> {
    await getStore(strapi).set({ key: STORE_KEY, value: {} });
    strapi.plugin(PLUGIN_ID).service('schema').clearCache();

    return this.get();
  },

  defaults,
});
