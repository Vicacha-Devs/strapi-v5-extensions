import { useIntl } from 'react-intl';
import * as React from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  Main,
  Tabs,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import {
  DEFAULT_BROADCAST_SETTINGS,
  PLUGIN_ID,
} from '../../../shared/constants';
import type { BroadcastSettings } from '../../../shared/types';
import { BridgesSandboxTab } from '../components/BridgesSandboxTab';
import type { TranslateFn } from '../components/DeliveryLedgerSection';
import { OrganizationEmailTab } from '../components/OrganizationEmailTab';
import {
  WhatsAppTransportTab,
  type WhatsAppTransportTabProps,
} from '../components/WhatsAppTransportTab';

const cardBorderStyle: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.22)',
};

const TelegramTransportTab: React.FC<WhatsAppTransportTabProps> = ({
  settings,
  setSettings,
  t,
}) => (
  <Box
    padding={6}
    background="neutral0"
    hasRadius
    shadow="filterShadow"
    style={cardBorderStyle}
  >
    <Flex
      justifyContent="space-between"
      alignItems="center"
      paddingBottom={2}
      wrap="wrap"
      gap={2}
    >
      <Box>
        <Typography variant="beta" tag="h2">
          {t(
            'settings.ui.2_telegram_bot_channel_forum_topic_configuration',
            'Telegram Bot & Channel / Forum Topic Configuration'
          )}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {t(
            'settings.ui.dispatch_announcements_to_your_official_telegram',
            'Dispatch announcements to your official Telegram channel or supergroup forum topics via the Telegram Bot API.'
          )}
        </Typography>
      </Box>
      <Checkbox
        checked={Boolean(settings.telegramEnabled)}
        onCheckedChange={(checked: boolean) =>
          setSettings({ ...settings, telegramEnabled: Boolean(checked) })
        }
      >
        {t('checkbox.enable_telegram_transport', 'Enable Telegram Transport')}
      </Checkbox>
    </Flex>

    <Box
      paddingTop={4}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 20,
      }}
    >
      <Field.Root name="telegramDefaultChatId">
        <Field.Label>
          {t(
            'field.default_channel_handle_or_supergroup_chat_id',
            'Default Channel Handle or Supergroup Chat ID'
          )}
        </Field.Label>
        <TextInput
          name="telegramDefaultChatId"
          placeholder={t(
            'placeholder.e_g_mezquitacentralbogota_or_1001234567890',
            'e.g., @MezquitaCentralBogota or -1001234567890'
          )}
          value={settings.telegramDefaultChatId || ''}
          onChange={(e: { target: { value: string } }) =>
            setSettings({
              ...settings,
              telegramDefaultChatId: e.target.value,
            })
          }
        />
        <Field.Hint>
          {t(
            'settings.ui.public_channel_handle_mezquitacentralbogota_or_n',
            'Public channel handle (@MezquitaCentralBogota) or numeric supergroup ID (-100...).'
          )}
        </Field.Hint>
      </Field.Root>

      <Field.Root name="telegramBotToken">
        <Field.Label>
          {t(
            'field.telegram_bot_api_token_from_botfather',
            'Telegram Bot API Token (from @BotFather)'
          )}
        </Field.Label>
        <TextInput
          name="telegramBotToken"
          type="password"
          placeholder={t(
            'placeholder.e_g_123456789_abcdefghijklmnopqrstuvwxyz',
            'e.g., 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ'
          )}
          value={settings.telegramBotToken || ''}
          onChange={(e: { target: { value: string } }) =>
            setSettings({ ...settings, telegramBotToken: e.target.value })
          }
        />
        <Field.Hint>
          {t(
            'settings.ui.bot_token_with_administrator_permission_to_post_',
            'Bot token with administrator permission to post messages in the target channel/supergroup.'
          )}
        </Field.Hint>
      </Field.Root>
    </Box>
  </Box>
);

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t: TranslateFn = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
  const { get, put } = useFetchClient();
  const [settings, setSettings] = React.useState<BroadcastSettings>(
    DEFAULT_BROADCAST_SETTINGS
  );
  const [savedNotice, setSavedNotice] = React.useState<string>('');

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await get<{ data?: Partial<BroadcastSettings> }>(
          `/${PLUGIN_ID}/settings`
        );
        if (res?.data?.data) {
          setSettings({
            ...DEFAULT_BROADCAST_SETTINGS,
            ...res.data.data,
          });
        }
      } catch {
        // Fallback to defaults
      }
    };
    void fetchSettings();
  }, []);

  const handleSave = async () => {
    const res = await put<{ data?: Partial<BroadcastSettings> }>(
      `/${PLUGIN_ID}/settings`,
      settings
    );
    if (res?.data?.data) {
      setSettings({
        ...DEFAULT_BROADCAST_SETTINGS,
        ...res.data.data,
      });
      setSavedNotice(
        t(
          'settings.ui.settings_saved_notice',
          'Omnichannel Broadcast transport & channel settings saved successfully.'
        )
      );
    }
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_BROADCAST_SETTINGS);
    setSavedNotice(
      t(
        'settings.ui.settings_reset_notice',
        'Settings reset to defaults in editor. Click "Save Settings" to persist.'
      )
    );
  };

  const enabledText = t('common.enabled', 'Enabled');
  const disabledText = t('common.disabled', 'Disabled');
  const tgStatus = settings.telegramEnabled ? enabledText : disabledText;
  const waStatus = settings.whatsappEnabled
    ? settings.whatsappDriver
    : disabledText;
  const modeStatus = settings.dryRun
    ? t('settings.ui.dry_run_sandbox', 'Dry-Run Sandbox')
    : t('settings.ui.live_dispatch', 'Live Dispatch');

  return (
    <Main>
      <Box padding={8}>
        <Flex
          justifyContent="space-between"
          alignItems="flex-start"
          paddingBottom={6}
          wrap="wrap"
          gap={4}
        >
          <Box>
            <Typography variant="alpha" tag="h1">
              {t(
                'settings.ui.broadcast_transport_channel_settings',
                'Broadcast Transport & Channel Settings'
              )}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="epsilon" textColor="neutral600">
                {t(
                  'settings.ui.configure_email_newsletters_telegram_bot_forum_t',
                  'Configure Email newsletters, Telegram Bot & Forum Topics, WhatsApp Cloud API / Gateways, and EventHub auto-triggers'
                )}
              </Typography>
            </Box>
            <Flex gap={2} paddingTop={3} wrap="wrap">
              <Badge>
                {(settings.supportedLocales || []).length}{' '}
                {t('settings.ui.active_locales_label', 'Active Locales')}
              </Badge>
              <Badge>
                {t('settings.ui.telegram_badge_prefix', 'Telegram:')} {tgStatus}
              </Badge>
              <Badge>
                {t('settings.ui.whatsapp_badge_prefix', 'WhatsApp:')} {waStatus}
              </Badge>
              <Badge>
                {t('settings.ui.mode_badge_prefix', 'Mode:')} {modeStatus}
              </Badge>
            </Flex>
          </Box>
          <Flex gap={2}>
            <Button variant="tertiary" onClick={handleResetDefaults}>
              {t('settings.ui.reset_to_defaults', 'Reset to Defaults')}
            </Button>
            <Button onClick={handleSave}>
              {t('settings.ui.save_settings', 'Save Settings')}
            </Button>
          </Flex>
        </Flex>

        {savedNotice && (
          <Box padding={3} marginBottom={4} background="success100" hasRadius>
            <Typography textColor="success700" fontWeight="semiBold">
              {savedNotice}
            </Typography>
          </Box>
        )}

        <Tabs.Root defaultValue="organization">
          <Tabs.List
            aria-label={t(
              'settings.ui.broadcast_transport_channel_settings',
              'Broadcast Transport & Channel Settings'
            )}
          >
            <Tabs.Trigger value="organization">
              {t(
                'settings.ui.1_organization_multi_language_email_hijri_calend',
                'Organization, Multi-Language & Email'
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="telegram">
              {t(
                'settings.ui.2_telegram_bot_channel_forum_topic_configuration',
                'Telegram Bot & Channel'
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="whatsapp">
              {t(
                'settings.ui.3_whatsapp_transport_meta_cloud_api_evolution_op',
                'WhatsApp Transport'
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="bridges">
              {t(
                'settings.ui.4_ecosystem_bridges_sandbox_mode',
                'Ecosystem Bridges & Sandbox'
              )}
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="organization">
            <OrganizationEmailTab
              settings={settings}
              setSettings={setSettings}
              t={t}
            />
          </Tabs.Content>

          <Tabs.Content value="telegram">
            <TelegramTransportTab
              settings={settings}
              setSettings={setSettings}
              t={t}
            />
          </Tabs.Content>

          <Tabs.Content value="whatsapp">
            <WhatsAppTransportTab
              settings={settings}
              setSettings={setSettings}
              t={t}
            />
          </Tabs.Content>

          <Tabs.Content value="bridges">
            <BridgesSandboxTab
              settings={settings}
              setSettings={setSettings}
              t={t}
            />
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Main>
  );
};

export default SettingsPage;
