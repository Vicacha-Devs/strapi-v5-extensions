import type { Core } from "@strapi/strapi";

import {
  DEFAULT_ISLAM_SETTINGS,
  isPlainRecord,
  isValidApiContentTypeUid,
  sanitizeAsrSchool,
  sanitizeCalendarMethod,
  sanitizeCoordinates,
  sanitizeHijriShift,
  sanitizeMethodId,
  sanitizeSafeFieldName,
  type FaithPageFieldMapping,
  type IslamPluginSettings,
  type PrayerSettingFieldMapping,
} from "../../../shared";
import { sanitizeIqamahRules } from "./settingsNestedSanitizers";

type PrayerMappingFields = PrayerSettingFieldMapping["fields"];

interface CalendarSecondaryEntry {
  id?: string;
  intlCalendar?: string;
  dayOffset?: number;
  [key: string]: unknown;
}

interface CalendarBridgeSettings {
  secondaryCalendars?: CalendarSecondaryEntry[];
  [key: string]: unknown;
}

interface CalendarSettingsBridgeService {
  getSettings?: () => Promise<CalendarBridgeSettings>;
  updateSettings?: (
    patch: CalendarBridgeSettings
  ) => Promise<CalendarBridgeSettings>;
}

interface DonationsBenchmarkEntry {
  key?: string;
  unitPricesByCurrency?: Record<string, number>;
  [key: string]: unknown;
}

interface DonationsProfileEntry {
  benchmarks?: DonationsBenchmarkEntry[];
  [key: string]: unknown;
}

interface DonationsBridgeSettings {
  assessmentProfiles?: DonationsProfileEntry[];
  [key: string]: unknown;
}

interface DonationsSettingsBridgeService {
  getSettings?: () => Promise<DonationsBridgeSettings>;
  updateSettings?: (
    patch: DonationsBridgeSettings
  ) => Promise<DonationsBridgeSettings>;
}

export function sanitizePrayerSettingMapping(
  raw: unknown,
  fallback = DEFAULT_ISLAM_SETTINGS.prayerSettingMapping!
): PrayerSettingFieldMapping {
  if (!isPlainRecord(raw)) {
    return fallback;
  }
  const hasExplicitUid = raw.uid !== undefined;
  const rawUid = raw.uid;
  const validUid =
    typeof rawUid === "string" && isValidApiContentTypeUid(rawUid);
  const uid = validUid ? rawUid.trim() : fallback.uid;
  const enabled =
    hasExplicitUid && !validUid
      ? false
      : typeof raw.enabled === "boolean"
        ? raw.enabled
        : fallback.enabled;

  const rawFields = isPlainRecord(raw.fields) ? raw.fields : {};
  const fb = fallback.fields;
  return {
    enabled,
    uid,
    fields: {
      method: sanitizeSafeFieldName(rawFields.method, fb.method),
      school: sanitizeSafeFieldName(rawFields.school, fb.school),
      calender: sanitizeSafeFieldName(rawFields.calender, fb.calender),
      shifting: sanitizeSafeFieldName(rawFields.shifting, fb.shifting),
      defaultLat: sanitizeSafeFieldName(rawFields.defaultLat, fb.defaultLat),
      defaultLon: sanitizeSafeFieldName(rawFields.defaultLon, fb.defaultLon),
      iqamahRules: sanitizeSafeFieldName(rawFields.iqamahRules, fb.iqamahRules),
      jumuahKhutbahTime: sanitizeSafeFieldName(
        rawFields.jumuahKhutbahTime,
        fb.jumuahKhutbahTime
      ),
      jumuahPrayerTime: sanitizeSafeFieldName(
        rawFields.jumuahPrayerTime,
        fb.jumuahPrayerTime
      ),
      ramadanBannerActive: sanitizeSafeFieldName(
        rawFields.ramadanBannerActive,
        fb.ramadanBannerActive
      ),
      ramadanNotes: sanitizeSafeFieldName(
        rawFields.ramadanNotes,
        fb.ramadanNotes
      ),
    },
  };
}

