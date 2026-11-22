import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { executeWhatsAppHttpSend } from "../server/src/services/campaignHelpers";
import { normalizeWhatsAppTarget } from "../shared";
import type { BroadcastSettings } from "../shared";

function makeBaseSettings(
  overrides: Partial<BroadcastSettings> = {}
): BroadcastSettings {
  return {
    organizationName: "Central Mosque",
    defaultLocale: "es",
    dryRun: false,
    emailEnabled: false,
    emailFromAddress: "no-reply@example.org",
    emailReplyToAddress: "info@example.org",
    telegramEnabled: false,
    telegramBotToken: "",
    telegramDefaultChatId: "",
    telegramTopicChatMap: {},
    telegramTopicThreadMap: {},
    whatsappEnabled: true,
    whatsappDriver: "openwa",
    whatsappPhoneNumberId: "",
    whatsappAccessToken: "",
    whatsappGatewayUrl: "https://wa.ops.example.org/",
    whatsappGatewaySession: "mosque",
    whatsappGatewayApiKey: "owa_k1_test_key",
    whatsappDefaultRecipients: [],
    whatsappTopicGroupMap: {},
    allowLocalhostGateways: false,
    publicChannelLinks: [],
    secondaryCalendars: [],
    ...overrides,
  };
}

describe("strapi-plugin-broadcasts — rmyndharis/OpenWA gateway driver", () => {
  it("dispatches to /api/sessions/{session}/messages/send-text with X-API-Key and chatId", async () => {
    const originalFetch = globalThis.fetch;
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify({ id: "owa_msg_1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const target = normalizeWhatsAppTarget("+57 310 555 0199");
      const msgId = await executeWhatsAppHttpSend(
        "openwa",
        {
          campaignSlug: "jumuah-test",
          locale: "es",
          textBody: "As-salamu alaykum — Jumuah a las 12:15 PM",
          recipientPhone: "+57 310 555 0199",
        },
        makeBaseSettings(),
        target
      );

      assert.ok(msgId.startsWith("openwa_"));
      assert.equal(
        capturedUrl,
        "https://wa.ops.example.org/api/sessions/mosque/messages/send-text"
      );
      const headers = (capturedInit?.headers || {}) as Record<string, string>;
      assert.equal(headers["X-API-Key"], "owa_k1_test_key");
      assert.equal(headers.Authorization, "Bearer owa_k1_test_key");
      const body = JSON.parse(String(capturedInit?.body));
      assert.equal(body.chatId, "573105550199@c.us");
      assert.match(body.text, /Jumuah/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("blocks private/non-HTTPS OpenWA gateway URLs via SSRF validation", async () => {
    const target = normalizeWhatsAppTarget("+573105550199");
    await assert.rejects(
      () =>
        executeWhatsAppHttpSend(
          "openwa",
          {
            campaignSlug: "ssrf-test",
            locale: "es",
            textBody: "Test",
            recipientPhone: "+573105550199",
          },
          makeBaseSettings({
            whatsappGatewayUrl: "http://127.0.0.1:2785",
            allowLocalhostGateways: false,
          }),
          target
        ),
      /HTTPS|localhost|private|blocked|valid/i
    );
  });
});
