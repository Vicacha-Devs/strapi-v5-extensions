import { Box, Button, Tabs, Typography } from "@strapi/design-system";
import { Layouts, useFetchClient, useNotification } from "@strapi/strapi/admin";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";

import {
  DEFAULT_MEDIA_FEEDS_SETTINGS,
  PLUGIN_ID,
  type LiveBroadcastChannelItem,
  type MediaFeedsSettings,
} from "../../../shared";
import { LiveStreamsSection } from "../components/LiveStreamsSection";
import { LocalizationSettingsSection } from "../components/LocalizationSettingsSection";
import { PodcastSettingsSection } from "../components/PodcastSettingsSection";

function buildLegacyPrimaryStream(
  liveStream: MediaFeedsSettings["liveStream"]
): LiveBroadcastChannelItem {
  return {
    id: "primary-live",
    enabled: liveStream.enabled !== false,
    title: liveStream.title || "Weekly Live Broadcast",
    scheduleLabel: liveStream.scheduleLabel || "Every Friday at 12:15 PM",
    eventSlug: "jumuah-khutbah",
    provider: liveStream.provider || "youtube",
    watchUrl:
      liveStream.watchUrl || "https://www.youtube.com/watch?v=M7lc1UVf-VE",
  };
}

function buildInitialStreams(
  data: MediaFeedsSettings
): LiveBroadcastChannelItem[] {
  if (Array.isArray(data.liveStreams)) {
    return data.liveStreams;
  }
  const defaultList = DEFAULT_MEDIA_FEEDS_SETTINGS.liveStreams ?? [];
  if (data.liveStream?.title || data.liveStream?.watchUrl) {
    return [buildLegacyPrimaryStream(data.liveStream), ...defaultList.slice(1)];
  }
  return defaultList;
}

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = useCallback(
    (id: string, defaultMessage: string) =>
      formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }),
    [formatMessage]
  );
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [settings, setSettings] = useState<MediaFeedsSettings>(
    DEFAULT_MEDIA_FEEDS_SETTINGS
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const isMountedRef = useRef(true);
  const loadSeqRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setLoadError(false);

    get<{ data: MediaFeedsSettings }>(`/${PLUGIN_ID}/settings`)
      .then((res) => {
        if (!isMountedRef.current || seq !== loadSeqRef.current) return;
        const incoming = res.data?.data;
        if (!incoming) {
          setLoadError(true);
          toggleNotification({
            type: "danger",
            message: t(
              "settings.ui.msg_failed_to_load_media_feeds_settings",
              "Failed to load Media Feeds settings"
            ),
          });
          return;
        }
        setSettings({
          ...incoming,
          liveStreams: buildInitialStreams(incoming),
        });
        setLoadError(false);
      })
      .catch(() => {
        if (!isMountedRef.current || seq !== loadSeqRef.current) return;
        setLoadError(true);
        toggleNotification({
          type: "danger",
          message: t(
            "settings.ui.msg_failed_to_load_media_feeds_settings",
            "Failed to load Media Feeds settings"
          ),
        });
      })
      .finally(() => {
        if (isMountedRef.current && seq === loadSeqRef.current) {
          setLoading(false);
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, [get, toggleNotification, t]);

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
            provider: primary.provider || "youtube",
            watchUrl: primary.watchUrl,
          }
        : { ...prev.liveStream, enabled: false },
    }));
  };

  const handleAddStream = () => {
    const current = settings.liveStreams ?? buildInitialStreams(settings);
    const nextItem: LiveBroadcastChannelItem = {
      id: `stream-${Date.now()}`,
      enabled: true,
      title: "",
      scheduleLabel: "",
      eventSlug: "",
      provider: "youtube",
      watchUrl: "",
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
    if (loading || loadError || saving) return;
    setSaving(true);
    try {
      const defaultLoc = settings.defaultLocale || "en";
      const supportedLocales = Array.isArray(settings.supportedLocales)
        ? settings.supportedLocales
        : [defaultLoc];

      const payload: Partial<MediaFeedsSettings> = {
        ...settings,
        supportedLocales:
          supportedLocales.length > 0 ? supportedLocales : [defaultLoc],
      };

      const res = await put<{ data: MediaFeedsSettings }>(
        `/${PLUGIN_ID}/settings`,
        payload
      );
      if (!isMountedRef.current) return;
      if (res.data?.data) {
        setSettings({
          ...res.data.data,
          liveStreams: buildInitialStreams(res.data.data),
        });
      }
      toggleNotification({
        type: "success",
        message: t(
          "settings.ui.msg_media_feeds_settings_saved_successfully",
          "Media Feeds settings saved successfully"
        ),
      });
    } catch {
      if (!isMountedRef.current) return;
      toggleNotification({
        type: "danger",
        message: t(
          "settings.ui.msg_failed_to_save_media_feeds_settings",
          "Failed to save Media Feeds settings"
        ),
      });
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const liveStreams = settings.liveStreams ?? buildInitialStreams(settings);

  return (
    <Layouts.Root>
      <Layouts.Header
        title={t(
          "settings.ui.title_media_feeds_podcast_settings",
          "Media Feeds & Podcast Settings"
        )}
        subtitle={t(
          "settings.ui.subtitle_configure_multi_language_locales_apple_spotify_r",
          "Configure multi-language locales, Apple/Spotify RSS 2.0 metadata, and Live Event Broadcast streams"
        )}
        primaryAction={
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={loading || loadError || saving}
          >
            {t("settings.ui.save_settings", "Save Settings")}
          </Button>
        }
      />
      <Layouts.Content>
        {loadError && (
          <Box marginBottom={4} padding={4} background="danger100" hasRadius>
            <Typography textColor="danger700" fontWeight="semiBold">
              {t(
                "settings.ui.msg_failed_to_load_media_feeds_settings",
                "Failed to load Media Feeds settings"
              )}
            </Typography>
          </Box>
        )}

        <Tabs.Root defaultValue="localization">
          <Tabs.List
            aria-label={t(
              "settings.ui.title_media_feeds_podcast_settings",
              "Media Feeds & Podcast Settings"
            )}
          >
            <Tabs.Trigger value="localization">
              {t("settings.tab.localization", "Multi-Language & Localization")}
            </Tabs.Trigger>
            <Tabs.Trigger value="podcast">
              {t("settings.tab.podcast", "Podcast RSS 2.0 Feed")}
            </Tabs.Trigger>
            <Tabs.Trigger value="livestream">
              {t("settings.tab.livestreams", "Live Broadcasts & Event Streams")}{" "}
              ({liveStreams.length})
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="localization">
            <LocalizationSettingsSection
              t={t}
              settings={settings}
              onChangeSettings={setSettings}
            />
          </Tabs.Content>

          <Tabs.Content value="podcast">
            <PodcastSettingsSection
              t={t}
              settings={settings}
              onChangeSettings={setSettings}
            />
          </Tabs.Content>

          <Tabs.Content value="livestream">
            <LiveStreamsSection
              t={t}
              liveStreams={liveStreams}
              onAddStream={handleAddStream}
              onPatchStream={handlePatchStream}
              onRemoveStream={handleRemoveStream}
            />
          </Tabs.Content>
        </Tabs.Root>
      </Layouts.Content>
    </Layouts.Root>
  );
};

export default SettingsPage;
