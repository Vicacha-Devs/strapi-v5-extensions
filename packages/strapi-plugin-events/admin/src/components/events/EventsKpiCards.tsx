import { Badge, Box, Flex, Typography } from "@strapi/design-system";
import React from "react";

import type {
  ExpandedOccurrence,
  RsvpRegistrationRecord,
} from "../../../../shared/types";

export interface DashboardRsvpStats {
  totalEvents: number;
  totalRegistrations: number;
  confirmedSeats: number;
  checkedInSeats: number;
  waitlistedSeats: number;
  distinctEvents: number;
}

export function computeDashboardRsvpStats(
  uniqueEvents: ExpandedOccurrence[],
  registrations: RsvpRegistrationRecord[]
): DashboardRsvpStats {
  let confirmedSeats = 0;
  let checkedInSeats = 0;
  let waitlistedSeats = 0;
  const eventsSet = new Set<string>();

  for (const ev of uniqueEvents) {
    if (ev.rsvp?.rsvpEnabled) {
      eventsSet.add(ev.documentId);
    }
  }

  for (const reg of registrations) {
    const seats = Number(reg.guestsCount) || 1;
    if (reg.eventDocumentId) eventsSet.add(reg.eventDocumentId);
    if (reg.status === "confirmed") confirmedSeats += seats;
    else if (reg.status === "checked_in") checkedInSeats += seats;
    else if (reg.status === "waitlisted") waitlistedSeats += seats;
  }

  return {
    totalEvents: uniqueEvents.length,
    totalRegistrations: registrations.length,
    confirmedSeats,
    checkedInSeats,
    waitlistedSeats,
    distinctEvents: eventsSet.size,
  };
}

export interface EventsKpiCardsProps {
  stats: DashboardRsvpStats;
  t: (id: string, defaultMessage: string) => string;
}

export const EventsKpiCards: React.FC<EventsKpiCardsProps> = ({ stats, t }) => {
  const cards = [
    {
      label: t("stats.totalEvents", "Registered Events"),
      value: stats.totalEvents,
      badge: "primary100",
    },
    {
      label: t("stats.eventsWithRsvps", "Events with RSVPs"),
      value: stats.distinctEvents,
      badge: "secondary100",
    },
    {
      label: t("stats.registrations", "Total Registrations"),
      value: stats.totalRegistrations,
      badge: "neutral100",
    },
    {
      label: t("stats.confirmedSeats", "Confirmed Seats"),
      value: stats.confirmedSeats,
      badge: "primary100",
    },
    {
      label: t("stats.checkedInSeats", "Checked-In Seats"),
      value: stats.checkedInSeats,
      badge: "success100",
    },
    {
      label: t("stats.waitlistedSeats", "Waitlisted Seats"),
      value: stats.waitlistedSeats,
      badge: "warning100",
    },
  ];

  return (
    <Flex gap={4} wrap="wrap">
      {cards.map((card) => (
        <Box
          key={card.label}
          background="neutral0"
          hasRadius
          shadow="tableShadow"
          padding={4}
          style={{ flex: "1 1 160px" }}
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
  );
};
