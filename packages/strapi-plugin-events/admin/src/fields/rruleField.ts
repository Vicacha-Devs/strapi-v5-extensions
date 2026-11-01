import { Calendar } from "@strapi/icons";
import type { ComponentType } from "react";

import { PLUGIN_ID } from "../../../shared/pluginId";

export const rruleField = {
  name: "rrule",
  pluginId: PLUGIN_ID,
  type: "json",
  intlLabel: {
    id: `${PLUGIN_ID}.rrule.label`,
    defaultMessage: "Event Recurrence & Schedule (RRULE)",
  },
  intlDescription: {
    id: `${PLUGIN_ID}.rrule.description`,
    defaultMessage:
      "Configure recurring rules (RFC 5545 RRULE), timezone, exception dates, and single-instance overrides.",
  },
  icon: Calendar as ComponentType<Record<string, unknown>>,
  components: {
    Input: async () =>
      import("../components/RRuleInput").then((m) => ({ default: m.default })),
  },
  options: {
    base: [],
    advanced: [
      {
        sectionTitle: {
          id: `${PLUGIN_ID}.rrule.section.advanced`,
          defaultMessage: "Settings",
        },
        items: [
          {
            name: "required",
            type: "checkbox",
            intlLabel: {
              id: `${PLUGIN_ID}.rrule.options.required`,
              defaultMessage: "Required field",
            },
            description: {
              id: `${PLUGIN_ID}.rrule.options.required.description`,
              defaultMessage:
                "Require editors to specify recurrence or schedule settings.",
            },
          },
        ],
      },
    ],
  },
};
