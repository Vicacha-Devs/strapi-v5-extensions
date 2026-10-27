import { useIntl } from 'react-intl';
import * as React from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Field,
  Flex,
  Main,
  NumberInput,
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
import { useFetchClient } from '@strapi/strapi/admin';
import {
  ALERT_SEVERITIES,
  PLUGIN_ID,
  STARTER_FORM_TEMPLATES,
  SUBMISSION_PRIORITIES,
  SUBMISSION_STATUSES,
  type AlertBannerRecord,
  type AlertSeverity,
  type FormRecord,
  type SubmissionRecord,
  type SubscriberRecord,
} from '../../../shared';

type ActiveTab = 'forms' | 'submissions' | 'subscribers' | 'alerts';

const cardBorderStyle: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.18)',
};

export const InboxHomePage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
  const { get, post, put } = useFetchClient();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('submissions');
  const [forms, setForms] = React.useState<FormRecord[]>([]);
  const [submissions, setSubmissions] = React.useState<SubmissionRecord[]>([]);
  const [subscribers, setSubscribers] = React.useState<SubscriberRecord[]>([]);
  const [alerts, setAlerts] = React.useState<AlertBannerRecord[]>([]);
  const [statusMessage, setStatusMessage] = React.useState<string>('');

  // Casework filter states
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');

  // New subscriber quick-add states
  const [newSubEmail, setNewSubEmail] = React.useState<string>('');
  const [newSubName, setNewSubName] = React.useState<string>('');
  const [newSubLocale, setNewSubLocale] = React.useState<string>('es');
  const [newSubTopics, setNewSubTopics] = React.useState<string>('announcements, events');

  // Alert Banner form states
  const [newAlertCode, setNewAlertCode] = React.useState<string>('');
  const [newAlertSeverity, setNewAlertSeverity] = React.useState<AlertSeverity>('urgent');
  const [newAlertPriority, setNewAlertPriority] = React.useState<number>(100);
  const [newAlertTitle, setNewAlertTitle] = React.useState<string>('');
  const [newAlertMessage, setNewAlertMessage] = React.useState<string>('');
  const [newAlertCtaLabel, setNewAlertCtaLabel] = React.useState<string>('');
  const [newAlertCtaUrl, setNewAlertCtaUrl] = React.useState<string>('');

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
    setStatusMessage('Submission marked as completed');
    await loadAll();
  };

  const handleAddSubscriber = async () => {
    if (!newSubEmail.trim()) return;
    await post(`/api/${PLUGIN_ID}/subscribers`, {
      email: newSubEmail.trim(),
      fullName: newSubName.trim(),
      locale: newSubLocale,
      topics: newSubTopics
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setNewSubEmail('');
    setNewSubName('');
    setStatusMessage(`Subscriber "${newSubEmail.trim()}" added`);
    await loadAll();
  };

  const handleCreateAlert = async () => {
    if (!newAlertCode || !newAlertTitle || !newAlertMessage) return;
    await post(`/${PLUGIN_ID}/alerts`, {
      code: newAlertCode,
      title: newAlertTitle,
      message: newAlertMessage,
      severity: newAlertSeverity,
      active: true,
      priority: newAlertPriority,
      ctaLabel: newAlertCtaLabel || undefined,
      ctaUrl: newAlertCtaUrl || undefined,
    });
    setNewAlertCode('');
    setNewAlertTitle('');
    setNewAlertMessage('');
    setNewAlertCtaLabel('');
    setNewAlertCtaUrl('');
    setStatusMessage('Site-wide alert banner saved');
    await loadAll();
  };

  const filteredSubmissions = React.useMemo(() => {
    return submissions.filter((sub) => {
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && sub.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
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
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [submissions, statusFilter, priorityFilter, searchQuery]);

  return (
    <Main>
      <Box padding={8}>
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={4} wrap="wrap" gap={3}>
          <Box>
            <Typography variant="alpha" tag="h1">{t('page.ui.inbox_visual_form_builder_service_desk_casework', 'Inbox, Visual Form Builder & Service-Desk Casework')}</Typography>
            <Typography variant="epsilon" textColor="neutral600">{t('page.ui.multi_language_forms_anti_spam_guard_casework_ch', 'Multi-language forms, anti-spam guard, casework checklists, double opt-in subscribers & site-wide alert banners')}</Typography>
          </Box>
          <Flex gap={2} wrap="wrap">
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
            <Typography textColor="success700" fontWeight="semiBold">
              {statusMessage}
            </Typography>
          </Box>
        ) : null}

        <Divider />

        {/* TAB 1: FORM BUILDER */}
        {activeTab === 'forms' && (
          <Box paddingTop={6}>
            <Flex justifyContent="space-between" alignItems="center" paddingBottom={4} wrap="wrap" gap={2}>
              <Box>
                <Typography variant="beta" tag="h2">{t('page.ui.starter_form_templates_active_forms', 'Starter Form Templates & Active Forms')}</Typography>
                <Typography variant="pi" textColor="neutral600">{t('page.ui.create_localized_forms_from_starter_templates_or', 'Create localized forms from starter templates or manage active service-desk forms and document checklists.')}</Typography>
              </Box>
              <Flex gap={2} wrap="wrap">
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
                  <Th><Typography variant="sigma">{t('page.ui.slug', 'Slug')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.title', 'Title')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.category', 'Category')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.fields', 'Fields')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.checklist', 'Checklist')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.submissions', 'Submissions')}</Typography></Th>
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

        {/* TAB 2: CASEWORK INBOX */}
        {activeTab === 'submissions' && (
          <Box paddingTop={6}>
            <Box
              padding={5}
              marginBottom={5}
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              style={cardBorderStyle}
            >
              <Typography variant="delta" tag="h3" fontWeight="bold">{t('page.ui.filter_search_casework_submissions', 'Filter & Search Casework Submissions')}</Typography>
              <Box
                paddingTop={3}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                  alignItems: 'end',
                }}
              >
                <Field.Root name="searchSubmissions">
                  <Field.Label>{t('field.search_reference_applicant_form', 'Search Reference / Applicant / Form')}</Field.Label>
                  <TextInput
                    name="searchSubmissions"
                    placeholder={t('placeholder.e_g_inb_2026_nikah_ahmad_yusuf_example_org', 'e.g., INB-2026, Nikah, Ahmad, yusuf@example.org')}
                    value={searchQuery}
                    onChange={(e: { target: { value: string } }) => setSearchQuery(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.filter_by_reference_code_applicant_name_email_or', 'Filter by reference code, applicant name/email, or form slug.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="statusFilter">
                  <Field.Label>{t('field.casework_status', 'Casework Status')}</Field.Label>
                  <SingleSelect
                    placeholder={t('placeholder.all_statuses', 'All statuses')}
                    value={statusFilter}
                    onChange={(val: string | number) => setStatusFilter(String(val))}
                  >
                    <SingleSelectOption value="all">{t('page.ui.all_statuses', 'All Statuses')}</SingleSelectOption>
                    {SUBMISSION_STATUSES.map((st) => (
                      <SingleSelectOption key={st} value={st}>
                        {st}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                  <Field.Hint>{t('page.ui.filter_submissions_by_workflow_stage', 'Filter submissions by workflow stage.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="priorityFilter">
                  <Field.Label>{t('field.priority_level', 'Priority Level')}</Field.Label>
                  <SingleSelect
                    placeholder={t('placeholder.all_priorities', 'All priorities')}
                    value={priorityFilter}
                    onChange={(val: string | number) => setPriorityFilter(String(val))}
                  >
                    <SingleSelectOption value="all">{t('page.ui.all_priorities', 'All Priorities')}</SingleSelectOption>
                    {SUBMISSION_PRIORITIES.map((pr) => (
                      <SingleSelectOption key={pr} value={pr}>
                        {pr}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                  <Field.Hint>{t('page.ui.filter_by_urgency_level', 'Filter by urgency level.')}</Field.Hint>
                </Field.Root>
              </Box>
            </Box>

            <Table colCount={7} rowCount={filteredSubmissions.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">{t('page.ui.ref_code', 'Ref Code')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.form_dept', 'Form / Dept')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.applicant', 'Applicant')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.status_priority', 'Status / Priority')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.date_secondary', 'Date (Secondary)')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.ecosystem_bridges', 'Ecosystem Bridges')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.actions', 'Actions')}</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredSubmissions.map((sub) => (
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
                        >{t('page.ui.book_slot', 'Book Slot')}</Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleIssueCertificate(sub.documentId)}
                        >{t('page.ui.issue_cert', 'Issue Cert')}</Button>
                        <Button
                          variant="tertiary"
                          onClick={() => handleMarkCompleted(sub.documentId)}
                        >{t('page.ui.complete', 'Complete')}</Button>
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {/* TAB 3: SUBSCRIBERS */}
        {activeTab === 'subscribers' && (
          <Box paddingTop={6}>
            <Box
              padding={5}
              marginBottom={5}
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              style={cardBorderStyle}
            >
              <Typography variant="delta" tag="h3" fontWeight="bold">{t('page.ui.register_invite_community_subscriber', 'Register / Invite Community Subscriber')}</Typography>
              <Box
                paddingTop={3}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                  alignItems: 'end',
                }}
              >
                <Field.Root name="newSubEmail" required>
                  <Field.Label>{t('field.subscriber_email', 'Subscriber Email')}</Field.Label>
                  <TextInput
                    name="newSubEmail"
                    type="email"
                    placeholder={t('placeholder.e_g_fatima_example_org', 'e.g., fatima@example.org')}
                    value={newSubEmail}
                    onChange={(e: { target: { value: string } }) => setNewSubEmail(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.email_address_for_double_opt_in_confirmation', 'Email address for double opt-in confirmation.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="newSubName">
                  <Field.Label>{t('field.full_name', 'Full Name')}</Field.Label>
                  <TextInput
                    name="newSubName"
                    placeholder={t('placeholder.e_g_fatima_zahra', 'e.g., Fatima Zahra')}
                    value={newSubName}
                    onChange={(e: { target: { value: string } }) => setNewSubName(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.optional_recipient_name', 'Optional recipient name.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="newSubLocale">
                  <Field.Label>{t('field.preferred_locale', 'Preferred Locale')}</Field.Label>
                  <SingleSelect
                    placeholder={t('placeholder.select_locale', 'Select locale')}
                    value={newSubLocale}
                    onChange={(val: string | number) => setNewSubLocale(String(val))}
                  >
                    <SingleSelectOption value="es">{t('page.ui.es_espa_ol', 'es — Español')}</SingleSelectOption>
                    <SingleSelectOption value="en">{t('page.ui.en_english', 'en — English')}</SingleSelectOption>
                    <SingleSelectOption value="ar">{t('page.ui.ar', 'ar — العربية')}</SingleSelectOption>
                    <SingleSelectOption value="tr">{t('page.ui.tr_t_rk_e', 'tr — Türkçe')}</SingleSelectOption>
                  </SingleSelect>
                  <Field.Hint>{t('page.ui.language_for_confirmation_digests', 'Language for confirmation & digests.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="newSubTopics">
                  <Field.Label>{t('field.topics_comma_separated', 'Topics (comma-separated)')}</Field.Label>
                  <TextInput
                    name="newSubTopics"
                    placeholder={t('placeholder.e_g_announcements_events_ramadan_eid', 'e.g., announcements, events, ramadan_eid')}
                    value={newSubTopics}
                    onChange={(e: { target: { value: string } }) => setNewSubTopics(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.subscribed_announcement_channels', 'Subscribed announcement channels.')}</Field.Hint>
                </Field.Root>

                <Box>
                  <Button onClick={handleAddSubscriber}>{t('page.ui.add_subscriber', 'Add Subscriber')}</Button>
                </Box>
              </Box>
            </Box>

            <Table colCount={5} rowCount={subscribers.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">{t('page.ui.email', 'Email')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.name', 'Name')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.locale', 'Locale')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.topics', 'Topics')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.status', 'Status')}</Typography></Th>
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

        {/* TAB 4: SITE-WIDE ALERT BANNERS */}
        {activeTab === 'alerts' && (
          <Box paddingTop={6}>
            <Box
              padding={6}
              marginBottom={5}
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              style={cardBorderStyle}
            >
              <Flex justifyContent="space-between" alignItems="center" paddingBottom={2} wrap="wrap" gap={2}>
                <Box>
                  <Typography variant="delta" tag="h3" fontWeight="bold">{t('page.ui.publish_urgent_site_wide_alert_banner', 'Publish Urgent Site-Wide Alert Banner')}</Typography>
                  <Typography variant="pi" textColor="neutral600">{t('page.ui.broadcast_high_priority_announcements_e_g_ramada', 'Broadcast high-priority announcements (e.g., Ramadan moonsighting, Eid prayer schedule, or urgent Janazah notices) with automatic Hijri date conversion.')}</Typography>
                </Box>
                <Button onClick={handleCreateAlert}>{t('page.ui.save_alert_banner', 'Save Alert Banner')}</Button>
              </Flex>

              <Box
                paddingTop={4}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                }}
              >
                <Field.Root name="code" required>
                  <Field.Label>{t('field.alert_code', 'Alert Code')}</Field.Label>
                  <TextInput
                    name="code"
                    placeholder={t('placeholder.e_g_ramadan_1448_hilal', 'e.g., RAMADAN-1448-HILAL')}
                    value={newAlertCode}
                    onChange={(e: { target: { value: string } }) => setNewAlertCode(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.unique_identifier_code_upserts_existing_banner_i', 'Unique identifier code (upserts existing banner if code matches).')}</Field.Hint>
                </Field.Root>

                <Field.Root name="severity" required>
                  <Field.Label>{t('field.severity_level', 'Severity Level')}</Field.Label>
                  <SingleSelect
                    placeholder={t('placeholder.select_severity_level', 'Select severity level')}
                    value={newAlertSeverity}
                    onChange={(val: string | number) => setNewAlertSeverity(String(val) as AlertSeverity)}
                  >
                    {ALERT_SEVERITIES.map((sev) => (
                      <SingleSelectOption key={sev} value={sev}>
                        {sev.toUpperCase()}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                  <Field.Hint>{t('page.ui.controls_visual_theme_info_warning_urgent_celebr', 'Controls visual theme (info, warning, urgent, celebration).')}</Field.Hint>
                </Field.Root>

                <Field.Root name="priority">
                  <Field.Label>{t('field.display_priority', 'Display Priority')}</Field.Label>
                  <NumberInput
                    name="priority"
                    placeholder={t('placeholder.e_g_100', 'e.g., 100')}
                    value={newAlertPriority}
                    onValueChange={(val: number | undefined) =>
                      setNewAlertPriority(typeof val === 'number' ? val : 100)
                    }
                  />
                  <Field.Hint>{t('page.ui.higher_numbers_appear_first_when_multiple_banner', 'Higher numbers appear first when multiple banners are active.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="title" required>
                  <Field.Label>{t('field.headline_title', 'Headline Title')}</Field.Label>
                  <TextInput
                    name="title"
                    placeholder={t('placeholder.e_g_anuncio_oficial_de_avistamiento', 'e.g., Official Moon-Sighting Announcement')}
                    value={newAlertTitle}
                    onChange={(e: { target: { value: string } }) => setNewAlertTitle(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.bold_title_shown_at_the_start_of_the_alert_banne', 'Bold title shown at the start of the alert banner.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="message" required>
                  <Field.Label>{t('field.ticker_message', 'Ticker Message')}</Field.Label>
                  <TextInput
                    name="message"
                    placeholder={t('placeholder.e_g_el_primer_d_a_de_ramad_n_ser_el_jueves', 'e.g., The first day of Ramadan will be Thursday...')}
                    value={newAlertMessage}
                    onChange={(e: { target: { value: string } }) => setNewAlertMessage(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.main_announcement_body_displayed_across_the_site', 'Main announcement body displayed across the site header.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="ctaLabel">
                  <Field.Label>{t('field.cta_button_label_optional', 'CTA Button Label (Optional)')}</Field.Label>
                  <TextInput
                    name="ctaLabel"
                    placeholder={t('placeholder.e_g_ver_horarios_de_oraci_n', 'e.g., View prayer times')}
                    value={newAlertCtaLabel}
                    onChange={(e: { target: { value: string } }) => setNewAlertCtaLabel(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.optional_call_to_action_button_text', 'Optional call-to-action button text.')}</Field.Hint>
                </Field.Root>

                <Field.Root name="ctaUrl">
                  <Field.Label>{t('field.cta_target_url_optional', 'CTA Target URL (Optional)')}</Field.Label>
                  <TextInput
                    name="ctaUrl"
                    placeholder={t('placeholder.e_g_es_ramadan', 'e.g., /es/ramadan')}
                    value={newAlertCtaUrl}
                    onChange={(e: { target: { value: string } }) => setNewAlertCtaUrl(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.destination_path_or_url_when_clicking_the_cta_bu', 'Destination path or URL when clicking the CTA button.')}</Field.Hint>
                </Field.Root>
              </Box>
            </Box>

            <Table colCount={5} rowCount={alerts.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">{t('page.ui.code', 'Code')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.severity', 'Severity')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.title', 'Title')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.message', 'Message')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.secondary_calendar', 'Secondary Calendar')}</Typography></Th>
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
