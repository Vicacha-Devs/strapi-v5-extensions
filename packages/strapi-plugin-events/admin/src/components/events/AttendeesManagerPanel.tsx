import React from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { PLUGIN_ID } from '../../../../shared/pluginId';
import type { RsvpRegistrationRecord, RsvpStatus } from '../../../../shared/types';

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
  return (
    <Box background="neutral0" hasRadius shadow="tableShadow" padding={4}>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex justifyContent="space-between" alignItems="flex-end" wrap="wrap" gap={3}>
          <Flex gap={3} wrap="wrap" alignItems="flex-end">
            <Box style={{ minWidth: 240 }}>
              <Typography variant="pi" fontWeight="bold">
                {t('attendees.search', 'Search Attendee or Event')}
              </Typography>
              <TextInput
                value={rsvpSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onRsvpSearchChange(e.target.value)
                }
                placeholder="Name, email, or event title..."
              />
            </Box>

            <Box style={{ minWidth: 160 }}>
              <Typography variant="pi" fontWeight="bold">
                {t('attendees.statusFilter', 'Status')}
              </Typography>
              <SingleSelect
                value={rsvpStatusFilter}
                onChange={(val: string) => onRsvpStatusFilterChange(val)}
              >
                <SingleSelectOption value="all">All Statuses</SingleSelectOption>
                <SingleSelectOption value="confirmed">Confirmed</SingleSelectOption>
                <SingleSelectOption value="checked_in">Checked In</SingleSelectOption>
                <SingleSelectOption value="waitlisted">Waitlisted</SingleSelectOption>
                <SingleSelectOption value="cancelled">Cancelled</SingleSelectOption>
              </SingleSelect>
            </Box>

            {rsvpEventFilter && (
              <Button size="S" variant="tertiary" onClick={onClearRsvpEventFilter}>
                {t('attendees.clearEventFilter', 'Clear Event Filter')} ({rsvpEventFilter})
              </Button>
            )}
          </Flex>

          <Button
            size="S"
            variant="secondary"
            tag="a"
            href={`/${PLUGIN_ID}/registrations/export.csv${
              rsvpEventFilter ? `?eventDocumentId=${encodeURIComponent(rsvpEventFilter)}` : ''
            }`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('attendees.exportCsv', 'Export CSV')}
          </Button>
        </Flex>

        {registrations.length === 0 ? (
          <Typography variant="omega" textColor="neutral600">
            {t('attendees.empty', 'No registrations found matching current filters.')}
          </Typography>
        ) : (
          <Flex direction="column" alignItems="stretch" gap={2}>
            {registrations.map((reg) => (
              <Box
                key={reg.documentId}
                padding={3}
                background="neutral100"
                hasRadius
              >
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
                        {reg.guestsCount} {reg.guestsCount === 1 ? 'seat' : 'seats'}
                      </Badge>
                      <Badge
                        backgroundColor={
                          reg.status === 'checked_in'
                            ? 'success100'
                            : reg.status === 'confirmed'
                              ? 'primary100'
                              : reg.status === 'waitlisted'
                                ? 'warning100'
                                : 'danger100'
                        }
                        textColor={
                          reg.status === 'checked_in'
                            ? 'success700'
                            : reg.status === 'confirmed'
                              ? 'primary700'
                              : reg.status === 'waitlisted'
                                ? 'warning700'
                                : 'danger700'
                        }
                      >
                        {reg.status.toUpperCase()}
                      </Badge>
                    </Flex>

                    <Box paddingTop={1}>
                      <Typography variant="pi" textColor="neutral600">
                        {reg.eventTitle || reg.eventDocumentId} • {reg.occurrenceDate}
                        {reg.attendeePhone ? ` • ${reg.attendeePhone}` : ''}
                      </Typography>
                    </Box>
                  </Box>

                  <Flex gap={2} alignItems="center">
                    {reg.status !== 'checked_in' && reg.status !== 'cancelled' && (
                      <Button
                        size="S"
                        variant="default"
                        onClick={() => onCheckIn(reg.documentId)}
                      >
                        ✓ {t('attendees.checkIn', 'Check In')}
                      </Button>
                    )}

                    <Box style={{ minWidth: 145 }}>
                      <SingleSelect
                        value={reg.status}
                        onChange={(nextSt: string) =>
                          onStatusChange(reg.documentId, nextSt as RsvpStatus)
                        }
                      >
                        <SingleSelectOption value="confirmed">Confirmed</SingleSelectOption>
                        <SingleSelectOption value="checked_in">Checked In</SingleSelectOption>
                        <SingleSelectOption value="waitlisted">Waitlisted</SingleSelectOption>
                        <SingleSelectOption value="cancelled">Cancelled</SingleSelectOption>
                      </SingleSelect>
                    </Box>
                  </Flex>
                </Flex>
              </Box>
            ))}
          </Flex>
        )}
      </Flex>
    </Box>
  );
};
