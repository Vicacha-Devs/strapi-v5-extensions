import React, { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useFetchClient } from '@strapi/strapi/admin';
import { Badge, Box, Button, Flex, Typography } from '@strapi/design-system';
import { formatDateInCalendarSystem } from '../../../shared/calendarSystems';
import { EVENT_CONTENT_TYPE_UID, PLUGIN_ID } from '../../../shared/pluginId';
import type { CalendarSystemConfig, EventsPluginSettings, RsvpStats } from '../../../shared/types';

interface SidePanelProps {
  activeTab?: string;
  collectionType?: string;
  document?: Record<string, unknown>;
  documentId?: string;
  meta?: Record<string, unknown>;
  model?: string;
}

interface ComputedAltDate {
  id: string;
  label: string;
  formatted: string;
  isOverridden: boolean;
}

function getStringProp(doc: Record<string, unknown> | undefined, key: string): string {
  const val = doc?.[key];
  return typeof val === 'string' ? val : '';
}

function resolveDocumentStartDate(doc: Record<string, unknown> | undefined): string {
  return getStringProp(doc, 'startDate') || getStringProp(doc, 'preferredDate');
}

function isDocumentEventLike(model: string, doc: Record<string, unknown> | undefined, rawStartDate: string): boolean {
  if (model === EVENT_CONTENT_TYPE_UID) return true;
  return Boolean(rawStartDate || doc?.recurrence || doc?.rsvpEnabled !== undefined);
}

function formatSingleCalendarSystem(
  sys: CalendarSystemConfig,
  rawStartDate: string,
  doc: Record<string, unknown> | undefined,
  locale: string
): ComputedAltDate {
  const overrideVal = sys.overrideField ? getStringProp(doc, sys.overrideField).trim() : '';
  const formatted =
    overrideVal ||
    formatDateInCalendarSystem(rawStartDate, sys, locale, { compact: false });
  return {
    id: sys.id,
    label: sys.label,
    formatted,
    isOverridden: Boolean(overrideVal),
  };
}

function computeCapacityPercent(stats: RsvpStats | null): number {
  const cap = stats?.capacity ?? 0;
  if (!stats || cap <= 0) return 0;
  return Math.min(100, Math.round((stats.confirmedSeats / cap) * 100));
}

function resolveRsvpEnabled(doc: Record<string, unknown> | undefined, stats: RsvpStats): boolean {
  return typeof doc?.rsvpEnabled === 'boolean' ? doc.rsvpEnabled : stats.rsvpEnabled;
}

interface SidePanelRsvpCardProps {
  stats: RsvpStats;
  rsvpEnabled: boolean;
  capacityPercent: number;
  t: (id: string, defaultMessage: string) => string;
}

