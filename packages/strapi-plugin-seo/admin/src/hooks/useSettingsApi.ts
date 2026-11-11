import { useFetchClient } from "@strapi/strapi/admin";

import type { SeoSettingsMap } from "../../../shared";
import { pluginId } from "../pluginId";

export const useSettingsApi = () => {
  const { get, post } = useFetchClient();

  const getSettings = async () => {
    return get<SeoSettingsMap>(`/${pluginId}/settings`);
  };

  const setSettings = async (settings: SeoSettingsMap) => {
    return post<SeoSettingsMap>(`/${pluginId}/settings`, settings);
  };

  return {
    getSettings,
    setSettings,
  };
};
