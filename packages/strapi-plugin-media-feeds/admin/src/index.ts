import { Play } from "@strapi/icons";
import type { StrapiApp } from "@strapi/strapi/admin";

import { PLUGIN_ID } from "../../shared";
import { CM_LABEL_TRANSLATIONS } from "./translations/cmLabels";
import { CM_PLACEHOLDER_TRANSLATIONS } from "./translations/cmPlaceholders";

export const SUPPORTED_ADMIN_LOCALES = ["en", "es", "ar", "tr", "fr", "de", "pt", "id", "ur", "zh"];

export default {
  register(app: StrapiApp) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: Play,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Media Feeds",
      },
      Component: () =>
        import("./pages/MediaFeedsPage").then((mod) => ({
          default: mod.default,
        })),
      permissions: [],
    });

    const broadcastsSuiteSection = {
      id: "broadcasts",
      intlLabel: {
        id: "broadcasts.settings.section",
        defaultMessage: "Broadcasts, Media Feeds & Podcasts",
      },
    };
    const mediaFeedsSettingsLink = {
      intlLabel: {
        id: `${PLUGIN_ID}.settings.general`,
        defaultMessage: "Media Feeds & Podcasts",
      },
      id: `${PLUGIN_ID}-settings`,
      to: `${PLUGIN_ID}`,
      Component: () =>
        import("./pages/SettingsPage").then((mod) => ({
          default: mod.default,
        })),
      permissions: [],
    };
    try {
      if (typeof app.addSettingsLink === "function") {
        app.addSettingsLink(broadcastsSuiteSection.id, mediaFeedsSettingsLink);
      } else {
        app.createSettingSection(broadcastsSuiteSection, [mediaFeedsSettingsLink]);
      }
    } catch {
      app.createSettingSection(broadcastsSuiteSection, [mediaFeedsSettingsLink]);
    }

    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    });
  },

  async registerTrads({ locales = [] }: { locales?: string[] } = {}) {
    const allLocales = Array.from(new Set([...locales, "en", "es", "ar", "tr"]));
    return Promise.all(
      allLocales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);
          const prefixed: Record<string, string> = {
            ...CM_LABEL_TRANSLATIONS.en,
            ...CM_PLACEHOLDER_TRANSLATIONS.en,
            ...CM_LABEL_TRANSLATIONS[locale],
            ...CM_PLACEHOLDER_TRANSLATIONS[locale],
          };
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
