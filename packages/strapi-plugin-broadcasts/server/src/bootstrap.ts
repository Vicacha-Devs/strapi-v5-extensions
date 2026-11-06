import type { Core } from "@strapi/strapi";

import { PLUGIN_ID, type BroadcastSettings } from "../../shared";

const MONITORED_EVENTS = [
  "inbox.alert.published",
  "inbox.subscriber.confirmed",
  "event.published",
  "media-feeds.episode.synced",
] as const;

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
    handleEventTrigger(
      eventName: string,
      payload?: Record<string, unknown>
    ): Promise<unknown>;
  }>("automationService");
  await automationService.seedStarterRules();

  if (strapi.eventHub?.on) {
    for (const evt of MONITORED_EVENTS) {
      strapi.eventHub.on(evt, async (payload: unknown) => {
        try {
          await automationService.handleEventTrigger(
            evt,
            (payload as Record<string, unknown>) || {}
          );
        } catch (err) {
          strapi.log.warn(
            `[@vicacha-devs/strapi-plugin-broadcasts] EventHub automation warning for ${evt}: ${(err as Error).message}`
          );
        }
      });
    }
  }

  if (strapi.admin?.services?.permission?.actionProvider?.registerMany) {
    await strapi.admin.services.permission.actionProvider.registerMany([
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
