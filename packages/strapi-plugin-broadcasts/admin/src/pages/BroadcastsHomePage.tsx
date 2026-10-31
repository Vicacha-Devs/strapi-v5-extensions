import { useIntl } from 'react-intl';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Divider,
  Field,
  Flex,
  Main,
  TextInput,
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
  EmailDesignerTemplateSummary,
} from '../../../shared/types';
import {
  AutomationAndLogsTabs,
  parseChannelsInput,
} from '../components/AutomationAndLogsTabs';
import {
  CampaignsTableSection,
  EmailTemplateSelectorField,
} from '../components/CampaignsTableSection';
import type { TranslateFn } from '../components/DeliveryLedgerSection';

type ActiveTab = 'campaigns' | 'automations' | 'logs';

export const BroadcastsHomePage: React.FC = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const t: TranslateFn = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
  const { get, post, put } = useFetchClient();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('campaigns');
  const [campaigns, setCampaigns] = React.useState<CampaignRecord[]>([]);
  const [rules, setRules] = React.useState<AutomationRuleRecord[]>([]);
  const [logs, setLogs] = React.useState<DeliveryLogRecord[]>([]);
  const [emailTemplates, setEmailTemplates] = React.useState<
    EmailDesignerTemplateSummary[]
  >([]);
  const [statusMessage, setStatusMessage] = React.useState<string>('');

  const [editingCampaignId, setEditingCampaignId] = React.useState<
    string | null
  >(null);
  const [newSlug, setNewSlug] = React.useState<string>('');
  const [newTitle, setNewTitle] = React.useState<string>('');
  const [newTopic, setNewTopic] = React.useState<string>('announcements');
  const [newChannels, setNewChannels] = React.useState<string>(
    'email, telegram, whatsapp'
  );
  const [newEmailTemplateRef, setNewEmailTemplateRef] =
    React.useState<string>('');
  const [newSubject, setNewSubject] = React.useState<string>('');
  const [newBodyText, setNewBodyText] = React.useState<string>('');

  const loadAll = async () => {
    try {
      const [campRes, rulesRes, logsRes] = await Promise.all([
        get<{ data?: CampaignRecord[] }>(`/${PLUGIN_ID}/campaigns`),
        get<{ data?: AutomationRuleRecord[] }>(`/${PLUGIN_ID}/automation-rules`),
        get<{ data?: DeliveryLogRecord[] }>(`/${PLUGIN_ID}/delivery-logs`),
      ]);
      setCampaigns(campRes?.data?.data || []);
      setRules(rulesRes?.data?.data || []);
      setLogs(logsRes?.data?.data || []);
    } catch {
      // Initial empty state in test or unmounted mode
    }

    try {
      const tplRes = await get<{ data?: EmailDesignerTemplateSummary[] }>(
        `/${PLUGIN_ID}/email-templates`
      );
      if (Array.isArray(tplRes?.data?.data)) {
        setEmailTemplates(tplRes.data.data);
      }
    } catch {
      // Optional Email Designer 5 endpoint
    }
  };

  React.useEffect(() => {
    void loadAll();
  }, []);

  const resetCampaignForm = () => {
    setEditingCampaignId(null);
    setNewSlug('');
    setNewTitle('');
    setNewTopic('announcements');
    setNewChannels('email, telegram, whatsapp');
    setNewEmailTemplateRef('');
    setNewSubject('');
    setNewBodyText('');
  };

  const handleStartEditCampaign = (camp: CampaignRecord) => {
    setEditingCampaignId(camp.documentId || camp.slug);
    setNewSlug(camp.slug);
    setNewTitle(camp.title);
    setNewTopic(camp.topic || 'announcements');
    setNewChannels((camp.channels || ['email', 'telegram']).join(', '));
    setNewEmailTemplateRef(camp.emailTemplateRef || '');
    setNewSubject(camp.subject || '');
    setNewBodyText(camp.bodyText || '');
    setStatusMessage(
      `${t('page.ui.editing_campaign', 'Editing campaign')}: ${camp.title}`
    );
  };

  const handleSeedTemplate = async (templateId: string) => {
    await post(`/${PLUGIN_ID}/campaigns/from-template`, { templateId });
    setStatusMessage(
      `${t('page.ui.created_from_starter_template', 'Created campaign from starter template')}: ${templateId}`
    );
    await loadAll();
  };

  const handleDispatchCampaign = async (slugOrDocId?: string) => {
    if (!slugOrDocId) return;
    await post(`/${PLUGIN_ID}/campaigns/${slugOrDocId}/send`, {});
    setStatusMessage(
      `${t('page.ui.dispatched_campaign', 'Dispatched broadcast campaign')}: ${slugOrDocId}`
    );
    await loadAll();
  };

  const handleSaveCampaign = async () => {
    const isComplete = Boolean(newSlug && newTitle && newSubject && newBodyText);
    if (!isComplete) return;

    const payload = {
      slug: newSlug.trim(),
      title: newTitle.trim(),
      topic: newTopic.trim() || 'announcements',
      channels: parseChannelsInput(newChannels, [
        'email',
        'telegram',
        'whatsapp',
      ]),
      priority: 'normal',
      emailTemplateRef: newEmailTemplateRef.trim() || undefined,
      subject: newSubject.trim(),
      bodyText: newBodyText.trim(),
    };

    if (editingCampaignId) {
      await put(`/${PLUGIN_ID}/campaigns/${editingCampaignId}`, payload);
      setStatusMessage(
        `${t('page.ui.updated_campaign', 'Updated broadcast campaign')}: ${payload.title}`
      );
    } else {
      await post(`/${PLUGIN_ID}/campaigns`, payload);
      setStatusMessage(
        t(
          'page.ui.created_omnichannel_campaign',
          'Created omnichannel broadcast campaign'
        )
      );
    }
    resetCampaignForm();
    await loadAll();
  };

  const campaignFormTitle = editingCampaignId
    ? `${t('page.ui.edit_broadcast_campaign', 'Edit Broadcast Campaign')} (${newSlug})`
    : t(
        'page.ui.compose_new_omnichannel_broadcast',
        'Compose New Omnichannel Broadcast'
      );

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
            <Typography variant="alpha" tag="h1">
              {t(
                'page.ui.omnichannel_community_broadcasts_automations',
                'Omnichannel Community Broadcasts & Automations'
              )}
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              {t(
                'page.ui.email_newsletters_telegram_bot_forum_topics_what',
                'Email newsletters, Telegram Bot & Forum topics, WhatsApp Cloud API / Gateways, EventHub auto-triggers & Hijri dates'
              )}
            </Typography>
          </Box>
          <Flex gap={2} wrap="wrap">
            <Button
              variant={activeTab === 'campaigns' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('campaigns')}
            >
              {t('page.ui.campaigns_tab', 'Campaigns')} ({campaigns.length})
            </Button>
            <Button
              variant={activeTab === 'automations' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('automations')}
            >
              {t('page.ui.automation_rules_tab', 'Automation Rules')} (
              {rules.length})
            </Button>
            <Button
              variant={activeTab === 'logs' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('logs')}
            >
              {t('page.ui.delivery_ledger_tab', 'Delivery Ledger')} (
              {logs.length})
            </Button>
          </Flex>
        </Flex>

        {statusMessage && (
          <Box padding={3} marginBottom={4} background="success100" hasRadius>
            <Typography textColor="success700">{statusMessage}</Typography>
          </Box>
        )}

        <Divider />

        {activeTab === 'campaigns' && (
          <Box paddingTop={6}>
            <Flex
              justifyContent="space-between"
              alignItems="center"
              paddingBottom={4}
              wrap="wrap"
              gap={2}
            >
              <Typography variant="beta" tag="h2">
                {t(
                  'page.ui.starter_templates_broadcast_campaigns',
                  'Starter Templates & Broadcast Campaigns'
                )}
              </Typography>
              <Flex gap={2} wrap="wrap">
                <Button
                  variant="tertiary"
                  onClick={() => navigate('/plugins/email-designer-5')}
                >
                  {t('page.ui.open_email_designer', 'Open Email Designer')} (
                  {emailTemplates.length})
                </Button>
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
              <Flex justifyContent="space-between" alignItems="center">
                <Typography variant="delta" tag="h3" fontWeight="bold">
                  {campaignFormTitle}
                </Typography>
                {editingCampaignId && (
                  <Badge active>{t('common.editing_mode', 'Editing Mode')}</Badge>
                )}
              </Flex>
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
                  <Field.Label>
                    {t('field.campaign_slug', 'Campaign Slug')}
                  </Field.Label>
                  <TextInput
                    name="slug"
                    placeholder={t(
                      'placeholder.e_g_friday_khutbah_bulletin',
                      'e.g., friday-khutbah-bulletin'
                    )}
                    value={newSlug}
                    onChange={(e: { target: { value: string } }) =>
                      setNewSlug(e.target.value)
                    }
                  />
                  <Field.Hint>
                    {t(
                      'page.ui.unique_url_safe_identifier_for_idempotency_track',
                      'Unique URL-safe identifier for idempotency tracking.'
                    )}
                  </Field.Hint>
                </Field.Root>
                <Field.Root name="title" required>
                  <Field.Label>
                    {t('field.campaign_title', 'Campaign Title')}
                  </Field.Label>
                  <TextInput
                    name="title"
                    placeholder={t(
                      'placeholder.e_g_bolet_n_semanal_de_jumu_ah',
                      "e.g., Boletín Semanal de Jumu'ah"
                    )}
                    value={newTitle}
                    onChange={(e: { target: { value: string } }) =>
                      setNewTitle(e.target.value)
                    }
                  />
                  <Field.Hint>
                    {t(
                      'page.ui.internal_display_name_in_the_campaign_table',
                      'Internal display name in the campaign table.'
                    )}
                  </Field.Hint>
                </Field.Root>
                <Field.Root name="topic">
                  <Field.Label>
                    {t('field.topic_segment', 'Topic Segment')}
                  </Field.Label>
                  <TextInput
                    name="topic"
                    placeholder={t(
                      'placeholder.e_g_announcements_ramadan_eid_events',
                      'e.g., announcements, ramadan_eid, events'
                    )}
                    value={newTopic}
                    onChange={(e: { target: { value: string } }) =>
                      setNewTopic(e.target.value)
                    }
                  />
                  <Field.Hint>
                    {t(
                      'page.ui.target_subscriber_segment_and_telegram_forum_thr',
                      'Target subscriber segment and Telegram forum thread.'
                    )}
                  </Field.Hint>
                </Field.Root>
                <Field.Root name="channels">
                  <Field.Label>
                    {t(
                      'field.channels_comma_separated',
                      'Channels (comma-separated)'
                    )}
                  </Field.Label>
                  <TextInput
                    name="channels"
                    placeholder={t(
                      'placeholder.email_telegram_whatsapp',
                      'email, telegram, whatsapp'
                    )}
                    value={newChannels}
                    onChange={(e: { target: { value: string } }) =>
                      setNewChannels(e.target.value)
                    }
                  />
                  <Field.Hint>
                    {t(
                      'page.ui.channels_hint_combination',
                      'Any combination of: email, telegram, whatsapp'
                    )}
                  </Field.Hint>
                </Field.Root>

                <EmailTemplateSelectorField
                  t={t}
                  emailTemplates={emailTemplates}
                  value={newEmailTemplateRef}
                  onChange={setNewEmailTemplateRef}
                />

                <Field.Root name="subject" required>
                  <Field.Label>
                    {t('field.subject_headline', 'Subject / Headline')}
                  </Field.Label>
                  <TextInput
                    name="subject"
                    placeholder={t(
                      'placeholder.e_g_as_salamu_alaykum_horarios_y_anuncios',
                      'e.g., As-salamu alaykum — Prayer Times & Announcements'
                    )}
                    value={newSubject}
                    onChange={(e: { target: { value: string } }) =>
                      setNewSubject(e.target.value)
                    }
                  />
                  <Field.Hint>
                    {t(
                      'page.ui.email_subject_line_and_bold_header_on_telegram_w',
                      'Email subject line and bold header on Telegram/WhatsApp.'
                    )}
                  </Field.Hint>
                </Field.Root>
                <Box style={{ gridColumn: '1 / -1' }}>
                  <Field.Root name="bodyText" required>
                    <Field.Label>
                      {t(
                        'field.message_body_with_placeholders',
                        'Message Body (supports {{recipientName}}, {{secondaryDate}}, {{organizationName}})'
                      )}
                    </Field.Label>
                    <TextInput
                      name="bodyText"
                      placeholder={t(
                        'placeholder.e_g_hola_recipientname_hoy_secondarydate_te_invi',
                        'e.g., Hello {{recipientName}}, today ({{secondaryDate}}) we invite you to...'
                      )}
                      value={newBodyText}
                      onChange={(e: { target: { value: string } }) =>
                        setNewBodyText(e.target.value)
                      }
                    />
                    <Field.Hint>
                      {t(
                        'page.ui.main_text_dispatched_across_email_telegram_and_w',
                        'Main text dispatched across Email, Telegram, and WhatsApp channels.'
                      )}
                    </Field.Hint>
                  </Field.Root>
                </Box>
              </Box>
              <Flex justifyContent="flex-end" paddingTop={3} gap={2}>
                {editingCampaignId && (
                  <Button variant="tertiary" onClick={resetCampaignForm}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                )}
                <Button onClick={handleSaveCampaign}>
                  {editingCampaignId
                    ? t('page.ui.save_campaign_changes', 'Save Campaign Changes')
                    : t('page.ui.create_campaign', 'Create Campaign')}
                </Button>
              </Flex>
            </Box>

            <CampaignsTableSection
              t={t}
              campaigns={campaigns}
              onEdit={handleStartEditCampaign}
              onDispatch={handleDispatchCampaign}
              navigate={navigate}
            />
          </Box>
        )}

        <AutomationAndLogsTabs
          activeTab={activeTab}
          rules={rules}
          logs={logs}
          t={t}
          navigate={navigate}
          post={post}
          put={put}
          setStatusMessage={setStatusMessage}
          loadAll={loadAll}
        />
      </Box>
    </Main>
  );
};
