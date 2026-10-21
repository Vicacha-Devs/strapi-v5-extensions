import { PLUGIN_ID } from '../../shared';

const ALL_TRANSLATION_LOCALES = ['en', 'es', 'ar', 'tr', 'fr', 'de', 'pt', 'id', 'ms', 'ur'];

export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: () => null,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: 'Donations & Utility Bills',
      },
      Component: async () => {
        const mod = await import('./pages/DonationsPage');
        return mod.DonationsPage;
      },
      permissions: [],
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.settings.section`,
          defaultMessage: 'Donations & Invoices',
        },
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.title`,
            defaultMessage: 'Configuration & Certificates Bridge',
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
