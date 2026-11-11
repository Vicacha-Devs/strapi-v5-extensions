import { PLUGIN_ID } from "../pluginId";

export const getTranslation = (id: string): string => `${PLUGIN_ID}.${id}`;
export default getTranslation;
