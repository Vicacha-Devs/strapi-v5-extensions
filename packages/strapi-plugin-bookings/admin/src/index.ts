import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';
import { RRuleInput } from './components/RRuleInput';
import { BookingsGridCanvas } from './components/bookings/BookingsGridCanvas';
import { BookingSidePanel } from './components/bookings/BookingSidePanel';
import { QuickCreateBookingModal } from './components/bookings/QuickCreateBookingModal';

export {
  PLUGIN_ID,
  RRuleInput,
  BookingsGridCanvas,
  BookingSidePanel,
  QuickCreateBookingModal,
};

const LOCALES = ['en', 'es', 'ar', 'fr', 'de', 'pt', 'tr', 'id', 'ur', 'zh'];

interface StrapiAdminApp {
  addMenuLink(link: Record<string, unknown>): void;
  createSettingSection(
    section: Record<string, unknown>,
    links: Array<Record<string, unknown>>
  ): void;
  registerPlugin(plugin: Record<string, unknown>): void;
}

export default {
  register(app: StrapiAdminApp) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: 'Bookings',
      },
      Component: async () => {
        const { App } = await import('./pages/App');
        return App;
      },
      permissions: [],
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.settings.section`,
          defaultMessage: 'Bookings & Availability',
        },
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.link`,
            defaultMessage: 'Slot & Schedule Configuration',
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
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  bootstrap() {},

  async registerTrads() {
    const importedTrads = await Promise.all(
      LOCALES.map(async (locale) => {
        try {
          const { default: data } = (await import(
            `./translations/${locale}.json`
          )) as { default: Record<string, string> };
          const prefixed: Record<string, string> = {};
          for (const [key, value] of Object.entries(data)) {
            prefixed[`${PLUGIN_ID}.${key}`] = value;
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
