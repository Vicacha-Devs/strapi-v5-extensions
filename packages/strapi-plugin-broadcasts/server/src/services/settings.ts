import type { Core } from "@strapi/strapi";

import {
  DEFAULT_BROADCAST_SETTINGS,
  PLUGIN_ID,
  isSafeHttpUrl,
  isSupportedCalendar,
  isSupportedWhatsAppDriver,
  isValidGatewaySession,
  stripHeaderControlChars,
  validateGatewayUrl,
  validatePublicChannelLinks,
  type BroadcastSettings,
  type CalendarSystemId,
} from "../../../shared";

const SETTINGS_KEY = "settings";
const MASKED_SECRET = "••••••••";
const SECRET_MASK_RE = /^[•*]+$/;
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const ALLOWED_SETTINGS_KEYS = new Set<keyof BroadcastSettings>([
  "primaryCalendar",
  "secondaryCalendars",
  "defaultLocale",
  "supportedLocales",
  "availableTopics",
  "dryRun",
  "enableInboxSubscriberBridge",
  "enableEventHubAutomations",
  "enableEmailDesignerBridge",
  "defaultEmailTemplateRef",
  "siteBaseUrl",
  "organizationName",
  "emailFromAddress",
  "emailReplyToAddress",
  "telegramEnabled",
  "telegramBotToken",
  "telegramDefaultChatId",
  "telegramTopicChatMap",
  "telegramTopicThreadMap",
  "whatsappEnabled",
  "whatsappDriver",
  "whatsappPhoneNumberId",
  "whatsappAccessToken",
  "whatsappGatewayUrl",
  "whatsappGatewaySession",
  "whatsappGatewayApiKey",
  "whatsappDefaultRecipients",
  "whatsappTopicGroupMap",
  "allowLocalhostGateways",
  "publicChannelLinks",
  "presetCampaigns",
  "presetAutomationRules",
]);

const NESTED_MAP_KEYS = new Set<keyof BroadcastSettings>([
  "telegramTopicChatMap",
  "telegramTopicThreadMap",
  "whatsappTopicGroupMap",
]);

function sanitizePlainMap(val: unknown): Record<string, unknown> {
  if (!val || typeof val !== "object" || Array.isArray(val)) return {};
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(k) || !Object.hasOwn(val, k)) continue;
    clean[k] = v;
  }
  return clean;
}

function pickAllowedSettings(raw: unknown): Partial<BroadcastSettings> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (
      DANGEROUS_KEYS.has(key) ||
      !Object.hasOwn(raw, key) ||
      !ALLOWED_SETTINGS_KEYS.has(key as keyof BroadcastSettings)
    ) {
      continue;
    }
    clean[key] = NESTED_MAP_KEYS.has(key as keyof BroadcastSettings)
      ? sanitizePlainMap(value)
      : value;
  }
  return clean as Partial<BroadcastSettings>;
}

function maskSecret(val?: string): string {
  if (!val || SECRET_MASK_RE.test(val.trim())) return "";
  return MASKED_SECRET;
}

function resolveSecretValue(
  incoming: string | undefined,
  current: string | undefined
): string {
  if (incoming === undefined || incoming === null) {
    return current ?? "";
  }
  const str = String(incoming);
  const trimmed = str.trim();
  if (trimmed.length > 0 && SECRET_MASK_RE.test(trimmed)) {
    return current ?? "";
  }
  return str;
}

function resolveSecondaryCalendars(
  incoming: unknown,
  fallback: CalendarSystemId[]
): CalendarSystemId[] {
  if (!Array.isArray(incoming)) return fallback;
  return incoming.filter((cal): cal is CalendarSystemId =>
    isSupportedCalendar(cal)
  );
}

