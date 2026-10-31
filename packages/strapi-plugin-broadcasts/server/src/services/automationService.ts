import type { Core } from "@strapi/strapi";

import {
  AUTOMATION_RULE_UID,
  PLUGIN_ID,
  STARTER_AUTOMATION_RULES,
  formatSecondaryDate,
  interpolateBroadcastTemplate,
  normalizeChannels,
  validateAutomationRuleInput,
  type AutomationRuleRecord,
  type BroadcastChannel,
  type BroadcastSettings,
  type CampaignRecord,
  type ChannelDispatchResult,
} from "../../../shared";

function buildRuleDocumentData(
  rule: Partial<AutomationRuleRecord>,
  channels: BroadcastChannel[],
  fallbackActive = true
): Record<string, unknown> {
  return {
    slug: rule.slug,
    name: rule.name,
    eventName: rule.eventName,
    targetContentType: rule.targetContentType,
    topic: rule.topic || "announcements",
    channels,
    active: rule.active ?? fallbackActive,
    priority: rule.priority || "normal",
    subjectTemplate: rule.subjectTemplate,
    bodyTextTemplate: rule.bodyTextTemplate,
    bodyHtmlTemplate: rule.bodyHtmlTemplate || `<p>${rule.bodyTextTemplate}</p>`,
    ctaLabelTemplate: rule.ctaLabelTemplate,
    ctaUrlTemplate: rule.ctaUrlTemplate,
    translations: rule.translations || {},
  };
}

function buildPresetRulePayload(
  preset: Partial<AutomationRuleRecord>
): Partial<AutomationRuleRecord> {
  return {
    slug: preset.slug,
    name: preset.name,
    eventName: preset.eventName,
    targetContentType: preset.targetContentType,
    topic: preset.topic || "announcements",
    channels: preset.channels || ["telegram"],
    active: preset.active ?? true,
    priority: preset.priority || "normal",
    subjectTemplate: preset.subjectTemplate || "📢 {{title}}",
    bodyTextTemplate: preset.bodyTextTemplate || "{{title}}: {{message}} ({{secondaryDate}})",
    bodyHtmlTemplate: preset.bodyHtmlTemplate,
    ctaLabelTemplate: preset.ctaLabelTemplate,
    ctaUrlTemplate: preset.ctaUrlTemplate,
    translations: preset.translations || {},
  };
}

function doesRuleMatchTrigger(
  rule: AutomationRuleRecord,
  eventName: string,
  payload: Record<string, unknown>
): boolean {
  if (!rule.active || rule.eventName !== eventName) return false;
  if (rule.targetContentType && payload.model && String(payload.model) !== rule.targetContentType) {
    return false;
  }
  return true;
}

function firstNonEmptyString(
  record: Record<string, unknown>,
  keys: string[],
  fallback: string
): string {
  for (const key of keys) {
    const val = record[key];
    if (val !== undefined && val !== null && String(val) !== "") {
      return String(val);
    }
  }
  return fallback;
}

function extractTriggerVariables(
  eventName: string,
  payload: Record<string, unknown>,
  settings: BroadcastSettings,
  secondaryDateFormatted: string
): Record<string, string | number | undefined> {
  const entryRecord = (payload.entry as Record<string, unknown> | undefined) ?? payload;

  return {
    title: firstNonEmptyString(entryRecord, ["title", "name", "subject"], eventName),
    message: firstNonEmptyString(entryRecord, ["message", "summary", "description"], ""),
    summary: firstNonEmptyString(entryRecord, ["summary", "description", "message"], ""),
    code: firstNonEmptyString(entryRecord, ["code", "slug"], "event"),
    organizationName: settings.organizationName,
    siteBaseUrl: settings.siteBaseUrl,
    secondaryDate: secondaryDateFormatted,
  };
}

