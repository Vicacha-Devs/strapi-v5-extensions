import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type FullCalendar from '@fullcalendar/react';
import { Badge, Box, Button, Flex, Typography } from '@strapi/design-system';
import { FullCalendarCanvas } from '@vicacha-devs/strapi-plugin-calendar/strapi-admin';
import {
  formatDateInCalendarSystem,
  type CalendarPluginSettings,
  type CalendarThemePreset,
  type ExpandedCalendarOccurrence,
  type SecondaryCalendarLanguageMode,
} from '@vicacha-devs/strapi-plugin-calendar/shared';
import type {
  BookingRecord,
  SecondaryCalendarConfig,
} from '../../../../shared/types';

export type BookingsViewMode = 'month' | 'week' | 'day' | 'agenda' | 'list';

const VIEW_MODE_TO_FULLCALENDAR: Record<
  Exclude<BookingsViewMode, 'list'>,
  string
> = {
  month: 'dayGridMonth',
  week: 'timeGridWeek',
  day: 'timeGridDay',
  agenda: 'listMonth',
};

export function maskEmailForPreview(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [local, domain] = parts;
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export interface BookingsGridCanvasProps {
  t: (id: string, defaultMessage: string) => string;
  locale: string;
  theme?: CalendarThemePreset;
  calendarSettings?: CalendarPluginSettings | null;
  secondaryCalendarLanguage?: SecondaryCalendarLanguageMode;
  viewMode: BookingsViewMode;
  occurrences: ExpandedCalendarOccurrence[];
  bookings: BookingRecord[];
  activeSecondaryCalendars: SecondaryCalendarConfig[];
  onSelectBooking: (booking: BookingRecord) => void;
  onRescheduleBooking: (
    booking: BookingRecord,
    newStartIso: string,
    newEndIso?: string
  ) => void;
  onQuickCreateOnDate: (dateIso: string) => void;
}

export const BookingsGridCanvas: React.FC<BookingsGridCanvasProps> = ({
  t,
  locale,
  theme = 'breeze',
  calendarSettings = null,
  secondaryCalendarLanguage = 'local',
  viewMode,
  occurrences,
  bookings,
  activeSecondaryCalendars,
  onSelectBooking,
  onRescheduleBooking,
  onQuickCreateOnDate,
}) => {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());

  useEffect(() => {
    if (viewMode === 'list') return;
    const api = calendarRef.current?.getApi();
    const targetView = VIEW_MODE_TO_FULLCALENDAR[viewMode];
    if (api && targetView) {
      api.changeView(targetView);
    }
  }, [viewMode]);

  const navigateCalendar = useCallback((action: 'prev' | 'today' | 'next') => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (action === 'prev') api.prev();
    else if (action === 'today') api.today();
    else api.next();
    setAnchorDate(api.getDate());
  }, []);

  const effectiveLocale = locale || 'es';

  const monthLabel = useMemo(() => {
    try {
      const formatted = new Intl.DateTimeFormat(effectiveLocale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(anchorDate);
      return formatted.toUpperCase();
    } catch {
      return anchorDate.toISOString().slice(0, 7);
    }
  }, [anchorDate, effectiveLocale]);

  const secondaryHeaderLabel = useMemo(() => {
    if (
      activeSecondaryCalendars.length === 0 ||
      secondaryCalendarLanguage === 'off'
    ) {
      return '';
    }
    const anchorIso = anchorDate.toISOString().slice(0, 10);
    const targetLoc =
      secondaryCalendarLanguage === 'ar' ? 'ar-SA' : effectiveLocale;
    return activeSecondaryCalendars
      .map((sys) => {
        const formatted = formatDateInCalendarSystem(
          anchorIso,
          { ...sys, locale: targetLoc },
          targetLoc,
          { compact: false }
        );
        return formatted ? `${sys.label}: ${formatted}` : '';
      })
      .filter(Boolean)
      .join(' • ');
  }, [
    activeSecondaryCalendars,
    anchorDate,
    effectiveLocale,
    secondaryCalendarLanguage,
  ]);

  const bookingMap = useMemo(
    () => new Map(bookings.map((b) => [b.documentId, b])),
    [bookings]
  );

  const fullCalendarEvents = useMemo(
    () =>
      occurrences.map((occ) => ({
        id: occ.occurrenceId,
        title: occ.title,
        start: occ.startDate,
        end: occ.endDate,
        allDay: occ.allDay,
        backgroundColor: occ.color || '#0284C7',
        borderColor: occ.color || '#0284C7',
        textColor: '#ffffff',
        extendedProps: {
          occurrence: occ,
        },
      })),
    [occurrences]
  );

  if (viewMode === 'list') {
    return (
      <Box background="neutral0" hasRadius shadow="tableShadow" padding={4}>
        <Flex direction="column" alignItems="stretch" gap={3}>
          <Typography variant="delta" tag="h3">
            {t('bookings.listTitle', 'Reservations & Bookings Ledger')}
          </Typography>
          {bookings.length === 0 ? (
            <Typography variant="omega" textColor="neutral600">
              {t('bookings.empty', 'No bookings found for the selected filters.')}
            </Typography>
          ) : (
            bookings.map((b) => (
              <Box
                key={b.documentId}
                padding={3}
                background="neutral100"
                hasRadius
              >
                <Flex
                  justifyContent="space-between"
                  alignItems="center"
                  wrap="wrap"
                  gap={2}
                >
                  <Flex gap={3} alignItems="center" wrap="wrap">
                    <Badge>{b.bookingCode}</Badge>
                    <Typography variant="omega" fontWeight="bold">
                      {b.customerName}
                    </Typography>
                    {b.customerEmail && (
                      <Typography variant="pi" textColor="neutral600">
                        ({maskEmailForPreview(b.customerEmail)})
                      </Typography>
                    )}
                    {b.resourceName && (
                      <Badge backgroundColor="primary100" textColor="primary700">
                        {b.resourceName}
                      </Badge>
                    )}
                    <Typography variant="pi" textColor="neutral600">
                      {b.startDate.slice(0, 16).replace('T', ' ')}
                    </Typography>
                    <Badge
                      backgroundColor={
                        b.status === 'confirmed'
                          ? 'success100'
                          : b.status === 'pending'
                            ? 'warning100'
                            : 'neutral200'
                      }
                      textColor={
                        b.status === 'confirmed'
                          ? 'success700'
                          : b.status === 'pending'
                            ? 'warning700'
                            : 'neutral700'
                      }
                    >
                      {b.status.toUpperCase()} ({b.partySize})
                    </Badge>
                  </Flex>
                  <Button
                    size="S"
                    variant="secondary"
                    onClick={() => onSelectBooking(b)}
                  >
                    {t('bookings.inspect', 'Inspect')}
                  </Button>
                </Flex>
              </Box>
            ))
          )}
        </Flex>
      </Box>
    );
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      {/* Calendar Month/Year Header Bar + Navigation */}
      <Box background="neutral0" hasRadius shadow="tableShadow" padding={4}>
        <Flex
          justifyContent="space-between"
          alignItems="center"
          wrap="wrap"
          gap={3}
        >
          <Flex gap={3} alignItems="center" wrap="wrap">
            <Typography variant="delta" fontWeight="bold" tag="h3">
              {monthLabel}
            </Typography>
            {secondaryHeaderLabel && (
              <Badge backgroundColor="secondary100" textColor="secondary700">
                {secondaryHeaderLabel}
              </Badge>
            )}
          </Flex>

          <Flex gap={2} alignItems="center">
            <Button
              variant="tertiary"
              size="S"
              onClick={() => navigateCalendar('prev')}
            >
              ← {t('nav.prev', 'Prev')}
            </Button>
            <Button
              variant="secondary"
              size="S"
              onClick={() => navigateCalendar('today')}
            >
              {t('nav.today', 'Today')}
            </Button>
            <Button
              variant="tertiary"
              size="S"
              onClick={() => navigateCalendar('next')}
            >
              {t('nav.next', 'Next')} →
            </Button>
          </Flex>
        </Flex>
      </Box>

      <FullCalendarCanvas
        calendarRef={calendarRef}
        locale={effectiveLocale}
        theme={calendarSettings?.theme ?? theme}
        colorScheme={calendarSettings?.colorScheme}
        themePalette={calendarSettings?.themePalette}
        secondaryCalendarLanguage={secondaryCalendarLanguage}
        settings={calendarSettings}
        events={fullCalendarEvents}
        activeSecondaryCalendars={activeSecondaryCalendars}
        onDatesSet={(currentStart) => setAnchorDate(currentStart)}
        onSelectSlot={(startStr) => onQuickCreateOnDate(startStr)}
        onSelectOccurrence={(occ: ExpandedCalendarOccurrence) => {
          const matched = bookingMap.get(occ.documentId);
          if (matched) {
            onSelectBooking(matched);
          }
        }}
        onDropOrResizeOccurrence={(
          occ: ExpandedCalendarOccurrence,
          newStartIso: string,
          newEndIso?: string
        ) => {
          const matched = bookingMap.get(occ.documentId);
          if (matched) {
            onRescheduleBooking(matched, newStartIso, newEndIso);
          }
        }}
      />
    </Flex>
  );
};
