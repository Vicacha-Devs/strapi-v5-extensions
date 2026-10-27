import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useFetchClient } from '@strapi/strapi/admin';
import { Badge, Box, Button, Flex, Typography } from '@strapi/design-system';
import type { CalendarPluginSettings } from '@vicacha-devs/strapi-plugin-calendar/shared';
import { PLUGIN_ID } from '../../../shared/pluginId';
import type {
  EventsPluginSettings,
  ExpandedOccurrence,
  RsvpRegistrationRecord,
  RsvpStatus,
} from '../../../shared/types';
import { AttendeesManagerPanel } from '../components/events/AttendeesManagerPanel';
import {
  buildMonthGridDays,
  buildWeekDays,
  DEFAULT_RECURRENCE_PRESETS,
  extractAvailableCategories,
  formatSecondaryHeaderLabel,
  groupOccurrencesByDate,
  resolveActiveSecondaryCalendars,
} from '../components/events/calendarPageHelpers';
import { EventOccurrenceDrawer } from '../components/events/EventOccurrenceDrawer';
import { EventsGridCanvas } from '../components/events/EventsGridCanvas';
import { EventsToolbar, type EventsViewMode } from '../components/events/EventsToolbar';
import { QuickCreateEventPanel } from '../components/events/QuickCreateEventPanel';

