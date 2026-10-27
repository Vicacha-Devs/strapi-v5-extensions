import React, { useState } from 'react';
import {
  Box,
  Button,
  Field,
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
  const [bookingDate, setBookingDate] = useState(
    initialStartIso.slice(0, 10)
  );
  const [bookingTime, setBookingTime] = useState(
    initialStartIso.includes('T')
      ? initialStartIso.slice(11, 16)
      : '09:00'
  );
  const [partySize, setPartySize] = useState(1);
  const [preferredLanguage, setPreferredLanguage] = useState('es');
  const [assignedHost, setAssignedHost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setBookingDate(initialStartIso.slice(0, 10));
    setBookingTime(
      initialStartIso.includes('T')
        ? initialStartIso.slice(11, 16)
        : '09:00'
    );
    if (!resourceDocumentId && resources[0]?.documentId) {
      setResourceDocumentId(resources[0].documentId);
    }
  }, [initialStartIso, resources, resourceDocumentId]);

  if (!isOpen) {
    return null;
  }

  const handleCreate = async () => {
    if (!customerName.trim() || !customerEmail.trim() || !bookingDate) {
      return;
    }
    setSaving(true);
    try {
      const startIso = `${bookingDate}T${bookingTime || '09:00'}:00.000Z`;
      await onSubmit({
        resourceDocumentId: resourceDocumentId || undefined,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
        organization: organization.trim() || undefined,
        startDate: startIso,
        partySize: Math.max(1, partySize),
        preferredLanguage: preferredLanguage.trim() || undefined,
        assignedHost: assignedHost.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setOrganization('');
      setNotes('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <Box
        background="neutral0"
        hasRadius
        shadow="popupShadow"
        padding={6}
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid rgba(186, 230, 253, 0.5)',
        }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Flex direction="column" alignItems="stretch" gap={4}>
          <Flex justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="beta" tag="h2">
                {t('modal.createTitle', 'New Reservation / Booking')}
              </Typography>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  'modal.createSubtitle',
                  'Enter visitor or group details to schedule a confirmed or pending slot'
                )}
              </Typography>
            </Box>
            <Button variant="tertiary" size="S" onClick={onClose}>
              ✕
            </Button>
          </Flex>

          {resources.length > 0 && (
            <Field.Root>
              <Field.Label>
                {t('modal.resource', 'Bookable Resource / Service')}
              </Field.Label>
              <SingleSelect
                placeholder={t('placeholder.select_bookable_resource', 'Select bookable resource')}
                value={resourceDocumentId}
                onChange={(val: string | number) =>
                  setResourceDocumentId(String(val))
                }
              >
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
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <Field.Root required>
              <Field.Label>
                {t('modal.customerName', 'Visitor / Customer Name *')}
              </Field.Label>
              <TextInput
                placeholder={t('placeholder.e_g_prof_carlos_m_ndez', 'e.g., Prof. Carlos Méndez')}
                value={customerName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCustomerName(e.target.value)
                }
              />
            </Field.Root>

            <Field.Root required>
              <Field.Label>
                {t('modal.customerEmail', 'Customer Email *')}
              </Field.Label>
              <TextInput
                type="email"
                placeholder={t('placeholder.visitor_example_org', 'visitor@example.org')}
                value={customerEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCustomerEmail(e.target.value)
                }
              />
            </Field.Root>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <Field.Root>
              <Field.Label>
                {t('modal.customerPhone', 'Phone / WhatsApp')}
              </Field.Label>
              <TextInput
                placeholder={t('placeholder.57_300_000_0000', '+57 300 000 0000')}
                value={customerPhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCustomerPhone(e.target.value)
                }
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>
                {t('modal.organization', 'Organization / School / University')}
              </Field.Label>
              <TextInput
                placeholder={t('placeholder.e_g_universidad_nacional', 'e.g., Universidad Nacional')}
                value={organization}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setOrganization(e.target.value)
                }
              />
            </Field.Root>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 12,
            }}
          >
            <Field.Root required>
              <Field.Label>
                {t('modal.bookingDate', 'Preferred Date *')}
              </Field.Label>
              <TextInput
                type="date"
                placeholder={t('placeholder.yyyy_mm_dd', 'YYYY-MM-DD')}
                value={bookingDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setBookingDate(e.target.value)
                }
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>
                {t('modal.bookingTime', 'Start Time')}
              </Field.Label>
              <TextInput
                type="time"
                placeholder={t('placeholder.09_00', '09:00')}
                value={bookingTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setBookingTime(e.target.value)
                }
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>
                {t('modal.partySize', 'Group / Party Size')}
              </Field.Label>
              <NumberInput
                placeholder={t('placeholder.1', '1')}
                value={partySize}
                onValueChange={(val: number | undefined) =>
                  setPartySize(Math.max(1, Number(val ?? 1)))
                }
              />
            </Field.Root>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <Field.Root>
              <Field.Label>
                {t('modal.preferredLanguage', 'Preferred Guide Language')}
              </Field.Label>
              <SingleSelect
                placeholder={t('placeholder.select_preferred_language', 'Select preferred language')}
                value={preferredLanguage || 'es'}
                onChange={(val: string | number) =>
                  setPreferredLanguage(String(val))
                }
              >
                <SingleSelectOption value="es">
                  Español (ES)
                </SingleSelectOption>
                <SingleSelectOption value="en">
                  English (EN)
                </SingleSelectOption>
                <SingleSelectOption value="ar">
                  العربية — Arabic (AR)
                </SingleSelectOption>
                <SingleSelectOption value="tr">
                  Türkçe — Turkish (TR)
                </SingleSelectOption>
              </SingleSelect>
            </Field.Root>

            <Field.Root>
              <Field.Label>
                {t('modal.assignedHost', 'Assigned Host / Staff')}
              </Field.Label>
              <TextInput
                placeholder={t('placeholder.e_g_sheikh_ahmad_guide_team', 'e.g., Sheikh Ahmad / Guide Team')}
                value={assignedHost}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAssignedHost(e.target.value)
                }
              />
            </Field.Root>
          </div>

          <Field.Root>
            <Field.Label>
              {t('modal.notes', 'Visitor Notes & Special Requests')}
            </Field.Label>
            <Textarea
              placeholder={t('placeholder.academic_group_visit_accessibility_needs_or_topi', 'Academic group visit, accessibility needs, or topic requests...')}
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNotes(e.target.value)
              }
            />
          </Field.Root>

          <Flex justifyContent="flex-end" gap={2} paddingTop={2}>
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
    </div>
  );
};
