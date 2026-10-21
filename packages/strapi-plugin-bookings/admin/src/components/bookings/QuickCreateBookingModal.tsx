import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import type {
  BookingResource,
  CreateReservationInput,
} from '../../../../shared/types';

export interface QuickCreateBookingModalProps {
  t: (id: string, defaultMessage: string) => string;
  isOpen: boolean;
  initialStartIso: string;
  resources: BookingResource[];
  onClose: () => void;
  onSubmit: (payload: CreateReservationInput) => Promise<void>;
}

export const QuickCreateBookingModal: React.FC<
  QuickCreateBookingModalProps
> = ({ t, isOpen, initialStartIso, resources, onClose, onSubmit }) => {
  const [resourceDocumentId, setResourceDocumentId] = useState<string>(
    resources[0]?.documentId ?? ''
  );
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [startDate, setStartDate] = useState(
    initialStartIso.length === 10
      ? `${initialStartIso}T09:00:00.000Z`
      : initialStartIso
  );
  const [partySize, setPartySize] = useState(1);
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [assignedHost, setAssignedHost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setStartDate(
      initialStartIso.length === 10
        ? `${initialStartIso}T09:00:00.000Z`
        : initialStartIso
    );
    if (!resourceDocumentId && resources[0]?.documentId) {
      setResourceDocumentId(resources[0].documentId);
    }
  }, [initialStartIso, resources, resourceDocumentId]);

  if (!isOpen) {
    return null;
  }

  const handleCreate = async () => {
    if (!customerName.trim() || !customerEmail.trim()) {
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        resourceDocumentId: resourceDocumentId || undefined,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
        organization: organization.trim() || undefined,
        startDate,
        partySize: Math.max(1, partySize),
        preferredLanguage: preferredLanguage.trim() || undefined,
        assignedHost: assignedHost.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="popupShadow"
      padding={6}
      style={{
        position: 'fixed',
        top: '12%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: '100%',
        maxWidth: '520px',
      }}
    >
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Typography variant="beta" tag="h2">
          {t('modal.createTitle', 'New Reservation / Booking')}
        </Typography>

        {resources.length > 0 && (
          <SingleSelect
            label={t('modal.resource', 'Bookable Resource')}
            value={resourceDocumentId}
            onChange={(val: string | number) => setResourceDocumentId(String(val))}
          >
            {resources.map((res) => (
              <SingleSelectOption key={res.documentId} value={res.documentId}>
                {res.name}
              </SingleSelectOption>
            ))}
          </SingleSelect>
        )}

        <TextInput
          label={t('modal.customerName', 'Customer Name')}
          value={customerName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setCustomerName(e.target.value)
          }
        />

        <TextInput
          label={t('modal.customerEmail', 'Customer Email')}
          value={customerEmail}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setCustomerEmail(e.target.value)
          }
        />

        <Flex gap={3} wrap="wrap">
          <Box style={{ flex: 1 }}>
            <TextInput
              label={t('modal.customerPhone', 'Phone')}
              value={customerPhone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCustomerPhone(e.target.value)
              }
            />
          </Box>
          <Box style={{ flex: 1 }}>
            <TextInput
              label={t('modal.organization', 'Organization')}
              value={organization}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setOrganization(e.target.value)
              }
            />
          </Box>
        </Flex>

        <Flex gap={3} wrap="wrap">
          <Box style={{ flex: 2 }}>
            <TextInput
              label={t('modal.startDate', 'Start Date & Time (ISO)')}
              value={startDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setStartDate(e.target.value)
              }
            />
          </Box>
          <Box style={{ flex: 1 }}>
            <NumberInput
              label={t('modal.partySize', 'Party Size')}
              value={partySize}
              onValueChange={(val: number | undefined) =>
                setPartySize(Math.max(1, Number(val ?? 1)))
              }
            />
          </Box>
        </Flex>

        <Flex gap={3} wrap="wrap">
          <Box style={{ flex: 1 }}>
            <TextInput
              label={t('modal.preferredLanguage', 'Preferred Language')}
              value={preferredLanguage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPreferredLanguage(e.target.value)
              }
            />
          </Box>
          <Box style={{ flex: 1 }}>
            <TextInput
              label={t('modal.assignedHost', 'Assigned Host / Staff')}
              value={assignedHost}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAssignedHost(e.target.value)
              }
            />
          </Box>
        </Flex>

        <Textarea
          label={t('modal.notes', 'Notes')}
          value={notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setNotes(e.target.value)
          }
        />

        <Flex justifyContent="flex-end" gap={2}>
          <Button variant="tertiary" onClick={onClose}>
            {t('modal.cancel', 'Cancel')}
          </Button>
          <Button
            variant="default"
            loading={saving}
            onClick={handleCreate}
          >
            {t('modal.create', 'Create Booking')}
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};
