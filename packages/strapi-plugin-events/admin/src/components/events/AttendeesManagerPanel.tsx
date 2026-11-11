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
import { useFetchClient, useNotification } from "@strapi/strapi/admin";
import React, { useCallback, useState } from "react";

import { PLUGIN_ID } from "../../../../shared/pluginId";
import type {
  RsvpRegistrationRecord,
  RsvpStatus,
} from "../../../../shared/types";

export interface AttendeesManagerPanelProps {
  t: (id: string, defaultMessage: string) => string;
  registrations: RsvpRegistrationRecord[];
  rsvpSearch: string;
  onRsvpSearchChange: (val: string) => void;
  rsvpStatusFilter: string;
  onRsvpStatusFilterChange: (val: string) => void;
  rsvpEventFilter: string;
  onClearRsvpEventFilter: () => void;
  onCheckIn: (regDocId: string) => void;
  onStatusChange: (regDocId: string, status: RsvpStatus) => void;
}

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  checked_in: { bg: "success100", text: "success700" },
  confirmed: { bg: "primary100", text: "primary700" },
  waitlisted: { bg: "warning100", text: "warning700" },
  cancelled: { bg: "danger100", text: "danger700" },
};

function getStatusBadgeColors(status: string): { bg: string; text: string } {
  return Object.hasOwn(STATUS_BADGE_COLORS, status)
    ? STATUS_BADGE_COLORS[status]
    : STATUS_BADGE_COLORS.cancelled;
}

interface AttendeeRowProps {
  reg: RsvpRegistrationRecord;
  t: (id: string, defaultMessage: string) => string;
  onCheckIn: (regDocId: string) => void;
  onStatusChange: (regDocId: string, status: RsvpStatus) => void;
}

const AttendeeRegistrationRow: React.FC<AttendeeRowProps> = ({
  reg,
  t,
  onCheckIn,
  onStatusChange,
}) => {
  const colors = getStatusBadgeColors(reg.status);
  const seatWord =
    reg.guestsCount === 1
      ? t("attendees.seatSingular", "seat")
      : t("attendees.seatPlural", "seats");
  const eventDisplay = reg.eventTitle || reg.eventDocumentId;
  const phoneSuffix = reg.attendeePhone ? ` • ${reg.attendeePhone}` : "";
  const canCheckIn = reg.status === "confirmed";

  return (
    <Box padding={3} background="neutral100" hasRadius>
      <Flex
        justifyContent="space-between"
        alignItems="center"
        wrap="wrap"
        gap={3}
      >
        <Box>
          <Flex gap={2} alignItems="center" wrap="wrap">
            <Typography variant="omega" fontWeight="bold">
              {reg.attendeeName}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              ({reg.attendeeEmail})
            </Typography>
            <Badge backgroundColor="neutral200" textColor="neutral800">
              {reg.guestsCount} {seatWord}
            </Badge>
            <Badge backgroundColor={colors.bg} textColor={colors.text}>
              {t(`status.${reg.status}`, reg.status.toUpperCase())}
            </Badge>
          </Flex>

          <Box paddingTop={1}>
            <Typography variant="pi" textColor="neutral600">
              {eventDisplay} • {reg.occurrenceDate}
              {phoneSuffix}
            </Typography>
          </Box>
        </Box>

        <Flex gap={2} alignItems="flex-end">
          {canCheckIn && (
            <Button
              size="S"
              variant="default"
              onClick={() => onCheckIn(reg.documentId)}
            >
              ✓ {t("attendees.checkIn", "Check In")}
            </Button>
          )}

          <Box style={{ minWidth: 155 }}>
            <Field.Root>
              <Field.Label>
                {t("attendees.rowStatus", "Registration Status")}
              </Field.Label>
              <SingleSelect
                placeholder={t("placeholder.select_status", "Select status")}
                value={reg.status}
                onChange={(nextSt: string) =>
                  onStatusChange(reg.documentId, nextSt as RsvpStatus)
                }
              >
                <SingleSelectOption value="confirmed">
                  {t("status.confirmed", "Confirmed")}
                </SingleSelectOption>
                <SingleSelectOption value="checked_in">
                  {t("status.checked_in", "Checked In")}
                </SingleSelectOption>
                <SingleSelectOption value="waitlisted">
                  {t("status.waitlisted", "Waitlisted")}
                </SingleSelectOption>
                <SingleSelectOption value="cancelled">
                  {t("status.cancelled", "Cancelled")}
                </SingleSelectOption>
              </SingleSelect>
            </Field.Root>
          </Box>
        </Flex>
      </Flex>
    </Box>
  );
};

