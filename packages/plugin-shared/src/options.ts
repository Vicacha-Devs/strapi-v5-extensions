export interface SelectOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
}

function freezeOptions<T extends string>(
  items: ReadonlyArray<SelectOption<T>>
): readonly SelectOption<T>[] {
  return Object.freeze(items.map((item) => Object.freeze({ ...item })));
}

export const LOCALE_OPTIONS: readonly SelectOption[] = freezeOptions([
  { value: "es", label: "es — Español (Spanish)" },
  { value: "en", label: "en — English" },
  { value: "ar", label: "ar — العربية (Arabic)" },
  { value: "tr", label: "tr — Türkçe (Turkish)" },
  { value: "fr", label: "fr — Français (French)" },
  { value: "de", label: "de — Deutsch (German)" },
  { value: "pt", label: "pt — Português (Portuguese)" },
  { value: "it", label: "it — Italiano (Italian)" },
  { value: "nl", label: "nl — Nederlands (Dutch)" },
  { value: "pl", label: "pl — Polski (Polish)" },
  { value: "ru", label: "ru — Русский (Russian)" },
  { value: "id", label: "id — Bahasa Indonesia" },
  { value: "ur", label: "ur — اردو (Urdu)" },
  { value: "zh", label: "zh — 中文 (Chinese)" },
]);

export const SECONDARY_CALENDAR_OPTIONS: readonly SelectOption[] =
  freezeOptions([
    {
      value: "islamic-umalqura",
      label: "islamic-umalqura (Hijri Umm al-Qura)",
    },
    { value: "islamic-civil", label: "islamic-civil (Tabular Islamic Civil)" },
    { value: "islamic-tbla", label: "islamic-tbla (Tabular Astronomical)" },
    { value: "hebrew", label: "hebrew (Hebrew)" },
    { value: "persian", label: "persian (Solar Hijri)" },
    { value: "none", label: "none (Gregorian Only)" },
  ]);

export function mergeSelectOptions<T extends string = string>(
  predefined: ReadonlyArray<{ readonly value: T; readonly label: string }>,
  currentValues?: ReadonlyArray<string | null | undefined> | null
): Array<{ value: T | (string & {}); label: string }> {
  const known = new Set<string>(predefined.map((opt) => opt.value));
  const merged: Array<{ value: T | (string & {}); label: string }> =
    predefined.map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));

  for (const raw of currentValues ?? []) {
    const val = typeof raw === "string" ? raw.trim() : "";
    if (val && !known.has(val)) {
      known.add(val);
      merged.push({ value: val, label: val });
    }
  }

  return merged;
}

/**
 * Splits a comma-separated string into unique, trimmed, non-empty values.
 * Note: For controlled text inputs, maintain a local draft string in UI state
 * rather than re-joining `parseCsvList(e.target.value)` on every keystroke.
 */
export function parseCsvList(raw: string | null | undefined): string[] {
  if (typeof raw !== "string" || !raw) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const segment of raw.split(",")) {
    const item = segment.trim();
    if (item && !seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}
