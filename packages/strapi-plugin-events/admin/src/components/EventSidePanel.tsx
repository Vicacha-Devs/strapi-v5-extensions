import React, { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useFetchClient } from '@strapi/strapi/admin';
import { Badge, Box, Button, Flex, Typography } from '@strapi/design-system';
import { formatDateInCalendarSystem } from '../../../shared/calendarSystems';
import { EVENT_CONTENT_TYPE_UID, PLUGIN_ID } from '../../../shared/pluginId';
import type { EventsPluginSettings, RsvpStats } from '../../../shared/types';

interface SidePanelProps {
  activeTab?: string;
  collectionType?: string;
  document?: Record<string, unknown>;
  documentId?: string;
  meta?: Record<string, unknown>;
  model?: string;
}

export const EventSidePanel = (props: SidePanelProps) => {
  const { formatMessage, locale } = useIntl();
  const { get } = useFetchClient();
  const [stats, setStats] = useState<RsvpStats | null>(null);
  const [settings, setSettings] = useState<EventsPluginSettings | null>(null);

  const model = props.model ?? '';
  const documentId =
    props.documentId ??
    (typeof props.document?.documentId === 'string' ? props.document.documentId : '');
  const rawStartDate =
    typeof props.document?.startDate === 'string'
      ? props.document.startDate
      : typeof props.document?.preferredDate === 'string'
        ? props.document.preferredDate
        : '';

  const hasScheduleFields = Boolean(
    rawStartDate ||
      props.document?.recurrence ||
      props.document?.rsvpEnabled !== undefined
  );

  const isEventLike = model === EVENT_CONTENT_TYPE_UID || hasScheduleFields;

  useEffect(() => {
    if (!isEventLike) {
      return;
    }

    let mounted = true;
    get(`/${PLUGIN_ID}/settings`)
      .then((res: { data?: { data?: EventsPluginSettings } }) => {
        if (mounted && res?.data?.data) {
          setSettings(res.data.data);
        }
      })
      .catch(() => {
        // Ignore if settings request fails
      });

    if (documentId) {
      get(
        `/${PLUGIN_ID}/stats/${encodeURIComponent(documentId)}?eventUid=${encodeURIComponent(model)}`
      )
        .then((res: { data?: { data?: RsvpStats } }) => {
          if (mounted && res?.data?.data) {
            setStats(res.data.data);
          }
        })
        .catch(() => {
          // Ignore if stats are not yet available for unsaved draft
        });
    }

    return () => {
      mounted = false;
    };
  }, [documentId, isEventLike, model, get]);

  const computedAlternateDates = useMemo(() => {
    if (!rawStartDate || !settings?.secondaryCalendars) {
      return [];
    }
    return settings.secondaryCalendars
      .filter((sys) => sys.enabled)
      .map((sys) => {
        const rawFieldVal = sys.overrideField ? props.document?.[sys.overrideField] : undefined;
        const overrideVal = typeof rawFieldVal === 'string' ? rawFieldVal.trim() : '';
        const formatted =
          overrideVal ||
          formatDateInCalendarSystem(rawStartDate, sys, locale || 'en', { compact: false });
        return {
          id: sys.id,
          label: sys.label,
          formatted,
          isOverridden: Boolean(overrideVal),
        };
      })
      .filter((item) => Boolean(item.formatted));
  }, [rawStartDate, settings?.secondaryCalendars, props.document, locale]);

  if (!isEventLike || !documentId) {
    return null;
  }

  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });

  const icsUrl = `/api/events/${encodeURIComponent(documentId)}/invite.ics`;

  const capacityPercent =
    stats && stats.capacity && stats.capacity > 0
      ? Math.min(100, Math.round((stats.confirmedSeats / stats.capacity) * 100))
      : 0;

  return {
    title: t('sidePanel.title', 'Events & RSVP Summary'),
    content: (
      <Box paddingTop={2} paddingBottom={2}>
        <Flex direction="column" alignItems="stretch" gap={3}>
          {computedAlternateDates.length > 0 && (
            <Box padding={3} background="neutral100" hasRadius>
              <Typography variant="sigma" textColor="neutral600">
                {t('sidePanel.secondaryCalendars', 'Alternative Calendar Dates')}
              </Typography>
              <Flex direction="column" alignItems="stretch" gap={1} paddingTop={2}>
                {computedAlternateDates.map((alt) => (
                  <Flex key={alt.id} justifyContent="space-between" alignItems="center">
                    <Typography variant="pi" textColor="neutral600">
                      {alt.label}:
                    </Typography>
                    <Typography variant="pi" fontWeight="bold">
                      {alt.formatted}
                    </Typography>
                  </Flex>
                ))}
              </Flex>
            </Box>
          )}

          {stats && (
            <Box padding={3} background="neutral100" hasRadius>
              <Flex justifyContent="space-between" alignItems="center">
                <Typography variant="sigma" textColor="neutral600">
                  {t('sidePanel.rsvpStatus', 'RSVP & Capacity')}
                </Typography>
                <Badge
                  backgroundColor={stats.isFull ? 'danger100' : 'success100'}
                  textColor={stats.isFull ? 'danger700' : 'success700'}
                >
                  {stats.isFull
                    ? t('sidePanel.full', 'Full / Waitlist')
                    : t('sidePanel.open', 'Open')}
                </Badge>
              </Flex>

              <Flex justifyContent="space-between" paddingTop={2}>
                <Typography variant="pi">
                  {t('sidePanel.confirmedSeats', 'Confirmed Seats')}:
                </Typography>
                <Typography variant="pi" fontWeight="bold">
                  {stats.confirmedSeats}
                  {stats.capacity ? ` / ${stats.capacity}` : ''}
                </Typography>
              </Flex>

              {stats.capacity && (
                <Box
                  marginTop={2}
                  marginBottom={2}
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: '#eaeaef',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${capacityPercent}%`,
                      height: '100%',
                      background: stats.isFull ? '#d02b20' : '#0D9488',
                    }}
                  />
                </Box>
              )}

              <Flex justifyContent="space-between" paddingTop={1}>
                <Typography variant="pi">
                  {t('sidePanel.checkedIn', 'Checked In')}:
                </Typography>
                <Typography variant="pi" fontWeight="bold">
                  {stats.checkedInSeats}
                </Typography>
              </Flex>

              <Flex justifyContent="space-between" paddingTop={1}>
                <Typography variant="pi">
                  {t('sidePanel.waitlisted', 'Waitlisted Seats')}:
                </Typography>
                <Typography variant="pi" fontWeight="bold">
                  {stats.waitlistedSeats}
                </Typography>
              </Flex>
            </Box>
          )}

          <Flex direction="column" alignItems="stretch" gap={2}>
            <Button
              variant="secondary"
              size="S"
              tag="a"
              href={icsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('sidePanel.downloadIcs', 'Download .ics Invite')}
            </Button>
            <Button
              variant="tertiary"
              size="S"
              tag="a"
              href={`/admin/plugins/${PLUGIN_ID}?eventDocumentId=${encodeURIComponent(documentId)}`}
            >
              {t('sidePanel.openCalendar', 'Open in Events & Attendees Manager')}
            </Button>
          </Flex>
        </Flex>
      </Box>
    ),
  };
};

export default EventSidePanel;
