import {
  ALLOWED_LOCALES,
  DEFAULT_ISLAM_SETTINGS,
  isPlainRecord,
  sanitizeLocale,
  sanitizePlainText,
  sanitizePositiveInt,
  type AdhanAudioProfile,
  type DailyInspirationPins,
  type EidPrayerShift,
  type IqamahRule,
  type JumuahShift,
  type LocalizedStringMap,
  type PrayerNameId,
  type SupportedLocale,
} from "../../../shared";

const ALLOWED_PRAYER_NAMES: ReadonlySet<PrayerNameId> = new Set([
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
  "jumuah",
]);

const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/;

export function isSafeAudioUrl(rawUrl: unknown): rawUrl is string {
  if (typeof rawUrl !== "string") return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048 || CONTROL_CHARS_RE.test(trimmed)) {
    return false;
  }
  if (trimmed.startsWith("/")) {
    return (
      !trimmed.startsWith("//") &&
      !trimmed.includes("\\") &&
      !trimmed.includes("..")
    );
  }
  try {
    const parsed = new URL(trimmed);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

export function sanitizeSafeAudioUrl(rawUrl: unknown, fallback = ""): string {
  if (typeof rawUrl !== "string") return fallback;
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  return isSafeAudioUrl(trimmed) ? trimmed : fallback;
}

export function sanitizeTimeText(raw: unknown, fallback: string): string {
  return sanitizePlainText(raw, 20) || fallback;
}

function sanitizeLocalizedLabels(
  raw: unknown,
  fallback: LocalizedStringMap
): LocalizedStringMap {
  const src = isPlainRecord(raw) ? raw : {};
  return {
    es: sanitizePlainText(src.es, 200) || fallback.es,
    en: sanitizePlainText(src.en, 200) || fallback.en,
    ar: sanitizePlainText(src.ar, 200) || fallback.ar,
    tr: sanitizePlainText(src.tr, 200) || fallback.tr,
  };
}

export function sanitizeSupportedLocales(
  raw: unknown,
  fallback: SupportedLocale[]
): SupportedLocale[] {
  if (!Array.isArray(raw)) return [...fallback];
  const seen = new Set<SupportedLocale>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const candidate = item.trim().toLowerCase().slice(0, 2) as SupportedLocale;
    if ((ALLOWED_LOCALES as readonly string[]).includes(candidate)) {
      seen.add(candidate);
    }
  }
  return seen.size > 0 ? Array.from(seen) : [...fallback];
}

export function sanitizeIqamahRules(
  raw: unknown,
  fallback: IqamahRule[]
): IqamahRule[] {
  if (!Array.isArray(raw)) {
    return fallback.map((rule) => ({ ...rule }));
  }
  const cleaned: IqamahRule[] = [];
  for (const item of raw) {
    if (!isPlainRecord(item) || typeof item.prayerName !== "string") continue;
    const prayerName = item.prayerName.trim() as PrayerNameId;
    if (!ALLOWED_PRAYER_NAMES.has(prayerName)) continue;
    const mode =
      item.mode === "fixed_time" ? "fixed_time" : ("offset_minutes" as const);
    const offsetMinutes = sanitizePositiveInt(item.offsetMinutes, 15, 0, 180);
    const fixedTime = sanitizePlainText(item.fixedTime, 20) || undefined;
    const notes = sanitizePlainText(item.notes, 200) || undefined;
    cleaned.push({
      prayerName,
      mode,
      offsetMinutes,
      ...(fixedTime ? { fixedTime } : {}),
      ...(notes ? { notes } : {}),
    });
  }
  return cleaned.length > 0 ? cleaned : fallback.map((rule) => ({ ...rule }));
}

export function sanitizeJumuahShifts(
  raw: unknown,
  fallback: JumuahShift[]
): JumuahShift[] {
  if (!Array.isArray(raw)) return fallback;
  if (raw.length === 0) return [];
  const defaultLabel = DEFAULT_ISLAM_SETTINGS.jumuahShifts[0].label;
  const cleaned: JumuahShift[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!isPlainRecord(item)) continue;
    const id = sanitizePlainText(item.id, 80) || `jumuah-${i + 1}`;
    const khatibName = sanitizePlainText(item.khatibName, 120) || undefined;
    cleaned.push({
      id,
      label: sanitizeLocalizedLabels(item.label, defaultLabel),
      khutbahTime: sanitizeTimeText(item.khutbahTime, "12:15"),
      prayerTime: sanitizeTimeText(item.prayerTime, "12:45"),
      ...(khatibName ? { khatibName } : {}),
      languages: sanitizeSupportedLocales(item.languages, ["ar", "es"]),
      isPrimary: Boolean(item.isPrimary),
    });
  }
  return cleaned.length > 0 ? cleaned : fallback;
}

export function sanitizeAdhanProfiles(
  raw: unknown,
  fallback: AdhanAudioProfile[]
): AdhanAudioProfile[] {
  if (!Array.isArray(raw)) return fallback;
  if (raw.length === 0) return [];
  const cleaned: AdhanAudioProfile[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!isPlainRecord(item)) continue;
    const id = sanitizePlainText(item.id, 80) || `adhan-${i + 1}`;
    cleaned.push({
      id,
      name: sanitizePlainText(item.name, 160) || id,
      muezzin: sanitizePlainText(item.muezzin, 160),
      origin: sanitizePlainText(item.origin, 120),
      standardAudioUrl: sanitizeSafeAudioUrl(item.standardAudioUrl, ""),
      fajrAudioUrl: sanitizeSafeAudioUrl(item.fajrAudioUrl, ""),
      isDefault: Boolean(item.isDefault),
    });
  }
  return cleaned.length > 0 ? cleaned : fallback;
}

