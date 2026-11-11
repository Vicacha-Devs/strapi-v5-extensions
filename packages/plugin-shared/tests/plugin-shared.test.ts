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
  it("exports frozen LOCALE_OPTIONS and SECONDARY_CALENDAR_OPTIONS", () => {
    assert.ok(LOCALE_OPTIONS.length >= 12);
    assert.ok(Object.isFrozen(LOCALE_OPTIONS));
    assert.ok(Object.isFrozen(LOCALE_OPTIONS[0]));
    assert.ok(Object.isFrozen(SECONDARY_CALENDAR_OPTIONS));
    assert.ok(Object.isFrozen(SECONDARY_CALENDAR_OPTIONS[0]));
    assert.ok(LOCALE_OPTIONS.some((opt) => opt.value === "es"));
    assert.ok(LOCALE_OPTIONS.some((opt) => opt.value === "ar"));
    assert.ok(
      SECONDARY_CALENDAR_OPTIONS.some((opt) => opt.value === "islamic-umalqura")
    );
  });

  it("merges readonly options and deduplicates repeated or whitespace custom values", () => {
    const predefined = [
      { value: "es", label: "Spanish" },
      { value: "en", label: "English" },
    ] as const;

    const merged = mergeSelectOptions(predefined, [
      "en",
      "ms",
      "ms",
      " ms ",
      "",
      "   ",
      null,
      undefined,
    ]);
    assert.deepEqual(merged, [
      { value: "es", label: "Spanish" },
      { value: "en", label: "English" },
      { value: "ms", label: "ms" },
    ]);
    assert.deepEqual(mergeSelectOptions(predefined, null), [
      { value: "es", label: "Spanish" },
      { value: "en", label: "English" },
    ]);
  });

  it("parses comma-separated strings into unique, trimmed non-empty arrays", () => {
    assert.deepEqual(parseCsvList(" es, en , , ar, es , en "), [
      "es",
      "en",
      "ar",
    ]);
    assert.deepEqual(parseCsvList(""), []);
    assert.deepEqual(parseCsvList(" , , "), []);
    assert.deepEqual(parseCsvList(null), []);
    assert.deepEqual(parseCsvList(undefined), []);
  });

  it("validates pluginId eagerly in prefixPluginTranslations and createRegisterTrads", () => {
    assert.throws(() => prefixPluginTranslations({ a: "1" }, ""), TypeError);
    assert.throws(() => prefixPluginTranslations({ a: "1" }, "   "), TypeError);
    assert.throws(() => createRegisterTrads({ pluginId: "" }), TypeError);
    assert.throws(() => createRegisterTrads({ pluginId: "  \t " }), TypeError);
  });

  it("prefixes plugin translations deterministically and skips non-string values", () => {
    const prefixedOnly = prefixPluginTranslations(
      {
        "seo.title": "Explicit",
        "title": "Generic",
        "nested": { bad: true } as unknown as string,
      },
      " seo "
    );
    assert.deepEqual(prefixedOnly, {
      "seo.title": "Explicit",
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

  it("supports dynamic loaders, direct objects, default-arg calls, and onLoaded hooks", async () => {
    const loadedLocales: Array<[string, Record<string, string>]> = [];
    const registerTrads = createRegisterTrads({
      pluginId: "demo",
      defaultLocales: ["en", "es"],
      loadTranslation: async (locale) => {
        if (locale === "en") {
          return { default: { hello: "Hello" } };
        }
        if (locale === "fr") {
          return { bonjour: "Bonjour" };
        }
        throw new Error("Missing locale");
      },
      onLoaded: (locale, prefixed) => {
        loadedLocales.push([locale, prefixed]);
      },
    });

    const result = await registerTrads({ locales: ["en", "fr", "nl"] });
    assert.equal(result.length, 4);
    assert.deepEqual(result.find((r) => r.locale === "en")?.data, {
      "hello": "Hello",
      "demo.hello": "Hello",
    });
    assert.deepEqual(result.find((r) => r.locale === "fr")?.data, {
      "bonjour": "Bonjour",
      "demo.bonjour": "Bonjour",
    });
    assert.deepEqual(result.find((r) => r.locale === "es")?.data, {});
    assert.deepEqual(result.find((r) => r.locale === "nl")?.data, {});
    assert.equal(loadedLocales.length, 2);

    const defaultCall = await registerTrads();
    assert.equal(defaultCall.length, 2);
  });

  it("supports static maps, BCP-47 regional fallbacks, and prototype/path-traversal guards", async () => {
    const loaderCalls: string[] = [];
    const registerTrads = createRegisterTrads({
      pluginId: "seo",
      defaultLocales: [],
      keepUnprefixed: false,
      translations: {
        pt: { label: "Português" },
      },
      loadTranslation: async (locale) => {
        loaderCalls.push(locale);
        if (locale === "zh") {
          return { default: { label: "中文" } };
        }
        throw new Error("Not found");
      },
    });

    const result = await registerTrads({
      locales: ["pt-BR", "zh-Hans", "constructor", "../package"],
    });

    assert.deepEqual(result.find((r) => r.locale === "pt-BR")?.data, {
      "seo.label": "Português",
    });
    assert.deepEqual(result.find((r) => r.locale === "zh-Hans")?.data, {
      "seo.label": "中文",
    });
    assert.deepEqual(result.find((r) => r.locale === "constructor")?.data, {});
    assert.deepEqual(result.find((r) => r.locale === "../package")?.data, {});
    assert.ok(!loaderCalls.includes("../package"));
  });

  it("preserves getBaseTranslations fallbacks even when locale JSON is missing", async () => {
    const registerTrads = createRegisterTrads({
      pluginId: "inbox",
      defaultLocales: [],
      loadTranslation: async () => {
        throw new Error("Missing locale chunk");
      },
      getBaseTranslations: () => ({
        "content-manager.content-types.plugin::inbox.form.title": "Form Title",
      }),
    });

    const result = await registerTrads({ locales: ["nl"] });
    assert.deepEqual(result, [
      {
        locale: "nl",
        data: {
          "content-manager.content-types.plugin::inbox.form.title":
            "Form Title",
        },
      },
    ]);
  });

  it("intersects defaultLocales with supportedLocales and handles malformed loader payloads", async () => {
    const registerTrads = createRegisterTrads({
      pluginId: "sitemap",
      supportedLocales: ["en", "fr"],
      keepUnprefixed: false,
      loadTranslation: async (locale) => {
        if (locale === "en") {
          return { default: undefined } as unknown as Record<string, string>;
        }
        return "not-an-object" as unknown as Record<string, string>;
      },
    });

    const result = await registerTrads({ locales: ["fr", "de"] });
    assert.deepEqual(
      result.map((r) => r.locale),
      ["fr", "de", "en"]
    );
    assert.deepEqual(result.find((r) => r.locale === "en")?.data, {});
    assert.deepEqual(result.find((r) => r.locale === "fr")?.data, {});
    assert.deepEqual(result.find((r) => r.locale === "de")?.data, {});
  });
});
