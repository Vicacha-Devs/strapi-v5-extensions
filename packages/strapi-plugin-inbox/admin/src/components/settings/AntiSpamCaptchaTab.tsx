import * as React from 'react';
import {
  Badge,
  Box,
  Field,
  Flex,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  Tabs,
  TextInput,
  Typography,
} from '@strapi/design-system';
import type { CaptchaProvider, InboxSettings } from '../../../../shared';
import { CaptchaProviderCard } from './CaptchaProviderCard';

const CAPTCHA_PROVIDER_OPTIONS: Array<{ value: CaptchaProvider; label: string }> = [
  { value: 'none', label: 'None (Honeypot + IP Rate Limiting only)' },
  { value: 'turnstile', label: 'Cloudflare Turnstile (Recommended)' },
  { value: 'recaptcha', label: 'Google reCAPTCHA v2' },
];

export interface AntiSpamCaptchaTabProps {
  t: (id: string, defaultMessage: string) => string;
  settings: InboxSettings;
  setSettings: (next: InboxSettings) => void;
  onTestCaptcha: (provider: CaptchaProvider, secret?: string) => Promise<void>;
}

export const AntiSpamCaptchaTab: React.FC<AntiSpamCaptchaTabProps> = ({
  t,
  settings,
  setSettings,
  onTestCaptcha,
}) => {
  return (
    <Tabs.Content value="antispam">
      <Box
        padding={6}
        background="neutral0"
        hasRadius
        shadow="filterShadow"
        style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
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
                'settings.ui.2_anti_spam_guard_honeypot_rate_limiting_captcha',
                'Anti-Spam Guard (Honeypot, Rate Limiting & CAPTCHA)'
              )}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'settings.ui.three_stage_protection_invisible_bot_trap_field_',
                'Three-stage protection: invisible bot trap field, per-IP sliding-window rate limiter, and fail-closed CAPTCHA verification.'
              )}
            </Typography>
          </Box>
          <Badge>
            {settings.defaultRateLimitPerHour || 15}{' '}
            {t('settings.ui.req_per_hr_ip', 'req/hr per IP')}
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
          <Field.Root
            name="defaultHoneypotField"
            hint={t(
              'settings.ui.hidden_trap_field_name_bots_that_populate_this_f',
              'Hidden trap field name; bots that populate this field are rejected with HTTP 403 Forbidden.'
            )}
          >
            <Field.Label>
              {t(
                'field.default_honeypot_field_name',
                'Default Honeypot Field Name'
              )}
            </Field.Label>
            <TextInput
              name="defaultHoneypotField"
              placeholder={t(
                'placeholder.e_g_website_url',
                'e.g., _website_url'
              )}
              value={settings.defaultHoneypotField || ''}
              onChange={(e: { target: { value: string } }) =>
                setSettings({
                  ...settings,
                  defaultHoneypotField: e.target.value,
                })
              }
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="defaultRateLimitPerHour"
            hint={t(
              'settings.ui.maximum_submissions_allowed_per_ip_and_form_slug',
              'Maximum submissions allowed per IP and form slug within a rolling 60-minute window.'
            )}
          >
            <Field.Label>
              {t(
                'field.default_hourly_rate_limit_per_ip',
                'Default Hourly Rate Limit per IP'
              )}
            </Field.Label>
            <NumberInput
              name="defaultRateLimitPerHour"
              placeholder={t('placeholder.e_g_15', 'e.g., 15')}
              value={settings.defaultRateLimitPerHour ?? 15}
              onValueChange={(val: number | undefined) =>
                setSettings({
                  ...settings,
                  defaultRateLimitPerHour:
                    typeof val === 'number' && val > 0 ? val : 15,
                })
              }
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="defaultCaptchaProvider"
            hint={t(
              'settings.ui.server_side_token_verification_enforced_on_publi',
              'Server-side token verification enforced on public submissions unless overridden per form.'
            )}
          >
            <Field.Label>
              {t(
                'field.default_captcha_provider',
                'Default CAPTCHA Provider'
              )}
            </Field.Label>
            <SingleSelect
              placeholder={t(
                'placeholder.select_captcha_provider',
                'Select CAPTCHA provider'
              )}
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
            <Field.Hint />
          </Field.Root>
        </Box>

        <Box
          paddingTop={5}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 20,
          }}
        >
          <CaptchaProviderCard
            t={t}
            title={t('settings.ui.cloudflare_turnstile', 'Cloudflare Turnstile')}
            isDefaultActive={settings.defaultCaptchaProvider === 'turnstile'}
            testButtonLabel={t(
              'settings.ui.test_turnstile_secret',
              'Test Turnstile Secret'
            )}
            onTestSecret={() =>
              onTestCaptcha('turnstile', settings.turnstileSecretKey)
            }
            siteKeyName="turnstileSiteKey"
            siteKeyLabel={t(
              'field.turnstile_site_key_public_widget_key',
              'Turnstile Site Key (Public Widget Key)'
            )}
            siteKeyPlaceholder={t(
              'placeholder.e_g_0x4aaaaaaabkmyinuke',
              'e.g., 0x4AAAAAAABkMYinukE_...'
            )}
            siteKeyValue={settings.turnstileSiteKey || ''}
            siteKeyHint={t(
              'settings.ui.public_widget_key_rendered_by_the_frontend_form_',
              'Public widget key rendered by the frontend form component.'
            )}
            onSiteKeyChange={(val) =>
              setSettings({ ...settings, turnstileSiteKey: val })
            }
            secretKeyName="turnstileSecretKey"
            secretKeyLabel={t(
              'field.turnstile_secret_key_server_verification',
              'Turnstile Secret Key (Server Verification)'
            )}
            secretKeyPlaceholder={t(
              'placeholder.e_g_0x4aaaaaaabkmyin',
              'e.g., 0x4AAAAAAABkMYin...'
            )}
            secretKeyValue={settings.turnstileSecretKey || ''}
            secretKeyHint={t(
              'settings.ui.verified_against_challenges_cloudflare_com_turns',
              'Verified against challenges.cloudflare.com/turnstile/v0/siteverify.'
            )}
            onSecretKeyChange={(val) =>
              setSettings({ ...settings, turnstileSecretKey: val })
            }
          />

          <CaptchaProviderCard
            t={t}
            title={t('settings.ui.google_recaptcha_v2', 'Google reCAPTCHA v2')}
            isDefaultActive={settings.defaultCaptchaProvider === 'recaptcha'}
            testButtonLabel={t(
              'settings.ui.test_recaptcha_secret',
              'Test reCAPTCHA Secret'
            )}
            onTestSecret={() =>
              onTestCaptcha('recaptcha', settings.recaptchaSecretKey)
            }
            siteKeyName="recaptchaSiteKey"
            siteKeyLabel={t(
              'field.recaptcha_v2_site_key_public_widget_key',
              'reCAPTCHA v2 Site Key (Public Widget Key)'
            )}
            siteKeyPlaceholder={t(
              'placeholder.e_g_6leixactaaaaajczvrqyhh71umiegnq_mxjizkhi',
              'e.g., 6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'
            )}
            siteKeyValue={settings.recaptchaSiteKey || ''}
            siteKeyHint={t(
              'settings.ui.public_site_key_used_by_client_forms_when_recapt',
              'Public site key used by client forms when reCAPTCHA v2 is enabled.'
            )}
            onSiteKeyChange={(val) =>
              setSettings({ ...settings, recaptchaSiteKey: val })
            }
            secretKeyName="recaptchaSecretKey"
            secretKeyLabel={t(
              'field.recaptcha_v2_secret_key_server_verification',
              'reCAPTCHA v2 Secret Key (Server Verification)'
            )}
            secretKeyPlaceholder={t(
              'placeholder.e_g_6leixactaaaaagg_vfi1tnrwxmznfuojj4wifjwe',
              'e.g., 6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'
            )}
            secretKeyValue={settings.recaptchaSecretKey || ''}
            secretKeyHint={t(
              'settings.ui.verified_against_www_google_com_recaptcha_api_si',
              'Verified against www.google.com/recaptcha/api/siteverify.'
            )}
            onSecretKeyChange={(val) =>
              setSettings({ ...settings, recaptchaSecretKey: val })
            }
          />
        </Box>
      </Box>
    </Tabs.Content>
  );
};