export const CalendarPage: React.FC = () => {
  const { formatMessage, locale } = useIntl();
  const { get, post } = useFetchClient();

  const t = useCallback(
    (id: string, defaultMessage: string) =>
      formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }),
    [formatMessage]
  );

  const [viewMode, setViewMode] = useState<EventsViewMode>('month');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [calendarOverlayId, setCalendarOverlayId] = useState<string>('configured');
  const [activeLocale, setActiveLocale] = useState<string>(() =>
    locale && locale !== 'en' ? locale : 'es'
  );
  const [secondaryCalendarLanguage, setSecondaryCalendarLanguage] = useState<
    'local' | 'ar' | 'off'
  >('local');
  const [activeTheme, setActiveTheme] = useState<
    'breeze' | 'emerald' | 'sand' | 'midnight' | 'classic'
  >('breeze');
  const [calendarSettings, setCalendarSettings] =
    useState<CalendarPluginSettings | null>(null);

  const [occurrences, setOccurrences] = useState<ExpandedOccurrence[]>([]);
  const [settings, setSettings] = useState<EventsPluginSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Selected occurrence for detail / reschedule drawer
  const [selectedOccurrence, setSelectedOccurrence] = useState<ExpandedOccurrence | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [applyToSeries, setApplyToSeries] = useState<boolean>(false);

  // Quick-Create modal state
  const [showQuickCreate, setShowQuickCreate] = useState<boolean>(false);
  const [quickTitle, setQuickTitle] = useState<string>('');
  const [quickStart, setQuickStart] = useState<string>('');
  const [quickLocation, setQuickLocation] = useState<string>('');
  const [quickCategory] = useState<string>('general');
  const [quickRRule, setQuickRRule] = useState<string>('');
  const [quickRsvpEnabled, setQuickRsvpEnabled] = useState<boolean>(true);
  const [quickCapacity, setQuickCapacity] = useState<number>(50);

  // Attendees tab state
  const [registrations, setRegistrations] = useState<RsvpRegistrationRecord[]>([]);
  const [rsvpSearch, setRsvpSearch] = useState<string>('');
  const [rsvpStatusFilter, setRsvpStatusFilter] = useState<string>('all');
  const [rsvpEventFilter, setRsvpEventFilter] = useState<string>('');

  const dateWindow = useMemo(() => {
    const y = anchorDate.getUTCFullYear();
    const m = anchorDate.getUTCMonth();
    const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
    const to = new Date(Date.UTC(y, m + 2, 0, 23, 59, 59)).toISOString();
    return { from, to };
  }, [anchorDate]);

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: dateWindow.from,
        to: dateWindow.to,
        locale: activeLocale && activeLocale !== 'auto' ? activeLocale : 'es',
      });
      if (sourceFilter !== 'all') params.set('sourceId', sourceFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);

      const [res, calSettingsRes] = await Promise.all([
        get(`/${PLUGIN_ID}/calendar?${params.toString()}`),
        get('/calendar/settings').catch(() => null),
      ]);
      const centralCal = calSettingsRes?.data?.data as
        | CalendarPluginSettings
        | undefined;
      if (centralCal) {
        setCalendarSettings(centralCal);
        if (centralCal.theme) {
          setActiveTheme(centralCal.theme);
        }
        if (centralCal.defaultLocale && centralCal.defaultLocale !== 'auto') {
          setActiveLocale(centralCal.defaultLocale);
        }
        if (centralCal.secondaryCalendarLanguage) {
          setSecondaryCalendarLanguage(centralCal.secondaryCalendarLanguage);
        }
      }
      const payload = res?.data?.data as
        | { occurrences?: ExpandedOccurrence[]; settings?: EventsPluginSettings }
        | undefined;
      if (payload) {
        setOccurrences(Array.isArray(payload.occurrences) ? payload.occurrences : []);
        if (payload.settings) setSettings(payload.settings);
        const loadErrorMsg = t('calendar.error.load', 'Could not load calendar occurrences.');
        setBannerMessage((prev) => (prev === loadErrorMsg ? null : prev));
      }
    } catch {
      setBannerMessage(t('calendar.error.load', 'Could not load calendar occurrences.'));
    } finally {
      setLoading(false);
    }
  }, [dateWindow.from, dateWindow.to, activeLocale, sourceFilter, categoryFilter, get, t]);

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
    fetchCalendarData();
  }, [fetchCalendarData]);

  useEffect(() => {
    if (viewMode === 'attendees') {
      fetchRegistrations();
    }
  }, [viewMode, fetchRegistrations]);

  const occurrencesByDate = useMemo(() => groupOccurrencesByDate(occurrences), [occurrences]);
  const availableCategories = useMemo(
    () => extractAvailableCategories(occurrences),
    [occurrences]
  );
  const activeSecondaryCalendars = useMemo(() => {
    if (secondaryCalendarLanguage === 'off') {
      return [];
    }
    const centralConfigured = (calendarSettings?.secondaryCalendars ?? []).filter(
      (c) => c.enabled
    );
    if (centralConfigured.length > 0) {
      return centralConfigured;
    }
    return resolveActiveSecondaryCalendars(calendarOverlayId, settings);
  }, [
    calendarOverlayId,
    calendarSettings?.secondaryCalendars,
    settings,
    secondaryCalendarLanguage,
  ]);
  const recurrencePresets = useMemo(
    () =>
      settings?.recurrencePresets && settings.recurrencePresets.length > 0
        ? settings.recurrencePresets
        : DEFAULT_RECURRENCE_PRESETS,
    [settings?.recurrencePresets]
  );

  const navigatePeriod = useCallback(
    (direction: -1 | 0 | 1) => {
      if (direction === 0) {
        setAnchorDate(new Date());
        return;
      }
      setAnchorDate((prev) => {
        const next = new Date(prev);
        if (viewMode === 'month' || viewMode === 'agenda') {
          next.setUTCMonth(next.getUTCMonth() + direction);
        } else if (viewMode === 'week') {
          next.setUTCDate(next.getUTCDate() + direction * 7);
        } else {
          next.setUTCDate(next.getUTCDate() + direction);
        }
        return next;
      });
    },
    [viewMode]
  );

  const handleDropOnDate = useCallback(
    async (occ: ExpandedOccurrence, targetDateKey: string) => {
      if (occ.occurrenceDate === targetDateKey) return;
      const durationMs =
        new Date(occ.endDate).getTime() - new Date(occ.startDate).getTime();
      const timePart = occ.startDate.includes('T')
        ? occ.startDate.slice(10)
        : 'T10:00:00.000Z';
      const newStartIso = `${targetDateKey}${timePart}`;
      const newEndIso = new Date(new Date(newStartIso).getTime() + durationMs).toISOString();

      try {
        await post(`/${PLUGIN_ID}/calendar/reschedule`, {
          sourceId: occ.sourceId,
          uid: occ.uid,
          documentId: occ.documentId,
          occurrenceDate: occ.occurrenceDate,
          newStartDate: newStartIso,
          newEndDate: newEndIso,
          applyToSeries: false,
        });
        setBannerMessage(
          `${t('calendar.rescheduled', 'Rescheduled')} "${occ.title}" → ${targetDateKey}`
        );
        await fetchCalendarData();
      } catch {
        setBannerMessage(t('calendar.error.reschedule', 'Failed to reschedule occurrence.'));
      }
    },
    [post, t, fetchCalendarData]
  );

  const handleQuickCreateSubmit = useCallback(async () => {
    if (!quickTitle.trim() || !quickStart) return;
    try {
      const startIso = quickStart.includes('T')
        ? new Date(quickStart).toISOString()
        : `${quickStart}T10:00:00.000Z`;
      const endIso = new Date(new Date(startIso).getTime() + 3600000).toISOString();

      await post(`/${PLUGIN_ID}/calendar/quick-create`, {
        sourceId: sourceFilter !== 'all' ? sourceFilter : undefined,
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
      await fetchCalendarData();
    } catch {
      setBannerMessage(t('calendar.error.create', 'Could not create event.'));
    }
  }, [
    quickTitle,
    quickStart,
    sourceFilter,
    quickLocation,
    quickCategory,
    quickRRule,
    quickRsvpEnabled,
    quickCapacity,
    post,
    t,
    fetchCalendarData,
  ]);

  const handleRescheduleSelected = useCallback(
    async (cancelOccurrence = false) => {
      if (!selectedOccurrence) return;
      try {
        const newStartIso = rescheduleDate
          ? `${rescheduleDate}${selectedOccurrence.startDate.slice(10)}`
          : selectedOccurrence.startDate;
        await post(`/${PLUGIN_ID}/calendar/reschedule`, {
          sourceId: selectedOccurrence.sourceId,
          uid: selectedOccurrence.uid,
          documentId: selectedOccurrence.documentId,
          occurrenceDate: selectedOccurrence.occurrenceDate,
          newStartDate: newStartIso,
          applyToSeries,
          cancelOccurrence,
        });
        setSelectedOccurrence(null);
        setBannerMessage(
          cancelOccurrence
            ? t('calendar.occurrenceCancelled', 'Occurrence cancelled.')
            : t('calendar.rescheduled', 'Schedule updated.')
        );
        await fetchCalendarData();
      } catch {
        setBannerMessage(t('calendar.error.reschedule', 'Failed to update schedule.'));
      }
    },
    [selectedOccurrence, rescheduleDate, applyToSeries, post, t, fetchCalendarData]
  );

  const handleCheckIn = useCallback(
    async (regDocId: string) => {
      try {
        await post(`/${PLUGIN_ID}/registrations/${encodeURIComponent(regDocId)}/check-in`, {});
        setBannerMessage(t('attendees.checkedInSuccess', 'Attendee checked in.'));
        await fetchRegistrations();
      } catch {
        setBannerMessage(t('attendees.error.checkIn', 'Check-in failed.'));
      }
    },
    [post, t, fetchRegistrations]
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
        await fetchRegistrations();
      } catch {
        setBannerMessage(t('attendees.error.status', 'Could not update status.'));
      }
    },
    [post, t, fetchRegistrations]
  );

  const safeLocale =
    activeLocale && activeLocale !== 'auto'
      ? activeLocale
      : locale && locale !== 'en' && locale !== 'auto'
        ? locale
        : 'es';

  const monthDays = useMemo(
    () => buildMonthGridDays(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth()),
    [anchorDate]
  );
  const weekDays = useMemo(() => buildWeekDays(anchorDate), [anchorDate]);
  const monthLabel = useMemo(() => {
    try {
      const raw = new Intl.DateTimeFormat(safeLocale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(anchorDate);
      return raw.toUpperCase();
    } catch {
      return new Intl.DateTimeFormat('es', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
        .format(anchorDate)
        .toUpperCase();
    }
  }, [anchorDate, safeLocale]);
  const secondaryHeaderLabel = useMemo(
    () =>
      secondaryCalendarLanguage === 'off'
        ? ''
        : formatSecondaryHeaderLabel(
            activeSecondaryCalendars,
            anchorDate,
            secondaryCalendarLanguage === 'ar' ? 'ar-SA' : safeLocale
          ),
    [activeSecondaryCalendars, anchorDate, safeLocale, secondaryCalendarLanguage]
  );

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <Box padding={6} background="neutral100">
      <Flex direction="column" alignItems="stretch" gap={5}>
        <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
          <Box>
            <Typography variant="alpha" fontWeight="bold">
              {t('calendar.title', 'Events, Calendar & RSVPs')}
            </Typography>
            <Box paddingTop={1}>
              <Flex gap={2} alignItems="center" wrap="wrap">
                <Typography
                  variant="epsilon"
                  fontWeight="bold"
                  textColor="neutral800"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.03em' }}
                >
                  {monthLabel}
                </Typography>
                {secondaryHeaderLabel && (
                  <Badge backgroundColor="secondary100" textColor="secondary700">
                    {secondaryHeaderLabel}
                  </Badge>
                )}
              </Flex>
            </Box>
          </Box>

          <Flex gap={2} wrap="wrap">
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
            <Button variant="secondary" size="S" tag="a" href="/api/events/feed.ics" target="_blank" rel="noopener noreferrer">
              {t('calendar.downloadIcsFeed', 'iCal Feed (.ics)')}
            </Button>
            <Button variant="tertiary" size="S" tag="a" href={`/admin/settings/${PLUGIN_ID}`}>
              {t('calendar.settings', 'Settings')}
            </Button>
          </Flex>
        </Flex>

        {bannerMessage && (
          <Box padding={3} background="primary100" hasRadius style={{ border: '1px solid #0284C7' }}>
            <Flex justifyContent="space-between" alignItems="center">
              <Typography variant="omega" fontWeight="bold" textColor="primary700">
                {bannerMessage}
              </Typography>
              <Button variant="tertiary" size="S" onClick={() => setBannerMessage(null)}>
                ×</Button>
            </Flex>
          </Box>
        )}

        <EventsToolbar
          t={t}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNavigatePeriod={navigatePeriod}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          calendarOverlayId={calendarOverlayId}
          onCalendarOverlayChange={setCalendarOverlayId}
          activeLocale={safeLocale}
          onLocaleChange={setActiveLocale}
          secondaryCalendarLanguage={secondaryCalendarLanguage}
          onSecondaryCalendarLanguageChange={setSecondaryCalendarLanguage}
          sources={settings?.sources ?? []}
          totalOccurrencesCount={occurrences.length}
          availableCategories={availableCategories}
        />

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

        {selectedOccurrence && (
          <EventOccurrenceDrawer
            t={t}
            occurrence={selectedOccurrence}
            rescheduleDate={rescheduleDate}
            onRescheduleDateChange={setRescheduleDate}
            applyToSeries={applyToSeries}
            onApplyToSeriesChange={setApplyToSeries}
            onRescheduleSave={handleRescheduleSelected}
            onClose={() => setSelectedOccurrence(null)}
          />
        )}

        {viewMode !== 'attendees' && (
          <EventsGridCanvas
            t={t}
            locale={safeLocale}
            theme={activeTheme}
            calendarSettings={calendarSettings}
            secondaryCalendarLanguage={secondaryCalendarLanguage}
            viewMode={viewMode}
            anchorDate={anchorDate}
            todayKey={todayKey}
            loading={loading}
            monthDays={monthDays}
            weekDays={weekDays}
            occurrences={occurrences}
            occurrencesByDate={occurrencesByDate}
            activeSecondaryCalendars={activeSecondaryCalendars}
            onSelectOccurrence={(occ) => {
              setSelectedOccurrence(occ);
              setRescheduleDate(occ.occurrenceDate);
              setApplyToSeries(false);
            }}
            onDropOnDate={handleDropOnDate}
            onQuickCreateOnDate={(dateKey) => {
              setQuickStart(dateKey);
              setShowQuickCreate(true);
            }}
            onViewAttendeesForEvent={(documentId) => {
              setRsvpEventFilter(documentId);
              setViewMode('attendees');
            }}
          />
        )}

        {viewMode === 'attendees' && (
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
        )}
      </Flex>
    </Box>
  );
};

export default CalendarPage;
