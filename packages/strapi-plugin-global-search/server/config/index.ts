import { isPlainObject } from "@vicacha-devs/plugin-shared";

import type { PluginSettings } from "../types";

export { isPlainObject };

/**
 * Every value here has a working default: the plugin must run on a fresh app
 * with no `config/plugins.js` entry at all.
 */
export const defaults: PluginSettings = {
  /** Minimum number of characters before a search is executed. */
  minChars: 2,
  /** Client-side debounce, in ms. Served to the admin so both UIs stay in sync. */
  debounce: 250,
  /** Maximum rows fetched per content type, per search. */
  perTypeLimit: 20,
  /** Hard cap on the merged, ranked result set. */
  maxResults: 100,
  /** Search inside nested component fields. */
  deep: true,
  /** How many component levels to walk when collecting searchable paths. */
  maxDepth: 3,
  /** Include unpublished entries (draft & publish types). */
  includeDrafts: true,
  /** Include Content-Manager-visible content types registered by plugins (plugin::*). */
  includePluginContentTypes: true,
  /** Per-content-type query timeout, in ms. */
  queryTimeout: 4000,
  /** Maximum number of content types queried in parallel. */
  concurrency: 8,
  /** Content type UIDs never searched. */
  excludedContentTypes: [],
  /** Field paths never searched, as `uid:path` (e.g. `api::article.article:body`). */
  excludedFields: [],
  /** Up to two extra fields shown next to the main field, keyed by content type UID. */
  displayFields: {},
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export const validator = (config: Partial<PluginSettings> = {}) => {
  if (!isPlainObject(config)) {
    throw new Error("[global-search] config must be a plain object");
  }

  const numbers: Record<string, [number, number]> = {
    minChars: [1, 10],
    debounce: [0, 5000],
    perTypeLimit: [1, 200],
    maxResults: [1, 1000],
    maxDepth: [1, 6],
    queryTimeout: [500, 60000],
    concurrency: [1, 32],
  };

  Object.entries(numbers).forEach(([key, [min, max]]) => {
    if ((config as Record<string, unknown>)[key] === undefined) return;
    const value = (config as Record<string, unknown>)[key];
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < min ||
      value > max
    ) {
      throw new Error(
        `[global-search] config.${key} must be an integer ` +
          `between ${min} and ${max}`
      );
    }
  });

  (["deep", "includeDrafts", "includePluginContentTypes"] as const).forEach(
    (key) => {
      if (config[key] !== undefined && typeof config[key] !== "boolean") {
        throw new Error(`[global-search] config.${key} must be a boolean`);
      }
    }
  );

  (["excludedContentTypes", "excludedFields"] as const).forEach((key) => {
    if (config[key] !== undefined && !isStringArray(config[key])) {
      throw new Error(
        `[global-search] config.${key} must be an array of strings`
      );
    }
  });

  if (config.displayFields !== undefined) {
    const validMap =
      isPlainObject(config.displayFields) &&
      Object.values(config.displayFields).every(isStringArray);
    if (!validMap) {
      throw new Error(
        "[global-search] config.displayFields must map content type UIDs " +
          "to string arrays"
      );
    }
  }
};

const config = {
  default: defaults,
  validator,
  defaults,
};

export default config;
