import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  MultiSelect,
  MultiSelectOption,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from "@strapi/design-system";
import { mergeSelectOptions } from "@vicacha-devs/plugin-shared";
import * as React from "react";

import { PLUGIN_ID, STARTER_AUTOMATION_RULES } from "../../../shared/constants";
import type {
  AutomationRuleRecord,
  BroadcastChannel,
  BroadcastPriority,
  DeliveryLogRecord,
} from "../../../shared/types";
import { extractApiErrorMessage } from "../utils/extractApiError";
import { RequiredTextField } from "./CampaignsTableSection";
import {
  AutomationRulesTable,
  DeliveryLedgerSection,
  type TranslateFn,
} from "./DeliveryLedgerSection";
import {
  getBroadcastChannelOptions,
  getBroadcastTopicOptions,
} from "./OrganizationEmailTab";

export function parseChannelsInput(
  raw: string | string[],
  fallback: BroadcastChannel[] = ["email", "telegram"]
): BroadcastChannel[] {
  const allowed: BroadcastChannel[] = ["email", "telegram", "whatsapp"];
  const items = Array.isArray(raw) ? raw : raw.split(",");
  const parsed = items
    .map((item) => item.trim().toLowerCase() as BroadcastChannel)
    .filter((item): item is BroadcastChannel => allowed.includes(item));
  return parsed.length > 0 ? Array.from(new Set(parsed)) : fallback;
}

export interface AutomationAndLogsTabsProps {
  activeTab: "campaigns" | "automations" | "logs";
  rules: AutomationRuleRecord[];
  logs: DeliveryLogRecord[];
  t: TranslateFn;
  navigate: (path: string) => void;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  notifyStatus: (msg: string, isError?: boolean) => void;
  loadAll: () => Promise<void>;
}

