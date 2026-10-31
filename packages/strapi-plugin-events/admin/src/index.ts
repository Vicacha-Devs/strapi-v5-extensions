import { CM_LABEL_TRANSLATIONS } from './translations/cmLabels';
import { CM_PLACEHOLDER_TRANSLATIONS } from './translations/cmPlaceholders';
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
        defaultMessage: 'Events & RSVPs',
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

    const calendarSuiteSection = {
      id: 'calendar',
      intlLabel: {
        id: 'calendar.settings.section',
        defaultMessage: 'Calendar, Events & Bookings',
      },
    };
    const eventsSettingsLink = {
      intlLabel: {
        id: `${PLUGIN_ID}.settings.menuLabel`,
        defaultMessage: 'Events & RSVPs',
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
    };
    const maybeApp = app as unknown as {
      addSettingsLink?: StrapiApp['addSettingsLink'];
      createSettingSection?: StrapiApp['createSettingSection'];
    };
    try {
      if (typeof maybeApp.addSettingsLink === 'function') {
        maybeApp.addSettingsLink(calendarSuiteSection.id, eventsSettingsLink);
      } else if (typeof maybeApp.createSettingSection === 'function') {
        maybeApp.createSettingSection(calendarSuiteSection, [eventsSettingsLink]);
      }
    } catch {
      maybeApp.createSettingSection?.(calendarSuiteSection, [eventsSettingsLink]);
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
          const prefixed: Record<string, string> = { ...(CM_LABEL_TRANSLATIONS[locale] ?? CM_LABEL_TRANSLATIONS.en ?? {}), ...(CM_PLACEHOLDER_TRANSLATIONS[locale] ?? CM_PLACEHOLDER_TRANSLATIONS.en ?? {}) };
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
