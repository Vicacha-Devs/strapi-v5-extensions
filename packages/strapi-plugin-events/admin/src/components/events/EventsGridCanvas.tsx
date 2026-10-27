import React, { useEffect, useMemo, useRef } from 'react';
import type FullCalendar from '@fullcalendar/react';
import { Badge, Box, Button, Flex, Typography } from '@strapi/design-system';
import { FullCalendarCanvas } from '@vicacha-devs/strapi-plugin-calendar/strapi-admin';
import type {
  CalendarPluginSettings,
  ExpandedCalendarOccurrence,
} from '@vicacha-devs/strapi-plugin-calendar/shared';
import type {
  CalendarSystemConfig,
  ExpandedOccurrence,
} from '../../../../shared/types';
import type { EventsViewMode } from './EventsToolbar';

const VIEW_MODE_TO_FULLCALENDAR: Record<Exclude<EventsViewMode, 'attendees'>, string> = {
  month: 'dayGridMonth',
  week: 'timeGridWeek',
  day: 'timeGridDay',
  agenda: 'listMonth',
};

export interface EventsGridCanvasProps {
  t: (id: string, defaultMessage: string) => string;
  locale: string;
  theme?: 'breeze' | 'emerald' | 'sand' | 'midnight' | 'classic';
  calendarSettings?: CalendarPluginSettings | null;
  secondaryCalendarLanguage?: 'local' | 'ar' | 'off';
  viewMode: EventsViewMode;
  anchorDate: Date;
  todayKey: string;
  loading: boolean;
  monthDays: Date[];
  weekDays: Date[];
  occurrences: ExpandedOccurrence[];
  occurrencesByDate: Record<string, ExpandedOccurrence[]>;
  activeSecondaryCalendars: CalendarSystemConfig[];
  onSelectOccurrence: (occ: ExpandedOccurrence) => void;
  onDropOnDate: (occ: ExpandedOccurrence, targetDateKey: string) => void;
  onQuickCreateOnDate: (dateKey: string) => void;
  onViewAttendeesForEvent: (documentId: string) => void;
}

export const EventsGridCanvas: React.FC<EventsGridCanvasProps> = ({
  t,
  locale,
  theme = 'breeze',
  calendarSettings = null,
  secondaryCalendarLanguage = 'local',
  viewMode,
  anchorDate,
  occurrences,
  activeSecondaryCalendars,
  onSelectOccurrence,
  onDropOnDate,
  onQuickCreateOnDate,
  onViewAttendeesForEvent,
}) => {
  const calendarRef = useRef<FullCalendar | null>(null);

  useEffect(() => {
    if (viewMode === 'attendees') return;
    const api = calendarRef.current?.getApi();
    const targetView = VIEW_MODE_TO_FULLCALENDAR[viewMode];
    if (api && targetView) {
      api.changeView(targetView);
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'attendees') return;
    const api = calendarRef.current?.getApi();
    if (api && anchorDate && !Number.isNaN(anchorDate.getTime())) {
      api.gotoDate(anchorDate);
    }
  }, [anchorDate, viewMode]);

  const fullCalendarEvents = useMemo(
    () =>
      occurrences.map((occ) => ({
        id: occ.occurrenceId,
        title: occ.rsvp
          ? `${occ.title} (${occ.rsvp.confirmedSeats}${occ.rsvp.capacity ? `/${occ.rsvp.capacity}` : ''})`
          : occ.title,
        start: occ.startDate,
        end: occ.endDate,
        allDay: occ.allDay,
        backgroundColor: occ.color || '#0284C7',
        borderColor: occ.color || '#0284C7',
        textColor: '#FFFFFF',
        extendedProps: {
          occurrence: occ,
        },
      })),
    [occurrences]
  );

  const rsvpOccurrences = useMemo(
    () => occurrences.filter((occ) => Boolean(occ.rsvp)),
    [occurrences]
  );

  if (viewMode === 'attendees') {
    return null;
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <FullCalendarCanvas
        calendarRef={calendarRef}
        locale={locale || 'es'}
        settings={calendarSettings}
        theme={calendarSettings?.theme ?? theme}
        colorScheme={calendarSettings?.colorScheme}
        themePalette={calendarSettings?.themePalette}
        secondaryCalendarLanguage={secondaryCalendarLanguage}
        events={fullCalendarEvents}
        activeSecondaryCalendars={activeSecondaryCalendars}
        onDatesSet={() => {}}
        onSelectSlot={(startStr) => onQuickCreateOnDate(startStr.slice(0, 10))}
        onSelectOccurrence={(occ: ExpandedCalendarOccurrence) =>
          onSelectOccurrence(occ as unknown as ExpandedOccurrence)
        }
        onDropOrResizeOccurrence={(occ: ExpandedCalendarOccurrence, newStartIso: string) =>
          onDropOnDate(occ as unknown as ExpandedOccurrence, newStartIso.slice(0, 10))
        }
      />

      {rsvpOccurrences.length > 0 && (
        <Box background="neutral0" hasRadius shadow="tableShadow" padding={4}>
          <Flex direction="column" alignItems="stretch" gap={2}>
            <Typography variant="sigma" fontWeight="bold" textColor="neutral600">
              {t('calendar.rsvpOverview', 'RSVP & Capacity Overview')}
            </Typography>
            {rsvpOccurrences.slice(0, 8).map((occ) => (
              <Flex
                key={occ.occurrenceId}
                justifyContent="space-between"
                alignItems="center"
                wrap="wrap"
                gap={2}
              >
                <Flex gap={2} alignItems="center" wrap="wrap">
                  <Typography variant="omega" fontWeight="bold">
                    {occ.title}
                  </Typography>
                  <Typography variant="pi" textColor="neutral600">
                    ({occ.occurrenceDate})
                  </Typography>
                  {occ.rsvp && (
                    <Badge
                      backgroundColor={occ.rsvp.isFull ? 'danger100' : 'success100'}
                      textColor={occ.rsvp.isFull ? 'danger700' : 'success700'}
                    >
                      RSVP: {occ.rsvp.confirmedSeats}
                      {occ.rsvp.capacity ? `/${occ.rsvp.capacity}` : ''}
                      {occ.rsvp.waitlistedSeats > 0
                        ? ` (+${occ.rsvp.waitlistedSeats} waitlist)`
                        : ''}
                    </Badge>
                  )}
                </Flex>
                <Button
                  size="S"
                  variant="secondary"
                  onClick={() => onViewAttendeesForEvent(occ.documentId)}
                >
                  {t('calendar.viewAttendees', 'Attendees')}
                </Button>
              </Flex>
            ))}
          </Flex>
        </Box>
      )}
    </Flex>
  );
};
