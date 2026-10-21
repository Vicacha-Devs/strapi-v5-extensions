import * as React from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Main,
  Table,
  Tbody,
  Td,
  TextInput,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import {
  PLUGIN_ID,
  STARTER_FORM_TEMPLATES,
  type AlertBannerRecord,
  type FormRecord,
  type SubmissionRecord,
  type SubscriberRecord,
} from '../../../shared';

type ActiveTab = 'forms' | 'submissions' | 'subscribers' | 'alerts';

export const InboxHomePage: React.FC = () => {
  const { get, post, put } = useFetchClient();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('submissions');
  const [forms, setForms] = React.useState<FormRecord[]>([]);
  const [submissions, setSubmissions] = React.useState<SubmissionRecord[]>([]);
  const [subscribers, setSubscribers] = React.useState<SubscriberRecord[]>([]);
  const [alerts, setAlerts] = React.useState<AlertBannerRecord[]>([]);
  const [statusMessage, setStatusMessage] = React.useState<string>('');

  const [newAlertCode, setNewAlertCode] = React.useState<string>('');
  const [newAlertTitle, setNewAlertTitle] = React.useState<string>('');
  const [newAlertMessage, setNewAlertMessage] = React.useState<string>('');

  const loadAll = async () => {
    try {
      const [formsRes, subsRes, subscRes, alertsRes] = await Promise.all([
        get(`/${PLUGIN_ID}/forms`),
        get(`/${PLUGIN_ID}/submissions`),
        get(`/${PLUGIN_ID}/subscribers`),
        get(`/${PLUGIN_ID}/alerts`),
      ]);
      setForms(formsRes?.data?.data || []);
      setSubmissions(subsRes?.data?.data || []);
      setSubscribers(subscRes?.data?.data || []);
      setAlerts(alertsRes?.data?.data || []);
    } catch {
      // Initial empty state in test or unmounted mode
    }
  };

  React.useEffect(() => {
    void loadAll();
  }, []);

  const handleCreateTemplate = async (templateId: string) => {
    await post(`/${PLUGIN_ID}/forms/from-template`, { templateId });
    setStatusMessage(`Created form from template "${templateId}"`);
    await loadAll();
  };

  const handleScheduleBooking = async (documentId?: string) => {
    if (!documentId) return;
    await post(`/${PLUGIN_ID}/submissions/${documentId}/schedule-booking`, {
      serviceSlug: 'general-appointment',
      date: new Date().toISOString().slice(0, 10),
      startTime: '10:00',
    });
    setStatusMessage('Appointment scheduled via @vicacha-devs/strapi-plugin-bookings bridge');
    await loadAll();
  };

  const handleIssueCertificate = async (documentId?: string) => {
    if (!documentId) return;
    await post(`/${PLUGIN_ID}/submissions/${documentId}/issue-certificate`, {
      requireChecklistVerified: false,
    });
    setStatusMessage('Certificate issued via @vicacha-devs/strapi-plugin-certificates bridge');
    await loadAll();
  };

  const handleMarkCompleted = async (documentId?: string) => {
    if (!documentId) return;
    await put(`/${PLUGIN_ID}/submissions/${documentId}/casework`, {
      status: 'completed',
    });
    await loadAll();
  };

  const handleCreateAlert = async () => {
    if (!newAlertCode || !newAlertTitle || !newAlertMessage) return;
    await post(`/${PLUGIN_ID}/alerts`, {
      code: newAlertCode,
      title: newAlertTitle,
      message: newAlertMessage,
      severity: 'urgent',
      active: true,
      priority: 100,
    });
    setNewAlertCode('');
    setNewAlertTitle('');
    setNewAlertMessage('');
    setStatusMessage('Site-wide alert banner saved');
    await loadAll();
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
          <Box>
            <Typography variant="alpha" tag="h1">
              Inbox, Visual Form Builder & Service-Desk Casework
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Multi-language forms, anti-spam guard, casework checklists, double opt-in subscribers & site-wide alert banners
            </Typography>
          </Box>
          <Flex gap={2}>
            <Button
              variant={activeTab === 'submissions' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('submissions')}
            >
              Casework Inbox ({submissions.length})
            </Button>
            <Button
              variant={activeTab === 'forms' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('forms')}
            >
              Form Builder ({forms.length})
            </Button>
            <Button
              variant={activeTab === 'subscribers' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('subscribers')}
            >
              Subscribers ({subscribers.length})
            </Button>
            <Button
              variant={activeTab === 'alerts' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('alerts')}
            >
              Alert Banners ({alerts.length})
            </Button>
          </Flex>
        </Flex>

        {statusMessage ? (
          <Box padding={3} marginBottom={4} background="success100" hasRadius>
            <Typography textColor="success700">{statusMessage}</Typography>
          </Box>
        ) : null}

        <Divider />

        {activeTab === 'forms' && (
          <Box paddingTop={6}>
            <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
              <Typography variant="beta" tag="h2">
                Starter Form Templates & Active Forms
              </Typography>
              <Flex gap={2}>
                {STARTER_FORM_TEMPLATES.map((tpl) => (
                  <Button
                    key={tpl.id}
                    variant="secondary"
                    onClick={() => handleCreateTemplate(tpl.id)}
                  >
                    + {tpl.name}
                  </Button>
                ))}
              </Flex>
            </Flex>
            <Table colCount={6} rowCount={forms.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">Slug</Typography></Th>
                  <Th><Typography variant="sigma">Title</Typography></Th>
                  <Th><Typography variant="sigma">Category</Typography></Th>
                  <Th><Typography variant="sigma">Fields</Typography></Th>
                  <Th><Typography variant="sigma">Checklist</Typography></Th>
                  <Th><Typography variant="sigma">Submissions</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {forms.map((form) => (
                  <Tr key={form.slug}>
                    <Td><Typography fontWeight="bold">{form.slug}</Typography></Td>
                    <Td><Typography>{form.title}</Typography></Td>
                    <Td><Badge>{form.category}</Badge></Td>
                    <Td><Typography>{(form.fields || []).length} fields</Typography></Td>
                    <Td><Typography>{(form.checklistTemplate || []).length} items</Typography></Td>
                    <Td><Typography>{form.submissionCount || 0}</Typography></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {activeTab === 'submissions' && (
          <Box paddingTop={6}>
            <Table colCount={7} rowCount={submissions.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">Ref Code</Typography></Th>
                  <Th><Typography variant="sigma">Form / Dept</Typography></Th>
                  <Th><Typography variant="sigma">Applicant</Typography></Th>
                  <Th><Typography variant="sigma">Status / Priority</Typography></Th>
                  <Th><Typography variant="sigma">Date (Secondary)</Typography></Th>
                  <Th><Typography variant="sigma">Ecosystem Bridges</Typography></Th>
                  <Th><Typography variant="sigma">Actions</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {submissions.map((sub) => (
                  <Tr key={sub.referenceCode}>
                    <Td><Typography fontWeight="bold">{sub.referenceCode}</Typography></Td>
                    <Td>
                      <Typography>{sub.formSlug} ({sub.department || 'general'})</Typography>
                    </Td>
                    <Td>
                      <Typography>
                        {sub.applicantName || 'Anonymous'} {sub.applicantEmail ? `<${sub.applicantEmail}>` : ''}
                      </Typography>
                    </Td>
                    <Td>
                      <Flex gap={2}>
                        <Badge>{sub.status}</Badge>
                        <Badge>{sub.priority}</Badge>
                      </Flex>
                    </Td>
                    <Td>
                      <Typography>
                        {sub.submittedAt?.slice(0, 10)} ({sub.secondaryDate?.formatted || '-'})
                      </Typography>
                    </Td>
                    <Td>
                      <Typography>
                        {sub.linkedBookingId ? `Booking: ${sub.linkedBookingId} ` : ''}
                        {sub.linkedCertificateNumber ? `Cert: ${sub.linkedCertificateNumber}` : ''}
                      </Typography>
                    </Td>
                    <Td>
                      <Flex gap={2}>
                        <Button
                          variant="secondary"
                          onClick={() => handleScheduleBooking(sub.documentId)}
                        >
                          Book Slot
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleIssueCertificate(sub.documentId)}
                        >
                          Issue Cert
                        </Button>
                        <Button
                          variant="tertiary"
                          onClick={() => handleMarkCompleted(sub.documentId)}
                        >
                          Complete
                        </Button>
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {activeTab === 'subscribers' && (
          <Box paddingTop={6}>
            <Table colCount={5} rowCount={subscribers.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">Email</Typography></Th>
                  <Th><Typography variant="sigma">Name</Typography></Th>
                  <Th><Typography variant="sigma">Locale</Typography></Th>
                  <Th><Typography variant="sigma">Topics</Typography></Th>
                  <Th><Typography variant="sigma">Status</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {subscribers.map((sub) => (
                  <Tr key={sub.email}>
                    <Td><Typography fontWeight="bold">{sub.email}</Typography></Td>
                    <Td><Typography>{sub.fullName || '-'}</Typography></Td>
                    <Td><Badge>{sub.locale}</Badge></Td>
                    <Td><Typography>{(sub.topics || []).join(', ')}</Typography></Td>
                    <Td><Badge>{sub.status}</Badge></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {activeTab === 'alerts' && (
          <Box paddingTop={6}>
            <Box padding={4} marginBottom={4} background="neutral100" hasRadius>
              <Typography variant="delta" tag="h3">
                Publish Urgent Site-Wide Alert Banner
              </Typography>
              <Flex gap={3} paddingTop={3}>
                <TextInput
                  label="Alert Code"
                  name="code"
                  value={newAlertCode}
                  onChange={(e: { target: { value: string } }) => setNewAlertCode(e.target.value)}
                />
                <TextInput
                  label="Headline Title"
                  name="title"
                  value={newAlertTitle}
                  onChange={(e: { target: { value: string } }) => setNewAlertTitle(e.target.value)}
                />
                <TextInput
                  label="Ticker Message"
                  name="message"
                  value={newAlertMessage}
                  onChange={(e: { target: { value: string } }) => setNewAlertMessage(e.target.value)}
                />
                <Button onClick={handleCreateAlert}>Save Alert Banner</Button>
              </Flex>
            </Box>
            <Table colCount={5} rowCount={alerts.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">Code</Typography></Th>
                  <Th><Typography variant="sigma">Severity</Typography></Th>
                  <Th><Typography variant="sigma">Title</Typography></Th>
                  <Th><Typography variant="sigma">Message</Typography></Th>
                  <Th><Typography variant="sigma">Secondary Calendar</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {alerts.map((banner) => (
                  <Tr key={banner.code}>
                    <Td><Typography fontWeight="bold">{banner.code}</Typography></Td>
                    <Td><Badge>{banner.severity}</Badge></Td>
                    <Td><Typography>{banner.title}</Typography></Td>
                    <Td><Typography>{banner.message}</Typography></Td>
                    <Td><Typography>{banner.secondaryDateLabel || '-'}</Typography></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>
    </Main>
  );
};

export default InboxHomePage;
