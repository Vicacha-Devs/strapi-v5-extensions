import React from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Field,
  Flex,
  TextInput,
  Typography,
} from '@strapi/design-system';
import type { LiveBroadcastChannelItem } from '../../../shared';

const SUB_CARD_BORDER_STYLE: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.18)',
};

export interface LiveStreamsSectionProps {
  t: (id: string, defaultMessage: string) => string;
  liveStreams: LiveBroadcastChannelItem[];
  onAddStream: () => void;
  onPatchStream: (id: string, patch: Partial<LiveBroadcastChannelItem>) => void;
  onRemoveStream: (id: string) => void;
}

export const LiveStreamsSection: React.FC<LiveStreamsSectionProps> = ({
  t,
  liveStreams,
  onAddStream,
  onPatchStream,
  onRemoveStream,
}) => {
  return (
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
              "Configure multiple recurring or event-specific live broadcast links (Jumu'ah Khutbah, Ramadan Tarawih, Conferences, Seminars, and Special Events)."
            )}
          </Typography>
        </Box>
        <Button variant="secondary" size="S" onClick={onAddStream}>
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
                    onPatchStream(stream.id, { enabled: Boolean(checked) })
                  }
                >
                  <Typography fontWeight="bold">
                    {stream.title ||
                      `${t('settings.livestreams.default_label', 'Event Broadcast')} #${idx + 1}`}
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
                  onClick={() => onRemoveStream(stream.id)}
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
                    "e.g., Jumu'ah Khutbah — Live Broadcast"
                  )}
                  value={stream.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onPatchStream(stream.id, { title: e.target.value })
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
                    onPatchStream(stream.id, { watchUrl: e.target.value })
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
                  placeholder={t(
                    'placeholder.live_schedule_label',
                    'e.g., Every Friday at 12:15 PM or Ramadan Nights at 7:30 PM'
                  )}
                  value={stream.scheduleLabel || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onPatchStream(stream.id, { scheduleLabel: e.target.value })
                  }
                />
                <Field.Hint>
                  {t(
                    'settings.livestreams.schedule_hint',
                    'Human-readable schedule badge displayed alongside the stream title.'
                  )}
                </Field.Hint>
              </Field.Root>

              <Field.Root>
                <Field.Label>
                  {t('field.live_event_slug', 'Linked Event Slug (Optional)')}
                </Field.Label>
                <TextInput
                  placeholder={t(
                    'placeholder.live_event_slug',
                    'e.g., jumuah-khutbah, ramadan-tarawih, annual-conference'
                  )}
                  value={stream.eventSlug || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onPatchStream(stream.id, { eventSlug: e.target.value })
                  }
                />
                <Field.Hint>
                  {t(
                    'settings.livestreams.event_slug_hint',
                    'Associates this live broadcast stream with a specific Event slug in @vicacha-devs/strapi-plugin-events.'
                  )}
                </Field.Hint>
              </Field.Root>
            </Box>
          </Box>
        ))}
      </Flex>
    </Box>
  );
};
