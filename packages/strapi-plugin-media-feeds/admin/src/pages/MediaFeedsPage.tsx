import { useIntl } from 'react-intl';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { Layouts, useFetchClient, useNotification } from '@strapi/strapi/admin';
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

type TranslateFn = (id: string, defaultMessage: string) => string;

interface LiveStatusBannerProps {
  t: TranslateFn;
  live?: LiveBroadcastState;
  locales: string[];
  selectedLocale: string;
  onSelectLocale: (val: string) => void;
}

const LiveStatusBanner: React.FC<LiveStatusBannerProps> = ({
  t,
  live,
  locales,
  selectedLocale,
  onSelectLocale,
}) => {
  const statusColor = live?.status === 'live' ? 'danger600' : 'primary600';
  const statusText = (live?.status ?? 'upcoming').toUpperCase();
  const titleText = live?.title ?? t('page.ui.live_broadcast_default', 'Live Broadcast');
  const languagesText = (live?.spokenLanguages ?? []).join(', ').toUpperCase();

  return (
    <Box background="neutral0" padding={5} shadow="filterShadow" hasRadius>
      <Flex justifyContent="space-between" alignItems="center" gap={4}>
        <Box>
          <Flex gap={2} alignItems="center">
            <Badge backgroundColor={statusColor} textColor="neutral0">
              {statusText}
            </Badge>
            <Typography variant="delta" fontWeight="bold">
              {titleText}
            </Typography>
          </Flex>
          <Typography variant="pi" textColor="neutral600">
            {live?.scheduleLabel} • {t('page.ui.languages_label', 'Languages:')}{' '}
            {languagesText}
          </Typography>
        </Box>

        <Box style={{ minWidth: '200px' }}>
          <Field.Root>
            <Field.Label>{t('field.preview_locale', 'Preview Locale')}</Field.Label>
            <SingleSelect
              placeholder={t('placeholder.select_preview_locale', 'Select preview locale')}
              value={selectedLocale}
              onChange={onSelectLocale}
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
  );
};

interface UrlInspectorBoxProps {
  t: TranslateFn;
  inspectUrl: string;
  onChangeUrl: (val: string) => void;
  onInspect: () => void;
  inspectedInfo: (ParsedMediaProviderInfo & { title?: string | null }) | null;
}

const UrlInspectorBox: React.FC<UrlInspectorBoxProps> = ({
  t,
  inspectUrl,
  onChangeUrl,
  onInspect,
  inspectedInfo,
}) => (
  <Box background="neutral0" padding={5} shadow="filterShadow" hasRadius>
    <Typography variant="delta" fontWeight="bold">
      {t(
        'page.ui.youtube_podcast_url_inspector_oembed_enricher',
        'YouTube / Podcast URL Inspector & oEmbed Enricher'
      )}
    </Typography>
    <Flex gap={3} marginTop={3} alignItems="flex-end">
      <Box style={{ flex: 1 }}>
        <Field.Root>
          <Field.Label>
            {t(
              'field.paste_youtube_spotify_vimeo_or_apple_podcasts_ur',
              'Paste YouTube, Spotify, Vimeo, or Apple Podcasts URL'
            )}
          </Field.Label>
          <TextInput
            placeholder={t(
              'placeholder.https_www_youtube_com_watch_v',
              'https://www.youtube.com/watch?v=...'
            )}
            value={inspectUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChangeUrl(e.target.value)
            }
          />
        </Field.Root>
      </Box>
      <Button onClick={onInspect}>{t('page.ui.inspect_url', 'Inspect URL')}</Button>
    </Flex>
    {inspectedInfo && (
      <Box marginTop={4} padding={3} background="neutral100" hasRadius>
        <Typography variant="omega" fontWeight="semiBold">
          {t('page.ui.provider_label', 'Provider:')} {inspectedInfo.provider.toUpperCase()} |{' '}
          {t('page.ui.id_label', 'ID:')} {inspectedInfo.externalId ?? 'N/A'}
        </Typography>
        <Box marginTop={1}>
          <Typography variant="pi" textColor="neutral600">
            {t('page.ui.embed_url_label', 'Embed URL:')}{' '}
            {inspectedInfo.embedUrl ?? t('page.ui.direct_link', 'Direct link')}
          </Typography>
        </Box>
      </Box>
    )}
  </Box>
);

interface EpisodesListSectionProps {
  t: TranslateFn;
  loading: boolean;
  episodes: MediaFeedItem[];
  selectedLocale: string;
}

