import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Field,
  Flex,
  Layouts,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import {
  PLUGIN_ID,
  type LiveBroadcastState,
  type MediaFeedItem,
  type MediaFeedsSettings,
  type MediaSeriesItem,
  type ParsedMediaProviderInfo,
} from '../../../shared';

interface OverviewPayload {
  settings: MediaFeedsSettings;
  episodes: MediaFeedItem[];
  series: MediaSeriesItem[];
  live: LiveBroadcastState;
}

export const MediaFeedsPage: React.FC = () => {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [selectedLocale, setSelectedLocale] = useState<string>('');
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [inspectUrl, setInspectUrl] = useState('');
  const [inspectedInfo, setInspectedInfo] = useState<
    (ParsedMediaProviderInfo & { title?: string | null }) | null
  >(null);
  const [syncing, setSyncing] = useState(false);

  const loadOverview = useCallback(
    async (localeParam?: string) => {
      setLoading(true);
      try {
        const query = localeParam
          ? `?locale=${encodeURIComponent(localeParam)}`
          : '';
        const res = await get<{ data: OverviewPayload }>(
          `/${PLUGIN_ID}/overview${query}`
        );
        const data = res.data?.data;
        if (data) {
          setOverview(data);
          if (!localeParam && data.settings?.defaultLocale) {
            setSelectedLocale(data.settings.defaultLocale);
          }
        }
      } catch {
        toggleNotification({
          type: 'danger',
          message: 'Failed to load Media Feeds overview',
        });
      } finally {
        setLoading(false);
      }
    },
    [get, toggleNotification]
  );

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleInspectUrl = async () => {
    if (!inspectUrl.trim()) return;
    try {
      const res = await post<{
        data: ParsedMediaProviderInfo & { title?: string | null };
      }>(`/${PLUGIN_ID}/enrich-url`, {
        url: inspectUrl.trim(),
        fetchOembed: true,
      });
      setInspectedInfo(res.data?.data ?? null);
    } catch {
      toggleNotification({
        type: 'warning',
        message: 'Could not parse or enrich the provided URL',
      });
    }
  };

  const handleSyncYouTube = async () => {
    setSyncing(true);
    try {
      const res = await post<{
        data: { syncedCount: number; skippedCount: number };
      }>(`/${PLUGIN_ID}/sync-youtube`, {});
      const { syncedCount = 0, skippedCount = 0 } = res.data?.data ?? {};
      toggleNotification({
        type: 'success',
        message: `YouTube Sync complete: ${syncedCount} imported, ${skippedCount} already up to date.`,
      });
      await loadOverview(selectedLocale);
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to sync YouTube feeds',
      });
    } finally {
      setSyncing(false);
    }
  };

  const locales = overview?.settings?.supportedLocales ?? [
    'es',
    'en',
    'ar',
    'tr',
  ];
  const episodes = overview?.episodes ?? [];
  const live = overview?.live;

  return (
    <Layouts.Root>
      <Layouts.Header
        title="Media Feeds, Podcasts & Live Broadcasts"
        subtitle="Multi-language episodes (YouTube, Spotify, Podcasts, Lectures), RSS 2.0 XML feeds, and Live status"
        primaryAction={
          <Button
            onClick={handleSyncYouTube}
            loading={syncing}
            variant="secondary"
          >
            Sync YouTube Feeds
          </Button>
        }
      />
      <Layouts.Content>
        <Flex direction="column" gap={6} alignItems="stretch">
          {/* Locale Switcher & Live Broadcast Status */}
          <Box
            background="neutral0"
            padding={5}
            shadow="filterShadow"
            hasRadius
          >
            <Flex justifyContent="space-between" alignItems="center" gap={4}>
              <Box>
                <Flex gap={2} alignItems="center">
                  <Badge
                    backgroundColor={
                      live?.status === 'live' ? 'danger600' : 'primary600'
                    }
                    textColor="neutral0"
                  >
                    {(live?.status ?? 'upcoming').toUpperCase()}
                  </Badge>
                  <Typography variant="delta" fontWeight="bold">
                    {live?.title ?? 'Live Broadcast'}
                  </Typography>
                </Flex>
                <Typography variant="pi" textColor="neutral600">
                  {live?.scheduleLabel} • Languages:{' '}
                  {(live?.spokenLanguages ?? []).join(', ').toUpperCase()}
                </Typography>
              </Box>

              <Box style={{ minWidth: '200px' }}>
                <Field.Root>
                  <Field.Label>Preview Locale</Field.Label>
                  <SingleSelect
                    value={selectedLocale}
                    onChange={(val: string) => {
                      setSelectedLocale(val);
                      void loadOverview(val);
                    }}
                  >
                    {locales.map((loc) => (
                      <SingleSelectOption key={loc} value={loc}>
                        {loc.toUpperCase()}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Field.Root>
              </Box>
            </Flex>
          </Box>

          {/* URL & oEmbed Enricher Tool */}
          <Box
            background="neutral0"
            padding={5}
            shadow="filterShadow"
            hasRadius
          >
            <Typography variant="delta" fontWeight="bold">
              YouTube / Podcast URL Inspector & oEmbed Enricher
            </Typography>
            <Flex gap={3} marginTop={3} alignItems="flex-end">
              <Box style={{ flex: 1 }}>
                <Field.Root>
                  <Field.Label>
                    Paste YouTube, Spotify, Vimeo, or Apple Podcasts URL
                  </Field.Label>
                  <TextInput
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={inspectUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setInspectUrl(e.target.value)
                    }
                  />
                </Field.Root>
              </Box>
              <Button onClick={handleInspectUrl}>Inspect URL</Button>
            </Flex>
            {inspectedInfo && (
              <Box
                marginTop={4}
                padding={3}
                background="neutral100"
                hasRadius
              >
                <Typography variant="omega" fontWeight="semiBold">
                  Provider: {inspectedInfo.provider.toUpperCase()} | ID:{' '}
                  {inspectedInfo.externalId ?? 'N/A'}
                </Typography>
                <Box marginTop={1}>
                  <Typography variant="pi" textColor="neutral600">
                    Embed URL: {inspectedInfo.embedUrl ?? 'Direct link'}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* Episodes List */}
          <Box
            background="neutral0"
            padding={5}
            shadow="filterShadow"
            hasRadius
          >
            <Flex justifyContent="space-between" alignItems="center">
              <Typography variant="delta" fontWeight="bold">
                Published Episodes ({episodes.length})
              </Typography>
              <Typography variant="pi" textColor="primary600">
                RSS Feed: /api/{PLUGIN_ID}/rss.xml?locale={selectedLocale || 'es'}
              </Typography>
            </Flex>
            <Divider marginTop={3} marginBottom={4} />

            {loading ? (
              <Typography>Loading media feeds...</Typography>
            ) : episodes.length === 0 ? (
              <Typography textColor="neutral600">
                No published media items found for this locale.
              </Typography>
            ) : (
              <Flex direction="column" gap={3} alignItems="stretch">
                {episodes.map((ep) => (
                  <Box
                    key={`${ep.documentId}-${ep.locale}`}
                    padding={4}
                    background="neutral100"
                    hasRadius
                  >
                    <Flex justifyContent="space-between" alignItems="center">
                      <Box>
                        <Flex gap={2} alignItems="center">
                          <Badge>{ep.type.toUpperCase()}</Badge>
                          <Badge>{ep.provider.toUpperCase()}</Badge>
                          <Typography fontWeight="bold">{ep.title}</Typography>
                        </Flex>
                        <Typography variant="pi" textColor="neutral600">
                          {ep.speaker ?? 'Speaker'} • {ep.duration ?? '—'} •
                          Spoken:{' '}
                          {ep.spokenLanguages
                            .map((l) => l.toUpperCase())
                            .join(', ')}
                          {ep.languageTracks.length > 0
                            ? ` • Tracks: ${ep.languageTracks
                                .map((t) => t.locale.toUpperCase())
                                .join(', ')}`
                            : ''}
                        </Typography>
                      </Box>
                      {ep.featured && <Badge>FEATURED</Badge>}
                    </Flex>
                  </Box>
                ))}
              </Flex>
            )}
          </Box>
        </Flex>
      </Layouts.Content>
    </Layouts.Root>
  );
};

export default MediaFeedsPage;
