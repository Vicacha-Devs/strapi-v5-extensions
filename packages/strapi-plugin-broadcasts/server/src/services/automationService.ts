import type { Core } from '@strapi/strapi';
import {
  AUTOMATION_RULE_UID,
  PLUGIN_ID,
  STARTER_AUTOMATION_RULES,
  formatSecondaryDate,
  interpolateBroadcastTemplate,
  normalizeChannels,
  validateAutomationRuleInput,
  type AutomationRuleRecord,
  type BroadcastSettings,
  type CampaignRecord,
  type ChannelDispatchResult,
} from '../../../shared';

const createAutomationService = ({ strapi }: { strapi: Core.Strapi }) => ({
  getSettingsService() {
    return strapi.plugin(PLUGIN_ID).service('settings') as {
      getSettings(): Promise<BroadcastSettings>;
    };
  },

  getCampaignService() {
    return strapi.plugin(PLUGIN_ID).service('campaignService') as {
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

  async createRule(
    input: Partial<AutomationRuleRecord>
  ): Promise<AutomationRuleRecord> {
    const channels = normalizeChannels(input.channels);
    const candidate: Partial<AutomationRuleRecord> = {
      ...input,
      channels,
    };

    const validation = validateAutomationRuleInput(candidate);
    if (!validation.valid) {
      throw new Error(validation.errors.join('; '));
    }

    const created = await strapi.documents(AUTOMATION_RULE_UID).create({
      data: {
        slug: candidate.slug,
        name: candidate.name,
        eventName: candidate.eventName,
        targetContentType: candidate.targetContentType,
        topic: candidate.topic || 'announcements',
        channels,
        active: candidate.active ?? true,
        priority: candidate.priority || 'normal',
        subjectTemplate: candidate.subjectTemplate,
        bodyTextTemplate: candidate.bodyTextTemplate,
        bodyHtmlTemplate:
          candidate.bodyHtmlTemplate || `<p>${candidate.bodyTextTemplate}</p>`,
        ctaLabelTemplate: candidate.ctaLabelTemplate,
        ctaUrlTemplate: candidate.ctaUrlTemplate,
        translations: candidate.translations || {},
        triggerCount: 0,
      },
    });

    return created as unknown as AutomationRuleRecord;
  },

  async seedStarterRules(): Promise<number> {
    const settings = await this.getSettingsService().getSettings();
    const presets =
      Array.isArray(settings.presetAutomationRules) &&
      settings.presetAutomationRules.length > 0
        ? settings.presetAutomationRules
        : STARTER_AUTOMATION_RULES;

    let seededCount = 0;
    for (const preset of presets) {
      if (!preset.slug || !preset.name || !preset.eventName) continue;
      const existing = await this.getRuleBySlug(preset.slug);
      if (!existing) {
        await this.createRule({
          slug: preset.slug,
          name: preset.name,
          eventName: preset.eventName,
          targetContentType: preset.targetContentType,
          topic: preset.topic || 'announcements',
          channels: preset.channels || ['telegram'],
          active: preset.active ?? true,
          priority: preset.priority || 'normal',
          subjectTemplate: preset.subjectTemplate || '📢 {{title}}',
          bodyTextTemplate:
            preset.bodyTextTemplate || '{{title}}: {{message}} ({{secondaryDate}})',
          bodyHtmlTemplate: preset.bodyHtmlTemplate,
          ctaLabelTemplate: preset.ctaLabelTemplate,
          ctaUrlTemplate: preset.ctaUrlTemplate,
          translations: preset.translations || {},
        });
        seededCount += 1;
      }
    }
    return seededCount;
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
    if (!settings.enableEventHubAutomations) {
      return [];
    }

    const allRules = await this.listRules();
    const matchingRules = allRules.filter((rule) => {
      if (!rule.active) return false;
      if (rule.eventName !== eventName) return false;
      if (
        rule.targetContentType &&
        payload.model &&
        String(payload.model) !== rule.targetContentType
      ) {
        return false;
      }
      return true;
    });

    if (matchingRules.length === 0) {
      return [];
    }

    const secondaryCal = settings.secondaryCalendars?.[0] || 'islamic-umalqura';
    const secondaryDate = formatSecondaryDate(
      new Date().toISOString().slice(0, 10),
      secondaryCal,
      settings.defaultLocale || 'es'
    );

    const entryRecord =
      (payload.entry as Record<string, unknown> | undefined) || payload;

    const vars: Record<string, string | number | undefined> = {
      title: String(
        entryRecord.title || entryRecord.name || entryRecord.subject || eventName
      ),
      message: String(
        entryRecord.message ||
          entryRecord.summary ||
          entryRecord.description ||
          ''
      ),
      summary: String(
        entryRecord.summary ||
          entryRecord.description ||
          entryRecord.message ||
          ''
      ),
      code: String(entryRecord.code || entryRecord.slug || 'event'),
      organizationName: settings.organizationName,
      siteBaseUrl: settings.siteBaseUrl,
      secondaryDate: secondaryDate.formatted,
    };

    const outcomes: Array<{
      ruleSlug: string;
      campaignSlug: string;
      results: ChannelDispatchResult[];
    }> = [];

    const campaignService = this.getCampaignService();

    for (const rule of matchingRules) {
      const safeCode = String(vars.code || 'item')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'item';
      const campaignSlug = `auto-${rule.slug}-${safeCode}`;

      const subject = interpolateBroadcastTemplate(rule.subjectTemplate, vars);
      const bodyText = interpolateBroadcastTemplate(rule.bodyTextTemplate, vars);
      const bodyHtml = interpolateBroadcastTemplate(
        rule.bodyHtmlTemplate || `<p>${rule.bodyTextTemplate}</p>`,
        vars,
        { escapeHtmlValues: true }
      );
      const ctaLabel = rule.ctaLabelTemplate
        ? interpolateBroadcastTemplate(rule.ctaLabelTemplate, vars)
        : undefined;
      const ctaUrl = rule.ctaUrlTemplate
        ? interpolateBroadcastTemplate(rule.ctaUrlTemplate, vars)
        : undefined;

      const campaign = await campaignService.createCampaign({
        slug: campaignSlug,
        title: `[Auto] ${rule.name}: ${vars.title}`,
        topic: rule.topic,
        channels: rule.channels,
        priority: rule.priority,
        subject,
        bodyText,
        bodyHtml,
        ctaLabel,
        ctaUrl,
      });

      const dispatched = await campaignService.dispatchCampaign(
        campaign.documentId || campaign.slug
      );

      if (rule.documentId) {
        await strapi.documents(AUTOMATION_RULE_UID).update({
          documentId: rule.documentId,
          data: {
            lastTriggeredAt: new Date().toISOString(),
            triggerCount: (rule.triggerCount || 0) + 1,
          },
        });
      }

      outcomes.push({
        ruleSlug: rule.slug,
        campaignSlug: dispatched.campaign.slug,
        results: dispatched.results,
      });
    }

    return outcomes;
  },
});

export default createAutomationService;
