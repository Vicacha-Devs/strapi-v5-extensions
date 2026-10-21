import { CheckCircle } from '@strapi/icons';
import type { StrapiApp } from '@strapi/strapi/admin';
import { PLUGIN_ID } from '../../shared';

export default {
  register(app: StrapiApp) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: CheckCircle,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: 'Certificates',
      },
      Component: async () => {
        const { CertificatesPage } = await import('./pages/CertificatesPage');
        return CertificatesPage;
      },
      permissions: [],
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.settings.section`,
          defaultMessage: 'Certificates Authority',
        },
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.page`,
            defaultMessage: 'Signing Keys & Templates',
          },
          id: `${PLUGIN_ID}-settings`,
          to: `${PLUGIN_ID}`,
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
