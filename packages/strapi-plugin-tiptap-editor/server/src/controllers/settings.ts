import type { Core } from "@strapi/strapi";

import type { TiptapRuntimeSettings } from "../../../shared/src/types";
import { SETTINGS_UPDATE_PERMISSION } from "../bootstrap";
import { SettingsValidationError } from "../services/settings";
import type { Context } from "./types";

interface SettingsService {
  getSettings(): Promise<Required<TiptapRuntimeSettings>>;
  updateSettings(input: unknown): Promise<Required<TiptapRuntimeSettings>>;
}

interface SettingsUserAbility {
  cannot?: (action: string, subject?: string) => boolean;
  can?: (action: string, subject?: string) => boolean;
}

function canUpdateSettings(userAbility?: SettingsUserAbility): boolean {
  if (!userAbility) return false;
  if (typeof userAbility.cannot === "function") {
    return !userAbility.cannot(SETTINGS_UPDATE_PERMISSION);
  }
  if (typeof userAbility.can === "function") {
    return Boolean(userAbility.can(SETTINGS_UPDATE_PERMISSION));
  }
  return false;
}

/**
 * Controller for reading and updating Tiptap runtime settings.
 */
const createSettingsController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Returns current Tiptap runtime settings.
   */
  async find(ctx: Context): Promise<void> {
    const settingsService = strapi
      .plugin("tiptap-editor")
      .service("settings") as SettingsService;
    ctx.body = await settingsService.getSettings();
  },

  /**
   * Updates Tiptap runtime settings after verifying admin permission and payload schema.
   */
  async update(ctx: Context): Promise<void> {
    const userAbility = (ctx.state as { userAbility?: SettingsUserAbility })
      ?.userAbility;
    if (!canUpdateSettings(userAbility)) {
      ctx.throw(
        403,
        "You do not have permission to update Tiptap Editor settings"
      );
      return;
    }

    const settingsService = strapi
      .plugin("tiptap-editor")
      .service("settings") as SettingsService;
    const body = (ctx.request as { body?: unknown })?.body;
    try {
      ctx.body = await settingsService.updateSettings(body);
    } catch (error) {
      if (error instanceof SettingsValidationError) {
        ctx.throw(400, error.message);
        return;
      }
      strapi?.log?.error?.(
        `[tiptap-editor] Failed to persist settings: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      ctx.throw(500, "Failed to save settings");
    }
  },
});

export default createSettingsController;
