import * as React from 'react';
import {
  Badge,
  Box,
  Checkbox,
  Flex,
  Typography,
} from '@strapi/design-system';
import type { BroadcastSettings } from '../../../shared/types';

const cardBorderStyle: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.22)',
};

const subCardStyle: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.22)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

export interface BridgesSandboxTabProps {
  settings: BroadcastSettings;
  setSettings: (
    next: BroadcastSettings | ((prev: BroadcastSettings) => BroadcastSettings)
  ) => void;
  t: (id: string, defaultMessage: string) => string;
}

export const BridgesSandboxTab: React.FC<BridgesSandboxTabProps> = ({
  settings,
  setSettings,
  t,
}) => {
  const enabledText = t('common.enabled', 'Enabled');
  const disabledText = t('common.disabled', 'Disabled');

  return (
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
              'settings.ui.4_ecosystem_bridges_sandbox_mode',
              'Ecosystem Bridges & Sandbox Mode'
            )}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {t(
              'settings.ui.bridges_sandbox_subtitle',
              'Control dry-run simulation mode, subscriber segmentation from @vicacha-devs/strapi-plugin-inbox, Email Designer 5 HTML templates, and automatic EventHub triggers.'
            )}
          </Typography>
        </Box>
        <Badge>
          {settings.dryRun
            ? t('settings.ui.sandbox_mode_active', 'Sandbox Mode Active')
            : t('settings.ui.live_production_mode', 'Live Production Mode')}
        </Badge>
      </Flex>

      <Box
        paddingTop={4}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
          <Box>
            <Flex
              justifyContent="space-between"
              alignItems="center"
              paddingBottom={2}
            >
              <Typography fontWeight="bold">
                {t('settings.ui.dry_run_sandbox_mode', 'Dry-Run Sandbox Mode')}
              </Typography>
              <Badge>
                {settings.dryRun
                  ? t('settings.ui.simulated', 'Simulated')
                  : t('settings.ui.live', 'Live')}
              </Badge>
            </Flex>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'settings.ui.dry_run_description',
                'Records full delivery logs and idempotency keys with status simulated without calling external Email, Telegram, or WhatsApp APIs.'
              )}
            </Typography>
          </Box>
          <Box paddingTop={3}>
            <Checkbox
              checked={Boolean(settings.dryRun)}
              onCheckedChange={(checked: boolean) =>
                setSettings({ ...settings, dryRun: Boolean(checked) })
              }
            >
              {t(
                'checkbox.enable_dry_run_sandbox_mode',
                'Enable Dry-Run Sandbox Mode'
              )}
            </Checkbox>
          </Box>
        </Box>

        <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
          <Box>
            <Flex
              justifyContent="space-between"
              alignItems="center"
              paddingBottom={2}
            >
              <Typography fontWeight="bold">
                {t(
                  'settings.ui.inbox_subscriber_bridge',
                  'Inbox Subscriber Bridge'
                )}
              </Typography>
              <Badge>
                {settings.enableInboxSubscriberBridge
                  ? enabledText
                  : disabledText}
              </Badge>
            </Flex>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'settings.ui.inbox_bridge_description',
                'Automatically queries confirmed double opt-in subscribers from @vicacha-devs/strapi-plugin-inbox segmented by topic and locale.'
              )}
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
              {t(
                'checkbox.segment_confirmed_subscribers_via_inbox_bridge',
                'Segment confirmed subscribers via Inbox Bridge'
              )}
            </Checkbox>
          </Box>
        </Box>

        <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
          <Box>
            <Flex
              justifyContent="space-between"
              alignItems="center"
              paddingBottom={2}
            >
              <Typography fontWeight="bold">
                {t(
                  'settings.ui.eventhub_auto_broadcasts',
                  'EventHub Auto-Broadcasts'
                )}
              </Typography>
              <Badge>
                {settings.enableEventHubAutomations
                  ? enabledText
                  : disabledText}
              </Badge>
            </Flex>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'settings.ui.eventhub_bridge_description',
                'Listens for Strapi EventHub events (e.g., inbox.alert.published, event.published) and triggers matching automation rules automatically.'
              )}
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
              {t(
                'checkbox.enable_eventhub_auto_broadcast_triggers',
                'Enable EventHub Auto-Broadcast Triggers'
              )}
            </Checkbox>
          </Box>
        </Box>

        <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
          <Box>
            <Flex
              justifyContent="space-between"
              alignItems="center"
              paddingBottom={2}
            >
              <Typography fontWeight="bold">
                {t(
                  'settings.ui.email_designer_html_templates',
                  'Email Designer 5 HTML Templates'
                )}
              </Typography>
              <Badge>
                {settings.enableEmailDesignerBridge !== false
                  ? enabledText
                  : disabledText}
              </Badge>
            </Flex>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'settings.ui.email_designer_bridge_description',
                'Optionally renders email broadcasts through strapi-plugin-email-designer-5 with automatic locale matching (es/en/ar/tr) and fallback to inline HTML.'
              )}
            </Typography>
          </Box>
          <Box paddingTop={3}>
            <Checkbox
              checked={settings.enableEmailDesignerBridge !== false}
              onCheckedChange={(checked: boolean) =>
                setSettings({
                  ...settings,
                  enableEmailDesignerBridge: Boolean(checked),
                })
              }
            >
              {t(
                'checkbox.enable_email_designer_5_html_template_bridge',
                'Enable Email Designer 5 HTML Template Bridge'
              )}
            </Checkbox>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
