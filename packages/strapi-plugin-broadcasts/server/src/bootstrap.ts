import type { Core } from "@strapi/strapi";

import { PLUGIN_ID, type BroadcastSettings } from "../../shared";
import { registerEventHubListeners } from "./eventHubRegistry";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const settingsService = strapi.plugin(PLUGIN_ID).service<{
    getSettings(): Promise<BroadcastSettings>;
  }>("settings");
  await settingsService.getSettings();

  const campaignService = strapi.plugin(PLUGIN_ID).service<{
    seedStarterCampaigns(): Promise<number>;
  }>("campaignService");
  await campaignService.seedStarterCampaigns();

  const automationService = strapi.plugin(PLUGIN_ID).service<{
    seedStarterRules(): Promise<number>;
  }>("automationService");
  await automationService.seedStarterRules();

  await registerEventHubListeners(strapi);

  if (strapi.admin?.services?.permission?.actionProvider?.registerMany) {
    await strapi.admin.services.permission.actionProvider.registerMany([
      {
        section: "plugins",
        displayName: "Read Broadcast Campaigns & Delivery Ledger",
        uid: "read",
        pluginName: PLUGIN_ID,
      },
      {
        section: "plugins",
        displayName: "Manage Broadcast Campaigns",
        uid: "campaigns.manage",
        pluginName: PLUGIN_ID,
      },
      {
        section: "plugins",
        displayName: "Send & Dispatch Broadcasts",
        uid: "campaigns.send",
        pluginName: PLUGIN_ID,
      },
      {
        section: "plugins",
        displayName: "Manage EventHub Automation Rules",
        uid: "automations.manage",
        pluginName: PLUGIN_ID,
      },
      {
        section: "plugins",
        displayName: "Manage Broadcast Transport Settings",
        uid: "settings.manage",
        pluginName: PLUGIN_ID,
      },
    ]);
  }
};

export default bootstrap;
