import * as React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  Main,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import {
  DEFAULT_INBOX_SETTINGS,
  PLUGIN_ID,
  type CaptchaProvider,
  type InboxSettings,
} from '../../../shared';

export const SettingsPage: React.FC = () => {
  const { get, put, post } = useFetchClient();
  const [settings, setSettings] = React.useState<InboxSettings>(DEFAULT_INBOX_SETTINGS);
  const [savedNotice, setSavedNotice] = React.useState<string>('');
  const [captchaTestResult, setCaptchaTestResult] = React.useState<string>('');

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await get(`/${PLUGIN_ID}/settings`);
        if (res?.data?.data) {
          setSettings(res.data.data);
        }
      } catch {
        // Fallback to defaults
      }
    };
    void fetchSettings();
  }, []);

  const handleSave = async () => {
    const res = await put(`/${PLUGIN_ID}/settings`, settings);
    if (res?.data?.data) {
      setSettings(res.data.data);
      setSavedNotice('Inbox & Form Builder settings saved');
    }
  };

  const handleTestCaptcha = async (provider: CaptchaProvider, secret?: string) => {
    const res = await post(`/${PLUGIN_ID}/captcha/test`, {
      provider,
      secret: secret || '',
    });
    const out = res?.data?.data;
    setCaptchaTestResult(
      out?.ok ? `${provider} secret key verified!` : `Failed: ${out?.reason || 'Invalid key'}`
    );
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
          <Box>
            <Typography variant="alpha" tag="h1">
              Inbox, Anti-Spam & Casework Settings
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Configure multi-locale support, Cloudflare Turnstile / Google reCAPTCHA v2, double opt-in, and ecosystem bridges
            </Typography>
          </Box>
          <Button onClick={handleSave}>Save Settings</Button>
        </Flex>

        {savedNotice ? (
          <Box padding={3} marginBottom={4} background="success100" hasRadius>
            <Typography textColor="success700">{savedNotice}</Typography>
          </Box>
        ) : null}

        {captchaTestResult ? (
          <Box padding={3} marginBottom={4} background="neutral100" hasRadius>
            <Typography>{captchaTestResult}</Typography>
          </Box>
        ) : null}

        <Divider />

        <Box paddingTop={6}>
          <Typography variant="beta" tag="h2">
            1. Multi-Language & Multi-Calendar Configuration
          </Typography>
          <Flex gap={4} paddingTop={4}>
            <TextInput
              label="Default Locale"
              name="defaultLocale"
              value={settings.defaultLocale}
              onChange={(e: { target: { value: string } }) =>
                setSettings({ ...settings, defaultLocale: e.target.value })
              }
            />
            <TextInput
              label="Supported Locales (comma-separated)"
              name="supportedLocales"
              value={(settings.supportedLocales || []).join(',')}
              onChange={(e: { target: { value: string } }) =>
                setSettings({
                  ...settings,
                  supportedLocales: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
            <TextInput
              label="Primary Calendar System"
              name="primaryCalendar"
              value={settings.primaryCalendar}
              onChange={(e: { target: { value: string } }) =>
                setSettings({
                  ...settings,
                  primaryCalendar: e.target.value as InboxSettings['primaryCalendar'],
                })
              }
            />
          </Flex>
        </Box>

        <Box paddingTop={6}>
          <Typography variant="beta" tag="h2">
            2. Anti-Spam Guard (Honeypot, Rate Limiting & CAPTCHA)
          </Typography>
          <Flex gap={4} paddingTop={4}>
            <TextInput
              label="Default Honeypot Field Name"
              name="defaultHoneypotField"
              value={settings.defaultHoneypotField}
              onChange={(e: { target: { value: string } }) =>
                setSettings({ ...settings, defaultHoneypotField: e.target.value })
              }
            />
            <TextInput
              label="Default Hourly Rate Limit per IP"
              name="defaultRateLimitPerHour"
              value={String(settings.defaultRateLimitPerHour)}
              onChange={(e: { target: { value: string } }) =>
                setSettings({
                  ...settings,
                  defaultRateLimitPerHour: Number(e.target.value) || 15,
                })
              }
            />
            <TextInput
              label="Cloudflare Turnstile Secret Key"
              name="turnstileSecretKey"
              value={settings.turnstileSecretKey || ''}
              onChange={(e: { target: { value: string } }) =>
                setSettings({ ...settings, turnstileSecretKey: e.target.value })
              }
            />
            <Button
              variant="secondary"
              onClick={() => handleTestCaptcha('turnstile', settings.turnstileSecretKey)}
            >
              Test Turnstile
            </Button>
          </Flex>
        </Box>

        <Box paddingTop={6}>
          <Typography variant="beta" tag="h2">
            3. Double Opt-In & Ecosystem Bridges
          </Typography>
          <Flex gap={6} paddingTop={4}>
            <Checkbox
              checked={settings.enableDoubleOptIn}
              onCheckedChange={(checked: boolean) =>
                setSettings({ ...settings, enableDoubleOptIn: Boolean(checked) })
              }
            >
              Enable Double Opt-In for Newsletter & Topic Subscribers
            </Checkbox>
            <Checkbox
              checked={settings.enableBookingBridge}
              onCheckedChange={(checked: boolean) =>
                setSettings({ ...settings, enableBookingBridge: Boolean(checked) })
              }
            >
              Enable @vicacha-devs/strapi-plugin-bookings Bridge
            </Checkbox>
            <Checkbox
              checked={settings.enableCertificateBridge}
              onCheckedChange={(checked: boolean) =>
                setSettings({ ...settings, enableCertificateBridge: Boolean(checked) })
              }
            >
              Enable @vicacha-devs/strapi-plugin-certificates Bridge
            </Checkbox>
          </Flex>
        </Box>
      </Box>
    </Main>
  );
};

export default SettingsPage;
