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
  STARTER_CAMPAIGN_TEMPLATES,
} from '../../../shared/constants';
import type {
  AutomationRuleRecord,
  CampaignRecord,
  DeliveryLogRecord,
} from '../../../shared/types';

type ActiveTab = 'campaigns' | 'automations' | 'logs';

export const BroadcastsHomePage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
  const { get, post } = useFetchClient();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('campaigns');
  const [campaigns, setCampaigns] = React.useState<CampaignRecord[]>([]);
  const [rules, setRules] = React.useState<AutomationRuleRecord[]>([]);
  const [logs, setLogs] = React.useState<DeliveryLogRecord[]>([]);
  const [statusMessage, setStatusMessage] = React.useState<string>('');

  const [newSlug, setNewSlug] = React.useState<string>('');
  const [newTitle, setNewTitle] = React.useState<string>('');
  const [newTopic, setNewTopic] = React.useState<string>('announcements');
  const [newSubject, setNewSubject] = React.useState<string>('');
  const [newBodyText, setNewBodyText] = React.useState<string>('');

  const loadAll = async () => {
    try {
      const [campRes, rulesRes, logsRes] = await Promise.all([
        get(`/${PLUGIN_ID}/campaigns`),
        get(`/${PLUGIN_ID}/automation-rules`),
        get(`/${PLUGIN_ID}/delivery-logs`),
      ]);
      setCampaigns(campRes?.data?.data || []);
      setRules(rulesRes?.data?.data || []);
      setLogs(logsRes?.data?.data || []);
    } catch {
      // Initial empty state in test or unmounted mode
    }
  };

  React.useEffect(() => {
    void loadAll();
  }, []);

  const handleSeedTemplate = async (templateId: string) => {
    await post(`/${PLUGIN_ID}/campaigns/from-template`, { templateId });
    setStatusMessage(`Created campaign from starter template "${templateId}"`);
    await loadAll();
  };

  const handleDispatchCampaign = async (slugOrDocId?: string) => {
    if (!slugOrDocId) return;
    await post(`/${PLUGIN_ID}/campaigns/${slugOrDocId}/send`, {});
    setStatusMessage(`Dispatched broadcast campaign "${slugOrDocId}" across configured channels`);
    await loadAll();
  };

  const handleCreateCampaign = async () => {
    if (!newSlug || !newTitle || !newSubject || !newBodyText) return;
    await post(`/${PLUGIN_ID}/campaigns`, {
      slug: newSlug,
      title: newTitle,
      topic: newTopic || 'announcements',
      channels: ['email', 'telegram', 'whatsapp'],
      priority: 'normal',
      subject: newSubject,
      bodyText: newBodyText,
    });
    setNewSlug('');
    setNewTitle('');
    setNewSubject('');
    setNewBodyText('');
    setStatusMessage('Created omnichannel broadcast campaign');
    await loadAll();
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex
          justifyContent="space-between"
          alignItems="flex-start"
          paddingBottom={4}
          wrap="wrap"
          gap={4}
        >
          <Box>
            <Typography variant="alpha" tag="h1">{t('page.ui.omnichannel_community_broadcasts_automations', 'Omnichannel Community Broadcasts & Automations')}</Typography>
            <Typography variant="epsilon" textColor="neutral600">{t('page.ui.email_newsletters_telegram_bot_forum_topics_what', 'Email newsletters, Telegram Bot & Forum topics, WhatsApp Cloud API / Gateways, EventHub auto-triggers & Hijri dates')}</Typography>
          </Box>
          <Flex gap={2} wrap="wrap">
            <Button
              variant={activeTab === 'campaigns' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('campaigns')}
            >
              Campaigns ({campaigns.length})
            </Button>
            <Button
              variant={activeTab === 'automations' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('automations')}
            >
              Automation Rules ({rules.length})
            </Button>
            <Button
              variant={activeTab === 'logs' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('logs')}
            >
              Delivery Ledger ({logs.length})
            </Button>
          </Flex>
        </Flex>

        {statusMessage ? (
          <Box padding={3} marginBottom={4} background="success100" hasRadius>
            <Typography textColor="success700">{statusMessage}</Typography>
          </Box>
        ) : null}

        <Divider />

        {activeTab === 'campaigns' && (
          <Box paddingTop={6}>
            <Flex justifyContent="space-between" alignItems="center" paddingBottom={4} wrap="wrap" gap={2}>
              <Typography variant="beta" tag="h2">{t('page.ui.starter_templates_broadcast_campaigns', 'Starter Templates & Broadcast Campaigns')}</Typography>
              <Flex gap={2} wrap="wrap">
                {STARTER_CAMPAIGN_TEMPLATES.map((tpl) => (
                  <Button
                    key={tpl.id}
                    variant="secondary"
                    onClick={() => handleSeedTemplate(tpl.id)}
                  >
                    + {tpl.slug}
                  </Button>
                ))}
              </Flex>
            </Flex>

            <Box
              padding={5}
              marginBottom={5}
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              style={{ border: '1px solid rgba(128, 128, 128, 0.18)' }}
            >
              <Typography variant="delta" tag="h3" fontWeight="bold">{t('page.ui.compose_new_omnichannel_broadcast', 'Compose New Omnichannel Broadcast')}</Typography>
              <Box
                paddingTop={3}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 14,
                  alignItems: 'end',
                }}
              >
                <Field.Root name="slug" required>
                  <Field.Label>{t('field.campaign_slug', 'Campaign Slug')}</Field.Label>
                  <TextInput
                    name="slug"
                    placeholder={t('placeholder.e_g_friday_khutbah_bulletin', 'e.g., friday-khutbah-bulletin')}
                    value={newSlug}
                    onChange={(e: { target: { value: string } }) => setNewSlug(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.unique_url_safe_identifier_for_idempotency_track', 'Unique URL-safe identifier for idempotency tracking.')}</Field.Hint>
                </Field.Root>
                <Field.Root name="title" required>
                  <Field.Label>{t('field.campaign_title', 'Campaign Title')}</Field.Label>
                  <TextInput
                    name="title"
                    placeholder={t('placeholder.e_g_bolet_n_semanal_de_jumu_ah', 'e.g., Boletín Semanal de Jumu\'ah')}
                    value={newTitle}
                    onChange={(e: { target: { value: string } }) => setNewTitle(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.internal_display_name_in_the_campaign_table', 'Internal display name in the campaign table.')}</Field.Hint>
                </Field.Root>
                <Field.Root name="topic">
                  <Field.Label>{t('field.topic_segment', 'Topic Segment')}</Field.Label>
                  <TextInput
                    name="topic"
                    placeholder={t('placeholder.e_g_announcements_ramadan_eid_events', 'e.g., announcements, ramadan_eid, events')}
                    value={newTopic}
                    onChange={(e: { target: { value: string } }) => setNewTopic(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.target_subscriber_segment_and_telegram_forum_thr', 'Target subscriber segment and Telegram forum thread.')}</Field.Hint>
                </Field.Root>
                <Field.Root name="subject" required>
                  <Field.Label>{t('field.subject_headline', 'Subject / Headline')}</Field.Label>
                  <TextInput
                    name="subject"
                    placeholder={t('placeholder.e_g_as_salamu_alaykum_horarios_y_anuncios', 'e.g., As-salamu alaykum — Prayer Times & Announcements')}
                    value={newSubject}
                    onChange={(e: { target: { value: string } }) => setNewSubject(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.email_subject_line_and_bold_header_on_telegram_w', 'Email subject line and bold header on Telegram/WhatsApp.')}</Field.Hint>
                </Field.Root>
                <Box style={{ gridColumn: '1 / -1' }}>
                  <Field.Root name="bodyText" required>
                    <Field.Label>
                      Message Body (supports {'{{recipientName}}'}, {'{{secondaryDate}}'}, {'{{organizationName}}'})
                    </Field.Label>
                    <TextInput
                      name="bodyText"
                      placeholder={t('placeholder.e_g_hola_recipientname_hoy_secondarydate_te_invi', 'e.g., Hello {{recipientName}}, today ({{secondaryDate}}) we invite you to...')}
                      value={newBodyText}
                      onChange={(e: { target: { value: string } }) => setNewBodyText(e.target.value)}
                    />
                    <Field.Hint>{t('page.ui.main_text_dispatched_across_email_telegram_and_w', 'Main text dispatched across Email, Telegram, and WhatsApp channels.')}</Field.Hint>
                  </Field.Root>
                </Box>
              </Box>
              <Flex justifyContent="flex-end" paddingTop={3}>
                <Button onClick={handleCreateCampaign}>{t('page.ui.create_campaign', 'Create Campaign')}</Button>
              </Flex>
            </Box>

            <Table colCount={7} rowCount={campaigns.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">{t('page.ui.slug_title', 'Slug / Title')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.topic', 'Topic')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.channels', 'Channels')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.status', 'Status')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.hijri_secondary_date', 'Hijri / Secondary Date')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.delivery_stats', 'Delivery Stats')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.actions', 'Actions')}</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {campaigns.map((camp) => (
                  <Tr key={camp.slug}>
                    <Td>
                      <Flex direction="column" alignItems="flex-start" gap={1}>
                        <Typography fontWeight="bold">{camp.title}</Typography>
                        <Typography variant="pi" textColor="neutral600">
                          {camp.slug}
                        </Typography>
                      </Flex>
                    </Td>
                    <Td><Badge>{camp.topic}</Badge></Td>
                    <Td><Typography>{(camp.channels || []).join(', ')}</Typography></Td>
                    <Td><Badge>{camp.status}</Badge></Td>
                    <Td><Typography>{camp.secondaryDateLabel || '-'}</Typography></Td>
                    <Td>
                      <Typography>
                        Sent: {(camp.stats?.sentCount || 0) + (camp.stats?.simulatedCount || 0)} / Failed: {camp.stats?.failedCount || 0}
                      </Typography>
                    </Td>
                    <Td>
                      <Button
                        variant="secondary"
                        onClick={() => handleDispatchCampaign(camp.documentId || camp.slug)}
                      >{t('page.ui.dispatch_now', 'Dispatch Now')}</Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {activeTab === 'automations' && (
          <Box paddingTop={6}>
            <Table colCount={6} rowCount={rules.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">{t('page.ui.rule_slug', 'Rule Slug')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.eventhub_trigger', 'EventHub Trigger')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.topic', 'Topic')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.channels', 'Channels')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.trigger_count', 'Trigger Count')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.status', 'Status')}</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {rules.map((rule) => (
                  <Tr key={rule.slug}>
                    <Td><Typography fontWeight="bold">{rule.name}</Typography></Td>
                    <Td><Badge>{rule.eventName}</Badge></Td>
                    <Td><Typography>{rule.topic}</Typography></Td>
                    <Td><Typography>{(rule.channels || []).join(', ')}</Typography></Td>
                    <Td><Typography>{rule.triggerCount || 0}</Typography></Td>
                    <Td><Badge>{rule.active ? 'active' : 'paused'}</Badge></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {activeTab === 'logs' && (
          <Box paddingTop={6}>
            <Table colCount={6} rowCount={logs.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">{t('page.ui.campaign', 'Campaign')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.channel_driver', 'Channel / Driver')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.masked_recipient', 'Masked Recipient')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.locale', 'Locale')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.status', 'Status')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.sent_at', 'Sent At')}</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {logs.map((log) => (
                  <Tr key={log.idempotencyKey}>
                    <Td><Typography fontWeight="bold">{log.campaignSlug}</Typography></Td>
                    <Td><Typography>{log.channel} ({log.driver})</Typography></Td>
                    <Td><Typography>{log.recipientMasked}</Typography></Td>
                    <Td><Badge>{log.locale}</Badge></Td>
                    <Td><Badge>{log.status}</Badge></Td>
                    <Td><Typography>{log.sentAt?.slice(0, 19)}</Typography></Td>
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

export default BroadcastsHomePage;
