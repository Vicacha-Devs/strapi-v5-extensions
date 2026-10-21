import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Field,
  Flex,
  Layouts,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import {
  DEFAULT_MEDIA_FEEDS_SETTINGS,
  PLUGIN_ID,
  type MediaFeedsSettings,
} from '../../../shared';

export const SettingsPage: React.FC = () => {
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [settings, setSettings] = useState<MediaFeedsSettings>(
    DEFAULT_MEDIA_FEEDS_SETTINGS
  );
  const [localesCsv, setLocalesCsv] = useState(
    DEFAULT_MEDIA_FEEDS_SETTINGS.supportedLocales.join(', ')
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    get<{ data: MediaFeedsSettings }>(`/${PLUGIN_ID}/settings`)
      .then((res) => {
        if (!active || !res.data?.data) return;
        setSettings(res.data.data);
        setLocalesCsv((res.data.data.supportedLocales ?? []).join(', '));
      })
      .catch(() => {
        // Keep defaults
      });
    return () => {
      active = false;
    };
  }, [get]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const supportedLocales = localesCsv
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const payload: Partial<MediaFeedsSettings> = {
        ...settings,
        supportedLocales:
          supportedLocales.length > 0 ? supportedLocales : ['es', 'en'],
      };

      const res = await put<{ data: MediaFeedsSettings }>(
        `/${PLUGIN_ID}/settings`,
        payload
      );
      if (res.data?.data) {
        setSettings(res.data.data);
      }
      toggleNotification({
        type: 'success',
        message: 'Media Feeds settings saved successfully',
      });
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to save Media Feeds settings',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layouts.Root>
      <Layouts.Header
        title="Media Feeds & Podcast Settings"
        subtitle="Configure multi-language locales, Apple/Spotify RSS 2.0 metadata, and Live Broadcast defaults"
        primaryAction={
          <Button onClick={handleSave} loading={saving}>
            Save Settings
          </Button>
        }
      />
      <Layouts.Content>
        <Flex direction="column" gap={6} alignItems="stretch">
          {/* Multi-Language Configuration */}
          <Box
            background="neutral0"
            padding={5}
            shadow="filterShadow"
            hasRadius
          >
            <Typography variant="delta" fontWeight="bold">
              Multi-Language & Localization (3+ Languages)
            </Typography>
            <Divider marginTop={2} marginBottom={4} />
            <Flex gap={4} wrap="wrap">
              <Box style={{ flex: 1, minWidth: '220px' }}>
                <Field.Root>
                  <Field.Label>Default Locale</Field.Label>
                  <TextInput
                    value={settings.defaultLocale}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSettings((prev) => ({
                        ...prev,
                        defaultLocale: e.target.value,
                      }))
                    }
                  />
                </Field.Root>
              </Box>
              <Box style={{ flex: 2, minWidth: '300px' }}>
                <Field.Root>
                  <Field.Label>
                    Supported Locales (comma-separated ISO codes)
                  </Field.Label>
                  <TextInput
                    placeholder="es, en, ar, tr, fr"
                    value={localesCsv}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLocalesCsv(e.target.value)
                    }
                  />
                </Field.Root>
              </Box>
            </Flex>
            <Box marginTop={3}>
              <Checkbox
                checked={settings.fallbackToDefaultLocale}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings((prev) => ({
                    ...prev,
                    fallbackToDefaultLocale: Boolean(e.target.checked),
                  }))
                }
              >
                Automatically fall back to Default Locale when a translation is
                not yet published
              </Checkbox>
            </Box>
          </Box>

          {/* Podcast RSS 2.0 Metadata */}
          <Box
            background="neutral0"
            padding={5}
            shadow="filterShadow"
            hasRadius
          >
            <Typography variant="delta" fontWeight="bold">
              Apple Podcasts & Spotify RSS 2.0 Feed
            </Typography>
            <Divider marginTop={2} marginBottom={4} />
            <Flex direction="column" gap={4} alignItems="stretch">
              <Field.Root>
                <Field.Label>Podcast Feed Title</Field.Label>
                <TextInput
                  value={settings.podcastFeed.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSettings((prev) => ({
                      ...prev,
                      podcastFeed: {
                        ...prev.podcastFeed,
                        title: e.target.value,
                      },
                    }))
                  }
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Podcast Description</Field.Label>
                <Textarea
                  value={settings.podcastFeed.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setSettings((prev) => ({
                      ...prev,
                      podcastFeed: {
                        ...prev.podcastFeed,
                        description: e.target.value,
                      },
                    }))
                  }
                />
              </Field.Root>
              <Flex gap={4}>
                <Box style={{ flex: 1 }}>
                  <Field.Root>
                    <Field.Label>Author / Organization</Field.Label>
                    <TextInput
                      value={settings.podcastFeed.author}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettings((prev) => ({
                          ...prev,
                          podcastFeed: {
                            ...prev.podcastFeed,
                            author: e.target.value,
                          },
                        }))
                      }
                    />
                  </Field.Root>
                </Box>
                <Box style={{ flex: 1 }}>
                  <Field.Root>
                    <Field.Label>Primary Category</Field.Label>
                    <TextInput
                      value={settings.podcastFeed.category}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettings((prev) => ({
                          ...prev,
                          podcastFeed: {
                            ...prev.podcastFeed,
                            category: e.target.value,
                          },
                        }))
                      }
                    />
                  </Field.Root>
                </Box>
              </Flex>
            </Flex>
          </Box>

          {/* Live Stream Configuration */}
          <Box
            background="neutral0"
            padding={5}
            shadow="filterShadow"
            hasRadius
          >
            <Typography variant="delta" fontWeight="bold">
              Live Broadcast Banner Configuration
            </Typography>
            <Divider marginTop={2} marginBottom={4} />
            <Flex direction="column" gap={4} alignItems="stretch">
              <Field.Root>
                <Field.Label>Live Broadcast Title</Field.Label>
                <TextInput
                  value={settings.liveStream.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSettings((prev) => ({
                      ...prev,
                      liveStream: {
                        ...prev.liveStream,
                        title: e.target.value,
                      },
                    }))
                  }
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>YouTube / Live Stream Watch URL</Field.Label>
                <TextInput
                  value={settings.liveStream.watchUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSettings((prev) => ({
                      ...prev,
                      liveStream: {
                        ...prev.liveStream,
                        watchUrl: e.target.value,
                      },
                    }))
                  }
                />
              </Field.Root>
            </Flex>
          </Box>
        </Flex>
      </Layouts.Content>
    </Layouts.Root>
  );
};

export default SettingsPage;
