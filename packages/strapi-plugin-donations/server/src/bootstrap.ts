import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../shared";

interface MutableContentType {
  attributes?: Record<string, { customField?: string }>;
  __schema__?: {
    attributes?: Record<string, { customField?: string }>;
  };
}

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  await (
    strapi.admin as
      | {
          services?: {
            permission?: {
              actionProvider?: {
                registerMany?: (actions: unknown[]) => Promise<void>;
              };
            };
          };
        }
      | undefined
  )?.services?.permission?.actionProvider?.registerMany?.([
    {
      section: "plugins",
      displayName: "View Donations & Campaigns",
      uid: "read",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Manage Campaigns, Evidences & Verify Pledges",
      uid: "manage",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Manage Donations Settings",
      uid: "settings",
      pluginName: PLUGIN_ID,
    },
  ]);

  const settingsService = strapi.plugin(PLUGIN_ID).service("settings") as {
    getSettings: () => Promise<{
      richTextCustomField?: string;
      availableRichTextCustomFields?: string[];
    }>;
  };
  const settings = await settingsService.getSettings();

  if (
    settings?.richTextCustomField &&
    (!Array.isArray(settings.availableRichTextCustomFields) ||
      settings.availableRichTextCustomFields.includes(
        settings.richTextCustomField
      ))
  ) {
    const uid = `plugin::${PLUGIN_ID}.campaign`;
    const ct = (
      strapi.contentTypes as Record<string, MutableContentType> | undefined
    )?.[uid];
    if (ct) {
      for (const field of ["body"]) {
        if (ct.attributes?.[field]) {
          ct.attributes[field].customField = settings.richTextCustomField;
        }
        if (ct.__schema__?.attributes?.[field]) {
          ct.__schema__.attributes[field].customField =
            settings.richTextCustomField;
        }
      }
    }
  }
};
