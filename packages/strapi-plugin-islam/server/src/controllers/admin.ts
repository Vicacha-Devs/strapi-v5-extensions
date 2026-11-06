import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  sanitizePlainText,
  type IslamPluginSettings,
} from "../../../shared";
import type { ConfirmHilalSightingInput } from "../services/hilalAndScriptureHelpers";
import type createIslamService from "../services/islamService";
import type createSettingsService from "../services/settings";

type IslamServiceInstance = ReturnType<typeof createIslamService>;
type SettingsServiceInstance = ReturnType<typeof createSettingsService>;

export interface KoaAdminContext {
  query?: Record<string, string | undefined>;
  params?: Record<string, string | undefined>;
  request?: {
    body?: Record<string, unknown>;
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

function extractBodyRecord(ctx: KoaAdminContext): Record<string, unknown> {
  const rawBody = ctx.request?.body;
  return rawBody && typeof rawBody === "object" ? rawBody : {};
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
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, string>;
}

function buildHilalPayload(
  body: Record<string, unknown>
): ConfirmHilalSightingInput {
  return {
    occasion: resolveOccasion(body.occasion),
    hijriYear: Number(body.hijriYear) || undefined,
    hijriMonth: Number(body.hijriMonth) || undefined,
    confirmedGregorianDate: sanitizePlainText(body.confirmedGregorianDate, 20),
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
      const patch = extractBodyRecord(ctx) as Partial<IslamPluginSettings>;
      const data = await getSettingsService().updateSettings(patch);
      ctx.body = { data };
    },

    async confirmHilal(ctx: KoaAdminContext) {
      const body = extractBodyRecord(ctx);
      const data = await getIslamService().confirmHilalSighting(
        buildHilalPayload(body)
      );
      ctx.body = { data };
    },

    async updateDailyPins(ctx: KoaAdminContext) {
      const body = extractBodyRecord(ctx);
      const data = await getSettingsService().updateSettings({
        dailyPins: {
          pinnedAyahId: resolveOptionalPinText(body.pinnedAyahId),
          pinnedHadithId: resolveOptionalPinText(body.pinnedHadithId),
          pinnedDuaId: resolveOptionalPinText(body.pinnedDuaId),
          pinnedAsmaNumber: body.pinnedAsmaNumber
            ? Number(body.pinnedAsmaNumber)
            : null,
        },
      });
      ctx.body = { data };
    },
  };
};
