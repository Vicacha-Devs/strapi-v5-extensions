import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import type { BookingRecord, BookingStatus } from '../../../../shared/types';

export interface BookingSidePanelProps {
  t: (id: string, defaultMessage: string) => string;
  booking: BookingRecord | null;
  onClose: () => void;
  onUpdateStatus: (
    documentId: string,
    status: BookingStatus,
    assignedHost?: string,
    internalNotes?: string
  ) => Promise<void>;
  onOpenInContentManager: (booking: BookingRecord) => void;
}

const BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
];

const BookingDetailsSection: React.FC<{
  t: (id: string, defaultMessage: string) => string;
  booking: BookingRecord;
}> = ({ t, booking }) => (
  <>
    <Flex gap={2} wrap="wrap">
      {booking.resourceName && (
        <Badge backgroundColor="primary100" textColor="primary700">
          {booking.resourceName}
        </Badge>
      )}
      <Badge>
        {t('panel.partySize', 'Party Size')}: {booking.partySize}
      </Badge>
      {booking.preferredLanguage && (
        <Badge>
          {t('panel.language', 'Lang')}: {booking.preferredLanguage.toUpperCase()}
        </Badge>
      )}
    </Flex>

    <Divider />

    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="sigma" textColor="neutral600">
        {t('panel.schedule', 'Schedule')}
      </Typography>
      <Typography variant="omega">
        {booking.startDate.slice(0, 16).replace('T', ' ')} →{' '}
        {booking.endDate.slice(0, 16).replace('T', ' ')} ({booking.timezone})
      </Typography>
      {booking.slotLabel && (
        <Typography variant="pi" textColor="neutral600">
          {t('panel.slotLabel', 'Slot')}: {booking.slotLabel}
        </Typography>
      )}
    </Flex>

    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="sigma" textColor="neutral600">
        {t('panel.customer', 'Customer Details')}
      </Typography>
      <Typography variant="omega" fontWeight="bold">
        {booking.customerName}
      </Typography>
      {booking.organization && (
        <Typography variant="pi" textColor="neutral600">
          {booking.organization}
        </Typography>
      )}
      <Typography variant="pi">{booking.customerEmail}</Typography>
      {booking.customerPhone && (
        <Typography variant="pi">{booking.customerPhone}</Typography>
      )}
      {booking.notes && (
        <Box padding={2} background="neutral100" hasRadius>
          <Typography variant="pi">{booking.notes}</Typography>
        </Box>
      )}
    </Flex>
  </>
);

export const BookingSidePanel: React.FC<BookingSidePanelProps> = ({
  t,
  booking,
  onClose,
  onUpdateStatus,
  onOpenInContentManager,
}) => {
  const [status, setStatus] = useState<BookingStatus>(
    booking?.status ?? 'pending'
  );
  const [assignedHost, setAssignedHost] = useState<string>(
    booking?.assignedHost ?? ''
  );
  const [internalNotes, setInternalNotes] = useState<string>(
    booking?.internalNotes ?? ''
  );
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (booking) {
      setStatus(booking.status);
      setAssignedHost(booking.assignedHost ?? '');
      setInternalNotes(booking.internalNotes ?? '');
    }
  }, [booking]);

  if (!booking) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateStatus(
        booking.documentId,
        status,
        assignedHost.trim() || undefined,
        internalNotes.trim() || undefined
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      padding={5}
      style={{ minWidth: '340px', maxWidth: '420px' }}
    >
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex justifyContent="space-between" alignItems="center">
          <Badge>{booking.bookingCode}</Badge>
          <Button variant="tertiary" size="S" onClick={onClose}>
            {t('panel.close', 'Close')}
          </Button>
        </Flex>

        <Typography variant="delta" tag="h3">
          {booking.title || booking.customerName}
        </Typography>

        <BookingDetailsSection t={t} booking={booking} />

        <Divider />

        <Field.Root>
          <Field.Label>
            {t('panel.status', 'Booking Status')}
          </Field.Label>
          <SingleSelect
            placeholder={t('placeholder.select_booking_status', 'Select booking status')}
            value={status}
            onChange={(val: string | number) =>
              setStatus(String(val) as BookingStatus)
            }
          >
            {BOOKING_STATUSES.map((st) => (
              <SingleSelectOption key={st} value={st}>
                {st.toUpperCase()}
              </SingleSelectOption>
            ))}
          </SingleSelect>
        </Field.Root>

        <Field.Root>
          <Field.Label>
            {t('panel.assignedHost', 'Assigned Staff / Host')}
          </Field.Label>
          <TextInput
            placeholder={t('placeholder.assign_guide_or_host', 'Assign guide or host...')}
            value={assignedHost}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setAssignedHost(e.target.value)
            }
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>
            {t('panel.internalNotes', 'Internal Notes')}
          </Field.Label>
          <Textarea
            placeholder={t('placeholder.internal_staff_notes', 'Internal staff notes...')}
            value={internalNotes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setInternalNotes(e.target.value)
            }
          />
        </Field.Root>

        <Flex gap={2} justifyContent="space-between" wrap="wrap">
          <Button
            variant="default"
            loading={saving}
            onClick={handleSave}
          >
            {t('panel.save', 'Save Changes')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => onOpenInContentManager(booking)}
          >
            {t('panel.openEntry', 'Open in Content Manager')}
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};
