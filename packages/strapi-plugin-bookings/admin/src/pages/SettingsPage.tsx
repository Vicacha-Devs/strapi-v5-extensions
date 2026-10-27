import React, { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
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
} from '@strapi/design-system';
import { Layouts, useFetchClient, useNotification } from '@strapi/strapi/admin';
import type { BookingsPluginSettings } from '../../../shared/types';
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
    theme: 'breeze',
    defaultLocale: 'es',
    secondaryCalendarLanguage: 'local',
    defaultTimezone: 'America/Bogota',
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
          'Configure default slot durations, capacity limits, buffer times, lead times, and reservation approval rules. Visual calendar themes and secondary calendars are managed centrally in Calendar Settings.'
        )}
        primaryAction={
          <Button loading={saving} onClick={handleSave}>
            {t('settings.save', 'Save Settings')}
          </Button>
        }
      />

      <Layouts.Content>
        <Tabs.Root defaultValue="slots">
          <Tabs.List aria-label={t('settings.title', 'Bookings & Availability Settings')}>
            <Tabs.Trigger value="slots">
              {t('settings.defaultsHeading', 'Default Slot & Scheduling Rules')}
            </Tabs.Trigger>
            <Tabs.Trigger value="approvals">
              {t('settings.approvalsHeading', 'Approval Workflow & Email Notifications')}
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="slots">
            <Box
              background="neutral0"
              hasRadius
              shadow="tableShadow"
              padding={6}
              style={{ border: '1px solid rgba(128, 128, 128, 0.22)' }}
            >
              <Flex direction="column" alignItems="stretch" gap={4}>
                <Typography variant="delta" fontWeight="bold" tag="h2">
                  {t('settings.defaultsHeading', 'Default Slot & Scheduling Rules')}
                </Typography>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 16,
                  }}
                >
                  <Field.Root>
                    <Field.Label>
                      {t(
                        'settings.defaultSlotDurationMinutes',
                        'Slot Duration (Minutes)'
                      )}
                    </Field.Label>
                    <NumberInput
                      placeholder={t(
                        'settings.defaultSlotDurationMinutes.placeholder',
                        'e.g., 60'
                      )}
                      value={settings.defaultSlotDurationMinutes}
                      onValueChange={(v: number | undefined) =>
                        setSettings({
                          ...settings,
                          defaultSlotDurationMinutes: Math.max(5, Number(v ?? 60)),
                        })
                      }
                    />
                    <Field.Hint>
                      {t(
                        'settings.defaultSlotDurationMinutesHint',
                        'Standard length of each bookable appointment slot.'
                      )}
                    </Field.Hint>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>
                      {t(
                        'settings.defaultCapacityPerSlot',
                        'Default Capacity Per Slot'
                      )}
                    </Field.Label>
                    <NumberInput
                      placeholder={t(
                        'settings.defaultCapacityPerSlot.placeholder',
                        'e.g., 1'
                      )}
                      value={settings.defaultCapacityPerSlot}
                      onValueChange={(v: number | undefined) =>
                        setSettings({
                          ...settings,
                          defaultCapacityPerSlot: Math.max(1, Number(v ?? 1)),
                        })
                      }
                    />
                    <Field.Hint>
                      {t(
                        'settings.defaultCapacityPerSlotHint',
                        'Concurrent reservations allowed per time slot.'
                      )}
                    </Field.Hint>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>
                      {t(
                        'settings.defaultBufferBeforeMinutes',
                        'Buffer Before (Minutes)'
                      )}
                    </Field.Label>
                    <NumberInput
                      placeholder={t(
                        'settings.defaultBufferBeforeMinutes.placeholder',
                        'e.g., 0'
                      )}
                      value={settings.defaultBufferBeforeMinutes}
                      onValueChange={(v: number | undefined) =>
                        setSettings({
                          ...settings,
                          defaultBufferBeforeMinutes: Math.max(0, Number(v ?? 0)),
                        })
                      }
                    />
                    <Field.Hint>
                      {t(
                        'settings.defaultBufferBeforeMinutesHint',
                        'Preparation gap blocked before each booking starts.'
                      )}
                    </Field.Hint>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>
                      {t(
                        'settings.defaultBufferAfterMinutes',
                        'Buffer After (Minutes)'
                      )}
                    </Field.Label>
                    <NumberInput
                      placeholder={t(
                        'settings.defaultBufferAfterMinutes.placeholder',
                        'e.g., 0'
                      )}
                      value={settings.defaultBufferAfterMinutes}
                      onValueChange={(v: number | undefined) =>
                        setSettings({
                          ...settings,
                          defaultBufferAfterMinutes: Math.max(0, Number(v ?? 0)),
                        })
                      }
                    />
                    <Field.Hint>
                      {t(
                        'settings.defaultBufferAfterMinutesHint',
                        'Cooldown gap blocked after each booking ends.'
                      )}
                    </Field.Hint>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>
                      {t(
                        'settings.defaultMinLeadTimeHours',
                        'Minimum Lead Time (Hours)'
                      )}
                    </Field.Label>
                    <NumberInput
                      placeholder={t(
                        'settings.defaultMinLeadTimeHours.placeholder',
                        'e.g., 2'
                      )}
                      value={settings.defaultMinLeadTimeHours}
                      onValueChange={(v: number | undefined) =>
                        setSettings({
                          ...settings,
                          defaultMinLeadTimeHours: Math.max(0, Number(v ?? 2)),
                        })
                      }
                    />
                    <Field.Hint>
                      {t(
                        'settings.defaultMinLeadTimeHoursHint',
                        'Minimum notice required before a slot can be booked.'
                      )}
                    </Field.Hint>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>
                      {t(
                        'settings.defaultMaxAdvanceDays',
                        'Max Advance Horizon (Days)'
                      )}
                    </Field.Label>
                    <NumberInput
                      placeholder={t(
                        'settings.defaultMaxAdvanceDays.placeholder',
                        'e.g., 90'
                      )}
                      value={settings.defaultMaxAdvanceDays}
                      onValueChange={(v: number | undefined) =>
                        setSettings({
                          ...settings,
                          defaultMaxAdvanceDays: Math.max(1, Number(v ?? 90)),
                        })
                      }
                    />
                    <Field.Hint>
                      {t(
                        'settings.defaultMaxAdvanceDaysHint',
                        'How far in advance visitors may schedule bookings.'
                      )}
                    </Field.Hint>
                  </Field.Root>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 16,
                  }}
                >
                  <Field.Root>
                    <Field.Label>
                      {t('settings.defaultTimezone', 'Operating Hours Timezone (IANA)')}
                    </Field.Label>
                    <TextInput
                      placeholder={t(
                        'settings.defaultTimezone.placeholder',
                        'e.g., America/Bogota'
                      )}
                      value={settings.defaultTimezone || 'America/Bogota'}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettings({
                          ...settings,
                          defaultTimezone: e.target.value,
                        })
                      }
                    />
                    <Field.Hint>
                      {t(
                        'settings.defaultTimezoneHint',
                        'IANA timezone used to evaluate daily operating windows.'
                      )}
                    </Field.Hint>
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
              style={{ border: '1px solid rgba(128, 128, 128, 0.22)' }}
            >
              <Flex direction="column" alignItems="stretch" gap={4}>
                <Typography variant="delta" fontWeight="bold" tag="h2">
                  {t('settings.approvalsHeading', 'Approval Workflow & Email Notifications')}
                </Typography>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 16,
                  }}
                >
                <Box
                  padding={4}
                  background="neutral100"
                  hasRadius
                  style={{ border: '1px solid rgba(128, 128, 128, 0.18)' }}
                >
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
                      'Require Manual Admin Approval'
                    )}
                  </Checkbox>
                  <Box paddingTop={2}>
                    <Typography variant="pi" textColor="neutral600">
                      {t(
                        'settings.requiresApprovalHintPrefix',
                        'Places new visitor reservations in'
                      )}{' '}
                      <code
                        style={{
                          fontFamily:
                            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: '0.88em',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(128, 128, 128, 0.16)',
                          border: '1px solid rgba(128, 128, 128, 0.25)',
                        }}
                      >
                        pending
                      </code>{' '}
                      {t(
                        'settings.requiresApprovalHintSuffix',
                        'status until confirmed by staff.'
                      )}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  padding={4}
                  background="neutral100"
                  hasRadius
                  style={{ border: '1px solid rgba(128, 128, 128, 0.18)' }}
                >
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
                      'Send Confirmation & Status Update Emails'
                    )}
                  </Checkbox>
                  <Box paddingTop={2}>
                    <Typography variant="pi" textColor="neutral600">
                      {t(
                        'settings.sendEmailNotificationsHint',
                        'Automatically notifies visitors when their booking is created, approved, or rescheduled.'
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
