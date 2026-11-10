import type { Core } from "@strapi/strapi";
import { stripTrailingSlashes } from "@vicacha-devs/plugin-shared";

import {
  PLUGIN_ID,
  computePublicKeyFingerprint,
  generateEd25519KeyPair,
  type CalendarSystemConfig,
  type CertificatesPluginSettings,
  type DocuSignProviderConfig,
  type Ed25519KeyPairMaterial,
} from "../../../shared";

const SETTINGS_STORE_KEY = "settings";
const KEYPAIR_STORE_KEY = "ed25519_keypair";

export const DEFAULT_SECONDARY_CALENDARS: CalendarSystemConfig[] = [
  {
    id: "islamic-umalqura",
    label: "Hijri (Umm al-Qura)",
    intlCalendar: "islamic-umalqura",
    enabled: true,
    dayOffset: 0,
  },
];

export const DEFAULT_ESIGN_CONFIG: DocuSignProviderConfig = {
  enabled: false,
  provider: "none",
  baseUrl: "https://demo.docusign.net/restapi",
  accountId: "",
  integrationKey: "",
  emailSubjectPrefix: "Official Certificate Signature Request",
};

export const DEFAULT_SETTINGS: Omit<
  CertificatesPluginSettings,
  "publicKeyPem" | "publicKeyFingerprint"
> = {
  organizationName: "Official Certification Authority",
  organizationSubheader: "Office of Official Records & Attestation",
  verificationBaseUrl: "http://localhost:1337/api/certificates/verify",
  defaultTimezone: "UTC",
  defaultLocale: "en",
  maskPublicRecipientName: true,
  allowPublicApplications: true,
  secondaryCalendars: DEFAULT_SECONDARY_CALENDARS,
  esign: DEFAULT_ESIGN_CONFIG,
  defaultTemplates: [],
};

function sanitizeCalendarSystems(raw: unknown): CalendarSystemConfig[] {
  if (!Array.isArray(raw)) return DEFAULT_SECONDARY_CALENDARS;
  return raw
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object")
    )
    .map((item) => ({
      id: String(item.id || "islamic-umalqura").trim(),
      label: String(item.label || item.id || "Hijri").trim(),
      intlCalendar: String(item.intlCalendar || "islamic-umalqura").trim(),
      enabled: item.enabled !== false,
      dayOffset:
        typeof item.dayOffset === "number" && Number.isFinite(item.dayOffset)
          ? Math.max(-5, Math.min(5, Math.trunc(item.dayOffset)))
          : 0,
    }));
}

function pickFirstString(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== "") {
      return String(candidate).trim();
    }
  }
  return "";
}

function normalizeEsignProvider(
  providerRaw: string,
  enabled: boolean
): DocuSignProviderConfig["provider"] {
  if (providerRaw === "docusign" || providerRaw === "webhook") {
    return providerRaw;
  }
  return enabled ? "docusign" : "none";
}

function toRecordObject(raw: unknown): Partial<DocuSignProviderConfig> {
  return raw && typeof raw === "object"
    ? (raw as Partial<DocuSignProviderConfig>)
    : {};
}

