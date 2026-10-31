import {
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  Tabs,
  Textarea,
  TextInput,
  Typography,
} from "@strapi/design-system";
import { Layouts, useFetchClient, useNotification } from "@strapi/strapi/admin";
import React, { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";

import { PLUGIN_ID } from "../../../shared/pluginId";
import type { CertificatesPluginSettings } from "../../../shared/types";

const SUB_CARD_BORDER_STYLE: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.18)",
};

const TAB_PANEL_STYLE: React.CSSProperties = {
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
};

const INLINE_CODE_STYLE: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "0.88em",
  padding: "2px 6px",
  borderRadius: 4,
  background: "rgba(128, 128, 128, 0.16)",
  border: "1px solid rgba(128, 128, 128, 0.25)",
};

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
  const { get, put, post } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [settings, setSettings] = useState<CertificatesPluginSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await get<{ data: CertificatesPluginSettings }>(`/${PLUGIN_ID}/settings`);
      if (res.data?.data) setSettings(res.data.data);
    } catch {
      toggleNotification({
        type: "danger",
        message: t(
          "settings.ui.msg_failed_to_load_certificates_plugin_settings",
          "Failed to load certificates plugin settings"
        ),
      });
    }
  }, [get, toggleNotification]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await put<{ data: CertificatesPluginSettings }>(
        `/${PLUGIN_ID}/settings`,
        settings
      );
      if (res.data?.data) setSettings(res.data.data);
      toggleNotification({
        type: "success",
        message: t(
          "settings.ui.msg_certificates_authority_settings_saved",
          "Certificates authority settings saved"
        ),
      });
    } catch {
      toggleNotification({
        type: "danger",
        message: t("settings.ui.msg_failed_to_save_settings", "Failed to save settings"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRotateKeys = async () => {
    setRotating(true);
    try {
      await post(`/${PLUGIN_ID}/settings/rotate-keys`, {});
      toggleNotification({
        type: "warning",
        message: t(
          "settings.ui.msg_generated_new_ed25519_signing_keypair",
          "Generated new Ed25519 signing keypair"
        ),
      });
      await loadSettings();
    } catch {
      toggleNotification({
        type: "danger",
        message: t(
          "settings.ui.msg_failed_to_rotate_ed25519_keypair",
          "Failed to rotate Ed25519 keypair"
        ),
      });
    } finally {
      setRotating(false);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const res = await post<{ data: { seededCount: number } }>(`/${PLUGIN_ID}/templates/seed`, {});
      toggleNotification({
        type: "success",
        message: `Seeded ${res.data?.data?.seededCount ?? 0} default template(s)`,
      });
    } catch {
      toggleNotification({
        type: "danger",
        message: t(
          "settings.ui.msg_failed_to_seed_default_templates",
          "Failed to seed default templates"
        ),
      });
    }
  };

  if (!settings) {
    return (
      <Layouts.Root>
        <Layouts.Content>
          <Box padding={6}>
            <Typography>{t("settings.ui.loading_settings", "Loading settings...")}</Typography>
          </Box>
        </Layouts.Content>
      </Layouts.Root>
    );
  }

  return (
    <Layouts.Root>
      <Layouts.Header
        title={t(
          "settings.ui.title_certificates_authority_ed25519_docusign_settings",
          "Certificates Authority & Ed25519 / DocuSign Settings"
        )}
        subtitle={t(
          "settings.ui.subtitle_configure_issuer_organization_metadata_public_ve",
          "Configure issuer organization metadata, public verification URL, Ed25519 cryptographic signing keys, and optional DocuSign eSignature integration"
        )}
        primaryAction={
          <Button onClick={handleSave} loading={saving}>
            {t("settings.ui.save_settings", "Save Settings")}
          </Button>
        }
      />
      <Layouts.Content>
        <Tabs.Root defaultValue="organization">
          <Tabs.List
            aria-label={t(
              "settings.ui.title_certificates_authority_ed25519_docusign_settings",
              "Certificates Authority Settings"
            )}
          >
            <Tabs.Trigger value="organization">
              {t("settings.tab.organization", "Issuing Organization & Verification")}
            </Tabs.Trigger>
            <Tabs.Trigger value="docusign">
              {t("settings.tab.docusign", "DocuSign E-Signature")}
            </Tabs.Trigger>
            <Tabs.Trigger value="keys">
              {t("settings.tab.keys", "Ed25519 Signing Keys")}
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="organization">
            <Box
              padding={6}
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              style={TAB_PANEL_STYLE}
            >
              <Typography variant="beta" fontWeight="bold">
                {t(
                  "settings.ui.1_issuing_organization_verification_portal",
                  "Issuing Organization & Verification Portal"
                )}
              </Typography>
              <Box
                marginTop={4}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 20,
                }}
              >
                <Field.Root
                  hint={t(
                    "settings.ui.official_issuing_authority_name_printed_on_signe",
                    "Official issuing authority name printed on signed certificates and verification payloads."
                  )}
                >
                  <Field.Label>{t("field.organization_name", "Organization Name")}</Field.Label>
                  <TextInput
                    placeholder={t(
                      "placeholder.e_g_mezquita_central_abu_bakr_as_siddiq",
                      "e.g., Abu Bakr As-Siddiq Central Mosque"
                    )}
                    value={settings.organizationName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSettings({ ...settings, organizationName: e.target.value })
                    }
                  />
                  <Field.Hint />
                </Field.Root>
                <Field.Root
                  hint={t(
                    "settings.ui.legal_registration_or_jurisdiction_line_displaye",
                    "Legal registration or jurisdiction line displayed beneath the organization header."
                  )}
                >
                  <Field.Label>
                    {t(
                      "field.organization_subheader_jurisdiction",
                      "Organization Subheader / Jurisdiction"
                    )}
                  </Field.Label>
                  <TextInput
                    placeholder={t(
                      "placeholder.e_g_bogot_d_c_colombia_personer_a_jur_dica_espec",
                      "e.g., Bogotá D.C., Colombia — Special Legal Entity"
                    )}
                    value={settings.organizationSubheader}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSettings({ ...settings, organizationSubheader: e.target.value })
                    }
                  />
                  <Field.Hint />
                </Field.Root>
                <Field.Root
                  hint={t(
                    "settings.ui.base_url_encoded_into_certificate_qr_codes_for_i",
                    "Base URL encoded into certificate QR codes for instant authenticity verification."
                  )}
                >
                  <Field.Label>
                    {t("field.public_verification_base_url", "Public Verification Base URL")}
                  </Field.Label>
                  <TextInput
                    placeholder={t(
                      "placeholder.e_g_https_mezquitacentralbogota_org_verify",
                      "e.g., https://mezquitacentralbogota.org/verify"
                    )}
                    value={settings.verificationBaseUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSettings({ ...settings, verificationBaseUrl: e.target.value })
                    }
                  />
                  <Field.Hint />
                </Field.Root>
              </Box>
              <Box
                marginTop={4}
                padding={4}
                background="neutral100"
                hasRadius
                style={SUB_CARD_BORDER_STYLE}
              >
                <Flex direction="column" gap={3} alignItems="stretch">
                  <Checkbox
                    checked={settings.maskPublicRecipientName}
                    onCheckedChange={(val: boolean) =>
                      setSettings({ ...settings, maskPublicRecipientName: Boolean(val) })
                    }
                  >
                    {t(
                      "checkbox.mask_recipient_full_name_on_public_serial_lookup",
                      "Mask recipient full name on public serial lookups unless verification token is provided"
                    )}
                  </Checkbox>
                  <Checkbox
                    checked={settings.allowPublicApplications}
                    onCheckedChange={(val: boolean) =>
                      setSettings({ ...settings, allowPublicApplications: Boolean(val) })
                    }
                  >
                    {t(
                      "checkbox.allow_public_certificate_applications",
                      "Allow public certificate applications"
                    )}{" "}
                    (
                    <code style={INLINE_CODE_STYLE}>
                      {t("settings.ui.endpoint_apply", "POST /api/certificates/apply")}
                    </code>
                    )
                  </Checkbox>
                </Flex>
              </Box>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="docusign">
            <Box
              padding={6}
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              style={TAB_PANEL_STYLE}
            >
              <Typography variant="beta" fontWeight="bold">
                {t(
                  "settings.ui.2_optional_docusign_e_signature_service",
                  "Optional DocuSign E-Signature Service"
                )}
              </Typography>
              <Box marginTop={1}>
                <Typography variant="pi" textColor="neutral600">
                  {t("settings.ui.secrets_prefix", "Secrets")} (
                  <code style={INLINE_CODE_STYLE}>DOCUSIGN_ACCESS_TOKEN</code>{" "}
                  {t("settings.ui.and_conjunction", "&")}{" "}
                  <code style={INLINE_CODE_STYLE}>DOCUSIGN_WEBHOOK_SECRET</code>){" "}
                  {t(
                    "settings.ui.secrets_loaded_from_env",
                    "are loaded from environment variables. Connect webhook endpoint:"
                  )}{" "}
                  <code style={INLINE_CODE_STYLE}>
                    {t(
                      "settings.ui.endpoint_docusign_webhook",
                      "POST /api/certificates/webhooks/docusign"
                    )}
                  </code>
                </Typography>
              </Box>
              <Flex direction="column" gap={4} marginTop={4} alignItems="stretch">
                <Box padding={4} background="neutral100" hasRadius style={SUB_CARD_BORDER_STYLE}>
                  <Checkbox
                    checked={settings.esign?.enabled ?? false}
                    onCheckedChange={(val: boolean) =>
                      setSettings({
                        ...settings,
                        esign: {
                          ...(settings.esign || {
                            provider: "docusign",
                            baseUrl: "https://demo.docusign.net/restapi",
                            accountId: "",
                          }),
                          enabled: Boolean(val),
                          provider: val ? "docusign" : "none",
                        },
                      })
                    }
                  >
                    {t(
                      "checkbox.enable_docusign_esignature_multi_party_envelope_",
                      "Enable DocuSign eSignature multi-party envelope routing for Witnesses & Signatories"
                    )}
                  </Checkbox>
                </Box>
                <Box
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 20,
                  }}
                >
                  <Field.Root
                    hint={t(
                      "settings.ui.docusign_rest_api_endpoint_demo_sandbox_or_produ",
                      "DocuSign REST API endpoint (demo sandbox or production account URI)."
                    )}
                  >
                    <Field.Label>
                      {t(
                        "field.docusign_rest_api_base_url_https",
                        "DocuSign REST API Base URL (HTTPS)"
                      )}
                    </Field.Label>
                    <TextInput
                      value={settings.esign?.baseUrl || "https://demo.docusign.net/restapi"}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettings({
                          ...settings,
                          esign: { ...settings.esign, baseUrl: e.target.value },
                        })
                      }
                      placeholder={t(
                        "placeholder.e_g_https_demo_docusign_net_restapi",
                        "e.g., https://demo.docusign.net/restapi"
                      )}
                    />
                    <Field.Hint />
                  </Field.Root>
                  <Field.Root
                    hint={t(
                      "settings.ui.docusign_api_account_guid_used_when_dispatching_",
                      "DocuSign API Account GUID used when dispatching signature envelopes."
                    )}
                  >
                    <Field.Label>
                      {t("field.docusign_account_id", "DocuSign Account ID")}
                    </Field.Label>
                    <TextInput
                      value={settings.esign?.accountId || "ds-account-bogota-central"}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettings({
                          ...settings,
                          esign: { ...settings.esign, accountId: e.target.value },
                        })
                      }
                      placeholder={t("placeholder.e_g_a1b2c3d4", "e.g., a1b2c3d4-...")}
                    />
                    <Field.Hint />
                  </Field.Root>
                </Box>
              </Flex>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="keys">
            <Box
              padding={6}
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              style={TAB_PANEL_STYLE}
            >
              <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
                <Box>
                  <Typography variant="beta" fontWeight="bold">
                    {t(
                      "settings.ui.3_ed25519_cryptographic_public_key",
                      "Ed25519 Cryptographic Public Key"
                    )}
                  </Typography>
                  <Box marginTop={1}>
                    <Typography variant="pi" textColor="neutral600">
                      {t("settings.ui.active_key_fingerprint", "Active Key Fingerprint:")}{" "}
                      <code style={INLINE_CODE_STYLE}>{settings.publicKeyFingerprint}</code>
                    </Typography>
                  </Box>
                </Box>
                <Flex gap={2}>
                  <Button variant="secondary" onClick={handleSeedDefaults}>
                    {t("settings.ui.seed_default_templates", "Seed Default Templates")}
                  </Button>
                  <Button variant="danger-light" onClick={handleRotateKeys} loading={rotating}>
                    {t("settings.ui.rotate_ed25519_keypair", "Rotate Ed25519 Keypair")}
                  </Button>
                </Flex>
              </Flex>
              <Box marginTop={4}>
                <Field.Root
                  hint={t(
                    "settings.ui.public_key_pem_hint",
                    "Read-only Ed25519 public key in SPKI PEM format used to verify certificate signatures offline."
                  )}
                >
                  <Field.Label>
                    {t("field.public_key_pem_published_at", "Public Key PEM (Published at")}{" "}
                    <code style={INLINE_CODE_STYLE}>
                      {t("settings.ui.endpoint_public_key", "GET /api/certificates/public-key")}
                    </code>{" "}
                    {t(
                      "field.for_offline_embassy_verification",
                      "for offline embassy/consular verification)"
                    )}
                  </Field.Label>
                  <Textarea
                    placeholder={t("placeholder.begin_public_key", "-----BEGIN PUBLIC KEY-----")}
                    value={settings.publicKeyPem}
                    disabled
                  />
                  <Field.Hint />
                </Field.Root>
              </Box>
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Layouts.Content>
    </Layouts.Root>
  );
};

export default SettingsPage;
