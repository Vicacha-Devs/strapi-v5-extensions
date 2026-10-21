import { Play } from '@strapi/icons';
import type { StrapiApp } from '@strapi/strapi/admin';
import { PLUGIN_ID } from '../../shared';

const SUPPORTED_ADMIN_LOCALES = [
  'en',
  'es',
  'ar',
  'tr',
  'fr',
  'de',
  'pt',
  'id',
  'ur',
  'zh',
];

function prefixPluginTranslations(
  messages: Record<string, string>,
  pluginId: string
): Record<string, string> {
  const prefixed: Record<string, string> = {};
  for (const [key, value] of Object.entries(messages)) {
    prefixed[`${pluginId}.${key}`] = value;
  }
  return prefixed;
}

export default {
  register(app: StrapiApp) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: Play,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: 'Media Feeds',
      },
      Component: async () => {
        const mod = await import('./pages/MediaFeedsPage');
        return mod.default;
      },
      permissions: [],
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.settings.section`,
          defaultMessage: 'Media Feeds & Podcasts',
        },
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.general`,
            defaultMessage: 'Feed, Multi-Language & Live Settings',
          },
          id: `${PLUGIN_ID}-settings`,
          to: `${PLUGIN_ID}`,
          Component: async () => {
            const mod = await import('./pages/SettingsPage');
            return mod.default;
          },
          permissions: [],
        },
      ]
    );

    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        if (!SUPPORTED_ADMIN_LOCALES.includes(locale)) {
          return { data: {}, locale };
        }
        try {
          const { default: data } = await import(
            `./translations/${locale}.json`
          );
          return {
            data: prefixPluginTranslations(data, PLUGIN_ID),
            locale,
          };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