function buildAutoCampaignInput(
  rule: AutomationRuleRecord,
  vars: Record<string, string | number | undefined>
): Partial<CampaignRecord> {
  const rawCode = String(vars.code || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const safeCode = rawCode || "item";

  return {
    slug: `auto-${rule.slug}-${safeCode}`,
    title: `[Auto] ${rule.name}: ${vars.title}`,
    topic: rule.topic,
    channels: rule.channels,
    priority: rule.priority,
    subject: interpolateBroadcastTemplate(rule.subjectTemplate, vars),
    bodyText: interpolateBroadcastTemplate(rule.bodyTextTemplate, vars),
    bodyHtml: interpolateBroadcastTemplate(
      rule.bodyHtmlTemplate || `<p>${rule.bodyTextTemplate}</p>`,
      vars,
      { escapeHtmlValues: true }
    ),
    ctaLabel: rule.ctaLabelTemplate
      ? interpolateBroadcastTemplate(rule.ctaLabelTemplate, vars)
      : undefined,
    ctaUrl: rule.ctaUrlTemplate
      ? interpolateBroadcastTemplate(rule.ctaUrlTemplate, vars)
      : undefined,
  };
}

const createAutomationService = ({ strapi }: { strapi: Core.Strapi }) => ({
  getSettingsService() {
    return strapi.plugin(PLUGIN_ID).service("settings") as {
      getSettings(): Promise<BroadcastSettings>;
    };
  },

  getCampaignService() {
    return strapi.plugin(PLUGIN_ID).service("campaignService") as {
      createCampaign(input: Partial<CampaignRecord>): Promise<CampaignRecord>;
      dispatchCampaign(
        documentIdOrSlug: string
      ): Promise<{ campaign: CampaignRecord; results: ChannelDispatchResult[] }>;
    };
  },

  async listRules(): Promise<AutomationRuleRecord[]> {
    const docs = await strapi.documents(AUTOMATION_RULE_UID).findMany({
      limit: 100,
    });
    return docs as unknown as AutomationRuleRecord[];
  },

  async getRuleBySlug(slug: string): Promise<AutomationRuleRecord | null> {
    const docs = await strapi.documents(AUTOMATION_RULE_UID).findMany({
      filters: { slug },
      limit: 1,
    });
    return (docs[0] as unknown as AutomationRuleRecord) || null;
  },

  async findRuleByDocIdOrSlug(documentIdOrSlug: string): Promise<AutomationRuleRecord | null> {
    const byDoc = (await strapi
      .documents(AUTOMATION_RULE_UID)
      .findOne({ documentId: documentIdOrSlug })) as unknown as AutomationRuleRecord | null;
    return byDoc ?? (await this.getRuleBySlug(documentIdOrSlug));
  },

  async createRule(input: Partial<AutomationRuleRecord>): Promise<AutomationRuleRecord> {
    const channels = normalizeChannels(input.channels);
    const candidate: Partial<AutomationRuleRecord> = {
      ...input,
      channels,
    };

    const validation = validateAutomationRuleInput(candidate);
    if (!validation.valid) {
      throw new Error(validation.errors.join("; "));
    }

    const created = await strapi.documents(AUTOMATION_RULE_UID).create({
      data: {
        ...buildRuleDocumentData(candidate, channels, true),
        triggerCount: 0,
      },
    });

    return created as unknown as AutomationRuleRecord;
  },

  async updateRule(
    documentIdOrSlug: string,
    input: Partial<AutomationRuleRecord>
  ): Promise<AutomationRuleRecord> {
    const existing = await this.findRuleByDocIdOrSlug(documentIdOrSlug);
    if (!existing?.documentId) {
      throw new Error(`Automation rule "${documentIdOrSlug}" not found`);
    }

    const channels = normalizeChannels(input.channels ?? existing.channels);
    const merged: Partial<AutomationRuleRecord> = {
      ...existing,
      ...input,
      channels,
    };

    const validation = validateAutomationRuleInput(merged);
    if (!validation.valid) {
      throw new Error(validation.errors.join("; "));
    }

    const updated = await strapi.documents(AUTOMATION_RULE_UID).update({
      documentId: existing.documentId,
      data: buildRuleDocumentData(merged, channels, existing.active ?? true),
    });

    return (updated as unknown as AutomationRuleRecord) || (merged as AutomationRuleRecord);
  },

  async seedStarterRules(): Promise<number> {
    const settings = await this.getSettingsService().getSettings();
    const presets = settings.presetAutomationRules?.length
      ? settings.presetAutomationRules
      : STARTER_AUTOMATION_RULES;

    let seededCount = 0;
    for (const preset of presets) {
      if (!preset.slug || !preset.name || !preset.eventName) continue;
      const existing = await this.getRuleBySlug(preset.slug);
      if (existing) continue;
      await this.createRule(buildPresetRulePayload(preset));
      seededCount += 1;
    }
    return seededCount;
  },

  async executeSingleTriggerRule(
    rule: AutomationRuleRecord,
    vars: Record<string, string | number | undefined>
  ): Promise<{
    ruleSlug: string;
    campaignSlug: string;
    results: ChannelDispatchResult[];
  }> {
    const campaignService = this.getCampaignService();
    const campaign = await campaignService.createCampaign(buildAutoCampaignInput(rule, vars));
    const dispatched = await campaignService.dispatchCampaign(campaign.documentId || campaign.slug);

    if (rule.documentId) {
      await strapi.documents(AUTOMATION_RULE_UID).update({
        documentId: rule.documentId,
        data: {
          lastTriggeredAt: new Date().toISOString(),
          triggerCount: (rule.triggerCount || 0) + 1,
        },
      });
    }

    return {
      ruleSlug: rule.slug,
      campaignSlug: dispatched.campaign.slug,
      results: dispatched.results,
    };
  },

  async handleEventTrigger(
    eventName: string,
    payload: Record<string, unknown> = {}
  ): Promise<
    Array<{
      ruleSlug: string;
      campaignSlug: string;
      results: ChannelDispatchResult[];
    }>
  > {
    const settings = await this.getSettingsService().getSettings();
    if (!settings.enableEventHubAutomations) return [];

    const allRules = await this.listRules();
    const matchingRules = allRules.filter((rule) => doesRuleMatchTrigger(rule, eventName, payload));
    if (matchingRules.length === 0) return [];

    const secondaryCal = settings.secondaryCalendars?.[0] || "islamic-umalqura";
    const secondaryDate = formatSecondaryDate(
      new Date().toISOString().slice(0, 10),
      secondaryCal,
      settings.defaultLocale || "es"
    );
    const vars = extractTriggerVariables(eventName, payload, settings, secondaryDate.formatted);

    const outcomes = [];
    for (const rule of matchingRules) {
      outcomes.push(await this.executeSingleTriggerRule(rule, vars));
    }
    return outcomes;
  },
});

export default createAutomationService;
