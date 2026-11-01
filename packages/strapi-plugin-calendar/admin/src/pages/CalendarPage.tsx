import type FullCalendar from "@fullcalendar/react";
import { Box, Button, Flex, Typography } from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useIntl } from "react-intl";

import {
  resolveCalendarDirection,
  resolveFullCalendarLocale,
} from "../../../shared/localization";
import { PLUGIN_ID } from "../../../shared/pluginId";
import type {
  CalendarPluginSettings,
  CalendarViewMode,
  ExpandedCalendarOccurrence,
  SecondaryCalendarLanguageMode,
} from "../../../shared/types";
import {
  buildEnabledCalendarViews,
  buildInitialDateWindow,
  buildQuickCreateRequestPayload,
  buildSecondaryHeaderLabel,
  collectAvailableCategories,
  computeSourceCounts,
  expandDateWindowToYear,
  FALLBACK_RECURRENCE_PRESETS,
  filterVisibleOccurrences,
  mapOccurrencesToFullCalendarEvents,
  matchLoadedSourceId,
  normalizeSelectedEndSlot,
  resolveActiveSecondaryCalendars,
} from "../components/calendar/calendarPageHelpers";
import { CalendarToolbar } from "../components/calendar/CalendarToolbar";
import { FullCalendarCanvas } from "../components/calendar/FullCalendarCanvas";
import { OccurrenceDetailDrawer } from "../components/calendar/OccurrenceDetailDrawer";
import { QuickCreatePanel } from "../components/calendar/QuickCreatePanel";

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
  const quickCreateRef = useRef<HTMLDivElement | null>(null);

  const t = useCallback(
    (id: string, defaultMessage: string) =>
      formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }),
    [formatMessage]
  );

  const [viewMode, setViewMode] = useState<CalendarViewMode>("dayGridMonth");
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [dateWindow, setDateWindow] = useState<{ from: string; to: string }>(
    buildInitialDateWindow
  );
  const [sourceFilter, setSourceFilter] = useState<string>(() =>
    typeof window === "undefined"
      ? "all"
      : new URLSearchParams(window.location.search).get("source") || "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [localeOverride, setLocaleOverride] = useState<string>("auto");
  const [secondaryLangMode, setSecondaryLangMode] =
    useState<SecondaryCalendarLanguageMode>("local");

  const [occurrences, setOccurrences] = useState<ExpandedCalendarOccurrence[]>(
    []
  );
  const [settings, setSettings] = useState<CalendarPluginSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const [selectedOccurrence, setSelectedOccurrence] =
    useState<ExpandedCalendarOccurrence | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [applyToSeries, setApplyToSeries] = useState<boolean>(false);

  const [showQuickCreate, setShowQuickCreate] = useState<boolean>(false);
  const [quickSourceId, setQuickSourceId] = useState<string>("");
  const [quickTitle, setQuickTitle] = useState<string>("");
  const [quickStart, setQuickStart] = useState<string>("");
  const [quickEnd, setQuickEnd] = useState<string>("");
  const [quickLocation, setQuickLocation] = useState<string>("");
  const [quickCategory] = useState<string>("general");
  const [quickRRule, setQuickRRule] = useState<string>("");
  const [quickCustomerName, setQuickCustomerName] = useState<string>("");
  const [quickCustomerEmail, setQuickCustomerEmail] = useState<string>("");
  const [quickPartySize, setQuickPartySize] = useState<number>(1);

  const effectiveLocale = useMemo(
    () =>
      resolveFullCalendarLocale(
        locale,
        settings?.defaultLocale && settings.defaultLocale !== "auto"
          ? settings.defaultLocale
          : "es",
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
      if (categoryFilter !== "all") params.set("category", categoryFilter);

      const res = await get<CalendarApiResponse>(
        `/${PLUGIN_ID}/calendar?${params.toString()}`
      );
      const payload = res?.data?.data;
      if (payload) {
        const loadedOccs = Array.isArray(payload.occurrences)
          ? payload.occurrences
          : [];
        setOccurrences(loadedOccs);
        if (typeof window !== "undefined") {
          const targetDocId = new URLSearchParams(window.location.search).get(
            "documentId"
          );
          if (targetDocId) {
            const match = loadedOccs.find((o) => o.documentId === targetDocId);
            if (match) {
              setSelectedOccurrence((prev) => prev ?? match);
              setRescheduleDate((prev) => prev || match.occurrenceDate);
              calendarRef.current?.getApi()?.gotoDate(match.startDate);
            }
          }
        }
        if (payload.settings) {
          setSettings(payload.settings);
          if (payload.settings.secondaryCalendarLanguage) {
            setSecondaryLangMode(payload.settings.secondaryCalendarLanguage);
          }
        }
        const loadErrorMsg = t(
          "calendar.error.load",
          "Could not load calendar occurrences."
        );
        setBannerMessage((prev) => (prev === loadErrorMsg ? null : prev));
      }
    } catch {
      setBannerMessage(
        t("calendar.error.load", "Could not load calendar occurrences.")
      );
    } finally {
      setLoading(false);
    }
  }, [dateWindow.from, dateWindow.to, effectiveLocale, categoryFilter, get, t]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  useEffect(() => {
    const loadedSources = settings?.sources ?? [];
    if (loadedSources.length === 0) return;

    if (sourceFilter !== "all") {
      const matchedId = matchLoadedSourceId(loadedSources, sourceFilter);
      if (matchedId && matchedId !== sourceFilter) setSourceFilter(matchedId);
      setQuickSourceId(matchedId ?? sourceFilter);
      return;
    }

    setQuickSourceId((prev) => {
      if (prev && loadedSources.some((s) => s.id === prev)) return prev;
      const firstEnabled =
        loadedSources.find((s) => s.enabled !== false) ?? loadedSources[0];
      return firstEnabled ? firstEnabled.id : prev;
    });
  }, [settings?.sources, sourceFilter]);

  const sourceCounts = useMemo(
    () => computeSourceCounts(occurrences, settings?.sources),
    [occurrences, settings?.sources]
  );
  const visibleOccurrences = useMemo(
    () => filterVisibleOccurrences(occurrences, sourceFilter),
    [occurrences, sourceFilter]
  );

  const availableCategories = useMemo(
    () =>
      collectAvailableCategories(
        settings?.sources,
        sourceFilter,
        visibleOccurrences
      ),
    [visibleOccurrences, settings?.sources, sourceFilter]
  );

  const activeSecondaryCalendars = useMemo(
    () =>
      resolveActiveSecondaryCalendars(
        secondaryLangMode,
        settings?.secondaryCalendars
      ),
    [secondaryLangMode, settings?.secondaryCalendars]
  );

  const recurrencePresets = useMemo(
    () =>
      settings?.recurrencePresets && settings.recurrencePresets.length > 0
        ? settings.recurrencePresets
        : FALLBACK_RECURRENCE_PRESETS,
    [settings?.recurrencePresets]
  );

  const fullCalendarEvents = useMemo(
    () =>
      mapOccurrencesToFullCalendarEvents(
        visibleOccurrences,
        settings?.primaryColor
      ),
    [visibleOccurrences, settings?.primaryColor]
  );

  const changeFullCalendarView = useCallback((nextView: CalendarViewMode) => {
    setViewMode(nextView);
    calendarRef.current?.getApi()?.changeView(nextView);
  }, []);

  const navigateCalendar = useCallback((action: "prev" | "today" | "next") => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (action === "prev") api.prev();
    else if (action === "today") api.today();
    else api.next();
    setAnchorDate(api.getDate());
  }, []);

  const handleDatesSet = useCallback(
    (currentStart: Date, fromIso: string, toIso: string) => {
      setAnchorDate(currentStart);
      const nextWin = expandDateWindowToYear(currentStart, fromIso, toIso);
      setDateWindow((prev) =>
        prev.from === nextWin.from && prev.to === nextWin.to ? prev : nextWin
      );
    },
    []
  );

  const scrollQuickCreateIntoView = useCallback(() => {
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        quickCreateRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 40);
    }
  }, []);

  const handleSelectSlot = useCallback(
    (startStr: string, endStr: string) => {
      setQuickStart(startStr);
      setQuickEnd(normalizeSelectedEndSlot(startStr, endStr));
      if (sourceFilter !== "all") {
        setQuickSourceId(sourceFilter);
      } else if (!quickSourceId && settings?.sources?.length) {
        const firstEnabled =
          settings.sources.find((s) => s.enabled !== false) ??
          settings.sources[0];
        if (firstEnabled) setQuickSourceId(firstEnabled.id);
      }
      setShowQuickCreate(true);
      scrollQuickCreateIntoView();
    },
    [quickSourceId, scrollQuickCreateIntoView, settings?.sources, sourceFilter]
  );

  const handleSelectOccurrence = useCallback(
    (occ: ExpandedCalendarOccurrence) => {
      setSelectedOccurrence(occ);
      setRescheduleDate(occ.occurrenceDate);
      setApplyToSeries(false);
    },
    []
  );

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
          `${t("calendar.rescheduled", "Rescheduled")} "${occ.title}" → ${newStartIso.slice(0, 10)}`
        );
        await fetchCalendarData();
      } catch {
        setBannerMessage(
          t("calendar.error.reschedule", "Failed to reschedule occurrence.")
        );
      }
    },
    [post, t, fetchCalendarData]
  );

  const handleQuickCreateSubmit = async () => {
    if (!quickTitle.trim() || !quickStart) return;
    try {
      const payload = buildQuickCreateRequestPayload({
        quickSourceId,
        sourceFilter,
        quickTitle,
        quickStart,
        quickEnd,
        quickLocation,
        quickCategory,
        quickRRule,
        quickCustomerName,
        quickCustomerEmail,
        quickPartySize,
      });
      await post(`/${PLUGIN_ID}/calendar/quick-create`, payload);

      setShowQuickCreate(false);
      setQuickTitle("");
      setQuickLocation("");
      setQuickRRule("");
      setQuickCustomerName("");
      setQuickCustomerEmail("");
      setQuickPartySize(1);
      setBannerMessage(
        t("calendar.created", "Calendar entry created and published.")
      );
      await fetchCalendarData();
    } catch {
      setBannerMessage(
        t("calendar.error.create", "Could not create calendar entry.")
      );
    }
  };

  const handleRescheduleSelected = async (cancelOccurrence = false) => {
    if (!selectedOccurrence) return;
    try {
      const newStartIso = rescheduleDate
        ? `${rescheduleDate}${selectedOccurrence.startDate.slice(10)}`
        : selectedOccurrence.startDate;
      const startDiffMs =
        new Date(newStartIso).getTime() -
        new Date(selectedOccurrence.startDate).getTime();
      const newEndIso =
        !Number.isNaN(startDiffMs) && selectedOccurrence.endDate
          ? new Date(
              new Date(selectedOccurrence.endDate).getTime() + startDiffMs
            ).toISOString()
          : undefined;
      await post(`/${PLUGIN_ID}/calendar/reschedule`, {
        sourceId: selectedOccurrence.sourceId,
        uid: selectedOccurrence.uid,
        documentId: selectedOccurrence.documentId,
        occurrenceDate: selectedOccurrence.occurrenceDate,
        newStartDate: newStartIso,
        newEndDate: newEndIso,
        applyToSeries,
        cancelOccurrence,
      });
      setSelectedOccurrence(null);
      setBannerMessage(
        cancelOccurrence
          ? t("calendar.occurrenceCancelled", "Occurrence cancelled.")
          : t("calendar.rescheduled", "Schedule updated.")
      );
      await fetchCalendarData();
    } catch {
      setBannerMessage(
        t("calendar.error.reschedule", "Failed to update schedule.")
      );
    }
  };

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(effectiveLocale, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(anchorDate),
    [anchorDate, effectiveLocale]
  );
  const secondaryHeaderLabel = useMemo(
    () =>
      buildSecondaryHeaderLabel(
        activeSecondaryCalendars,
        anchorDate,
        effectiveLocale,
        secondaryLangMode
      ),
    [activeSecondaryCalendars, anchorDate, effectiveLocale, secondaryLangMode]
  );
  const todayKey = new Date().toISOString().slice(0, 10);
  const enabledViews = useMemo(
    () => buildEnabledCalendarViews(settings, effectiveLocale),
    [settings, effectiveLocale]
  );

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
          sourceCounts={sourceCounts}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          availableCategories={availableCategories}
          viewMode={viewMode}
          enabledViews={enabledViews}
          onViewChange={changeFullCalendarView}
          onNavigate={navigateCalendar}
          onOpenQuickCreate={(targetSourceId?: string) => {
            if (targetSourceId) setQuickSourceId(targetSourceId);
            else if (sourceFilter !== "all") setQuickSourceId(sourceFilter);
            setQuickStart((prev) => prev || todayKey);
            setQuickEnd("");
            setShowQuickCreate(true);
            scrollQuickCreateIntoView();
          }}
        />

        {bannerMessage && (
          <Box
            padding={3}
            background="primary100"
            hasRadius
            style={{ border: "1px solid #0284C7" }}
          >
            <Flex justifyContent="space-between" alignItems="center">
              <Typography
                variant="omega"
                fontWeight="bold"
                textColor="primary700"
              >
                {bannerMessage}
              </Typography>
              <Button
                variant="tertiary"
                size="S"
                onClick={() => setBannerMessage(null)}
              >
                ×
              </Button>
            </Flex>
          </Box>
        )}

        {showQuickCreate && (
          <div ref={quickCreateRef}>
            <QuickCreatePanel
              t={t}
              sources={settings?.sources ?? []}
              selectedSourceId={quickSourceId}
              onSelectedSourceIdChange={setQuickSourceId}
              quickTitle={quickTitle}
              onQuickTitleChange={setQuickTitle}
              quickStart={quickStart}
              onQuickStartChange={setQuickStart}
              quickEnd={quickEnd}
              onQuickEndChange={setQuickEnd}
              quickLocation={quickLocation}
              onQuickLocationChange={setQuickLocation}
              quickRRule={quickRRule}
              onQuickRRuleChange={setQuickRRule}
              quickCustomerName={quickCustomerName}
              onQuickCustomerNameChange={setQuickCustomerName}
              quickCustomerEmail={quickCustomerEmail}
              onQuickCustomerEmailChange={setQuickCustomerEmail}
              quickPartySize={quickPartySize}
              onQuickPartySizeChange={setQuickPartySize}
              recurrencePresets={recurrencePresets}
              onCancel={() => setShowQuickCreate(false)}
              onSubmit={handleQuickCreateSubmit}
            />
          </div>
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
