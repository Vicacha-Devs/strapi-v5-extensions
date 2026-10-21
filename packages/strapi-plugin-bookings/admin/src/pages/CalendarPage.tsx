import React, { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Flex,
  Layouts,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import type { ExpandedCalendarOccurrence } from '@vicacha-devs/strapi-plugin-calendar/shared';
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
  const { formatMessage, locale } = useIntl();
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
  const [stats, setStats] = useState<BookingStats>(EMPTY_STATS);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
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
      const res = await get(
        `/${PLUGIN_ID}/calendar?${params.toString()}`
      );
      const payload = res.data?.data;
      if (payload) {
        setOccurrences(payload.occurrences ?? []);
        setBookings(payload.bookings ?? []);
        setResources(payload.resources ?? []);
        setSettings(payload.settings ?? null);
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

  const activeSecondaryCalendars = (settings?.secondaryCalendars ?? []).filter(
    (c) => c.enabled
  );

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

          {/* Toolbar & Filters */}
          <Box background="neutral0" hasRadius shadow="tableShadow" padding={4}>
            <Flex
              justifyContent="space-between"
              alignItems="flex-end"
              wrap="wrap"
              gap={3}
            >
              <Flex gap={3} wrap="wrap" alignItems="flex-end">
                <Box style={{ minWidth: '200px' }}>
                  <SingleSelect
                    label={t('filters.resource', 'Resource')}
                    value={selectedResourceId}
                    onChange={(val: string | number) =>
                      setSelectedResourceId(String(val))
                    }
                  >
                    <SingleSelectOption value="">
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
                </Box>

                <Box style={{ minWidth: '160px' }}>
                  <SingleSelect
                    label={t('filters.status', 'Status')}
                    value={selectedStatus}
                    onChange={(val: string | number) =>
                      setSelectedStatus(String(val))
                    }
                  >
                    <SingleSelectOption value="">
                      {t('filters.allStatuses', 'All Statuses')}
                    </SingleSelectOption>
                    <SingleSelectOption value="pending">PENDING</SingleSelectOption>
                    <SingleSelectOption value="confirmed">CONFIRMED</SingleSelectOption>
                    <SingleSelectOption value="completed">COMPLETED</SingleSelectOption>
                    <SingleSelectOption value="cancelled">CANCELLED</SingleSelectOption>
                    <SingleSelectOption value="no_show">NO SHOW</SingleSelectOption>
                  </SingleSelect>
                </Box>

                <Box style={{ minWidth: '220px' }}>
                  <TextInput
                    label={t('filters.search', 'Search')}
                    placeholder={t(
                      'filters.searchPlaceholder',
                      'Code, customer, host, org...'
                    )}
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearch(e.target.value)
                    }
                  />
                </Box>
              </Flex>

              <Flex gap={2} wrap="wrap">
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
                locale={locale || 'en'}
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
