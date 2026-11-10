import type { Core } from "@strapi/strapi";

import { PLUGIN_ID, type AutomationRuleRecord } from "../../shared";

export const MONITORED_EVENTS = [
  "inbox.alert.published",
  "inbox.subscriber.confirmed",
  "event.published",
  "media-feeds.episode.synced",
] as const;

interface HubRegistryEntry {
  unsubs: Array<() => void>;
  boundEvents: Set<string>;
  usesCatchAll: boolean;
}

const hubRegistry = new WeakMap<object, HubRegistryEntry>();

function getOrCreateEntry(strapi: Core.Strapi): HubRegistryEntry {
  let entry = hubRegistry.get(strapi);
  if (!entry) {
    entry = { unsubs: [], boundEvents: new Set(), usesCatchAll: false };
    hubRegistry.set(strapi, entry);
  }
  return entry;
}

async function dispatchEventToAutomation(
  strapi: Core.Strapi,
  eventName: string,
  payload: unknown
): Promise<void> {
  if (!eventName || eventName.toLowerCase().startsWith("broadcasts.")) {
    return;
  }
  try {
    const automationService = strapi.plugin(PLUGIN_ID).service<{
      handleEventTrigger(
        evt: string,
        data?: Record<string, unknown>
      ): Promise<unknown>;
    }>("automationService");

    const safePayload =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : {};
    await automationService.handleEventTrigger(eventName, safePayload);
  } catch (err) {
    strapi.log.warn(
      `[@vicacha-devs/strapi-plugin-broadcasts] EventHub automation warning for ${eventName}: ${(err as Error).message}`
    );
  }
}

export function ensureEventHubListener(
  strapi: Core.Strapi,
  rawEventName: string
): void {
  const evt = String(rawEventName || "").trim();
  if (!evt || evt.toLowerCase().startsWith("broadcasts.")) return;

  const entry = getOrCreateEntry(strapi);
  if (entry.usesCatchAll || entry.boundEvents.has(evt)) return;
  if (typeof strapi.eventHub?.on !== "function") return;

  const listener = async (payload: unknown) => {
    await dispatchEventToAutomation(strapi, evt, payload);
  };

  strapi.eventHub.on(evt, listener);
  entry.boundEvents.add(evt);
  entry.unsubs.push(() => {
    if (typeof strapi.eventHub?.off === "function") {
      strapi.eventHub.off(evt, listener);
    } else if (typeof strapi.eventHub?.removeListener === "function") {
      strapi.eventHub.removeListener(evt, listener);
    }
  });
}

export async function registerEventHubListeners(
  strapi: Core.Strapi
): Promise<void> {
  cleanupEventHubListeners(strapi);
  if (!strapi.eventHub) return;

  const entry = getOrCreateEntry(strapi);
  if (typeof strapi.eventHub.subscribe === "function") {
    const unsubscribe = strapi.eventHub.subscribe(
      async (eventName: string, payload?: unknown) => {
        await dispatchEventToAutomation(strapi, eventName, payload);
      }
    );
    entry.usesCatchAll = true;
    if (typeof unsubscribe === "function") {
      entry.unsubs.push(unsubscribe);
    }
    return;
  }

  for (const evt of MONITORED_EVENTS) {
    ensureEventHubListener(strapi, evt);
  }

  const automationService = strapi.plugin(PLUGIN_ID).service<{
    listRules(): Promise<AutomationRuleRecord[]>;
  }>("automationService");
  const existingRules = await automationService.listRules();
  for (const rule of existingRules) {
    if (rule.eventName) {
      ensureEventHubListener(strapi, rule.eventName);
    }
  }
}

export function cleanupEventHubListeners(strapi: Core.Strapi): void {
  const entry = hubRegistry.get(strapi);
  if (!entry) return;
  for (const unsub of entry.unsubs) {
    try {
      unsub();
    } catch {
      // Ignore listener teardown errors during shutdown
    }
  }
  hubRegistry.delete(strapi);
}
