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
} from "@strapi/design-system";
import { Layouts, useFetchClient, useNotification } from "@strapi/strapi/admin";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import type {
  BookingRecord,
  BookingResource,
  BookingStats,
  BookingStatus,
  CreateReservationInput,
} from "../../../shared/types";
import { BookingsGridCanvas } from "../components/bookings/BookingsGridCanvas";
import { BookingSidePanel } from "../components/bookings/BookingSidePanel";
import { QuickCreateBookingModal } from "../components/bookings/QuickCreateBookingModal";
import { PLUGIN_ID } from "../pluginId";
import { getTranslation } from "../utils/getTranslation";

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
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const t = useCallback(
    (id: string, defaultMessage: string) =>
      formatMessage({ id: getTranslation(id), defaultMessage }),
    [formatMessage]
  );

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [resources, setResources] = useState<BookingResource[]>([]);
  const [stats, setStats] = useState<BookingStats>(EMPTY_STATS);
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(
    null
  );
  const [quickCreateStartIso, setQuickCreateStartIso] = useState<string | null>(
    null
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        setDebouncedSearch(search);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchBookingsData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedResourceId) {
        params.set("resourceDocumentId", selectedResourceId);
      }
      if (selectedStatus) {
        params.set("status", selectedStatus);
      }
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }
      const res = await get<{
        data?: {
          bookings?: BookingRecord[];
          resources?: BookingResource[];
          stats?: BookingStats;
        };
      }>(`/${PLUGIN_ID}/calendar?${params.toString()}`);
      if (!isMountedRef.current) return;
      const payload = res.data?.data;
      if (payload) {
        const nextBookings = payload.bookings ?? [];
        setBookings(nextBookings);
        setResources(payload.resources ?? []);
        setStats(payload.stats ?? EMPTY_STATS);
        setSelectedBooking((prev) => {
          if (!prev) return null;
          return (
            nextBookings.find((b) => b.documentId === prev.documentId) ?? null
          );
        });
      }
    } catch {
      if (!isMountedRef.current) return;
      toggleNotification({
        type: "danger",
        message: t("notifications.loadError", "Failed to load bookings"),
      });
    }
  }, [
    get,
    selectedResourceId,
    selectedStatus,
    debouncedSearch,
    toggleNotification,
    t,
  ]);

  useEffect(() => {
    void fetchBookingsData();
  }, [fetchBookingsData]);

  const handleUpdateStatus = async (
    documentId: string,
    status: BookingStatus,
    assignedHost?: string,
    internalNotes?: string
  ) => {
    try {
      const res = await put<{ data?: BookingRecord }>(
        `/${PLUGIN_ID}/bookings/${documentId}/status`,
        {
          status,
          assignedHost,
          internalNotes,
        }
      );
      if (isMountedRef.current && res.data?.data) {
        setSelectedBooking(res.data.data);
      }
      toggleNotification({
        type: "success",
        message: t("notifications.updated", "Booking updated"),
      });
      await fetchBookingsData();
    } catch {
      toggleNotification({
        type: "danger",
        message: t("notifications.updateError", "Failed to update booking"),
      });
    }
  };

  const handleCreateBooking = async (payload: CreateReservationInput) => {
    try {
      await post(`/${PLUGIN_ID}/bookings`, payload);
      toggleNotification({
        type: "success",
        message: t("notifications.created", "Booking created"),
      });
      await fetchBookingsData();
    } catch (err) {
      toggleNotification({
        type: "danger",
        message: t("notifications.createError", "Failed to create booking"),
      });
      throw err;
    }
  };

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedResourceId) {
        params.set("resourceDocumentId", selectedResourceId);
      }
      if (selectedStatus) {
        params.set("status", selectedStatus);
      }
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }
      const qs = params.toString();
      const url = qs
        ? `/${PLUGIN_ID}/export.csv?${qs}`
        : `/${PLUGIN_ID}/export.csv`;
      const res = await get<string>(url);
      const csvText =
        typeof res.data === "string" ? res.data : String(res.data ?? "");
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
      const objectUrl = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.setAttribute("download", "bookings.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch {
      toggleNotification({
        type: "danger",
        message: t("notifications.exportError", "Failed to export CSV"),
      });
    }
  };

  const handleOpenInContentManager = (booking: BookingRecord) => {
    const uid = booking.sourceCollection || "plugin::bookings.booking";
    navigate(`/content-manager/collection-types/${uid}/${booking.documentId}`);
  };

  return (
    <Layouts.Root>
      <Layouts.Header
        title={t("plugin.title", "Bookings & Slot Availability")}
        subtitle={t(
          "plugin.subtitle",
          "Manage bookable resources, time-slot availability, staff assignment, and reservation approvals. Schedule views are unified in Calendar."
        )}
        primaryAction={
          <Flex gap={2}>
            <Button
              variant="secondary"
              onClick={() => navigate("/plugins/calendar?source=bookings")}
            >
              {t("actions.openUnifiedCalendar", "Open in Calendar")}
            </Button>
            <Button
              variant="tertiary"
              onClick={() => navigate(`/settings/${PLUGIN_ID}`)}
            >
              {t("actions.settings", "Settings")}
            </Button>
            <Button variant="secondary" onClick={() => void handleExportCsv()}>
              {t("actions.exportCsv", "Export CSV")}
            </Button>
            <Button
              variant="default"
              onClick={() =>
                setQuickCreateStartIso(new Date().toISOString().slice(0, 10))
              }
            >
              {t("actions.newBooking", "New Booking")}
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
                label: t("stats.total", "Total Bookings"),
                value: stats.totalBookings,
                badge: "neutral100",
              },
              {
                label: t("stats.confirmed", "Confirmed"),
                value: stats.confirmedBookings,
                badge: "success100",
              },
              {
                label: t("stats.pending", "Pending Approval"),
                value: stats.pendingBookings,
                badge: "warning100",
              },
              {
                label: t("stats.guests", "Total Guests / Seats"),
                value: stats.totalGuests,
                badge: "primary100",
              },
              {
                label: t("stats.resources", "Active Resources"),
                value: stats.activeResources,
                badge: "secondary100",
              },
            ].map((card) => (
              <Box
                key={card.label}
                background="neutral0"
                hasRadius
                shadow="tableShadow"
                padding={4}
                style={{ flex: "1 1 180px" }}
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

          {/* Resource, Status & Search Filters */}
          <Box background="neutral0" hasRadius shadow="tableShadow" padding={4}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <Field.Root>
                <Field.Label>
                  {t("filters.resource", "Bookable Resource")}
                </Field.Label>
                <SingleSelect
                  placeholder={t("placeholder.all_resources", "All Resources")}
                  value={selectedResourceId || "all"}
                  onChange={(val: string | number) =>
                    setSelectedResourceId(
                      String(val) === "all" ? "" : String(val)
                    )
                  }
                >
                  <SingleSelectOption value="all">
                    {t("filters.allResources", "All Resources")}
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
                  {t("filters.status", "Booking Status")}
                </Field.Label>
                <SingleSelect
                  placeholder={t("placeholder.all_statuses", "All Statuses")}
                  value={selectedStatus || "all"}
                  onChange={(val: string | number) =>
                    setSelectedStatus(String(val) === "all" ? "" : String(val))
                  }
                >
                  <SingleSelectOption value="all">
                    {t("filters.allStatuses", "All Statuses")}
                  </SingleSelectOption>
                  <SingleSelectOption value="pending">
                    {t("page.ui.pending", "PENDING")}
                  </SingleSelectOption>
                  <SingleSelectOption value="confirmed">
                    {t("page.ui.confirmed", "CONFIRMED")}
                  </SingleSelectOption>
                  <SingleSelectOption value="completed">
                    {t("page.ui.completed", "COMPLETED")}
                  </SingleSelectOption>
                  <SingleSelectOption value="cancelled">
                    {t("page.ui.cancelled", "CANCELLED")}
                  </SingleSelectOption>
                  <SingleSelectOption value="no_show">
                    {t("page.ui.no_show", "NO SHOW")}
                  </SingleSelectOption>
                </SingleSelect>
              </Field.Root>

              <Field.Root>
                <Field.Label>
                  {t("filters.search", "Search Reservations")}
                </Field.Label>
                <TextInput
                  placeholder={t(
                    "filters.searchPlaceholder",
                    "Code, customer, host, org..."
                  )}
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearch(e.target.value)
                  }
                />
              </Field.Root>
            </div>
          </Box>

          {/* Reservations Ledger + Approval Side Panel */}
          <Flex gap={4} alignItems="flex-start">
            <Box style={{ flex: 1, minWidth: 0 }}>
              <BookingsGridCanvas
                t={t}
                bookings={bookings}
                onSelectBooking={(b) => setSelectedBooking(b)}
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