const SidePanelRsvpCard: React.FC<SidePanelRsvpCardProps> = ({
  stats,
  rsvpEnabled,
  capacityPercent,
  t,
}) => {
  const badgeBg = stats.isFull ? 'danger100' : 'success100';
  const badgeText = stats.isFull ? 'danger700' : 'success700';
  const badgeLabel = stats.isFull
    ? t('sidePanel.full', 'Full / Waitlist')
    : t('sidePanel.open', 'Open');

  return (
    <Box padding={3} background="neutral100" hasRadius>
      <Flex justifyContent="space-between" alignItems="center">
        <Typography variant="sigma" textColor="neutral600">
          {t('sidePanel.rsvpStatus', 'RSVP & Capacity')}
        </Typography>
        {rsvpEnabled ? (
          <Badge backgroundColor={badgeBg} textColor={badgeText}>
            {badgeLabel}
          </Badge>
        ) : (
          <Badge backgroundColor="neutral150" textColor="neutral600">
            {t('events.directory.noRsvp', 'Info / External Link')}
          </Badge>
        )}
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

      {Boolean(stats.capacity) && (
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
        <Typography variant="pi">{t('sidePanel.checkedIn', 'Checked In')}:</Typography>
        <Typography variant="pi" fontWeight="bold">
          {stats.checkedInSeats}
        </Typography>
      </Flex>

      <Flex justifyContent="space-between" paddingTop={1}>
        <Typography variant="pi">{t('sidePanel.waitlisted', 'Waitlisted Seats')}:</Typography>
        <Typography variant="pi" fontWeight="bold">
          {stats.waitlistedSeats}
        </Typography>
      </Flex>
    </Box>
  );
};

interface GlobalCmI18nWindow {
  __CM_I18N_MESSAGES__?: Record<string, Record<string, string>>;
}

function resolveActiveContentLocale(fallbackLocale?: string): string {
  if (typeof window !== 'undefined') {
    const urlLoc = new URLSearchParams(window.location.search).get('plugins[i18n][locale]');
    if (urlLoc) return urlLoc;
  }
  return fallbackLocale || 'en';
}

function formatPluginMessageWithUrlLocale(
  pluginId: string,
  id: string,
  defaultMessage: string,
  formatMessage: (descriptor: { id: string; defaultMessage: string }) => string
): string {
  const fullKey = `${pluginId}.${id}`;
  if (typeof window !== 'undefined') {
    const urlLoc = new URLSearchParams(window.location.search).get('plugins[i18n][locale]');
    const globalMessages = (globalThis as unknown as GlobalCmI18nWindow).__CM_I18N_MESSAGES__;
    const override = urlLoc ? globalMessages?.[urlLoc]?.[fullKey] : undefined;
    if (override) return override;
  }
  return formatMessage({ id: fullKey, defaultMessage });
}

export const EventSidePanel = (props: SidePanelProps) => {
  const { formatMessage, locale } = useIntl();
  const { get } = useFetchClient();
  const [stats, setStats] = useState<RsvpStats | null>(null);
  const [settings, setSettings] = useState<EventsPluginSettings | null>(null);

  const model = props.model ?? '';
  const documentId = props.documentId || getStringProp(props.document, 'documentId');
  const rawStartDate = resolveDocumentStartDate(props.document);
  const isEventLike = isDocumentEventLike(model, props.document, rawStartDate);
  const activeLocale = resolveActiveContentLocale(locale);

  useEffect(() => {
    if (!isEventLike) return;
    let mounted = true;

    get(`/${PLUGIN_ID}/settings`)
      .then((res) => {
        const data = res?.data?.data as EventsPluginSettings | undefined;
        if (mounted && data) setSettings(data);
      })
      .catch(() => {});

    if (documentId) {
      const statsUrl = `/${PLUGIN_ID}/stats/${encodeURIComponent(documentId)}?eventUid=${encodeURIComponent(model)}`;
      get(statsUrl)
        .then((res) => {
          const data = res?.data?.data as RsvpStats | undefined;
          if (mounted && data) setStats(data);
        })
        .catch(() => {});
    }

    return () => {
      mounted = false;
    };
  }, [documentId, isEventLike, model, get]);

  const computedAlternateDates = useMemo(() => {
    const systems = settings?.secondaryCalendars;
    if (!rawStartDate || !systems) return [];
    return systems
      .filter((sys) => sys.enabled)
      .map((sys) => formatSingleCalendarSystem(sys, rawStartDate, props.document, activeLocale))
      .filter((item) => Boolean(item.formatted));
  }, [rawStartDate, settings?.secondaryCalendars, props.document, activeLocale]);

  if (!isEventLike || !documentId) {
    return null;
  }

  const t = (id: string, defaultMessage: string) =>
    formatPluginMessageWithUrlLocale(PLUGIN_ID, id, defaultMessage, formatMessage);

  const icsUrl = `/api/events/${encodeURIComponent(documentId)}/invite.ics`;
  const capacityPercent = computeCapacityPercent(stats);

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
            <SidePanelRsvpCard
              stats={stats}
              rsvpEnabled={resolveRsvpEnabled(props.document, stats)}
              capacityPercent={capacityPercent}
              t={t}
            />
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
