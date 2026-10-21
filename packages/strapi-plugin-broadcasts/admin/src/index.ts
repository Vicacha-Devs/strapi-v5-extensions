import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';

const SUPPORTED_ADMIN_LOCALES = [
  'en',
  'es',
  'ar',
  'fr',
  'de',
  'pt',
  'it',
  'tr',
  'ru',
  'zh',
] as const;

export default {
  register(app: {
    addMenuLink: (link: Record<string, unknown>) => void;
    createSettingSection: (
      section: { id: string; intlLabel: { id: string; defaultMessage: string } },
      links: Array<Record<string, unknown>>
    ) => void;
    registerPlugin: (plugin: Record<string, unknown>) => void;
  }) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: 'Community Broadcasts',
      },
      Component: async () => {
        const mod = await import('./pages/BroadcastsHomePage');
        return mod.BroadcastsHomePage;
      },
      permissions: [],
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.settings.section`,
          defaultMessage: 'Community Broadcasts',
        },
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.page`,
            defaultMessage: 'Email, Telegram & WhatsApp Transports',
          },
          id: `${PLUGIN_ID}-settings`,
          to: `${PLUGIN_ID}`,
          Component: async () => {
            const mod = await import('./pages/SettingsPage');
            return mod.SettingsPage;
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
        if (
          !SUPPORTED_ADMIN_LOCALES.includes(
            locale as (typeof SUPPORTED_ADMIN_LOCALES)[number]
          )
        ) {
          return { data: {}, locale };
        }
        try {
          const { default: data } = await import(`./translations/${locale}.json`);
          const prefixed: Record<string, string> = {};
          for (const [k, v] of Object.entries(data as Record<string, string>)) {
            prefixed[`${PLUGIN_ID}.${k}`] = v;
          }
          return { data: prefixed, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );

    return importedTrads;
  },
};
