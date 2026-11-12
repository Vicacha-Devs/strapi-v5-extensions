import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getBroadcastChannelOptions,
  getBroadcastTopicOptions,
  getWhatsAppDriverOptions,
} from "../admin/src/utils/selectOptions";
import broadcastControllerFactory from "../server/src/controllers/broadcastController";
import { sendViaSelfHostedGateway } from "../server/src/services/campaignHelpers";
import {
  DEFAULT_BROADCAST_SETTINGS,
  isValidGatewaySession,
  normalizeWhatsAppTarget,
  validateGatewayUrl,
} from "../shared";
import { createStrictMockStrapi } from "./mockStrapi";

describe("@vicacha-devs/strapi-plugin-broadcasts Round 2 regressions", () => {
  it("prevents contending dispatchCampaign calls from stealing active locks", async () => {
    const { strapi, services } = createStrictMockStrapi({
      ...DEFAULT_BROADCAST_SETTINGS,
      dryRun: true,
    });

    let notifyEnteredBarrier!: () => void;
    const enteredBarrier = new Promise<void>((resolve) => {
      notifyEnteredBarrier = resolve;
    });
    let releaseBarrier!: () => void;
    const barrier = new Promise<void>((resolve) => {
      releaseBarrier = resolve;
    });

    const origPlugin = strapi.plugin.bind(strapi);
    strapi.plugin = ((name: string) => {
      if (name === "inbox") {
        return {
          service: () => ({
            listSubscribers: async () => {
              notifyEnteredBarrier();
              await barrier;
              return [
                {
                  email: "barrier@mezquitabogota.org",
                  locale: "es",
                  topics: ["announcements"],
                  status: "confirmed",
                },
              ];
            },
          }),
        } as unknown as ReturnType<typeof origPlugin>;
      }
      return origPlugin(name);
    }) as typeof strapi.plugin;

    const cs = services.campaignService;
    const camp = await cs.createCampaign({
      slug: "lock-theft-guard",
      title: "Lock Theft Guard Campaign",
      topic: "announcements",
      channels: ["email"],
      subject: "Subject",
      bodyText: "Body text content",
    });
    const docId = String(camp.documentId);

    // Call 1 pauses inside listSubscribers while holding slug & doc locks
    const call1Promise = cs.dispatchCampaign(camp.slug);
    await enteredBarrier;

    // Call 2 via documentId contends and must reject WITHOUT deleting Call 1's locks
    await assert.rejects(
      () => cs.dispatchCampaign(docId),
      /already being dispatched/
    );

    // Call 3 (both via documentId and slug) MUST still reject while Call 1 is active
    await assert.rejects(
      () => cs.dispatchCampaign(docId),
      /already being dispatched/
    );
    await assert.rejects(
      () => cs.dispatchCampaign(camp.slug),
      /already being dispatched/
    );

    releaseBarrier();
    const call1Result = await call1Promise;
    assert.equal(call1Result.campaign.status, "sent");
    assert.equal(call1Result.results.length, 1);
  });

  it("preserves rich HTML when text is unchanged and recomputes on text updates", async () => {
    const { services } = createStrictMockStrapi({
      ...DEFAULT_BROADCAST_SETTINGS,
      dryRun: true,
    });

    const richCampHtml =
      "<h3>Salat al-Jumu’ah</h3><p>Initial <strong>plain</strong> body</p>";
    const createdCamp = await services.campaignService.createCampaign({
      slug: "recompute-html-camp",
      title: "Initial Title",
      channels: ["email"],
      priority: "urgent",
      emailTemplateRef: "401",
      subject: "Initial Subject",
      bodyText: "Initial plain body",
      bodyHtml: richCampHtml,
    });
    assert.equal(createdCamp.bodyHtml, richCampHtml);
    assert.equal(createdCamp.emailTemplateRef, "401");

    // Unchanged bodyText in PUT payload must preserve rich bodyHtml
    const metadataUpdatedCamp = await services.campaignService.updateCampaign(
      createdCamp.documentId || createdCamp.slug,
      {
        title: "Updated Metadata Title",
        channels: ["email", "telegram"],
        bodyText: "Initial plain body",
        emailTemplateRef: "",
      }
    );
    assert.equal(metadataUpdatedCamp.bodyHtml, richCampHtml);
    assert.equal(metadataUpdatedCamp.emailTemplateRef, "");
    assert.equal(metadataUpdatedCamp.priority, "urgent");

    // Modified bodyText without bodyHtml must recompute escaped <p>...</p>
    const textUpdatedCamp = await services.campaignService.updateCampaign(
      createdCamp.documentId || createdCamp.slug,
      {
        bodyText: "Updated <bodyText> & details",
      }
    );
    assert.equal(
      textUpdatedCamp.bodyHtml,
      "<p>Updated &lt;bodyText&gt; &amp; details</p>"
    );

    const richRuleHtml =
      "<h3>Urgent Alert</h3><p>Old <strong>{{summary}}</strong></p>";
    const createdRule = await services.automationService.createRule({
      slug: "recompute-html-rule",
      name: "Initial Rule",
      eventName: "event.published",
      channels: ["telegram"],
      priority: "urgent",
      subjectTemplate: "Event {{title}}",
      bodyTextTemplate: "Old {{summary}}",
      bodyHtmlTemplate: richRuleHtml,
    });
    assert.equal(createdRule.bodyHtmlTemplate, richRuleHtml);
    assert.equal(createdRule.priority, "urgent");

    // Unchanged bodyTextTemplate in PUT payload must preserve rich bodyHtmlTemplate
    const metadataUpdatedRule = await services.automationService.updateRule(
      createdRule.documentId || createdRule.slug,
      {
        name: "Renamed Rule",
        channels: ["telegram", "email"],
        priority: createdRule.priority,
        bodyTextTemplate: "Old {{summary}}",
      }
    );
    assert.equal(metadataUpdatedRule.bodyHtmlTemplate, richRuleHtml);
    assert.equal(metadataUpdatedRule.priority, "urgent");

    // Modified bodyTextTemplate without bodyHtmlTemplate must recompute escaped <p>...</p>
    const textUpdatedRule = await services.automationService.updateRule(
      createdRule.documentId || createdRule.slug,
      {
        bodyTextTemplate: "New {{summary}} & <tag>",
      }
    );
    assert.equal(
      textUpdatedRule.bodyHtmlTemplate,
      "<p>New {{summary}} &amp; &lt;tag&gt;</p>"
    );
  });

  it("sanitizes sendCampaign options, validates whatsappGatewaySession, and blocks 6to4 SSRF", async () => {
    assert.equal(isValidGatewaySession("default"), true);
    assert.equal(isValidGatewaySession("mezquita_bogota-01"), true);
    assert.equal(isValidGatewaySession(".."), false);
    assert.equal(isValidGatewaySession("../admin"), false);
    assert.equal(isValidGatewaySession("bad session"), false);

    assert.equal(
      validateGatewayUrl("https://[2002:7f00:0001::1]/api").valid,
      false
    );
    assert.equal(
      validateGatewayUrl("https://[2002:a9fe:a9fe::1]/api").valid,
      false
    );
    assert.equal(
      validateGatewayUrl("https://[2002:0a00:0001::1]/api").valid,
      false
    );

    const { strapi, services } = createStrictMockStrapi({
      ...DEFAULT_BROADCAST_SETTINGS,
      dryRun: true,
    });

    await assert.rejects(
      () =>
        services.settings.updateSettings({
          whatsappGatewaySession: "../traversal",
        }),
      /whatsappGatewaySession/
    );

    await assert.rejects(
      () =>
        sendViaSelfHostedGateway(
          "evolution",
          {
            ...DEFAULT_BROADCAST_SETTINGS,
            whatsappGatewayUrl: "https://wa.mezquitabogota.org",
            whatsappGatewaySession: "..",
          },
          normalizeWhatsAppTarget("+573101234567"),
          "Hello"
        ),
      /Invalid WhatsApp gateway session identifier/
    );

    const camp = await services.campaignService.createCampaign({
      slug: "malformed-body-send",
      title: "Malformed Send Options",
      channels: ["email"],
      subject: "Subject",
      bodyText: "Safe body content",
    });

    const controller = broadcastControllerFactory({ strapi });
    const ctx1 = {
      params: { documentId: camp.documentId },
      request: {
        body: {
          customRecipients: [null, 42, "invalid"],
          testRecipientEmail: { nested: "bad" },
        },
      },
      body: undefined as unknown,
      status: undefined as number | undefined,
    };
    await controller.sendCampaign(ctx1);
    const res1 = (ctx1.body as { data: { campaign: { status: string } } }).data;
    assert.equal(res1.campaign.status, "sent");

    // Localize select option helpers check
    const topicLabels = getBroadcastTopicOptions((id) => `tr:${id}`);
    const channelLabels = getBroadcastChannelOptions((id) => `tr:${id}`);
    const driverLabels = getWhatsAppDriverOptions((id) => `tr:${id}`);
    assert.ok(topicLabels.every((o) => o.label.startsWith("tr:option.topic.")));
    assert.ok(
      channelLabels.every((o) => o.label.startsWith("tr:option.channel."))
    );
    assert.ok(
      driverLabels.every((o) => o.label.startsWith("tr:option.driver."))
    );
  });
});
