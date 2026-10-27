import { useIntl } from 'react-intl';
import * as React from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Field,
  Flex,
  Main,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  Tabs,
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

const LOCALE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'es', label: 'es — Español (Spanish)' },
  { value: 'en', label: 'en — English' },
  { value: 'ar', label: 'ar — العربية (Arabic)' },
  { value: 'tr', label: 'tr — Türkçe (Turkish)' },
  { value: 'fr', label: 'fr — Français (French)' },
  { value: 'pt', label: 'pt — Português (Portuguese)' },
];

const CAPTCHA_PROVIDER_OPTIONS: Array<{ value: CaptchaProvider; label: string }> = [
  { value: 'none', label: 'None (Honeypot + IP Rate Limiting only)' },
  { value: 'turnstile', label: 'Cloudflare Turnstile (Recommended)' },
  { value: 'recaptcha', label: 'Google reCAPTCHA v2' },
];

const subCardStyle: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.2)',
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
  const { get, put, post } = useFetchClient();
  const [settings, setSettings] = React.useState<InboxSettings>(DEFAULT_INBOX_SETTINGS);
  const [savedNotice, setSavedNotice] = React.useState<string>('');
  const [captchaTestResult, setCaptchaTestResult] = React.useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await get(`/${PLUGIN_ID}/settings`);
        if (res?.data?.data) {
          setSettings({
            ...DEFAULT_INBOX_SETTINGS,
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
        ...DEFAULT_INBOX_SETTINGS,
        ...res.data.data,
      });
      setSavedNotice('Inbox, Anti-Spam & Casework settings saved successfully.');
    }
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_INBOX_SETTINGS);
    setSavedNotice('Settings reset to defaults in editor. Click "Save Settings" to persist.');
  };

  const handleTestCaptcha = async (provider: CaptchaProvider, secret?: string) => {
    const res = await post(`/${PLUGIN_ID}/captcha/test`, {
      provider,
      secret: secret || '',
    });
    const out = res?.data?.data;
    const isOk = Boolean(out?.ok);
    setCaptchaTestResult({
      ok: isOk,
      message: isOk
        ? `${provider === 'turnstile' ? 'Cloudflare Turnstile' : 'Google reCAPTCHA'} secret key verified!`
        : `Verification failed (${provider}): ${out?.reason || 'Invalid or empty secret key'}`,
    });
  };

  return (
    <Main>
      <Box padding={8}>
        {/* Page Header */}
        <Flex justifyContent="space-between" alignItems="flex-start" paddingBottom={4} wrap="wrap" gap={4}>
          <Box>
            <Typography variant="alpha" tag="h1">{t('settings.ui.inbox_anti_spam_casework_settings', 'Inbox, Anti-Spam & Casework Settings')}</Typography>
            <Box paddingTop={1}>
              <Typography variant="epsilon" textColor="neutral600">{t('settings.ui.configure_multi_locale_forms_secondary_hijri_cal', 'Configure multi-locale forms, anti-spam protection, double opt-in subscribers, and Bookings / Certificates bridges')}</Typography>
            </Box>
            <Flex gap={2} paddingTop={3} wrap="wrap">
              <Badge>
                Locales ({(settings.supportedLocales || []).length}): {(settings.supportedLocales || []).join(', ')}
              </Badge>
              <Badge>CAPTCHA: {settings.defaultCaptchaProvider || 'none'}</Badge>
              <Badge>Double Opt-In: {settings.enableDoubleOptIn ? 'Enabled' : 'Disabled'}</Badge>
            </Flex>
          </Box>
          <Flex gap={2}>
            <Button variant="tertiary" onClick={handleResetDefaults}>{t('settings.ui.reset_to_defaults', 'Reset to Defaults')}</Button>
            <Button onClick={handleSave}>{t('settings.ui.save_settings', 'Save Settings')}</Button>
          </Flex>
        </Flex>

        {savedNotice ? (
          <Box padding={3} marginBottom={4} background="success100" hasRadius>
            <Typography textColor="success700" fontWeight="semiBold">
              {savedNotice}
            </Typography>
          </Box>
        ) : null}

        {captchaTestResult ? (
          <Box
            padding={3}
            marginBottom={4}
            background={captchaTestResult.ok ? 'success100' : 'danger100'}
            hasRadius
          >
            <Typography
              textColor={captchaTestResult.ok ? 'success700' : 'danger700'}
              fontWeight="semiBold"
            >
              {captchaTestResult.message}
            </Typography>
          </Box>
        ) : null}

        <Divider />

        <Box paddingTop={6}>
          <Tabs.Root defaultValue="routing">
            <Tabs.List aria-label={t('settings.ui.inbox_anti_spam_casework_settings', 'Inbox Settings')}>
              <Tabs.Trigger value="routing">
                {t('settings.tab.routing', 'Localization & Routing')}
              </Tabs.Trigger>
              <Tabs.Trigger value="antispam">
                {t('settings.tab.antispam', 'Anti-Spam Guard & CAPTCHA')}
              </Tabs.Trigger>
              <Tabs.Trigger value="bridges">
                {t('settings.tab.bridges', 'Double Opt-In & Ecosystem Bridges')}
              </Tabs.Trigger>
            </Tabs.List>

            {/* Tab 1: Multi-Language & Routing Configuration */}
            <Tabs.Content value="routing">
              <Box
                padding={6}
                background="neutral0"
                hasRadius
                shadow="filterShadow"
                style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
              >
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={2} wrap="wrap" gap={2}>
                  <Box>
                    <Typography variant="beta" tag="h2">{t('settings.ui.1_localization_routing_multi_calendar_configurat', 'Localization & Service-Desk Routing')}</Typography>
                    <Typography variant="pi" textColor="neutral600">{t('settings.ui.define_default_supported_locales_primary_and_sec', 'Define default/supported locales, service-desk routing departments, and subscriber interest topics.')}</Typography>
                  </Box>
                  <Badge>{(settings.supportedLocales || []).length} Active Locales</Badge>
                </Flex>

                <Box
                  paddingTop={4}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 20,
                  }}
                >
                  <Field.Root name="defaultLocale">
                    <Field.Label>{t('field.default_locale', 'Default Locale')}</Field.Label>
                    <SingleSelect
                      placeholder={t('placeholder.select_default_locale_e_g_es', 'Select default locale (e.g., es)')}
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
                    <Field.Hint>{t('settings.ui.fallback_language_when_a_public_form_request_or_', 'Fallback language when a public form request or alert query omits a locale parameter.')}</Field.Hint>
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
                    <Field.Hint>{t('settings.ui.iso_language_codes_enabled_for_localized_form_la', 'ISO language codes enabled for localized form labels, validation errors, and alert banners.')}</Field.Hint>
                  </Field.Root>

                  <Field.Root name="availableDepartments">
                    <Field.Label>{t('field.service_desk_departments_comma_separated', 'Service-Desk Departments (comma-separated)')}</Field.Label>
                    <TextInput
                      name="availableDepartments"
                      placeholder={t('placeholder.e_g_general_imamate_nikah_family_new_muslims_hal', 'e.g., general, imamate, nikah_family, new_muslims, halal_certification')}
                      value={(settings.availableDepartments || []).join(', ')}
                      onChange={(e: { target: { value: string } }) =>
                        setSettings({
                          ...settings,
                          availableDepartments: parseCsvList(e.target.value),
                        })
                      }
                    />
                    <Field.Hint>{t('settings.ui.departments_available_for_routing_incoming_inqui', 'Departments available for routing incoming inquiries and religious/community service applications.')}</Field.Hint>
                  </Field.Root>

                  <Field.Root name="availableTopics">
                    <Field.Label>{t('field.subscriber_interest_topics_comma_separated', 'Subscriber Interest Topics (comma-separated)')}</Field.Label>
                    <TextInput
                      name="availableTopics"
                      placeholder={t('placeholder.e_g_announcements_events_courses_ramadan_eid_new', 'e.g., announcements, events, courses, ramadan_eid, newsletter')}
                      value={(settings.availableTopics || []).join(', ')}
                      onChange={(e: { target: { value: string } }) =>
                        setSettings({
                          ...settings,
                          availableTopics: parseCsvList(e.target.value),
                        })
                      }
                    />
                    <Field.Hint>{t('settings.ui.topics_community_members_can_choose_when_subscri', 'Topics community members can choose when subscribing to announcements and newsletters.')}</Field.Hint>
                  </Field.Root>
                </Box>
              </Box>
            </Tabs.Content>

            {/* Tab 2: Anti-Spam Guard (Honeypot, Rate Limiting & CAPTCHA) */}
            <Tabs.Content value="antispam">
              <Box
                padding={6}
                background="neutral0"
                hasRadius
                shadow="filterShadow"
                style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
              >
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={2} wrap="wrap" gap={2}>
                  <Box>
                    <Typography variant="beta" tag="h2">{t('settings.ui.2_anti_spam_guard_honeypot_rate_limiting_captcha', 'Anti-Spam Guard (Honeypot, Rate Limiting & CAPTCHA)')}</Typography>
                    <Typography variant="pi" textColor="neutral600">{t('settings.ui.three_stage_protection_invisible_bot_trap_field_', 'Three-stage protection: invisible bot trap field, per-IP sliding-window rate limiter, and fail-closed CAPTCHA verification.')}</Typography>
                  </Box>
                  <Badge>
                    {settings.defaultRateLimitPerHour || 15} req/hr per IP
                  </Badge>
                </Flex>

                <Box
                  paddingTop={4}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 20,
                  }}
                >
                  <Field.Root name="defaultHoneypotField">
                    <Field.Label>{t('field.default_honeypot_field_name', 'Default Honeypot Field Name')}</Field.Label>
                    <TextInput
                      name="defaultHoneypotField"
                      placeholder={t('placeholder.e_g_website_url', 'e.g., _website_url')}
                      value={settings.defaultHoneypotField || ''}
                      onChange={(e: { target: { value: string } }) =>
                        setSettings({ ...settings, defaultHoneypotField: e.target.value })
                      }
                    />
                    <Field.Hint>{t('settings.ui.hidden_trap_field_name_bots_that_populate_this_f', 'Hidden trap field name; bots that populate this field are rejected with HTTP 403 Forbidden.')}</Field.Hint>
                  </Field.Root>

                  <Field.Root name="defaultRateLimitPerHour">
                    <Field.Label>{t('field.default_hourly_rate_limit_per_ip', 'Default Hourly Rate Limit per IP')}</Field.Label>
                    <NumberInput
                      name="defaultRateLimitPerHour"
                      placeholder={t('placeholder.e_g_15', 'e.g., 15')}
                      value={settings.defaultRateLimitPerHour ?? 15}
                      onValueChange={(val: number | undefined) =>
                        setSettings({
                          ...settings,
                          defaultRateLimitPerHour: typeof val === 'number' && val > 0 ? val : 15,
                        })
                      }
                    />
                    <Field.Hint>{t('settings.ui.maximum_submissions_allowed_per_ip_and_form_slug', 'Maximum submissions allowed per IP and form slug within a rolling 60-minute window.')}</Field.Hint>
                  </Field.Root>

                  <Field.Root name="defaultCaptchaProvider">
                    <Field.Label>{t('field.default_captcha_provider', 'Default CAPTCHA Provider')}</Field.Label>
                    <SingleSelect
                      placeholder={t('placeholder.select_captcha_provider', 'Select CAPTCHA provider')}
                      value={settings.defaultCaptchaProvider || 'none'}
                      onChange={(val: string | number) =>
                        setSettings({
                          ...settings,
                          defaultCaptchaProvider: String(val) as CaptchaProvider,
                        })
                      }
                    >
                      {CAPTCHA_PROVIDER_OPTIONS.map((opt) => (
                        <SingleSelectOption key={opt.value} value={opt.value}>
                          {opt.label}
                        </SingleSelectOption>
                      ))}
                    </SingleSelect>
                    <Field.Hint>{t('settings.ui.server_side_token_verification_enforced_on_publi', 'Server-side token verification enforced on public submissions unless overridden per form.')}</Field.Hint>
                  </Field.Root>
                </Box>

                {/* CAPTCHA Provider Credentials Sub-Cards */}
                <Box
                  paddingTop={5}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 20,
                  }}
                >
                  {/* Cloudflare Turnstile Sub-Card */}
                  <Box
                    padding={4}
                    background="neutral100"
                    hasRadius
                    style={subCardStyle}
                  >
                    <Box>
                      <Flex justifyContent="space-between" alignItems="center" paddingBottom={3} wrap="wrap" gap={2}>
                        <Flex gap={2} alignItems="center">
                          <Typography variant="delta" tag="h3" fontWeight="bold">{t('settings.ui.cloudflare_turnstile', 'Cloudflare Turnstile')}</Typography>
                          <Badge>
                            {settings.defaultCaptchaProvider === 'turnstile' ? 'Default Active' : 'Standby'}
                          </Badge>
                        </Flex>
                        <Button
                          variant="secondary"
                          size="S"
                          onClick={() => handleTestCaptcha('turnstile', settings.turnstileSecretKey)}
                        >{t('settings.ui.test_turnstile_secret', 'Test Turnstile Secret')}</Button>
                      </Flex>

                      <Flex direction="column" alignItems="stretch" gap={3}>
                        <Field.Root name="turnstileSiteKey">
                          <Field.Label>{t('field.turnstile_site_key_public_widget_key', 'Turnstile Site Key (Public Widget Key)')}</Field.Label>
                          <TextInput
                            name="turnstileSiteKey"
                            placeholder={t('placeholder.e_g_0x4aaaaaaabkmyinuke', 'e.g., 0x4AAAAAAABkMYinukE_...')}
                            value={settings.turnstileSiteKey || ''}
                            onChange={(e: { target: { value: string } }) =>
                              setSettings({ ...settings, turnstileSiteKey: e.target.value })
                            }
                          />
                          <Field.Hint>{t('settings.ui.public_widget_key_rendered_by_the_frontend_form_', 'Public widget key rendered by the frontend form component.')}</Field.Hint>
                        </Field.Root>

                        <Field.Root name="turnstileSecretKey">
                          <Field.Label>{t('field.turnstile_secret_key_server_verification', 'Turnstile Secret Key (Server Verification)')}</Field.Label>
                          <TextInput
                            name="turnstileSecretKey"
                            type="password"
                            placeholder={t('placeholder.e_g_0x4aaaaaaabkmyin', 'e.g., 0x4AAAAAAABkMYin...')}
                            value={settings.turnstileSecretKey || ''}
                            onChange={(e: { target: { value: string } }) =>
                              setSettings({ ...settings, turnstileSecretKey: e.target.value })
                            }
                          />
                          <Field.Hint>{t('settings.ui.verified_against_challenges_cloudflare_com_turns', 'Verified against challenges.cloudflare.com/turnstile/v0/siteverify.')}</Field.Hint>
                        </Field.Root>
                      </Flex>
                    </Box>
                  </Box>

                  {/* Google reCAPTCHA v2 Sub-Card */}
                  <Box
                    padding={4}
                    background="neutral100"
                    hasRadius
                    style={subCardStyle}
                  >
                    <Box>
                      <Flex justifyContent="space-between" alignItems="center" paddingBottom={3} wrap="wrap" gap={2}>
                        <Flex gap={2} alignItems="center">
                          <Typography variant="delta" tag="h3" fontWeight="bold">{t('settings.ui.google_recaptcha_v2', 'Google reCAPTCHA v2')}</Typography>
                          <Badge>
                            {settings.defaultCaptchaProvider === 'recaptcha' ? 'Default Active' : 'Standby'}
                          </Badge>
                        </Flex>
                        <Button
                          variant="secondary"
                          size="S"
                          onClick={() => handleTestCaptcha('recaptcha', settings.recaptchaSecretKey)}
                        >{t('settings.ui.test_recaptcha_secret', 'Test reCAPTCHA Secret')}</Button>
                      </Flex>

                      <Flex direction="column" alignItems="stretch" gap={3}>
                        <Field.Root name="recaptchaSiteKey">
                          <Field.Label>{t('field.recaptcha_v2_site_key_public_widget_key', 'reCAPTCHA v2 Site Key (Public Widget Key)')}</Field.Label>
                          <TextInput
                            name="recaptchaSiteKey"
                            placeholder={t('placeholder.e_g_6leixactaaaaajczvrqyhh71umiegnq_mxjizkhi', 'e.g., 6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI')}
                            value={settings.recaptchaSiteKey || ''}
                            onChange={(e: { target: { value: string } }) =>
                              setSettings({ ...settings, recaptchaSiteKey: e.target.value })
                            }
                          />
                          <Field.Hint>{t('settings.ui.public_site_key_used_by_client_forms_when_recapt', 'Public site key used by client forms when reCAPTCHA v2 is enabled.')}</Field.Hint>
                        </Field.Root>

                        <Field.Root name="recaptchaSecretKey">
                          <Field.Label>{t('field.recaptcha_v2_secret_key_server_verification', 'reCAPTCHA v2 Secret Key (Server Verification)')}</Field.Label>
                          <TextInput
                            name="recaptchaSecretKey"
                            type="password"
                            placeholder={t('placeholder.e_g_6leixactaaaaagg_vfi1tnrwxmznfuojj4wifjwe', 'e.g., 6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe')}
                            value={settings.recaptchaSecretKey || ''}
                            onChange={(e: { target: { value: string } }) =>
                              setSettings({ ...settings, recaptchaSecretKey: e.target.value })
                            }
                          />
                          <Field.Hint>{t('settings.ui.verified_against_www_google_com_recaptcha_api_si', 'Verified against www.google.com/recaptcha/api/siteverify.')}</Field.Hint>
                        </Field.Root>
                      </Flex>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Tabs.Content>

            {/* Tab 3: Double Opt-In, Notifications & Ecosystem Bridges */}
            <Tabs.Content value="bridges">
              <Box
                padding={6}
                background="neutral0"
                hasRadius
                shadow="filterShadow"
                style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
              >
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={2} wrap="wrap" gap={2}>
                  <Box>
                    <Typography variant="beta" tag="h2">{t('settings.ui.3_double_opt_in_notifications_ecosystem_bridges', 'Double Opt-In, Notifications & Ecosystem Bridges')}</Typography>
                    <Typography variant="pi" textColor="neutral600">{t('settings.ui.control_subscriber_confirmation_workflows_staff_', 'Control subscriber confirmation workflows, staff email/webhook notifications, and 1-click integrations with Bookings and Certificates.')}</Typography>
                  </Box>
                  <Flex gap={2}>
                    <Badge>Bookings Bridge: {settings.enableBookingBridge ? 'On' : 'Off'}</Badge>
                    <Badge>Certificates Bridge: {settings.enableCertificateBridge ? 'On' : 'Off'}</Badge>
                  </Flex>
                </Flex>

                {/* 3 Feature Toggle Sub-Cards */}
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
                        <Typography fontWeight="bold">{t('settings.ui.subscriber_double_opt_in', 'Subscriber Double Opt-In')}</Typography>
                        <Badge>{settings.enableDoubleOptIn ? 'Enabled' : 'Disabled'}</Badge>
                      </Flex>
                      <Typography variant="pi" textColor="neutral600">
                        New subscribers start in{' '}
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
                          pending
                        </code>{' '}
                        status with a cryptographic confirmation token and 1-click unsubscribe token.
                      </Typography>
                    </Box>
                    <Box paddingTop={3}>
                      <Checkbox
                        checked={Boolean(settings.enableDoubleOptIn)}
                        onCheckedChange={(checked: boolean) =>
                          setSettings({ ...settings, enableDoubleOptIn: Boolean(checked) })
                        }
                      >{t('checkbox.require_email_confirmation_before_activating_sub', 'Require email confirmation before activating subscribers')}</Checkbox>
                    </Box>
                  </Box>

                  <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
                    <Box>
                      <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
                        <Typography fontWeight="bold">{t('settings.ui.bookings_plugin_bridge', 'Bookings Plugin Bridge')}</Typography>
                        <Badge>{settings.enableBookingBridge ? 'Enabled' : 'Disabled'}</Badge>
                      </Flex>
                      <Typography variant="pi" textColor="neutral600">
                        Enables 1-click appointment scheduling from service-desk submissions into{' '}
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
                          @vicacha-devs/strapi-plugin-bookings
                        </code>
                        .
                      </Typography>
                    </Box>
                    <Box paddingTop={3}>
                      <Checkbox
                        checked={Boolean(settings.enableBookingBridge)}
                        onCheckedChange={(checked: boolean) =>
                          setSettings({ ...settings, enableBookingBridge: Boolean(checked) })
                        }
                      >
                        Enable{' '}
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
                          @vicacha-devs/strapi-plugin-bookings
                        </code>{' '}
                        bridge
                      </Checkbox>
                    </Box>
                  </Box>

                  <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
                    <Box>
                      <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
                        <Typography fontWeight="bold">{t('settings.ui.certificates_plugin_bridge', 'Certificates Plugin Bridge')}</Typography>
                        <Badge>{settings.enableCertificateBridge ? 'Enabled' : 'Disabled'}</Badge>
                      </Flex>
                      <Typography variant="pi" textColor="neutral600">
                        Enables 1-click certificate issuance (Nikah, Shahada, Halal, Consular) via{' '}
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
                          @vicacha-devs/strapi-plugin-certificates
                        </code>{' '}
                        after checklist verification.
                      </Typography>
                    </Box>
                    <Box paddingTop={3}>
                      <Checkbox
                        checked={Boolean(settings.enableCertificateBridge)}
                        onCheckedChange={(checked: boolean) =>
                          setSettings({ ...settings, enableCertificateBridge: Boolean(checked) })
                        }
                      >
                        Enable{' '}
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
                          @vicacha-devs/strapi-plugin-certificates
                        </code>{' '}
                        bridge
                      </Checkbox>
                    </Box>
                  </Box>
                </Box>

                {/* Notification Emails & Outbound Webhook */}
                <Box
                  paddingTop={5}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 20,
                  }}
                >
                  <Field.Root name="defaultNotifyEmails">
                    <Field.Label>{t('field.default_staff_notification_emails_comma_separate', 'Default Staff Notification Emails (comma-separated)')}</Field.Label>
                    <TextInput
                      name="defaultNotifyEmails"
                      placeholder={t('placeholder.e_g_info_mezquitabogota_org_imam_mezquitabogota_', 'e.g., info@mezquitabogota.org, imam@mezquitabogota.org')}
                      value={(settings.defaultNotifyEmails || []).join(', ')}
                      onChange={(e: { target: { value: string } }) =>
                        setSettings({
                          ...settings,
                          defaultNotifyEmails: parseCsvList(e.target.value),
                        })
                      }
                    />
                    <Field.Hint>{t('settings.ui.default_staff_email_addresses_notified_when_a_ne', 'Default staff email addresses notified when a new form submission or service-desk application is received.')}</Field.Hint>
                  </Field.Root>

                  <Field.Root name="outboundWebhookUrl">
                    <Field.Label>{t('field.outbound_webhook_url_optional', 'Outbound Webhook URL (Optional)')}</Field.Label>
                    <TextInput
                      name="outboundWebhookUrl"
                      placeholder={t('placeholder.e_g_https_hooks_mezquitabogota_org_inbox_events', 'e.g., https://hooks.mezquitabogota.org/inbox-events')}
                      value={settings.outboundWebhookUrl || ''}
                      onChange={(e: { target: { value: string } }) =>
                        setSettings({ ...settings, outboundWebhookUrl: e.target.value })
                      }
                    />
                    <Field.Hint>{t('settings.ui.optional_https_webhook_endpoint_notified_on_subm', 'Optional HTTPS webhook endpoint notified on submission creation, checklist verification, and status transitions.')}</Field.Hint>
                  </Field.Root>
                </Box>
              </Box>
            </Tabs.Content>
          </Tabs.Root>
        </Box>
      </Box>
    </Main>
  );
};

export default SettingsPage;
