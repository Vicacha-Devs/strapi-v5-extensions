import React, { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  Layouts,
  NumberInput,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { SUPPORTED_INTL_CALENDARS } from '../../../shared/calendarSystems';
import type {
  BookingsPluginSettings,
  SecondaryCalendarConfig,
} from '../../../shared/types';
import { PLUGIN_ID } from '../pluginId';
import { getTranslation } from '../utils/getTranslation';

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
    defaultTimezone: 'UTC',
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await get(`/${PLUGIN_ID}/settings`);
        if (res.data?.data) {
          setSettings(res.data.data as BookingsPluginSettings);
        }
      } catch {
        // Ignore initial load error
      }
    };
    void load();
  }, [get]);

  const handleToggleSecondaryCalendar = (
    calId: string,
    intlCalendar: string,
    defaultLabel: string
  ) => {
    const existing = settings.secondaryCalendars.find((c) => c.id === calId);
    let nextCalendars: SecondaryCalendarConfig[];
    if (existing) {
      nextCalendars = settings.secondaryCalendars.map((c) =>
        c.id === calId ? { ...c, enabled: !c.enabled } : c
      );
    } else {
      nextCalendars = [
        ...settings.secondaryCalendars,
        {
          id: calId,
          label: defaultLabel,
          intlCalendar,
          dayOffset: 0,
          enabled: true,
        },
      ];
    }
    setSettings({ ...settings, secondaryCalendars: nextCalendars });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await put(`/${PLUGIN_ID}/settings`, settings);
      if (res.data?.data) {
        setSettings(res.data.data as BookingsPluginSettings);
      }
      toggleNotification({
        type: 'success',
        message: t('settings.saved', 'Bookings settings saved successfully'),
      });
    } catch {
      toggleNotification({
        type: 'danger',
        message: t('settings.saveError', 'Failed to save bookings settings'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layouts.Root>
      <Layouts.Header
        title={t('settings.title', 'Bookings & Availability Settings')}
        subtitle={t(
          'settings.subtitle',
          'Configure default slot durations, buffer times, lead times, approval rules, and secondary calendars'
        )}
        primaryAction={
          <Button loading={saving} onClick={handleSave}>
            {t('settings.save', 'Save Settings')}
          </Button>
        }
      />

      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={5}>
          <Box background="neutral0" hasRadius shadow="tableShadow" padding={5}>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Typography variant="delta" tag="h2">
                {t('settings.defaultsHeading', 'Default Slot & Scheduling Rules')}
              </Typography>

              <Flex gap={4} wrap="wrap">
                <Box style={{ flex: '1 1 200px' }}>
                  <TextInput
                    label={t('settings.defaultTimezone', 'Default Timezone')}
                    value={settings.defaultTimezone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSettings({
                        ...settings,
                        defaultTimezone: e.target.value,
                      })
                    }
                  />
                </Box>
                <Box style={{ flex: '1 1 200px' }}>
                  <NumberInput
                    label={t(
                      'settings.defaultSlotDurationMinutes',
                      'Slot Duration (Minutes)'
                    )}
                    value={settings.defaultSlotDurationMinutes}
                    onValueChange={(v: number | undefined) =>
                      setSettings({
                        ...settings,
                        defaultSlotDurationMinutes: Math.max(5, Number(v ?? 60)),
                      })
                    }
                  />
                </Box>
                <Box style={{ flex: '1 1 200px' }}>
                  <NumberInput
                    label={t(
                      'settings.defaultCapacityPerSlot',
                      'Default Capacity Per Slot'
                    )}
                    value={settings.defaultCapacityPerSlot}
                    onValueChange={(v: number | undefined) =>
                      setSettings({
                        ...settings,
                        defaultCapacityPerSlot: Math.max(1, Number(v ?? 1)),
                      })
                    }
                  />
                </Box>
              </Flex>

              <Flex gap={4} wrap="wrap">
                <Box style={{ flex: '1 1 200px' }}>
                  <NumberInput
                    label={t(
                      'settings.defaultBufferBeforeMinutes',
                      'Buffer Before (Minutes)'
                    )}
                    value={settings.defaultBufferBeforeMinutes}
                    onValueChange={(v: number | undefined) =>
                      setSettings({
                        ...settings,
                        defaultBufferBeforeMinutes: Math.max(0, Number(v ?? 0)),
                      })
                    }
                  />
                </Box>
                <Box style={{ flex: '1 1 200px' }}>
                  <NumberInput
                    label={t(
                      'settings.defaultBufferAfterMinutes',
                      'Buffer After (Minutes)'
                    )}
                    value={settings.defaultBufferAfterMinutes}
                    onValueChange={(v: number | undefined) =>
                      setSettings({
                        ...settings,
                        defaultBufferAfterMinutes: Math.max(0, Number(v ?? 0)),
                      })
                    }
                  />
                </Box>
                <Box style={{ flex: '1 1 200px' }}>
                  <NumberInput
                    label={t(
                      'settings.defaultMinLeadTimeHours',
                      'Minimum Lead Time (Hours)'
                    )}
                    value={settings.defaultMinLeadTimeHours}
                    onValueChange={(v: number | undefined) =>
                      setSettings({
                        ...settings,
                        defaultMinLeadTimeHours: Math.max(0, Number(v ?? 2)),
                      })
                    }
                  />
                </Box>
                <Box style={{ flex: '1 1 200px' }}>
                  <NumberInput
                    label={t(
                      'settings.defaultMaxAdvanceDays',
                      'Max Advance Horizon (Days)'
                    )}
                    value={settings.defaultMaxAdvanceDays}
                    onValueChange={(v: number | undefined) =>
                      setSettings({
                        ...settings,
                        defaultMaxAdvanceDays: Math.max(1, Number(v ?? 90)),
                      })
                    }
                  />
                </Box>
              </Flex>

              <Divider />

              <Flex gap={6} wrap="wrap">
                <Checkbox
                  checked={settings.defaultRequiresApproval}
                  onCheckedChange={(checked: boolean) =>
                    setSettings({
                      ...settings,
                      defaultRequiresApproval: Boolean(checked),
                    })
                  }
                >
                  {t(
                    'settings.requiresApproval',
                    'Require manual admin approval before confirming bookings'
                  )}
                </Checkbox>

                <Checkbox
                  checked={settings.sendEmailNotifications}
                  onCheckedChange={(checked: boolean) =>
                    setSettings({
                      ...settings,
                      sendEmailNotifications: Boolean(checked),
                    })
                  }
                >
                  {t(
                    'settings.sendEmailNotifications',
                    'Send confirmation and status update emails'
                  )}
                </Checkbox>
              </Flex>
            </Flex>
          </Box>

          <Box background="neutral0" hasRadius shadow="tableShadow" padding={5}>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Typography variant="delta" tag="h2">
                {t(
                  'settings.secondaryCalendarsHeading',
                  'Secondary Calendar Systems (Powered by @vicacha-devs/strapi-plugin-calendar)'
                )}
              </Typography>
              <Flex gap={4} wrap="wrap">
                {SUPPORTED_INTL_CALENDARS.filter(
                  (cal) => cal.id !== 'gregory' && cal.id !== 'iso8601'
                ).map((cal) => {
                  const active = settings.secondaryCalendars.find(
                    (c) => c.id === cal.id
                  )?.enabled;
                  return (
                    <Checkbox
                      key={cal.id}
                      checked={Boolean(active)}
                      onCheckedChange={() =>
                        handleToggleSecondaryCalendar(
                          cal.id,
                          cal.intlCalendar,
                          cal.defaultLabel
                        )
                      }
                    >
                      {cal.defaultLabel}
                    </Checkbox>
                  );
                })}
              </Flex>
            </Flex>
          </Box>
        </Flex>
      </Layouts.Content>
    </Layouts.Root>
  );
};

export default SettingsPage;
