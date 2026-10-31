import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { useFetchClient } from '@strapi/strapi/admin';
import { Badge, Box, Button, Flex, Typography } from '@strapi/design-system';
import { PLUGIN_ID } from '../../../shared/pluginId';
import type {
  EventsPluginSettings,
  ExpandedOccurrence,
  RsvpRegistrationRecord,
  RsvpStatus,
} from '../../../shared/types';
import { AttendeesManagerPanel } from '../components/events/AttendeesManagerPanel';
import { DEFAULT_RECURRENCE_PRESETS } from '../components/events/calendarPageHelpers';
import { EventsDirectoryPanel } from '../components/events/EventsDirectoryPanel';
import { QuickCreateEventPanel } from '../components/events/QuickCreateEventPanel';

function shouldReplaceRepresentativeOccurrence(
  existing: ExpandedOccurrence,
  candidate: ExpandedOccurrence,
  todayKey: string
): boolean {
  const existingIsFuture = existing.occurrenceDate >= todayKey;
  const currentIsFuture = candidate.occurrenceDate >= todayKey;
  if (!existingIsFuture && currentIsFuture) return true;
  if (existingIsFuture && currentIsFuture) {
    return candidate.occurrenceDate < existing.occurrenceDate;
  }
  if (!existingIsFuture && !currentIsFuture) {
    return candidate.occurrenceDate > existing.occurrenceDate;
  }
  return false;
}

