import type { Core } from "@strapi/strapi";

import {
  BLOCKED_DOWNLOAD_EXTENSIONS,
  BLOCKED_DOWNLOAD_MIME_TYPES,
  DEFAULT_RESOURCES_SETTINGS,
  isSafeObjectKey,
  isValidBcp47Locale,
  PLUGIN_ID,
  SECONDARY_CALENDAR_IDS,
  SETTINGS_STORE_KEY,
  validateMediaFolderPath,
  type PublicSettingsSummary,
  type ResourcesPluginSettings,
} from "../../../shared";
import { ResourceValidationError } from "./errors";

const EXTENSION_FORMAT_REGEX = /^\.[a-z0-9]{1,16}$/;
const MIME_FORMAT_REGEX = /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/;

function sanitizePlainRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const source = raw as Record<string, unknown>;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (Object.hasOwn(source, key) && isSafeObjectKey(key)) {
      clean[key] = value;
    }
  }
  return clean;
}

function normalizeAndValidateExtensions(
  rawList: unknown,
  strict: boolean,
  fallback: string[]
): string[] {
  if (rawList === undefined) return [...fallback];
  if (!Array.isArray(rawList) || rawList.length === 0) {
    if (strict) {
      throw new ResourceValidationError(
        "allowedDownloadExtensions must be a non-empty array"
      );
    }
    return [...fallback];
  }

  const out: string[] = [];
  for (const item of rawList) {
    if (typeof item !== "string" || !item.trim()) {
      if (strict) {
        throw new ResourceValidationError("Invalid download extension entry");
      }
      continue;
    }
    const normalized = (
      item.trim().startsWith(".") ? item.trim() : `.${item.trim()}`
    ).toLowerCase();
    if (!EXTENSION_FORMAT_REGEX.test(normalized)) {
      if (strict) {
        throw new ResourceValidationError(
          `Invalid download extension format "${normalized}"`
        );
      }
      continue;
    }
    if (BLOCKED_DOWNLOAD_EXTENSIONS.includes(normalized)) {
      if (strict) {
        throw new ResourceValidationError(
          `Active-script or executable extension "${normalized}" is not allowed`
        );
      }
      continue;
    }
    if (!out.includes(normalized)) {
      out.push(normalized);
    }
  }

  if (out.length === 0) {
    if (strict) {
      throw new ResourceValidationError(
        "allowedDownloadExtensions must contain at least one safe extension"
      );
    }
    return [...fallback];
  }
  return out;
}

function normalizeAndValidateMimes(
  rawList: unknown,
  strict: boolean,
  fallback: string[]
): string[] {
  if (rawList === undefined) return [...fallback];
  if (!Array.isArray(rawList) || rawList.length === 0) {
    if (strict) {
      throw new ResourceValidationError(
        "allowedDownloadMimeTypes must be a non-empty array"
      );
    }
    return [...fallback];
  }

  const out: string[] = [];
  for (const item of rawList) {
    if (typeof item !== "string" || !item.trim()) {
      if (strict) {
        throw new ResourceValidationError("Invalid download MIME type entry");
      }
      continue;
    }
    const normalized = item.trim().toLowerCase();
    if (!MIME_FORMAT_REGEX.test(normalized)) {
      if (strict) {
        throw new ResourceValidationError(
          `Invalid download MIME type format "${normalized}"`
        );
      }
      continue;
    }
    if (BLOCKED_DOWNLOAD_MIME_TYPES.includes(normalized)) {
      if (strict) {
        throw new ResourceValidationError(
          `Active-script or executable MIME type "${normalized}" is not allowed`
        );
      }
      continue;
    }
    if (!out.includes(normalized)) {
      out.push(normalized);
    }
  }

  if (out.length === 0) {
    if (strict) {
      throw new ResourceValidationError(
        "allowedDownloadMimeTypes must contain at least one safe MIME type"
      );
    }
    return [...fallback];
  }
  return out;
}

function resolveLocaleSetting(
  val: unknown,
  strict: boolean,
  fallback: string
): string {
  if (val === undefined) return fallback;
  if (!isValidBcp47Locale(val)) {
    if (strict) {
      throw new ResourceValidationError(
        "defaultLocale must be a valid BCP-47 language tag"
      );
    }
    return fallback;
  }
  return val.trim();
}

function resolveSupportedLocales(
  val: unknown,
  strict: boolean,
  fallback: string[]
): string[] {
  if (val === undefined) return [...fallback];
  if (!Array.isArray(val) || val.length === 0) {
    if (strict) {
      throw new ResourceValidationError(
        "supportedLocales must be a non-empty array of BCP-47 locales"
      );
    }
    return [...fallback];
  }
  const out: string[] = [];
  for (const entry of val) {
    if (!isValidBcp47Locale(entry)) {
      if (strict) {
        throw new ResourceValidationError(
          `Invalid BCP-47 locale in supportedLocales: "${String(entry)}"`
        );
      }
      continue;
    }
    const trimmed = entry.trim();
    if (!out.includes(trimmed)) {
      out.push(trimmed);
    }
  }
  return out.length > 0 ? out : [...fallback];
}

