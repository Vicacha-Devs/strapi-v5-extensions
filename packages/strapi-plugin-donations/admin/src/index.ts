import { createRegisterTrads } from "@vicacha-devs/plugin-shared";

import { PLUGIN_ID } from "../../shared";
import {
  CountryCustomFieldInput,
  CurrencyCustomFieldInput,
  CurrencySelectField,
} from "./components/CurrencyCountryInput";
import { PluginIcon } from "./components/PluginIcon";
import {
  countryCustomField,
  currencyCustomField,
} from "./fields/currencyCountryFields";
import { CM_LABEL_TRANSLATIONS } from "./translations/cmLabels";
import { CM_PLACEHOLDER_TRANSLATIONS } from "./translations/cmPlaceholders";

export {
  CurrencySelectField,
  CurrencyCustomFieldInput,
  CountryCustomFieldInput,
};

export const ALL_TRANSLATION_LOCALES = [
  "en",
  "es",
  "ar",
  "tr",
  "fr",
  "de",
  "pt",
  "id",
  "ms",
  "ur",
];

interface StrapiAdminApp {
  customFields?: {
    register?: (field: unknown) => void;
  };
  addMenuLink: (link: Record<string, unknown>) => void;
  createSettingSection: (
    section: Record<string, unknown>,
    links: Array<Record<string, unknown>>
  ) => void;
  registerPlugin: (plugin: { id: string; name: string }) => void;
}

export default {
  register(app: StrapiAdminApp) {
    app.customFields?.register?.(currencyCustomField);
    app.customFields?.register?.(countryCustomField);

    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Donations & Campaigns",
      },
      Component: () =>
        import("./pages/DonationsPage").then((mod) => ({
          default: mod.DonationsPage,
        })),
      permissions: [],
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.settings.section`,
          defaultMessage: "Donations & Campaigns",
        },
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.title`,
            defaultMessage: "Campaigns, Gateways & Tax Certificates",
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

  bootstrap() {},

  registerTrads: createRegisterTrads({
    pluginId: PLUGIN_ID,
    defaultLocales: ["en", "es", "ar", "tr"],
    loadTranslation: (locale) => import(`./translations/${locale}.json`),
    getBaseTranslations: (locale) => ({
      ...(CM_LABEL_TRANSLATIONS[locale] ?? CM_LABEL_TRANSLATIONS.en),
      ...(CM_PLACEHOLDER_TRANSLATIONS[locale] ??
        CM_PLACEHOLDER_TRANSLATIONS.en),
    }),
  }),
};