export const CalendarPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { get, post } = useFetchClient();

  const t = useCallback(
    (id: string, defaultMessage: string) =>
      formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }),
    [formatMessage]
  );

  const [settings, setSettings] = useState<EventsPluginSettings | null>(null);
  const [occurrences, setOccurrences] = useState<ExpandedOccurrence[]>([]);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Quick-Create modal state
  const [showQuickCreate, setShowQuickCreate] = useState<boolean>(false);
  const [quickTitle, setQuickTitle] = useState<string>('');
  const [quickStart, setQuickStart] = useState<string>('');
  const [quickLocation, setQuickLocation] = useState<string>('');
  const [quickCategory] = useState<string>('general');
  const [quickRRule, setQuickRRule] = useState<string>('');
  const [quickRsvpEnabled, setQuickRsvpEnabled] = useState<boolean>(true);
  const [quickCapacity, setQuickCapacity] = useState<number>(50);

  // Attendees & RSVP Ledger state
  const [registrations, setRegistrations] = useState<RsvpRegistrationRecord[]>([]);
  const [rsvpSearch, setRsvpSearch] = useState<string>('');
  const [rsvpStatusFilter, setRsvpStatusFilter] = useState<string>('all');
  const [rsvpEventFilter, setRsvpEventFilter] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('eventDocumentId') || '';
  });

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const fetchCalendarData = useCallback(async () => {
    try {
      const now = new Date();
      const fromIso = `${now.getFullYear() - 1}-01-01T00:00:00.000Z`;
      const toIso = `${now.getFullYear() + 2}-12-31T23:59:59.000Z`;
      const res = await get(
        `/${PLUGIN_ID}/calendar?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`
      );
      const payload = res?.data?.data as
        | { occurrences?: ExpandedOccurrence[]; settings?: EventsPluginSettings }
        | undefined;
      if (payload?.settings) {
        setSettings(payload.settings);
      }
      if (Array.isArray(payload?.occurrences)) {
        setOccurrences(payload.occurrences);
      }
    } catch {
      try {
        const res = await get(`/${PLUGIN_ID}/settings`);
        const payload = res?.data?.data as EventsPluginSettings | undefined;
        if (payload) {
          setSettings(payload);
        }
      } catch {
        // Ignore fallback failure
      }
    }
  }, [get]);

  const fetchRegistrations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (rsvpSearch.trim()) params.set('search', rsvpSearch.trim());
      if (rsvpStatusFilter !== 'all') params.set('status', rsvpStatusFilter);
      if (rsvpEventFilter.trim()) params.set('eventDocumentId', rsvpEventFilter.trim());

      const res = await get(`/${PLUGIN_ID}/registrations?${params.toString()}`);
      const data = res?.data?.data;
      if (Array.isArray(data)) {
        setRegistrations(data as RsvpRegistrationRecord[]);
      }
    } catch {
      setBannerMessage(t('attendees.error.load', 'Could not load registrations.'));
    }
  }, [get, rsvpSearch, rsvpStatusFilter, rsvpEventFilter, t]);

  useEffect(() => {
    void fetchCalendarData();
  }, [fetchCalendarData]);

  useEffect(() => {
    void fetchRegistrations();
  }, [fetchRegistrations]);

  const uniqueEvents = useMemo(() => {
    const byDoc = new Map<string, ExpandedOccurrence>();
    for (const occ of occurrences) {
      const key = `${occ.uid}:${occ.documentId}`;
      const existing = byDoc.get(key);
      if (!existing || shouldReplaceRepresentativeOccurrence(existing, occ, todayKey)) {
        byDoc.set(key, occ);
      }
    }
    return Array.from(byDoc.values()).sort((a, b) =>
      a.occurrenceDate.localeCompare(b.occurrenceDate)
    );
  }, [occurrences, todayKey]);

  const recurrencePresets = useMemo(
    () =>
      settings?.recurrencePresets && settings.recurrencePresets.length > 0
        ? settings.recurrencePresets
        : DEFAULT_RECURRENCE_PRESETS,
    [settings?.recurrencePresets]
  );

  const rsvpStats = useMemo(() => {
    let confirmedSeats = 0;
    let checkedInSeats = 0;
    let waitlistedSeats = 0;
    const eventsSet = new Set<string>();

    for (const ev of uniqueEvents) {
      if (ev.rsvp?.rsvpEnabled) {
        eventsSet.add(ev.documentId);
      }
    }

    for (const reg of registrations) {
      const seats = Number(reg.guestsCount) || 1;
      if (reg.eventDocumentId) eventsSet.add(reg.eventDocumentId);
      if (reg.status === 'confirmed') confirmedSeats += seats;
      else if (reg.status === 'checked_in') checkedInSeats += seats;
      else if (reg.status === 'waitlisted') waitlistedSeats += seats;
    }

    return {
      totalEvents: uniqueEvents.length,
      totalRegistrations: registrations.length,
      confirmedSeats,
      checkedInSeats,
      waitlistedSeats,
      distinctEvents: eventsSet.size,
    };
  }, [registrations, uniqueEvents]);

  const handleQuickCreateSubmit = useCallback(async () => {
    if (!quickTitle.trim() || !quickStart) return;
    try {
      const startIso = quickStart.includes('T')
        ? new Date(quickStart).toISOString()
        : `${quickStart}T10:00:00.000Z`;
      const endIso = new Date(new Date(startIso).getTime() + 3600000).toISOString();

      await post(`/${PLUGIN_ID}/calendar/quick-create`, {
        title: quickTitle.trim(),
        startDate: startIso,
        endDate: endIso,
        location: quickLocation.trim() || undefined,
        category: quickCategory,
        rrule: quickRRule || undefined,
        rsvpEnabled: quickRsvpEnabled,
        capacity: quickRsvpEnabled ? quickCapacity : undefined,
      });

      setShowQuickCreate(false);
      setQuickTitle('');
      setQuickLocation('');
      setQuickRRule('');
      setBannerMessage(t('calendar.created', 'Event created and published.'));
      await Promise.all([fetchCalendarData(), fetchRegistrations()]);
    } catch {
      setBannerMessage(t('calendar.error.create', 'Could not create event.'));
    }
  }, [
    quickTitle,
    quickStart,
    quickLocation,
    quickCategory,
    quickRRule,
    quickRsvpEnabled,
    quickCapacity,
    post,
    t,
    fetchCalendarData,
    fetchRegistrations,
  ]);

  const handleCheckIn = useCallback(
    async (regDocId: string) => {
      try {
        await post(`/${PLUGIN_ID}/registrations/${encodeURIComponent(regDocId)}/check-in`, {});
        setBannerMessage(t('attendees.checkedInSuccess', 'Attendee checked in.'));
        await Promise.all([fetchCalendarData(), fetchRegistrations()]);
      } catch {
        setBannerMessage(t('attendees.error.checkIn', 'Check-in failed.'));
      }
    },
    [post, t, fetchCalendarData, fetchRegistrations]
  );

  const handleStatusChange = useCallback(
    async (regDocId: string, status: RsvpStatus) => {
      try {
        const res = await post(
          `/${PLUGIN_ID}/registrations/${encodeURIComponent(regDocId)}/status`,
          { status }
        );
        const promotedCount =
          (res?.data?.data as { promotedCount?: number } | undefined)?.promotedCount ?? 0;
        setBannerMessage(
          promotedCount > 0
            ? `${t('attendees.statusUpdated', 'Status updated.')} ${promotedCount} ${t(
                'attendees.waitlistPromoted',
                'attendee(s) automatically promoted from waitlist!'
              )}`
            : t('attendees.statusUpdated', 'Status updated.')
        );
        await Promise.all([fetchCalendarData(), fetchRegistrations()]);
      } catch {
        setBannerMessage(t('attendees.error.status', 'Could not update status.'));
      }
    },
    [post, t, fetchCalendarData, fetchRegistrations]
  );

  return (
    <Box padding={6} background="neutral100">
      <Flex direction="column" alignItems="stretch" gap={5}>
        <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
          <Box>
            <Typography variant="alpha" fontWeight="bold">
              {t('calendar.title', 'Events, RSVPs & Check-In')}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="epsilon" textColor="neutral600">
                {t(
                  'calendar.subtitle',
                  'Manage event registrations, waitlist auto-promotion, and attendee check-ins. Schedule views are unified in Calendar.'
                )}
              </Typography>
            </Box>
          </Box>

          <Flex gap={2} wrap="wrap">
            <Button
              variant="secondary"
              size="S"
              onClick={() => navigate('/plugins/calendar?source=events')}
            >
              {t('calendar.openUnifiedCalendar', 'Open in Calendar')}
            </Button>
            <Button
              variant="default"
              size="S"
              onClick={() => {
                setQuickStart(todayKey);
                setShowQuickCreate(true);
              }}
            >
              + {t('calendar.quickCreate', 'New Event')}
            </Button>
            <Button
              variant="secondary"
              size="S"
              tag="a"
              href="/api/events/feed.ics"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('calendar.downloadIcsFeed', 'iCal Feed (.ics)')}
            </Button>
            <Button
              variant="tertiary"
              size="S"
              onClick={() => navigate(`/settings/${PLUGIN_ID}`)}
            >
              {t('calendar.settings', 'Settings')}
            </Button>
          </Flex>
        </Flex>

        {/* Events & RSVP Summary KPI Cards */}
        <Flex gap={4} wrap="wrap">
          {[
            {
              label: t('stats.totalEvents', 'Registered Events'),
              value: rsvpStats.totalEvents,
              badge: 'primary100',
            },
            {
              label: t('stats.eventsWithRsvps', 'Events with RSVPs'),
              value: rsvpStats.distinctEvents,
              badge: 'secondary100',
            },
            {
              label: t('stats.registrations', 'Total Registrations'),
              value: rsvpStats.totalRegistrations,
              badge: 'neutral100',
            },
            {
              label: t('stats.confirmedSeats', 'Confirmed Seats'),
              value: rsvpStats.confirmedSeats,
              badge: 'primary100',
            },
            {
              label: t('stats.checkedInSeats', 'Checked-In Seats'),
              value: rsvpStats.checkedInSeats,
              badge: 'success100',
            },
            {
              label: t('stats.waitlistedSeats', 'Waitlisted Seats'),
              value: rsvpStats.waitlistedSeats,
              badge: 'warning100',
            },
          ].map((card) => (
            <Box
              key={card.label}
              background="neutral0"
              hasRadius
              shadow="tableShadow"
              padding={4}
              style={{ flex: '1 1 160px' }}
            >
              <Flex direction="column" alignItems="flex-start" gap={1}>
                <Typography variant="sigma" textColor="neutral600">
                  {card.label}
                </Typography>
                <Badge backgroundColor={card.badge}>{card.value}</Badge>
              </Flex>
            </Box>
          ))}
        </Flex>

        {bannerMessage && (
          <Box padding={3} background="primary100" hasRadius style={{ border: '1px solid #0284C7' }}>
            <Flex justifyContent="space-between" alignItems="center">
              <Typography variant="omega" fontWeight="bold" textColor="primary700">
                {bannerMessage}
              </Typography>
              <Button variant="tertiary" size="S" onClick={() => setBannerMessage(null)}>
                ×
              </Button>
            </Flex>
          </Box>
        )}

        {showQuickCreate && (
          <QuickCreateEventPanel
            t={t}
            quickTitle={quickTitle}
            onQuickTitleChange={setQuickTitle}
            quickStart={quickStart}
            onQuickStartChange={setQuickStart}
            quickLocation={quickLocation}
            onQuickLocationChange={setQuickLocation}
            quickRRule={quickRRule}
            onQuickRRuleChange={setQuickRRule}
            quickRsvpEnabled={quickRsvpEnabled}
            onQuickRsvpEnabledChange={setQuickRsvpEnabled}
            quickCapacity={quickCapacity}
            onQuickCapacityChange={setQuickCapacity}
            recurrencePresets={recurrencePresets}
            onCancel={() => setShowQuickCreate(false)}
            onSubmit={handleQuickCreateSubmit}
          />
        )}

        <EventsDirectoryPanel
          t={t}
          events={uniqueEvents}
          selectedEventDocId={rsvpEventFilter}
          onSelectEventDocId={setRsvpEventFilter}
          onEditInContentManager={(uid, docId, locale) => {
            const query = locale
              ? `?plugins[i18n][locale]=${encodeURIComponent(locale)}`
              : '';
            navigate(`/content-manager/collection-types/${uid}/${docId}${query}`);
          }}
          onOpenInCalendar={(docId) =>
            navigate(
              `/plugins/calendar?source=events${
                docId ? `&documentId=${encodeURIComponent(docId)}` : ''
              }`
            )
          }
        />

        <AttendeesManagerPanel
          t={t}
          registrations={registrations}
          rsvpSearch={rsvpSearch}
          onRsvpSearchChange={setRsvpSearch}
          rsvpStatusFilter={rsvpStatusFilter}
          onRsvpStatusFilterChange={setRsvpStatusFilter}
          rsvpEventFilter={rsvpEventFilter}
          onClearRsvpEventFilter={() => setRsvpEventFilter('')}
          onCheckIn={handleCheckIn}
          onStatusChange={handleStatusChange}
        />
      </Flex>
    </Box>
  );
};

export default CalendarPage;