export const AttendeesManagerPanel: React.FC<AttendeesManagerPanelProps> = ({
  t,
  registrations,
  rsvpSearch,
  onRsvpSearchChange,
  rsvpStatusFilter,
  onRsvpStatusFilterChange,
  rsvpEventFilter,
  onClearRsvpEventFilter,
  onCheckIn,
  onStatusChange,
}) => {
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [exportingCsv, setExportingCsv] = useState(false);

  const handleExportCsv = useCallback(async () => {
    setExportingCsv(true);
    try {
      const params = new URLSearchParams();
      if (rsvpEventFilter.trim()) {
        params.set("eventDocumentId", rsvpEventFilter.trim());
      }
      if (rsvpStatusFilter && rsvpStatusFilter !== "all") {
        params.set("status", rsvpStatusFilter);
      }
      const qs = params.toString();
      const suffix = qs ? `?${qs}` : "";
      const res = await get<string>(
        `/${PLUGIN_ID}/registrations/export.csv${suffix}`
      );
      const csvText =
        typeof res?.data === "string" ? res.data : String(res?.data ?? "");
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.setAttribute("download", "event-registrations.csv");
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toggleNotification({
        type: "danger",
        message: t("attendees.error.load", "Could not load registrations."),
      });
    } finally {
      setExportingCsv(false);
    }
  }, [get, rsvpEventFilter, rsvpStatusFilter, t, toggleNotification]);

  return (
    <Box background="neutral0" hasRadius shadow="tableShadow" padding={4}>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex
          justifyContent="space-between"
          alignItems="flex-end"
          wrap="wrap"
          gap={3}
        >
          <Flex gap={3} wrap="wrap" alignItems="flex-end">
            <Box style={{ minWidth: 240 }}>
              <Field.Root>
                <Field.Label>
                  {t("attendees.search", "Search Attendee or Event")}
                </Field.Label>
                <TextInput
                  value={rsvpSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onRsvpSearchChange(e.target.value)
                  }
                  placeholder={t(
                    "placeholder.name_email_or_event_title",
                    "Name, email, or event title..."
                  )}
                />
              </Field.Root>
            </Box>

            <Box style={{ minWidth: 160 }}>
              <Field.Root>
                <Field.Label>
                  {t("attendees.statusFilter", "Status")}
                </Field.Label>
                <SingleSelect
                  placeholder={t("placeholder.all_statuses", "All Statuses")}
                  value={rsvpStatusFilter}
                  onChange={(val: string) => onRsvpStatusFilterChange(val)}
                >
                  <SingleSelectOption value="all">
                    {t("placeholder.all_statuses", "All Statuses")}
                  </SingleSelectOption>
                  <SingleSelectOption value="confirmed">
                    {t("status.confirmed", "Confirmed")}
                  </SingleSelectOption>
                  <SingleSelectOption value="checked_in">
                    {t("status.checked_in", "Checked In")}
                  </SingleSelectOption>
                  <SingleSelectOption value="waitlisted">
                    {t("status.waitlisted", "Waitlisted")}
                  </SingleSelectOption>
                  <SingleSelectOption value="cancelled">
                    {t("status.cancelled", "Cancelled")}
                  </SingleSelectOption>
                </SingleSelect>
              </Field.Root>
            </Box>

            {rsvpEventFilter && (
              <Button
                size="S"
                variant="tertiary"
                onClick={onClearRsvpEventFilter}
              >
                {t("attendees.clearEventFilter", "Clear Event Filter")} (
                {rsvpEventFilter})
              </Button>
            )}
          </Flex>

          <Button
            size="S"
            variant="secondary"
            loading={exportingCsv}
            onClick={handleExportCsv}
          >
            {t("attendees.exportCsv", "Export CSV")}
          </Button>
        </Flex>

        {registrations.length === 0 ? (
          <Typography variant="omega" textColor="neutral600">
            {t(
              "attendees.empty",
              "No registrations found matching current filters."
            )}
          </Typography>
        ) : (
          <Flex direction="column" alignItems="stretch" gap={2}>
            {registrations.map((reg) => (
              <AttendeeRegistrationRow
                key={reg.documentId}
                reg={reg}
                t={t}
                onCheckIn={onCheckIn}
                onStatusChange={onStatusChange}
              />
            ))}
          </Flex>
        )}
      </Flex>
    </Box>
  );
};
