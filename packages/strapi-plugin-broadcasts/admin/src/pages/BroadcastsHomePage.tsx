import {
  Box,
  Button,
  Divider,
  Flex,
  Main,
  Typography,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import * as React from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import {
  PLUGIN_ID,
  STARTER_CAMPAIGN_TEMPLATES,
} from "../../../shared/constants";
import type {
  AutomationRuleRecord,
  BroadcastChannel,
  BroadcastPriority,
  CampaignRecord,
  DeliveryLogRecord,
  EmailDesignerTemplateSummary,
} from "../../../shared/types";
import {
  AutomationAndLogsTabs,
  parseChannelsInput,
} from "../components/AutomationAndLogsTabs";
import { CampaignComposerForm } from "../components/CampaignComposerForm";
import { CampaignsTableSection } from "../components/CampaignsTableSection";
import type { TranslateFn } from "../components/DeliveryLedgerSection";
import { extractApiErrorMessage } from "../utils/extractApiError";

type ActiveTab = "campaigns" | "automations" | "logs";

const DEFAULT_CHANNELS: BroadcastChannel[] = ["email", "telegram", "whatsapp"];

export const BroadcastsHomePage: React.FC = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const t: TranslateFn = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
  const { get, post, put } = useFetchClient();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("campaigns");
  const [campaigns, setCampaigns] = React.useState<CampaignRecord[]>([]);
  const [rules, setRules] = React.useState<AutomationRuleRecord[]>([]);
  const [logs, setLogs] = React.useState<DeliveryLogRecord[]>([]);
  const [emailTemplates, setEmailTemplates] = React.useState<
    EmailDesignerTemplateSummary[]
  >([]);
  const [statusMessage, setStatusMessage] = React.useState("");
  const [statusIsError, setStatusIsError] = React.useState(false);
  const [isBusy, setIsBusy] = React.useState(false);
  const [editingCampaignId, setEditingCampaignId] = React.useState<
    string | null
  >(null);
  const [newSlug, setNewSlug] = React.useState("");
  const [newTitle, setNewTitle] = React.useState("");
  const [newTopic, setNewTopic] = React.useState("announcements");
  const [newPriority, setNewPriority] =
    React.useState<BroadcastPriority>("normal");
  const [newChannels, setNewChannels] =
    React.useState<BroadcastChannel[]>(DEFAULT_CHANNELS);
  const [newEmailTemplateRef, setNewEmailTemplateRef] = React.useState("");
  const [newSubject, setNewSubject] = React.useState("");
  const [newBodyText, setNewBodyText] = React.useState("");

  const notifyStatus = (message: string, isError = false) => {
    setStatusIsError(isError);
    setStatusMessage(message);
  };

  const loadAll = React.useCallback(
    async (isMountedCheck: () => boolean = () => true) => {
      try {
        const [campRes, rulesRes, logsRes] = await Promise.all([
          get<{ data?: CampaignRecord[] }>(`/${PLUGIN_ID}/campaigns`),
          get<{ data?: AutomationRuleRecord[] }>(
            `/${PLUGIN_ID}/automation-rules`
          ),
          get<{ data?: DeliveryLogRecord[] }>(`/${PLUGIN_ID}/delivery-logs`),
        ]);
        if (!isMountedCheck()) return;
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
        if (isMountedCheck() && Array.isArray(tplRes?.data?.data)) {
          setEmailTemplates(tplRes.data.data);
        }
      } catch {
        // Optional Email Designer 5 endpoint
      }
    },
    [get]
  );

  React.useEffect(() => {
    let isMounted = true;
    void loadAll(() => isMounted);
    return () => {
      isMounted = false;
    };
  }, [loadAll]);

  const resetCampaignForm = (
    camp?: Partial<CampaignRecord>,
    editId: string | null = null,
    fallbackChannels: BroadcastChannel[] = DEFAULT_CHANNELS
  ) => {
    setEditingCampaignId(editId);
    setNewSlug(camp?.slug || "");
    setNewTitle(camp?.title || "");
    setNewTopic(camp?.topic || "announcements");
    setNewPriority(camp?.priority || "normal");
    setNewChannels(camp?.channels?.length ? camp.channels : fallbackChannels);
    setNewEmailTemplateRef(camp?.emailTemplateRef || "");
    setNewSubject(camp?.subject || "");
    setNewBodyText(camp?.bodyText || "");
  };

  const handleStartEditCampaign = (camp: CampaignRecord) => {
    resetCampaignForm(camp, camp.documentId || camp.slug, [
      "email",
      "telegram",
    ]);
    notifyStatus(
      `${t("page.ui.editing_campaign", "Editing campaign")}: ${camp.title}`
    );
  };

  const handleSeedTemplate = async (templateId: string) => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await post(`/${PLUGIN_ID}/campaigns/from-template`, { templateId });
      notifyStatus(
        `${t("page.ui.created_from_starter_template", "Created campaign from starter template")}: ${templateId}`
      );
      await loadAll();
    } catch (err) {
      notifyStatus(
        extractApiErrorMessage(
          err,
          t("page.ui.operation_failed", "Broadcast operation failed.")
        ),
        true
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleDispatchCampaign = async (slugOrDocId?: string) => {
    if (!slugOrDocId || isBusy) return;
    setIsBusy(true);
    try {
      await post(`/${PLUGIN_ID}/campaigns/${slugOrDocId}/send`, {});
      notifyStatus(
        `${t("page.ui.dispatched_campaign", "Dispatched broadcast campaign")}: ${slugOrDocId}`
      );
      await loadAll();
    } catch (err) {
      notifyStatus(
        extractApiErrorMessage(
          err,
          t("page.ui.operation_failed", "Broadcast operation failed.")
        ),
        true
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!newSlug || !newTitle || !newSubject || !newBodyText || isBusy) return;

    const payload = {
      slug: newSlug.trim(),
      title: newTitle.trim(),
      topic: newTopic.trim() || "announcements",
      channels: parseChannelsInput(newChannels, DEFAULT_CHANNELS),
      priority: editingCampaignId ? newPriority : "normal",
      emailTemplateRef: newEmailTemplateRef.trim(),
      subject: newSubject.trim(),
      bodyText: newBodyText.trim(),
    };

    setIsBusy(true);
    try {
      if (editingCampaignId) {
        await put(`/${PLUGIN_ID}/campaigns/${editingCampaignId}`, payload);
        notifyStatus(
          `${t("page.ui.updated_campaign", "Updated broadcast campaign")}: ${payload.title}`
        );
      } else {
        await post(`/${PLUGIN_ID}/campaigns`, payload);
        notifyStatus(
          t(
            "page.ui.created_omnichannel_campaign",
            "Created omnichannel broadcast campaign"
          )
        );
      }
      resetCampaignForm();
      await loadAll();
    } catch (err) {
      notifyStatus(
        extractApiErrorMessage(
          err,
          t("page.ui.operation_failed", "Broadcast operation failed.")
        ),
        true
      );
    } finally {
      setIsBusy(false);
    }
  };

  const tabs: Array<[ActiveTab, string, number]> = [
    ["campaigns", t("page.ui.campaigns_tab", "Campaigns"), campaigns.length],
    [
      "automations",
      t("page.ui.automation_rules_tab", "Automation Rules"),
      rules.length,
    ],
    ["logs", t("page.ui.delivery_ledger_tab", "Delivery Ledger"), logs.length],
  ];

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
                "page.ui.omnichannel_community_broadcasts_automations",
                "Omnichannel Community Broadcasts & Automations"
              )}
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              {t(
                "page.ui.email_newsletters_telegram_bot_forum_topics_what",
                "Email newsletters, Telegram Bot & Forum topics, WhatsApp Cloud API / Gateways, EventHub auto-triggers & Hijri dates"
              )}
            </Typography>
          </Box>
          <Flex gap={2} wrap="wrap">
            {tabs.map(([tabKey, label, count]) => (
              <Button
                key={tabKey}
                variant={activeTab === tabKey ? "default" : "tertiary"}
                onClick={() => setActiveTab(tabKey)}
              >
                {label} ({count})
              </Button>
            ))}
          </Flex>
        </Flex>

        {statusMessage && (
          <Box
            padding={3}
            marginBottom={4}
            background={statusIsError ? "danger100" : "success100"}
            hasRadius
            role={statusIsError ? "alert" : "status"}
          >
            <Typography
              textColor={statusIsError ? "danger700" : "success700"}
              fontWeight="semiBold"
            >
              {statusMessage}
            </Typography>
          </Box>
        )}

        <Divider />

        {activeTab === "campaigns" && (
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
                  "page.ui.starter_templates_broadcast_campaigns",
                  "Starter Templates & Broadcast Campaigns"
                )}
              </Typography>
              <Flex gap={2} wrap="wrap">
                <Button
                  variant="tertiary"
                  onClick={() => navigate("/plugins/email-designer-5")}
                >
                  {t("page.ui.open_email_designer", "Open Email Designer")} (
                  {emailTemplates.length})
                </Button>
                {STARTER_CAMPAIGN_TEMPLATES.map((tpl) => (
                  <Button
                    key={tpl.id}
                    variant="secondary"
                    disabled={isBusy}
                    onClick={() => handleSeedTemplate(tpl.id)}
                  >
                    + {tpl.slug}
                  </Button>
                ))}
              </Flex>
            </Flex>

            <CampaignComposerForm
              t={t}
              editingCampaignId={editingCampaignId}
              isBusy={isBusy}
              newSlug={newSlug}
              setNewSlug={setNewSlug}
              newTitle={newTitle}
              setNewTitle={setNewTitle}
              newTopic={newTopic}
              setNewTopic={setNewTopic}
              newChannels={newChannels}
              setNewChannels={setNewChannels}
              newEmailTemplateRef={newEmailTemplateRef}
              setNewEmailTemplateRef={setNewEmailTemplateRef}
              newSubject={newSubject}
              setNewSubject={setNewSubject}
              newBodyText={newBodyText}
              setNewBodyText={setNewBodyText}
              emailTemplates={emailTemplates}
              onCancelEdit={() => resetCampaignForm()}
              onSave={handleSaveCampaign}
            />

            <CampaignsTableSection
              t={t}
              campaigns={campaigns}
              onEdit={handleStartEditCampaign}
              onDispatch={handleDispatchCampaign}
              navigate={navigate}
              isBusy={isBusy}
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
          notifyStatus={notifyStatus}
          loadAll={loadAll}
        />
      </Box>
    </Main>
  );
};
