import * as React from 'react';
import {
  Badge,
  Box,
  Checkbox,
  Field,
  Flex,
  Tabs,
  TextInput,
  Typography,
} from '@strapi/design-system';
import type { InboxSettings } from '../../../../shared';
import { parseCsvList } from './LocalizationRoutingTab';

const subCardStyle: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.2)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

const codePillStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '0.88em',
  padding: '2px 6px',
  borderRadius: 4,
  background: 'rgba(128, 128, 128, 0.16)',
  border: '1px solid rgba(128, 128, 128, 0.25)',
};

export interface BridgesNotificationsTabProps {
  t: (id: string, defaultMessage: string) => string;
  settings: InboxSettings;
  setSettings: (next: InboxSettings) => void;
}

export const BridgesNotificationsTab: React.FC<BridgesNotificationsTabProps> = ({
  t,
  settings,
  setSettings,
}) => {
  return (
    <Tabs.Content value="bridges">
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
                'settings.ui.3_double_opt_in_notifications_ecosystem_bridges',
                'Double Opt-In, Notifications & Ecosystem Bridges'
              )}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'settings.ui.control_subscriber_confirmation_workflows_staff_',
                'Control subscriber confirmation workflows, staff email/webhook notifications, and 1-click integrations with Form Builder CMS, Bookings, and Certificates.'
              )}
            </Typography>
          </Box>
          <Flex gap={2} wrap="wrap">
            <Badge>
              {t('settings.ui.double_opt_in_label', 'Double Opt-In')}:{' '}
              {settings.enableDoubleOptIn
                ? t('common.on', 'On')
                : t('common.off', 'Off')}
            </Badge>
            <Badge>
              {t('settings.ui.bookings_bridge_label', 'Bookings Bridge')}:{' '}
              {settings.enableBookingBridge
                ? t('common.on', 'On')
                : t('common.off', 'Off')}
            </Badge>
            <Badge>
              {t(
                'settings.ui.certificates_bridge_label',
                'Certificates Bridge'
              )}
              :{' '}
              {settings.enableCertificateBridge
                ? t('common.on', 'On')
                : t('common.off', 'Off')}
            </Badge>
          </Flex>
        </Flex>

        <Box
          paddingTop={4}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 16,
          }}
        >
          <Box
            padding={4}
            background="neutral100"
            hasRadius
            style={subCardStyle}
          >
            <Box>
              <Flex
                justifyContent="space-between"
                alignItems="center"
                paddingBottom={2}
              >
                <Typography fontWeight="bold">
                  {t(
                    'settings.ui.subscriber_double_opt_in',
                    'Subscriber Double Opt-In'
                  )}
                </Typography>
                <Badge>
                  {settings.enableDoubleOptIn
                    ? t('common.enabled', 'Enabled')
                    : t('common.disabled', 'Disabled')}
                </Badge>
              </Flex>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  'settings.ui.double_opt_in_desc',
                  'New subscribers start in pending status with a cryptographic confirmation token and 1-click unsubscribe token.'
                )}
              </Typography>
            </Box>
            <Box paddingTop={3}>
              <Checkbox
                checked={Boolean(settings.enableDoubleOptIn)}
                onCheckedChange={(checked: boolean) =>
                  setSettings({
                    ...settings,
                    enableDoubleOptIn: Boolean(checked),
                  })
                }
              >
                {t(
                  'checkbox.require_email_confirmation_before_activating_sub',
                  'Require email confirmation before activating subscribers'
                )}
              </Checkbox>
            </Box>
          </Box>

          <Box
            padding={4}
            background="neutral100"
            hasRadius
            style={subCardStyle}
          >
            <Box>
              <Flex
                justifyContent="space-between"
                alignItems="center"
                paddingBottom={2}
              >
                <Typography fontWeight="bold">
                  {t(
                    'settings.ui.bookings_plugin_bridge',
                    'Bookings Plugin Bridge'
                  )}
                </Typography>
                <Badge>
                  {settings.enableBookingBridge
                    ? t('common.enabled', 'Enabled')
                    : t('common.disabled', 'Disabled')}
                </Badge>
              </Flex>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  'settings.ui.bookings_bridge_desc',
                  'Enables 1-click appointment scheduling from service-desk submissions into @vicacha-devs/strapi-plugin-bookings.'
                )}
              </Typography>
            </Box>
            <Box paddingTop={3}>
              <Checkbox
                checked={Boolean(settings.enableBookingBridge)}
                onCheckedChange={(checked: boolean) =>
                  setSettings({
                    ...settings,
                    enableBookingBridge: Boolean(checked),
                  })
                }
              >
                {t(
                  'checkbox.enable_bookings_bridge',
                  'Enable @vicacha-devs/strapi-plugin-bookings bridge'
                )}
              </Checkbox>
            </Box>
          </Box>

          <Box
            padding={4}
            background="neutral100"
            hasRadius
            style={subCardStyle}
          >
            <Box>
              <Flex
                justifyContent="space-between"
                alignItems="center"
                paddingBottom={2}
              >
                <Typography fontWeight="bold">
                  {t(
                    'settings.ui.certificates_plugin_bridge',
                    'Certificates Plugin Bridge'
                  )}
                </Typography>
                <Badge>
                  {settings.enableCertificateBridge
                    ? t('common.enabled', 'Enabled')
                    : t('common.disabled', 'Disabled')}
                </Badge>
              </Flex>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  'settings.ui.certificates_bridge_desc',
                  'Enables 1-click certificate issuance (Nikah, Shahada, Halal, Consular) via @vicacha-devs/strapi-plugin-certificates after checklist verification.'
                )}
              </Typography>
            </Box>
            <Box paddingTop={3}>
              <Checkbox
                checked={Boolean(settings.enableCertificateBridge)}
                onCheckedChange={(checked: boolean) =>
                  setSettings({
                    ...settings,
                    enableCertificateBridge: Boolean(checked),
                  })
                }
              >
                {t(
                  'checkbox.enable_certificates_bridge',
                  'Enable @vicacha-devs/strapi-plugin-certificates bridge'
                )}
              </Checkbox>
            </Box>
          </Box>
        </Box>

        <Box
          paddingTop={5}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 20,
          }}
        >
          <Field.Root
            name="defaultNotifyEmails"
            hint={t(
              'settings.ui.default_staff_email_addresses_notified_when_a_ne',
              'Default staff email addresses notified when a new form submission or service-desk application is received.'
            )}
          >
            <Field.Label>
              {t(
                'field.default_staff_notification_emails_comma_separate',
                'Default Staff Notification Emails (comma-separated)'
              )}
            </Field.Label>
            <TextInput
              name="defaultNotifyEmails"
              placeholder={t(
                'placeholder.e_g_info_mezquitabogota_org_imam_mezquitabogota_',
                'e.g., info@mezquitabogota.org, imam@mezquitabogota.org'
              )}
              value={(settings.defaultNotifyEmails || []).join(', ')}
              onChange={(e: { target: { value: string } }) =>
                setSettings({
                  ...settings,
                  defaultNotifyEmails: parseCsvList(e.target.value),
                })
              }
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="outboundWebhookUrl"
            hint={t(
              'settings.ui.optional_https_webhook_endpoint_notified_on_subm',
              'Optional HTTPS webhook endpoint notified on submission creation, checklist verification, and status transitions.'
            )}
          >
            <Field.Label>
              {t(
                'field.outbound_webhook_url_optional',
                'Outbound Webhook URL (Optional)'
              )}
            </Field.Label>
            <TextInput
              name="outboundWebhookUrl"
              placeholder={t(
                'placeholder.e_g_https_hooks_mezquitabogota_org_inbox_events',
                'e.g., https://hooks.mezquitabogota.org/inbox-events'
              )}
              value={settings.outboundWebhookUrl || ''}
              onChange={(e: { target: { value: string } }) =>
                setSettings({
                  ...settings,
                  outboundWebhookUrl: e.target.value,
                })
              }
            />
            <Field.Hint />
          </Field.Root>
        </Box>
      </Box>
    </Tabs.Content>
  );
};
