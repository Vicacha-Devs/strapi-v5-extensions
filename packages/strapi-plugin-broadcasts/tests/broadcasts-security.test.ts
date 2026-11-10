import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_BROADCAST_SETTINGS,
  DELIVERY_LOG_UID,
  validateGatewayUrl,
} from "../shared";
import { createStrictMockStrapi } from "./mockStrapi";

describe("@vicacha-devs/strapi-plugin-broadcasts security & concurrency", () => {
  it("upserts failed delivery-log rows by unique idempotencyKey and redacts leaked secrets", async () => {
    let shouldFail = true;
    const sentPayloads: Array<Record<string, unknown>> = [];
    const tgSecret = "99887766:SecretBotToken_XYZ123456";
    const waSecret = "EAAG_SuperSecretMetaToken_987654";

    const { services, collections } = createStrictMockStrapi(
      {
        ...DEFAULT_BROADCAST_SETTINGS,
        dryRun: false,
        enableEmailDesignerBridge: false,
        telegramBotToken: tgSecret,
        whatsappAccessToken: waSecret,
        emailFromAddress: "sender@mezquitabogota.org\r\nBcc:evil@attacker.org",
        emailReplyToAddress: "reply@mezquitabogota.org<evil>",
      },
      async (opts) => {
        if (shouldFail) {
          throw new Error(
            `Upstream error with ${waSecret} and https://api.telegram.org/bot${tgSecret}/sendMessage`
          );
        }
        sentPayloads.push(opts);
      }
    );

    const firstAttempt = await services.transportService.sendEmailBroadcast({
      campaignSlug: "retry-safe-camp",
      recipientEmail: "karim@mezquitabogota.org",
      locale: "es",
      subject: "Aviso\r\nX-Injected: yes <tag>",
      text: "Cuerpo <seguro> & limpio",
      unsubscribeUrl:
        "https://mezquitabogota.org/unsub?t=1>\r\nBcc:evil@attacker.org",
    });

    assert.equal(firstAttempt.status, "failed");
    assert.ok(!firstAttempt.errorMessage?.includes(tgSecret));
    assert.ok(!firstAttempt.errorMessage?.includes(waSecret));
    assert.ok(firstAttempt.errorMessage?.includes("[REDACTED]"));
    assert.equal(collections[DELIVERY_LOG_UID].length, 1);

    shouldFail = false;
    const secondAttempt = await services.transportService.sendEmailBroadcast({
      campaignSlug: "retry-safe-camp",
      recipientEmail: "karim@mezquitabogota.org",
      locale: "es",
      subject: "Aviso\r\nX-Injected: yes <tag>",
      text: "Cuerpo <seguro> & limpio",
      unsubscribeUrl: "https://mezquitabogota.org/unsub?t=1",
    });

    assert.equal(secondAttempt.status, "sent");
    assert.equal(collections[DELIVERY_LOG_UID].length, 1);
    assert.equal(collections[DELIVERY_LOG_UID][0].status, "sent");

    assert.equal(sentPayloads.length, 1);
    assert.ok(!String(sentPayloads[0].subject).includes("\r"));
    assert.ok(!String(sentPayloads[0].subject).includes("<"));
    assert.ok(!String(sentPayloads[0].from).includes("\n"));
    assert.ok(!String(sentPayloads[0].replyTo).includes("<"));
    assert.equal(
      sentPayloads[0].html,
      "<p>Cuerpo &lt;seguro&gt; &amp; limpio</p>"
    );
  });

  it("deduplicates concurrent dispatchCampaign calls, blocks mass-assignment, and isolates test dispatches", async () => {
    const { services, emittedEvents } = createStrictMockStrapi({
      ...DEFAULT_BROADCAST_SETTINGS,
      dryRun: true,
    });
    const cs = services.campaignService;

    await assert.rejects(
      () =>
        cs.createCampaign({
          slug: "forged-sent",
          title: "Forged Sent Campaign",
          channels: ["email"],
          status: "sent",
          subject: "Forged",
          bodyText: "Attempting status mass assignment",
        }),
      /draft|scheduled/
    );

    const camp = await cs.createCampaign({
      slug: "concurrent-test-camp",
      title: "Concurrent Lock Test",
      topic: "announcements",
      channels: ["email", "telegram"],
      subject: "Subject Line",
      bodyText: "Hello {{recipientName}} <safe> & clean",
    });

    await assert.rejects(
      () => cs.updateCampaign(camp.documentId || camp.slug, { status: "sent" }),
      /Invalid campaign status transition/
    );

    const testRun = await cs.dispatchCampaign(camp.slug, {
      testRecipientEmail: "subscriber@mezquitabogota.org",
    });
    assert.equal(testRun.campaign.status, "draft");
    assert.equal(testRun.campaign.sentAt, undefined);
    assert.equal(testRun.results.length, 1);
    assert.ok(testRun.results[0].idempotencyKey.startsWith("test:"));
    assert.equal(emittedEvents.length, 0);
    assert.equal((await cs.listPublicArchive()).length, 0);

    const [r1, r2] = await Promise.allSettled([
      cs.dispatchCampaign(camp.slug),
      cs.dispatchCampaign(camp.documentId || camp.slug),
    ]);
    const fulfilled = [r1, r2].filter((r) => r.status === "fulfilled");
    const rejected = [r1, r2].filter((r) => r.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);

    await cs.createCampaign({
      slug: "cancelled-camp",
      title: "Cancelled Campaign",
      channels: ["email"],
      subject: "Cancelled",
      bodyText: "Should not dispatch",
    });
    await cs.updateCampaign("cancelled-camp", { status: "cancelled" });
    await assert.rejects(
      () => cs.dispatchCampaign("cancelled-camp"),
      /cancelled/
    );
  });

  it("blocks IPv4, IPv6, mapped-IPv6, https-localhost, and query/credential SSRF vectors", async () => {
    const blockedUrls = [
      "https://0.0.0.0/api",
      "https://127.0.0.1/api",
      "https://127.0.0.2/api",
      "https://10.0.0.5/api",
      "https://172.16.0.1/api",
      "https://172.31.255.254/api",
      "https://192.168.1.10/api",
      "https://100.64.0.1/api",
      "https://100.127.255.254/api",
      "https://169.254.169.254/latest/meta-data",
      "https://localhost:8443/api",
      "https://evil.localhost/api",
      "https://[::]/api",
      "https://[::1]/api",
      "https://[fc00::1]/api",
      "https://[fd12:3456::1]/api",
      "https://[fe80::1]/api",
      "https://[::ffff:127.0.0.1]/api",
      "https://[::ffff:7f00:1]/api",
      "https://[::ffff:169.254.169.254]/api",
      "https://[0:0:0:0:0:ffff:a9fe:a9fe]/api",
      "https://user:pass@wa.mezquitabogota.org/api",
      "https://wa.mezquitabogota.org/api?redirect=http://127.0.0.1",
      "https://wa.mezquitabogota.org/api#frag",
      "https://wa.mezquitabogota.org\\@127.0.0.1",
    ];

    for (const url of blockedUrls) {
      assert.equal(
        validateGatewayUrl(url).valid,
        false,
        `Expected SSRF rejection for ${url}`
      );
    }

    assert.equal(
      validateGatewayUrl("http://[::1]:3000", { allowLocalhost: true }).valid,
      true
    );
    assert.equal(
      validateGatewayUrl("http://127.0.0.2:3000", { allowLocalhost: true })
        .valid,
      false
    );
    assert.equal(
      validateGatewayUrl("https://[::ffff:127.0.0.1]", {
        allowLocalhost: true,
      }).valid,
      false
    );

    const { services } = createStrictMockStrapi({
      ...DEFAULT_BROADCAST_SETTINGS,
      allowLocalhostGateways: true,
      whatsappGatewayUrl: "http://localhost:3000",
    });
    await assert.rejects(
      () => services.settings.updateSettings({ allowLocalhostGateways: false }),
      /Localhost|HTTPS/
    );
  });
});
