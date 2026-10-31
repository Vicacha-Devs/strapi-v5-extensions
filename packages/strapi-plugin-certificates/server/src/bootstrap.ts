import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../shared";

interface SettingsServiceContract {
  getSigningKeyPair(): Promise<{ fingerprint: string }>;
}

interface IssuanceServiceContract {
  seedDefaultTemplates(): Promise<number>;
}

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const actions = [
    {
      section: "plugins",
      displayName: "Access the Certificates Registry",
      uid: "read",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Issue, Approve, and Revoke Certificates",
      uid: "issue",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Manage Certificate Templates & Signing Keys",
      uid: "settings",
      pluginName: PLUGIN_ID,
    },
  ];

  await strapi.admin?.services?.permission?.actionProvider?.registerMany(actions);

  const settingsService = strapi.plugin(PLUGIN_ID).service<SettingsServiceContract>("settings");
  const keyPair = await settingsService.getSigningKeyPair();

  const issuanceService = strapi.plugin(PLUGIN_ID).service<IssuanceServiceContract>("issuance");
  const seeded = await issuanceService.seedDefaultTemplates();

  strapi.log.info(
    `[${PLUGIN_ID}] Bootstrapped with Ed25519 key fingerprint ${keyPair.fingerprint} (seeded ${seeded} default template(s))`
  );
};
