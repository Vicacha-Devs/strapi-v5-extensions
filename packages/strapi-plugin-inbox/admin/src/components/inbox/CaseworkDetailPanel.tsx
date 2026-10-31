import * as React from 'react';
import { useIntl } from 'react-intl';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import {
  PLUGIN_ID,
  SUBMISSION_PRIORITIES,
  SUBMISSION_STATUSES,
  type ChecklistItem,
  type FormRecord,
  type SubmissionPriority,
  type SubmissionRecord,
  type SubmissionStatus,
} from '../../../../shared';
import {
  CaseworkPayloadChecklistColumn,
  formatFieldKeyLabel,
} from './CaseworkPayloadChecklistColumn';

export { formatFieldKeyLabel };

export interface CaseworkDetailPanelProps {
  t: (id: string, defaultMessage: string) => string;
  submission: SubmissionRecord;
  form?: FormRecord | null;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  onStatusMessage: (msg: string) => void;
  onReload: () => Promise<void>;
  onClose: () => void;
}

interface CaseworkHeaderBarProps {
  t: (id: string, defaultMessage: string) => string;
  submission: SubmissionRecord;
  onClose: () => void;
}

const CaseworkHeaderBar: React.FC<CaseworkHeaderBarProps> = ({
  t,
  submission,
  onClose,
}) => (
  <Flex justifyContent="space-between" alignItems="center" paddingBottom={3} wrap="wrap" gap={2}>
    <Flex gap={3} alignItems="center" wrap="wrap">
      <Typography variant="delta" fontWeight="bold">
        {t('page.ui.casework_inspector', 'Casework Inspector')}: {submission.referenceCode}
      </Typography>
      <Badge>{submission.formSlug}</Badge>
      {submission.secondaryDate?.formatted ? (
        <Badge>{submission.secondaryDate.formatted}</Badge>
      ) : null}
      {submission.linkedBookingId ? (
        <Badge active>
          {t('page.ui.booking_badge', 'Booking')}: {submission.linkedBookingId}
        </Badge>
      ) : null}
      {submission.linkedCertificateNumber ? (
        <Badge active>
          {t('page.ui.cert_badge', 'Cert')}: {submission.linkedCertificateNumber}
        </Badge>
      ) : null}
    </Flex>
    <Button variant="tertiary" size="S" onClick={onClose}>
      {t('page.ui.close_inspector', 'Close Inspector')}
    </Button>
  </Flex>
);

interface CaseworkQuickBridgesProps {
  t: (id: string, defaultMessage: string) => string;
  bookingServiceSlug: string;
  onBookingServiceSlugChange: (val: string) => void;
  bookingDate: string;
  onBookingDateChange: (val: string) => void;
  bookingTime: string;
  onBookingTimeChange: (val: string) => void;
  onBookSlot: () => void;
  certTemplateSlug: string;
  onCertTemplateSlugChange: (val: string) => void;
  certRecipient: string;
  onCertRecipientChange: (val: string) => void;
  requireVerifiedChecklist: boolean;
  onRequireVerifiedChecklistChange: (val: boolean) => void;
  onIssueCert: () => void;
}

const CaseworkQuickBridges: React.FC<CaseworkQuickBridgesProps> = ({
  t,
  bookingServiceSlug,
  onBookingServiceSlugChange,
  bookingDate,
  onBookingDateChange,
  bookingTime,
  onBookingTimeChange,
  onBookSlot,
  certTemplateSlug,
  onCertTemplateSlugChange,
  certRecipient,
  onCertRecipientChange,
  requireVerifiedChecklist,
  onRequireVerifiedChecklistChange,
  onIssueCert,
}) => (
  <Flex gap={3} paddingTop={3} wrap="wrap" alignItems="stretch">
    <Box background="neutral100" padding={3} hasRadius style={{ flex: '1 1 180px' }}>
      <Typography variant="sigma">
        {t('page.ui.schedule_appointment', 'Schedule Appointment')}
      </Typography>
      <Flex direction="column" alignItems="stretch" gap={2} paddingTop={2}>
        <TextInput
          name="bookingServiceSlug"
          placeholder={t('placeholder.service_slug', 'Service slug')}
          value={bookingServiceSlug}
          onChange={(e: { target: { value: string } }) =>
            onBookingServiceSlugChange(e.target.value)
          }
        />
        <Flex gap={2}>
          <TextInput
            name="bookingDate"
            type="date"
            value={bookingDate}
            onChange={(e: { target: { value: string } }) =>
              onBookingDateChange(e.target.value)
            }
          />
          <TextInput
            name="bookingTime"
            placeholder="10:00"
            value={bookingTime}
            onChange={(e: { target: { value: string } }) =>
              onBookingTimeChange(e.target.value)
            }
          />
        </Flex>
        <Button size="S" variant="secondary" onClick={onBookSlot}>
          {t('page.ui.book_slot', 'Book Slot')}
        </Button>
      </Flex>
    </Box>

    <Box background="neutral100" padding={3} hasRadius style={{ flex: '1 1 180px' }}>
      <Typography variant="sigma">
        {t('page.ui.issue_certificate', 'Issue Certificate')}
      </Typography>
      <Flex direction="column" alignItems="stretch" gap={2} paddingTop={2}>
        <TextInput
          name="certTemplateSlug"
          placeholder={t('placeholder.template_slug', 'Template slug')}
          value={certTemplateSlug}
          onChange={(e: { target: { value: string } }) =>
            onCertTemplateSlugChange(e.target.value)
          }
        />
        <TextInput
          name="certRecipient"
          placeholder={t('placeholder.recipient_full_name', 'Recipient full name')}
          value={certRecipient}
          onChange={(e: { target: { value: string } }) =>
            onCertRecipientChange(e.target.value)
          }
        />
        <Checkbox
          checked={requireVerifiedChecklist}
          onCheckedChange={(c: boolean) => onRequireVerifiedChecklistChange(Boolean(c))}
        >
          {t('page.ui.require_verified_checklist', 'Require verified checklist')}
        </Checkbox>
        <Button size="S" variant="secondary" onClick={onIssueCert}>
          {t('page.ui.issue_cert', 'Issue Cert')}
        </Button>
      </Flex>
    </Box>
  </Flex>
);

