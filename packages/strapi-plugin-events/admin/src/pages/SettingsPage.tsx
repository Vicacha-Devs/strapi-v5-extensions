import {
  Badge,
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  NumberInput,
  Tabs,
  TextInput,
  Typography,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import React, { useEffect, useState } from "react";
import { useIntl } from "react-intl";

import { PLUGIN_ID } from "../../../shared/pluginId";
import type { EventsPluginSettings } from "../../../shared/types";

const SUB_CARD_BORDER_STYLE: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.18)",
};

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const { get, put } = useFetchClient();

  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });

  const [settings, setSettings] = useState<EventsPluginSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  useEffect(() => {
    get<{ data?: EventsPluginSettings }>(`/${PLUGIN_ID}/settings`)
      .then((res) => {
        if (res?.data?.data) {
          setSettings(res.data.data);
        }
      })
      .catch(() => {
        // Ignore initial load error
      });
  }, [get]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSavedBanner(null);
    try {
      const res = await put(`/${PLUGIN_ID}/settings`, settings);
      if (res?.data?.data) {
        setSettings(res.data.data as EventsPluginSettings);
      }
      setSavedBanner(t("settings.saved", "Events plugin settings saved successfully."));
    } catch {
      setSavedBanner(t("settings.error", "Could not save settings."));
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <Box padding={6}>
        <Typography variant="omega">
          {t("settings.loading", "Loading Events & RSVP settings...")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box padding={6} background="neutral100">
      <Flex direction="column" alignItems="stretch" gap={5}>
        <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
          <Box>
            <Typography variant="alpha" fontWeight="bold">
              {t("settings.title", "Events & RSVP Settings")}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="epsilon" textColor="neutral600">
                {t(
                  "settings.subtitle",
                  "Configure RSVP capacity, waitlist promotion automation, and public iCal (.ics) syndication."
                )}
              </Typography>
            </Box>
          </Box>
          <Button variant="default" loading={saving} onClick={handleSave}>
            {t("common.save", "Save Settings")}
          </Button>
        </Flex>

        {savedBanner && (
          <Box padding={3} background="success100" hasRadius>
            <Typography variant="omega" fontWeight="bold" textColor="success700">
              {savedBanner}
            </Typography>
          </Box>
        )}

        <Tabs.Root defaultValue="rsvp">
          <Tabs.List aria-label={t("settings.title", "Events & RSVP Settings")}>
            <Tabs.Trigger value="rsvp">
              {t("settings.section.rsvp", "RSVP, Capacity & Waitlist Automation")}
            </Tabs.Trigger>
            <Tabs.Trigger value="feed">
              {t("settings.section.general", "iCal (.ics) Feed & Timezone")}
            </Tabs.Trigger>
          </Tabs.List>

          {/* Tab 1: RSVP, Capacity & Waitlist Rules */}
          <Tabs.Content value="rsvp">
            <Box
              padding={6}
              background="neutral0"
              hasRadius
              shadow="tableShadow"
              style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
            >
              <Flex direction="column" alignItems="stretch" gap={4}>
                <Typography variant="delta" fontWeight="bold">
                  {t("settings.section.rsvp", "RSVP, Capacity & Waitlist Automation")}
                </Typography>

                <Box
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 16,
                  }}
                >
                  <Field.Root
                    hint={t(
                      "settings.defaultCapacityHint",
                      "Default seat capacity for newly created RSVP events."
                    )}
                  >
                    <Field.Label>
                      {t("settings.defaultCapacity", "Default Event Capacity")}
                    </Field.Label>
                    <NumberInput
                      placeholder={t("settings.defaultCapacity.placeholder", "e.g., 100")}
                      value={settings.defaultCapacity || 100}
                      onValueChange={(val: number | undefined) =>
                        setSettings({
                          ...settings,
                          defaultCapacity: val && val >= 1 ? val : 100,
                        })
                      }
                    />
                    <Field.Hint />
                  </Field.Root>

                  <Field.Root
                    hint={t(
                      "settings.maxGuestsHint",
                      "Maximum number of seats a single RSVP submission may reserve."
                    )}
                  >
                    <Field.Label>
                      {t("settings.maxGuests", "Max Guests per Registration")}
                    </Field.Label>
                    <NumberInput
                      placeholder={t("settings.maxGuests.placeholder", "e.g., 5")}
                      value={settings.defaultMaxGuestsPerRegistration || 5}
                      onValueChange={(val: number | undefined) =>
                        setSettings({
                          ...settings,
                          defaultMaxGuestsPerRegistration: val && val >= 1 ? val : 5,
                        })
                      }
                    />
                    <Field.Hint />
                  </Field.Root>
                </Box>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 16,
                  }}
                >
                  <Box padding={4} background="neutral100" hasRadius style={SUB_CARD_BORDER_STYLE}>
                    <Checkbox
                      checked={settings.waitlistEnabledByDefault}
                      onCheckedChange={(checked: boolean) =>
                        setSettings({ ...settings, waitlistEnabledByDefault: Boolean(checked) })
                      }
                    >
                      {t(
                        "settings.waitlistEnabledByDefault",
                        "Enable Waitlist & Automatic Promotion"
                      )}
                    </Checkbox>
                    <Box paddingTop={2}>
                      <Typography variant="pi" textColor="neutral600">
                        {t(
                          "settings.waitlistEnabledByDefaultHint",
                          "Automatically promotes waitlisted attendees in FIFO order when a confirmed attendee cancels."
                        )}
                      </Typography>
                    </Box>
                  </Box>

                  <Box padding={4} background="neutral100" hasRadius style={SUB_CARD_BORDER_STYLE}>
                    <Checkbox
                      checked={settings.sendRsvpEmails}
                      onCheckedChange={(checked: boolean) =>
                        setSettings({ ...settings, sendRsvpEmails: Boolean(checked) })
                      }
                    >
                      {t(
                        "settings.sendRsvpEmails",
                        "Send Confirmation & Waitlist Promotion Emails"
                      )}
                    </Checkbox>
                    <Box paddingTop={2}>
                      <Typography variant="pi" textColor="neutral600">
                        {t(
                          "settings.sendRsvpEmailsHint",
                          "Dispatches confirmation and waitlist promotion emails via the Strapi Email plugin."
                        )}
                      </Typography>
                    </Box>
                  </Box>
                </div>
              </Flex>
            </Box>
          </Tabs.Content>

          {/* Tab 2: iCal Feed & Timezone */}
          <Tabs.Content value="feed">
            <Box
              padding={6}
              background="neutral0"
              hasRadius
              shadow="tableShadow"
              style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
            >
              <Flex direction="column" alignItems="stretch" gap={4}>
                <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
                  <Box>
                    <Typography variant="delta" fontWeight="bold">
                      {t("settings.section.general", "iCal (.ics) Feed & Timezone")}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {t(
                        "settings.section.generalHint",
                        "Default timezone and public iCal (.ics) feed title exported for community calendar subscriptions."
                      )}
                    </Typography>
                  </Box>
                  <Badge active>
                    {t("settings.badge.timezone", "Timezone")}:{" "}
                    {settings.defaultTimezone || "America/Bogota"}
                  </Badge>
                </Flex>

                <Box
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 16,
                  }}
                >
                  <Field.Root
                    hint={t(
                      "settings.defaultTimezoneHint",
                      "IANA timezone identifier used for event recurrence and iCal exports."
                    )}
                  >
                    <Field.Label>
                      {t("settings.defaultTimezone", "Default Timezone (IANA)")}
                    </Field.Label>
                    <TextInput
                      placeholder={t(
                        "settings.defaultTimezone.placeholder",
                        "e.g., America/Bogota"
                      )}
                      value={settings.defaultTimezone || "America/Bogota"}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettings({ ...settings, defaultTimezone: e.target.value })
                      }
                    />
                    <Field.Hint />
                  </Field.Root>

                  <Field.Root
                    hint={t(
                      "settings.feedTitleHint",
                      "Calendar name shown when users subscribe in Google, Apple, or Outlook Calendar."
                    )}
                  >
                    <Field.Label>
                      {t("settings.feedTitle", "Public iCal (.ics) Feed Title")}
                    </Field.Label>
                    <TextInput
                      placeholder={t(
                        "settings.feedTitle.placeholder",
                        "e.g., Abu Bakr As-Siddiq Central Mosque — Events Calendar"
                      )}
                      value={
                        settings.feedTitle ||
                        t(
                          "settings.defaultFeedTitle",
                          "Abu Bakr As-Siddiq Central Mosque — Events Calendar"
                        )
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettings({ ...settings, feedTitle: e.target.value })
                      }
                    />
                    <Field.Hint />
                  </Field.Root>
                </Box>
              </Flex>
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Flex>
    </Box>
  );
};

export default SettingsPage;
