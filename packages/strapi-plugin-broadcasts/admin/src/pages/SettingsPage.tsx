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
  DEFAULT_BROADCAST_SETTINGS,
  PLUGIN_ID,
  type BroadcastSettings,
  type WhatsAppDriver,
} from '../../../shared';

export const SettingsPage: React.FC = () => {
  const { get, put } = useFetchClient();
  const [settings, setSettings] = React.useState<BroadcastSettings>(
    DEFAULT_BROADCAST_SETTINGS
  );
  const [savedNotice, setSavedNotice] = React.useState<string>('');

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
      setSavedNotice('Omnichannel Broadcast settings saved');
    }
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
          <Box>
            <Typography variant="alpha" tag="h1">
              Broadcast Transport & Channel Settings
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Configure Email, Telegram Bot & Forum Topics, WhatsApp Cloud API / Gateways, and Hijri secondary calendar
            </Typography>
          </Box>
          <Button onClick={handleSave}>Save Settings</Button>
        </Flex>

        {savedNotice ? (
          <Box padding={3} marginBottom={4} background="success100" hasRadius>
            <Typography textColor="success700">{savedNotice}</Typography>
          </Box>
        ) : null}

        <Divider />

        <Box paddingTop={6}>
          <Typography variant="beta" tag="h2">
            1. Organization, Multi-Language & Hijri Calendar
          </Typography>
          <Flex gap={4} paddingTop={4}>
            <TextInput
              label="Organization Name"
              name="organizationName"
              value={settings.organizationName}
              onChange={(e: { target: { value: string } }) =>
                setSettings({ ...settings, organizationName: e.target.value })
              }
            />
            <TextInput
              label="Default Locale"
              name="defaultLocale"
              value={settings.defaultLocale}
              onChange={(e: { target: { value: string } }) =>
                setSettings({ ...settings, defaultLocale: e.target.value })
              }
            />
            <TextInput
              label="Email From Address"
              name="emailFromAddress"
              value={settings.emailFromAddress}
              onChange={(e: { target: { value: string } }) =>
                setSettings({ ...settings, emailFromAddress: e.target.value })
              }
            />
          </Flex>
        </Box>

        <Box paddingTop={6}>
          <Typography variant="beta" tag="h2">
            2. Telegram Bot & Channel Configuration
          </Typography>
          <Flex gap={4} paddingTop={4}>
            <TextInput
              label="Default Channel / Supergroup Chat ID"
              name="telegramDefaultChatId"
              value={settings.telegramDefaultChatId}
              onChange={(e: { target: { value: string } }) =>
                setSettings({ ...settings, telegramDefaultChatId: e.target.value })
              }
            />
            <TextInput
              label="Telegram Bot Token"
              name="telegramBotToken"
              value={settings.telegramBotToken || ''}
              onChange={(e: { target: { value: string } }) =>
                setSettings({ ...settings, telegramBotToken: e.target.value })
              }
            />
          </Flex>
        </Box>

        <Box paddingTop={6}>
          <Typography variant="beta" tag="h2">
            3. WhatsApp Transport (Meta Cloud API / OpenWA / Evolution)
          </Typography>
          <Flex gap={4} paddingTop={4}>
            <TextInput
              label="WhatsApp Driver (meta-cloud | openwa | evolution)"
              name="whatsappDriver"
              value={settings.whatsappDriver}
              onChange={(e: { target: { value: string } }) =>
                setSettings({
                  ...settings,
                  whatsappDriver: e.target.value as WhatsAppDriver,
                })
              }
            />
            <TextInput
              label="Meta WABA Phone Number ID"
              name="whatsappPhoneNumberId"
              value={settings.whatsappPhoneNumberId || ''}
              onChange={(e: { target: { value: string } }) =>
                setSettings({
                  ...settings,
                  whatsappPhoneNumberId: e.target.value,
                })
              }
            />
            <TextInput
              label="Self-Hosted Gateway URL (HTTPS)"
              name="whatsappGatewayUrl"
              value={settings.whatsappGatewayUrl || ''}
              onChange={(e: { target: { value: string } }) =>
                setSettings({ ...settings, whatsappGatewayUrl: e.target.value })
              }
            />
          </Flex>
        </Box>

        <Box paddingTop={6}>
          <Typography variant="beta" tag="h2">
            4. Bridges & Sandbox Mode
          </Typography>
          <Flex gap={6} paddingTop={4}>
            <Checkbox
              checked={settings.dryRun}
              onCheckedChange={(checked: boolean) =>
                setSettings({ ...settings, dryRun: Boolean(checked) })
              }
            >
              Enable Dry-Run Sandbox Mode (simulate dispatches without calling external APIs)
            </Checkbox>
            <Checkbox
              checked={settings.enableInboxSubscriberBridge}
              onCheckedChange={(checked: boolean) =>
                setSettings({
                  ...settings,
                  enableInboxSubscriberBridge: Boolean(checked),
                })
              }
            >
              Segment Confirmed Subscribers via @vicacha-devs/strapi-plugin-inbox Bridge
            </Checkbox>
            <Checkbox
              checked={settings.enableEventHubAutomations}
              onCheckedChange={(checked: boolean) =>
                setSettings({
                  ...settings,
                  enableEventHubAutomations: Boolean(checked),
                })
              }
            >
              Enable EventHub Auto-Broadcast Triggers
            </Checkbox>
          </Flex>
        </Box>
      </Box>
    </Main>
  );
};

export default SettingsPage;
