import { PLUGIN_ID } from '../../shared';

const ALL_TRANSLATION_LOCALES = ['en', 'es', 'ar', 'tr', 'fr', 'de', 'pt', 'id', 'ms', 'ur'];

export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: () => null,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: 'Islam Suite (Salah, Hilal & Scripture)',
      },
      Component: async () => {
        const mod = await import('./pages/IslamPage');
        return mod.IslamPage;
      },
      permissions: [],
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.settings.section`,
          defaultMessage: 'Islam Liturgical & Fiqh Suite',
        },
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.title`,
            defaultMessage: 'Calculation Engine, Hilal, Nisab & Bridges',
          },
          id: `${PLUGIN_ID}-settings`,
          to: `/settings/${PLUGIN_ID}`,
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
      name: PLUGIN_ID,
    });
  },

  bootstrap() {},

  async registerTrads({ locales }: { locales: string[] }) {
    const targetLocales = Array.from(new Set([...(locales || []), ...ALL_TRANSLATION_LOCALES]));
    return Promise.all(
      targetLocales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);
          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
