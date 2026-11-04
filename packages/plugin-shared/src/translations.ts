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
  if (!pluginId) {
    throw new TypeError("pluginId can't be empty");
  }

  const result: Record<string, string> = {
    ...options?.baseTranslations,
  };

  for (const [key, value] of Object.entries(trad)) {
    if (options?.keepUnprefixed) {
      result[key] = value;
    }
    const fullKey = key.startsWith(`${pluginId}.`) ? key : `${pluginId}.${key}`;
    result[fullKey] = value;
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
    loadTranslation,
    translations,
    getBaseTranslations,
    onLoaded,
  } = options;

  return async function registerTrads({
    locales = [],
  }: { locales?: string[] } = {}): Promise<
    Array<{ data: Record<string, string>; locale: string }>
  > {
    const allLocales = Array.from(new Set([...locales, ...defaultLocales]));

    return Promise.all(
      allLocales.map(async (locale) => {
        if (supportedLocales && !supportedLocales.includes(locale)) {
          return { data: {}, locale };
        }
        try {
          let rawData: Record<string, string> | undefined =
            translations?.[locale];
          if (!rawData && loadTranslation) {
            const loaded = await loadTranslation(locale);
            rawData = (
              loaded && "default" in loaded && loaded.default
                ? loaded.default
                : loaded
            ) as Record<string, string>;
          }
          if (!rawData) {
            return { data: {}, locale };
          }
          const prefixed = prefixPluginTranslations(rawData, pluginId, {
            keepUnprefixed,
            baseTranslations: getBaseTranslations
              ? getBaseTranslations(locale)
              : undefined,
          });
          onLoaded?.(locale, prefixed);
          return { data: prefixed, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  };
}
