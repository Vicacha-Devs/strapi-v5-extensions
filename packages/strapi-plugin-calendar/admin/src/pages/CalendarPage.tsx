import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useFetchClient } from '@strapi/strapi/admin';
import type FullCalendar from '@fullcalendar/react';
import { Box, Button, Flex, Typography } from '@strapi/design-system';
import {
  formatDateInCalendarSystem,
  SUPPORTED_INTL_CALENDARS,
} from '../../../shared/calendarSystems';
import {
  getLocalizedCalendarBundle,
  resolveCalendarDirection,
  resolveFullCalendarLocale,
} from '../../../shared/localization';
import { PLUGIN_ID } from '../../../shared/pluginId';
import type {
  CalendarPluginSettings,
  CalendarSystemConfig,
  CalendarViewMode,
  ExpandedCalendarOccurrence,
  SecondaryCalendarLanguageMode,
} from '../../../shared/types';
import { CalendarToolbar } from '../components/calendar/CalendarToolbar';
import { FullCalendarCanvas } from '../components/calendar/FullCalendarCanvas';
import { OccurrenceDetailDrawer } from '../components/calendar/OccurrenceDetailDrawer';
import { QuickCreatePanel } from '../components/calendar/QuickCreatePanel';

interface CalendarApiResponse {
  data?: {
    occurrences?: ExpandedCalendarOccurrence[];
    settings?: CalendarPluginSettings;
  };
}