export function sanitizeEidShifts(
  raw: unknown,
  fallback: EidPrayerShift[]
): EidPrayerShift[] {
  if (!Array.isArray(raw)) return fallback;
  if (raw.length === 0) return [];
  const cleaned: EidPrayerShift[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!isPlainRecord(item)) continue;
    const imamName = sanitizePlainText(item.imamName, 120) || undefined;
    const locationNote = sanitizePlainText(item.locationNote, 200) || undefined;
    cleaned.push({
      shiftNumber: sanitizePositiveInt(item.shiftNumber, i + 1, 1, 20),
      takbiratTime: sanitizeTimeText(item.takbiratTime, "07:30"),
      prayerTime: sanitizeTimeText(item.prayerTime, "08:00"),
      khutbahLanguage: sanitizeLocale(item.khutbahLanguage, "es"),
      ...(imamName ? { imamName } : {}),
      ...(locationNote ? { locationNote } : {}),
    });
  }
  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizePositiveResourceIdArray(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<number>();
  for (const entry of raw) {
    const num =
      typeof entry === "number"
        ? entry
        : typeof entry === "string" && /^\d+$/.test(entry.trim())
          ? Number(entry.trim())
          : Number.NaN;
    if (Number.isInteger(num) && num >= 1 && num <= 9999) {
      seen.add(num);
      if (seen.size >= 10) break;
    }
  }
  return seen.size > 0 ? Array.from(seen) : null;
}

export function mergeLocaleResourceIdMap(
  defaultMap: Record<SupportedLocale, number[]>,
  base: Record<SupportedLocale, number[]>,
  first?: unknown,
  second?: unknown
): Record<SupportedLocale, number[]> {
  const f: Record<string, unknown> = isPlainRecord(first) ? first : {};
  const s: Record<string, unknown> = isPlainRecord(second) ? second : {};
  const b: Record<string, unknown> = isPlainRecord(base) ? base : {};
  const result = {} as Record<SupportedLocale, number[]>;
  for (const loc of ALLOWED_LOCALES) {
    result[loc] = sanitizePositiveResourceIdArray(s[loc]) ??
      sanitizePositiveResourceIdArray(f[loc]) ??
      sanitizePositiveResourceIdArray(b[loc]) ?? [...defaultMap[loc]];
  }
  return result;
}

function resolveOptionalPinId(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  return sanitizePlainText(raw, 80) || null;
}

export function sanitizeDailyPins(
  base: DailyInspirationPins,
  first?: unknown,
  second?: unknown
): DailyInspirationPins {
  const merged = {
    ...base,
    ...(isPlainRecord(first) ? first : {}),
    ...(isPlainRecord(second) ? second : {}),
  };
  const rawAsma: unknown = merged.pinnedAsmaNumber;
  return {
    pinnedAyahId: resolveOptionalPinId(merged.pinnedAyahId),
    pinnedHadithId: resolveOptionalPinId(merged.pinnedHadithId),
    pinnedDuaId: resolveOptionalPinId(merged.pinnedDuaId),
    pinnedAsmaNumber:
      rawAsma === null || rawAsma === undefined || rawAsma === ""
        ? null
        : sanitizePositiveInt(rawAsma, 1, 1, 99),
  };
}

function checkLocaleIdMapPatch(
  rawMap: unknown,
  fieldLabel: string
): string | null {
  if (!isPlainRecord(rawMap)) {
    return `Invalid ${fieldLabel} (expected locale object)`;
  }
  for (const loc of ALLOWED_LOCALES) {
    const val = rawMap[loc];
    if (val !== undefined && sanitizePositiveResourceIdArray(val) === null) {
      return `Invalid ${fieldLabel}.${loc} (expected positive integer array)`;
    }
  }
  return null;
}

export function validateNestedSettingsPatchError(
  patch: Record<string, unknown>
): string | null {
  const topArrays = [
    "jumuahShifts",
    "iqamahRules",
    "supportedLocales",
    "adhanProfiles",
  ] as const;
  for (const key of topArrays) {
    if (patch[key] !== undefined && !Array.isArray(patch[key])) {
      return `Invalid ${key} (expected an array)`;
    }
  }
  if (Array.isArray(patch.adhanProfiles)) {
    for (const profile of patch.adhanProfiles) {
      if (!isPlainRecord(profile)) {
        return "Invalid adhanProfiles entry (expected object)";
      }
      for (const field of ["standardAudioUrl", "fajrAudioUrl"] as const) {
        const rawUrl = profile[field];
        if (rawUrl !== undefined && rawUrl !== "" && !isSafeAudioUrl(rawUrl)) {
          return `Invalid or unsafe adhanProfiles.${field}`;
        }
      }
    }
  }
  if (isPlainRecord(patch.eid)) {
    for (const key of ["eidAlFitrShifts", "eidAlAdhaShifts"] as const) {
      if (patch.eid[key] !== undefined && !Array.isArray(patch.eid[key])) {
        return `Invalid eid.${key} (expected an array)`;
      }
    }
  }
  if (isPlainRecord(patch.quranFoundation)) {
    const qf = patch.quranFoundation;
    if (qf.defaultTranslationIdsByLocale !== undefined) {
      const err = checkLocaleIdMapPatch(
        qf.defaultTranslationIdsByLocale,
        "quranFoundation.defaultTranslationIdsByLocale"
      );
      if (err) return err;
    }
    if (qf.defaultTafsirIdsByLocale !== undefined) {
      const err = checkLocaleIdMapPatch(
        qf.defaultTafsirIdsByLocale,
        "quranFoundation.defaultTafsirIdsByLocale"
      );
      if (err) return err;
    }
  }
  return null;
}
