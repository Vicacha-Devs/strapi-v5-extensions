import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useFetchClient } from '@strapi/strapi/admin';
import { Box, Button, Flex, Typography } from '@strapi/design-system';
import { PLUGIN_ID } from '../../../shared/pluginId';
import type {
  CalendarPluginSettings,
  CalendarSourceMapping,
  CalendarSystemConfig,
  DiscoveredContentType,
} from '../../../shared/types';
import { CalendarViewsSection } from '../components/settings/CalendarViewsSection';
import { CollectionSourcesSection } from '../components/settings/CollectionSourcesSection';
import { SecondaryCalendarsSection } from '../components/settings/SecondaryCalendarsSection';

interface SettingsApiResponse {
  data?: CalendarPluginSettings;
}

interface ContentTypesApiResponse {
  data?: DiscoveredContentType[];
}

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const { get, put, post } = useFetchClient();

  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });

  const [settings, setSettings] = useState<CalendarPluginSettings | null>(null);
  const [contentTypes, setContentTypes] = useState<DiscoveredContentType[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      get<SettingsApiResponse>(`/${PLUGIN_ID}/settings`),
      get<ContentTypesApiResponse>(`/${PLUGIN_ID}/content-types`),
    ])
      .then(([settingsRes, ctRes]) => {
        if (settingsRes?.data?.data) {
          setSettings(settingsRes.data.data);
        }
        if (Array.isArray(ctRes?.data?.data)) {
          setContentTypes(ctRes.data.data);
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
      const res = await put<SettingsApiResponse>(`/${PLUGIN_ID}/settings`, settings);
      if (res?.data?.data) {
        setSettings(res.data.data);
      }
      setSavedBanner(t('settings.saved', 'Calendar settings saved successfully.'));
    } catch {
      setSavedBanner(t('settings.error', 'Could not save settings.'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = async () => {
    setSaving(true);
    try {
      const res = await post<SettingsApiResponse>(`/${PLUGIN_ID}/clear-settings`, {});
      if (res?.data?.data) {
        setSettings(res.data.data);
      }
      setSavedBanner(t('settings.resetSuccess', 'Settings reset to defaults.'));
    } catch {
      setSavedBanner(t('settings.error', 'Could not reset settings.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddOrUpdateSource = (nextSource: CalendarSourceMapping) => {
    if (!settings) return;
    const existing = settings.sources ?? [];
    const updated = existing.some(
      (s) => s.id === nextSource.id || s.uid === nextSource.uid
    )
      ? existing.map((s) =>
          s.id === nextSource.id || s.uid === nextSource.uid ? nextSource : s
        )
      : [...existing, nextSource];

    setSettings({
      ...settings,
      sources: updated,
    });
  };

  const toggleSourceEnabled = (sourceId: string, enabled: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      sources: settings.sources.map((src) =>
        src.id === sourceId ? { ...src, enabled } : src
      ),
    });
  };

  const removeSource = (sourceId: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      sources: settings.sources.filter((src) => src.id !== sourceId),
    });
  };

  const handleAddOrUpdateCalendar = (nextEntry: CalendarSystemConfig) => {
    if (!settings) return;
    const existing = settings.secondaryCalendars ?? [];
    const nextList = existing.some((c) => c.id === nextEntry.id)
      ? existing.map((c) => (c.id === nextEntry.id ? nextEntry : c))
      : [...existing, nextEntry];

    setSettings({
      ...settings,
      secondaryCalendars: nextList,
    });
  };

  const toggleCalendarEnabled = (calId: string, enabled: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      secondaryCalendars: (settings.secondaryCalendars ?? []).map((cal) =>
        cal.id === calId ? { ...cal, enabled } : cal
      ),
    });
  };

  const removeCalendarSystem = (calId: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      secondaryCalendars: (settings.secondaryCalendars ?? []).filter(
        (cal) => cal.id !== calId
      ),
    });
  };

  if (!settings) {
    return (
      <Box padding={6}>
        <Typography variant="omega">
          {t('settings.loading', 'Loading Calendar settings...')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box padding={6} background="neutral100">
      <Flex direction="column" alignItems="stretch" gap={5}>
        <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
          <Box>
            <Typography variant="alpha" fontWeight="bold">
              {t('settings.title', 'Calendar & Scheduler Settings')}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="epsilon" textColor="neutral600">
                {t(
                  'settings.subtitle',
                  'Configure mapped collection types, view modes, business hours, secondary calendar systems, and iCal feeds.'
                )}
              </Typography>
            </Box>
          </Box>
          <Flex gap={2}>
            <Button variant="tertiary" onClick={handleResetSettings}>
              {t('settings.reset', 'Reset Defaults')}
            </Button>
            <Button variant="default" loading={saving} onClick={handleSave}>
              {t('common.save', 'Save Settings')}
            </Button>
          </Flex>
        </Flex>

        {savedBanner && (
          <Box padding={3} background="success100" hasRadius>
            <Typography variant="omega" fontWeight="bold" textColor="success700">
              {savedBanner}
            </Typography>
          </Box>
        )}

        <CollectionSourcesSection
          t={t}
          sources={settings.sources}
          contentTypes={contentTypes}
          onAddOrUpdateSource={handleAddOrUpdateSource}
          onToggleSourceEnabled={toggleSourceEnabled}
          onRemoveSource={removeSource}
        />

        <CalendarViewsSection
          t={t}
          settings={settings}
          onPatchSettings={(patch) => setSettings({ ...settings, ...patch })}
        />

        <SecondaryCalendarsSection
          t={t}
          secondaryCalendars={settings.secondaryCalendars ?? []}
          onAddOrUpdateCalendar={handleAddOrUpdateCalendar}
          onToggleCalendarEnabled={toggleCalendarEnabled}
          onRemoveCalendar={removeCalendarSystem}
        />
      </Flex>
    </Box>
  );
};

export default SettingsPage;
