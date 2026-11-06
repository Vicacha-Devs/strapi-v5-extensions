import type {
  DateSelectArg,
  DatesSetArg,
  DayCellContentArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  LocaleInput,
} from "@fullcalendar/core";
import allLocales from "@fullcalendar/core/locales-all";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, {
  type DateClickArg,
} from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import multiMonthPlugin from "@fullcalendar/multimonth";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Box } from "@strapi/design-system";
import React, { useCallback, useMemo } from "react";
import { useTheme } from "styled-components";

import {
  buildFullCalendarTimeFormat,
  getLocalizedCalendarBundle,
  resolveCalendarDirection,
  resolveLocaleFirstDay,
  SUPPORTED_CALENDAR_LOCALES,
} from "../../../../shared/localization";
import {
  detectEffectiveColorScheme,
  resolveCalendarTheme,
  type CalendarColorPaletteId,
  type CalendarColorScheme,
  type CalendarDirection,
  type CalendarPluginSettings,
  type CalendarSystemConfig,
  type CalendarThemePreset,
  type ExpandedCalendarOccurrence,
  type SecondaryCalendarLanguageMode,
} from "../../../../shared/types";
import { buildCalendarThemeCss } from "./calendarThemeStyles";
import {
  buildDayHeaderStyle,
  buildDayNumberBadgeStyle,
  computeSecondaryBadges,
  DayCellMetaBadges,
} from "./FullCalendarDayCell";

/**
 * Defined outside the component per FullCalendar React documentation
 * ("Modifying Props") so plugin & locale array references stay stable across renders.
 */
const FULLCALENDAR_PLUGINS = [
  dayGridPlugin,
  timeGridPlugin,
  listPlugin,
  multiMonthPlugin,
  interactionPlugin,
];

const VIEW_SPECIFIC_OPTIONS: Record<string, Record<string, unknown>> = {
  dayGridMonth: { dayMaxEventRows: 3 },
  listMonth: { type: "list", duration: { years: 1 } },
  multiMonthYear: {
    type: "multiMonth",
    duration: { years: 1 },
    multiMonthMaxColumns: 3,
    multiMonthMinWidth: 300,
    dayMaxEventRows: 2,
    weekNumbers: false,
  },
  multiMonthYearStacked: {
    type: "multiMonth",
    duration: { years: 1 },
    multiMonthMaxColumns: 1,
    dayMaxEventRows: 3,
  },
  dayGridYear: {
    type: "dayGrid",
    duration: { years: 1 },
    dayMaxEventRows: 3,
  },
};

const ALL_CALENDAR_LOCALES: LocaleInput[] = (() => {
  const builtInMap = new Map<string, LocaleInput>();
  if (Array.isArray(allLocales)) {
    for (const loc of allLocales) {
      if (loc && loc.code) {
        builtInMap.set(loc.code.toLowerCase(), loc);
      }
    }
  }
  for (const customLoc of SUPPORTED_CALENDAR_LOCALES) {
    builtInMap.set(customLoc.code.toLowerCase(), customLoc);
  }
  return Array.from(builtInMap.values());
})();

/**
 * Pure JSX Content Injection function defined outside the component
 * per https://fullcalendar.io/docs/react#content-injection
 */
function renderEventContent(eventArg: EventContentArg) {
  const occ = eventArg.event.extendedProps?.occurrence as
    | ExpandedCalendarOccurrence
    | undefined;
  const isCompactYear = eventArg.view?.type === "multiMonthYear";
  const tooltip = [eventArg.timeText, eventArg.event.title]
    .filter(Boolean)
    .join(" • ");
  return (
    <div
      className="vicacha-fc-event-inner"
      title={tooltip}
      style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        padding: isCompactYear ? "1px 4px" : "2px 6px",
        fontSize: isCompactYear ? 11 : 12,
        fontWeight: 600,
        lineHeight: 1.3,
      }}
    >
      {occ?.isRecurring ? "↻ " : ""}
      {!isCompactYear && eventArg.timeText ? (
        <b className="vicacha-fc-event-time">{eventArg.timeText} </b>
      ) : null}
      <span className="vicacha-fc-event-title">{eventArg.event.title}</span>
    </div>
  );
}

function resolveVisualKeys(
  props: Pick<
    FullCalendarCanvasProps,
    | "theme"
    | "colorScheme"
    | "themePalette"
    | "secondaryCalendarLanguage"
    | "settings"
  >
) {
  const { settings } = props;
  return {
    activeThemeKey: (props.theme ??
      settings?.theme ??
      "breeze") as CalendarThemePreset,
    configuredColorScheme: (props.colorScheme ??
      settings?.colorScheme ??
      "auto") as CalendarColorScheme,
    activePaletteKey: (props.themePalette ??
      settings?.themePalette ??
      "default") as CalendarColorPaletteId,
    effectiveSecondaryLang: (props.secondaryCalendarLanguage ??
      settings?.secondaryCalendarLanguage ??
      "local") as SecondaryCalendarLanguageMode,
    allowCreate: settings?.showCreateButton !== false,
  };
}