export const CalendarPage: React.FC = () => {
  const { formatMessage, locale } = useIntl();
  const { get, post } = useFetchClient();
  const calendarRef = useRef<FullCalendar | null>(null);

  const t = useCallback(
    (id: string, defaultMessage: string) =>
      formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }),
    [formatMessage]
  );

  const [viewMode, setViewMode] = useState<CalendarViewMode>('dayGridMonth');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [dateWindow, setDateWindow] = useState<{ from: string; to: string }>(() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    return {
      from: new Date(Date.UTC(y, m - 1, 1)).toISOString(),
      to: new Date(Date.UTC(y, m + 2, 0, 23, 59, 59)).toISOString(),
    };
  });

  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [localeOverride, setLocaleOverride] = useState<string>('auto');
  const [secondaryLangMode, setSecondaryLangMode] =
    useState<SecondaryCalendarLanguageMode>('local');

  const [occurrences, setOccurrences] = useState<ExpandedCalendarOccurrence[]>([]);
  const [settings, setSettings] = useState<CalendarPluginSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const [selectedOccurrence, setSelectedOccurrence] =
    useState<ExpandedCalendarOccurrence | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [applyToSeries, setApplyToSeries] = useState<boolean>(false);

  const [showQuickCreate, setShowQuickCreate] = useState<boolean>(false);
  const [quickTitle, setQuickTitle] = useState<string>('');
  const [quickStart, setQuickStart] = useState<string>('');
  const [quickEnd, setQuickEnd] = useState<string>('');
  const [quickLocation, setQuickLocation] = useState<string>('');
  const [quickCategory] = useState<string>('general');
  const [quickRRule, setQuickRRule] = useState<string>('');

  const effectiveLocale = useMemo(
    () =>
      resolveFullCalendarLocale(
        locale,
        settings?.defaultLocale && settings.defaultLocale !== 'auto'
          ? settings.defaultLocale
          : 'es',
        localeOverride
      ),
    [locale, settings?.defaultLocale, localeOverride]
  );

  const effectiveDirection = useMemo(
    () => resolveCalendarDirection(effectiveLocale, settings?.direction),
    [effectiveLocale, settings?.direction]
  );

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: dateWindow.from,
        to: dateWindow.to,
        locale: effectiveLocale,
      });
      if (sourceFilter !== 'all') {
        params.set('sourceId', sourceFilter);
      }
      if (categoryFilter !== 'all') {
        params.set('category', categoryFilter);
      }

      const res = await get<CalendarApiResponse>(
        `/${PLUGIN_ID}/calendar?${params.toString()}`
      );
      const payload = res?.data?.data;
      if (payload) {
        setOccurrences(Array.isArray(payload.occurrences) ? payload.occurrences : []);
        if (payload.settings) {
          setSettings(payload.settings);
          if (payload.settings.secondaryCalendarLanguage) {
            setSecondaryLangMode(payload.settings.secondaryCalendarLanguage);
          }
        }
        const loadErrorMsg = t('calendar.error.load', 'Could not load calendar occurrences.');
        setBannerMessage((prev) => (prev === loadErrorMsg ? null : prev));
      }
    } catch {
      setBannerMessage(t('calendar.error.load', 'Could not load calendar occurrences.'));
    } finally {
      setLoading(false);
    }
  }, [
    dateWindow.from,
    dateWindow.to,
    effectiveLocale,
    sourceFilter,
    categoryFilter,
    get,
    t,
  ]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const occ of occurrences) {
      if (occ.category) cats.add(occ.category);
    }
    return Array.from(cats);
  }, [occurrences]);

  const activeSecondaryCalendars = useMemo<CalendarSystemConfig[]>(() => {
    if (secondaryLangMode === 'off') {
      return [];
    }
    const configured = (settings?.secondaryCalendars ?? []).filter((c) => c.enabled);
    if (configured.length > 0) {
      return configured;
    }
    const hijriMatch = SUPPORTED_INTL_CALENDARS.find(
      (c) => c.id === 'islamic-umalqura'
    );
    return hijriMatch
      ? [
          {
            id: 'hijri',
            label: hijriMatch.defaultLabel,
            intlCalendar: hijriMatch.intlCalendar,
            enabled: true,
          },
        ]
      : [];
  }, [secondaryLangMode, settings?.secondaryCalendars]);

  const recurrencePresets = useMemo(
    () =>
      settings?.recurrencePresets && settings.recurrencePresets.length > 0
        ? settings.recurrencePresets
        : [
            { id: 'daily', label: 'Daily', rrule: 'FREQ=DAILY;INTERVAL=1' },
            {
              id: 'weekly-mon',
              label: 'Weekly on Mondays',
              rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO',
            },
            {
              id: 'weekly-tue',
              label: 'Weekly on Tuesdays',
              rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=TU',
            },
            {
              id: 'weekly-wed',
              label: 'Weekly on Wednesdays',
              rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=WE',
            },
            {
              id: 'weekly-thu',
              label: 'Weekly on Thursdays',
              rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=TH',
            },
            {
              id: 'weekly-fri',
              label: 'Weekly on Fridays',
              rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=FR',
            },
            {
              id: 'weekly-sat',
              label: 'Weekly on Saturdays',
              rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=SA',
            },
            {
              id: 'weekly-sun',
              label: 'Weekly on Sundays',
              rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=SU',
            },
            { id: 'monthly', label: 'Monthly', rrule: 'FREQ=MONTHLY;INTERVAL=1' },
            { id: 'yearly', label: 'Yearly', rrule: 'FREQ=YEARLY;INTERVAL=1' },
          ],
    [settings?.recurrencePresets]
  );

  const fullCalendarEvents = useMemo(
    () =>
      occurrences.map((occ) => ({
        id: occ.occurrenceId,
        title: occ.title,
        start: occ.startDate,
        end: occ.endDate,
        allDay: occ.allDay,
        backgroundColor: occ.color || settings?.primaryColor || '#0284C7',
        borderColor: occ.color || settings?.primaryColor || '#0284C7',
        extendedProps: {
          occurrence: occ,
        },
      })),
    [occurrences, settings?.primaryColor]
  );

  const changeFullCalendarView = useCallback((nextView: CalendarViewMode) => {
    setViewMode(nextView);
    const api = calendarRef.current?.getApi();
    if (api) {
      api.changeView(nextView);
    }
  }, []);

  const navigateCalendar = useCallback((action: 'prev' | 'today' | 'next') => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (action === 'prev') api.prev();
    else if (action === 'today') api.today();
    else api.next();
    setAnchorDate(api.getDate());
  }, []);

  const handleDatesSet = useCallback(
    (currentStart: Date, fromIso: string, toIso: string) => {
      setAnchorDate(currentStart);
      setDateWindow({ from: fromIso, to: toIso });
    },
    []
  );

  const handleSelectSlot = useCallback((startStr: string, endStr: string) => {
    setQuickStart(startStr);
    setQuickEnd(endStr);
    setShowQuickCreate(true);
  }, []);

  const handleSelectOccurrence = useCallback((occ: ExpandedCalendarOccurrence) => {
    setSelectedOccurrence(occ);
    setRescheduleDate(occ.occurrenceDate);
    setApplyToSeries(false);
  }, []);

  const handleEventDropOrResize = useCallback(
    async (
      occ: ExpandedCalendarOccurrence,
      newStartIso: string,
      newEndIso?: string
    ) => {
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
          `${t('calendar.rescheduled', 'Rescheduled')} "${occ.title}" → ${newStartIso.slice(0, 10)}`
        );
        await fetchCalendarData();
      } catch {
        setBannerMessage(
          t('calendar.error.reschedule', 'Failed to reschedule occurrence.')
        );
      }
    },
    [post, t, fetchCalendarData]
  );

  const handleQuickCreateSubmit = async () => {
    if (!quickTitle.trim() || !quickStart) return;
    try {
      const startIso = quickStart.includes('T')
        ? new Date(quickStart).toISOString()
        : `${quickStart}T10:00:00.000Z`;
      const endIso =
        quickEnd && !Number.isNaN(new Date(quickEnd).getTime())
          ? new Date(quickEnd).toISOString()
          : new Date(new Date(startIso).getTime() + 3600000).toISOString();

      await post(`/${PLUGIN_ID}/calendar/quick-create`, {
        sourceId: sourceFilter !== 'all' ? sourceFilter : undefined,
        title: quickTitle.trim(),
        startDate: startIso,
        endDate: endIso,
        location: quickLocation.trim() || undefined,
        category: quickCategory,
        rrule: quickRRule || undefined,
      });

      setShowQuickCreate(false);
      setQuickTitle('');
      setQuickLocation('');
      setQuickRRule('');
      setBannerMessage(t('calendar.created', 'Calendar entry created and published.'));
      await fetchCalendarData();
    } catch {
      setBannerMessage(t('calendar.error.create', 'Could not create calendar entry.'));
    }
  };

  const handleRescheduleSelected = async (cancelOccurrence = false) => {
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
  };

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(effectiveLocale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(anchorDate),
    [anchorDate, effectiveLocale]
  );

  const secondaryHeaderLabel = useMemo(() => {
    if (activeSecondaryCalendars.length === 0 || secondaryLangMode === 'off') {
      return '';
    }
    const anchorIso = anchorDate.toISOString().slice(0, 10);
    const targetLoc = secondaryLangMode === 'ar' ? 'ar-SA' : effectiveLocale;
    return activeSecondaryCalendars
      .map((sys) => {
        const formatted = formatDateInCalendarSystem(
          anchorIso,
          { ...sys, locale: targetLoc },
          targetLoc,
          {
            compact: false,
          }
        );
        return formatted ? `${sys.label}: ${formatted}` : '';
      })
      .filter(Boolean)
      .join(' • ');
  }, [activeSecondaryCalendars, anchorDate, effectiveLocale, secondaryLangMode]);

  const todayKey = new Date().toISOString().slice(0, 10);

  const enabledViews = useMemo(() => {
    const bundle = getLocalizedCalendarBundle(effectiveLocale);
    const list: Array<{ mode: CalendarViewMode; label: string }> = [];
    if (settings?.monthView !== false) {
      list.push({ mode: 'dayGridMonth', label: bundle.buttonText.month });
    }
    if (settings?.weekView !== false) {
      list.push({ mode: 'timeGridWeek', label: bundle.buttonText.week });
    }
    if (settings?.dayView !== false) {
      list.push({ mode: 'timeGridDay', label: bundle.buttonText.day });
    }
    if (settings?.agendaView !== false) {
      list.push({ mode: 'listMonth', label: bundle.buttonText.list });
    }
    if (settings?.yearView !== false) {
      list.push({ mode: 'multiMonthYear', label: bundle.buttonText.year });
    }
    return list;
  }, [settings, effectiveLocale]);

  return (
    <Box padding={6} background="neutral100">
      <Flex direction="column" alignItems="stretch" gap={5}>
        <CalendarToolbar
          t={t}
          effectiveLocale={effectiveLocale}
          effectiveDirection={effectiveDirection}
          localeOverride={localeOverride}
          onLocaleOverrideChange={setLocaleOverride}
          secondaryLangMode={secondaryLangMode}
          onSecondaryLangModeChange={setSecondaryLangMode}
          monthLabel={monthLabel}
          secondaryHeaderLabel={secondaryHeaderLabel}
          loading={loading}
          settings={settings}
          totalOccurrences={occurrences.length}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          availableCategories={availableCategories}
          viewMode={viewMode}
          enabledViews={enabledViews}
          onViewChange={changeFullCalendarView}
          onNavigate={navigateCalendar}
          onOpenQuickCreate={() => {
            setQuickStart(todayKey);
            setQuickEnd('');
            setShowQuickCreate(true);
          }}
        />

        {bannerMessage && (
          <Box
            padding={3}
            background="primary100"
            hasRadius
            style={{ border: '1px solid #0284C7' }}
          >
            <Flex justifyContent="space-between" alignItems="center">
              <Typography variant="omega" fontWeight="bold" textColor="primary700">
                {bannerMessage}
              </Typography>
              <Button variant="tertiary" size="S" onClick={() => setBannerMessage(null)}>
                ×</Button>
            </Flex>
          </Box>
        )}

        {showQuickCreate && (
          <QuickCreatePanel
            t={t}
            quickTitle={quickTitle}
            onQuickTitleChange={setQuickTitle}
            quickStart={quickStart}
            onQuickStartChange={setQuickStart}
            quickLocation={quickLocation}
            onQuickLocationChange={setQuickLocation}
            quickRRule={quickRRule}
            onQuickRRuleChange={setQuickRRule}
            recurrencePresets={recurrencePresets}
            onCancel={() => setShowQuickCreate(false)}
            onSubmit={handleQuickCreateSubmit}
          />
        )}

        {selectedOccurrence && (
          <OccurrenceDetailDrawer
            t={t}
            occurrence={selectedOccurrence}
            rescheduleDate={rescheduleDate}
            onRescheduleDateChange={setRescheduleDate}
            applyToSeries={applyToSeries}
            onApplyToSeriesChange={setApplyToSeries}
            onSaveReschedule={() => handleRescheduleSelected(false)}
            onCancelOccurrence={() => handleRescheduleSelected(true)}
            onClose={() => setSelectedOccurrence(null)}
          />
        )}

        <FullCalendarCanvas
          calendarRef={calendarRef}
          locale={effectiveLocale}
          direction={effectiveDirection}
          theme={settings?.theme}
          colorScheme={settings?.colorScheme}
          themePalette={settings?.themePalette}
          secondaryCalendarLanguage={secondaryLangMode}
          settings={settings}
          events={fullCalendarEvents}
          activeSecondaryCalendars={activeSecondaryCalendars}
          onDatesSet={handleDatesSet}
          onSelectSlot={handleSelectSlot}
          onSelectOccurrence={handleSelectOccurrence}
          onDropOrResizeOccurrence={handleEventDropOrResize}
        />
      </Flex>
    </Box>
  );
};

export default CalendarPage;
