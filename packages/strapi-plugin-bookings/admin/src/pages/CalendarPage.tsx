import React, { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { Layouts, useFetchClient, useNotification } from '@strapi/strapi/admin';
import {
  SUPPORTED_INTL_CALENDARS,
  type CalendarPluginSettings,
  type CalendarThemePreset,
  type ExpandedCalendarOccurrence,
  type SecondaryCalendarLanguageMode,
} from '@vicacha-devs/strapi-plugin-calendar/shared';
import type {
  BookingRecord,
  BookingResource,
  BookingsPluginSettings,
  BookingStats,
  BookingStatus,
  CreateReservationInput,
} from '../../../shared/types';
import {
  BookingsGridCanvas,
  type BookingsViewMode,
} from '../components/bookings/BookingsGridCanvas';
import { BookingSidePanel } from '../components/bookings/BookingSidePanel';
import { QuickCreateBookingModal } from '../components/bookings/QuickCreateBookingModal';
import { PLUGIN_ID } from '../pluginId';
import { getTranslation } from '../utils/getTranslation';

const EMPTY_STATS: BookingStats = {
  totalBookings: 0,
  confirmedBookings: 0,
  pendingBookings: 0,
  cancelledBookings: 0,
  completedBookings: 0,
  totalGuests: 0,
  activeResources: 0,
};

export const CalendarPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { get, post, put } = useFetchClient();
  const { toggleNotification } = useNotification();

  const t = useCallback(
    (id: string, defaultMessage: string) =>
      formatMessage({ id: getTranslation(id), defaultMessage }),
    [formatMessage]
  );

  const [viewMode, setViewMode] = useState<BookingsViewMode>('month');
  const [occurrences, setOccurrences] = useState<ExpandedCalendarOccurrence[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [resources, setResources] = useState<BookingResource[]>([]);
  const [settings, setSettings] = useState<BookingsPluginSettings | null>(null);
  const [calendarSettings, setCalendarSettings] =
    useState<CalendarPluginSettings | null>(null);
  const [stats, setStats] = useState<BookingStats>(EMPTY_STATS);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [calendarLocale, setCalendarLocale] = useState<string>('es');
  const [theme, setTheme] = useState<CalendarThemePreset>('breeze');
  const [secondaryLangMode, setSecondaryLangMode] =
    useState<SecondaryCalendarLanguageMode>('local');
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(
    null
  );
  const [quickCreateStartIso, setQuickCreateStartIso] = useState<string | null>(
    null
  );

  const fetchCalendarData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedResourceId) {
        params.set('resourceDocumentId', selectedResourceId);
      }
      if (selectedStatus) {
        params.set('status', selectedStatus);
      }
      if (search.trim()) {
        params.set('search', search.trim());
      }
      const [res, calSettingsRes] = await Promise.all([
        get(`/${PLUGIN_ID}/calendar?${params.toString()}`),
        get('/calendar/settings').catch(() => null),
      ]);
      const centralCal = calSettingsRes?.data?.data as
        | CalendarPluginSettings
        | undefined;
      if (centralCal) {
        setCalendarSettings(centralCal);
      }
      const payload = res.data?.data;
      if (payload) {
        setOccurrences(payload.occurrences ?? []);
        setBookings(payload.bookings ?? []);
        setResources(payload.resources ?? []);
        const loadedSettings = payload.settings as BookingsPluginSettings | null;
        setSettings(loadedSettings);
        const effectiveTheme = centralCal?.theme ?? loadedSettings?.theme;
        if (effectiveTheme) {
          setTheme(effectiveTheme);
        }
        const effectiveLocale =
          centralCal?.defaultLocale && centralCal.defaultLocale !== 'auto'
            ? centralCal.defaultLocale
            : loadedSettings?.defaultLocale;
        if (effectiveLocale && effectiveLocale !== 'auto') {
          setCalendarLocale(effectiveLocale);
        }
        const effectiveSecondaryLang =
          centralCal?.secondaryCalendarLanguage ??
          loadedSettings?.secondaryCalendarLanguage;
        if (effectiveSecondaryLang) {
          setSecondaryLangMode(effectiveSecondaryLang);
        }
        setStats(payload.stats ?? EMPTY_STATS);
      }
    } catch {
      toggleNotification({
        type: 'danger',
        message: t('notifications.loadError', 'Failed to load bookings calendar'),
      });
    }
  }, [get, selectedResourceId, selectedStatus, search, toggleNotification, t]);

  useEffect(() => {
    void fetchCalendarData();
  }, [fetchCalendarData]);

  const handleUpdateStatus = async (
    documentId: string,
    status: BookingStatus,
    assignedHost?: string,
    internalNotes?: string
  ) => {
    try {
      await put(`/${PLUGIN_ID}/bookings/${documentId}/status`, {
        status,
        assignedHost,
        internalNotes,
      });
      toggleNotification({
        type: 'success',
        message: t('notifications.updated', 'Booking updated'),
      });
      await fetchCalendarData();
    } catch {
      toggleNotification({
        type: 'danger',
        message: t('notifications.updateError', 'Failed to update booking'),
      });
    }
  };

  const handleRescheduleBooking = async (
    booking: BookingRecord,
    newStartIso: string,
    newEndIso?: string
  ) => {
    try {
      await post(`/${PLUGIN_ID}/bookings/reschedule`, {
        bookingDocumentId: booking.documentId,
        newStartDate: newStartIso,
        newEndDate: newEndIso,
      });
      toggleNotification({
        type: 'success',
        message: t('notifications.rescheduled', 'Booking rescheduled'),
      });
      await fetchCalendarData();
    } catch {
      toggleNotification({
        type: 'danger',
        message: t(
          'notifications.rescheduleError',
          'Failed to reschedule booking (slot may be full or blacked out)'
        ),
      });
    }
  };

  const handleCreateBooking = async (payload: CreateReservationInput) => {
    try {
      await post(`/${PLUGIN_ID}/bookings`, payload);
      toggleNotification({
        type: 'success',
        message: t('notifications.created', 'Booking created'),
      });
      await fetchCalendarData();
    } catch {
      toggleNotification({
        type: 'danger',
        message: t('notifications.createError', 'Failed to create booking'),
      });
    }
  };

  const handleOpenInContentManager = (booking: BookingRecord) => {
    const uid = booking.sourceCollection || 'plugin::bookings.booking';
    navigate(`/content-manager/collection-types/${uid}/${booking.documentId}`);
  };

  const activeSecondaryCalendars = React.useMemo(() => {
    if (secondaryLangMode === 'off') {
      return [];
    }
    const centralConfigured = (calendarSettings?.secondaryCalendars ?? []).filter(
      (c) => c.enabled
    );
    if (centralConfigured.length > 0) {
      return centralConfigured;
    }
    const configured = (settings?.secondaryCalendars ?? []).filter(
      (c) => c.enabled
    );
    if (configured.length > 0) {
      return configured;
    }
    const hijri = SUPPORTED_INTL_CALENDARS.find(
      (c) => c.id === 'islamic-umalqura'
    );
    return hijri
      ? [
          {
            id: 'hijri',
            label: hijri.defaultLabel,
            intlCalendar: hijri.intlCalendar,
            enabled: true,
          },
        ]
      : [];
  }, [
    secondaryLangMode,
    calendarSettings?.secondaryCalendars,
    settings?.secondaryCalendars,
  ]);

  return (
    <Layouts.Root>
      <Layouts.Header
        title={t('plugin.title', 'Bookings & Slot Availability')}
        subtitle={t(
          'plugin.subtitle',
          'Manage bookable resources, time-slot availability, staff assignment, and reservations'
        )}
        primaryAction={
          <Flex gap={2}>
            <Button
              variant="tertiary"
              onClick={() => navigate(`/settings/${PLUGIN_ID}`)}
            >
              {t('actions.settings', 'Settings')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.open(`/${PLUGIN_ID}/export.csv`, '_blank')}
            >
              {t('actions.exportCsv', 'Export CSV')}
            </Button>
            <Button
              variant="default"
              onClick={() =>
                setQuickCreateStartIso(new Date().toISOString().slice(0, 10))
              }
            >
              {t('actions.newBooking', 'New Booking')}
            </Button>
          </Flex>
        }
      />

      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={5}>
          {/* KPI Summary Cards */}
          <Flex gap={4} wrap="wrap">
            {[
              {
                label: t('stats.total', 'Total Bookings'),
                value: stats.totalBookings,
                badge: 'neutral100',
              },
              {
                label: t('stats.confirmed', 'Confirmed'),
                value: stats.confirmedBookings,
                badge: 'success100',
              },
              {
                label: t('stats.pending', 'Pending Approval'),
                value: stats.pendingBookings,
                badge: 'warning100',
              },
              {
                label: t('stats.guests', 'Total Guests / Seats'),
                value: stats.totalGuests,
                badge: 'primary100',
              },
              {
                label: t('stats.resources', 'Active Resources'),
                value: stats.activeResources,
                badge: 'secondary100',
              },
            ].map((card) => (
              <Box
                key={card.label}
                background="neutral0"
                hasRadius
                shadow="tableShadow"
                padding={4}
                style={{ flex: '1 1 180px' }}
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

          {/* Toolbar & Filters with Visible Field Labels */}
          <Box background="neutral0" hasRadius shadow="tableShadow" padding={4}>
            <Flex direction="column" alignItems="stretch" gap={3}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 12,
                }}
              >
                <Field.Root>
                  <Field.Label>
                    {t('filters.resource', 'Bookable Resource')}
                  </Field.Label>
                  <SingleSelect
                    placeholder={t('placeholder.all_resources', 'All Resources')}
                    value={selectedResourceId || 'all'}
                    onChange={(val: string | number) =>
                      setSelectedResourceId(String(val) === 'all' ? '' : String(val))
                    }
                  >
                    <SingleSelectOption value="all">
                      {t('filters.allResources', 'All Resources')}
                    </SingleSelectOption>
                    {resources.map((res) => (
                      <SingleSelectOption
                        key={res.documentId}
                        value={res.documentId}
                      >
                        {res.name}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Field.Root>

                <Field.Root>
                  <Field.Label>
                    {t('filters.status', 'Booking Status')}
                  </Field.Label>
                  <SingleSelect
                    placeholder={t('placeholder.all_statuses', 'All Statuses')}
                    value={selectedStatus || 'all'}
                    onChange={(val: string | number) =>
                      setSelectedStatus(String(val) === 'all' ? '' : String(val))
                    }
                  >
                    <SingleSelectOption value="all">
                      {t('filters.allStatuses', 'All Statuses')}
                    </SingleSelectOption>
                    <SingleSelectOption value="pending">{t('page.ui.pending', 'PENDING')}</SingleSelectOption>
                    <SingleSelectOption value="confirmed">{t('page.ui.confirmed', 'CONFIRMED')}</SingleSelectOption>
                    <SingleSelectOption value="completed">{t('page.ui.completed', 'COMPLETED')}</SingleSelectOption>
                    <SingleSelectOption value="cancelled">{t('page.ui.cancelled', 'CANCELLED')}</SingleSelectOption>
                    <SingleSelectOption value="no_show">{t('page.ui.no_show', 'NO SHOW')}</SingleSelectOption>
                  </SingleSelect>
                </Field.Root>

                <Field.Root>
                  <Field.Label>
                    {t('filters.search', 'Search Reservations')}
                  </Field.Label>
                  <TextInput
                    placeholder={t(
                      'filters.searchPlaceholder',
                      'Code, customer, host, org...'
                    )}
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearch(e.target.value)
                    }
                  />
                </Field.Root>
              </div>

              <Flex justifyContent="flex-end" gap={2} wrap="wrap">
                {(
                  ['month', 'week', 'day', 'agenda', 'list'] as BookingsViewMode[]
                ).map((mode) => (
                  <Button
                    key={mode}
                    size="S"
                    variant={viewMode === mode ? 'default' : 'tertiary'}
                    onClick={() => setViewMode(mode)}
                  >
                    {t(`views.${mode}`, mode.toUpperCase())}
                  </Button>
                ))}
              </Flex>
            </Flex>
          </Box>

          {/* Main Calendar / Ledger + Side Panel */}
          <Flex gap={4} alignItems="flex-start">
            <Box style={{ flex: 1, minWidth: 0 }}>
              <BookingsGridCanvas
                t={t}
                locale={calendarLocale}
                theme={theme}
                calendarSettings={calendarSettings}
                secondaryCalendarLanguage={secondaryLangMode}
                viewMode={viewMode}
                occurrences={occurrences}
                bookings={bookings}
                activeSecondaryCalendars={activeSecondaryCalendars}
                onSelectBooking={(b) => setSelectedBooking(b)}
                onRescheduleBooking={handleRescheduleBooking}
                onQuickCreateOnDate={(iso) => setQuickCreateStartIso(iso)}
              />
            </Box>

            {selectedBooking && (
              <BookingSidePanel
                t={t}
                booking={selectedBooking}
                onClose={() => setSelectedBooking(null)}
                onUpdateStatus={handleUpdateStatus}
                onOpenInContentManager={handleOpenInContentManager}
              />
            )}
          </Flex>
        </Flex>

        <QuickCreateBookingModal
          t={t}
          isOpen={Boolean(quickCreateStartIso)}
          initialStartIso={
            quickCreateStartIso || new Date().toISOString().slice(0, 10)
          }
          resources={resources}
          onClose={() => setQuickCreateStartIso(null)}
          onSubmit={handleCreateBooking}
        />
      </Layouts.Content>
    </Layouts.Root>
  );
};

export default CalendarPage;
