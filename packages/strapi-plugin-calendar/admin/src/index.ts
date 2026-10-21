import type { StrapiAdminApp } from '@strapi/strapi/admin';
import { PLUGIN_ID } from '../../shared/pluginId';
import { CalendarSidePanel } from './components/CalendarSidePanel';
import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';
import { RRuleInput } from './components/RRuleInput';
import { CalendarToolbar } from './components/calendar/CalendarToolbar';
import { FullCalendarCanvas } from './components/calendar/FullCalendarCanvas';
import { rruleCustomField } from './fields/rruleField';

export { FullCalendarCanvas, CalendarToolbar, RRuleInput, CalendarSidePanel };

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'pt', 'it', 'nl', 'pl', 'tr', 'ar'];

export default {
  register(app: StrapiAdminApp) {
    app.customFields.register(rruleCustomField);

    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: 'Calendar',
      },
      permissions: [],
      Component: async () =>
        import('./pages/CalendarPage').then((mod) => ({
          default: mod.CalendarPage,
        })),
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.settings.section`,
          defaultMessage: 'Calendar & Scheduler',
        },
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.general`,
            defaultMessage: 'Sources & Calendar Settings',
          },
          id: `${PLUGIN_ID}-settings`,
          to: `${PLUGIN_ID}`,
          Component: async () =>
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

  bootstrap(app: StrapiAdminApp) {
    const cmPlugin = app.getPlugin('content-manager');
    if (cmPlugin?.apis?.addEditViewSidePanel) {
      cmPlugin.apis.addEditViewSidePanel([CalendarSidePanel]);
    }
  },

  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map(async (locale) => {
        const normalized = SUPPORTED_LOCALES.includes(locale) ? locale : 'en';
        try {
          const { default: data } = await import(`./translations/${normalized}.json`);
          const prefixed: Record<string, string> = {};
          for (const [k, v] of Object.entries(data as Record<string, string>)) {
            const fullKey = k.startsWith(`${PLUGIN_ID}.`) ? k : `${PLUGIN_ID}.${k}`;
            prefixed[fullKey] = v;
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
