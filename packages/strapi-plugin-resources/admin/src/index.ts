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
      Component: () =>
        import('./pages/ResourcesHomePage').then((mod) => ({
          default: mod.ResourcesHomePage,
        })),
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
          to: `${PLUGIN_ID}`,
          Component: () =>
            import('./pages/SettingsPage').then((mod) => ({
              default: mod.SettingsPage,
            })),
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
