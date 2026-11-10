import assert from "node:assert/strict";
import { describe, it } from "node:test";

import adminPlugin, {
  SUPPORTED_ADMIN_LOCALES,
  pluginPermissions,
} from "../admin/src/index";
import bootstrap from "../server/src/bootstrap";
import broadcastControllerFactory from "../server/src/controllers/broadcastController";
import destroy from "../server/src/destroy";
import register from "../server/src/register";
import adminRoutes from "../server/src/routes/admin";
import {
  buildTelegramRequestPayload,
  executeTelegramHttpSend,
} from "../server/src/services/campaignHelpers";
import {
  DEFAULT_BROADCAST_SETTINGS,
  sanitizeTelegramHtml,
  validateAutomationRuleInput,
  validateCampaignInput,
} from "../shared";
import { createStrictMockStrapi } from "./mockStrapi";

describe("@vicacha-devs/strapi-plugin-broadcasts hardening, RBAC & i18n", () => {
  it("sanitizes Telegram HTML (<p>/<h3>/&/<) and validates bot token format", async () => {
    const dirtyHtml =
      '<script>alert(1)</script><p>Nuevo evento en <strong>Mezquita</strong>:</p><h3> Charla &amp; Q&A </h3><p>5 < 10 & 20 > 15 <a href="javascript:alert(1)">bad</a> <a href="https://mezquitabogota.org">ok</a></p>';
    const clean = sanitizeTelegramHtml(dirtyHtml);

    assert.ok(!clean.includes("<p>"));
    assert.ok(!clean.includes("<h3>"));
    assert.ok(!clean.includes("<script>"));
    assert.ok(!clean.includes("javascript:"));
    assert.ok(clean.includes("<b> Charla &amp; Q&amp;A </b>"));
    assert.ok(clean.includes("5 &lt; 10 &amp; 20 &gt; 15"));
    assert.ok(clean.includes('<a href="https://mezquitabogota.org/">ok</a>'));

    const tgPayload = buildTelegramRequestPayload(
      {
        campaignSlug: "tg-test",
        chatId: "@MezquitaCentralBogota",
        locale: "es",
        subject: "Horario <Especial> & Avisos",
        htmlBody: "<p>Bienvenidos</p>",
        ctaLabel: "Abrir",
        ctaUrl: "javascript:alert(1)",
      },
      "@MezquitaCentralBogota"
    );
    assert.equal(
      tgPayload.text,
      "<b>Horario &lt;Especial&gt; &amp; Avisos</b>\n\nBienvenidos"
    );
    assert.equal(tgPayload.reply_markup, undefined);

    await assert.rejects(
      () =>
        executeTelegramHttpSend(
          {
            campaignSlug: "tg-test",
            chatId: "@MezquitaCentralBogota",
            locale: "es",
            subject: "Hi",
            htmlBody: "Body",
          },
          "@MezquitaCentralBogota",
          "invalid_token_with/slash"
        ),
      /Invalid Telegram bot token format/
    );
  });

  it("generates unique EventHub auto-slugs, blocks broadcasts.* loops, and cleans up listeners on destroy", async () => {
    assert.equal(
      validateAutomationRuleInput({
        slug: "loop-rule",
        name: "Loop Rule",
        eventName: "broadcasts.campaign.sent",
        subjectTemplate: "Hi",
        bodyTextTemplate: "Body",
      }).valid,
      false
    );
    assert.equal(
      validateAutomationRuleInput({
        slug: "bad-cta",
        name: "Bad CTA Rule",
        eventName: "event.published",
        channels: [],
        ctaUrlTemplate: "javascript:alert(1)",
        subjectTemplate: "Hi",
        bodyTextTemplate: "Body",
      }).valid,
      false
    );
    assert.equal(
      validateCampaignInput({
        slug: "bad-tr-cta",
        title: "Campaign Title",
        subject: "Subject",
        bodyText: "Valid body text",
        channels: ["email"],
        translations: {
          en: {
            subject: "Sub",
            bodyText: "Body",
            ctaUrl: "javascript:alert(1)",
          },
        },
      }).valid,
      false
    );

    const { strapi, services, listeners } = createStrictMockStrapi({
      ...DEFAULT_BROADCAST_SETTINGS,
      dryRun: true,
    });

    await bootstrap({ strapi });
    await services.automationService.createRule({
      slug: "custom-course-rule",
      name: "Custom Course Published",
      eventName: "course.published",
      topic: "announcements",
      channels: ["telegram"],
      subjectTemplate: "Curso {{title}}",
      bodyTextTemplate: "Resumen: {{summary}}",
    });
    assert.ok((listeners.get("course.published")?.size || 0) > 0);

    const run1 = await services.automationService.handleEventTrigger(
      "course.published",
      { title: "Árabe Nivel 1" }
    );
    const run2 = await services.automationService.handleEventTrigger(
      "course.published",
      { title: "Árabe Nivel 1" }
    );
    assert.equal(run1.length, 1);
    assert.equal(run2.length, 1);
    assert.notEqual(run1[0].campaignSlug, run2[0].campaignSlug);

    const loop1 = await services.automationService.handleEventTrigger(
      "broadcasts.campaign.sent",
      { title: "Ignored" }
    );
    const loop2 = await services.automationService.handleEventTrigger(
      "course.published",
      { model: "plugin::broadcasts.campaign", title: "Ignored" }
    );
    assert.equal(loop1.length, 0);
    assert.equal(loop2.length, 0);

    destroy({ strapi });
    for (const set of listeners.values()) {
      assert.equal(set.size, 0);
    }
  });

  it("enforces settings key whitelist, query sanitization, RBAC policies, and registerTrads across 10 locales", async () => {
    const { strapi, services } = createStrictMockStrapi({
      ...DEFAULT_BROADCAST_SETTINGS,
      telegramBotToken: "123456:RealStoredToken_ABC",
    });

    register({ strapi });
    const updated = await services.settings.updateSettings({
      organizationName: "Mezquita Segura",
      telegramBotToken: "****",
      ...JSON.parse('{"__proto__":{"polluted":true},"rogueField":"blocked"}'),
    });
    assert.equal(updated.telegramBotToken, "123456:RealStoredToken_ABC");
    assert.equal((updated as Record<string, unknown>).rogueField, undefined);
    assert.equal(({} as Record<string, unknown>).polluted, undefined);

    const controller = broadcastControllerFactory({ strapi });
    let badReqMsg = "";
    let notFoundMsg = "";
    await controller.updateCampaign({
      params: { documentId: "non-existent-id" },
      request: { body: { title: "Valid Title" } },
      notFound: (msg) => {
        notFoundMsg = msg;
      },
    });
    assert.match(notFoundMsg, /not found/i);

    await controller.createCampaign({
      request: { body: { slug: "BAD SLUG!" } },
      badRequest: (msg) => {
        badReqMsg = msg;
      },
    });
    assert.ok(badReqMsg.length > 0);

    const archiveCtx = {
      query: { topic: { $ne: "announcements" }, limit: "9999" },
      request: {},
      body: undefined as unknown,
    };
    await controller.listPublicArchive(archiveCtx);
    assert.ok(Array.isArray((archiveCtx.body as { data: unknown[] }).data));

    assert.equal(adminRoutes.routes.length, 13);
    for (const route of adminRoutes.routes) {
      const policies = route.config.policies;
      assert.equal(policies[0], "admin::isAuthenticatedAdmin");
      const permPolicy = policies[1] as {
        name: string;
        config: { actions: string[] };
      };
      assert.equal(permPolicy.name, "admin::hasPermissions");
      assert.ok(permPolicy.config.actions.length >= 1);
    }

    let menuPerms: unknown[] = [];
    let settingsPerms: unknown[] = [];
    adminPlugin.register({
      addMenuLink: (link) => {
        menuPerms = link.permissions as unknown[];
      },
      addSettingsLink: (_sec, link) => {
        settingsPerms = link.permissions as unknown[];
      },
      createSettingSection: () => {},
      registerPlugin: () => {},
    });
    assert.equal(menuPerms.length, pluginPermissions.main.length);
    assert.equal(settingsPerms.length, pluginPermissions.settings.length);

    const trads = await adminPlugin.registerTrads();
    assert.equal(trads.length, SUPPORTED_ADMIN_LOCALES.length);
    for (const entry of trads) {
      assert.ok(entry.data["broadcasts.plugin.name"]);
      assert.ok(
        entry.data[
          "content-manager.content-types.plugin::broadcasts.campaign.whatsappGroupIds"
        ]
      );
      assert.ok(
        entry.data[
          "content-manager.content-types.plugin::broadcasts.campaign.telegramChatId"
        ]
      );
      assert.ok(
        entry.data[
          "content-manager.content-types.plugin::broadcasts.delivery-log.locale"
        ]
      );
      for (const [k, val] of Object.entries(entry.data)) {
        assert.ok(
          !/(?<!')\{\{[^{}]+\}\}(?!')/.test(val),
          `Unescaped ICU double-brace in ${entry.locale}:${k}`
        );
      }
    }
  });
});