export function sanitizeFaithPageMapping(
  raw: unknown,
  fallback = DEFAULT_ISLAM_SETTINGS.faithPageMapping!
): FaithPageFieldMapping {
  if (!isPlainRecord(raw)) {
    return fallback;
  }
  const hasExplicitUid = raw.uid !== undefined;
  const rawUid = raw.uid;
  const validUid =
    typeof rawUid === "string" && isValidApiContentTypeUid(rawUid);
  const uid = validUid ? rawUid.trim() : fallback.uid;
  const enabled =
    hasExplicitUid && !validUid
      ? false
      : typeof raw.enabled === "boolean"
        ? raw.enabled
        : fallback.enabled;

  const rawFields = isPlainRecord(raw.fields) ? raw.fields : {};
  const fb = fallback.fields;
  return {
    enabled,
    uid,
    fields: {
      heroTitle: sanitizeSafeFieldName(rawFields.heroTitle, fb.heroTitle),
      heroSubtitle: sanitizeSafeFieldName(
        rawFields.heroSubtitle,
        fb.heroSubtitle
      ),
      introText: sanitizeSafeFieldName(rawFields.introText, fb.introText),
      shahadaArabic: sanitizeSafeFieldName(
        rawFields.shahadaArabic,
        fb.shahadaArabic
      ),
      shahadaTransliteration: sanitizeSafeFieldName(
        rawFields.shahadaTransliteration,
        fb.shahadaTransliteration
      ),
      shahadaTranslation: sanitizeSafeFieldName(
        rawFields.shahadaTranslation,
        fb.shahadaTranslation
      ),
      fivePillars: sanitizeSafeFieldName(rawFields.fivePillars, fb.fivePillars),
      newMuslimGuidePdf: sanitizeSafeFieldName(
        rawFields.newMuslimGuidePdf,
        fb.newMuslimGuidePdf
      ),
    },
  };
}

function applyHostPrayerFields(
  merged: IslamPluginSettings,
  doc: Record<string, unknown>,
  f: PrayerMappingFields
): void {
  if (doc[f.method] !== undefined) {
    merged.method = sanitizeMethodId(doc[f.method], merged.method);
  }
  if (doc[f.school] !== undefined) {
    merged.school = sanitizeAsrSchool(doc[f.school], merged.school);
  }
  if (doc[f.calender] !== undefined) {
    merged.calender = sanitizeCalendarMethod(doc[f.calender], merged.calender);
  }
  if (doc[f.shifting] !== undefined) {
    merged.shifting = sanitizeHijriShift(doc[f.shifting], merged.shifting);
  }
  if (doc[f.defaultLat] !== undefined || doc[f.defaultLon] !== undefined) {
    const coords = sanitizeCoordinates(
      doc[f.defaultLat] ?? merged.defaultLat,
      doc[f.defaultLon] ?? merged.defaultLon,
      merged.defaultLat,
      merged.defaultLon
    );
    merged.defaultLat = coords.lat;
    merged.defaultLon = coords.lon;
  }
  const rawRules = doc[f.iqamahRules];
  if (Array.isArray(rawRules) && rawRules.length > 0) {
    merged.iqamahRules = sanitizeIqamahRules(rawRules, merged.iqamahRules);
  }
  if (typeof doc[f.ramadanBannerActive] === "boolean") {
    merged.ramadan.bannerActive = Boolean(doc[f.ramadanBannerActive]);
  }
  const rawNotes = doc[f.ramadanNotes];
  if (typeof rawNotes === "string" && rawNotes.trim()) {
    merged.ramadan.notes[merged.defaultLocale] = rawNotes;
  }
}

export async function hydrateFromHostPrayerSetting(
  strapi: Core.Strapi,
  merged: IslamPluginSettings
): Promise<void> {
  const mapping = merged.prayerSettingMapping;
  if (
    !mapping?.enabled ||
    !isValidApiContentTypeUid(mapping.uid) ||
    !strapi.contentTypes?.[mapping.uid]
  ) {
    return;
  }
  try {
    const docs = await strapi.documents(mapping.uid).findMany({
      limit: 1,
      locale: merged.defaultLocale || "es",
      populate: [mapping.fields.iqamahRules],
    });
    const doc = docs?.[0];
    if (!doc) return;
    applyHostPrayerFields(merged, doc, mapping.fields);
  } catch {
    // Resilient fallback if host table is not yet migrated
  }
}

