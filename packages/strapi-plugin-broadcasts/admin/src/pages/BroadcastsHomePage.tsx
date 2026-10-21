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
  STARTER_CAMPAIGN_TEMPLATES,
  type AutomationRuleRecord,
  type CampaignRecord,
  type DeliveryLogRecord,
} from '../../../shared';

type ActiveTab = 'campaigns' | 'automations' | 'logs';

export const BroadcastsHomePage: React.FC = () => {
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
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
          <Box>
            <Typography variant="alpha" tag="h1">
              Omnichannel Community Broadcasts & Automations
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Email newsletters, Telegram Bot & Forum topics, WhatsApp Cloud API / Gateways, EventHub auto-triggers & Hijri dates
            </Typography>
          </Box>
          <Flex gap={2}>
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
            <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
              <Typography variant="beta" tag="h2">
                Starter Templates & Broadcast Campaigns
              </Typography>
              <Flex gap={2}>
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

            <Box padding={4} marginBottom={4} background="neutral100" hasRadius>
              <Typography variant="delta" tag="h3">
                Compose New Omnichannel Broadcast
              </Typography>
              <Flex gap={3} paddingTop={3}>
                <TextInput
                  label="Slug"
                  name="slug"
                  value={newSlug}
                  onChange={(e: { target: { value: string } }) => setNewSlug(e.target.value)}
                />
                <TextInput
                  label="Campaign Title"
                  name="title"
                  value={newTitle}
                  onChange={(e: { target: { value: string } }) => setNewTitle(e.target.value)}
                />
                <TextInput
                  label="Topic Segment"
                  name="topic"
                  value={newTopic}
                  onChange={(e: { target: { value: string } }) => setNewTopic(e.target.value)}
                />
                <TextInput
                  label="Subject / Headline"
                  name="subject"
                  value={newSubject}
                  onChange={(e: { target: { value: string } }) => setNewSubject(e.target.value)}
                />
                <TextInput
                  label="Message Body ({{recipientName}}, {{secondaryDate}})"
                  name="bodyText"
                  value={newBodyText}
                  onChange={(e: { target: { value: string } }) => setNewBodyText(e.target.value)}
                />
                <Button onClick={handleCreateCampaign}>Create Campaign</Button>
              </Flex>
            </Box>

            <Table colCount={7} rowCount={campaigns.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">Slug / Title</Typography></Th>
                  <Th><Typography variant="sigma">Topic</Typography></Th>
                  <Th><Typography variant="sigma">Channels</Typography></Th>
                  <Th><Typography variant="sigma">Status</Typography></Th>
                  <Th><Typography variant="sigma">Hijri / Secondary Date</Typography></Th>
                  <Th><Typography variant="sigma">Delivery Stats</Typography></Th>
                  <Th><Typography variant="sigma">Actions</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {campaigns.map((camp) => (
                  <Tr key={camp.slug}>
                    <Td>
                      <Typography fontWeight="bold">{camp.title}</Typography>
                      <Typography variant="pi" textColor="neutral600">
                        {camp.slug}
                      </Typography>
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
                      >
                        Dispatch Now
                      </Button>
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
                  <Th><Typography variant="sigma">Rule Slug</Typography></Th>
                  <Th><Typography variant="sigma">EventHub Trigger</Typography></Th>
                  <Th><Typography variant="sigma">Topic</Typography></Th>
                  <Th><Typography variant="sigma">Channels</Typography></Th>
                  <Th><Typography variant="sigma">Trigger Count</Typography></Th>
                  <Th><Typography variant="sigma">Status</Typography></Th>
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
                  <Th><Typography variant="sigma">Campaign</Typography></Th>
                  <Th><Typography variant="sigma">Channel / Driver</Typography></Th>
                  <Th><Typography variant="sigma">Masked Recipient</Typography></Th>
                  <Th><Typography variant="sigma">Locale</Typography></Th>
                  <Th><Typography variant="sigma">Status</Typography></Th>
                  <Th><Typography variant="sigma">Sent At</Typography></Th>
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
