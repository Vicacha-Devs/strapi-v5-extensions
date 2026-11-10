import {
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
import { Layouts, useFetchClient, useNotification } from "@strapi/strapi/admin";
import React, { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";

import type { BookingsPluginSettings } from "../../../shared/types";
import { PLUGIN_ID } from "../pluginId";
import { getTranslation } from "../utils/getTranslation";

interface SlotNumberFieldSpec {
  name: keyof Pick<
    BookingsPluginSettings,
    | "defaultSlotDurationMinutes"
    | "defaultCapacityPerSlot"
    | "defaultBufferBeforeMinutes"
    | "defaultBufferAfterMinutes"
    | "defaultMinLeadTimeHours"
    | "defaultMaxAdvanceDays"
  >;
  labelId: string;
  labelDefault: string;
  hintId: string;
  hintDefault: string;
  placeholderId: string;
  placeholderDefault: string;
  min: number;
  fallback: number;
}

const SLOT_NUMBER_FIELDS: SlotNumberFieldSpec[] = [
  {
    name: "defaultSlotDurationMinutes",
    labelId: "settings.defaultSlotDurationMinutes",
    labelDefault: "Slot Duration (Minutes)",
    hintId: "settings.defaultSlotDurationMinutesHint",
    hintDefault: "Standard length of each bookable appointment slot.",
    placeholderId: "settings.defaultSlotDurationMinutes.placeholder",
    placeholderDefault: "e.g., 60",
    min: 5,
    fallback: 60,
  },
  {
    name: "defaultCapacityPerSlot",
    labelId: "settings.defaultCapacityPerSlot",
    labelDefault: "Default Capacity Per Slot",
    hintId: "settings.defaultCapacityPerSlotHint",
    hintDefault: "Concurrent reservations allowed per time slot.",
    placeholderId: "settings.defaultCapacityPerSlot.placeholder",
    placeholderDefault: "e.g., 1",
    min: 1,
    fallback: 1,
  },
  {
    name: "defaultBufferBeforeMinutes",
    labelId: "settings.defaultBufferBeforeMinutes",
    labelDefault: "Buffer Before (Minutes)",
    hintId: "settings.defaultBufferBeforeMinutesHint",
    hintDefault: "Preparation gap blocked before each booking starts.",
    placeholderId: "settings.defaultBufferBeforeMinutes.placeholder",
    placeholderDefault: "e.g., 0",
    min: 0,
    fallback: 0,
  },
  {
    name: "defaultBufferAfterMinutes",
    labelId: "settings.defaultBufferAfterMinutes",
    labelDefault: "Buffer After (Minutes)",
    hintId: "settings.defaultBufferAfterMinutesHint",
    hintDefault: "Cooldown gap blocked after each booking ends.",
    placeholderId: "settings.defaultBufferAfterMinutes.placeholder",
    placeholderDefault: "e.g., 0",
    min: 0,
    fallback: 0,
  },
  {
    name: "defaultMinLeadTimeHours",
    labelId: "settings.defaultMinLeadTimeHours",
    labelDefault: "Minimum Lead Time (Hours)",
    hintId: "settings.defaultMinLeadTimeHoursHint",
    hintDefault: "Minimum notice required before a slot can be booked.",
    placeholderId: "settings.defaultMinLeadTimeHours.placeholder",
    placeholderDefault: "e.g., 2",
    min: 0,
    fallback: 2,
  },
  {
    name: "defaultMaxAdvanceDays",
    labelId: "settings.defaultMaxAdvanceDays",
    labelDefault: "Max Advance Horizon (Days)",
    hintId: "settings.defaultMaxAdvanceDaysHint",
    hintDefault: "How far in advance visitors may schedule bookings.",
    placeholderId: "settings.defaultMaxAdvanceDays.placeholder",
    placeholderDefault: "e.g., 90",
    min: 1,
    fallback: 90,
  },
];

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();

  const t = useCallback(
    (id: string, defaultMessage: string) =>
      formatMessage({ id: getTranslation(id), defaultMessage }),
    [formatMessage]
  );

  const [settings, setSettings] = useState<BookingsPluginSettings>({
    theme: "breeze",
    defaultLocale: "es",
    secondaryCalendarLanguage: "local",
    defaultTimezone: "America/Bogota",
    defaultSlotDurationMinutes: 60,
    defaultBufferBeforeMinutes: 0,
    defaultBufferAfterMinutes: 0,
    defaultCapacityPerSlot: 1,
    defaultMinLeadTimeHours: 2,
    defaultMaxAdvanceDays: 90,
    defaultRequiresApproval: false,
    sendEmailNotifications: true,
    secondaryCalendars: [],
    sources: [],
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await get<{ data?: BookingsPluginSettings }>(
          `/${PLUGIN_ID}/settings`
        );
        if (!isMounted) return;
        if (res.data?.data) {
          setSettings(res.data.data);
          setLoadError(false);
        }
      } catch {
        if (!isMounted) return;
        setLoadError(true);
        toggleNotification({
          type: "danger",
          message: t("settings.loadError", "Failed to load bookings settings"),
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [get, toggleNotification, t]);

  const handleSave = async () => {
    if (loadError || loading) return;
    setSaving(true);
    try {
      const res = await put<{ data?: BookingsPluginSettings }>(
        `/${PLUGIN_ID}/settings`,
        settings
      );
      if (res.data?.data) {
        setSettings(res.data.data);
      }
      toggleNotification({
        type: "success",
        message: t("settings.saved", "Bookings settings saved successfully"),
      });
    } catch {
      toggleNotification({
        type: "danger",
        message: t("settings.saveError", "Failed to save bookings settings"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layouts.Root>
      <Layouts.Header
        title={t("settings.title", "Bookings & Availability Settings")}
        subtitle={t(
          "settings.subtitle",
          "Configure default slot durations, capacity limits, buffer times, lead times, and reservation approval rules. Visual calendar themes and secondary calendars are managed centrally in Calendar Settings."
        )}
        primaryAction={
          <Button
            loading={saving}
            disabled={loading || loadError || saving}
            onClick={handleSave}
          >
            {t("settings.save", "Save Settings")}
          </Button>
        }
      />

      <Layouts.Content>
        <Tabs.Root defaultValue="slots">
          <Tabs.List
            aria-label={t("settings.title", "Bookings & Availability Settings")}
          >
            <Tabs.Trigger value="slots">
              {t("settings.defaultsHeading", "Default Slot & Scheduling Rules")}
            </Tabs.Trigger>
            <Tabs.Trigger value="approvals">
              {t(
                "settings.approvalsHeading",
                "Approval Workflow & Email Notifications"
              )}
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="slots">
            <Box
              background="neutral0"
              hasRadius
              shadow="tableShadow"
              padding={6}
              style={{
                border: "1px solid rgba(128, 128, 128, 0.22)",
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
              }}
            >
              <Flex direction="column" alignItems="stretch" gap={4}>
                <Typography variant="delta" fontWeight="bold" tag="h2">
                  {t(
                    "settings.defaultsHeading",
                    "Default Slot & Scheduling Rules"
                  )}
                </Typography>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 16,
                  }}
                >
                  {SLOT_NUMBER_FIELDS.map((field) => (
                    <Field.Root
                      key={field.name}
                      name={field.name}
                      hint={t(field.hintId, field.hintDefault)}
                    >
                      <Field.Label>
                        {t(field.labelId, field.labelDefault)}
                      </Field.Label>
                      <NumberInput
                        placeholder={t(
                          field.placeholderId,
                          field.placeholderDefault
                        )}
                        value={settings[field.name]}
                        onValueChange={(v: number | undefined) => {
                          const num = Number(v ?? field.fallback);
                          const safe = Number.isFinite(num)
                            ? Math.max(field.min, Math.trunc(num))
                            : field.fallback;
                          setSettings((prev) => ({
                            ...prev,
                            [field.name]: safe,
                          }));
                        }}
                      />
                      <Field.Hint />
                    </Field.Root>
                  ))}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 16,
                  }}
                >
                  <Field.Root
                    name="defaultTimezone"
                    hint={t(
                      "settings.defaultTimezoneHint",
                      "IANA timezone used to evaluate daily operating windows."
                    )}
                  >
                    <Field.Label>
                      {t(
                        "settings.defaultTimezone",
                        "Operating Hours Timezone (IANA)"
                      )}
                    </Field.Label>
                    <TextInput
                      placeholder={t(
                        "settings.defaultTimezone.placeholder",
                        "e.g., America/Bogota"
                      )}
                      value={settings.defaultTimezone ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettings((prev) => ({
                          ...prev,
                          defaultTimezone: e.target.value,
                        }))
                      }
                    />
                    <Field.Hint />
                  </Field.Root>
                </div>
              </Flex>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="approvals">
            <Box
              background="neutral0"
              hasRadius
              shadow="tableShadow"
              padding={6}
              style={{
                border: "1px solid rgba(128, 128, 128, 0.22)",
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
              }}
            >
              <Flex direction="column" alignItems="stretch" gap={4}>
                <Typography variant="delta" fontWeight="bold" tag="h2">
                  {t(
                    "settings.approvalsHeading",
                    "Approval Workflow & Email Notifications"
                  )}
                </Typography>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 16,
                  }}
                >
                  <Box
                    padding={4}
                    background="neutral100"
                    hasRadius
                    style={{ border: "1px solid rgba(128, 128, 128, 0.18)" }}
                  >
                    <Checkbox
                      checked={settings.defaultRequiresApproval}
                      onCheckedChange={(checked: boolean) =>
                        setSettings((prev) => ({
                          ...prev,
                          defaultRequiresApproval: Boolean(checked),
                        }))
                      }
                    >
                      {t(
                        "settings.requiresApproval",
                        "Require Manual Admin Approval"
                      )}
                    </Checkbox>
                    <Box paddingTop={2}>
                      <Typography variant="pi" textColor="neutral600">
                        {t(
                          "settings.requiresApprovalHintPrefix",
                          "Places new visitor reservations in"
                        )}{" "}
                        <code
                          style={{
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            fontSize: "0.88em",
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "rgba(128, 128, 128, 0.16)",
                            border: "1px solid rgba(128, 128, 128, 0.25)",
                          }}
                        >
                          pending
                        </code>{" "}
                        {t(
                          "settings.requiresApprovalHintSuffix",
                          "status until confirmed by staff."
                        )}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    padding={4}
                    background="neutral100"
                    hasRadius
                    style={{ border: "1px solid rgba(128, 128, 128, 0.18)" }}
                  >
                    <Checkbox
                      checked={settings.sendEmailNotifications}
                      onCheckedChange={(checked: boolean) =>
                        setSettings((prev) => ({
                          ...prev,
                          sendEmailNotifications: Boolean(checked),
                        }))
                      }
                    >
                      {t(
                        "settings.sendEmailNotifications",
                        "Send Confirmation & Status Update Emails"
                      )}
                    </Checkbox>
                    <Box paddingTop={2}>
                      <Typography variant="pi" textColor="neutral600">
                        {t(
                          "settings.sendEmailNotificationsHint",
                          "Automatically notifies visitors when their booking is created, approved, or rescheduled."
                        )}
                      </Typography>
                    </Box>
                  </Box>
                </div>
              </Flex>
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Layouts.Content>
    </Layouts.Root>
  );
};

export default SettingsPage;
