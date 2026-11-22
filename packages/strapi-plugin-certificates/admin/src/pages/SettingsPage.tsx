import {
  Box,
  Button,
  Field,
  Flex,
  Tabs,
  Textarea,
  Typography,
} from "@strapi/design-system";
import { Layouts, useFetchClient, useNotification } from "@strapi/strapi/admin";
import React, { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";

import { PLUGIN_ID } from "../../../shared/pluginId";
import type { CertificatesPluginSettings } from "../../../shared/types";
import { ESignSettingsTab } from "../components/ESignSettingsTab";
import {
  Code,
  gridStyle,
  renderCheckbox,
  renderField,
  SUB_CARD_BORDER,
  TabPanelBox,
} from "../components/SettingsTabHelpers";

type PluginSettings = CertificatesPluginSettings;

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
  const { get, put, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const notify = (type: "success" | "warning" | "danger", message: string) =>
    toggleNotification({ type, message });

  const [settings, setSettings] = useState<PluginSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);

  const runAsync = async (
    fn: () => Promise<void>,
    errMsg: string,
    setBusy?: (b: boolean) => void
  ) => {
    setBusy?.(true);
    try {
      await fn();
    } catch {
      notify("danger", errMsg);
    } finally {
      setBusy?.(false);
    }
  };

  const loadSettings = useCallback(
    () =>
      runAsync(
        async () => {
          const res = await get<{ data: PluginSettings }>(
            `/${PLUGIN_ID}/settings`
          );
          if (res.data?.data) setSettings(res.data.data);
        },
        t(
          "settings.ui.msg_failed_to_load_certificates_plugin_settings",
          "Failed to load certificates plugin settings"
        )
      ),
    [get, toggleNotification]
  );

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = () =>
    settings &&
    runAsync(
      async () => {
        const res = await put<{ data: PluginSettings }>(
          `/${PLUGIN_ID}/settings`,
          settings
        );
        if (res.data?.data) setSettings(res.data.data);
        notify(
          "success",
          t(
            "settings.ui.msg_certificates_authority_settings_saved",
            "Certificates authority settings saved"
          )
        );
      },
      t("settings.ui.msg_failed_to_save_settings", "Failed to save settings"),
      setSaving
    );

  const handleRotateKeys = () =>
    runAsync(
      async () => {
        await post(`/${PLUGIN_ID}/settings/rotate-keys`, {});
        notify(
          "warning",
          t(
            "settings.ui.msg_generated_new_ed25519_signing_keypair",
            "Generated new Ed25519 signing keypair"
          )
        );
        await loadSettings();
      },
      t(
        "settings.ui.msg_failed_to_rotate_ed25519_keypair",
        "Failed to rotate Ed25519 keypair"
      ),
      setRotating
    );

  const handleSeedDefaults = () =>
    runAsync(
      async () => {
        const res = await post<{ data: { seededCount: number } }>(
          `/${PLUGIN_ID}/templates/seed`,
          {}
        );
        notify(
          "success",
          `Seeded ${res.data?.data?.seededCount ?? 0} default template(s)`
        );
      },
      t(
        "settings.ui.msg_failed_to_seed_default_templates",
        "Failed to seed default templates"
      )
    );

  if (!settings) {
    return (
      <Layouts.Root>
        <Layouts.Content>
          <Box padding={6}>
            <Typography>
              {t("settings.ui.loading_settings", "Loading settings...")}
            </Typography>
          </Box>
        </Layouts.Content>
      </Layouts.Root>
    );
  }

  const patchSettings = (patch: Partial<PluginSettings>) =>
    setSettings({ ...settings, ...patch });

  const updateEsign = (patch: Partial<PluginSettings["esign"]>) =>
    patchSettings({
      esign: {
        ...(settings.esign || {
          enabled: false,
          provider: "docusign",
          baseUrl: "https://demo.docusign.net/restapi",
          accountId: "",
        }),
        ...patch,
      },
    });

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
              {t(
                "settings.tab.organization",
                "Issuing Organization & Verification"
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="docusign">
              {t("settings.tab.docusign", "DocuSign E-Signature")}
            </Tabs.Trigger>
            <Tabs.Trigger value="keys">
              {t("settings.tab.keys", "Ed25519 Signing Keys")}
            </Tabs.Trigger>
          </Tabs.List>

          <TabPanelBox value="organization">
            <Typography variant="beta" fontWeight="bold">
              {t(
                "settings.ui.1_issuing_organization_verification_portal",
                "Issuing Organization & Verification Portal"
              )}
            </Typography>
            <Box marginTop={4} style={gridStyle(3)}>
              {renderField(
                t("field.organization_name", "Organization Name"),
                t(
                  "settings.ui.official_issuing_authority_name_printed_on_signe",
                  "Official issuing authority name printed on signed certificates and verification payloads."
                ),
                t(
                  "placeholder.e_g_mezquita_central_abu_bakr_as_siddiq",
                  "e.g., Abu Bakr As-Siddiq Central Mosque"
                ),
                settings.organizationName,
                (organizationName) => patchSettings({ organizationName })
              )}
              {renderField(
                t(
                  "field.organization_subheader_jurisdiction",
                  "Organization Subheader / Jurisdiction"
                ),
                t(
                  "settings.ui.legal_registration_or_jurisdiction_line_displaye",
                  "Legal registration or jurisdiction line displayed beneath the organization header."
                ),
                t(
                  "placeholder.e_g_bogot_d_c_colombia_personer_a_jur_dica_espec",
                  "e.g., Bogotá D.C., Colombia — Special Legal Entity"
                ),
                settings.organizationSubheader,
                (organizationSubheader) =>
                  patchSettings({ organizationSubheader })
              )}
              {renderField(
                t(
                  "field.public_verification_base_url",
                  "Public Verification Base URL"
                ),
                t(
                  "settings.ui.base_url_encoded_into_certificate_qr_codes_for_i",
                  "Base URL encoded into certificate QR codes for instant authenticity verification."
                ),
                t(
                  "placeholder.e_g_https_mezquitacentralbogota_org_verify",
                  "e.g., https://mezquitacentralbogota.org/verify"
                ),
                settings.verificationBaseUrl,
                (verificationBaseUrl) => patchSettings({ verificationBaseUrl })
              )}
            </Box>
            <Box
              marginTop={4}
              padding={4}
              background="neutral100"
              hasRadius
              style={SUB_CARD_BORDER}
            >
              <Flex direction="column" gap={3} alignItems="stretch">
                {renderCheckbox(
                  settings.maskPublicRecipientName,
                  (maskPublicRecipientName) =>
                    patchSettings({ maskPublicRecipientName }),
                  t(
                    "checkbox.mask_recipient_full_name_on_public_serial_lookup",
                    "Mask recipient full name on public serial lookups unless verification token is provided"
                  )
                )}
                {renderCheckbox(
                  settings.allowPublicApplications,
                  (allowPublicApplications) =>
                    patchSettings({ allowPublicApplications }),
                  <>
                    {t(
                      "checkbox.allow_public_certificate_applications",
                      "Allow public certificate applications"
                    )}{" "}
                    (
                    <Code>
                      {t(
                        "settings.ui.endpoint_apply",
                        "POST /api/certificates/apply"
                      )}
                    </Code>
                    )
                  </>
                )}
              </Flex>
            </Box>
          </TabPanelBox>

          <ESignSettingsTab
            esign={settings.esign}
            t={t}
            updateEsign={updateEsign}
          />

          <TabPanelBox value="keys">
            <Flex
              justifyContent="space-between"
              alignItems="center"
              wrap="wrap"
              gap={2}
            >
              <Box>
                <Typography variant="beta" fontWeight="bold">
                  {t(
                    "settings.ui.3_ed25519_cryptographic_public_key",
                    "Ed25519 Cryptographic Public Key"
                  )}
                </Typography>
                <Box marginTop={1}>
                  <Typography variant="pi" textColor="neutral600">
                    {t(
                      "settings.ui.active_key_fingerprint",
                      "Active Key Fingerprint:"
                    )}{" "}
                    <Code>{settings.publicKeyFingerprint}</Code>
                  </Typography>
                </Box>
              </Box>
              <Flex gap={2}>
                <Button variant="secondary" onClick={handleSeedDefaults}>
                  {t(
                    "settings.ui.seed_default_templates",
                    "Seed Default Templates"
                  )}
                </Button>
                <Button
                  variant="danger-light"
                  onClick={handleRotateKeys}
                  loading={rotating}
                >
                  {t(
                    "settings.ui.rotate_ed25519_keypair",
                    "Rotate Ed25519 Keypair"
                  )}
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
                  {t(
                    "field.public_key_pem_published_at",
                    "Public Key PEM (Published at"
                  )}{" "}
                  <Code>
                    {t(
                      "settings.ui.endpoint_public_key",
                      "GET /api/certificates/public-key"
                    )}
                  </Code>{" "}
                  {t(
                    "field.for_offline_embassy_verification",
                    "for offline embassy/consular verification)"
                  )}
                </Field.Label>
                <Textarea
                  placeholder={t(
                    "placeholder.begin_public_key",
                    "-----BEGIN PUBLIC KEY-----"
                  )}
                  value={settings.publicKeyPem}
                  disabled
                />
                <Field.Hint />
              </Field.Root>
            </Box>
          </TabPanelBox>
        </Tabs.Root>
      </Layouts.Content>
    </Layouts.Root>
  );
};

export default SettingsPage;
