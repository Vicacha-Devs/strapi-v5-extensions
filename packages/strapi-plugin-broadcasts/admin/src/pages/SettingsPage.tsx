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
  SingleSelect,
  SingleSelectOption,
  Tabs,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import {
  DEFAULT_BROADCAST_SETTINGS,
  PLUGIN_ID,
} from '../../../shared/constants';
import type {
  BroadcastSettings,
  WhatsAppDriver,
} from '../../../shared/types';

const LOCALE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'es', label: 'es — Español (Spanish)' },
  { value: 'en', label: 'en — English' },
  { value: 'ar', label: 'ar — العربية (Arabic)' },
  { value: 'tr', label: 'tr — Türkçe (Turkish)' },
  { value: 'fr', label: 'fr — Français (French)' },
  { value: 'pt', label: 'pt — Português (Portuguese)' },
];

const WHATSAPP_DRIVER_OPTIONS: Array<{ value: WhatsAppDriver; label: string }> = [
  { value: 'meta-cloud', label: 'Meta WhatsApp Cloud API (Official WABA — meta-cloud)' },
  { value: 'evolution', label: 'Evolution API v2 Self-Hosted Gateway (evolution)' },
  { value: 'openwa', label: 'OpenWA Self-Hosted Gateway (openwa)' },
];

const cardBorderStyle: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.22)',
};

const subCardStyle: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.22)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