const EpisodeCardItem: React.FC<{ t: TranslateFn; ep: MediaFeedItem }> = ({ t, ep }) => {
  const speakerLabel = ep.speaker ?? t('page.ui.speaker_default', 'Speaker');
  const durationLabel = ep.duration ?? '—';
  const spokenList = ep.spokenLanguages.map((l) => l.toUpperCase()).join(', ');
  const tracksList = ep.languageTracks.map((tr) => tr.locale.toUpperCase()).join(', ');

  return (
    <Box
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
            {speakerLabel} • {durationLabel} • {t('page.ui.spoken_label', 'Spoken:')}{' '}
            {spokenList}
            {tracksList ? ` • ${t('page.ui.tracks_label', 'Tracks:')} ${tracksList}` : ''}
          </Typography>
        </Box>
        {ep.featured && <Badge>{t('page.ui.featured', 'FEATURED')}</Badge>}
      </Flex>
    </Box>
  );
};

const EpisodesListSection: React.FC<EpisodesListSectionProps> = ({
  t,
  loading,
  episodes,
  selectedLocale,
}) => {
  const rssLocale = selectedLocale || 'es';
  const rssPath = `/api/${PLUGIN_ID}/rss.xml?locale=${rssLocale}`;

  return (
    <Box background="neutral0" padding={5} shadow="filterShadow" hasRadius>
      <Flex justifyContent="space-between" alignItems="center">
        <Typography variant="delta" fontWeight="bold">
          {t('page.ui.published_episodes', 'Published Episodes')} ({episodes.length})
        </Typography>
        <Typography variant="pi" textColor="primary600">
          {t('page.ui.rss_feed_label', 'RSS Feed:')} {rssPath}
        </Typography>
      </Flex>
      <Divider marginTop={3} marginBottom={4} />

      {loading && (
        <Typography>{t('page.ui.loading_media_feeds', 'Loading media feeds...')}</Typography>
      )}
      {!loading && episodes.length === 0 && (
        <Typography textColor="neutral600">
          {t(
            'page.ui.no_published_media_items_found_for_this_locale',
            'No published media items found for this locale.'
          )}
        </Typography>
      )}
      {!loading && episodes.length > 0 && (
        <Flex direction="column" gap={3} alignItems="stretch">
          {episodes.map((ep) => (
            <EpisodeCardItem
              key={`${ep.documentId}-${ep.locale}`}
              t={t}
              ep={ep}
            />
          ))}
        </Flex>
      )}
    </Box>
  );
};

export const MediaFeedsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t: TranslateFn = useCallback(
    (id: string, defaultMessage: string) =>
      formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }),
    [formatMessage]
  );
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
        const query = localeParam ? `?locale=${encodeURIComponent(localeParam)}` : '';
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
          message: t(
            'page.ui.msg_failed_to_load_media_feeds_overview',
            'Failed to load Media Feeds overview'
          ),
        });
      } finally {
        setLoading(false);
      }
    },
    [get, toggleNotification, t]
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
        message: t(
          'page.ui.msg_could_not_parse_or_enrich_the_provided_url',
          'Could not parse or enrich the provided URL'
        ),
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
        message: `${t('page.ui.youtube_sync_complete', 'YouTube Sync complete')}: ${syncedCount} / ${skippedCount}`,
      });
      await loadOverview(selectedLocale);
    } catch {
      toggleNotification({
        type: 'danger',
        message: t(
          'page.ui.msg_failed_to_sync_youtube_feeds',
          'Failed to sync YouTube feeds'
        ),
      });
    } finally {
      setSyncing(false);
    }
  };

  const locales = overview?.settings?.supportedLocales ?? ['es', 'en', 'ar', 'tr'];
  const episodes = overview?.episodes ?? [];

  return (
    <Layouts.Root>
      <Layouts.Header
        title={t(
          'page.ui.title_media_feeds_podcasts_live_broadcasts',
          'Media Feeds, Podcasts & Live Broadcasts'
        )}
        subtitle={t(
          'page.ui.subtitle_multi_language_episodes_youtube_spotify_podcasts',
          'Multi-language episodes (YouTube, Spotify, Podcasts, Lectures), RSS 2.0 XML feeds, and Live status'
        )}
        primaryAction={
          <Button onClick={handleSyncYouTube} loading={syncing} variant="secondary">
            {t('page.ui.sync_youtube_feeds', 'Sync YouTube Feeds')}
          </Button>
        }
      />
      <Layouts.Content>
        <Flex direction="column" gap={6} alignItems="stretch">
          <LiveStatusBanner
            t={t}
            live={overview?.live}
            locales={locales}
            selectedLocale={selectedLocale}
            onSelectLocale={(val: string) => {
              setSelectedLocale(val);
              void loadOverview(val);
            }}
          />
          <UrlInspectorBox
            t={t}
            inspectUrl={inspectUrl}
            onChangeUrl={setInspectUrl}
            onInspect={handleInspectUrl}
            inspectedInfo={inspectedInfo}
          />
          <EpisodesListSection
            t={t}
            loading={loading}
            episodes={episodes}
            selectedLocale={selectedLocale}
          />
        </Flex>
      </Layouts.Content>
    </Layouts.Root>
  );
};

export default MediaFeedsPage;
