import {
  Badge,
  Box,
  Checkbox,
  Flex,
  Tabs,
  Typography,
} from "@strapi/design-system";
import React from "react";

import type { SettingsTabProps } from "./SettingsCalculationAndFiqhTabs";

const subCardStyle: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.22)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

export const EcosystemBridgesSettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  setSettings,
  t,
}) => {
  const statusLabel = (enabled: boolean) =>
    enabled
      ? t("settings.ui.status_enabled", "Enabled")
      : t("settings.ui.status_disabled", "Disabled");

  return (
    <Tabs.Content value="bridges">
      <Box
        background="neutral0"
        padding={6}
        hasRadius
        shadow="filterShadow"
        style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
      >
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography variant="beta" tag="h2">
            {t(
              "settings.ui.4_cross_plugin_ecosystem_bridges",
              "Cross-Plugin Ecosystem Bridges"
            )}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {t(
              "settings.ui.synchronize_moonsighting_offsets_gold_silver_nis",
              "Synchronize moonsighting offsets, Gold/Silver Nisab rates, and Hilal announcements with companion plugins."
            )}
          </Typography>
        </Flex>

        <Box
          paddingTop={4}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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
                    "settings.ui.calendar_hijri_offset_bridge",
                    "Calendar Hijri Offset Bridge"
                  )}
                </Typography>
                <Badge>
                  {statusLabel(Boolean(settings.enableCalendarBridge))}
                </Badge>
              </Flex>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  "settings.ui.calendar_bridge_desc",
                  "Propagates local Hijri moonsighting offset changes to @vicacha-devs/strapi-plugin-calendar."
                )}
              </Typography>
            </Box>
            <Box paddingTop={3}>
              <Checkbox
                checked={Boolean(settings.enableCalendarBridge)}
                onCheckedChange={(val: boolean) =>
                  setSettings({
                    ...settings,
                    enableCalendarBridge: Boolean(val),
                  })
                }
              >
                {t(
                  "checkbox.sync_hijri_offset_with_calendar_plugin",
                  "Sync Hijri offset with Calendar plugin"
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
                    "settings.ui.donations_nisab_bridge",
                    "Donations Nisab Bridge"
                  )}
                </Typography>
                <Badge>
                  {statusLabel(Boolean(settings.enableDonationsBridge))}
                </Badge>
              </Flex>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  "settings.ui.donations_bridge_desc",
                  "Synchronizes Gold & Silver Nisab gram prices with @vicacha-devs/strapi-plugin-donations Zakat calculator."
                )}
              </Typography>
            </Box>
            <Box paddingTop={3}>
              <Checkbox
                checked={Boolean(settings.enableDonationsBridge)}
                onCheckedChange={(val: boolean) =>
                  setSettings({
                    ...settings,
                    enableDonationsBridge: Boolean(val),
                  })
                }
              >
                {t(
                  "checkbox.sync_gold_amp_silver_nisab_with_donations_plugin",
                  "Sync Gold & Silver Nisab with Donations plugin"
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
                    "settings.ui.inbox_hilal_alert_bridge",
                    "Inbox Hilal Alert Bridge"
                  )}
                </Typography>
                <Badge>
                  {statusLabel(Boolean(settings.enableInboxAlertBridge))}
                </Badge>
              </Flex>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  "settings.ui.inbox_bridge_desc",
                  "Automatically publishes Ramadan & Eid moonsighting announcements to @vicacha-devs/strapi-plugin-inbox Alert Banners."
                )}
              </Typography>
            </Box>
            <Box paddingTop={3}>
              <Checkbox
                checked={Boolean(settings.enableInboxAlertBridge)}
                onCheckedChange={(val: boolean) =>
                  setSettings({
                    ...settings,
                    enableInboxAlertBridge: Boolean(val),
                  })
                }
              >
                {t(
                  "checkbox.auto_publish_hilal_alerts_to_inbox_banners",
                  "Auto-publish Hilal alerts to Inbox Banners"
                )}
              </Checkbox>
            </Box>
          </Box>
        </Box>
      </Box>
    </Tabs.Content>
  );
};