function buildCalendarGridConfig(settings: CalendarPluginSettings | null): {
  initialView: string;
  weekNumbers: boolean;
  weekNumberCalculation: "local" | "ISO";
  weekends: boolean;
  slotMinTime: string;
  slotMaxTime: string;
  slotDuration: string;
  businessHours: boolean | unknown[];
} {
  return {
    initialView: settings?.defaultView || "dayGridMonth",
    weekNumbers: settings?.weekNumbers ?? false,
    weekNumberCalculation: settings?.weekNumberCalculation ?? "ISO",
    weekends: settings?.showWeekends ?? true,
    slotMinTime: settings?.startHour || "07:00:00",
    slotMaxTime: settings?.endHour || "21:00:00",
    slotDuration: settings?.slotDuration || "00:30:00",
    businessHours: settings?.businessHours || true,
  };
}

export interface FullCalendarCanvasProps {
  calendarRef: React.RefObject<FullCalendar | null>;
  locale: string;
  direction?: CalendarDirection;
  theme?: CalendarThemePreset;
  colorScheme?: CalendarColorScheme;
  themePalette?: CalendarColorPaletteId;
  secondaryCalendarLanguage?: SecondaryCalendarLanguageMode;
  settings: CalendarPluginSettings | null;
  events: Array<Record<string, unknown>>;
  activeSecondaryCalendars: CalendarSystemConfig[];
  onDatesSet: (currentStart: Date, fromIso: string, toIso: string) => void;
  onSelectSlot: (startStr: string, endStr: string) => void;
  onSelectOccurrence: (occurrence: ExpandedCalendarOccurrence) => void;
  onDropOrResizeOccurrence: (
    occurrence: ExpandedCalendarOccurrence,
    newStartIso: string,
    newEndIso?: string
  ) => void;
}

