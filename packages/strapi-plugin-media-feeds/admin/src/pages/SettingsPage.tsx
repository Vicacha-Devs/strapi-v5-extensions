import { useIntl } from 'react-intl';
import React, { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Field,
  Flex,
  Tabs,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { Layouts, useFetchClient, useNotification } from '@strapi/strapi/admin';
import {
  DEFAULT_MEDIA_FEEDS_SETTINGS,
  PLUGIN_ID,
  type LiveBroadcastChannelItem,
  type MediaFeedsSettings,
} from '../../../shared';

const SUB_CARD_BORDER_STYLE: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.18)',
};

const INLINE_CODE_STYLE: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '0.88em',
  padding: '2px 6px',
  borderRadius: 4,
  background: 'rgba(128, 128, 128, 0.16)',
  border: '1px solid rgba(128, 128, 128, 0.25)',
};

function buildInitialStreams(data: MediaFeedsSettings): LiveBroadcastChannelItem[] {
  if (Array.isArray(data.liveStreams) && data.liveStreams.length > 0) {
    return data.liveStreams;
  }
  if (data.liveStream?.title || data.liveStream?.watchUrl) {
    return [
      {
        id: 'primary-live',
        enabled: data.liveStream.enabled !== false,
        title: data.liveStream.title || 'Weekly Live Broadcast',
        scheduleLabel: data.liveStream.scheduleLabel || 'Every Friday at 12:15 PM',
        eventSlug: 'jumuah-khutbah',
        provider: data.liveStream.provider || 'youtube',
        watchUrl: data.liveStream.watchUrl || 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
      },
      ...(DEFAULT_MEDIA_FEEDS_SETTINGS.liveStreams ?? []).slice(1),
    ];
  }
  return DEFAULT_MEDIA_FEEDS_SETTINGS.liveStreams ?? [];
}

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
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
        const incoming = res.data.data;
        setSettings({
          ...incoming,
          liveStreams: buildInitialStreams(incoming),
        });
        setLocalesCsv((incoming.supportedLocales ?? []).join(', '));
      })
      .catch(() => {
        // Keep defaults
      });
    return () => {
      active = false;
    };
  }, [get]);

  const updateLiveStreams = (nextStreams: LiveBroadcastChannelItem[]) => {
    const primary = nextStreams.find((s) => s.enabled) ?? nextStreams[0];
    setSettings((prev) => ({
      ...prev,
      liveStreams: nextStreams,
      liveStream: primary
        ? {
            ...prev.liveStream,
            enabled: primary.enabled,
            title: primary.title,
            scheduleLabel: primary.scheduleLabel,
            provider: primary.provider || 'youtube',
            watchUrl: primary.watchUrl,
          }
        : prev.liveStream,
    }));
  };

  const handleAddStream = () => {
    const current = settings.liveStreams ?? buildInitialStreams(settings);
    const nextItem: LiveBroadcastChannelItem = {
      id: `stream-${Date.now()}`,
      enabled: true,
      title: '',
      scheduleLabel: '',
      eventSlug: '',
      provider: 'youtube',
      watchUrl: '',
    };
    updateLiveStreams([...current, nextItem]);
  };

  const handlePatchStream = (
    id: string,
    patch: Partial<LiveBroadcastChannelItem>
  ) => {
    const current = settings.liveStreams ?? buildInitialStreams(settings);
    updateLiveStreams(
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleRemoveStream = (id: string) => {
    const current = settings.liveStreams ?? buildInitialStreams(settings);
    updateLiveStreams(current.filter((item) => item.id !== id));
  };

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
        setSettings({
          ...res.data.data,
          liveStreams: buildInitialStreams(res.data.data),
        });
      }
      toggleNotification({
        type: 'success',
        message: t('settings.ui.msg_media_feeds_settings_saved_successfully', 'Media Feeds settings saved successfully'),
      });
    } catch {
      toggleNotification({
        type: 'danger',
        message: t('settings.ui.msg_failed_to_save_media_feeds_settings', 'Failed to save Media Feeds settings'),
      });
    } finally {
      setSaving(false);
    }
  };

  const liveStreams = settings.liveStreams ?? buildInitialStreams(settings);

  return (
    <Layouts.Root>
      <Layouts.Header
        title={t('settings.ui.title_media_feeds_podcast_settings', 'Media Feeds & Podcast Settings')}
        subtitle={t('settings.ui.subtitle_configure_multi_language_locales_apple_spotify_r', 'Configure multi-language locales, Apple/Spotify RSS 2.0 metadata, and Live Event Broadcast streams')}
        primaryAction={
          <Button onClick={handleSave} loading={saving}>{t('settings.ui.save_settings', 'Save Settings')}</Button>
        }
      />
      <Layouts.Content>
        <Tabs.Root defaultValue="localization">
          <Tabs.List aria-label={t('settings.ui.title_media_feeds_podcast_settings', 'Media Feeds & Podcast Settings')}>
            <Tabs.Trigger value="localization">
              {t('settings.ui.1_multi_language_localization_3_languages', 'Multi-Language & Localization')}
            </Tabs.Trigger>
            <Tabs.Trigger value="podcast">
              {t('settings.ui.2_apple_podcasts_spotify_rss_2_0_feed', 'Apple Podcasts & Spotify RSS 2.0 Feed')}
            </Tabs.Trigger>
            <Tabs.Trigger value="livestream">
              {t('settings.tab.livestreams', 'Live Broadcasts & Event Streams')} ({liveStreams.length})
            </Tabs.Trigger>
          </Tabs.List>

          {/* Tab 1: Multi-Language Configuration */}
          <Tabs.Content value="localization">
            <Box
              background="neutral0"
              padding={6}
              shadow="filterShadow"
              hasRadius
              style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
            >
              <Typography variant="beta" as="h2">
                {t('settings.ui.1_multi_language_localization_3_languages', 'Multi-Language & Localization (3+ Languages)')}
              </Typography>
              <Divider marginTop={2} marginBottom={4} />
              <Box
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 20,
                }}
              >
                <Field.Root>
                  <Field.Label>{t('field.default_locale', 'Default Locale')}</Field.Label>
                  <TextInput
                    placeholder={t('placeholder.e_g_es', 'e.g., es')}
                    value={settings.defaultLocale}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSettings((prev) => ({
                        ...prev,
                        defaultLocale: e.target.value,
                      }))
                    }
                  />
                  <Field.Hint>
                    Primary language code (e.g.,{' '}
                    <code style={INLINE_CODE_STYLE}>es</code>) used when no{' '}
                    <code style={INLINE_CODE_STYLE}>?locale=</code> query is
                    supplied.
                  </Field.Hint>
                </Field.Root>
                <Field.Root>
                  <Field.Label>{t('field.supported_locales_comma_separated_iso_codes', 'Supported Locales (comma-separated ISO codes)')}</Field.Label>
                  <TextInput
                    placeholder={t('placeholder.e_g_es_en_ar_tr_fr', 'e.g., es, en, ar, tr, fr')}
                    value={localesCsv}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLocalesCsv(e.target.value)
                    }
                  />
                  <Field.Hint>{t('settings.ui.active_locales_exposed_in_localized_news_blog_an', 'Active locales exposed in localized News, Blog, and Podcast RSS feeds.')}</Field.Hint>
                </Field.Root>
              </Box>
              <Box
                marginTop={4}
                padding={4}
                background="neutral100"
                hasRadius
                style={SUB_CARD_BORDER_STYLE}
              >
                <Checkbox
                  checked={settings.fallbackToDefaultLocale}
                  onCheckedChange={(checked: boolean) =>
                    setSettings((prev) => ({
                      ...prev,
                      fallbackToDefaultLocale: Boolean(checked),
                    }))
                  }
                >
                  Automatically fall back to Default Locale (
                  <code style={INLINE_CODE_STYLE}>{settings.defaultLocale || 'es'}</code>
                  ) when a translation is not yet published
                </Checkbox>
              </Box>
            </Box>
          </Tabs.Content>

          {/* Tab 2: Podcast RSS 2.0 Metadata */}
          <Tabs.Content value="podcast">
            <Box
              background="neutral0"
              padding={6}
              shadow="filterShadow"
              hasRadius
              style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
            >
              <Typography variant="beta" as="h2">
                {t('settings.ui.2_apple_podcasts_spotify_rss_2_0_feed', 'Apple Podcasts & Spotify RSS 2.0 Feed')}
              </Typography>
              <Divider marginTop={2} marginBottom={4} />
              <Box
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 20,
                }}
              >
                <Field.Root>
                  <Field.Label>{t('field.podcast_feed_title', 'Podcast Feed Title')}</Field.Label>
                  <TextInput
                    placeholder={t('placeholder.e_g_mezquita_central_de_bogot_jumu_ah_lectures', 'e.g., Mezquita Central de Bogotá — Jumu\'ah & Lectures')}
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
                  <Field.Hint>
                    Channel <code style={INLINE_CODE_STYLE}>&lt;title&gt;</code>{' '}
                    published in <code style={INLINE_CODE_STYLE}>GET /api/media-feeds/podcasts/rss.xml</code>.
                  </Field.Hint>
                </Field.Root>
                <Field.Root>
                  <Field.Label>{t('field.author_organization', 'Author / Organization')}</Field.Label>
                  <TextInput
                    placeholder={t('placeholder.e_g_mezquita_central_al_qurtubi_de_bogot', 'e.g., Central Mosque of Bogotá')}
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
                  <Field.Hint>
                    Populates the <code style={INLINE_CODE_STYLE}>&lt;itunes:author&gt;</code> RSS tag.
                  </Field.Hint>
                </Field.Root>
                <Field.Root>
                  <Field.Label>{t('field.primary_category', 'Primary Category')}</Field.Label>
                  <TextInput
                    placeholder={t('placeholder.e_g_religion_spirituality', 'e.g., Religion & Spirituality')}
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
                  <Field.Hint>
                    Populates the <code style={INLINE_CODE_STYLE}>&lt;itunes:category&gt;</code> RSS tag.
                  </Field.Hint>
                </Field.Root>
                <Field.Root>
                  <Field.Label>{t('field.podcast_description', 'Podcast Description')}</Field.Label>
                  <Textarea
                    placeholder={t('placeholder.enter_a_description_for_apple_podcasts_and_spoti', 'Enter a description for Apple Podcasts and Spotify RSS 2.0 feeds...')}
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
                  <Field.Hint>{t('settings.ui.summary_shown_in_apple_podcasts_spotify_and_rss_', 'Summary shown in Apple Podcasts, Spotify, and RSS reader directories.')}</Field.Hint>
                </Field.Root>
              </Box>
            </Box>
          </Tabs.Content>

          {/* Tab 3: Multiple Live Broadcasts & Event Streams */}
          <Tabs.Content value="livestream">
            <Box
              background="neutral0"
              padding={6}
              shadow="filterShadow"
              hasRadius
              style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
            >
              <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
                <Box>
                  <Typography variant="beta" as="h2">
                    {t('settings.tab.livestreams_heading', 'Live Broadcasts & Event Streams')}
                  </Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {t(
                      'settings.tab.livestreams_subtitle',
                      'Configure multiple recurring or event-specific live broadcast links (Jumu\'ah Khutbah, Ramadan Tarawih, Conferences, Seminars, and Special Events).'
                    )}
                  </Typography>
                </Box>
                <Button variant="secondary" size="S" onClick={handleAddStream}>
                  + {t('settings.livestreams.add', 'Add Event Broadcast Stream')}
                </Button>
              </Flex>

              <Divider marginTop={3} marginBottom={4} />

              <Flex direction="column" alignItems="stretch" gap={4}>
                {liveStreams.map((stream, idx) => (
                  <Box
                    key={stream.id}
                    padding={4}
                    background="neutral100"
                    hasRadius
                    style={SUB_CARD_BORDER_STYLE}
                  >
                    <Flex
                      justifyContent="space-between"
                      alignItems="center"
                      paddingBottom={3}
                      wrap="wrap"
                      gap={2}
                    >
                      <Flex gap={2} alignItems="center">
                        <Checkbox
                          checked={stream.enabled}
                          onCheckedChange={(checked: boolean) =>
                            handlePatchStream(stream.id, { enabled: Boolean(checked) })
                          }
                        >
                          <Typography fontWeight="bold">
                            {stream.title || `Event Broadcast #${idx + 1}`}
                          </Typography>
                        </Checkbox>
                        <Badge>
                          {stream.enabled
                            ? idx === 0
                              ? t('settings.livestreams.primary_active', 'Primary Banner')
                              : t('common.enabled', 'Enabled')
                            : t('common.disabled', 'Disabled')}
                        </Badge>
                      </Flex>
                      {liveStreams.length > 1 && (
                        <Button
                          variant="danger-light"
                          size="S"
                          onClick={() => handleRemoveStream(stream.id)}
                        >
                          {t('common.remove', 'Remove')}
                        </Button>
                      )}
                    </Flex>

                    <Box
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 16,
                      }}
                    >
                      <Field.Root>
                        <Field.Label>
                          {t('field.live_broadcast_title', 'Live Broadcast / Event Title')}
                        </Field.Label>
                        <TextInput
                          placeholder={t(
                            'placeholder.e_g_jumu_ah_khutbah_live_broadcast',
                            'e.g., Jumu\'ah Khutbah — Live Broadcast'
                          )}
                          value={stream.title}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handlePatchStream(stream.id, { title: e.target.value })
                          }
                        />
                        <Field.Hint>
                          {t(
                            'settings.ui.headline_shown_in_the_public_live_stream_banner_',
                            'Headline shown in the public live-stream banner or event player.'
                          )}
                        </Field.Hint>
                      </Field.Root>

                      <Field.Root>
                        <Field.Label>
                          {t('field.youtube_live_stream_watch_url', 'YouTube / Live Stream Watch URL')}
                        </Field.Label>
                        <TextInput
                          placeholder={t(
                            'placeholder.e_g_https_www_youtube_com_watch_v',
                            'e.g., https://www.youtube.com/watch?v=...'
                          )}
                          value={stream.watchUrl}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handlePatchStream(stream.id, { watchUrl: e.target.value })
                          }
                        />
                        <Field.Hint>
                          {t(
                            'settings.ui.direct_stream_url_opened_when_visitors_click_the',
                            'Direct stream URL opened when visitors watch this broadcast.'
                          )}
                        </Field.Hint>
                      </Field.Root>

                      <Field.Root>
                        <Field.Label>
                          {t('field.live_schedule_label', 'Schedule / Broadcast Window Label')}
                        </Field.Label>
                        <TextInput
                          placeholder="e.g., Every Friday at 12:15 PM or Ramadan Nights at 7:30 PM"
                          value={stream.scheduleLabel || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handlePatchStream(stream.id, { scheduleLabel: e.target.value })
                          }
                        />
                        <Field.Hint>
                          Human-readable schedule badge displayed alongside the stream title.
                        </Field.Hint>
                      </Field.Root>

                      <Field.Root>
                        <Field.Label>
                          {t('field.live_event_slug', 'Linked Event Slug (Optional)')}
                        </Field.Label>
                        <TextInput
                          placeholder="e.g., jumuah-khutbah, ramadan-tarawih, annual-conference"
                          value={stream.eventSlug || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handlePatchStream(stream.id, { eventSlug: e.target.value })
                          }
                        />
                        <Field.Hint>
                          Associates this live broadcast stream with a specific Event slug in{' '}
                          <code style={INLINE_CODE_STYLE}>@vicacha-devs/strapi-plugin-events</code>.
                        </Field.Hint>
                      </Field.Root>
                    </Box>
                  </Box>
                ))}
              </Flex>
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Layouts.Content>
    </Layouts.Root>
  );
};

export default SettingsPage;
