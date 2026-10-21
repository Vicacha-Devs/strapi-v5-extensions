import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AUTOMATION_RULE_UID,
  CAMPAIGN_UID,
  DEFAULT_BROADCAST_SETTINGS,
  DELIVERY_LOG_UID,
  computeIdempotencyKey,
  escapeHtml,
  interpolateBroadcastTemplate,
  maskEmail,
  maskPhone,
  maskRecipientIdentifier,
  normalizeE164Phone,
  resolveLocalizedCampaignCopy,
  validateAutomationRuleInput,
  validateCampaignInput,
  validateGatewayUrl,
  type BroadcastSettings,
} from '../shared';
import settingsServiceFactory from '../server/src/services/settings';
import transportServiceFactory from '../server/src/services/transportService';
import campaignServiceFactory from '../server/src/services/campaignService';
import automationServiceFactory from '../server/src/services/automationService';

function createMockStrapi(customConfig: Partial<BroadcastSettings> = {}) {
  const storeMap = new Map<string, unknown>();
  const collections: Record<string, Array<Record<string, unknown>>> = {
    [CAMPAIGN_UID]: [],
    [AUTOMATION_RULE_UID]: [],
    [DELIVERY_LOG_UID]: [],
  };
  let idCounter = 1;
  const emittedEvents: Array<{ event: string; payload: unknown }> = [];

  const mockSubscribers = [
    {
      email: 'ahmad@mezquitabogota.org',
      phone: '3101234567',
      fullName: 'Ahmad Al-Mansoor',
      locale: 'ar',
      topics: ['announcements', 'urgent_janazah', 'events'],
      status: 'confirmed',
      unsubscribeToken: 'tok_ahmad_123',
    },
    {
      email: 'maria@example.com',
      phone: '+573159876543',
      fullName: 'María Rodríguez',
      locale: 'es',
      topics: ['announcements', 'courses'],
      status: 'confirmed',
      unsubscribeToken: 'tok_maria_456',
    },
    {
      email: 'pending@example.com',
      phone: '+573001112233',
      fullName: 'Pending User',
      locale: 'en',
      topics: ['announcements'],
      status: 'pending',
    },
  ];

  const strapi: Record<string, unknown> = {
    config: {
      get: (_key: string, def?: unknown) => ({
        ...(def as Record<string, unknown>),
        ...customConfig,
      }),
    },
    log: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    eventHub: {
      emit: (event: string, payload?: unknown) => {
        emittedEvents.push({ event, payload });
      },
    },
    store: () => ({
      get: async ({ key }: { key: string }) => storeMap.get(key) ?? null,
      set: async ({ key, value }: { key: string; value: unknown }) => {
        storeMap.set(key, value);
      },
    }),
    documents: (uid: string) => ({
      findMany: async (params?: { filters?: Record<string, unknown>; limit?: number }) => {
        const list = collections[uid] || [];
        const filters = params?.filters || {};
        return list.filter((item) =>
          Object.entries(filters).every(([k, v]) => {
            if (
              v &&
              typeof v === 'object' &&
              '$in' in (v as Record<string, unknown>) &&
              Array.isArray((v as { $in: unknown[] }).$in)
            ) {
              return (v as { $in: unknown[] }).$in.includes(item[k]);
            }
            return item[k] === v;
          })
        );
      },
      findOne: async ({ documentId }: { documentId: string }) => {
        const list = collections[uid] || [];
        return list.find((item) => item.documentId === documentId) ?? null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const doc = {
          ...data,
          documentId: `doc_${idCounter++}`,
        };
        if (!collections[uid]) collections[uid] = [];
        collections[uid].push(doc);
        return doc;
      },
      update: async ({
        documentId,
        data,
      }: {
        documentId: string;
        data: Record<string, unknown>;
      }) => {
        const list = collections[uid] || [];
        const idx = list.findIndex((item) => item.documentId === documentId);
        if (idx === -1) return null;
        list[idx] = { ...list[idx], ...data };
        return list[idx];
      },
    }),
  };

  const services: Record<string, unknown> = {};

  strapi.plugin = (name: string) => {
    if (name === 'inbox') {
      return {
        service: () => ({
          listSubscribers: async (params?: { status?: string; topic?: string }) =>
            mockSubscribers.filter((sub) => {
              if (params?.status && sub.status !== params.status) return false;
              if (params?.topic && !sub.topics.includes(params.topic)) return false;
              return true;
            }),
        }),
      };
    }
    return {
      service: (svcName: string) => services[svcName],
    };
  };

  const typedStrapi = strapi as unknown as Parameters<typeof settingsServiceFactory>[0]['strapi'];
  services.settings = settingsServiceFactory({ strapi: typedStrapi });
  services.transportService = transportServiceFactory({ strapi: typedStrapi });
  services.campaignService = campaignServiceFactory({ strapi: typedStrapi });
  services.automationService = automationServiceFactory({ strapi: typedStrapi });

  return {
    strapi: typedStrapi,
    services: services as {
      settings: ReturnType<typeof settingsServiceFactory>;
      transportService: ReturnType<typeof transportServiceFactory>;
      campaignService: ReturnType<typeof campaignServiceFactory>;
      automationService: ReturnType<typeof automationServiceFactory>;
    },
    collections,
    emittedEvents,
  };
}