function parseCsvList(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
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
    const res = await put(`/${PLUGIN_ID}/settings`, settings);
    if (res?.data?.data) {
      setSettings({
        ...DEFAULT_BROADCAST_SETTINGS,
        ...res.data.data,
      });
      setSavedNotice('Omnichannel Broadcast transport & channel settings saved successfully.');
    }
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_BROADCAST_SETTINGS);
    setSavedNotice('Settings reset to defaults in editor. Click "Save Settings" to persist.');
  };

  return (
    <Main>
      <Box padding={8}>
        {/* Header */}
        <Flex justifyContent="space-between" alignItems="flex-start" paddingBottom={6} wrap="wrap" gap={4}>
          <Box>
            <Typography variant="alpha" tag="h1">
              {t('settings.ui.broadcast_transport_channel_settings', 'Broadcast Transport & Channel Settings')}
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
              <Badge>{(settings.supportedLocales || []).length} Active Locales</Badge>
              <Badge>Telegram: {settings.telegramEnabled ? 'Enabled' : 'Disabled'}</Badge>
              <Badge>
                WhatsApp: {settings.whatsappEnabled ? settings.whatsappDriver : 'Disabled'}
              </Badge>
              <Badge>Mode: {settings.dryRun ? 'Dry-Run Sandbox' : 'Live Dispatch'}</Badge>
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

        {savedNotice ? (
          <Box padding={3} marginBottom={4} background="success100" hasRadius>
            <Typography textColor="success700" fontWeight="semiBold">
              {savedNotice}
            </Typography>
          </Box>
        ) : null}

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

          {/* Tab 1: Organization, Multi-Language & Email */}
          <Tabs.Content value="organization">
            <Box
              padding={6}
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              style={cardBorderStyle}
            >
              <Flex justifyContent="space-between" alignItems="center" paddingBottom={2} wrap="wrap" gap={2}>
                <Box>
                  <Typography variant="beta" tag="h2">
                    {t(
                      'settings.ui.1_organization_multi_language_email_hijri_calend',
                      'Organization, Multi-Language & Email'
                    )}
                  </Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {t(
                      'settings.ui.configure_organization_identity_sender_reply_to_',
                      'Configure organization identity, sender/reply-to email addresses, supported locales, and broadcast topic segments.'
                    )}
                  </Typography>
                </Box>
                <Badge>{(settings.supportedLocales || []).length} Active Locales</Badge>
              </Flex>

              <Box
                paddingTop={4}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 20,
                }}
              >
                <Field.Root name="organizationName">
                  <Field.Label>{t('field.organization_name', 'Organization Name')}</Field.Label>
                  <TextInput
                    name="organizationName"
                    placeholder={t('placeholder.e_g_mezquita_central_abu_bakr_as_siddiq_bogot', 'e.g., Abu Bakr As-Siddiq Central Mosque — Bogotá')}
                    value={settings.organizationName || ''}
                    onChange={(e: { target: { value: string } }) =>
                      setSettings({ ...settings, organizationName: e.target.value })
                    }
                  />
                  <Field.Hint>
                    Injected into broadcast templates via the {'{{organizationName}}'} variable.
                  </Field.Hint>
                </Field.Root>

                <Field.Root name="siteBaseUrl">
                  <Field.Label>{t('field.public_site_base_url', 'Public Site Base URL')}</Field.Label>
                  <TextInput
                    name="siteBaseUrl"
                    placeholder={t('placeholder.e_g_https_mezquitabogota_org', 'e.g., https://mezquitabogota.org')}
                    value={settings.siteBaseUrl || ''}
                    onChange={(e: { target: { value: string } }) =>
                      setSettings({ ...settings, siteBaseUrl: e.target.value })
                    }
                  />
                  <Field.Hint>
                    Base URL used for CTA links, 1-click unsubscribe links, and {'{{siteBaseUrl}}'} placeholders.
                  </Field.Hint>
                </Field.Root>

                <Field.Root name="emailFromAddress">
                  <Field.Label>{t('field.email_sender_from_address', 'Email Sender (From Address)')}</Field.Label>
                  <TextInput
                    name="emailFromAddress"
                    placeholder={t('placeholder.e_g_no_reply_mezquitabogota_org', 'e.g., no-reply@mezquitabogota.org')}
                    value={settings.emailFromAddress || ''}
                    onChange={(e: { target: { value: string } }) =>
                      setSettings({ ...settings, emailFromAddress: e.target.value })
                    }
                  />
                  <Field.Hint>{t('settings.ui.verified_sender_address_used_when_dispatching_em', 'Verified sender address used when dispatching email newsletters and bulletins.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="emailReplyToAddress">
                  <Field.Label>{t('field.email_reply_to_address', 'Email Reply-To Address')}</Field.Label>
                  <TextInput
                    name="emailReplyToAddress"
                    placeholder={t('placeholder.e_g_info_mezquitabogota_org', 'e.g., info@mezquitabogota.org')}
                    value={settings.emailReplyToAddress || ''}
                    onChange={(e: { target: { value: string } }) =>
                      setSettings({ ...settings, emailReplyToAddress: e.target.value })
                    }
                  />
                  <Field.Hint>{t('settings.ui.reply_to_inbox_where_community_members_can_respo', 'Reply-to inbox where community members can respond to email broadcasts.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="defaultLocale">
                  <Field.Label>{t('field.default_broadcast_locale', 'Default Broadcast Locale')}</Field.Label>
                  <SingleSelect
                    placeholder={t('placeholder.select_default_locale', 'Select default locale')}
                    value={settings.defaultLocale || 'es'}
                    onChange={(val: string | number) =>
                      setSettings({ ...settings, defaultLocale: String(val) })
                    }
                  >
                    {LOCALE_OPTIONS.map((opt) => (
                      <SingleSelectOption key={opt.value} value={opt.value}>
                        {opt.label}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                  <Field.Hint>{t('settings.ui.fallback_language_when_a_recipient_does_not_have', 'Fallback language when a recipient does not have a preferred locale on file.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="supportedLocales">
                  <Field.Label>{t('field.supported_locales_comma_separated', 'Supported Locales (comma-separated)')}</Field.Label>
                  <TextInput
                    name="supportedLocales"
                    placeholder={t('placeholder.e_g_es_en_ar_tr', 'e.g., es, en, ar, tr')}
                    value={(settings.supportedLocales || []).join(', ')}
                    onChange={(e: { target: { value: string } }) =>
                      setSettings({
                        ...settings,
                        supportedLocales: parseCsvList(e.target.value),
                      })
                    }
                  />
                  <Field.Hint>{t('settings.ui.languages_enabled_for_localized_campaign_subject', 'Languages enabled for localized campaign subject/body templates.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="availableTopics">
                  <Field.Label>{t('field.broadcast_topic_segments_comma_separated', 'Broadcast Topic Segments (comma-separated)')}</Field.Label>
                  <TextInput
                    name="availableTopics"
                    placeholder={t('placeholder.e_g_announcements_events_courses_ramadan_eid_urg', 'e.g., announcements, events, courses, ramadan_eid, urgent_janazah')}
                    value={(settings.availableTopics || []).join(', ')}
                    onChange={(e: { target: { value: string } }) =>
                      setSettings({
                        ...settings,
                        availableTopics: parseCsvList(e.target.value),
                      })
                    }
                  />
                  <Field.Hint>{t('settings.ui.topic_segments_used_to_target_confirmed_subscrib', 'Topic segments used to target confirmed subscribers and Telegram forum threads.')}</Field.Hint>
                </Field.Root>
              </Box>
            </Box>
          </Tabs.Content>

          {/* Tab 2: Telegram Bot & Channel Configuration */}
          <Tabs.Content value="telegram">
            <Box
              padding={6}
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              style={cardBorderStyle}
            >
              <Flex justifyContent="space-between" alignItems="center" paddingBottom={2} wrap="wrap" gap={2}>
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
                  <Field.Label>{t('field.default_channel_handle_or_supergroup_chat_id', 'Default Channel Handle or Supergroup Chat ID')}</Field.Label>
                  <TextInput
                    name="telegramDefaultChatId"
                    placeholder={t('placeholder.e_g_mezquitacentralbogota_or_1001234567890', 'e.g., @MezquitaCentralBogota or -1001234567890')}
                    value={settings.telegramDefaultChatId || ''}
                    onChange={(e: { target: { value: string } }) =>
                      setSettings({ ...settings, telegramDefaultChatId: e.target.value })
                    }
                  />
                  <Field.Hint>{t('settings.ui.public_channel_handle_mezquitacentralbogota_or_n', 'Public channel handle (@MezquitaCentralBogota) or numeric supergroup ID (-100...).')}</Field.Hint>
                </Field.Root>

                <Field.Root name="telegramBotToken">
                  <Field.Label>{t('field.telegram_bot_api_token_from_botfather', 'Telegram Bot API Token (from @BotFather)')}</Field.Label>
                  <TextInput
                    name="telegramBotToken"
                    type="password"
                    placeholder={t('placeholder.e_g_123456789_abcdefghijklmnopqrstuvwxyz', 'e.g., 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ')}
                    value={settings.telegramBotToken || ''}
                    onChange={(e: { target: { value: string } }) =>
                      setSettings({ ...settings, telegramBotToken: e.target.value })
                    }
                  />
                  <Field.Hint>{t('settings.ui.bot_token_with_administrator_permission_to_post_', 'Bot token with administrator permission to post messages in the target channel/supergroup.')}</Field.Hint>
                </Field.Root>
              </Box>
            </Box>
          </Tabs.Content>

          {/* Tab 3: WhatsApp Transport */}
          <Tabs.Content value="whatsapp">
            <Box
              padding={6}
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              style={cardBorderStyle}
            >
              <Flex justifyContent="space-between" alignItems="center" paddingBottom={2} wrap="wrap" gap={2}>
                <Box>
                  <Typography variant="beta" tag="h2">
                    {t(
                      'settings.ui.3_whatsapp_transport_meta_cloud_api_evolution_op',
                      'WhatsApp Transport (Meta Cloud API / Evolution / OpenWA)'
                    )}
                  </Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {t(
                      'settings.ui.configure_official_meta_whatsapp_business_cloud_',
                      'Configure official Meta WhatsApp Business Cloud API (WABA) or self-hosted Evolution / OpenWA gateways with SSRF protection.'
                    )}
                  </Typography>
                </Box>
                <Checkbox
                  checked={Boolean(settings.whatsappEnabled)}
                  onCheckedChange={(checked: boolean) =>
                    setSettings({ ...settings, whatsappEnabled: Boolean(checked) })
                  }
                >
                  {t('checkbox.enable_whatsapp_transport', 'Enable WhatsApp Transport')}
                </Checkbox>
              </Flex>

              <Box
                paddingTop={4}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 20,
                }}
              >
                <Field.Root name="whatsappDriver">
                  <Field.Label>{t('field.whatsapp_transport_driver', 'WhatsApp Transport Driver')}</Field.Label>
                  <SingleSelect
                    placeholder={t('placeholder.select_whatsapp_driver', 'Select WhatsApp driver')}
                    value={settings.whatsappDriver || 'meta-cloud'}
                    onChange={(val: string | number) =>
                      setSettings({
                        ...settings,
                        whatsappDriver: String(val) as WhatsAppDriver,
                      })
                    }
                  >
                    {WHATSAPP_DRIVER_OPTIONS.map((opt) => (
                      <SingleSelectOption key={opt.value} value={opt.value}>
                        {opt.label}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                  <Field.Hint>{t('settings.ui.choose_meta_cloud_api_for_official_templates_or_', 'Choose Meta Cloud API for official templates or Evolution/OpenWA for self-hosted gateways.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="whatsappPhoneNumberId">
                  <Field.Label>{t('field.meta_waba_phone_number_id', 'Meta WABA Phone Number ID')}</Field.Label>
                  <TextInput
                    name="whatsappPhoneNumberId"
                    placeholder={t('placeholder.e_g_109876543210123', 'e.g., 109876543210123')}
                    value={settings.whatsappPhoneNumberId || ''}
                    onChange={(e: { target: { value: string } }) =>
                      setSettings({
                        ...settings,
                        whatsappPhoneNumberId: e.target.value,
                      })
                    }
                  />
                  <Field.Hint>
                    Numeric Phone Number ID from Meta Developer Console (used when driver is{' '}
                    <code
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.88em',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'rgba(128, 128, 128, 0.16)',
                        border: '1px solid rgba(128, 128, 128, 0.25)',
                      }}
                    >
                      meta-cloud
                    </code>
                    ).
                  </Field.Hint>
                </Field.Root>

                <Field.Root name="whatsappAccessToken">
                  <Field.Label>{t('field.meta_cloud_api_permanent_access_token', 'Meta Cloud API Permanent Access Token')}</Field.Label>
                  <TextInput
                    name="whatsappAccessToken"
                    type="password"
                    placeholder={t('placeholder.e_g_eaagm0px4zcpsba', 'e.g., EAAGm0PX4ZCpsBA...')}
                    value={settings.whatsappAccessToken || ''}
                    onChange={(e: { target: { value: string } }) =>
                      setSettings({
                        ...settings,
                        whatsappAccessToken: e.target.value,
                      })
                    }
                  />
                  <Field.Hint>{t('settings.ui.system_user_bearer_token_for_graph_facebook_com_', 'System user bearer token for graph.facebook.com WABA message dispatch.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="whatsappGatewayUrl">
                  <Field.Label>{t('field.self_hosted_gateway_url_evolution_openwa', 'Self-Hosted Gateway URL (Evolution / OpenWA)')}</Field.Label>
                  <TextInput
                    name="whatsappGatewayUrl"
                    placeholder={t('placeholder.e_g_https_wa_gateway_mezquitabogota_org', 'e.g., https://wa-gateway.mezquitabogota.org')}
                    value={settings.whatsappGatewayUrl || ''}
                    onChange={(e: { target: { value: string } }) =>
                      setSettings({ ...settings, whatsappGatewayUrl: e.target.value })
                    }
                  />
                  <Field.Hint>{t('settings.ui.https_base_url_of_your_evolution_api_or_openwa_i', 'HTTPS base URL of your Evolution API or OpenWA instance (validated against SSRF rules).')}</Field.Hint>
                </Field.Root>

                <Field.Root name="whatsappGatewaySession">
                  <Field.Label>{t('field.gateway_instance_session_name', 'Gateway Instance / Session Name')}</Field.Label>
                  <TextInput
                    name="whatsappGatewaySession"
                    placeholder={t('placeholder.e_g_default_or_mezquita_bogota', 'e.g., default or mezquita-bogota')}
                    value={settings.whatsappGatewaySession || ''}
                    onChange={(e: { target: { value: string } }) =>
                      setSettings({ ...settings, whatsappGatewaySession: e.target.value })
                    }
                  />
                  <Field.Hint>{t('settings.ui.session_or_instance_identifier_on_the_self_hoste', 'Session or instance identifier on the self-hosted WhatsApp gateway.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="whatsappGatewayApiKey">
                  <Field.Label>{t('field.gateway_api_key_evolution_openwa', 'Gateway API Key (Evolution / OpenWA)')}</Field.Label>
                  <TextInput
                    name="whatsappGatewayApiKey"
                    type="password"
                    placeholder={t('placeholder.e_g_evo_live_key', 'e.g., evo_live_key_...')}
                    value={settings.whatsappGatewayApiKey || ''}
                    onChange={(e: { target: { value: string } }) =>
                      setSettings({ ...settings, whatsappGatewayApiKey: e.target.value })
                    }
                  />
                  <Field.Hint>{t('settings.ui.api_key_sent_via_apikey_authorization_header_to_', 'API key sent via apikey / Authorization header to the self-hosted gateway.')}</Field.Hint>
                </Field.Root>
              </Box>
            </Box>
          </Tabs.Content>

          {/* Tab 4: Bridges & Sandbox Mode */}
          <Tabs.Content value="bridges">
            <Box
              padding={6}
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              style={cardBorderStyle}
            >
              <Flex justifyContent="space-between" alignItems="center" paddingBottom={2} wrap="wrap" gap={2}>
                <Box>
                  <Typography variant="beta" tag="h2">
                    {t(
                      'settings.ui.4_ecosystem_bridges_sandbox_mode',
                      'Ecosystem Bridges & Sandbox Mode'
                    )}
                  </Typography>
                  <Typography variant="pi" textColor="neutral600">
                    Control dry-run simulation mode, subscriber segmentation from{' '}
                    <code
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.88em',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'rgba(128, 128, 128, 0.16)',
                        border: '1px solid rgba(128, 128, 128, 0.25)',
                      }}
                    >
                      @vicacha-devs/strapi-plugin-inbox
                    </code>
                    , and automatic EventHub triggers.
                  </Typography>
                </Box>
                <Badge>{settings.dryRun ? 'Sandbox Mode Active' : 'Live Production Mode'}</Badge>
              </Flex>

              <Box
                paddingTop={4}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 16,
                }}
              >
                <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
                  <Box>
                    <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
                      <Typography fontWeight="bold">{t('settings.ui.dry_run_sandbox_mode', 'Dry-Run Sandbox Mode')}</Typography>
                      <Badge>{settings.dryRun ? 'Simulated' : 'Live'}</Badge>
                    </Flex>
                    <Typography variant="pi" textColor="neutral600">
                      Records full delivery logs and idempotency keys with status{' '}
                      <code
                        style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: '0.88em',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(128, 128, 128, 0.16)',
                          border: '1px solid rgba(128, 128, 128, 0.25)',
                        }}
                      >
                        simulated
                      </code>{' '}
                      without calling external Email, Telegram, or WhatsApp APIs.
                    </Typography>
                  </Box>
                  <Box paddingTop={3}>
                    <Checkbox
                      checked={Boolean(settings.dryRun)}
                      onCheckedChange={(checked: boolean) =>
                        setSettings({ ...settings, dryRun: Boolean(checked) })
                      }
                    >
                      {t('checkbox.enable_dry_run_sandbox_mode', 'Enable Dry-Run Sandbox Mode')}
                    </Checkbox>
                  </Box>
                </Box>

                <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
                  <Box>
                    <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
                      <Typography fontWeight="bold">{t('settings.ui.inbox_subscriber_bridge', 'Inbox Subscriber Bridge')}</Typography>
                      <Badge>{settings.enableInboxSubscriberBridge ? 'Enabled' : 'Disabled'}</Badge>
                    </Flex>
                    <Typography variant="pi" textColor="neutral600">
                      Automatically queries confirmed double opt-in subscribers from{' '}
                      <code
                        style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: '0.88em',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(128, 128, 128, 0.16)',
                          border: '1px solid rgba(128, 128, 128, 0.25)',
                        }}
                      >
                        @vicacha-devs/strapi-plugin-inbox
                      </code>{' '}
                      segmented by topic and locale.
                    </Typography>
                  </Box>
                  <Box paddingTop={3}>
                    <Checkbox
                      checked={Boolean(settings.enableInboxSubscriberBridge)}
                      onCheckedChange={(checked: boolean) =>
                        setSettings({
                          ...settings,
                          enableInboxSubscriberBridge: Boolean(checked),
                        })
                      }
                    >
                      {t('checkbox.segment_confirmed_subscribers_via_inbox_bridge', 'Segment confirmed subscribers via Inbox Bridge')}
                    </Checkbox>
                  </Box>
                </Box>

                <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
                  <Box>
                    <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
                      <Typography fontWeight="bold">{t('settings.ui.eventhub_auto_broadcasts', 'EventHub Auto-Broadcasts')}</Typography>
                      <Badge>{settings.enableEventHubAutomations ? 'Enabled' : 'Disabled'}</Badge>
                    </Flex>
                    <Typography variant="pi" textColor="neutral600">
                      Listens for Strapi EventHub events (e.g.,{' '}
                      <code
                        style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: '0.88em',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(128, 128, 128, 0.16)',
                          border: '1px solid rgba(128, 128, 128, 0.25)',
                        }}
                      >
                        inbox.alert.published
                      </code>
                      ,{' '}
                      <code
                        style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: '0.88em',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(128, 128, 128, 0.16)',
                          border: '1px solid rgba(128, 128, 128, 0.25)',
                        }}
                      >
                        event.published
                      </code>
                      ) and triggers matching automation rules automatically.
                    </Typography>
                  </Box>
                  <Box paddingTop={3}>
                    <Checkbox
                      checked={Boolean(settings.enableEventHubAutomations)}
                      onCheckedChange={(checked: boolean) =>
                        setSettings({
                          ...settings,
                          enableEventHubAutomations: Boolean(checked),
                        })
                      }
                    >
                      {t('checkbox.enable_eventhub_auto_broadcast_triggers', 'Enable EventHub Auto-Broadcast Triggers')}
                    </Checkbox>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Main>
  );
};

export default SettingsPage;
