import type { StrapiApp } from "@strapi/strapi/admin";
import { createRegisterTrads } from "@vicacha-devs/plugin-shared";

import { PLUGIN_ID } from "../../shared/pluginId";
import { EventSidePanel } from "./components/EventSidePanel";
import { Initializer } from "./components/Initializer";
import { PluginIcon } from "./components/PluginIcon";
import { rruleField } from "./fields/rruleField";
import { pluginPermissions } from "./permissions";
import { CM_LABEL_TRANSLATIONS } from "./translations/cmLabels";
import { CM_PLACEHOLDER_TRANSLATIONS } from "./translations/cmPlaceholders";

export { pluginPermissions };

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
] as const;

function pickLocaleRecord(
  dict: Record<string, Record<string, string>>,
  locale: string,
  baseLang: string
): Record<string, string> {
  if (Object.hasOwn(dict, locale)) {
    return dict[locale];
  }
  if (Object.hasOwn(dict, baseLang)) {
    return dict[baseLang];
  }
  return dict.en;
}

export default {
  register(app: StrapiApp) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Events & RSVPs",
      },
      Component: () =>
        import("./pages/CalendarPage").then((m) => ({ default: m.default })),
      permissions: pluginPermissions.read,
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
      id: "calendar",
      intlLabel: {
        id: "calendar.settings.section",
        defaultMessage: "Calendar, Events & Bookings",
      },
    };
    const eventsSettingsLink = {
      intlLabel: {
        id: `${PLUGIN_ID}.settings.menuLabel`,
        defaultMessage: "Events & RSVPs",
      },
      id: `${PLUGIN_ID}-settings`,
      to: `${PLUGIN_ID}`,
      Component: () =>
        import("./pages/SettingsPage").then((m) => ({ default: m.default })),
      permissions: pluginPermissions.settings,
    };
    const maybeApp = app as unknown as {
      addSettingsLink?: StrapiApp["addSettingsLink"];
      createSettingSection?: StrapiApp["createSettingSection"];
    };
    try {
      if (typeof maybeApp.addSettingsLink === "function") {
        maybeApp.addSettingsLink(calendarSuiteSection.id, eventsSettingsLink);
      } else if (typeof maybeApp.createSettingSection === "function") {
        maybeApp.createSettingSection(calendarSuiteSection, [
          eventsSettingsLink,
        ]);
      }
    } catch {
      maybeApp.createSettingSection?.(calendarSuiteSection, [
        eventsSettingsLink,
      ]);
    }
  },

  bootstrap(app: StrapiApp) {
    const cmPlugin = app.getPlugin("content-manager") as
      | {
          apis?: {
            addEditViewSidePanel?: (
              panels: Array<typeof EventSidePanel>
            ) => void;
          };
        }
      | undefined;
    const apis = cmPlugin?.apis;
    if (apis && typeof apis.addEditViewSidePanel === "function") {
      apis.addEditViewSidePanel([EventSidePanel]);
    }
  },

  registerTrads: createRegisterTrads({
    pluginId: PLUGIN_ID,
    defaultLocales: ["en", "es", "ar", "tr"],
    supportedLocales: SUPPORTED_LOCALES,
    loadTranslation: (locale) => import(`./translations/${locale}.json`),
    getBaseTranslations: (locale) => {
      const baseLang = locale.split("-")[0] ?? "en";
      return {
        ...pickLocaleRecord(CM_LABEL_TRANSLATIONS, locale, baseLang),
        ...pickLocaleRecord(CM_PLACEHOLDER_TRANSLATIONS, locale, baseLang),
      };
    },
  }),
};