function sanitizeESignConfig(
  raw: unknown,
  fallback: DocuSignProviderConfig
): DocuSignProviderConfig {
  const obj = toRecordObject(raw);
  const envAccountId = process.env.DOCUSIGN_ACCOUNT_ID?.trim();
  const envBaseUrl = process.env.DOCUSIGN_BASE_URL?.trim();
  const envIntegrationKey = process.env.DOCUSIGN_INTEGRATION_KEY?.trim();

  const enabled = Boolean(
    obj.enabled ?? fallback.enabled ?? Boolean(envAccountId)
  );
  const providerRaw = pickFirstString(obj.provider, fallback.provider, "none");

  return {
    enabled,
    provider: normalizeEsignProvider(providerRaw, Boolean(obj.enabled)),
    baseUrl: stripTrailingSlashes(
      pickFirstString(
        obj.baseUrl,
        envBaseUrl,
        fallback.baseUrl,
        DEFAULT_ESIGN_CONFIG.baseUrl
      )
    ),
    accountId: pickFirstString(obj.accountId, envAccountId, fallback.accountId),
    integrationKey: pickFirstString(
      obj.integrationKey,
      envIntegrationKey,
      fallback.integrationKey
    ),
    emailSubjectPrefix: pickFirstString(
      obj.emailSubjectPrefix,
      fallback.emailSubjectPrefix,
      DEFAULT_ESIGN_CONFIG.emailSubjectPrefix
    ),
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getPluginStore = () =>
    strapi.store({
      type: "plugin",
      name: PLUGIN_ID,
    });

  return {
    async getSigningKeyPair(): Promise<Ed25519KeyPairMaterial> {
      const envPrivate = process.env.CERTIFICATES_PRIVATE_KEY_PEM?.trim();
      const envPublic = process.env.CERTIFICATES_PUBLIC_KEY_PEM?.trim();

      if (envPrivate && envPublic) {
        return {
          privateKeyPem: envPrivate.replace(/\\n/g, "\n"),
          publicKeyPem: envPublic.replace(/\\n/g, "\n"),
          fingerprint: computePublicKeyFingerprint(
            envPublic.replace(/\\n/g, "\n")
          ),
        };
      }

      const store = getPluginStore();
      const stored = (await store.get({ key: KEYPAIR_STORE_KEY })) as
        | Partial<Ed25519KeyPairMaterial>
        | undefined;

      if (stored?.privateKeyPem && stored?.publicKeyPem) {
        return {
          privateKeyPem: stored.privateKeyPem,
          publicKeyPem: stored.publicKeyPem,
          fingerprint:
            stored.fingerprint ||
            computePublicKeyFingerprint(stored.publicKeyPem),
        };
      }

      const generated = generateEd25519KeyPair();
      await store.set({
        key: KEYPAIR_STORE_KEY,
        value: generated,
      });
      strapi.log.info(
        `[${PLUGIN_ID}] Generated and persisted new Ed25519 signing keypair (${generated.fingerprint}). Set CERTIFICATES_PRIVATE_KEY_PEM and CERTIFICATES_PUBLIC_KEY_PEM in production.`
      );
      return generated;
    },

    async rotateKeyPair(): Promise<{
      publicKeyPem: string;
      publicKeyFingerprint: string;
    }> {
      const store = getPluginStore();
      const generated = generateEd25519KeyPair();
      await store.set({
        key: KEYPAIR_STORE_KEY,
        value: generated,
      });
      strapi.log.warn(
        `[${PLUGIN_ID}] Rotated Ed25519 signing keypair to ${generated.fingerprint}`
      );
      return {
        publicKeyPem: generated.publicKeyPem,
        publicKeyFingerprint: generated.fingerprint,
      };
    },

    async getSettings(): Promise<CertificatesPluginSettings> {
      const store = getPluginStore();
      const configDefaults =
        strapi.config.get<Partial<CertificatesPluginSettings>>(
          `plugin::${PLUGIN_ID}`,
          {}
        ) || {};
      const stored = ((await store.get({ key: SETTINGS_STORE_KEY })) ||
        {}) as Partial<CertificatesPluginSettings>;
      const keyPair = await this.getSigningKeyPair();

      const merged = {
        ...DEFAULT_SETTINGS,
        ...configDefaults,
        ...stored,
      };

      const defaultEsign = sanitizeESignConfig(
        configDefaults.esign,
        DEFAULT_ESIGN_CONFIG
      );

      return {
        organizationName: String(
          merged.organizationName || DEFAULT_SETTINGS.organizationName
        ).trim(),
        organizationSubheader: String(
          merged.organizationSubheader ?? DEFAULT_SETTINGS.organizationSubheader
        ).trim(),
        verificationBaseUrl: stripTrailingSlashes(
          String(
            merged.verificationBaseUrl || DEFAULT_SETTINGS.verificationBaseUrl
          ).trim()
        ),
        defaultTimezone: String(
          merged.defaultTimezone || DEFAULT_SETTINGS.defaultTimezone
        ).trim(),
        defaultLocale: String(
          merged.defaultLocale || DEFAULT_SETTINGS.defaultLocale
        ).trim(),
        maskPublicRecipientName: merged.maskPublicRecipientName !== false,
        allowPublicApplications: merged.allowPublicApplications !== false,
        publicKeyPem: keyPair.publicKeyPem,
        publicKeyFingerprint: keyPair.fingerprint,
        secondaryCalendars: sanitizeCalendarSystems(merged.secondaryCalendars),
        esign: sanitizeESignConfig(stored.esign, defaultEsign),
        defaultTemplates: Array.isArray(merged.defaultTemplates)
          ? merged.defaultTemplates
          : [],
      };
    },

    async updateSettings(
      partial: Partial<CertificatesPluginSettings>
    ): Promise<CertificatesPluginSettings> {
      const current = await this.getSettings();
      const updated = {
        organizationName:
          typeof partial.organizationName === "string"
            ? partial.organizationName.trim()
            : current.organizationName,
        organizationSubheader:
          typeof partial.organizationSubheader === "string"
            ? partial.organizationSubheader.trim()
            : current.organizationSubheader,
        verificationBaseUrl:
          typeof partial.verificationBaseUrl === "string"
            ? stripTrailingSlashes(partial.verificationBaseUrl.trim())
            : current.verificationBaseUrl,
        defaultTimezone:
          typeof partial.defaultTimezone === "string"
            ? partial.defaultTimezone.trim()
            : current.defaultTimezone,
        defaultLocale:
          typeof partial.defaultLocale === "string"
            ? partial.defaultLocale.trim()
            : current.defaultLocale,
        maskPublicRecipientName:
          typeof partial.maskPublicRecipientName === "boolean"
            ? partial.maskPublicRecipientName
            : current.maskPublicRecipientName,
        allowPublicApplications:
          typeof partial.allowPublicApplications === "boolean"
            ? partial.allowPublicApplications
            : current.allowPublicApplications,
        secondaryCalendars:
          partial.secondaryCalendars !== undefined
            ? sanitizeCalendarSystems(partial.secondaryCalendars)
            : current.secondaryCalendars,
        esign:
          partial.esign !== undefined
            ? sanitizeESignConfig(partial.esign, current.esign)
            : current.esign,
        defaultTemplates: current.defaultTemplates,
      };

      const store = getPluginStore();
      await store.set({
        key: SETTINGS_STORE_KEY,
        value: updated,
      });

      return this.getSettings();
    },
  };
};