const createSettingsService = ({ strapi }: { strapi: Core.Strapi }) => ({
  getPluginStore() {
    return strapi.store({
      type: "plugin",
      name: PLUGIN_ID,
    });
  },

  getConfigDefaults(): BroadcastSettings {
    const rawConfig = pickAllowedSettings(
      strapi.config.get<Partial<BroadcastSettings>>(`plugin::${PLUGIN_ID}`, {})
    );

    const primaryCalendar: CalendarSystemId = isSupportedCalendar(
      rawConfig.primaryCalendar
    )
      ? rawConfig.primaryCalendar
      : DEFAULT_BROADCAST_SETTINGS.primaryCalendar;

    const secondaryCalendars = resolveSecondaryCalendars(
      rawConfig.secondaryCalendars,
      DEFAULT_BROADCAST_SETTINGS.secondaryCalendars
    );

    return {
      ...DEFAULT_BROADCAST_SETTINGS,
      ...rawConfig,
      primaryCalendar,
      secondaryCalendars,
      whatsappDriver: isSupportedWhatsAppDriver(rawConfig.whatsappDriver)
        ? rawConfig.whatsappDriver
        : DEFAULT_BROADCAST_SETTINGS.whatsappDriver,
    };
  },

  async getSettings(): Promise<BroadcastSettings> {
    const defaults = this.getConfigDefaults();
    const store = this.getPluginStore();
    const rawStored = await store.get({ key: SETTINGS_KEY });
    const stored = pickAllowedSettings(rawStored);

    if (!rawStored) {
      return defaults;
    }

    return {
      ...defaults,
      ...stored,
    };
  },

  async getPublicSafeSettings(): Promise<BroadcastSettings> {
    const full = await this.getSettings();
    return {
      ...full,
      telegramBotToken: maskSecret(full.telegramBotToken),
      whatsappAccessToken: maskSecret(full.whatsappAccessToken),
      whatsappGatewayApiKey: maskSecret(full.whatsappGatewayApiKey),
    };
  },

  async updateSettings(
    rawPartial: Partial<BroadcastSettings>
  ): Promise<BroadcastSettings> {
    const partial = pickAllowedSettings(rawPartial);
    const current = await this.getSettings();

    const effectiveAllowLocalhost = Boolean(
      partial.allowLocalhostGateways ?? current.allowLocalhostGateways
    );
    const effectiveGatewayUrl = String(
      partial.whatsappGatewayUrl ?? current.whatsappGatewayUrl ?? ""
    ).trim();

    if (effectiveGatewayUrl) {
      const check = validateGatewayUrl(effectiveGatewayUrl, {
        allowLocalhost: effectiveAllowLocalhost,
      });
      if (!check.valid) {
        throw new Error(check.errors.join("; "));
      }
    }

    const effectiveSiteBaseUrl = String(
      partial.siteBaseUrl ?? current.siteBaseUrl ?? ""
    ).trim();
    if (effectiveSiteBaseUrl && !isSafeHttpUrl(effectiveSiteBaseUrl)) {
      throw new Error("siteBaseUrl must be a valid http or https URL");
    }

    if (partial.publicChannelLinks !== undefined) {
      const linksCheck = validatePublicChannelLinks(partial.publicChannelLinks);
      if (!linksCheck.valid) {
        throw new Error(linksCheck.errors.join("; "));
      }
    }

    if (partial.whatsappGatewaySession !== undefined) {
      const candidateSession = String(partial.whatsappGatewaySession).trim();
      if (candidateSession && !isValidGatewaySession(candidateSession)) {
        throw new Error(
          "whatsappGatewaySession must be 1-64 alphanumeric, underscore, or hyphen characters"
        );
      }
    }
    const effectiveGatewaySession =
      String(
        partial.whatsappGatewaySession ??
          current.whatsappGatewaySession ??
          "default"
      ).trim() || "default";
    if (!isValidGatewaySession(effectiveGatewaySession)) {
      throw new Error(
        "whatsappGatewaySession must be 1-64 alphanumeric, underscore, or hyphen characters"
      );
    }

    const next: BroadcastSettings = {
      ...current,
      ...partial,
      siteBaseUrl: effectiveSiteBaseUrl || current.siteBaseUrl,
      whatsappGatewaySession: effectiveGatewaySession,
      emailFromAddress: stripHeaderControlChars(
        partial.emailFromAddress ?? current.emailFromAddress
      ),
      emailReplyToAddress: stripHeaderControlChars(
        partial.emailReplyToAddress ?? current.emailReplyToAddress
      ),
      primaryCalendar: isSupportedCalendar(partial.primaryCalendar)
        ? partial.primaryCalendar
        : current.primaryCalendar,
      secondaryCalendars: resolveSecondaryCalendars(
        partial.secondaryCalendars,
        current.secondaryCalendars
      ),
      whatsappDriver: isSupportedWhatsAppDriver(partial.whatsappDriver)
        ? partial.whatsappDriver
        : current.whatsappDriver,
      telegramBotToken: resolveSecretValue(
        partial.telegramBotToken,
        current.telegramBotToken
      ),
      whatsappAccessToken: resolveSecretValue(
        partial.whatsappAccessToken,
        current.whatsappAccessToken
      ),
      whatsappGatewayApiKey: resolveSecretValue(
        partial.whatsappGatewayApiKey,
        current.whatsappGatewayApiKey
      ),
    };

    const store = this.getPluginStore();
    await store.set({
      key: SETTINGS_KEY,
      value: next,
    });

    return next;
  },
});

export default createSettingsService;
