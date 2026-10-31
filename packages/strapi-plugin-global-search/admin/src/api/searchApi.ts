import { getFetchClient } from '@strapi/strapi/admin';
import pluginId from '../pluginId';
import type {
  LocaleOption,
  PluginSettings,
  SchemaResponse,
  SearchResponse,
} from '../types';

export interface SearchParams {
  q: string;
  types?: string[];
  locale?: string;
  page?: number;
  pageSize?: number;
}

/**
 * `getFetchClient` reads the admin JWT itself and needs no React context, so the
 * same calls work from the plugin page and from the body-mounted palette.
 */
export const searchEntries = async (
  params: SearchParams,
  signal?: AbortSignal
): Promise<SearchResponse> => {
  const { get } = getFetchClient();
  const { data } = await get(`/${pluginId}/search`, { params, signal });

  return data as SearchResponse;
};

export const fetchSearchableTypes = async (): Promise<SchemaResponse> => {
  const { get } = getFetchClient();
  const { data } = await get(`/${pluginId}/schema`);

  return data as SchemaResponse;
};

export const fetchAllTypes = async (): Promise<SchemaResponse> => {
  const { get } = getFetchClient();
  const { data } = await get(`/${pluginId}/schema/all`);

  return data as SchemaResponse;
};

export const fetchSettings = async (): Promise<PluginSettings> => {
  const { get } = getFetchClient();
  const { data } = await get(`/${pluginId}/settings`);

  return data as PluginSettings;
};

export const updateSettings = async (body: PluginSettings): Promise<PluginSettings> => {
  const { put } = getFetchClient();
  const { data } = await put(`/${pluginId}/settings`, body);

  return data as PluginSettings;
};

export const resetSettings = async (): Promise<PluginSettings> => {
  const { post } = getFetchClient();
  const { data } = await post(`/${pluginId}/settings/reset`);

  return data as PluginSettings;
};

/** i18n is optional — a 404 here just means locales are not configured. */
export const fetchLocales = async (): Promise<LocaleOption[]> => {
  try {
    const { get } = getFetchClient();
    const { data } = await get('/i18n/locales');

    return Array.isArray(data) ? (data as LocaleOption[]) : [];
  } catch (error) {
    return [];
  }
};

export const isCanceled = (error: unknown): boolean => {
  const err = error as { name?: string; code?: string } | null | undefined;

  return Boolean(err) && (err!.name === 'CanceledError' || err!.code === 'ERR_CANCELED');
};
