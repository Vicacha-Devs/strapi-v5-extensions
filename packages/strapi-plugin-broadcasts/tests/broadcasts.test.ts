import assert from "node:assert/strict";
import { describe, it } from "node:test";

import automationServiceFactory from "../server/src/services/automationService";
import campaignServiceFactory from "../server/src/services/campaignService";
import { computeIdempotencyKey } from "../server/src/services/idempotency";
import settingsServiceFactory from "../server/src/services/settings";
import transportServiceFactory from "../server/src/services/transportService";
import {
  AUTOMATION_RULE_UID,
  CAMPAIGN_UID,
  DEFAULT_BROADCAST_SETTINGS,
  DELIVERY_LOG_UID,
  escapeHtml,
  interpolateBroadcastTemplate,
  isWhatsAppGroupOrChannelJid,
  maskEmail,
  maskPhone,
  maskRecipientIdentifier,
  normalizeE164Phone,
  normalizeWhatsAppTarget,
  resolveLocalizedCampaignCopy,
  validateAutomationRuleInput,
  validateCampaignInput,
  validateGatewayUrl,
  type BroadcastSettings,
} from "../shared";

const makeSub = (
  email: string,
  phone: string,
  fullName: string,
  locale: string,
  topics: string[],
  status = "confirmed",
  unsubscribeToken?: string
) => ({ email, phone, fullName, locale, topics, status, unsubscribeToken });

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
    makeSub(
      "ahmad@mezquitabogota.org",
      "3101234567",
      "Ahmad Al-Mansoor",
      "ar",
      ["announcements", "urgent_janazah", "events"],
      "confirmed",
      "tok_ahmad_123"
    ),
    makeSub(
      "maria@example.com",
      "+573159876543",
      "María Rodríguez",
      "es",
      ["announcements", "courses"],
      "confirmed",
      "tok_maria_456"
    ),
    makeSub(
      "pending@example.com",
      "+573001112233",
      "Pending User",
      "en",
      ["announcements"],
      "pending"
    ),
  ];
  const services: Record<string, unknown> = {};
  const strapi: Record<string, unknown> = {
    config: {
      get: (_k: string, def?: unknown) => ({
        ...(def as Record<string, unknown>),
        ...customConfig,
      }),
    },
    log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
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
      findMany: async (p?: { filters?: Record<string, unknown> }) =>
        (collections[uid] || []).filter((item) =>
          Object.entries(p?.filters || {}).every(([k, v]) =>
            v && typeof v === "object" && "$in" in v
              ? ((v as { $in: unknown[] }).$in || []).includes(item[k])
              : item[k] === v
          )
        ),
      findOne: async ({ documentId }: { documentId: string }) =>
        (collections[uid] || []).find((i) => i.documentId === documentId) ??
        null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const doc = { ...data, documentId: `doc_${idCounter++}` };
        if (!collections[uid]) {
          collections[uid] = [];
        }
        collections[uid].push(doc);
        return doc;
      },
      update: async (p: {
        documentId: string;
        data: Record<string, unknown>;
      }) => {
        const list = collections[uid] || [];
        const idx = list.findIndex((i) => i.documentId === p.documentId);
        if (idx === -1) {
          return null;
        }
        list[idx] = { ...list[idx], ...p.data };
        return list[idx];
      },
    }),
    plugin: (name: string) =>
      name === "inbox"
        ? {
            service: () => ({
              listSubscribers: async (p?: {
                status?: string;
                topic?: string;
              }) =>
                mockSubscribers.filter(
                  (s) =>
                    (!p?.status || s.status === p.status) &&
                    (!p?.topic || s.topics.includes(p.topic))
                ),
            }),
          }
        : { service: (svcName: string) => services[svcName] },
  };
  const s = strapi as unknown as Parameters<
    typeof settingsServiceFactory
  >[0]["strapi"];
  const typedServices = {
    settings: settingsServiceFactory({ strapi: s }),
    transportService: transportServiceFactory({ strapi: s }),
    campaignService: campaignServiceFactory({ strapi: s }),
    automationService: automationServiceFactory({ strapi: s }),
  };
  Object.assign(services, typedServices);
  return { strapi: s, services: typedServices, collections, emittedEvents };
}

