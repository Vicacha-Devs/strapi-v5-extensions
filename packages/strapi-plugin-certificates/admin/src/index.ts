import { CheckCircle } from "@strapi/icons";
import type { StrapiApp } from "@strapi/strapi/admin";

import { PLUGIN_ID } from "../../shared/pluginId";
import { CM_LABEL_TRANSLATIONS } from "./translations/cmLabels";
import { CM_PLACEHOLDER_TRANSLATIONS } from "./translations/cmPlaceholders";

export default {
  register(app: StrapiApp) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: CheckCircle,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Certificates",
      },
      Component: () =>
        import("./pages/CertificatesPage").then((mod) => ({
          default: mod.CertificatesPage,
        })),
      permissions: [],
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.settings.section`,
          defaultMessage: "Certificates Authority",
        },
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.page`,
            defaultMessage: "Signing Keys & Templates",
          },
          id: `${PLUGIN_ID}-settings`,
          to: `${PLUGIN_ID}`,
          Component: () =>
            import("./pages/SettingsPage").then((mod) => ({
              default: mod.SettingsPage,
            })),
          permissions: [],
        },
      ]
    );

    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    });
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
          const prefixed: Record<string, string> = {
            ...(CM_LABEL_TRANSLATIONS[locale] ?? CM_LABEL_TRANSLATIONS.en),
            ...(CM_PLACEHOLDER_TRANSLATIONS[locale] ??
              CM_PLACEHOLDER_TRANSLATIONS.en),
          };
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
