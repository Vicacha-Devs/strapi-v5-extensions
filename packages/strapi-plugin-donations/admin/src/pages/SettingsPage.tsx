import React, { useEffect, useState } from 'react';
import {
  Main,
  Box,
  Flex,
  Typography,
  Button,
  TextInput,
  Checkbox,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import { PLUGIN_ID, type DonationsSettings } from '../../../shared';

export const SettingsPage: React.FC = () => {
  const { get, put } = useFetchClient();
  const [settings, setSettings] = useState<DonationsSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await get(`/${PLUGIN_ID}/settings`);
      if (res?.data?.data) {
        setSettings(res.data.data);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await put(`/${PLUGIN_ID}/settings`, { data: settings });
      if (res?.data?.data) {
        setSettings(res.data.data);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <Main>
        <Box padding={8}>
          <Typography>Loading donations & utility invoice settings...</Typography>
        </Box>
      </Main>
    );
  }

  return (
    <Main>
      <Box padding={8}>
        <Flex justifyContent="space-between" alignItems="center" marginBottom={6}>
          <Box>
            <Typography variant="alpha" as="h1">
              Donations & Utility Invoices Settings
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Configure currencies, assessment calculator profiles, host collection mappings, and tax certificate issuance.
            </Typography>
          </Box>
          <Button onClick={() => void handleSave()} loading={saving}>
            Save Settings
          </Button>
        </Flex>

        <Box background="neutral0" padding={6} hasRadius shadow="filterShadow" marginBottom={6}>
          <Typography variant="delta" as="h2" marginBottom={4}>
            Currency & Localization
          </Typography>
          <Flex gap={4} wrap="wrap">
            <Box style={{ minWidth: 220 }}>
              <TextInput
                label="Default Locale"
                name="defaultLocale"
                value={settings.defaultLocale}
                onChange={(e: any) => setSettings({ ...settings, defaultLocale: e.target.value })}
              />
            </Box>
            <Box style={{ minWidth: 220 }}>
              <TextInput
                label="Base Currency"
                name="baseCurrency"
                value={settings.baseCurrency}
                onChange={(e: any) =>
                  setSettings({ ...settings, baseCurrency: e.target.value.toUpperCase() })
                }
              />
            </Box>
            <Box style={{ minWidth: 320 }}>
              <TextInput
                label="Tax Certificate Template Slug"
                name="taxCertificateTemplateSlug"
                value={settings.taxCertificateTemplateSlug}
                onChange={(e: any) =>
                  setSettings({ ...settings, taxCertificateTemplateSlug: e.target.value })
                }
              />
            </Box>
          </Flex>

          <Flex gap={6} marginTop={4}>
            <Checkbox
              checked={settings.enableCertificatesBridge}
              onCheckedChange={(val: boolean) =>
                setSettings({ ...settings, enableCertificatesBridge: Boolean(val) })
              }
            >
              Enable Cryptographic Tax Certificate Bridge (@vicacha-devs/strapi-plugin-certificates)
            </Checkbox>
            <Checkbox
              checked={settings.autoIssueCertificateOnVerify}
              onCheckedChange={(val: boolean) =>
                setSettings({ ...settings, autoIssueCertificateOnVerify: Boolean(val) })
              }
            >
              Auto-Issue Tax Certificate When Pledge is Verified
            </Checkbox>
          </Flex>
        </Box>
      </Box>
    </Main>
  );
};

export default SettingsPage;