export const FullCalendarCanvas: React.FC<FullCalendarCanvasProps> = (
  props
) => {
  const {
    calendarRef,
    locale,
    direction,
    settings,
    events,
    activeSecondaryCalendars,
    onDatesSet,
    onSelectSlot,
    onSelectOccurrence,
    onDropOrResizeOccurrence,
  } = props;
  const styledTheme = useTheme() as
    | { colors?: { neutral0?: string } }
    | undefined;
  const strapiNeutral0 = styledTheme?.colors?.neutral0;

  const localeBundle = useMemo(
    () => getLocalizedCalendarBundle(locale),
    [locale]
  );
  const {
    activeThemeKey,
    configuredColorScheme,
    activePaletteKey,
    effectiveSecondaryLang,
    allowCreate,
  } = resolveVisualKeys(props);

  const activeColorScheme = detectEffectiveColorScheme(
    configuredColorScheme,
    strapiNeutral0
  );

  const activeTheme = useMemo(
    () =>
      resolveCalendarTheme(
        activeThemeKey,
        activeColorScheme,
        activePaletteKey,
        strapiNeutral0
      ),
    [activeThemeKey, activeColorScheme, activePaletteKey, strapiNeutral0]
  );

  const effectiveDirection = useMemo<CalendarDirection>(
    () => direction ?? resolveCalendarDirection(locale, settings?.direction),
    [direction, locale, settings?.direction]
  );

  const effectiveFirstDay = useMemo(
    () => resolveLocaleFirstDay(locale, settings?.firstDayOfWeek),
    [locale, settings?.firstDayOfWeek]
  );

  const timeFormat = useMemo(
    () => buildFullCalendarTimeFormat(settings?.timeFormat24h ?? true),
    [settings?.timeFormat24h]
  );

  const gridConfig = useMemo(
    () => buildCalendarGridConfig(settings),
    [settings]
  );

  const handleDatesSet = useCallback(
    (dateInfo: DatesSetArg) => {
      onDatesSet(
        dateInfo.view.currentStart,
        dateInfo.start.toISOString(),
        dateInfo.end.toISOString()
      );
    },
    [onDatesSet]
  );

  const handleDateClick = useCallback(
    (clickInfo: DateClickArg) => {
      if (allowCreate) onSelectSlot(clickInfo.dateStr, "");
    },
    [allowCreate, onSelectSlot]
  );

  const handleSelect = useCallback(
    (selectInfo: DateSelectArg) => {
      if (allowCreate) onSelectSlot(selectInfo.startStr, selectInfo.endStr);
    },
    [allowCreate, onSelectSlot]
  );

  const handleEventClick = useCallback(
    (clickInfo: EventClickArg) => {
      const occ = clickInfo.event.extendedProps?.occurrence as
        | ExpandedCalendarOccurrence
        | undefined;
      if (occ) onSelectOccurrence(occ);
    },
    [onSelectOccurrence]
  );

  const handleEventDropOrResize = useCallback(
    (arg: EventDropArg) => {
      const occ = arg.event.extendedProps?.occurrence as
        | ExpandedCalendarOccurrence
        | undefined;
      if (!occ || !arg.event.start) return;
      const startIso = arg.event.allDay
        ? `${arg.event.start.toISOString().slice(0, 10)}T00:00:00.000Z`
        : arg.event.start.toISOString();
      let endIso = arg.event.end?.toISOString();
      if (arg.event.allDay && arg.event.end) {
        const inclusiveEnd = new Date(arg.event.end.getTime() - 86_400_000);
        endIso = `${inclusiveEnd.toISOString().slice(0, 10)}T23:59:59.000Z`;
      }
      onDropOrResizeOccurrence(occ, startIso, endIso);
    },
    [onDropOrResizeOccurrence]
  );

  const renderDayCellContent = useCallback(
    (cellArg: DayCellContentArg) => {
      const dateKey = cellArg.date.toISOString().slice(0, 10);
      const secondaryBadges = computeSecondaryBadges(
        dateKey,
        effectiveSecondaryLang,
        localeBundle.code,
        activeSecondaryCalendars
      );
      const cleanDayNumber =
        cellArg.dayNumberText.replace(/[^\d٠-٩]/g, "") || cellArg.dayNumberText;
      const isCompactYear = cellArg.view?.type === "multiMonthYear";
      const secondarySummary = secondaryBadges.join(" · ");
      const tooltipParts = [
        dateKey,
        secondarySummary,
        allowCreate ? "+" : "",
      ].filter(Boolean);

      return (
        <div
          className="vicacha-fc-day-header"
          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            if (allowCreate) {
              e.stopPropagation();
              onSelectSlot(dateKey, "");
            }
          }}
          title={tooltipParts.join(" • ")}
          style={buildDayHeaderStyle(
            activeTheme,
            isCompactYear,
            secondaryBadges.length > 0,
            allowCreate
          )}
        >
          <span
            style={buildDayNumberBadgeStyle(
              activeTheme,
              isCompactYear,
              Boolean(cellArg.isToday)
            )}
          >
            {cleanDayNumber}
          </span>
          {!isCompactYear && (
            <DayCellMetaBadges
              secondarySummary={secondarySummary}
              effectiveSecondaryLang={effectiveSecondaryLang}
              activeTheme={activeTheme}
              allowCreate={allowCreate}
            />
          )}
        </div>
      );
    },
    [
      activeSecondaryCalendars,
      activeTheme,
      allowCreate,
      effectiveSecondaryLang,
      localeBundle.code,
      onSelectSlot,
    ]
  );

  const themeCss = useMemo(
    () => buildCalendarThemeCss(activeTheme, allowCreate),
    [activeTheme, allowCreate]
  );

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="tableShadow"
      padding={4}
      style={{ direction: effectiveDirection }}
    >
      <style>{themeCss}</style>
      <div
        className={`vicacha-fc-container vicacha-fc-theme-${activeTheme.id}`}
        data-color-scheme={activeColorScheme}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={FULLCALENDAR_PLUGINS}
          views={VIEW_SPECIFIC_OPTIONS}
          initialView={gridConfig.initialView}
          headerToolbar={false}
          locales={ALL_CALENDAR_LOCALES}
          locale={localeBundle.code}
          direction={effectiveDirection}
          firstDay={effectiveFirstDay}
          weekNumbers={gridConfig.weekNumbers}
          weekNumberCalculation={gridConfig.weekNumberCalculation}
          weekText={localeBundle.weekText}
          allDayText={localeBundle.allDayText}
          moreLinkText={localeBundle.moreLinkText}
          noEventsText={localeBundle.noEventsText}
          buttonText={localeBundle.buttonText}
          eventTimeFormat={timeFormat}
          slotLabelFormat={timeFormat}
          weekends={gridConfig.weekends}
          slotMinTime={gridConfig.slotMinTime}
          slotMaxTime={gridConfig.slotMaxTime}
          slotDuration={gridConfig.slotDuration}
          businessHours={gridConfig.businessHours}
          nowIndicator={true}
          editable={true}
          selectable={allowCreate}
          selectMirror={true}
          dayMaxEvents={true}
          height="auto"
          events={events}
          datesSet={handleDatesSet}
          dateClick={handleDateClick}
          select={handleSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDropOrResize}
          eventResize={handleEventDropOrResize}
          dayCellContent={renderDayCellContent}
          eventContent={renderEventContent}
        />
      </div>
    </Box>
  );
};

export default FullCalendarCanvas;
