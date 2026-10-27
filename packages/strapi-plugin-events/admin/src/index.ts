import type { StrapiApp } from '@strapi/strapi/admin';
import { PLUGIN_ID } from '../../shared/pluginId';
import { EventSidePanel } from './components/EventSidePanel';
import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';
import { rruleField } from './fields/rruleField';

export default {
  register(app: StrapiApp) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: 'Events & Calendar',
      },
      Component: () =>
        import('./pages/CalendarPage').then((m) => ({ default: m.default })),
      permissions: [
        {
          action: `plugin::${PLUGIN_ID}.read`,
          subject: null,
        },
      ],
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });

    app.customFields.register(
      rruleField as unknown as Parameters<typeof app.customFields.register>[0]
    );

    const maybeApp = app as unknown as {
      addSettingsLink?: StrapiApp['addSettingsLink'];
    };
    if (typeof maybeApp.addSettingsLink === 'function') {
      app.addSettingsLink('global', {
        intlLabel: {
          id: `${PLUGIN_ID}.settings.menuLabel`,
          defaultMessage: 'Events & Calendar',
        },
        id: `${PLUGIN_ID}-settings`,
        to: `${PLUGIN_ID}`,
        Component: () =>
          import('./pages/SettingsPage').then((m) => ({ default: m.default })),
        permissions: [
          {
            action: `plugin::${PLUGIN_ID}.settings.update`,
            subject: null,
          },
        ],
      });
    }
  },

  bootstrap(app: StrapiApp) {
    const cmPlugin = app.getPlugin('content-manager') as
      | {
          apis?: {
            addEditViewSidePanel?: (panels: Array<typeof EventSidePanel>) => void;
          };
        }
      | undefined;
    const apis = cmPlugin?.apis;
    if (apis && typeof apis.addEditViewSidePanel === 'function') {
      apis.addEditViewSidePanel([EventSidePanel]);
    }
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
