import { FORBIDDEN_OBJECT_KEYS as FORBIDDEN_TRANSLATION_KEYS } from "./security.ts";

const VALID_LOCALE_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,4}$/;

function isTranslationRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractDictionary(
  loaded: unknown
): Record<string, string> | undefined {
  if (!isTranslationRecord(loaded)) {
    return undefined;
  }
  if ("default" in loaded) {
    return isTranslationRecord(loaded.default)
      ? (loaded.default as Record<string, string>)
      : undefined;
  }
  return loaded as Record<string, string>;
}

function getLookupCandidates(
  locale: string,
  fallbackToLanguage: boolean
): string[] {
  const trimmed = locale.trim().replace(/_/g, "-");
  if (!VALID_LOCALE_RE.test(trimmed)) {
    return [];
  }
  const lower = trimmed.toLowerCase();
  const list: string[] = [trimmed];
  if (lower !== trimmed) {
    list.push(lower);
  }
  if (fallbackToLanguage && trimmed.includes("-")) {
    const base = lower.split("-")[0];
    if (base && !list.includes(base)) {
      list.push(base);
    }
  }
  return list;
}

export interface PrefixTranslationsOptions {
  /** Also retain the original unprefixed key in the returned dictionary */
  keepUnprefixed?: boolean;
  /** Base translations to merge before applying `trad` */
  baseTranslations?: Record<string, string>;
}

export function prefixPluginTranslations(
  trad: Record<string, string>,
  pluginId: string,
  options?: PrefixTranslationsOptions
): Record<string, string> {
  const normalizedPluginId =
    typeof pluginId === "string" ? pluginId.trim() : "";
  if (!normalizedPluginId) {
    throw new TypeError("pluginId can't be empty");
  }

  const result: Record<string, string> = {};
  if (options?.baseTranslations) {
    for (const [key, value] of Object.entries(options.baseTranslations)) {
      if (typeof value === "string" && !FORBIDDEN_TRANSLATION_KEYS.has(key)) {
        result[key] = value;
      }
    }
  }

  const prefix = `${normalizedPluginId}.`;
  const explicitPrefixed: Array<[string, string]> = [];

  for (const [key, value] of Object.entries(trad)) {
    if (typeof value !== "string" || FORBIDDEN_TRANSLATION_KEYS.has(key)) {
      continue;
    }
    if (options?.keepUnprefixed) {
      result[key] = value;
    }
    if (key.startsWith(prefix)) {
      explicitPrefixed.push([key, value]);
    } else {
      result[`${prefix}${key}`] = value;
    }
  }

  for (const [key, value] of explicitPrefixed) {
    if (!FORBIDDEN_TRANSLATION_KEYS.has(key)) {
      result[key] = value;
    }
  }

  return result;
}

export interface CreateRegisterTradsOptions {
  pluginId: string;
  /** Default locales always loaded in addition to `locales` passed by Strapi */
  defaultLocales?: readonly string[];
  /** Optional allowlist of supported locales; if set, only locales in this list are loaded */
  supportedLocales?: readonly string[];
  /** Also retain unprefixed translation keys (default: true) */
  keepUnprefixed?: boolean;
  /** Fall back to primary BCP-47 language subtag (e.g. `pt-BR` -> `pt`) when exact locale misses (default: true) */
  fallbackToLanguageCode?: boolean;
  /** Loader function called per locale (e.g. `(locale) => import(\`./translations/\${locale}.json\`)`) */
  loadTranslation?: (
    locale: string
  ) => Promise<{ default?: Record<string, string> } | Record<string, string>>;
  /** Static translation dictionary map keyed by locale */
  translations?: Record<string, Record<string, string>>;
  /** Optional base translations (e.g. Content-Manager label/placeholder overrides) per locale */
  getBaseTranslations?: (locale: string) => Record<string, string>;
  /** Optional hook invoked after a locale dictionary is prefixed */
  onLoaded?: (locale: string, prefixed: Record<string, string>) => void;
}

export function createRegisterTrads(
  options: CreateRegisterTradsOptions
): ({
  locales,
}?: {
  locales?: string[];
}) => Promise<Array<{ data: Record<string, string>; locale: string }>> {
  const {
    pluginId,
    defaultLocales = ["en", "es", "ar", "tr"],
    supportedLocales,
    keepUnprefixed = true,
    fallbackToLanguageCode = true,
    loadTranslation,
    translations,
    getBaseTranslations,
    onLoaded,
  } = options;

  const normalizedPluginId =
    typeof pluginId === "string" ? pluginId.trim() : "";
  if (!normalizedPluginId) {
    throw new TypeError("pluginId can't be empty");
  }

  const supportedSet = supportedLocales ? new Set(supportedLocales) : undefined;
  const effectiveDefaults = supportedSet
    ? defaultLocales.filter((loc) =>
        getLookupCandidates(loc, fallbackToLanguageCode).some((candidate) =>
          supportedSet.has(candidate)
        )
      )
    : defaultLocales;

  return async function registerTrads({
    locales = [],
  }: { locales?: string[] } = {}): Promise<
    Array<{ data: Record<string, string>; locale: string }>
  > {
    const allLocales =
      effectiveDefaults.length > 0
        ? Array.from(new Set([...locales, ...effectiveDefaults]))
        : Array.from(new Set(locales));

    return Promise.all(
      allLocales.map(async (locale) => {
        const candidates = getLookupCandidates(locale, fallbackToLanguageCode);
        if (candidates.length === 0) {
          return { data: {}, locale };
        }
        if (
          supportedSet &&
          !candidates.some((candidate) => supportedSet.has(candidate))
        ) {
          return { data: {}, locale };
        }

        let rawData: Record<string, string> | undefined;
        let matchedCandidate: string | undefined;
        for (const candidate of candidates) {
          if (translations && Object.hasOwn(translations, candidate)) {
            rawData = extractDictionary(translations[candidate]);
            if (rawData) {
              matchedCandidate = candidate;
              break;
            }
          }
          if (loadTranslation) {
            try {
              const loaded = await loadTranslation(candidate);
              rawData = extractDictionary(loaded);
              if (rawData) {
                matchedCandidate = candidate;
                break;
              }
            } catch {
              // Expected when a locale file does not exist; try next candidate
            }
          }
        }

        const baseTranslations = getBaseTranslations?.(
          matchedCandidate ?? locale
        );
        const hasBase =
          Boolean(baseTranslations) &&
          Object.keys(baseTranslations as Record<string, string>).length > 0;

        if (!rawData && !hasBase) {
          return { data: {}, locale };
        }

        const prefixed = prefixPluginTranslations(
          rawData ?? {},
          normalizedPluginId,
          {
            keepUnprefixed,
            baseTranslations,
          }
        );
        onLoaded?.(locale, prefixed);
        return { data: prefixed, locale };
      })
    );
  };
}
