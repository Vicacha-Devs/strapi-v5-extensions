import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  Layouts,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { PLUGIN_ID, type CertificatesPluginSettings } from '../../../shared';

export const SettingsPage: React.FC = () => {
  const { get, put, post } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [settings, setSettings] = useState<CertificatesPluginSettings | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await get<{ data: CertificatesPluginSettings }>(
        `/${PLUGIN_ID}/settings`
      );
      if (res.data?.data) {
        setSettings(res.data.data);
      }
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to load certificates plugin settings',
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
      if (res.data?.data) {
        setSettings(res.data.data);
      }
      toggleNotification({
        type: 'success',
        message: 'Certificates authority settings saved',
      });
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to save settings',
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
        type: 'warning',
        message: 'Generated new Ed25519 signing keypair',
      });
      await loadSettings();
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to rotate Ed25519 keypair',
      });
    } finally {
      setRotating(false);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const res = await post<{ data: { seededCount: number } }>(
        `/${PLUGIN_ID}/templates/seed`,
        {}
      );
      toggleNotification({
        type: 'success',
        message: `Seeded ${res.data?.data?.seededCount ?? 0} default template(s)`,
      });
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to seed default templates',
      });
    }
  };

  if (!settings) {
    return (
      <Layouts.Root>
        <Layouts.Content>
          <Box padding={6}>
            <Typography>Loading settings...</Typography>
          </Box>
        </Layouts.Content>
      </Layouts.Root>
    );
  }

  return (
    <Layouts.Root>
      <Layouts.Header
        title="Certificates Authority & Ed25519 / DocuSign Settings"
        subtitle="Configure issuer organization metadata, public verification URL, Ed25519 cryptographic signing keys, and optional DocuSign eSignature integration"
        primaryAction={
          <Button onClick={handleSave} loading={saving}>
            Save Settings
          </Button>
        }
      />
      <Layouts.Content>
        <Flex direction="column" gap={6} alignItems="stretch">
          <Box padding={6} background="neutral0" hasRadius shadow="filterShadow">
            <Typography variant="beta" fontWeight="bold">
              Issuing Organization & Verification Portal
            </Typography>
            <Flex direction="column" gap={4} marginTop={4} alignItems="stretch">
              <Field.Root>
                <Field.Label>Organization Name</Field.Label>
                <TextInput
                  value={settings.organizationName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSettings({ ...settings, organizationName: e.target.value })
                  }
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Organization Subheader / Jurisdiction</Field.Label>
                <TextInput
                  value={settings.organizationSubheader}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSettings({
                      ...settings,
                      organizationSubheader: e.target.value,
                    })
                  }
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Public Verification Base URL</Field.Label>
                <TextInput
                  value={settings.verificationBaseUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSettings({
                      ...settings,
                      verificationBaseUrl: e.target.value,
                    })
                  }
                />
              </Field.Root>
              <Checkbox
                checked={settings.maskPublicRecipientName}
                onCheckedChange={(val: boolean) =>
                  setSettings({
                    ...settings,
                    maskPublicRecipientName: Boolean(val),
                  })
                }
              >
                Mask recipient full name on public serial lookups unless verification token is provided
              </Checkbox>
              <Checkbox
                checked={settings.allowPublicApplications}
                onCheckedChange={(val: boolean) =>
                  setSettings({
                    ...settings,
                    allowPublicApplications: Boolean(val),
                  })
                }
              >
                Allow public certificate applications (POST /api/certificates/apply)
              </Checkbox>
            </Flex>
          </Box>

          <Box padding={6} background="neutral0" hasRadius shadow="filterShadow">
            <Typography variant="beta" fontWeight="bold">
              Optional DocuSign E-Signature Service
            </Typography>
            <Box marginTop={1}>
              <Typography variant="pi" textColor="neutral600">
                Secrets (DOCUSIGN_ACCESS_TOKEN & DOCUSIGN_WEBHOOK_SECRET) are loaded from environment variables. Connect webhook endpoint: POST /api/certificates/webhooks/docusign
              </Typography>
            </Box>
            <Flex direction="column" gap={4} marginTop={4} alignItems="stretch">
              <Checkbox
                checked={settings.esign?.enabled ?? false}
                onCheckedChange={(val: boolean) =>
                  setSettings({
                    ...settings,
                    esign: {
                      ...(settings.esign || {
                        provider: 'docusign',
                        baseUrl: 'https://demo.docusign.net/restapi',
                        accountId: '',
                      }),
                      enabled: Boolean(val),
                      provider: val ? 'docusign' : 'none',
                    },
                  })
                }
              >
                Enable DocuSign eSignature multi-party envelope routing for Witnesses & Signatories
              </Checkbox>
              <Flex gap={4} wrap="wrap">
                <Box style={{ flex: 1, minWidth: 240 }}>
                  <Field.Root>
                    <Field.Label>DocuSign REST API Base URL (HTTPS)</Field.Label>
                    <TextInput
                      value={settings.esign?.baseUrl || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettings({
                          ...settings,
                          esign: {
                            ...settings.esign,
                            baseUrl: e.target.value,
                          },
                        })
                      }
                      placeholder="https://demo.docusign.net/restapi"
                    />
                  </Field.Root>
                </Box>
                <Box style={{ flex: 1, minWidth: 220 }}>
                  <Field.Root>
                    <Field.Label>DocuSign Account ID</Field.Label>
                    <TextInput
                      value={settings.esign?.accountId || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettings({
                          ...settings,
                          esign: {
                            ...settings.esign,
                            accountId: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. a1b2c3d4-..."
                    />
                  </Field.Root>
                </Box>
              </Flex>
            </Flex>
          </Box>

          <Box padding={6} background="neutral0" hasRadius shadow="filterShadow">
            <Flex justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="beta" fontWeight="bold">
                  Ed25519 Cryptographic Public Key
                </Typography>
                <Box marginTop={1}>
                  <Typography variant="pi" textColor="neutral600">
                    Active Key Fingerprint: {settings.publicKeyFingerprint}
                  </Typography>
                </Box>
              </Box>
              <Flex gap={2}>
                <Button variant="secondary" onClick={handleSeedDefaults}>
                  Seed Default Templates
                </Button>
                <Button
                  variant="danger-light"
                  onClick={handleRotateKeys}
                  loading={rotating}
                >
                  Rotate Ed25519 Keypair
                </Button>
              </Flex>
            </Flex>
            <Box marginTop={4}>
              <Field.Root>
                <Field.Label>
                  Public Key PEM (Published at GET /api/certificates/public-key for offline embassy/consular verification)
                </Field.Label>
                <Textarea value={settings.publicKeyPem} disabled />
              </Field.Root>
            </Box>
          </Box>
        </Flex>
      </Layouts.Content>
    </Layouts.Root>
  );
};

export default SettingsPage;
