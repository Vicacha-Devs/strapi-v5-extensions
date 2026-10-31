import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  TextInput,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import React, { useMemo, useState } from "react";

import type { ExpandedOccurrence } from "../../../../shared/types";

function formatCategoryLabel(category: string): string {
  const trimmed = category.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

const EVENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: "success100", text: "success700" },
  cancelled: { bg: "danger100", text: "danger700" },
};

function getEventStatusColors(status: string): { bg: string; text: string } {
  return EVENT_STATUS_COLORS[status] ?? { bg: "warning100", text: "warning700" };
}

function matchesCategoryFilter(ev: ExpandedOccurrence, categoryFilter: string): boolean {
  if (categoryFilter === "all") return true;
  return (ev.category ?? "").toLowerCase() === categoryFilter.toLowerCase();
}

function matchesRsvpModeFilter(ev: ExpandedOccurrence, rsvpModeFilter: string): boolean {
  const enabled = Boolean(ev.rsvp?.rsvpEnabled);
  if (rsvpModeFilter === "rsvp") return enabled;
  if (rsvpModeFilter === "info") return !enabled;
  return true;
}

function matchesSearchQuery(ev: ExpandedOccurrence, query: string): boolean {
  if (!query) return true;
  const haystack = [ev.title, ev.location, ev.category, ev.summary]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function formatEventDateLabel(ev: ExpandedOccurrence): string {
  const endKey = ev.endDate ? ev.endDate.slice(0, 10) : "";
  return endKey && endKey !== ev.occurrenceDate
    ? `${ev.occurrenceDate} → ${endKey}`
    : ev.occurrenceDate;
}

interface EventDirectoryRowProps {
  ev: ExpandedOccurrence;
  isSelectedForRsvp: boolean;
  t: (id: string, defaultMessage: string) => string;
  onSelectEventDocId: (docId: string) => void;
  onEditInContentManager: (uid: string, docId: string, locale?: string) => void;
  onOpenInCalendar: (docId?: string) => void;
}

const EventRsvpCell: React.FC<{
  rsvp: ExpandedOccurrence["rsvp"];
  t: (id: string, defaultMessage: string) => string;
}> = ({ rsvp, t }) => {
  if (!rsvp?.rsvpEnabled) {
    return (
      <Badge backgroundColor="neutral150" textColor="neutral600">
        {t("events.directory.noRsvp", "Info / External Link")}
      </Badge>
    );
  }
  const badgeBg = rsvp.isFull ? "warning100" : "primary100";
  const badgeText = rsvp.isFull ? "warning700" : "primary700";
  const seatsLabel =
    rsvp.remainingSeats !== null
      ? `${rsvp.remainingSeats} ${t("events.directory.seatsLeft", "seats available")}`
      : t("sidePanel.open", "Open");

  return (
    <Flex direction="column" alignItems="flex-start" gap={1}>
      <Badge backgroundColor={badgeBg} textColor={badgeText}>
        {rsvp.confirmedSeats} / {rsvp.capacity ?? "∞"}{" "}
        {t("sidePanel.confirmedSeats", "Confirmed Seats")}
      </Badge>
      <Typography variant="pi" textColor="neutral600">
        {seatsLabel}
      </Typography>
    </Flex>
  );
};

const EventDirectoryRow: React.FC<EventDirectoryRowProps> = ({
  ev,
  isSelectedForRsvp,
  t,
  onSelectEventDocId,
  onEditInContentManager,
  onOpenInCalendar,
}) => {
  const dateLabel = formatEventDateLabel(ev);
  const statusColors = getEventStatusColors(ev.status);
  const rsvpEnabled = Boolean(ev.rsvp?.rsvpEnabled);
  const rsvpBtnVariant = isSelectedForRsvp ? "default" : "secondary";
  const rsvpBtnLabel = isSelectedForRsvp
    ? t("attendees.clearEventFilter", "Clear Filter")
    : t("events.directory.filterRsvps", "View RSVPs");

  return (
    <Tr>
      <Td>
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Flex gap={2} alignItems="center" wrap="wrap">
            <Box
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: ev.color || "#0D9488",
                flexShrink: 0,
              }}
            />
            <Typography fontWeight="bold">{ev.title}</Typography>
            {ev.isRecurring && (
              <Badge backgroundColor="secondary100" textColor="secondary700">
                {t("events.directory.recurring", "Recurring")}
              </Badge>
            )}
          </Flex>
          {ev.summary && (
            <Typography
              variant="pi"
              textColor="neutral600"
              style={{
                maxWidth: 360,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {ev.summary}
            </Typography>
          )}
        </Flex>
      </Td>
      <Td>
        {ev.category ? (
          <Badge>{formatCategoryLabel(ev.category)}</Badge>
        ) : (
          <Typography variant="pi" textColor="neutral500">
            —
          </Typography>
        )}
      </Td>
      <Td>
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography variant="omega" fontWeight="semiBold">
            {dateLabel}
          </Typography>
          <Badge backgroundColor={statusColors.bg} textColor={statusColors.text}>
            {t(`status.${ev.status}`, ev.status.toUpperCase())}
          </Badge>
        </Flex>
      </Td>
      <Td>
        <Typography variant="pi" textColor="neutral700">
          {ev.location || "—"}
        </Typography>
      </Td>
      <Td>
        <EventRsvpCell rsvp={ev.rsvp} t={t} />
      </Td>
      <Td>
        <Flex gap={2} wrap="wrap">
          {rsvpEnabled && (
            <Button
              size="S"
              variant={rsvpBtnVariant}
              onClick={() => onSelectEventDocId(isSelectedForRsvp ? "" : ev.documentId)}
            >
              {rsvpBtnLabel}
            </Button>
          )}
          <Button
            size="S"
            variant="tertiary"
            onClick={() => onEditInContentManager(ev.uid, ev.documentId, ev.locale)}
          >
            {t("events.directory.editEvent", "Edit Event")}
          </Button>
          <Button size="S" variant="tertiary" onClick={() => onOpenInCalendar(ev.documentId)}>
            {t("calendar.openUnifiedCalendar", "Calendar")}
          </Button>
        </Flex>
      </Td>
    </Tr>
  );
};

export interface EventsDirectoryPanelProps {
  t: (id: string, defaultMessage: string) => string;
  events: ExpandedOccurrence[];
  selectedEventDocId: string;
  onSelectEventDocId: (docId: string) => void;
  onEditInContentManager: (uid: string, docId: string, locale?: string) => void;
  onOpenInCalendar: (docId?: string) => void;
}

export const EventsDirectoryPanel: React.FC<EventsDirectoryPanelProps> = ({
  t,
  events,
  selectedEventDocId,
  onSelectEventDocId,
  onEditInContentManager,
  onOpenInCalendar,
}) => {
  const [eventSearch, setEventSearch] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [rsvpModeFilter, setRsvpModeFilter] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      if (ev.category) set.add(ev.category);
    }
    return Array.from(set);
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    return events.filter(
      (ev) =>
        matchesCategoryFilter(ev, categoryFilter) &&
        matchesRsvpModeFilter(ev, rsvpModeFilter) &&
        matchesSearchQuery(ev, q)
    );
  }, [events, eventSearch, categoryFilter, rsvpModeFilter]);

  return (
    <Box background="neutral0" hasRadius shadow="tableShadow" padding={4}>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex justifyContent="space-between" alignItems="flex-end" wrap="wrap" gap={3}>
          <Box>
            <Flex gap={2} alignItems="center">
              <Typography variant="delta" tag="h2" fontWeight="bold">
                {t("events.directory.title", "Registered Events")}
              </Typography>
              <Badge backgroundColor="primary100" textColor="primary700">
                {filteredEvents.length}
              </Badge>
            </Flex>
            <Box paddingTop={1}>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  "events.directory.subtitle",
                  "All scheduled and recurring events across your configured sources, including RSVP seat capacity and Content Manager links."
                )}
              </Typography>
            </Box>
          </Box>

          <Flex gap={3} wrap="wrap" alignItems="flex-end">
            <Box style={{ minWidth: 220 }}>
              <Field.Root>
                <Field.Label>{t("events.directory.search", "Search Events")}</Field.Label>
                <TextInput
                  value={eventSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEventSearch(e.target.value)
                  }
                  placeholder={t(
                    "events.directory.searchPlaceholder",
                    "Title, location, category..."
                  )}
                />
              </Field.Root>
            </Box>

            <Box style={{ minWidth: 160 }}>
              <Field.Root>
                <Field.Label>{t("calendar.categoryFilter", "Category")}</Field.Label>
                <SingleSelect
                  value={categoryFilter}
                  onChange={(val: string | number) => setCategoryFilter(String(val))}
                >
                  <SingleSelectOption value="all">
                    {t("calendar.allCategories", "All Categories")}
                  </SingleSelectOption>
                  {categories.map((cat) => (
                    <SingleSelectOption key={cat} value={cat}>
                      {formatCategoryLabel(cat)}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              </Field.Root>
            </Box>

            <Box style={{ minWidth: 160 }}>
              <Field.Root>
                <Field.Label>{t("events.directory.rsvpFilter", "RSVP Mode")}</Field.Label>
                <SingleSelect
                  value={rsvpModeFilter}
                  onChange={(val: string | number) => setRsvpModeFilter(String(val))}
                >
                  <SingleSelectOption value="all">
                    {t("events.directory.allEvents", "All Events")}
                  </SingleSelectOption>
                  <SingleSelectOption value="rsvp">
                    {t("events.directory.rsvpOnly", "With RSVPs Enabled")}
                  </SingleSelectOption>
                  <SingleSelectOption value="info">
                    {t("events.directory.infoOnly", "Informational Only")}
                  </SingleSelectOption>
                </SingleSelect>
              </Field.Root>
            </Box>
          </Flex>
        </Flex>

        {filteredEvents.length === 0 ? (
          <Box padding={4} background="neutral100" hasRadius>
            <Typography variant="omega" textColor="neutral600">
              {t("events.directory.empty", "No events found matching the current filters.")}
            </Typography>
          </Box>
        ) : (
          <Table colCount={6} rowCount={filteredEvents.length + 1}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma">
                    {t("calendar.field.title", "Event Title")}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {t("calendar.categoryFilter", "Category")}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {t("calendar.field.startDate", "Start Date")}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {t("calendar.field.location", "Location")}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {t("sidePanel.rsvpStatus", "RSVP & Capacity")}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {t("events.directory.actions", "Actions")}
                  </Typography>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredEvents.map((ev) => (
                <EventDirectoryRow
                  key={`${ev.uid}:${ev.documentId}`}
                  ev={ev}
                  isSelectedForRsvp={selectedEventDocId === ev.documentId}
                  t={t}
                  onSelectEventDocId={onSelectEventDocId}
                  onEditInContentManager={onEditInContentManager}
                  onOpenInCalendar={onOpenInCalendar}
                />
              ))}
            </Tbody>
          </Table>
        )}
      </Flex>
    </Box>
  );
};
