import React, { useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import type {
  DateClickArg,
  DateSelectArg,
  DatesSetArg,
  DayCellContentArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  LocaleInput,
} from '@fullcalendar/core';
import allLocales from '@fullcalendar/core/locales-all';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import { Box } from '@strapi/design-system';
import { formatDateInCalendarSystem } from '../../../../shared/calendarSystems';
import {
  buildFullCalendarTimeFormat,
  getLocalizedCalendarBundle,
  resolveCalendarDirection,
  resolveLocaleFirstDay,
  SUPPORTED_CALENDAR_LOCALES,
} from '../../../../shared/localization';
import type {
  CalendarDirection,
  CalendarPluginSettings,
  CalendarSystemConfig,
  ExpandedCalendarOccurrence,
} from '../../../../shared/types';

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
  dayGridMonth: {
    dayMaxEventRows: 4,
  },
  multiMonthYear: {
    multiMonthMaxColumns: 3,
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
  const occ = eventArg.event.extendedProps
    ?.occurrence as ExpandedCalendarOccurrence | undefined;
  return (
    <div
      style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        padding: '1px 4px',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {occ?.isRecurring ? '↻ ' : ''}
      {eventArg.timeText ? <b>{eventArg.timeText} </b> : null}
      <span>{eventArg.event.title}</span>
    </div>
  );
}

export interface FullCalendarCanvasProps {
  calendarRef: React.RefObject<FullCalendar | null>;
  locale: string;
  direction?: CalendarDirection;
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

export const FullCalendarCanvas: React.FC<FullCalendarCanvasProps> = ({
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
}) => {
  const localeBundle = useMemo(
    () => getLocalizedCalendarBundle(locale),
    [locale]
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
      if (settings?.showCreateButton !== false) {
        onSelectSlot(clickInfo.dateStr, '');
      }
    },
    [onSelectSlot, settings?.showCreateButton]
  );

  const handleSelect = useCallback(
    (selectInfo: DateSelectArg) => {
      onSelectSlot(selectInfo.startStr, selectInfo.endStr);
    },
    [onSelectSlot]
  );

  const handleEventClick = useCallback(
    (clickInfo: EventClickArg) => {
      const occ = clickInfo.event.extendedProps
        ?.occurrence as ExpandedCalendarOccurrence | undefined;
      if (occ) {
        onSelectOccurrence(occ);
      }
    },
    [onSelectOccurrence]
  );

  const handleEventDropOrResize = useCallback(
    (arg: EventDropArg) => {
      const occ = arg.event.extendedProps
        ?.occurrence as ExpandedCalendarOccurrence | undefined;
      if (occ && arg.event.start) {
        onDropOrResizeOccurrence(
          occ,
          arg.event.start.toISOString(),
          arg.event.end?.toISOString()
        );
      }
    },
    [onDropOrResizeOccurrence]
  );

  const renderDayCellContent = useCallback(
    (cellArg: DayCellContentArg) => {
      const dateKey = cellArg.date.toISOString().slice(0, 10);
      const secondaryBadges = activeSecondaryCalendars
        .map((sys) =>
          formatDateInCalendarSystem(dateKey, sys, localeBundle.code, {
            compact: true,
          })
        )
        .filter(Boolean);

      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            gap: 4,
          }}
        >
          <span style={{ fontWeight: 700 }}>{cellArg.dayNumberText}</span>
          {secondaryBadges.length > 0 && (
            <span
              style={{
                fontSize: 10,
                color: '#666687',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {secondaryBadges.join(' · ')}
            </span>
          )}
        </div>
      );
    },
    [activeSecondaryCalendars, localeBundle.code]
  );

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="tableShadow"
      padding={4}
      style={{ direction: effectiveDirection }}
    >
      <FullCalendar
        ref={calendarRef}
        plugins={FULLCALENDAR_PLUGINS}
        views={VIEW_SPECIFIC_OPTIONS}
        initialView={settings?.defaultView || 'dayGridMonth'}
        headerToolbar={false}
        locales={ALL_CALENDAR_LOCALES}
        locale={localeBundle.code}
        direction={effectiveDirection}
        firstDay={effectiveFirstDay}
        weekNumbers={settings?.weekNumbers ?? false}
        weekNumberCalculation={settings?.weekNumberCalculation ?? 'ISO'}
        weekText={localeBundle.weekText}
        allDayText={localeBundle.allDayText}
        moreLinkText={localeBundle.moreLinkText}
        noEventsText={localeBundle.noEventsText}
        buttonText={localeBundle.buttonText}
        eventTimeFormat={timeFormat}
        slotLabelFormat={timeFormat}
        weekends={settings?.showWeekends ?? true}
        slotMinTime={settings?.startHour || '07:00:00'}
        slotMaxTime={settings?.endHour || '21:00:00'}
        slotDuration={settings?.slotDuration || '00:30:00'}
        businessHours={settings?.businessHours || true}
        nowIndicator={true}
        editable={true}
        selectable={settings?.showCreateButton !== false}
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
    </Box>
  );
};

export default FullCalendarCanvas;
