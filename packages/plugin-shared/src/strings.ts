/**
 * Linear-time string helpers shared by all plugins.
 *
 * They replace patterns such as `.replace(/^-+|-+$/g, "")` and
 * `.replace(/\/+$/, "")`, which are super-linear on long runs of the
 * trimmed character.
 */

/** Removes every leading and trailing occurrence of `char` in one pass. */
export function trimEdgeChars(value: string, char: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && value[start] === char) start++;
  while (end > start && value[end - 1] === char) end--;
  return value.slice(start, end);
}

/** Removes every trailing "/" in one pass (replaces `.replace(/\/+$/, "")`). */
export function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) end--;
  return value.slice(0, end);
}

export interface SlugifyOptions {
  /** Replacement for every run of characters outside `a-z0-9`. Default `-`. */
  separator?: string;
  /** Maximum length, applied last (no re-trim). Default: unlimited. */
  maxLength?: number;
  /**
   * Unicode normalization applied before diacritics are stripped, or `false`
   * to keep accented letters out of the slug as separators. Default `NFD`.
   */
  normalization?: "NFD" | "NFKD" | false;
}

export function slugify(input: string, options: SlugifyOptions = {}): string {
  const { separator = "-", maxLength, normalization = "NFD" } = options;
  let text = input.toLowerCase();
  if (normalization) {
    text = text.normalize(normalization).replace(/[̀-ͯ]/g, "");
  }
  const slug = trimEdgeChars(text.replace(/[^a-z0-9]+/g, separator), separator);
  return maxLength === undefined ? slug : slug.slice(0, maxLength);
}
