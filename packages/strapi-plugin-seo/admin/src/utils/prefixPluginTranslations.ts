import { prefixPluginTranslations as sharedPrefixPluginTranslations } from "@vicacha-devs/plugin-shared";

export const prefixPluginTranslations = (
  trad: Record<string, string>,
  pluginId: string
): Record<string, string> => sharedPrefixPluginTranslations(trad, pluginId);