describe("@vicacha-devs/strapi-plugin-broadcasts", () => {
  it("escapes HTML entities in interpolated templates and masks PII", () => {
    const rawHtml = "<p>As-salamu alaykum {{recipientName}}</p>";
    const rendered = interpolateBroadcastTemplate(
      rawHtml,
      { recipientName: '<script>alert("xss")</script>' },
      { escapeHtmlValues: true }
    );
    assert.equal(
      rendered,
      "<p>As-salamu alaykum &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>"
    );
    assert.equal(
      escapeHtml("O'Connor & <Sons>"),
      "O&#39;Connor &amp; &lt;Sons&gt;"
    );

    assert.equal(
      maskEmail("ahmad@mezquitabogota.org"),
      "a***@mezquitabogota.org"
    );
    assert.equal(normalizeE164Phone("3101234567", "57"), "+573101234567");
    assert.equal(maskPhone("3101234567"), "+57***4567");
    assert.equal(
      maskRecipientIdentifier("@MezquitaCentralBogota"),
      "@MezquitaCentralBogota"
    );
  });

  it("enforces SSRF protection and HTTPS on gateway URLs", () => {
    for (const invalidUrl of [
      "https://169.254.169.254/latest/meta-data",
      "http://gateway.example.com/api",
      "http://localhost:3000/api",
    ]) {
      assert.equal(validateGatewayUrl(invalidUrl).valid, false);
    }
    assert.equal(
      validateGatewayUrl("http://localhost:3000/api", { allowLocalhost: true })
        .valid,
      true
    );
    assert.equal(
      validateGatewayUrl("https://wa-gateway.mezquitabogota.org").valid,
      true
    );
  });

  it("validates campaign and automation rule inputs and resolves localized copy", () => {
    const invalidCamp = validateCampaignInput({
      slug: "Invalid Slug!",
      title: "Hi",
      subject: "No",
      bodyText: "123",
      channels: [],
    });
    assert.equal(invalidCamp.valid, false);
    assert.ok(invalidCamp.errors.length >= 4);

    const validRule = validateAutomationRuleInput({
      slug: "alert-rule",
      name: "Urgent Alert Rule",
      eventName: "inbox.alert.published",
      subjectTemplate: "🚨 {{title}}",
      bodyTextTemplate: "{{message}}",
    });
    assert.equal(validRule.valid, true);

    const copy = resolveLocalizedCampaignCopy(
      {
        subject: "Default Subject",
        bodyText: "Default Body",
        translations: {
          ar: { subject: "عنوان بالعربية", bodyText: "نص الرسالة بالعربية" },
        },
      },
      "ar",
      "es"
    );
    assert.equal(copy.subject, "عنوان بالعربية");
  });

  it("masks secrets in public-safe settings while preserving stored tokens", async () => {
    const { services } = createMockStrapi({
      ...DEFAULT_BROADCAST_SETTINGS,
      telegramBotToken: "secret_tg_token_123",
      whatsappAccessToken: "secret_wa_token_456",
    });

    const publicSettings = await services.settings.getPublicSafeSettings();
    assert.equal(publicSettings.telegramBotToken, "••••••••");
    assert.equal(publicSettings.whatsappAccessToken, "••••••••");

    await services.settings.updateSettings({
      organizationName: "Mezquita Central Bogotá Updated",
      telegramBotToken: "••••••••",
    });

    const fullSettings = await services.settings.getSettings();
    assert.equal(
      fullSettings.organizationName,
      "Mezquita Central Bogotá Updated"
    );
    assert.equal(fullSettings.telegramBotToken, "secret_tg_token_123");
  });

  it("seeds starter campaigns, segments inbox subscribers by topic & locale, and prevents duplicate dispatches", async () => {
    const { services, collections, emittedEvents } = createMockStrapi({
      ...DEFAULT_BROADCAST_SETTINGS,
      dryRun: true,
    });
    const cs = services.campaignService;

    assert.equal(await cs.seedStarterCampaigns(), 2);

    const slug = "jumuah-weekly-reminder";
    const jumuah = await cs.getCampaignBySlug(slug);
    assert.ok(jumuah && jumuah.secondaryDateLabel);

    const newTitle = "Recordatorio Semanal de Jumu’ah (Actualizado)";
    const updatedJumuah = await cs.updateCampaign(jumuah.documentId || slug, {
      title: newTitle,
    });
    assert.equal(updatedJumuah.title, newTitle);

    const firstDispatch = await cs.dispatchCampaign(slug);
    // 1 Telegram channel + 2 confirmed email subscribers + 2 confirmed WhatsApp phone subscribers = 5 dispatches
    assert.equal(firstDispatch.results.length, 5);
    assert.equal(firstDispatch.campaign.status, "sent");
    assert.equal(firstDispatch.campaign.stats?.simulatedCount, 5);

    const logs = collections[DELIVERY_LOG_UID];
    assert.equal(logs.length, 5);
    // Verify PII masking in delivery logs
    const emailLogs = logs.filter((l) => l.channel === "email");
    assert.equal(emailLogs.length, 2);
    assert.ok(
      emailLogs.some(
        (l) =>
          l.recipientMasked === "a***@mezquitabogota.org" && l.locale === "ar"
      )
    );
    assert.ok(
      emailLogs.some(
        (l) => l.recipientMasked === "m***@example.com" && l.locale === "es"
      )
    );

    // Second dispatch of the same campaign should be skipped as duplicate via idempotencyKey
    const secondDispatch = await cs.dispatchCampaign(slug);
    assert.equal(secondDispatch.campaign.stats?.skippedCount, 5);
    assert.equal(secondDispatch.campaign.stats?.simulatedCount, 0);
    assert.ok(
      emittedEvents.some((e) => e.event === "broadcasts.campaign.sent")
    );
  });

  it("triggers automated omnichannel broadcasts when EventHub events fire", async () => {
    const { services } = createMockStrapi({
      ...DEFAULT_BROADCAST_SETTINGS,
      dryRun: true,
    });
    const auto = services.automationService;

    assert.equal(await auto.seedStarterRules(), 2);

    const toggledRule = await auto.updateRule(
      "auto-event-published-broadcast",
      { active: false }
    );
    assert.equal(toggledRule.active, false);

    const outcomes = await auto.handleEventTrigger("inbox.alert.published", {
      code: "ramadan-1447-sighting",
      title: "Inicio Oficial de Ramadán 1447 AH",
      message:
        "Esta noche inicia el mes sagrado de Ramadán con oración de Tarawih a las 7:30 PM.",
    });

    assert.equal(outcomes.length, 1);
    assert.equal(outcomes[0].ruleSlug, "auto-alert-banner-broadcast");
    const slugPrefix =
      "auto-auto-alert-banner-broadcast-ramadan-1447-sighting-";
    assert.ok(outcomes[0].campaignSlug.startsWith(slugPrefix));
    assert.ok(/^[a-z0-9-]+$/.test(outcomes[0].campaignSlug));
    // Rule channels: telegram (1) + whatsapp (2 confirmed subscribers on 'announcements') = 3
    assert.equal(outcomes[0].results.length, 3);

    const key1 = computeIdempotencyKey("camp-1", "email", "Test@Example.com");
    const key2 = computeIdempotencyKey("camp-1", "email", "test@example.com");
    assert.equal(key1, key2);
  });

  it("ensures all 10 Admin locales contain identical keys and non-empty translations", async () => {
    const locales = "en,es,ar,fr,de,pt,it,tr,ru,zh".split(",");
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

  it("discovers Email Designer 5 templates, resolves localized variants, and renders HTML email broadcasts", async () => {
    const { services, collections } = createMockStrapi({
      ...DEFAULT_BROADCAST_SETTINGS,
      dryRun: true,
      enableEmailDesignerBridge: true,
    });

    collections["plugin::email-designer-5.email-designer-template"] = [
      {
        templateReferenceId: 401,
        name: "broadcastNewsletter_es",
        subject: "🕌 {{subject}}",
        bodyHtml:
          "<div><h1>{{subject}}</h1>{{bodyHtml}}<footer>{{secondaryDate}}</footer></div>",
      },
      {
        templateReferenceId: 403,
        name: "broadcastNewsletter_ar",
        subject: "🕌 {{subject}}",
        bodyHtml: '<div dir="rtl"><h1>{{subject}}</h1>{{bodyHtml}}</div>',
      },
    ];

    const templates =
      await services.transportService.listEmailDesignerTemplates();
    assert.equal(templates.length, 2);
    assert.equal(templates[0].templateReferenceId, 401);

    // Resolving "401" for an Arabic ("ar") recipient automatically resolves sibling "broadcastNewsletter_ar" (403)
    const resolvedAr =
      await services.transportService.resolveEmailDesignerTemplate("401", "ar");
    assert.equal(resolvedAr?.templateReferenceId, 403);

    const camp = await services.campaignService.createCampaign({
      slug: "ed5-newsletter-test",
      title: "Boletín con Email Designer 5",
      topic: "announcements",
      channels: ["email"],
      emailTemplateRef: "401",
      subject: "Boletín Comunitario",
      bodyText: "Contenido del boletín para {{recipientName}}.",
    });
    assert.equal(camp.emailTemplateRef, "401");

    const dispatched = await services.campaignService.dispatchCampaign(
      "ed5-newsletter-test"
    );
    assert.equal(dispatched.results.length, 2);
    assert.ok(
      dispatched.results.every((r) => r.driver === "email-designer-5-dryrun")
    );
  });

  it("normalizes and dispatches to WhatsApp Groups (@g.us), WhatsApp Channels (@newsletter), and Telegram Groups", async () => {
    const groupJid = "120363025891234567@g.us";
    const channelJid = "120363099999999999@newsletter";
    assert.equal(isWhatsAppGroupOrChannelJid(groupJid), true);
    assert.equal(isWhatsAppGroupOrChannelJid(channelJid), true);
    assert.equal(isWhatsAppGroupOrChannelJid("+573101234567"), false);

    const groupTarget = normalizeWhatsAppTarget(groupJid, "57");
    assert.equal(groupTarget.isGroupOrChannel, true);
    assert.equal(groupTarget.evolutionNumber, groupJid);
    assert.equal(groupTarget.chatId, groupJid);

    const phoneTarget = normalizeWhatsAppTarget("3101234567", "57");
    assert.equal(phoneTarget.isGroupOrChannel, false);
    assert.equal(phoneTarget.normalized, "+573101234567");
    assert.equal(phoneTarget.evolutionNumber, "573101234567");
    assert.equal(phoneTarget.chatId, "573101234567@c.us");

    assert.equal(maskRecipientIdentifier(groupJid), groupJid);
    assert.equal(maskRecipientIdentifier("-1001234567890"), "-1001234567890");

    const { services } = createMockStrapi({
      ...DEFAULT_BROADCAST_SETTINGS,
      dryRun: true,
      whatsappDriver: "evolution",
      whatsappDefaultRecipients: ["120363011111111111@g.us"],
      whatsappTopicGroupMap: {
        urgent_janazah: ["120363022222222222@g.us", channelJid],
      },
      telegramTopicChatMap: {
        urgent_janazah: ["@MezquitaCentralBogota", "-1009876543210"],
      },
    });

    await services.campaignService.createCampaign({
      slug: "janazah-group-broadcast",
      title: "Aviso Janazah en Grupos",
      topic: "urgent_janazah",
      channels: ["telegram", "whatsapp"],
      whatsappGroupIds: ["120363033333333333@g.us"],
      subject: "Salat al-Janazah",
      bodyText: "Oración funeraria hoy después de Dhuhr.",
    });

    const dispatched = await services.campaignService.dispatchCampaign(
      "janazah-group-broadcast"
    );
    const recipientsFor = (ch: string) =>
      dispatched.results
        .filter((r) => r.channel === ch)
        .map((r) => r.recipientMasked);
    const waRecipients = recipientsFor("whatsapp");

    assert.deepEqual(recipientsFor("telegram"), [
      "@MezquitaCentralBogota",
      "-1009876543210",
    ]);
    // 1 subscriber on urgent_janazah (+57***4567) + 1 default group + 2 topic groups/channels + 1 campaign group = 5
    assert.equal(waRecipients.length, 5);
    assert.ok(
      [
        "+57***4567",
        "120363011111111111@g.us",
        "120363022222222222@g.us",
        channelJid,
        "120363033333333333@g.us",
      ].every((id) => waRecipients.includes(id))
    );
  });
});
