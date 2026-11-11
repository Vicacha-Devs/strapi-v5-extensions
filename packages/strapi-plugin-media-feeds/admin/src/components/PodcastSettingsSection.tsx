import {
  Box,
  Divider,
  Field,
  Textarea,
  TextInput,
  Typography,
} from "@strapi/design-system";
import React from "react";

import type { MediaFeedsSettings } from "../../../shared";

export interface PodcastSettingsSectionProps {
  t: (id: string, defaultMessage: string) => string;
  settings: MediaFeedsSettings;
  onChangeSettings: React.Dispatch<React.SetStateAction<MediaFeedsSettings>>;
}

export const PodcastSettingsSection: React.FC<PodcastSettingsSectionProps> = ({
  t,
  settings,
  onChangeSettings,
}) => {
  const textFields = [
    [
      "title",
      t(
        "settings.ui.channel_title_published_in_get_api_media_feeds_p",
        "Channel `title` published in GET /api/media-feeds/rss.xml."
      ),
      t("field.podcast_feed_title", "Podcast Feed Title"),
      t(
        "placeholder.e_g_mezquita_central_de_bogot_jumu_ah_lectures",
        "e.g., Mezquita Central de Bogotá — Jumu'ah & Lectures"
      ),
    ],
    [
      "author",
      t(
        "settings.ui.populates_the_itunes_author_rss_tag",
        "Populates the `itunes:author` RSS tag."
      ),
      t("field.author_organization", "Author / Organization"),
      t(
        "placeholder.e_g_mezquita_central_al_qurtubi_de_bogot",
        "e.g., Central Mosque of Bogotá"
      ),
    ],
    [
      "category",
      t(
        "settings.ui.populates_the_itunes_category_rss_tag",
        "Populates the `itunes:category` RSS tag."
      ),
      t("field.primary_category", "Primary Category"),
      t(
        "placeholder.e_g_religion_spirituality",
        "e.g., Religion & Spirituality"
      ),
    ],
  ] as const;

  return (
    <Box
      background="neutral0"
      padding={6}
      shadow="filterShadow"
      hasRadius
      style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
    >
      <Typography variant="beta" tag="h2">
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
        {textFields.map(([fieldKey, hint, label, placeholder]) => (
          <Field.Root key={fieldKey} hint={hint}>
            <Field.Label>{label}</Field.Label>
            <TextInput
              placeholder={placeholder}
              value={settings.podcastFeed[fieldKey]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChangeSettings((prev) => ({
                  ...prev,
                  podcastFeed: {
                    ...prev.podcastFeed,
                    [fieldKey]: e.target.value,
                  },
                }))
              }
            />
            <Field.Hint />
          </Field.Root>
        ))}

        <Field.Root
          hint={t(
            "settings.ui.summary_shown_in_apple_podcasts_spotify_and_rss_",
            "Summary shown in Apple Podcasts, Spotify, and RSS reader directories."
          )}
        >
          <Field.Label>
            {t("field.podcast_description", "Podcast Description")}
          </Field.Label>
          <Textarea
            placeholder={t(
              "placeholder.enter_a_description_for_apple_podcasts_and_spoti",
              "Enter a description for Apple Podcasts and Spotify RSS 2.0 feeds..."
            )}
            value={settings.podcastFeed.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              onChangeSettings((prev) => ({
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
  );
};
