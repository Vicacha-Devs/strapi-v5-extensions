import { PLUGIN_ID } from "../../../shared";
import { PluginIcon } from "../components/PluginIcon";

export const currencyCustomField = {
  name: "currency",
  pluginId: PLUGIN_ID,
  type: "string",
  intlLabel: {
    id: `${PLUGIN_ID}.customField.currency.label`,
    defaultMessage: "Currency (ISO 4217)",
  },
  intlDescription: {
    id: `${PLUGIN_ID}.customField.currency.description`,
    defaultMessage:
      "Select an ISO 4217 currency code with symbol, country flag, and localized name.",
  },
  icon: PluginIcon,
  components: {
    Input: async () =>
      import("../components/CurrencyCountryInput").then((mod) => ({
        default: mod.CurrencyCustomFieldInput,
      })),
  },
};

export const countryCustomField = {
  name: "country",
  pluginId: PLUGIN_ID,
  type: "string",
  intlLabel: {
    id: `${PLUGIN_ID}.customField.country.label`,
    defaultMessage: "Country / Region (ISO 3166-1)",
  },
  intlDescription: {
    id: `${PLUGIN_ID}.customField.country.description`,
    defaultMessage:
      "Select an ISO 3166-1 alpha-2 country code with flag and default currency.",
  },
  icon: PluginIcon,
  components: {
    Input: async () =>
      import("../components/CurrencyCountryInput").then((mod) => ({
        default: mod.CountryCustomFieldInput,
      })),
  },
};
