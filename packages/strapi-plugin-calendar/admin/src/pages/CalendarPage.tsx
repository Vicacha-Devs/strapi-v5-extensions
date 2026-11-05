import type FullCalendar from "@fullcalendar/react";
import { Box, Button, Flex, Typography } from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

type OccItem = ExpandedCalendarOccurrence;
type SecLang = SecondaryCalendarLanguageMode;

interface CalendarApiResponse {
  data?: { occurrences?: OccItem[]; settings?: CalendarPluginSettings };
}

const getUrlParam = (key: string) =>
  typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get(key);

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
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [dateWindow, setDateWindow] = useState(buildInitialDateWindow);
  const [sourceFilter, setSourceFilter] = useState(
    () => getUrlParam("source") || "all"
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [localeOverride, setLocaleOverride] = useState("auto");
  const [secondaryLangMode, setSecondaryLangMode] = useState<SecLang>("local");

  const [occurrences, setOccurrences] = useState<OccItem[]>([]);
  const [settings, setSettings] = useState<CalendarPluginSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<OccItem | null>(
    null
  );
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [applyToSeries, setApplyToSeries] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickSourceId, setQuickSourceId] = useState("");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickStart, setQuickStart] = useState("");
  const [quickEnd, setQuickEnd] = useState("");
  const [quickLocation, setQuickLocation] = useState("");
  const [quickCategory] = useState("general");
  const [quickRRule, setQuickRRule] = useState("");
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerEmail, setQuickCustomerEmail] = useState("");
  const [quickPartySize, setQuickPartySize] = useState(1);

  const effectiveLocale = resolveFullCalendarLocale(
    locale,
    settings?.defaultLocale,
    localeOverride
  );
  const effectiveDirection = resolveCalendarDirection(
    effectiveLocale,
    settings?.direction
  );

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    const loadErrorMsg = t(
      "calendar.error.load",
      "Could not load calendar occurrences."
    );
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
      if (!payload) return;
      const loadedOccs = Array.isArray(payload.occurrences)
        ? payload.occurrences
        : [];
      setOccurrences(loadedOccs);
      const targetDocId = getUrlParam("documentId");
      const match = targetDocId
        ? loadedOccs.find((o) => o.documentId === targetDocId)
        : undefined;
      if (match) {
        setSelectedOccurrence((prev) => prev ?? match);
        setRescheduleDate((prev) => prev || match.occurrenceDate);
        calendarRef.current?.getApi()?.gotoDate(match.startDate);
      }
      if (payload.settings) {
        setSettings(payload.settings);
        if (payload.settings.secondaryCalendarLanguage) {
          setSecondaryLangMode(payload.settings.secondaryCalendarLanguage);
        }
      }
      setBannerMessage((prev) => (prev === loadErrorMsg ? null : prev));
    } catch {
      setBannerError(true);
      setBannerMessage(loadErrorMsg);
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
      const first =
        loadedSources.find((s) => s.enabled !== false) ?? loadedSources[0];
      return first ? first.id : prev;
    });
  }, [settings?.sources, sourceFilter]);

  const sourceCounts = computeSourceCounts(occurrences, settings?.sources);
  const visibleOccurrences = filterVisibleOccurrences(
    occurrences,
    sourceFilter
  );
  const availableCategories = collectAvailableCategories(
    settings?.sources,
    sourceFilter,
    visibleOccurrences
  );
  const activeSecondaryCalendars = resolveActiveSecondaryCalendars(
    secondaryLangMode,
    settings?.secondaryCalendars
  );
  const recurrencePresets = settings?.recurrencePresets?.length
    ? settings.recurrencePresets
    : FALLBACK_RECURRENCE_PRESETS;
  const fullCalendarEvents = mapOccurrencesToFullCalendarEvents(
    visibleOccurrences,
    settings?.primaryColor
  );

  const changeFullCalendarView = (nextView: CalendarViewMode) => {
    setViewMode(nextView);
    calendarRef.current?.getApi()?.changeView(nextView);
  };

  const navigateCalendar = (action: "prev" | "today" | "next") => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (action === "prev") api.prev();
    else if (action === "today") api.today();
    else api.next();
    setAnchorDate(api.getDate());
  };

  const handleDatesSet = (start: Date, from: string, to: string) => {
    setAnchorDate(start);
    const nextWin = expandDateWindowToYear(start, from, to);
    setDateWindow((prev) =>
      prev.from === nextWin.from && prev.to === nextWin.to ? prev : nextWin
    );
  };

  const scrollQuickCreateIntoView = () => {
    if (typeof window === "undefined") return;
    const opts: ScrollIntoViewOptions = {
      behavior: "smooth",
      block: "nearest",
    };
    window.setTimeout(() => quickCreateRef.current?.scrollIntoView(opts), 40);
  };

  const handleSelectSlot = (startStr: string, endStr: string) => {
    setQuickStart(startStr);
    setQuickEnd(normalizeSelectedEndSlot(startStr, endStr));
    const sources = settings?.sources ?? [];
    if (sourceFilter !== "all") {
      setQuickSourceId(sourceFilter);
    } else if (!quickSourceId && sources.length) {
      const first = sources.find((s) => s.enabled !== false) ?? sources[0];
      if (first) setQuickSourceId(first.id);
    }
    setShowQuickCreate(true);
    scrollQuickCreateIntoView();
  };

  const handleSelectOccurrence = (occ: OccItem) => {
    setSelectedOccurrence(occ);
    setRescheduleDate(occ.occurrenceDate);
    setApplyToSeries(false);
  };

  const postReschedule = (
    occ: OccItem,
    newStartDate: string,
    newEndDate?: string,
    series = false,
    cancelOccurrence = false
  ) =>
    post(`/${PLUGIN_ID}/calendar/reschedule`, {
      sourceId: occ.sourceId,
      uid: occ.uid,
      documentId: occ.documentId,
      occurrenceDate: occ.occurrenceDate,
      newStartDate,
      newEndDate,
      applyToSeries: series,
      cancelOccurrence,
    });

  const handleEventDropOrResize = async (
    occ: OccItem,
    newStartIso: string,
    newEndIso?: string
  ) => {
    try {
      await postReschedule(occ, newStartIso, newEndIso);
      setBannerError(false);
      setBannerMessage(
        `${t("calendar.rescheduled", "Rescheduled")} "${occ.title}" → ${newStartIso.slice(0, 10)}`
      );
      await fetchCalendarData();
    } catch {
      setBannerError(true);
      setBannerMessage(
        t("calendar.error.reschedule", "Failed to reschedule occurrence.")
      );
    }
  };

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
      setBannerError(false);
      setBannerMessage(
        t("calendar.created", "Calendar entry created and published.")
      );
      await fetchCalendarData();
    } catch {
      setBannerError(true);
      setBannerMessage(
        t("calendar.error.create", "Could not create calendar entry.")
      );
    }
  };

  const handleRescheduleSelected = async (cancelOccurrence = false) => {
    const occ = selectedOccurrence;
    if (!occ) return;
    try {
      const newStartIso = rescheduleDate
        ? `${rescheduleDate}${occ.startDate.slice(10)}`
        : occ.startDate;
      const diffMs =
        new Date(newStartIso).getTime() - new Date(occ.startDate).getTime();
      const newEndIso =
        !Number.isNaN(diffMs) && occ.endDate
          ? new Date(new Date(occ.endDate).getTime() + diffMs).toISOString()
          : undefined;
      await postReschedule(
        occ,
        newStartIso,
        newEndIso,
        applyToSeries,
        cancelOccurrence
      );
      setSelectedOccurrence(null);
      setBannerError(false);
      setBannerMessage(
        cancelOccurrence
          ? t("calendar.occurrenceCancelled", "Occurrence cancelled.")
          : t("calendar.rescheduled", "Schedule updated.")
      );
      await fetchCalendarData();
    } catch {
      setBannerError(true);
      setBannerMessage(
        t("calendar.error.reschedule", "Failed to update schedule.")
      );
    }
  };

  const monthLabel = new Intl.DateTimeFormat(effectiveLocale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(anchorDate);
  const secondaryHeaderLabel = buildSecondaryHeaderLabel(
    activeSecondaryCalendars,
    anchorDate,
    effectiveLocale,
    secondaryLangMode
  );
  const todayKey = new Date().toISOString().slice(0, 10);
  const enabledViews = buildEnabledCalendarViews(settings, effectiveLocale);

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
            background={bannerError ? "danger100" : "primary100"}
            hasRadius
            style={{
              border: `1px solid ${bannerError ? "#DC2626" : "#0284C7"}`,
            }}
          >
            <Flex justifyContent="space-between" alignItems="center">
              <Typography
                variant="omega"
                fontWeight="bold"
                textColor={bannerError ? "danger700" : "primary700"}
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
