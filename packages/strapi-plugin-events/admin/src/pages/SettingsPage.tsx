import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useFetchClient } from '@strapi/strapi/admin';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { SUPPORTED_INTL_CALENDARS } from '../../../shared/calendarSystems';
import { PLUGIN_ID } from '../../../shared/pluginId';
import type {
  CalendarSystemConfig,
  EventSourceMapping,
  EventsPluginSettings,
} from '../../../shared/types';

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const { get, put } = useFetchClient();

  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });

  const [settings, setSettings] = useState<EventsPluginSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  // New Secondary Calendar System form state
  const [newCalPreset, setNewCalPreset] = useState<string>('islamic-umalqura');
  const [newCalId, setNewCalId] = useState<string>('hijri');
  const [newCalLabel, setNewCalLabel] = useState<string>('Hijri (Umm al-Qura)');
  const [newCalOverrideField, setNewCalOverrideField] = useState<string>('hijriDate');
  const [newCalDayOffset, setNewCalDayOffset] = useState<number>(0);

  useEffect(() => {
    get(`/${PLUGIN_ID}/settings`)
      .then((res: { data?: { data?: EventsPluginSettings } }) => {
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
      setSavedBanner(t('settings.saved', 'Events plugin settings saved successfully.'));
    } catch {
      setSavedBanner(t('settings.error', 'Could not save settings.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleSourceEnabled = (sourceId: string, enabled: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      sources: settings.sources.map((src: EventSourceMapping) =>
        src.id === sourceId ? { ...src, enabled } : src
      ),
    });
  };

  const toggleCalendarEnabled = (calId: string, enabled: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      secondaryCalendars: (settings.secondaryCalendars ?? []).map((cal: CalendarSystemConfig) =>
        cal.id === calId ? { ...cal, enabled } : cal
      ),
    });
  };

  const removeCalendarSystem = (calId: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      secondaryCalendars: (settings.secondaryCalendars ?? []).filter(
        (cal: CalendarSystemConfig) => cal.id !== calId
      ),
    });
  };

  const handleAddCalendarSystem = () => {
    if (!settings || !newCalId.trim() || !newCalPreset) return;
    const cleanId = newCalId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (!cleanId) return;

    const existing = settings.secondaryCalendars ?? [];
    const nextEntry: CalendarSystemConfig = {
      id: cleanId,
      label: newCalLabel.trim() || cleanId,
      intlCalendar: newCalPreset,
      dayOffset: newCalDayOffset || 0,
      overrideField: newCalOverrideField.trim() || undefined,
      enabled: true,
    };

    const nextList = existing.some((c) => c.id === cleanId)
      ? existing.map((c) => (c.id === cleanId ? nextEntry : c))
      : [...existing, nextEntry];

    setSettings({
      ...settings,
      secondaryCalendars: nextList,
    });
  };

  if (!settings) {
    return (
      <Box padding={6}>
        <Typography variant="omega">
          {t('settings.loading', 'Loading Events & Calendar settings...')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box padding={6} background="neutral100">
      <Flex direction="column" alignItems="stretch" gap={5}>
        <Flex justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="alpha" fontWeight="bold">
              {t('settings.title', 'Events & Calendar Settings')}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="epsilon" textColor="neutral600">
                {t(
                  'settings.subtitle',
                  'Configure timezones, secondary calendar systems, iCal syndication, RSVP waitlist rules, and mapped collection types.'
                )}
              </Typography>
            </Box>
          </Box>
          <Button variant="default" loading={saving} onClick={handleSave}>
            {t('common.save', 'Save Settings')}
          </Button>
        </Flex>

        {savedBanner && (
          <Box padding={3} background="success100" hasRadius>
            <Typography variant="omega" fontWeight="bold" textColor="success700">
              {savedBanner}
            </Typography>
          </Box>
        )}

        {/* General Calendar Configuration */}
        <Box padding={5} background="neutral0" hasRadius shadow="tableShadow">
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Typography variant="delta" fontWeight="bold">
              {t('settings.section.general', 'Calendar & Feed Settings')}
            </Typography>

            <Flex gap={4} wrap="wrap">
              <Box style={{ flex: 1, minWidth: 240 }}>
                <Typography variant="pi" fontWeight="bold">
                  {t('settings.defaultTimezone', 'Default Timezone (IANA)')}
                </Typography>
                <TextInput
                  value={settings.defaultTimezone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSettings({ ...settings, defaultTimezone: e.target.value })
                  }
                />
              </Box>

              <Box style={{ flex: 1, minWidth: 240 }}>
                <Typography variant="pi" fontWeight="bold">
                  {t('settings.feedTitle', 'Public iCal (.ics) Feed Title')}
                </Typography>
                <TextInput
                  value={settings.feedTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSettings({ ...settings, feedTitle: e.target.value })
                  }
                />
              </Box>
            </Flex>
          </Flex>
        </Box>

        {/* Secondary / Alternative Calendar Systems */}
        <Box padding={5} background="neutral0" hasRadius shadow="tableShadow">
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Box>
              <Typography variant="delta" fontWeight="bold">
                {t(
                  'settings.section.secondaryCalendars',
                  'Secondary & Alternative Calendar Systems (Intl / Custom)'
                )}
              </Typography>
              <Box paddingTop={1}>
                <Typography variant="pi" textColor="neutral600">
                  {t(
                    'settings.secondaryCalendarsHint',
                    'Add Unicode CLDR calendar systems (e.g. Hijri, Hebrew, Persian, Buddhist, Chinese) or custom formatters with optional day-offset adjustments and document field overrides.'
                  )}
                </Typography>
              </Box>
            </Box>

            {(settings.secondaryCalendars ?? []).map((cal) => (
              <Box key={cal.id} padding={3} background="neutral100" hasRadius>
                <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
                  <Flex gap={2} alignItems="center" wrap="wrap">
                    <Typography variant="omega" fontWeight="bold">
                      {cal.label}
                    </Typography>
                    <Badge backgroundColor="secondary100" textColor="secondary700">
                      {cal.intlCalendar}
                    </Badge>
                    {cal.overrideField && (
                      <Badge backgroundColor="neutral200" textColor="neutral800">
                        overrideField: {cal.overrideField}
                      </Badge>
                    )}
                    {typeof cal.dayOffset === 'number' && cal.dayOffset !== 0 && (
                      <Badge backgroundColor="warning100" textColor="warning700">
                        offset: {cal.dayOffset > 0 ? `+${cal.dayOffset}` : cal.dayOffset}d
                      </Badge>
                    )}
                  </Flex>

                  <Flex gap={3} alignItems="center">
                    <Checkbox
                      checked={cal.enabled}
                      onCheckedChange={(checked: boolean) =>
                        toggleCalendarEnabled(cal.id, Boolean(checked))
                      }
                    >
                      {t('settings.calendarEnabled', 'Enabled')}
                    </Checkbox>
                    <Button
                      variant="danger-light"
                      size="S"
                      onClick={() => removeCalendarSystem(cal.id)}
                    >
                      {t('common.remove', 'Remove')}
                    </Button>
                  </Flex>
                </Flex>
              </Box>
            ))}

            <Box padding={3} background="neutral100" hasRadius>
              <Flex gap={3} wrap="wrap" alignItems="flex-end">
                <Box style={{ flex: 1, minWidth: 180 }}>
                  <Typography variant="pi" fontWeight="bold">
                    {t('settings.calendarPreset', 'Calendar System (CLDR)')}
                  </Typography>
                  <SingleSelect
                    value={newCalPreset}
                    onChange={(val: string) => {
                      setNewCalPreset(val);
                      const match = SUPPORTED_INTL_CALENDARS.find((c) => c.intlCalendar === val);
                      if (match) {
                        setNewCalId(match.id.split('-')[0]);
                        setNewCalLabel(match.defaultLabel);
                      }
                    }}
                  >
                    {SUPPORTED_INTL_CALENDARS.filter((c) => c.id !== 'gregory').map((cal) => (
                      <SingleSelectOption key={cal.id} value={cal.intlCalendar}>
                        {cal.defaultLabel} ({cal.intlCalendar})
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Box>

                <Box style={{ width: 130 }}>
                  <Typography variant="pi" fontWeight="bold">
                    {t('settings.calendarId', 'ID Key')}
                  </Typography>
                  <TextInput
                    value={newCalId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewCalId(e.target.value)
                    }
                    placeholder="hijri"
                  />
                </Box>

                <Box style={{ flex: 1, minWidth: 180 }}>
                  <Typography variant="pi" fontWeight="bold">
                    {t('settings.calendarLabel', 'Display Label')}
                  </Typography>
                  <TextInput
                    value={newCalLabel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewCalLabel(e.target.value)
                    }
                    placeholder="Hijri (Umm al-Qura)"
                  />
                </Box>

                <Box style={{ width: 160 }}>
                  <Typography variant="pi" fontWeight="bold">
                    {t('settings.overrideField', 'Override Field (Optional)')}
                  </Typography>
                  <TextInput
                    value={newCalOverrideField}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewCalOverrideField(e.target.value)
                    }
                    placeholder="hijriDate"
                  />
                </Box>

                <Box style={{ width: 120 }}>
                  <Typography variant="pi" fontWeight="bold">
                    {t('settings.dayOffset', 'Day Offset')}
                  </Typography>
                  <NumberInput
                    value={newCalDayOffset}
                    onValueChange={(val: number | undefined) =>
                      setNewCalDayOffset(typeof val === 'number' ? val : 0)
                    }
                  />
                </Box>

                <Button variant="secondary" onClick={handleAddCalendarSystem}>
                  + {t('settings.addCalendar', 'Add Calendar System')}
                </Button>
              </Flex>
            </Box>
          </Flex>
        </Box>

        {/* RSVP, Capacity & Waitlist Rules */}
        <Box padding={5} background="neutral0" hasRadius shadow="tableShadow">
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Typography variant="delta" fontWeight="bold">
              {t('settings.section.rsvp', 'RSVP, Capacity & Waitlist Automation')}
            </Typography>

            <Flex gap={4} wrap="wrap">
              <Box style={{ width: 220 }}>
                <Typography variant="pi" fontWeight="bold">
                  {t('settings.defaultCapacity', 'Default Event Capacity')}
                </Typography>
                <NumberInput
                  value={settings.defaultCapacity}
                  onValueChange={(val: number | undefined) =>
                    setSettings({
                      ...settings,
                      defaultCapacity: val && val >= 1 ? val : 100,
                    })
                  }
                />
              </Box>

              <Box style={{ width: 220 }}>
                <Typography variant="pi" fontWeight="bold">
                  {t('settings.maxGuests', 'Max Guests per Registration')}
                </Typography>
                <NumberInput
                  value={settings.defaultMaxGuestsPerRegistration}
                  onValueChange={(val: number | undefined) =>
                    setSettings({
                      ...settings,
                      defaultMaxGuestsPerRegistration: val && val >= 1 ? val : 5,
                    })
                  }
                />
              </Box>
            </Flex>

            <Checkbox
              checked={settings.waitlistEnabledByDefault}
              onCheckedChange={(checked: boolean) =>
                setSettings({ ...settings, waitlistEnabledByDefault: Boolean(checked) })
              }
            >
              {t(
                'settings.waitlistEnabledByDefault',
                'Enable Waitlist & automatic waitlist promotion when confirmed attendees cancel'
              )}
            </Checkbox>

            <Checkbox
              checked={settings.sendRsvpEmails}
              onCheckedChange={(checked: boolean) =>
                setSettings({ ...settings, sendRsvpEmails: Boolean(checked) })
              }
            >
              {t(
                'settings.sendRsvpEmails',
                'Send confirmation and waitlist promotion emails via Strapi Email plugin'
              )}
            </Checkbox>
          </Flex>
        </Box>

        {/* Mapped Collection Sources */}
        <Box padding={5} background="neutral0" hasRadius shadow="tableShadow">
          <Flex direction="column" alignItems="stretch" gap={3}>
            <Typography variant="delta" fontWeight="bold">
              {t('settings.section.sources', 'Mapped Calendar Collection Sources')}
            </Typography>

            {settings.sources.map((src) => (
              <Box key={src.id} padding={3} background="neutral100" hasRadius>
                <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
                  <Flex gap={2} alignItems="center">
                    <span
                      style={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: src.color,
                      }}
                    />
                    <Typography variant="omega" fontWeight="bold">
                      {src.label}
                    </Typography>
                    <Badge backgroundColor="neutral200" textColor="neutral800">
                      {src.uid}
                    </Badge>
                  </Flex>

                  <Checkbox
                    checked={src.enabled}
                    onCheckedChange={(checked: boolean) =>
                      toggleSourceEnabled(src.id, Boolean(checked))
                    }
                  >
                    {t('settings.sourceEnabled', 'Enabled on Calendar & Feeds')}
                  </Checkbox>
                </Flex>
              </Box>
            ))}
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
};

export default SettingsPage;
