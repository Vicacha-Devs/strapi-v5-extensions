import {
  Box,
  Button,
  Checkbox,
  Divider,
  Field,
  MultiSelect,
  MultiSelectOption,
  SingleSelect,
  SingleSelectOption,
  Tabs,
  Textarea,
  TextInput,
  Typography,
} from "@strapi/design-system";
import { Layouts, useFetchClient, useNotification } from "@strapi/strapi/admin";
import React, { useEffect, useState } from "react";
import { useIntl } from "react-intl";

import {
  DEFAULT_MEDIA_FEEDS_SETTINGS,
  PLUGIN_ID,
  type LiveBroadcastChannelItem,
  type MediaFeedsSettings,
} from "../../../shared";
import { LiveStreamsSection } from "../components/LiveStreamsSection";

const LOCALE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "es", label: "es — Español (Spanish)" },
  { value: "en", label: "en — English" },
  { value: "ar", label: "ar — العربية (Arabic)" },
  { value: "tr", label: "tr — Türkçe (Turkish)" },
  { value: "fr", label: "fr — Français (French)" },
  { value: "de", label: "de — Deutsch (German)" },
  { value: "pt", label: "pt — Português (Portuguese)" },
  { value: "it", label: "it — Italiano (Italian)" },
  { value: "ru", label: "ru — Русский (Russian)" },
  { value: "id", label: "id — Bahasa Indonesia" },
  { value: "ur", label: "ur — اردو (Urdu)" },
  { value: "zh", label: "zh — 中文 (Chinese)" },
];

const SUB_CARD_BORDER_STYLE: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.18)",
};

const INLINE_CODE_STYLE: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "0.88em",
  padding: "2px 6px",
  borderRadius: 4,
  background: "rgba(128, 128, 128, 0.16)",
  border: "1px solid rgba(128, 128, 128, 0.25)",
};

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
    watchUrl: liveStream.watchUrl || "https://www.youtube.com/watch?v=M7lc1UVf-VE",
  };
}