export const CaseworkDetailPanel: React.FC<CaseworkDetailPanelProps> = ({
  t,
  submission,
  form,
  post,
  put,
  onStatusMessage,
  onReload,
  onClose,
}) => {
  const { locale } = useIntl();
  const shortLocale = (locale || 'es').split('-')[0].toLowerCase();

  const [status, setStatus] = React.useState<SubmissionStatus>(submission.status);
  const [priority, setPriority] = React.useState<SubmissionPriority>(submission.priority);
  const [department, setDepartment] = React.useState<string>(submission.department || 'general');
  const [assignedTo, setAssignedTo] = React.useState<string>(submission.assignedTo || '');
  const [staffNotes, setStaffNotes] = React.useState<string>(submission.staffNotes || '');
  const [checklist, setChecklist] = React.useState<ChecklistItem[]>(
    submission.checklistItems || []
  );

  const [bookingServiceSlug, setBookingServiceSlug] = React.useState<string>(
    form?.settings?.defaultBookingServiceSlug || 'general-appointment'
  );
  const [bookingDate, setBookingDate] = React.useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [bookingTime, setBookingTime] = React.useState<string>('10:00');

  const [certTemplateSlug, setCertTemplateSlug] = React.useState<string>(
    form?.settings?.defaultCertificateTemplateId || 'official-service-certificate'
  );
  const [certRecipient, setCertRecipient] = React.useState<string>(
    submission.applicantName || ''
  );
  const [requireVerifiedChecklist, setRequireVerifiedChecklist] =
    React.useState<boolean>(true);

  React.useEffect(() => {
    setStatus(submission.status);
    setPriority(submission.priority);
    setDepartment(submission.department || 'general');
    setAssignedTo(submission.assignedTo || '');
    setStaffNotes(submission.staffNotes || '');
    setChecklist(submission.checklistItems || []);
    setCertRecipient(submission.applicantName || '');
  }, [submission]);

  const handleToggleChecklistItem = async (itemId: string, verified: boolean) => {
    const nextChecklist = checklist.map((item) =>
      item.id === itemId
        ? {
            ...item,
            verified,
            verifiedAt: verified ? new Date().toISOString() : undefined,
          }
        : item
    );
    setChecklist(nextChecklist);
    if (!submission.documentId) return;
    await put(`/${PLUGIN_ID}/submissions/${submission.documentId}/casework`, {
      checklistItems: nextChecklist,
    });
    onStatusMessage(
      `${t('page.ui.checklist_updated', 'Checklist updated')}: ${submission.referenceCode}`
    );
    await onReload();
  };

  const handleSaveCasework = async () => {
    if (!submission.documentId) return;
    await put(`/${PLUGIN_ID}/submissions/${submission.documentId}/casework`, {
      status,
      priority,
      department,
      assignedTo,
      staffNotes,
      checklistItems: checklist,
    });
    onStatusMessage(
      `${t('page.ui.casework_saved', 'Saved casework updates')}: ${submission.referenceCode}`
    );
    await onReload();
  };

  const handleCustomBooking = async () => {
    if (!submission.documentId) return;
    await post(`/${PLUGIN_ID}/submissions/${submission.documentId}/schedule-booking`, {
      serviceSlug: bookingServiceSlug,
      date: bookingDate,
      startTime: bookingTime,
      notes: staffNotes || `Casework Ref: ${submission.referenceCode}`,
    });
    onStatusMessage(
      `${t('page.ui.appointment_scheduled', 'Appointment scheduled')} (${bookingDate} ${bookingTime})`
    );
    await onReload();
  };

  const handleCustomCertificate = async () => {
    if (!submission.documentId) return;
    try {
      await post(`/${PLUGIN_ID}/submissions/${submission.documentId}/issue-certificate`, {
        templateSlug: certTemplateSlug,
        recipientName: certRecipient || submission.applicantName,
        requireChecklistVerified: requireVerifiedChecklist,
      });
      onStatusMessage(
        `${t('page.ui.certificate_issued', 'Certificate issued')}: ${submission.referenceCode}`
      );
      await onReload();
    } catch (err) {
      const fallbackError = t(
        'page.ui.verify_checklist_error',
        'Cannot issue certificate: verify required checklist items first'
      );
      onStatusMessage(err instanceof Error ? err.message : fallbackError);
    }
  };

  const dataEntries = Object.entries(submission.data || {});

  return (
    <Box
      background="neutral0"
      padding={5}
      shadow="filterShadow"
      hasRadius
      marginBottom={5}
    >
      <CaseworkHeaderBar t={t} submission={submission} onClose={onClose} />

      <Divider />

      <Flex gap={5} paddingTop={4} alignItems="flex-start" wrap="wrap">
        <CaseworkPayloadChecklistColumn
          t={t}
          shortLocale={shortLocale}
          dataEntries={dataEntries}
          form={form}
          checklist={checklist}
          onToggleChecklistItem={handleToggleChecklistItem}
        />

        <Box style={{ flex: '1 1 400px' }}>
          <Flex gap={3} wrap="wrap">
            <Box style={{ flex: '1 1 130px' }}>
              <Field.Root>
                <Field.Label>{t('page.ui.status', 'Status')}</Field.Label>
                <SingleSelect
                  value={status}
                  onChange={(v: string | number) => setStatus(v as SubmissionStatus)}
                >
                  {SUBMISSION_STATUSES.map((st) => (
                    <SingleSelectOption key={st} value={st}>
                      {st}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              </Field.Root>
            </Box>
            <Box style={{ flex: '1 1 130px' }}>
              <Field.Root>
                <Field.Label>{t('page.ui.priority', 'Priority')}</Field.Label>
                <SingleSelect
                  value={priority}
                  onChange={(v: string | number) => setPriority(v as SubmissionPriority)}
                >
                  {SUBMISSION_PRIORITIES.map((pr) => (
                    <SingleSelectOption key={pr} value={pr}>
                      {pr}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              </Field.Root>
            </Box>
            <Box style={{ flex: '1 1 150px' }}>
              <Field.Root>
                <Field.Label>{t('page.ui.assignee', 'Assignee')}</Field.Label>
                <TextInput
                  name="assignedTo"
                  placeholder={t('placeholder.assignee_example', 'e.g. Sheikh Ahmad')}
                  value={assignedTo}
                  onChange={(e: { target: { value: string } }) => setAssignedTo(e.target.value)}
                />
              </Field.Root>
            </Box>
          </Flex>

          <Box paddingTop={3} paddingBottom={3}>
            <Field.Root>
              <Field.Label>{t('page.ui.internal_staff_notes', 'Internal Staff Notes')}</Field.Label>
              <Textarea
                name="staffNotes"
                value={staffNotes}
                onChange={(e: { target: { value: string } }) => setStaffNotes(e.target.value)}
              />
            </Field.Root>
            <Flex justifyContent="flex-end" paddingTop={2}>
              <Button size="S" onClick={handleSaveCasework}>
                {t('page.ui.save_casework_notes', 'Save Casework & Notes')}
              </Button>
            </Flex>
          </Box>

          <Divider />

          <CaseworkQuickBridges
            t={t}
            bookingServiceSlug={bookingServiceSlug}
            onBookingServiceSlugChange={setBookingServiceSlug}
            bookingDate={bookingDate}
            onBookingDateChange={setBookingDate}
            bookingTime={bookingTime}
            onBookingTimeChange={setBookingTime}
            onBookSlot={handleCustomBooking}
            certTemplateSlug={certTemplateSlug}
            onCertTemplateSlugChange={setCertTemplateSlug}
            certRecipient={certRecipient}
            onCertRecipientChange={setCertRecipient}
            requireVerifiedChecklist={requireVerifiedChecklist}
            onRequireVerifiedChecklistChange={setRequireVerifiedChecklist}
            onIssueCert={handleCustomCertificate}
          />
        </Box>
      </Flex>
    </Box>
  );
};
