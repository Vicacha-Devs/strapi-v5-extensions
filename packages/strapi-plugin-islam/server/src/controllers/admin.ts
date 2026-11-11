import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  isPlainRecord,
  isValidApiContentTypeUid,
  isValidIsoDateYmd,
  isValidTimezone,
  sanitizeHijriMonth,
  sanitizeHijriYear,
  sanitizePlainText,
  sanitizePositiveInt,
  stripDangerousKeysDeep,
  validateSafeHttpsBaseUrl,
  type IslamPluginSettings,
} from "../../../shared";
import type { ConfirmHilalSightingInput } from "../services/hilalAndScriptureHelpers";
import type createIslamService from "../services/islamService";
import type createSettingsService from "../services/settings";
import { validateNestedSettingsPatchError } from "../services/settingsNestedSanitizers";

type IslamServiceInstance = ReturnType<typeof createIslamService>;
type SettingsServiceInstance = ReturnType<typeof createSettingsService>;

export interface KoaAdminContext {
  query?: Record<string, string | undefined>;
  params?: Record<string, string | undefined>;
  request?: {
    body?: unknown;
  };
  body?: unknown;
  status?: number;
  set?: (header: string, value: string) => void;
}

const ALLOWED_OCCASIONS: ReadonlySet<ConfirmHilalSightingInput["occasion"]> =
  new Set([
    "ramadan",
    "eid_al_fitr",
    "dhul_hijjah_eid_al_adha",
    "monthly_hilal",
  ]);

const QF_URL_FIELDS = [
  "oauth2BaseUrlPrelive",
  "apiBaseUrlPrelive",
  "oauth2BaseUrlProduction",
  "apiBaseUrlProduction",
  "publicFallbackBaseUrl",
] as const;

function respondBadRequest(ctx: KoaAdminContext, message: string): void {
  ctx.status = 400;
  ctx.body = {
    data: null,
    error: {
      status: 400,
      name: "ValidationError",
      message,
    },
  };
}

function extractSanitizedBody(
  ctx: KoaAdminContext
): Record<string, unknown> | null {
  const rawBody = ctx.request?.body;
  if (rawBody === undefined) {
    return {};
  }
  if (!isPlainRecord(rawBody)) {
    return null;
  }
  return stripDangerousKeysDeep(rawBody);
}

function validateSettingsPatchError(
  patch: Record<string, unknown>
): string | null {
  if (patch.timezone !== undefined && !isValidTimezone(patch.timezone)) {
    return "Invalid IANA timezone identifier";
  }
  if (
    patch.externalApiBaseUrl !== undefined &&
    !validateSafeHttpsBaseUrl(patch.externalApiBaseUrl, {
      service: "islamic_api",
      requireTrustedHost: true,
    })
  ) {
    return "Invalid or untrusted externalApiBaseUrl";
  }
  if (isPlainRecord(patch.quranFoundation)) {
    for (const urlField of QF_URL_FIELDS) {
      const candidate = patch.quranFoundation[urlField];
      if (
        candidate !== undefined &&
        !validateSafeHttpsBaseUrl(candidate, {
          service: "quran",
          requireTrustedHost: true,
        })
      ) {
        return `Invalid or untrusted quranFoundation.${urlField}`;
      }
    }
  }
  if (
    isPlainRecord(patch.prayerSettingMapping) &&
    patch.prayerSettingMapping.uid !== undefined &&
    !isValidApiContentTypeUid(patch.prayerSettingMapping.uid)
  ) {
    return "Invalid prayerSettingMapping.uid (expected api::name.name)";
  }
  if (
    isPlainRecord(patch.faithPageMapping) &&
    patch.faithPageMapping.uid !== undefined &&
    !isValidApiContentTypeUid(patch.faithPageMapping.uid)
  ) {
    return "Invalid faithPageMapping.uid (expected api::name.name)";
  }
  return validateNestedSettingsPatchError(patch);
}