function buildInitialStreams(data: MediaFeedsSettings): LiveBroadcastChannelItem[] {
  if (Array.isArray(data.liveStreams) && data.liveStreams.length > 0) {
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
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [settings, setSettings] = useState<MediaFeedsSettings>(DEFAULT_MEDIA_FEEDS_SETTINGS);
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
            provider: primary.provider || "youtube",
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
      title: "",
      scheduleLabel: "",
      eventSlug: "",
      provider: "youtube",
      watchUrl: "",
    };
    updateLiveStreams([...current, nextItem]);
  };

  const handlePatchStream = (id: string, patch: Partial<LiveBroadcastChannelItem>) => {
    const current = settings.liveStreams ?? buildInitialStreams(settings);
    updateLiveStreams(current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleRemoveStream = (id: string) => {
    const current = settings.liveStreams ?? buildInitialStreams(settings);
    updateLiveStreams(current.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supportedLocales = Array.isArray(settings.supportedLocales)
        ? settings.supportedLocales
        : ["es", "en", "ar", "tr"];

      const payload: Partial<MediaFeedsSettings> = {
        ...settings,
        supportedLocales: supportedLocales.length > 0 ? supportedLocales : ["es", "en"],
      };

      const res = await put<{ data: MediaFeedsSettings }>(`/${PLUGIN_ID}/settings`, payload);
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
      toggleNotification({
        type: "danger",
        message: t(
          "settings.ui.msg_failed_to_save_media_feeds_settings",
          "Failed to save Media Feeds settings"
        ),
      });
    } finally {
      setSaving(false);
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
          <Button onClick={handleSave} loading={saving}>
            {t("settings.ui.save_settings", "Save Settings")}
          </Button>
        }
      />
      <Layouts.Content>
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
              {t("settings.tab.livestreams", "Live Broadcasts & Event Streams")} (
              {liveStreams.length})
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
                {t(
                  "settings.ui.1_multi_language_localization_3_languages",
                  "Multi-Language & Localization (3+ Languages)"
                )}
              </Typography>
              <Divider marginTop={2} marginBottom={4} />
              <Box
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 20,
                }}
              >
                <Field.Root
                  name="defaultLocale"
                  hint={t(
                    "settings.ui.primary_language_code_e_g_es_used_when_no_locale",
                    "Primary language code (e.g., es) used when no ?locale= query is supplied."
                  )}
                >
                  <Field.Label>{t("field.default_locale", "Default Locale")}</Field.Label>
                  <SingleSelect
                    placeholder={t("placeholder.e_g_es", "Select default locale")}
                    value={settings.defaultLocale || "es"}
                    onChange={(val: string | number) =>
                      setSettings((prev) => ({
                        ...prev,
                        defaultLocale: String(val),
                      }))
                    }
                  >
                    {LOCALE_OPTIONS.map((opt) => (
                      <SingleSelectOption key={opt.value} value={opt.value}>
                        {opt.label}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                  <Field.Hint />
                </Field.Root>
                <Field.Root
                  name="supportedLocales"
                  hint={t(
                    "settings.ui.active_locales_exposed_in_localized_news_blog_an",
                    "Active locales exposed in localized News, Blog, and Podcast RSS feeds."
                  )}
                >
                  <Field.Label>{t("field.supported_locales", "Supported Locales")}</Field.Label>
                  <MultiSelect
                    name="supportedLocales"
                    withTags
                    placeholder={t(
                      "placeholder.select_supported_locales",
                      "Select supported locales..."
                    )}
                    value={settings.supportedLocales || ["es", "en", "ar", "tr"]}
                    onChange={(nextValues: string[]) =>
                      setSettings((prev) => ({
                        ...prev,
                        supportedLocales: nextValues.length > 0 ? nextValues : ["es"],
                      }))
                    }
                    onClear={() =>
                      setSettings((prev) => ({
                        ...prev,
                        supportedLocales: ["es"],
                      }))
                    }
                  >
                    {LOCALE_OPTIONS.map((opt) => (
                      <MultiSelectOption key={opt.value} value={opt.value}>
                        {opt.label}
                      </MultiSelectOption>
                    ))}
                  </MultiSelect>
                  <Field.Hint />
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
                  {t(
                    "settings.ui.automatically_fall_back_to_default_locale_when_a",
                    "Automatically fall back to Default Locale when a translation is not yet published"
                  )}{" "}
                  (<code style={INLINE_CODE_STYLE}>{settings.defaultLocale || "es"}</code>)
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
                {t(
                  "settings.ui.2_apple_podcasts_spotify_rss_2_0_feed",
                  "Apple Podcasts & Spotify RSS 2.0 Feed"
                )}
              </Typography>
              <Divider marginTop={2} marginBottom={4} />
              <Box
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 20,
                }}
              >
                <Field.Root
                  hint={t(
                    "settings.ui.channel_title_published_in_get_api_media_feeds_p",
                    "Channel <title> published in GET /api/media-feeds/podcasts/rss.xml."
                  )}
                >
                  <Field.Label>{t("field.podcast_feed_title", "Podcast Feed Title")}</Field.Label>
                  <TextInput
                    placeholder={t(
                      "placeholder.e_g_mezquita_central_de_bogot_jumu_ah_lectures",
                      "e.g., Mezquita Central de Bogotá — Jumu'ah & Lectures"
                    )}
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
                  <Field.Hint />
                </Field.Root>
                <Field.Root
                  hint={t(
                    "settings.ui.populates_the_itunes_author_rss_tag",
                    "Populates the <itunes:author> RSS tag."
                  )}
                >
                  <Field.Label>
                    {t("field.author_organization", "Author / Organization")}
                  </Field.Label>
                  <TextInput
                    placeholder={t(
                      "placeholder.e_g_mezquita_central_al_qurtubi_de_bogot",
                      "e.g., Central Mosque of Bogotá"
                    )}
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
                  <Field.Hint />
                </Field.Root>
                <Field.Root
                  hint={t(
                    "settings.ui.populates_the_itunes_category_rss_tag",
                    "Populates the <itunes:category> RSS tag."
                  )}
                >
                  <Field.Label>{t("field.primary_category", "Primary Category")}</Field.Label>
                  <TextInput
                    placeholder={t(
                      "placeholder.e_g_religion_spirituality",
                      "e.g., Religion & Spirituality"
                    )}
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
                  <Field.Hint />
                </Field.Root>
                <Field.Root
                  hint={t(
                    "settings.ui.summary_shown_in_apple_podcasts_spotify_and_rss_",
                    "Summary shown in Apple Podcasts, Spotify, and RSS reader directories."
                  )}
                >
                  <Field.Label>{t("field.podcast_description", "Podcast Description")}</Field.Label>
                  <Textarea
                    placeholder={t(
                      "placeholder.enter_a_description_for_apple_podcasts_and_spoti",
                      "Enter a description for Apple Podcasts and Spotify RSS 2.0 feeds..."
                    )}
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
                  <Field.Hint />
                </Field.Root>
              </Box>
            </Box>
          </Tabs.Content>

          {/* Tab 3: Multiple Live Broadcasts & Event Streams */}
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