export const AutomationAndLogsTabs: React.FC<AutomationAndLogsTabsProps> = ({
  activeTab,
  rules,
  logs,
  t,
  navigate,
  post,
  put,
  notifyStatus,
  loadAll,
}) => {
  const [editingRuleId, setEditingRuleId] = React.useState<string | null>(null);
  const [ruleActive, setRuleActive] = React.useState<boolean>(true);
  const [rulePriority, setRulePriority] =
    React.useState<BroadcastPriority>("normal");
  const [isBusy, setIsBusy] = React.useState<boolean>(false);
  const [ruleSlug, setRuleSlug] = React.useState<string>("");
  const [ruleName, setRuleName] = React.useState<string>("");
  const [ruleEventName, setRuleEventName] =
    React.useState<string>("event.published");
  const [ruleTopic, setRuleTopic] = React.useState<string>("events");
  const [ruleChannels, setRuleChannels] = React.useState<BroadcastChannel[]>([
    "telegram",
    "email",
  ]);
  const [ruleSubjectTemplate, setRuleSubjectTemplate] = React.useState<string>(
    "📅 {{title}} ({{secondaryDate}})"
  );
  const [ruleBodyTextTemplate, setRuleBodyTextTemplate] =
    React.useState<string>("{{title}}: {{summary}} ({{secondaryDate}})");

  const resetRuleForm = () => {
    setEditingRuleId(null);
    setRuleActive(true);
    setRulePriority("normal");
    setRuleSlug("");
    setRuleName("");
    setRuleEventName("event.published");
    setRuleTopic("events");
    setRuleChannels(["telegram", "email"]);
    setRuleSubjectTemplate("📅 {{title}} ({{secondaryDate}})");
    setRuleBodyTextTemplate("{{title}}: {{summary}} ({{secondaryDate}})");
  };

  const handleStartEditRule = (rule: AutomationRuleRecord) => {
    setEditingRuleId(rule.documentId || rule.slug);
    setRuleActive(rule.active ?? true);
    setRulePriority(rule.priority || "normal");
    setRuleSlug(rule.slug);
    setRuleName(rule.name);
    setRuleEventName(rule.eventName);
    setRuleTopic(rule.topic || "announcements");
    setRuleChannels(
      Array.isArray(rule.channels) && rule.channels.length > 0
        ? rule.channels
        : ["telegram"]
    );
    setRuleSubjectTemplate(rule.subjectTemplate || "");
    setRuleBodyTextTemplate(rule.bodyTextTemplate || "");
    notifyStatus(`${t("page.ui.editing_rule", "Editing rule")}: ${rule.name}`);
  };

  const handleSaveRule = async () => {
    const isComplete = Boolean(
      ruleSlug &&
      ruleName &&
      ruleEventName &&
      ruleSubjectTemplate &&
      ruleBodyTextTemplate
    );
    if (!isComplete || isBusy) return;

    const payload = {
      slug: ruleSlug.trim(),
      name: ruleName.trim(),
      eventName: ruleEventName.trim(),
      topic: ruleTopic.trim() || "announcements",
      channels: parseChannelsInput(ruleChannels, ["telegram", "email"]),
      active: ruleActive,
      priority: rulePriority,
      subjectTemplate: ruleSubjectTemplate.trim(),
      bodyTextTemplate: ruleBodyTextTemplate.trim(),
    };

    setIsBusy(true);
    try {
      if (editingRuleId) {
        await put(`/${PLUGIN_ID}/automation-rules/${editingRuleId}`, payload);
        notifyStatus(
          `${t("page.ui.updated_rule", "Updated automation rule")}: ${payload.name}`
        );
      } else {
        await post(`/${PLUGIN_ID}/automation-rules`, payload);
        notifyStatus(
          `${t("page.ui.created_rule", "Created automation rule")}: ${payload.name}`
        );
      }
      resetRuleForm();
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

  const handleToggleRuleActive = async (rule: AutomationRuleRecord) => {
    if (isBusy) return;
    const targetId = rule.documentId || rule.slug;
    const nextActive = !rule.active;
    setIsBusy(true);
    try {
      await put(`/${PLUGIN_ID}/automation-rules/${targetId}`, {
        ...rule,
        active: nextActive,
      });
      const stateLabel = nextActive
        ? t("page.ui.rule_activated", "activated")
        : t("page.ui.rule_paused", "paused");
      notifyStatus(`${rule.name}: ${stateLabel}`);
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

  const handleSeedStarterRule = async (
    preset: (typeof STARTER_AUTOMATION_RULES)[number]
  ) => {
    if (isBusy) return;
    const existing = rules.find((r) => r.slug === preset.slug);
    if (existing) {
      handleStartEditRule(existing);
      return;
    }
    setIsBusy(true);
    try {
      await post(`/${PLUGIN_ID}/automation-rules`, preset);
      notifyStatus(
        `${t("page.ui.added_starter_rule", "Added starter automation rule")}: ${preset.name}`
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

  if (activeTab === "logs") {
    return <DeliveryLedgerSection t={t} logs={logs} />;
  }

  if (activeTab !== "automations") {
    return null;
  }

  const formHeading = editingRuleId
    ? `${t("page.ui.edit_automation_rule", "Edit Automation Rule")} (${ruleSlug})`
    : t(
        "page.ui.create_new_eventhub_automation_rule",
        "Create New EventHub Automation Rule"
      );
  const topicOpts = mergeSelectOptions(getBroadcastTopicOptions(t), [
    ruleTopic,
  ]);
  const channelOpts = getBroadcastChannelOptions(t);

  return (
    <Box paddingTop={6}>
      <Flex
        justifyContent="space-between"
        alignItems="center"
        paddingBottom={4}
        wrap="wrap"
        gap={2}
      >
        <Typography variant="beta" tag="h2">
          {t("page.ui.eventhub_automation_rules", "EventHub Automation Rules")}
        </Typography>
        <Flex gap={2} wrap="wrap">
          {STARTER_AUTOMATION_RULES.map((preset) => (
            <Button
              key={preset.slug}
              variant="secondary"
              disabled={isBusy}
              onClick={() => handleSeedStarterRule(preset)}
            >
              + {preset.slug}
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
        style={{ border: "1px solid rgba(128, 128, 128, 0.18)" }}
      >
        <Flex justifyContent="space-between" alignItems="center">
          <Typography variant="delta" tag="h3" fontWeight="bold">
            {formHeading}
          </Typography>
          {editingRuleId && (
            <Badge active>{t("common.editing_mode", "Editing Mode")}</Badge>
          )}
        </Flex>
        <Box
          paddingTop={3}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            alignItems: "start",
          }}
        >
          <RequiredTextField
            name="ruleSlug"
            label={t("field.rule_slug", "Rule Slug")}
            hint={t(
              "page.ui.rule_slug_hint",
              "Unique identifier (lowercase & hyphens)."
            )}
            placeholder={t(
              "placeholder.e_g_auto_course_published",
              "e.g., auto-course-published"
            )}
            value={ruleSlug}
            onChange={setRuleSlug}
          />
          <RequiredTextField
            name="ruleName"
            label={t("field.rule_name", "Rule Name")}
            hint={t(
              "page.ui.rule_name_hint",
              "Human-readable rule description."
            )}
            placeholder={t(
              "placeholder.e_g_auto_broadcast_new_courses",
              "e.g., Auto-Broadcast New Courses"
            )}
            value={ruleName}
            onChange={setRuleName}
          />
          <RequiredTextField
            name="ruleEventName"
            label={t("field.eventhub_trigger_name", "EventHub Trigger Name")}
            hint={t(
              "page.ui.rule_event_name_hint",
              "Strapi EventHub event that triggers this rule."
            )}
            placeholder={t(
              "placeholder.e_g_event_published",
              "e.g., event.published or inbox.alert.published"
            )}
            value={ruleEventName}
            onChange={setRuleEventName}
          />
          <Field.Root
            name="ruleTopic"
            hint={t(
              "page.ui.rule_topic_hint",
              "Subscriber topic segment to notify."
            )}
          >
            <Field.Label>
              {t("field.topic_segment", "Topic Segment")}
            </Field.Label>
            <SingleSelect
              name="ruleTopic"
              value={ruleTopic || "events"}
              onChange={(val: string | number) => setRuleTopic(String(val))}
            >
              {topicOpts.map((opt) => (
                <SingleSelectOption key={opt.value} value={opt.value}>
                  {opt.label}
                </SingleSelectOption>
              ))}
            </SingleSelect>
            <Field.Hint />
          </Field.Root>
          <Field.Root
            name="ruleChannels"
            hint={t(
              "page.ui.rule_channels_hint",
              "Channels dispatched when triggered."
            )}
          >
            <Field.Label>{t("field.channels", "Channels")}</Field.Label>
            <MultiSelect
              name="ruleChannels"
              withTags
              placeholder={t(
                "placeholder.select_channels",
                "Select channels..."
              )}
              value={ruleChannels}
              onChange={(nextValues: string[]) =>
                setRuleChannels(
                  nextValues.length > 0
                    ? (nextValues as BroadcastChannel[])
                    : ["telegram"]
                )
              }
              onClear={() => setRuleChannels(["telegram"])}
            >
              {channelOpts.map((opt) => (
                <MultiSelectOption key={opt.value} value={opt.value}>
                  {opt.label}
                </MultiSelectOption>
              ))}
            </MultiSelect>
            <Field.Hint />
          </Field.Root>
          <RequiredTextField
            name="ruleSubjectTemplate"
            label={t("field.subject_template", "Subject Template")}
            hint={t(
              "page.ui.rule_subject_template_hint",
              "Supports '{{title}}', '{{secondaryDate}}', '{{organizationName}}'."
            )}
            placeholder={t(
              "placeholder.rule_subject_template",
              "🚨 '{{title}}' — '{{organizationName}}'"
            )}
            value={ruleSubjectTemplate}
            onChange={setRuleSubjectTemplate}
          />
          <Box style={{ gridColumn: "1 / -1" }}>
            <RequiredTextField
              name="ruleBodyTextTemplate"
              label={t("field.body_text_template", "Body Text Template")}
              hint={t(
                "page.ui.rule_body_text_template_hint",
                "Interpolated with event payload fields ('{{title}}', '{{message}}', '{{summary}}', '{{secondaryDate}}')."
              )}
              placeholder={t(
                "placeholder.rule_body_text_template",
                "'{{title}}': '{{message}}' ('{{secondaryDate}}')"
              )}
              value={ruleBodyTextTemplate}
              onChange={setRuleBodyTextTemplate}
            />
          </Box>
        </Box>
        <Flex justifyContent="flex-end" paddingTop={3} gap={2}>
          {editingRuleId && (
            <Button
              variant="tertiary"
              disabled={isBusy}
              onClick={() => resetRuleForm()}
            >
              {t("common.cancel", "Cancel")}
            </Button>
          )}
          <Button loading={isBusy} disabled={isBusy} onClick={handleSaveRule}>
            {editingRuleId
              ? t("page.ui.save_rule_changes", "Save Rule Changes")
              : t("page.ui.create_automation_rule", "Create Automation Rule")}
          </Button>
        </Flex>
      </Box>

      <AutomationRulesTable
        t={t}
        rules={rules}
        onEdit={handleStartEditRule}
        onToggleActive={handleToggleRuleActive}
        navigate={navigate}
        isBusy={isBusy}
      />
    </Box>
  );
};
