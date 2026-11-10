import pluginId from "../pluginId";
import ar from "../translations/ar.json";
import en from "../translations/en.json";
import es from "../translations/es.json";
import fr from "../translations/fr.json";
import tr from "../translations/tr.json";

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en,
  fr,
  es,
  ar,
  tr,
};

export const getActiveLocale = (): string => {
  if (typeof window === "undefined") return "en";
  try {
    const raw = window.localStorage.getItem("strapi-admin-language");
    if (!raw) return "en";
    const clean = raw.replace(/^"|"$/g, "").trim();
    if (TRANSLATIONS[clean]) return clean;
    const base = clean.split(/[-_]/)[0];
    return TRANSLATIONS[base] ? base : "en";
  } catch {
    return "en";
  }
};

export const t = (
  id: string,
  defaultMessage: string,
  values?: Record<string, string | number>
): string => {
  const locale = getActiveLocale();
  const dict = TRANSLATIONS[locale] || TRANSLATIONS.en || {};
  const template = dict[id] || TRANSLATIONS.en?.[id] || defaultMessage;
  if (!values) return template;

  return Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(String(value)),
    template
  );
};

const getTrad = (id: string): string => `${pluginId}.${id}`;

export default getTrad;
