import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';

export default {
  register(app: {
    addMenuLink: (link: Record<string, unknown>) => void;
    createSettingSection: (
      section: Record<string, unknown>,
      links: Record<string, unknown>[]
    ) => void;
    registerPlugin: (plugin: Record<string, unknown>) => void;
  }) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: 'Resources & Media',
      },
      Component: async () => {
        const { ResourcesHomePage } = await import('./pages/ResourcesHomePage');
        return ResourcesHomePage;
      },
      permissions: [],
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.settings.section`,
          defaultMessage: 'Resources & Media Library',
        },
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.page.title`,
            defaultMessage: 'Media Library & Catalog Settings',
          },
          id: `${PLUGIN_ID}-settings`,
          to: `settings/${PLUGIN_ID}`,
          Component: async () => {
            const { SettingsPage } = await import('./pages/SettingsPage');
            return SettingsPage;
          },
          permissions: [],
        },
      ]
    );

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(
            `./translations/${locale}.json`
          );
          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
    return importedTrads;
  },
};
