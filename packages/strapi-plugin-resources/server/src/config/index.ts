import { DEFAULT_RESOURCES_SETTINGS } from "../../../shared";
import { buildValidatedSettings } from "../services/settings";

export default {
  default: DEFAULT_RESOURCES_SETTINGS,
  validator(config: unknown) {
    if (config === undefined || config === null) return;
    if (typeof config !== "object" || Array.isArray(config)) {
      throw new Error("plugin::resources config must be an object");
    }
    buildValidatedSettings(config, DEFAULT_RESOURCES_SETTINGS, true);
  },
};
