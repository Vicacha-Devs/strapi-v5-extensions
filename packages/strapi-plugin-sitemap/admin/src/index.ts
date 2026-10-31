import { PLUGIN_ID } from './pluginId';
import getTrad from './utils/getTrad';

interface StrapiAdminApp {
  createSettingSection: (
    section: Record<string, unknown>,
    links: Array<Record<string, unknown>>
  ) => void;
  registerPlugin: (plugin: Record<string, unknown>) => void;
}

const SUPPORTED_LOCALES = ['en', 'es', 'ar', 'tr', 'fr', 'pt-BR'] as const;

const prefixPluginTranslations = (
  trad: Record<string, string>,
  pluginId: string
): Record<string, string> => {
  return Object.entries(trad).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[`${pluginId}.${key}`] = value;
    return acc;
  }, {});
};

export default {
  register(app: StrapiAdminApp) {
    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: getTrad('plugin.name'),
          defaultMessage: 'Sitemap',
        },
      },
      [
        {
          intlLabel: {
            id: getTrad('plugin.section.item'),
            defaultMessage: 'Configuration',
          },
          id: `${PLUGIN_ID}.configuration`,
          to: `/settings/${PLUGIN_ID}`,
          Component: async () => {
            const { default: Settings } = await import('./pages/Settings');
            return Settings;
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
    const importedTrads = await Promise.all(
      locales.map(async (locale) => {
        if ((SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
          try {
            const { default: data } = await import(`./translations/${locale}.json`);
            return {
              data: prefixPluginTranslations(data, PLUGIN_ID),
              locale,
            };
          } catch {
            return { data: {}, locale };
          }
        }
        return { data: {}, locale };
      })
    );

    return importedTrads;
  },
};
