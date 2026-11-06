import { PLUGIN_ID } from "../../../shared/pluginId";
import { PluginIcon } from "../components/PluginIcon";

export const rruleCustomField = {
  name: "rrule",
  pluginId: PLUGIN_ID,
  type: "json",
  intlLabel: {
    id: `${PLUGIN_ID}.rrule.field.label`,
    defaultMessage: "Recurrence Schedule (RRULE / RSCALE)",
  },
  intlDescription: {
    id: `${PLUGIN_ID}.rrule.field.description`,
    defaultMessage:
      "Configure RFC 5545 & RFC 7529 recurring schedules, non-Gregorian calendar recurrence, excluded dates, and per-occurrence overrides.",
  },
  icon: PluginIcon,
  components: {
    Input: async () =>
      import("../components/RRuleInput").then((module) => ({
        default: module.RRuleInput,
      })),
  },
};
