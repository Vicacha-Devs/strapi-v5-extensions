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
import { useTheme } from 'styled-components';
import { formatDateInCalendarSystem } from '../../../../shared/calendarSystems';
import {
  buildFullCalendarTimeFormat,
  getLocalizedCalendarBundle,
  resolveCalendarDirection,
  resolveLocaleFirstDay,
  SUPPORTED_CALENDAR_LOCALES,
} from '../../../../shared/localization';
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
    type: 'multiMonth',
    duration: { years: 1 },
    multiMonthMaxColumns: 3,
  },
  multiMonthYearStacked: {
    type: 'multiMonth',
    duration: { years: 1 },
    multiMonthMaxColumns: 1,
  },
  dayGridYear: {
    type: 'dayGrid',
    duration: { years: 1 },
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
      className="vicacha-fc-event-inner"
      style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        padding: '2px 6px',
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.35,
      }}
    >
      {occ?.isRecurring ? '↻ ' : ''}
      {eventArg.timeText ? (
        <b className="vicacha-fc-event-time">{eventArg.timeText} </b>
      ) : null}
      <span className="vicacha-fc-event-title">{eventArg.event.title}</span>
    </div>
  );
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

export const FullCalendarCanvas: React.FC<FullCalendarCanvasProps> = ({
  calendarRef,
  locale,
  direction,
  theme,
  colorScheme,
  themePalette,
  secondaryCalendarLanguage,
  settings,
  events,
  activeSecondaryCalendars,
  onDatesSet,
  onSelectSlot,
  onSelectOccurrence,
  onDropOrResizeOccurrence,
}) => {
  const styledTheme = useTheme() as { colors?: { neutral0?: string } } | undefined;
  const strapiNeutral0 = styledTheme?.colors?.neutral0;

  const localeBundle = useMemo(
    () => getLocalizedCalendarBundle(locale),
    [locale]
  );

  const activeThemeKey: CalendarThemePreset =
    theme ?? settings?.theme ?? 'breeze';
  const configuredColorScheme: CalendarColorScheme =
    colorScheme ?? settings?.colorScheme ?? 'auto';
  const activeColorScheme = detectEffectiveColorScheme(
    configuredColorScheme,
    strapiNeutral0
  );
  const activePaletteKey: CalendarColorPaletteId =
    themePalette ?? settings?.themePalette ?? 'default';

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

  const effectiveSecondaryLang: SecondaryCalendarLanguageMode =
    secondaryCalendarLanguage ?? settings?.secondaryCalendarLanguage ?? 'local';

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
      const targetSecondaryLocale =
        effectiveSecondaryLang === 'ar' ? 'ar-SA' : localeBundle.code;

      const secondaryBadges =
        effectiveSecondaryLang === 'off'
          ? []
          : activeSecondaryCalendars
              .map((sys) =>
                formatDateInCalendarSystem(
                  dateKey,
                  {
                    ...sys,
                    locale:
                      effectiveSecondaryLang === 'ar'
                        ? 'ar-SA'
                        : sys.locale || targetSecondaryLocale,
                  },
                  targetSecondaryLocale,
                  {
                    compact: true,
                  }
                )
              )
              .filter(Boolean);

      const cleanDayNumber =
        cellArg.dayNumberText.replace(/[^\d٠-٩]/g, '') ||
        cellArg.dayNumberText;

      const isEndAligned = activeTheme.dayNumberAlign === 'end';
      const isCenterAligned = activeTheme.dayNumberAlign === 'center';

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: isEndAligned ? 'row-reverse' : 'row',
            justifyContent:
              isCenterAligned && secondaryBadges.length === 0
                ? 'center'
                : 'space-between',
            alignItems: 'center',
            width: '100%',
            gap: 6,
            padding: '2px 4px',
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: activeTheme.id === 'monarch' ? 13.5 : 13,
              lineHeight: 1.2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 26,
              height: 26,
              borderRadius:
                activeTheme.id === 'forma' && !cellArg.isToday
                  ? '3px'
                  : '999px',
              padding: '0 6px',
              background: cellArg.isToday
                ? activeTheme.todayNumberBg
                : 'transparent',
              color: cellArg.isToday
                ? activeTheme.todayNumberText
                : activeTheme.cellText,
            }}
          >
            {cleanDayNumber}
          </span>
          {secondaryBadges.length > 0 && (
            <span
              dir={effectiveSecondaryLang === 'ar' ? 'rtl' : 'auto'}
              style={{
                fontSize: 11,
                background: activeTheme.badgeBg,
                color: activeTheme.badgeText,
                border: `1px solid ${activeTheme.badgeBorder}`,
                borderRadius: activeTheme.id === 'forma' ? '4px' : '999px',
                padding: '1px 8px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                lineHeight: 1.35,
              }}
            >
              {secondaryBadges.join(' · ')}
            </span>
          )}
        </div>
      );
    },
    [
      activeSecondaryCalendars,
      activeTheme,
      effectiveSecondaryLang,
      localeBundle.code,
    ]
  );

  const themeCss = useMemo(() => {
    const scope = `.vicacha-fc-container.vicacha-fc-theme-${activeTheme.id}`;
    const radius = activeTheme.containerRadius ?? '10px';
    const shadow = activeTheme.containerShadow ?? 'none';
    const evtRadius = activeTheme.eventRadius ?? '6px';
    const fontFamily =
      activeTheme.fontFamily ?? "'Inter Variable', Inter, system-ui, sans-serif";

    let eventRules = '';
    if (activeTheme.eventStyle === 'tinted') {
      // FullCalendar Breezy / Shadcn soft-tinted event style
      eventRules = `
        ${scope} .fc-daygrid-event,
        ${scope} .fc-timegrid-event {
          border-radius: ${evtRadius} !important;
          border-width: 1px !important;
          border-style: solid !important;
          background: color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 20%, ${activeTheme.cellBg}) !important;
          border-color: color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 45%, ${activeTheme.borderColor}) !important;
          color: color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 72%, ${activeTheme.cellText}) !important;
          box-shadow: none !important;
        }
        ${scope} .fc-daygrid-event .fc-event-main,
        ${scope} .fc-timegrid-event .fc-event-main,
        ${scope} .fc-daygrid-event .vicacha-fc-event-inner,
        ${scope} .fc-timegrid-event .vicacha-fc-event-inner {
          color: color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 75%, ${activeTheme.cellText}) !important;
        }
      `;
    } else if (activeTheme.eventStyle === 'accent-bar') {
      // FullCalendar Forma 6px left-accent bar style
      eventRules = `
        ${scope} .fc-daygrid-event,
        ${scope} .fc-timegrid-event {
          border-radius: ${evtRadius} !important;
          border-top: 1px solid color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 32%, transparent) !important;
          border-bottom: 1px solid color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 32%, transparent) !important;
          border-inline-end: 1px solid color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 32%, transparent) !important;
          border-inline-start: 6px solid var(--fc-event-bg-color, ${activeTheme.primaryColor}) !important;
          background: color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 24%, ${activeTheme.cellBg}) !important;
          color: ${activeTheme.cellText} !important;
          box-shadow: none !important;
        }
        ${scope} .fc-daygrid-event .fc-event-main,
        ${scope} .fc-timegrid-event .fc-event-main,
        ${scope} .fc-daygrid-event .vicacha-fc-event-inner,
        ${scope} .fc-timegrid-event .vicacha-fc-event-inner {
          color: ${activeTheme.cellText} !important;
        }
      `;
    } else {
      // FullCalendar Monarch / Pulse / Classic / MUI solid high-contrast event style
      eventRules = `
        ${scope} .fc-daygrid-event,
        ${scope} .fc-timegrid-event {
          border-radius: ${evtRadius} !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08) !important;
        }
      `;
    }

    const todayCellRule =
      activeTheme.todayHeaderAccent === 'top-bar'
        ? `
          ${scope} .fc-daygrid-day.fc-day-today {
            background: ${activeTheme.todayBg} !important;
            box-shadow: inset 0 4px 0 0 ${activeTheme.todayBorder} !important;
          }
          ${scope} .fc-col-header-cell.fc-day-today {
            box-shadow: inset 0 4px 0 0 ${activeTheme.todayBorder} !important;
          }
        `
        : activeTheme.id === 'monarch' || activeTheme.id === 'pulse'
          ? `
            ${scope} .fc-daygrid-day.fc-day-today {
              background: ${activeTheme.todayBg} !important;
            }
          `
          : `
            ${scope} .fc-daygrid-day.fc-day-today {
              background: ${activeTheme.todayBg} !important;
              box-shadow: inset 0 0 0 2px ${activeTheme.todayBorder} !important;
            }
          `;

    return `
    ${scope} {
      --fc-border-color: ${activeTheme.borderColor};
      --fc-page-bg-color: ${activeTheme.cellBg};
      --fc-neutral-bg-color: ${activeTheme.cellAltBg};
      --fc-today-bg-color: ${activeTheme.todayBg};
      --fc-highlight-color: ${activeTheme.cellHoverBg};
      --fc-now-indicator-color: ${activeTheme.id === 'pulse' ? '#EF4444' : activeTheme.primaryColor};
      font-family: ${fontFamily};
      background: ${activeTheme.cellBg};
      color: ${activeTheme.cellText};
      border-radius: ${radius};
      border: 1px solid ${activeTheme.borderColor};
      box-shadow: ${shadow};
      overflow: hidden;
    }
    ${scope} .fc-theme-standard th,
    ${scope} .fc-col-header-cell {
      background: ${activeTheme.headerBg} !important;
      color: ${activeTheme.headerText} !important;
      border-color: ${activeTheme.borderColor} !important;
      padding: ${activeTheme.id === 'monarch' ? '12px 4px' : '10px 4px'} !important;
    }
    ${scope} .fc-col-header-cell-cushion {
      color: ${activeTheme.headerText} !important;
      font-weight: ${activeTheme.id === 'pulse' ? 600 : 700} !important;
      font-size: 12px !important;
      text-transform: ${activeTheme.id === 'forma' ? 'none' : 'uppercase'} !important;
      letter-spacing: ${activeTheme.id === 'forma' ? '0' : '0.04em'} !important;
      text-decoration: none !important;
    }
    ${scope} .fc-daygrid-day {
      background: ${activeTheme.cellBg} !important;
      color: ${activeTheme.cellText} !important;
      border-color: ${activeTheme.borderColor} !important;
      transition: background-color 0.15s ease;
    }
    ${scope} .fc-daygrid-day:hover {
      background: ${activeTheme.cellHoverBg} !important;
    }
    ${scope} .fc-daygrid-day.fc-day-other {
      background: ${activeTheme.cellAltBg} !important;
      opacity: 0.72;
    }
    ${todayCellRule}
    ${eventRules}
    ${scope} .fc-daygrid-day-top {
      flex-direction: row !important;
      width: 100% !important;
      padding: 4px 4px 2px !important;
    }
    ${scope} .fc-daygrid-day-number {
      width: 100% !important;
      padding: 0 !important;
      color: ${activeTheme.cellText} !important;
      text-decoration: none !important;
    }
    ${scope} .fc-daygrid-day-frame {
      min-height: 98px !important;
      padding: 2px !important;
    }
    ${scope} .fc-timegrid-slot,
    ${scope} .fc-timegrid-axis,
    ${scope} .fc-scrollgrid {
      border-color: ${activeTheme.borderColor} !important;
      color: ${activeTheme.cellText} !important;
      background: ${activeTheme.cellBg} !important;
    }
    ${scope} .fc-timegrid-slot-minor {
      border-top-style: dotted !important;
    }
    ${scope} .fc-timegrid-slot-label-cushion,
    ${scope} .fc-list-day-text,
    ${scope} .fc-list-day-side-text {
      color: ${activeTheme.headerText} !important;
      font-weight: 600 !important;
      text-decoration: none !important;
    }
    ${scope} .fc-list-day-cushion {
      background: ${activeTheme.headerBg} !important;
      ${activeTheme.id === 'forma' ? `border-inline-start: 4px solid ${activeTheme.primaryColor} !important;` : ''}
    }
    ${scope} .fc-list-event td {
      background: ${activeTheme.cellBg} !important;
      color: ${activeTheme.cellText} !important;
      border-color: ${activeTheme.borderColor} !important;
    }
    ${scope} .fc-list-empty {
      background: ${activeTheme.cellAltBg} !important;
      color: ${activeTheme.cellMutedText} !important;
    }
    ${scope} .fc-multimonth-month {
      background: ${activeTheme.cellBg} !important;
      color: ${activeTheme.cellText} !important;
    }
    ${scope} .fc-multimonth-title {
      color: ${activeTheme.headerText} !important;
      font-weight: 700 !important;
      padding: 10px 8px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
    }
    ${scope} .fc-daygrid-week-number {
      background: ${activeTheme.badgeBg} !important;
      color: ${activeTheme.badgeText} !important;
      border-radius: ${activeTheme.id === 'forma' ? '2px' : '6px'} !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      padding: 2px 6px !important;
      margin: 2px !important;
    }
  `;
  }, [activeTheme]);

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
      </div>
    </Box>
  );
};

export default FullCalendarCanvas;