function resolveFolderPathSetting(
  val: unknown,
  fieldLabel: string,
  strict: boolean,
  fallback: string
): string {
  if (val === undefined) return fallback;
  const check = validateMediaFolderPath(val);
  if (!check.valid || !check.data) {
    if (strict) {
      throw new ResourceValidationError(
        `${fieldLabel}: ${check.errors.join("; ")}`
      );
    }
    return fallback;
  }
  return check.data;
}

function resolveCalendarSetting(
  val: unknown,
  strict: boolean,
  fallback: string
): string {
  if (val === undefined) return fallback;
  if (typeof val === "string" && SECONDARY_CALENDAR_IDS.includes(val.trim())) {
    return val.trim();
  }
  if (strict) {
    throw new ResourceValidationError(
      `Unsupported secondaryCalendar: "${String(val)}"`
    );
  }
  return fallback;
}

function pickTrimmedString(
  val: unknown,
  fallback: string,
  maxLen: number
): string {
  if (typeof val !== "string" || !val.trim()) return fallback;
  return val.trim().slice(0, maxLen);
}

function pickBoolean(val: unknown, fallback: boolean): boolean {
  return typeof val === "boolean" ? val : fallback;
}

function pickBoundedInt(
  val: unknown,
  min: number,
  max: number,
  strict: boolean,
  fallback: number
): number {
  if (val === undefined) return fallback;
  if (typeof val === "boolean" || val === null || val === "") {
    if (strict) {
      throw new ResourceValidationError(
        `maxPhotosPerAlbum must be between ${min} and ${max}`
      );
    }
    return fallback;
  }
  const num = Number(val);
  const rounded = Math.round(num);
  if (!Number.isFinite(num) || rounded < min || rounded > max) {
    if (strict) {
      throw new ResourceValidationError(
        `maxPhotosPerAlbum must be between ${min} and ${max}`
      );
    }
    return fallback;
  }
  return rounded;
}

export function buildValidatedSettings(
  rawInput: unknown,
  base: ResourcesPluginSettings,
  strict: boolean
): ResourcesPluginSettings {
  const input = sanitizePlainRecord(rawInput);
  return {
    organizationName: pickTrimmedString(
      input.organizationName,
      base.organizationName,
      140
    ),
    defaultLocale: resolveLocaleSetting(
      input.defaultLocale,
      strict,
      base.defaultLocale
    ),
    supportedLocales: resolveSupportedLocales(
      input.supportedLocales,
      strict,
      base.supportedLocales
    ),
    secondaryCalendar: resolveCalendarSetting(
      input.secondaryCalendar,
      strict,
      base.secondaryCalendar
    ),
    enableCloudinaryOptimization: pickBoolean(
      input.enableCloudinaryOptimization,
      base.enableCloudinaryOptimization
    ),
    autoSyncMediaFolders: pickBoolean(
      input.autoSyncMediaFolders,
      base.autoSyncMediaFolders
    ),
    defaultPublicationsFolderPath: resolveFolderPathSetting(
      input.defaultPublicationsFolderPath,
      "defaultPublicationsFolderPath",
      strict,
      base.defaultPublicationsFolderPath
    ),
    defaultGalleriesFolderPath: resolveFolderPathSetting(
      input.defaultGalleriesFolderPath,
      "defaultGalleriesFolderPath",
      strict,
      base.defaultGalleriesFolderPath
    ),
    allowedDownloadExtensions: normalizeAndValidateExtensions(
      input.allowedDownloadExtensions,
      strict,
      base.allowedDownloadExtensions
    ),
    allowedDownloadMimeTypes: normalizeAndValidateMimes(
      input.allowedDownloadMimeTypes,
      strict,
      base.allowedDownloadMimeTypes
    ),
    maxPhotosPerAlbum: pickBoundedInt(
      input.maxPhotosPerAlbum,
      1,
      500,
      strict,
      base.maxPhotosPerAlbum
    ),
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getStore = () =>
    strapi.store({
      type: "plugin",
      name: PLUGIN_ID,
    });

  const getDefaultSettings = (): ResourcesPluginSettings => {
    const cfg = strapi.config?.get?.(`plugin::${PLUGIN_ID}`) ?? {};
    return buildValidatedSettings(cfg, DEFAULT_RESOURCES_SETTINGS, false);
  };

  return {
    async getSettings(): Promise<ResourcesPluginSettings> {
      const defaults = getDefaultSettings();
      try {
        const stored = await getStore().get({ key: SETTINGS_STORE_KEY });
        if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
          return defaults;
        }
        return buildValidatedSettings(stored, defaults, false);
      } catch {
        return defaults;
      }
    },

    async updateSettings(
      input: Partial<ResourcesPluginSettings> | unknown
    ): Promise<ResourcesPluginSettings> {
      if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new ResourceValidationError("Settings payload must be an object");
      }
      const current = await this.getSettings();
      const next = buildValidatedSettings(input, current, true);

      await getStore().set({
        key: SETTINGS_STORE_KEY,
        value: next,
      });
      return next;
    },

    async getPublicSummary(): Promise<PublicSettingsSummary> {
      const settings = await this.getSettings();
      return {
        organizationName: settings.organizationName,
        defaultLocale: settings.defaultLocale,
        supportedLocales: settings.supportedLocales,
        secondaryCalendar: settings.secondaryCalendar,
      };
    },
  };
};
