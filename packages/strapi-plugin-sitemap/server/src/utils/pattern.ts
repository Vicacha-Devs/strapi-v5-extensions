const PLACEHOLDER_REGEX = /\[([^\]]+)]/g;

export const getPlaceholders = (pattern: string): string[] =>
  pattern.match(PLACEHOLDER_REGEX) || [];

const stripBrackets = (placeholder: string): string => placeholder.slice(1, -1);

export const getNestedValue = (obj: any, path: string) =>
  path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);

export const parseTableReferences = (pattern: string) => {
  const populate: Record<string, any> = {};
  for (const placeholder of getPlaceholders(pattern)) {
    const parts = stripBrackets(placeholder).split('.');
    if (parts.length < 2) continue;
    parts.pop();
    let current = populate;
    parts.forEach((tableName, i) => {
      if (i === parts.length - 1) {
        current[tableName] = true;
      } else {
        if (!current[tableName] || current[tableName] === true) {
          current[tableName] = { populate: {} };
        }
        current = current[tableName].populate;
      }
    });
  }
  return Object.keys(populate).length > 0 ? { populate } : {};
};

/** Fills the pattern with entry values; returns null when a plain placeholder has no value. */
export const buildEntryUrl = (pattern: string, entry: any, baseURL: string): string | null => {
  let url = pattern;
  for (const placeholder of getPlaceholders(pattern)) {
    const key = stripBrackets(placeholder);
    const nested = key.includes('.');
    const value = nested ? getNestedValue(entry, key) : entry[key];
    if (value !== null && value !== undefined) {
      url = url.replace(placeholder, String(value));
    } else if (nested) {
      url = url.replace(placeholder, '');
    } else {
      return null;
    }
  }
  url = url.replace(/\/+/g, '/');
  return baseURL.replace(/\/$/, '') + (url.startsWith('/') ? url : `/${url}`);
};
