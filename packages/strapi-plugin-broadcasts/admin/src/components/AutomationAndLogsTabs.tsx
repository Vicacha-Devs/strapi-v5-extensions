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
  TextInput,
  Typography,
} from "@strapi/design-system";
import * as React from "react";

import { PLUGIN_ID, STARTER_AUTOMATION_RULES } from "../../../shared/constants";
import type {
  AutomationRuleRecord,
  BroadcastChannel,
  DeliveryLogRecord,
} from "../../../shared/types";
import {
  AutomationRulesTable,
  DeliveryLedgerSection,
  type TranslateFn,
} from "./DeliveryLedgerSection";
import {
  BROADCAST_CHANNEL_OPTIONS,
  BROADCAST_TOPIC_OPTIONS,
  mergeSelectOptions,
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
  setStatusMessage: (msg: string) => void;
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
  setStatusMessage,
  loadAll,
}) => {
  const [editingRuleId, setEditingRuleId] = React.useState<string | null>(null);
  const [ruleSlug, setRuleSlug] = React.useState<string>("");
  const [ruleName, setRuleName] = React.useState<string>("");
  const [ruleEventName, setRuleEventName] = React.useState<string>("event.published");
  const [ruleTopic, setRuleTopic] = React.useState<string>("events");
  const [ruleChannels, setRuleChannels] = React.useState<BroadcastChannel[]>(["telegram", "email"]);
  const [ruleSubjectTemplate, setRuleSubjectTemplate] = React.useState<string>(
    "📅 {{title}} ({{secondaryDate}})"
  );
  const [ruleBodyTextTemplate, setRuleBodyTextTemplate] = React.useState<string>(
    "{{title}}: {{summary}} ({{secondaryDate}})"
  );

  const resetRuleForm = () => {
    setEditingRuleId(null);
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
    setRuleSlug(rule.slug);
    setRuleName(rule.name);
    setRuleEventName(rule.eventName);
    setRuleTopic(rule.topic || "announcements");
    setRuleChannels(
      Array.isArray(rule.channels) && rule.channels.length > 0 ? rule.channels : ["telegram"]
    );
    setRuleSubjectTemplate(rule.subjectTemplate || "");
    setRuleBodyTextTemplate(rule.bodyTextTemplate || "");
    setStatusMessage(`${t("page.ui.editing_rule", "Editing rule")}: ${rule.name}`);
  };

  const handleSaveRule = async () => {
    const isComplete = Boolean(
      ruleSlug && ruleName && ruleEventName && ruleSubjectTemplate && ruleBodyTextTemplate
    );
    if (!isComplete) return;

    const payload = {
      slug: ruleSlug.trim(),
      name: ruleName.trim(),
      eventName: ruleEventName.trim(),
      topic: ruleTopic.trim() || "announcements",
      channels: parseChannelsInput(ruleChannels, ["telegram", "email"]),
      active: true,
      priority: "normal",
      subjectTemplate: ruleSubjectTemplate.trim(),
      bodyTextTemplate: ruleBodyTextTemplate.trim(),
    };

    if (editingRuleId) {
      await put(`/${PLUGIN_ID}/automation-rules/${editingRuleId}`, payload);
      setStatusMessage(`${t("page.ui.updated_rule", "Updated automation rule")}: ${payload.name}`);
    } else {
      await post(`/${PLUGIN_ID}/automation-rules`, payload);
      setStatusMessage(`${t("page.ui.created_rule", "Created automation rule")}: ${payload.name}`);
    }
    resetRuleForm();
    await loadAll();
  };

  const handleToggleRuleActive = async (rule: AutomationRuleRecord) => {
    const targetId = rule.documentId || rule.slug;
    const nextActive = !rule.active;
    await put(`/${PLUGIN_ID}/automation-rules/${targetId}`, {
      ...rule,
      active: nextActive,
    });
    const stateLabel = nextActive
      ? t("page.ui.rule_activated", "activated")
      : t("page.ui.rule_paused", "paused");
    setStatusMessage(`${rule.name}: ${stateLabel}`);
    await loadAll();
  };

  const handleSeedStarterRule = async (preset: (typeof STARTER_AUTOMATION_RULES)[number]) => {
    const existing = rules.find((r) => r.slug === preset.slug);
    if (existing) {
      handleStartEditRule(existing);
      return;
    }
    await post(`/${PLUGIN_ID}/automation-rules`, preset);
    setStatusMessage(
      `${t("page.ui.added_starter_rule", "Added starter automation rule")}: ${preset.name}`
    );
    await loadAll();
  };

  if (activeTab === "logs") {
    return <DeliveryLedgerSection t={t} logs={logs} />;
  }

  if (activeTab !== "automations") {
    return null;
  }

  const formHeading = editingRuleId
    ? `${t("page.ui.edit_automation_rule", "Edit Automation Rule")} (${ruleSlug})`
    : t("page.ui.create_new_eventhub_automation_rule", "Create New EventHub Automation Rule");
  const topicOpts = mergeSelectOptions(BROADCAST_TOPIC_OPTIONS, [ruleTopic]);

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
          {editingRuleId && <Badge active>{t("common.editing_mode", "Editing Mode")}</Badge>}
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
          <Field.Root
            name="ruleSlug"
            required
            hint={t("page.ui.rule_slug_hint", "Unique identifier (lowercase & hyphens).")}
          >
            <Field.Label>{t("field.rule_slug", "Rule Slug")}</Field.Label>
            <TextInput
              name="ruleSlug"
              placeholder={t(
                "placeholder.e_g_auto_course_published",
                "e.g., auto-course-published"
              )}
              value={ruleSlug}
              onChange={(e: { target: { value: string } }) => setRuleSlug(e.target.value)}
            />
            <Field.Hint />
          </Field.Root>
          <Field.Root
            name="ruleName"
            required
            hint={t("page.ui.rule_name_hint", "Human-readable rule description.")}
          >
            <Field.Label>{t("field.rule_name", "Rule Name")}</Field.Label>
            <TextInput
              name="ruleName"
              placeholder={t(
                "placeholder.e_g_auto_broadcast_new_courses",
                "e.g., Auto-Broadcast New Courses"
              )}
              value={ruleName}
              onChange={(e: { target: { value: string } }) => setRuleName(e.target.value)}
            />
            <Field.Hint />
          </Field.Root>
          <Field.Root
            name="ruleEventName"
            required
            hint={t(
              "page.ui.rule_event_name_hint",
              "Strapi EventHub event that triggers this rule."
            )}
          >
            <Field.Label>{t("field.eventhub_trigger_name", "EventHub Trigger Name")}</Field.Label>
            <TextInput
              name="ruleEventName"
              placeholder={t(
                "placeholder.e_g_event_published",
                "e.g., event.published or inbox.alert.published"
              )}
              value={ruleEventName}
              onChange={(e: { target: { value: string } }) => setRuleEventName(e.target.value)}
            />
            <Field.Hint />
          </Field.Root>
          <Field.Root
            name="ruleTopic"
            hint={t("page.ui.rule_topic_hint", "Subscriber topic segment to notify.")}
          >
            <Field.Label>{t("field.topic_segment", "Topic Segment")}</Field.Label>
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
            hint={t("page.ui.rule_channels_hint", "Channels dispatched when triggered.")}
          >
            <Field.Label>{t("field.channels", "Channels")}</Field.Label>
            <MultiSelect
              name="ruleChannels"
              withTags
              placeholder={t("placeholder.select_channels", "Select channels...")}
              value={ruleChannels}
              onChange={(nextValues: string[]) =>
                setRuleChannels(
                  nextValues.length > 0 ? (nextValues as BroadcastChannel[]) : ["telegram"]
                )
              }
              onClear={() => setRuleChannels(["telegram"])}
            >
              {BROADCAST_CHANNEL_OPTIONS.map((opt) => (
                <MultiSelectOption key={opt.value} value={opt.value}>
                  {opt.label}
                </MultiSelectOption>
              ))}
            </MultiSelect>
            <Field.Hint />
          </Field.Root>
          <Field.Root
            name="ruleSubjectTemplate"
            required
            hint={t(
              "page.ui.rule_subject_template_hint",
              "Supports {{title}}, {{secondaryDate}}, {{organizationName}}."
            )}
          >
            <Field.Label>{t("field.subject_template", "Subject Template")}</Field.Label>
            <TextInput
              name="ruleSubjectTemplate"
              placeholder={t(
                "placeholder.rule_subject_template",
                "🚨 {{title}} — {{organizationName}}"
              )}
              value={ruleSubjectTemplate}
              onChange={(e: { target: { value: string } }) =>
                setRuleSubjectTemplate(e.target.value)
              }
            />
            <Field.Hint />
          </Field.Root>
          <Box style={{ gridColumn: "1 / -1" }}>
            <Field.Root
              name="ruleBodyTextTemplate"
              required
              hint={t(
                "page.ui.rule_body_text_template_hint",
                "Interpolated with event payload fields ({{title}}, {{message}}, {{summary}}, {{secondaryDate}})."
              )}
            >
              <Field.Label>{t("field.body_text_template", "Body Text Template")}</Field.Label>
              <TextInput
                name="ruleBodyTextTemplate"
                placeholder={t(
                  "placeholder.rule_body_text_template",
                  "{{title}}: {{message}} ({{secondaryDate}})"
                )}
                value={ruleBodyTextTemplate}
                onChange={(e: { target: { value: string } }) =>
                  setRuleBodyTextTemplate(e.target.value)
                }
              />
              <Field.Hint />
            </Field.Root>
          </Box>
        </Box>
        <Flex justifyContent="flex-end" paddingTop={3} gap={2}>
          {editingRuleId && (
            <Button variant="tertiary" onClick={resetRuleForm}>
              {t("common.cancel", "Cancel")}
            </Button>
          )}
          <Button onClick={handleSaveRule}>
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
      />
    </Box>
  );
};
