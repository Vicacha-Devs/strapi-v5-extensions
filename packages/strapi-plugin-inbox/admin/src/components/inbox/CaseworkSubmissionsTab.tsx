import * as React from 'react';
import {
  Badge,
  Box,
  Button,
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
} from '@strapi/design-system';
import {
  PLUGIN_ID,
  SUBMISSION_PRIORITIES,
  SUBMISSION_STATUSES,
  type FormRecord,
  type SubmissionRecord,
} from '../../../../shared';
import { CaseworkDetailPanel } from './CaseworkDetailPanel';

export interface CaseworkSubmissionsTabProps {
  t: (id: string, defaultMessage: string) => string;
  submissions: SubmissionRecord[];
  forms?: FormRecord[];
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  onStatusMessage: (msg: string) => void;
  onReload: () => Promise<void>;
}

const matchesSubmissionFilters = (
  sub: SubmissionRecord,
  statusFilter: string,
  priorityFilter: string,
  searchQuery: string
): boolean => {
  if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
  if (priorityFilter !== 'all' && sub.priority !== priorityFilter) return false;
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    sub.referenceCode,
    sub.formSlug,
    sub.department,
    sub.applicantName,
    sub.applicantEmail,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
};

interface SubmissionRowProps {
  key?: string;
  t: (id: string, defaultMessage: string) => string;
  sub: SubmissionRecord;
  isSelected: boolean;
  onToggleInspect: (refCode: string, isSelected: boolean) => void;
  onScheduleBooking: (documentId?: string) => void;
  onIssueCertificate: (documentId?: string) => void;
  onMarkCompleted: (documentId?: string) => void;
}

const SubmissionRow: React.FC<SubmissionRowProps> = ({
  t,
  sub,
  isSelected,
  onToggleInspect,
  onScheduleBooking,
  onIssueCertificate,
  onMarkCompleted,
}) => {
  const items = sub.checklistItems || [];
  const totalChecklist = items.length;
  const verifiedChecklist = items.filter((c) => c.verified).length;
  const linkedSummary = [sub.linkedBookingId, sub.linkedCertificateNumber]
    .filter(Boolean)
    .join(' • ');

  return (
    <Tr key={sub.referenceCode}>
      <Td>
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography fontWeight="bold">{sub.referenceCode}</Typography>
          {linkedSummary ? (
            <Typography variant="pi" textColor="neutral500">
              {linkedSummary}
            </Typography>
          ) : null}
        </Flex>
      </Td>
      <Td>
        <Flex direction="column" alignItems="flex-start">
          <Typography fontWeight="semiBold">
            {sub.applicantName || t('page.ui.anonymous', 'Anonymous')}
          </Typography>
          {sub.applicantEmail ? (
            <Typography variant="pi" textColor="neutral500">
              {sub.applicantEmail}
            </Typography>
          ) : null}
        </Flex>
      </Td>
      <Td>
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography>
            {sub.formSlug} ({sub.department || 'general'})
          </Typography>
          {totalChecklist > 0 ? (
            <Typography variant="pi" textColor="neutral500">
              {t('page.ui.checklist', 'Checklist')}: {verifiedChecklist}/{totalChecklist}{' '}
              {t('page.ui.verified', 'verified')}
            </Typography>
          ) : null}
        </Flex>
      </Td>
      <Td>
        <Flex gap={2}>
          <Badge>{sub.status}</Badge>
          <Badge>{sub.priority}</Badge>
        </Flex>
      </Td>
      <Td>
        <Flex direction="column" alignItems="flex-start">
          <Typography>{sub.submittedAt?.slice(0, 10)}</Typography>
          <Typography variant="pi" textColor="neutral500">
            {sub.secondaryDate?.formatted || '-'}
          </Typography>
        </Flex>
      </Td>
      <Td>
        <Flex gap={2}>
          <Button
            size="S"
            variant={isSelected ? 'default' : 'tertiary'}
            onClick={() => onToggleInspect(sub.referenceCode, isSelected)}
          >
            {isSelected
              ? t('page.ui.hide_details', 'Close')
              : t('page.ui.inspect', 'Inspect')}
          </Button>
          <Button
            size="S"
            variant="secondary"
            onClick={() => onScheduleBooking(sub.documentId)}
          >
            {t('page.ui.book_slot', 'Book Slot')}
          </Button>
          <Button
            size="S"
            variant="secondary"
            onClick={() => onIssueCertificate(sub.documentId)}
          >
            {t('page.ui.issue_cert', 'Issue Cert')}
          </Button>
          <Button
            size="S"
            variant="tertiary"
            onClick={() => onMarkCompleted(sub.documentId)}
          >
            {t('page.ui.complete', 'Complete')}
          </Button>
        </Flex>
      </Td>
    </Tr>
  );
};