describe('@vicacha-devs/strapi-plugin-broadcasts', () => {
  it('escapes HTML entities in interpolated templates and masks PII', () => {
    const rawHtml = '<p>As-salamu alaykum {{recipientName}}</p>';
    const rendered = interpolateBroadcastTemplate(
      rawHtml,
      { recipientName: '<script>alert("xss")</script>' },
      { escapeHtmlValues: true }
    );
    assert.equal(
      rendered,
      '<p>As-salamu alaykum &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>'
    );
    assert.equal(escapeHtml("O'Connor & <Sons>"), 'O&#39;Connor &amp; &lt;Sons&gt;');

    assert.equal(maskEmail('ahmad@mezquitabogota.org'), 'a***@mezquitabogota.org');
    assert.equal(normalizeE164Phone('3101234567', '57'), '+573101234567');
    assert.equal(maskPhone('3101234567'), '+57***4567');
    assert.equal(
      maskRecipientIdentifier('@MezquitaCentralBogota'),
      '@MezquitaCentralBogota'
    );
  });

  it('enforces SSRF protection and HTTPS on gateway URLs', () => {
    const metadataBlocked = validateGatewayUrl('https://169.254.169.254/latest/meta-data');
    assert.equal(metadataBlocked.valid, false);

    const httpExternalBlocked = validateGatewayUrl('http://gateway.example.com/api');
    assert.equal(httpExternalBlocked.valid, false);

    const localhostBlockedByDefault = validateGatewayUrl('http://localhost:3000/api');
    assert.equal(localhostBlockedByDefault.valid, false);

    const localhostAllowedExplicitly = validateGatewayUrl('http://localhost:3000/api', {
      allowLocalhost: true,
    });
    assert.equal(localhostAllowedExplicitly.valid, true);

    const validHttps = validateGatewayUrl('https://wa-gateway.mezquitabogota.org');
    assert.equal(validHttps.valid, true);
  });

  it('validates campaign and automation rule inputs and resolves localized copy', () => {
    const invalidCamp = validateCampaignInput({
      slug: 'Invalid Slug!',
      title: 'Hi',
      subject: 'No',
      bodyText: '123',
      channels: [],
    });
    assert.equal(invalidCamp.valid, false);
    assert.ok(invalidCamp.errors.length >= 4);

    const validRule = validateAutomationRuleInput({
      slug: 'alert-rule',
      name: 'Urgent Alert Rule',
      eventName: 'inbox.alert.published',
      subjectTemplate: '🚨 {{title}}',
      bodyTextTemplate: '{{message}}',
    });
    assert.equal(validRule.valid, true);

    const copy = resolveLocalizedCampaignCopy(
      {
        subject: 'Default Subject',
        bodyText: 'Default Body',
        translations: {
          ar: {
            subject: 'عنوان بالعربية',
            bodyText: 'نص الرسالة بالعربية',
          },
        },
      },
      'ar',
      'es'
    );
    assert.equal(copy.subject, 'عنوان بالعربية');
  });

  it('masks secrets in public-safe settings while preserving stored tokens', async () => {
    const { services } = createMockStrapi({
      ...DEFAULT_BROADCAST_SETTINGS,
      telegramBotToken: 'secret_tg_token_123',
      whatsappAccessToken: 'secret_wa_token_456',
    });

    const publicSettings = await services.settings.getPublicSafeSettings();
    assert.equal(publicSettings.telegramBotToken, '••••••••');
    assert.equal(publicSettings.whatsappAccessToken, '••••••••');

    await services.settings.updateSettings({
      organizationName: 'Mezquita Central Bogotá Updated',
      telegramBotToken: '••••••••',
    });

    const fullSettings = await services.settings.getSettings();
    assert.equal(fullSettings.organizationName, 'Mezquita Central Bogotá Updated');
    assert.equal(fullSettings.telegramBotToken, 'secret_tg_token_123');
  });

  it('seeds starter campaigns, segments inbox subscribers by topic & locale, and prevents duplicate dispatches', async () => {
    const { services, collections, emittedEvents } = createMockStrapi({
      ...DEFAULT_BROADCAST_SETTINGS,
      dryRun: true,
    });

    const seededCount = await services.campaignService.seedStarterCampaigns();
    assert.equal(seededCount, 2);

    const jumuah = await services.campaignService.getCampaignBySlug(
      'jumuah-weekly-reminder'
    );
    assert.ok(jumuah);
    assert.ok(jumuah.secondaryDateLabel);

    const firstDispatch = await services.campaignService.dispatchCampaign(
      'jumuah-weekly-reminder'
    );
    // 1 Telegram channel + 2 confirmed email subscribers + 2 confirmed WhatsApp phone subscribers = 5 dispatches
    assert.equal(firstDispatch.results.length, 5);
    assert.equal(firstDispatch.campaign.status, 'sent');
    assert.equal(firstDispatch.campaign.stats?.simulatedCount, 5);

    const logs = collections[DELIVERY_LOG_UID];
    assert.equal(logs.length, 5);
    // Verify PII masking in delivery logs
    const emailLogs = logs.filter((l) => l.channel === 'email');
    assert.equal(emailLogs.length, 2);
    assert.ok(
      emailLogs.some((l) => l.recipientMasked === 'a***@mezquitabogota.org' && l.locale === 'ar')
    );
    assert.ok(
      emailLogs.some((l) => l.recipientMasked === 'm***@example.com' && l.locale === 'es')
    );

    // Second dispatch of the same campaign should be skipped as duplicate via idempotencyKey
    const secondDispatch = await services.campaignService.dispatchCampaign(
      'jumuah-weekly-reminder'
    );
    assert.equal(secondDispatch.campaign.stats?.skippedCount, 5);
    assert.equal(secondDispatch.campaign.stats?.simulatedCount, 0);
    assert.ok(emittedEvents.some((e) => e.event === 'broadcasts.campaign.sent'));
  });

  it('triggers automated omnichannel broadcasts when EventHub events fire', async () => {
    const { services } = createMockStrapi({
      ...DEFAULT_BROADCAST_SETTINGS,
      dryRun: true,
    });

    const seededRules = await services.automationService.seedStarterRules();
    assert.equal(seededRules, 2);

    const outcomes = await services.automationService.handleEventTrigger(
      'inbox.alert.published',
      {
        code: 'ramadan-1447-sighting',
        title: 'Inicio Oficial de Ramadán 1447 AH',
        message: 'Esta noche inicia el mes sagrado de Ramadán con oración de Tarawih a las 7:30 PM.',
      }
    );

    assert.equal(outcomes.length, 1);
    assert.equal(outcomes[0].ruleSlug, 'auto-alert-banner-broadcast');
    assert.equal(
      outcomes[0].campaignSlug,
      'auto-auto-alert-banner-broadcast-ramadan-1447-sighting'
    );
    // Rule channels: telegram (1) + whatsapp (2 confirmed subscribers on 'announcements') = 3
    assert.equal(outcomes[0].results.length, 3);

    const key1 = computeIdempotencyKey('camp-1', 'email', 'Test@Example.com');
    const key2 = computeIdempotencyKey('camp-1', 'email', 'test@example.com');
    assert.equal(key1, key2);
  });

  it('ensures all 10 Admin locales contain identical keys and non-empty translations', async () => {
    const locales = ['en', 'es', 'ar', 'fr', 'de', 'pt', 'it', 'tr', 'ru', 'zh'];
    const loaded: Array<{ locale: string; data: Record<string, string> }> = [];

    for (const locale of locales) {
      const mod = await import(`../admin/src/translations/${locale}.json`);
      loaded.push({ locale, data: mod.default as Record<string, string> });
    }

    const enKeys = Object.keys(loaded[0].data).sort();
    assert.ok(enKeys.length >= 3);

    for (const entry of loaded) {
      const keys = Object.keys(entry.data).sort();
      assert.deepEqual(keys, enKeys, `Locale ${entry.locale} keys mismatch`);
      for (const val of Object.values(entry.data)) {
        assert.ok(String(val).trim().length > 0);
      }
    }
  });
});