function buildHostPrayerDataPayload(
  next: IslamPluginSettings,
  f: PrayerMappingFields
): Record<string, unknown> {
  const primaryJumuah = next.jumuahShifts?.[0];
  return {
    [f.method]: next.method,
    [f.school]: next.school,
    [f.calender]: next.calender,
    [f.shifting]: next.shifting,
    [f.defaultLat]: next.defaultLat,
    [f.defaultLon]: next.defaultLon,
    [f.jumuahKhutbahTime]: primaryJumuah?.khutbahTime || "12:15 PM",
    [f.jumuahPrayerTime]: primaryJumuah?.prayerTime || "12:45 PM",
    [f.ramadanBannerActive]: next.ramadan.bannerActive,
    [f.ramadanNotes]:
      next.ramadan.notes[next.defaultLocale] || next.ramadan.notes.es || "",
  };
}

export async function syncToHostPrayerSetting(
  strapi: Core.Strapi,
  next: IslamPluginSettings
): Promise<void> {
  const mapping = next.prayerSettingMapping;
  if (
    !mapping?.enabled ||
    !isValidApiContentTypeUid(mapping.uid) ||
    !strapi.contentTypes?.[mapping.uid]
  ) {
    return;
  }
  try {
    const locale = next.defaultLocale || "es";
    const docs = await strapi
      .documents(mapping.uid)
      .findMany({ limit: 1, locale });
    const existingDoc = docs?.[0];
    if (!existingDoc?.documentId) return;
    await strapi.documents(mapping.uid).update({
      documentId: String(existingDoc.documentId),
      locale,
      data: buildHostPrayerDataPayload(next, mapping.fields),
    });
  } catch {
    // Non-fatal if host model validation differs
  }
}

function isHijriSecondaryCalendar(entry: CalendarSecondaryEntry): boolean {
  return (
    entry.id === "hijri" ||
    String(entry.intlCalendar || "").startsWith("islamic")
  );
}

export async function syncHijriOffsetToCalendarBridge(
  strapi: Core.Strapi,
  next: IslamPluginSettings
): Promise<void> {
  if (!next.enableCalendarBridge) return;
  try {
    const calService = strapi
      .plugin("calendar")
      ?.service<CalendarSettingsBridgeService | undefined>("settings");
    if (!calService?.getSettings || !calService?.updateSettings) return;
    const calSettings = await calService.getSettings();
    if (!Array.isArray(calSettings?.secondaryCalendars)) return;

    const intlCalendar =
      next.calender === "MATHEMATICAL" ? "islamic-civil" : "islamic-umalqura";
    const updatedCalendars = calSettings.secondaryCalendars.map((c) =>
      isHijriSecondaryCalendar(c)
        ? { ...c, intlCalendar, dayOffset: Number(next.shifting || 0) }
        : c
    );
    await calService.updateSettings({
      ...calSettings,
      secondaryCalendars: updatedCalendars,
    });
  } catch {
    // Calendar plugin optional
  }
}

export async function syncNisabToDonationsBridge(
  strapi: Core.Strapi,
  next: IslamPluginSettings
): Promise<void> {
  if (!next.enableDonationsBridge) return;
  try {
    const donationsService = strapi
      .plugin("donations")
      ?.service<DonationsSettingsBridgeService | undefined>("settings");
    if (!donationsService?.getSettings || !donationsService?.updateSettings) {
      return;
    }
    const donationsSettings = await donationsService.getSettings();
    if (!Array.isArray(donationsSettings?.assessmentProfiles)) return;

    const updatedProfiles = donationsSettings.assessmentProfiles.map(
      (profile) => {
        if (!Array.isArray(profile.benchmarks)) return profile;
        const benchmarks = profile.benchmarks.map((b) => {
          const key = String(b.key || "").toLowerCase();
          if (key.startsWith("gold")) {
            return {
              ...b,
              unitPricesByCurrency: {
                ...b.unitPricesByCurrency,
                ...next.fiqhRates.goldPricePerGramByCurrency,
              },
            };
          }
          if (key.startsWith("silver")) {
            return {
              ...b,
              unitPricesByCurrency: {
                ...b.unitPricesByCurrency,
                ...next.fiqhRates.silverPricePerGramByCurrency,
              },
            };
          }
          return b;
        });
        return { ...profile, benchmarks };
      }
    );

    await donationsService.updateSettings({
      ...donationsSettings,
      assessmentProfiles: updatedProfiles,
    });
  } catch {
    // Donations plugin optional
  }
}