export const CaseworkSubmissionsTab: React.FC<CaseworkSubmissionsTabProps> = ({
  t,
  submissions,
  forms = [],
  post,
  put,
  onStatusMessage,
  onReload,
}) => {
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
  const [selectedRefCode, setSelectedRefCode] = React.useState<string | null>(null);

  const selectedSubmission = React.useMemo(
    () => submissions.find((s) => s.referenceCode === selectedRefCode) || null,
    [submissions, selectedRefCode]
  );

  const selectedForm = React.useMemo(
    () =>
      selectedSubmission
        ? forms.find((f) => f.slug === selectedSubmission.formSlug) || null
        : null,
    [forms, selectedSubmission]
  );

  const handleScheduleBooking = async (documentId?: string) => {
    if (!documentId) return;
    await post(`/${PLUGIN_ID}/submissions/${documentId}/schedule-booking`, {
      serviceSlug: 'general-appointment',
      date: new Date().toISOString().slice(0, 10),
      startTime: '10:00',
    });
    onStatusMessage('Appointment scheduled via Bookings bridge');
    await onReload();
  };

  const handleIssueCertificate = async (documentId?: string) => {
    if (!documentId) return;
    await post(`/${PLUGIN_ID}/submissions/${documentId}/issue-certificate`, {
      requireChecklistVerified: false,
    });
    onStatusMessage('Certificate issued via Certificates bridge');
    await onReload();
  };

  const handleMarkCompleted = async (documentId?: string) => {
    if (!documentId) return;
    await put(`/${PLUGIN_ID}/submissions/${documentId}/casework`, {
      status: 'completed',
    });
    onStatusMessage('Submission marked as completed');
    await onReload();
  };

  const filteredSubmissions = React.useMemo(
    () =>
      submissions.filter((sub) =>
        matchesSubmissionFilters(sub, statusFilter, priorityFilter, searchQuery)
      ),
    [submissions, statusFilter, priorityFilter, searchQuery]
  );

  return (
    <Box paddingTop={5}>
      <Flex
        justifyContent="space-between"
        alignItems="center"
        paddingBottom={4}
        wrap="wrap"
        gap={3}
      >
        <Box style={{ flex: '1 1 280px', maxWidth: 420 }}>
          <TextInput
            name="searchSubmissions"
            placeholder={t(
              'placeholder.search_submissions',
              'Search by reference code, applicant, or form...'
            )}
            value={searchQuery}
            onChange={(e: { target: { value: string } }) =>
              setSearchQuery(e.target.value)
            }
          />
        </Box>

        <Flex gap={3} wrap="wrap">
          <Box style={{ minWidth: 170 }}>
            <SingleSelect
              value={statusFilter}
              onChange={(val: string | number) => setStatusFilter(String(val))}
            >
              <SingleSelectOption value="all">
                {t('page.ui.all_statuses', 'Status: All')}
              </SingleSelectOption>
              {SUBMISSION_STATUSES.map((st) => (
                <SingleSelectOption key={st} value={st}>
                  {t('page.ui.status', 'Status')}: {st}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Box>

          <Box style={{ minWidth: 170 }}>
            <SingleSelect
              value={priorityFilter}
              onChange={(val: string | number) => setPriorityFilter(String(val))}
            >
              <SingleSelectOption value="all">
                {t('page.ui.all_priorities', 'Priority: All')}
              </SingleSelectOption>
              {SUBMISSION_PRIORITIES.map((pr) => (
                <SingleSelectOption key={pr} value={pr}>
                  {t('page.ui.priority', 'Priority')}: {pr}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Box>
        </Flex>
      </Flex>

      {selectedSubmission ? (
        <CaseworkDetailPanel
          t={t}
          submission={selectedSubmission}
          form={selectedForm}
          post={post}
          put={put}
          onStatusMessage={onStatusMessage}
          onReload={onReload}
          onClose={() => setSelectedRefCode(null)}
        />
      ) : null}

      <Table colCount={6} rowCount={filteredSubmissions.length + 1}>
        <Thead>
          <Tr>
            <Th><Typography variant="sigma">{t('page.ui.ref_code', 'Reference')}</Typography></Th>
            <Th><Typography variant="sigma">{t('page.ui.applicant', 'Applicant')}</Typography></Th>
            <Th><Typography variant="sigma">{t('page.ui.form_dept', 'Form & Dept')}</Typography></Th>
            <Th><Typography variant="sigma">{t('page.ui.status_priority', 'Status')}</Typography></Th>
            <Th><Typography variant="sigma">{t('page.ui.date_secondary', 'Submitted (Hijri)')}</Typography></Th>
            <Th><Typography variant="sigma">{t('page.ui.actions', 'Actions')}</Typography></Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredSubmissions.map((sub) => (
            <SubmissionRow
              key={sub.referenceCode}
              t={t}
              sub={sub}
              isSelected={selectedRefCode === sub.referenceCode}
              onToggleInspect={(refCode, selected) =>
                setSelectedRefCode(selected ? null : refCode)
              }
              onScheduleBooking={handleScheduleBooking}
              onIssueCertificate={handleIssueCertificate}
              onMarkCompleted={handleMarkCompleted}
            />
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};
