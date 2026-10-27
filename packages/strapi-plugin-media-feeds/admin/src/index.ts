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
      Component: () =>
        import('./pages/MediaFeedsPage').then((mod) => ({
          default: mod.default,
        })),
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
          Component: () =>
            import('./pages/SettingsPage').then((mod) => ({
              default: mod.default,
            })),
          permissions: [],
        },
      ]
    );

    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    });
  },

  async registerTrads({ locales = [] }: { locales?: string[] } = {}) {
    const allLocales = Array.from(new Set([...locales, "en", "es", "ar", "tr"]));
    return Promise.all(
      allLocales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);
          const prefixed: Record<string, string> = {};
          for (const [k, v] of Object.entries(data as Record<string, string>)) {
            prefixed[k] = v;
            const fullKey = k.startsWith(`${PLUGIN_ID}.`) ? k : `${PLUGIN_ID}.${k}`;
            prefixed[fullKey] = v;
          }
          return { data: prefixed, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
