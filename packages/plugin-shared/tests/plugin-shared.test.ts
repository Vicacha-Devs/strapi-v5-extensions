import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LOCALE_OPTIONS,
  SECONDARY_CALENDAR_OPTIONS,
  createRegisterTrads,
  mergeSelectOptions,
  parseCsvList,
  prefixPluginTranslations,
} from "../src/index.ts";

describe("@vicacha-devs/plugin-shared", () => {
  it("exports standard LOCALE_OPTIONS and SECONDARY_CALENDAR_OPTIONS", () => {
    assert.ok(LOCALE_OPTIONS.length >= 12);
    assert.ok(LOCALE_OPTIONS.some((opt) => opt.value === "es"));
    assert.ok(LOCALE_OPTIONS.some((opt) => opt.value === "ar"));
    assert.ok(
      SECONDARY_CALENDAR_OPTIONS.some((opt) => opt.value === "islamic-umalqura")
    );
  });

  it("merges predefined options with extra custom values without duplicates", () => {
    const merged = mergeSelectOptions(
      [
        { value: "es", label: "Spanish" },
        { value: "en", label: "English" },
      ],
      ["en", "ms", ""]
    );
    assert.deepEqual(merged, [
      { value: "es", label: "Spanish" },
      { value: "en", label: "English" },
      { value: "ms", label: "ms" },
    ]);
  });

  it("parses comma-separated strings into trimmed non-empty arrays", () => {
    assert.deepEqual(parseCsvList(" es, en , , ar "), ["es", "en", "ar"]);
  });

  it("prefixes plugin translations and supports keepUnprefixed and baseTranslations", () => {
    const prefixedOnly = prefixPluginTranslations(
      { "settings.title": "Title", "seo.already": "Already" },
      "seo"
    );
    assert.deepEqual(prefixedOnly, {
      "seo.settings.title": "Title",
      "seo.already": "Already",
    });

    const withUnprefixedAndBase = prefixPluginTranslations(
      { "settings.title": "Title" },
      "inbox",
      {
        keepUnprefixed: true,
        baseTranslations: { "cm.field": "Field" },
      }
    );
    assert.deepEqual(withUnprefixedAndBase, {
      "cm.field": "Field",
      "settings.title": "Title",
      "inbox.settings.title": "Title",
    });
  });

  it("creates a registerTrads handler supporting dynamic loaders, static maps, and fallbacks", async () => {
    const registerTrads = createRegisterTrads({
      pluginId: "demo",
      defaultLocales: ["en", "es"],
      loadTranslation: async (locale) => {
        if (locale === "en") {
          return { default: { hello: "Hello" } };
        }
        throw new Error("Missing locale");
      },
    });

    const result = await registerTrads({ locales: ["en", "fr"] });
    assert.equal(result.length, 3);
    const enEntry = result.find((r) => r.locale === "en");
    const frEntry = result.find((r) => r.locale === "fr");
    assert.deepEqual(enEntry?.data, {
      "hello": "Hello",
      "demo.hello": "Hello",
    });
    assert.deepEqual(frEntry?.data, {});
  });
});
