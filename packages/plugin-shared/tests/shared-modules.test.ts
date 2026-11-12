import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FORBIDDEN_OBJECT_KEYS,
  SECONDARY_CALENDAR_IDS,
  SUPPORTED_INTL_CALENDARS,
  SlidingWindowRateLimiter,
  escapeCsvCell,
  escapeHtml,
  escapeIcsText,
  escapeXml,
  extractRichTextPlainText,
  formatSecondaryCalendarDate,
  formatSecondaryDate,
  generateReferenceCode,
  isForbiddenObjectKey,
  isPlainObject,
  isSensitiveContentTypeUid,
  isSensitiveFieldName,
  isSupportedCalendar,
  normalizeRichTextValue,
  sanitizeCalendarBaseLocale,
  stripDangerousKeys,
  stripInvalidXmlChars,
  wrapCdata,
} from "../src/index.ts";

describe("@vicacha-devs/plugin-shared extracted modules", () => {
  it("escapes HTML, XML 1.0, CSV formula cells, and RFC 5545 ICS text safely", () => {
    assert.equal(
      escapeHtml("<script>alert(\"xss\" & '1')</script>"),
      "&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;1&#39;)&lt;/script&gt;"
    );
    assert.equal(escapeHtml(null), "");

    assert.equal(
      stripInvalidXmlChars("Hello\u0000\u0007\u000C\uFFFFWorld"),
      "HelloWorld"
    );
    assert.equal(escapeXml("Test\uD800&\uDC00<Ok>"), "Test&amp;&lt;Ok&gt;");
    assert.equal(wrapCdata("a]]>b"), "<![CDATA[a]]]]><![CDATA[>b]]>");

    assert.equal(escapeCsvCell("=cmd|"), "'=cmd|");
    assert.equal(escapeCsvCell("  +SUM(A1:A2)"), "'  +SUM(A1:A2)");
    assert.equal(escapeCsvCell('=cmd|"/c calc"!A0'), '"\'=cmd|""/c calc""!A0"');
    assert.equal(escapeCsvCell(null), "");

    assert.equal(
      escapeIcsText("A, B; C\rD\r\nE\nF\\G"),
      "A\\, B\\; C\\nD\\nE\\nF\\\\G"
    );
  });

  it("formats secondary CLDR calendars and sanitizes BCP-47 locale tags", () => {
    assert.equal(SUPPORTED_INTL_CALENDARS.length, 13);
    assert.ok(SECONDARY_CALENDAR_IDS.includes("none"));
    assert.equal(isSupportedCalendar("islamic-umalqura"), true);
    assert.equal(isSupportedCalendar("none"), true);
    assert.equal(isSupportedCalendar("none", { allowNone: false }), false);
    assert.equal(isSupportedCalendar("unknown-cal"), false);

    assert.equal(sanitizeCalendarBaseLocale("es-CO-u-ca-gregory"), "es-CO");
    assert.equal(sanitizeCalendarBaseLocale("invalid locale!"), "es");

    const hijri = formatSecondaryDate(
      "2026-03-20T12:00:00.000Z",
      "islamic-umalqura",
      "en"
    );
    assert.equal(hijri.calendar, "islamic-umalqura");
    assert.ok(hijri.formatted.length > 0);
    assert.ok(hijri.year && hijri.year >= 1447);
    assert.equal(
      formatSecondaryCalendarDate("2026-03-20T12:00:00.000Z", "none", "en"),
      ""
    );
  });

  it("guards against prototype pollution and sensitive Strapi UIDs/fields", () => {
    assert.equal(FORBIDDEN_OBJECT_KEYS.has("__proto__"), true);
    assert.equal(isForbiddenObjectKey("constructor"), true);
    assert.equal(isForbiddenObjectKey("title"), false);

    assert.equal(isPlainObject({ a: 1 }), true);
    assert.equal(isPlainObject([1, 2]), false);
    assert.equal(isPlainObject(null), false);

    const dirty = JSON.parse(
      '{"safe":"ok","__proto__":{"polluted":true},"nested":{"constructor":"bad","keep":1}}'
    );
    const cleaned = stripDangerousKeys(dirty);
    assert.deepEqual(cleaned, { safe: "ok", nested: { keep: 1 } });

    assert.equal(isSensitiveFieldName("password"), true);
    assert.equal(isSensitiveFieldName("resetPasswordToken"), true);
    assert.equal(isSensitiveFieldName("webhookSigningSecret"), true);
    assert.equal(isSensitiveFieldName("title"), false);

    assert.equal(isSensitiveContentTypeUid("admin::user"), true);
    assert.equal(
      isSensitiveContentTypeUid("plugin::users-permissions.user"),
      true
    );
    assert.equal(isSensitiveContentTypeUid("plugin::donations.pledge"), true);
    assert.equal(isSensitiveContentTypeUid("api::article.article"), false);
  });

  it("enforces bounded sliding-window rate limits and generates CSPRNG reference codes", () => {
    const limiter = new SlidingWindowRateLimiter({ maxTrackedKeys: 2 });
    const t0 = 1_700_000_000_000;
    assert.equal(limiter.check("10.0.0.1", "form", 2, t0).allowed, true);
    assert.equal(limiter.check("10.0.0.1", "form", 2, t0 + 100).allowed, true);
    const blocked = limiter.check("10.0.0.1", "form", 2, t0 + 200);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds > 3500);

    // FIFO eviction when exceeding maxTrackedKeys
    limiter.check("10.0.0.2", "form", 2, t0 + 300);
    limiter.check("10.0.0.3", "form", 2, t0 + 400);
    assert.equal(limiter.check("10.0.0.1", "form", 2, t0 + 500).allowed, true);

    const ref = generateReferenceCode("INV", {
      nowMs: Date.parse("2026-04-10T12:00:00Z"),
    });
    assert.match(ref, /^INV-20260410-[0-9A-Z]{5}$/);
  });

  it("normalizes Tiptap, Blocks, and HTML rich text into plain text", () => {
    const tiptapEnvelope = {
      doc: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Community solidarity campaign." }],
          },
        ],
      },
    };
    assert.equal(
      normalizeRichTextValue(tiptapEnvelope),
      "Community solidarity campaign."
    );
    assert.equal(
      extractRichTextPlainText("<p>Hello <strong>World</strong>!</p>"),
      "Hello World !"
    );
  });
});
