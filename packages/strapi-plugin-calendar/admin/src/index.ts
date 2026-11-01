import type { StrapiAdminApp } from "@strapi/strapi/admin";

import { PLUGIN_ID } from "../../shared/pluginId";
import { CalendarToolbar } from "./components/calendar/CalendarToolbar";
import { FullCalendarCanvas } from "./components/calendar/FullCalendarCanvas";
import { CalendarSidePanel } from "./components/CalendarSidePanel";
import { Initializer } from "./components/Initializer";
import { PluginIcon } from "./components/PluginIcon";
import { RRuleInput } from "./components/RRuleInput";
import { rruleCustomField } from "./fields/rruleField";

export { FullCalendarCanvas, CalendarToolbar, RRuleInput, CalendarSidePanel };

export const SUPPORTED_LOCALES = [
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "it",
  "nl",
  "pl",
  "tr",
  "ar",
];

export default {
  register(app: StrapiAdminApp) {
    app.customFields.register(rruleCustomField);

    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Calendar",
      },
      permissions: [],
      Component: () =>
        import("./pages/CalendarPage").then((mod) => ({
          default: mod.CalendarPage,
        })),
    });

    const calendarSettingsSection = {
      id: PLUGIN_ID,
      intlLabel: {
        id: `${PLUGIN_ID}.settings.section`,
        defaultMessage: "Calendar, Events & Bookings",
      },
    };
    const calendarSettingsLink = {
      intlLabel: {
        id: `${PLUGIN_ID}.settings.general`,
        defaultMessage: "Calendar & Scheduler",
      },
      id: `${PLUGIN_ID}-settings`,
      to: `${PLUGIN_ID}`,
      Component: () =>
        import("./pages/SettingsPage").then((mod) => ({
          default: mod.SettingsPage,
        })),
      permissions: [],
    };
    try {
      if (typeof app.addSettingsLink === "function") {
        app.addSettingsLink(calendarSettingsSection.id, calendarSettingsLink);
      } else {
        app.createSettingSection(calendarSettingsSection, [
          calendarSettingsLink,
        ]);
      }
    } catch {
      app.createSettingSection(calendarSettingsSection, [calendarSettingsLink]);
    }

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  bootstrap(app: StrapiAdminApp) {
    const cmPlugin = app.getPlugin("content-manager");
    if (cmPlugin?.apis?.addEditViewSidePanel) {
      cmPlugin.apis.addEditViewSidePanel([CalendarSidePanel]);
    }
  },

  async registerTrads({ locales = [] }: { locales?: string[] } = {}) {
    const allLocales = Array.from(
      new Set([...locales, "en", "es", "ar", "tr"])
    );
    return Promise.all(
      allLocales.map(async (locale) => {
        try {
          const { default: data } = await import(
            `./translations/${locale}.json`
          );
          const prefixed: Record<string, string> = {};
          for (const [k, v] of Object.entries(data as Record<string, string>)) {
            prefixed[k] = v;
            const fullKey = k.startsWith(`${PLUGIN_ID}.`)
              ? k
              : `${PLUGIN_ID}.${k}`;
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