function resolveOccasion(raw: unknown): ConfirmHilalSightingInput["occasion"] {
  if (
    typeof raw === "string" &&
    ALLOWED_OCCASIONS.has(raw as ConfirmHilalSightingInput["occasion"])
  ) {
    return raw as ConfirmHilalSightingInput["occasion"];
  }
  return "ramadan";
}

function resolveNotesRecord(raw: unknown): Record<string, string> {
  if (!isPlainRecord(raw)) return {};
  const cleaned = stripDangerousKeysDeep(raw);
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(cleaned)) {
    if (typeof v === "string") {
      result[k] = sanitizePlainText(v, 500);
    }
  }
  return result;
}

function buildHilalPayload(
  body: Record<string, unknown>,
  confirmedGregorianDate: string
): ConfirmHilalSightingInput {
  return {
    occasion: resolveOccasion(body.occasion),
    hijriYear:
      body.hijriYear !== undefined && body.hijriYear !== ""
        ? sanitizeHijriYear(body.hijriYear, 1448)
        : undefined,
    hijriMonth:
      body.hijriMonth !== undefined && body.hijriMonth !== ""
        ? sanitizeHijriMonth(body.hijriMonth, 9)
        : undefined,
    confirmedGregorianDate,
    shifting: sanitizePlainText(body.shifting, 5),
    approvedByImam: sanitizePlainText(body.approvedByImam, 120),
    notes: resolveNotesRecord(body.notes),
    activateBanner: Boolean(body.activateBanner),
    dispatchBroadcast: Boolean(body.dispatchBroadcast),
  };
}

function resolveOptionalPinText(raw: unknown): string | null {
  return raw ? sanitizePlainText(raw, 80) : null;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsService = () =>
    strapi.plugin(PLUGIN_ID).service<SettingsServiceInstance>("settings");
  const getIslamService = () =>
    strapi.plugin(PLUGIN_ID).service<IslamServiceInstance>("islamService");

  return {
    async getOverview(ctx: KoaAdminContext) {
      const locale =
        typeof ctx.query?.locale === "string" ? ctx.query.locale : undefined;
      const data = await getIslamService().getAdminOverview(locale);
      ctx.body = { data };
    },

    async getSettings(ctx: KoaAdminContext) {
      const data = await getSettingsService().getSettings();
      ctx.body = { data };
    },

    async updateSettings(ctx: KoaAdminContext) {
      const body = extractSanitizedBody(ctx);
      if (!body) {
        respondBadRequest(ctx, "Request body must be a JSON object");
        return;
      }
      const validationError = validateSettingsPatchError(body);
      if (validationError) {
        respondBadRequest(ctx, validationError);
        return;
      }
      const data = await getSettingsService().updateSettings(
        body as Partial<IslamPluginSettings>
      );
      ctx.body = { data };
    },

    async confirmHilal(ctx: KoaAdminContext) {
      const body = extractSanitizedBody(ctx);
      if (!body) {
        respondBadRequest(ctx, "Request body must be a JSON object");
        return;
      }
      if (!isValidIsoDateYmd(body.confirmedGregorianDate)) {
        respondBadRequest(
          ctx,
          "Invalid confirmedGregorianDate (expected valid YYYY-MM-DD)"
        );
        return;
      }
      const data = await getIslamService().confirmHilalSighting(
        buildHilalPayload(body, body.confirmedGregorianDate.trim())
      );
      ctx.body = { data };
    },

    async updateDailyPins(ctx: KoaAdminContext) {
      const body = extractSanitizedBody(ctx);
      if (!body) {
        respondBadRequest(ctx, "Request body must be a JSON object");
        return;
      }
      const pinnedAsma = body.pinnedAsmaNumber
        ? sanitizePositiveInt(body.pinnedAsmaNumber, 1, 1, 99)
        : null;
      const data = await getSettingsService().updateSettings({
        dailyPins: {
          pinnedAyahId: resolveOptionalPinText(body.pinnedAyahId),
          pinnedHadithId: resolveOptionalPinText(body.pinnedHadithId),
          pinnedDuaId: resolveOptionalPinText(body.pinnedDuaId),
          pinnedAsmaNumber: pinnedAsma,
        },
      });
      ctx.body = { data };
    },
  };
};
