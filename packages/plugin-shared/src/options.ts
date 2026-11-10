export const LOCALE_OPTIONS: Array<{ value: string; label: string }> = [
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
];

export const SECONDARY_CALENDAR_OPTIONS: Array<{
  value: string;
  label: string;
}> = [
  { value: "islamic-umalqura", label: "islamic-umalqura (Hijri Umm al-Qura)" },
  { value: "islamic-civil", label: "islamic-civil (Tabular Islamic Civil)" },
  { value: "islamic-tbla", label: "islamic-tbla (Tabular Astronomical)" },
  { value: "hebrew", label: "hebrew (Hebrew)" },
  { value: "persian", label: "persian (Solar Hijri)" },
  { value: "none", label: "none (Gregorian Only)" },
];

export function mergeSelectOptions<T extends string = string>(
  predefined: Array<{ value: T; label: string }>,
  currentValues: string[] = []
): Array<{ value: string; label: string }> {
  const known = new Set<string>(predefined.map((opt) => opt.value));
  const extras = currentValues
    .filter((val) => val && !known.has(val))
    .map((val) => ({ value: val, label: val }));
  return [...predefined, ...extras];
}

export function parseCsvList(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
