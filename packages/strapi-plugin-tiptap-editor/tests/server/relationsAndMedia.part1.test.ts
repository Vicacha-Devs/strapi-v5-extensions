import { describe, it, expect, vi } from "vitest";

vi.mock("undici", async () => {
  const actual = await vi.importActual<typeof import("undici")>("undici");
  return {
    ...actual,
    fetch: vi.fn((...args: any[]) => (globalThis.fetch as any)(...args)),
  };
});

import createSettingsController from "../../server/src/controllers/settings";
import createSearchService from "../../server/src/services/search";
import createSettingsService, {
  SettingsValidationError,
} from "../../server/src/services/settings";

describe("server/services/settings", () => {
  it("returns default runtime settings merged with store values", async () => {
    let storedValue: any = null;
    const mockStore = {
      get: vi.fn(async () => storedValue),
      set: vi.fn(async ({ value }) => {
        storedValue = value;
      }),
    };
    const mockStrapi = {
      config: { get: vi.fn(() => ({})) },
      store: vi.fn(() => mockStore),
    } as any;

    const service = createSettingsService({ strapi: mockStrapi });
    const initial = await service.getSettings();
    expect(initial.defaultPreset).toBe("default");
    expect(initial.defaultOutputFormat).toBe("json");
    expect(initial.enableRelationalSync).toBe(true);

    const updated = await service.updateSettings({
      defaultPreset: "edifice",
      defaultOutputFormat: "markdown",
      allowedIframeDomains: ["YouTube.com", "vimeo.com"],
      presetOverrides: {
        edifice: { bold: true, mathematics: true },
      },
    });
    expect(updated.defaultPreset).toBe("edifice");
    expect(updated.defaultOutputFormat).toBe("markdown");
    expect(updated.allowedIframeDomains).toEqual(["youtube.com", "vimeo.com"]);
    expect(updated.presetOverrides.edifice?.mathematics).toBe(true);
    expect(storedValue).toEqual({
      defaultPreset: "edifice",
      defaultOutputFormat: "markdown",
      allowedIframeDomains: ["youtube.com", "vimeo.com"],
      presetOverrides: {
        edifice: { bold: true, mathematics: true },
      },
    });
  });

  it("preserves config/plugins.ts settings and only persists admin-changed overrides", async () => {
    let storedValue: any = null;
    const mockStore = {
      get: vi.fn(async () => storedValue),
      set: vi.fn(async ({ value }) => {
        storedValue = value;
      }),
    };
    const mockStrapi = {
      config: {
        get: vi.fn(() => ({
          defaultPreset: "blog",
          enableRelationalSync: false,
        })),
      },
      store: vi.fn(() => mockStore),
    } as any;

    const service = createSettingsService({ strapi: mockStrapi });
    const initial = await service.getSettings();
    expect(initial.defaultPreset).toBe("blog");
    expect(initial.enableRelationalSync).toBe(false);

    // Updating only defaultOutputFormat should not freeze defaultPreset or enableRelationalSync in store
    const afterUpdate = await service.updateSettings({
      defaultOutputFormat: "html",
    });
    expect(afterUpdate.defaultPreset).toBe("blog");
    expect(afterUpdate.enableRelationalSync).toBe(false);
    expect(afterUpdate.defaultOutputFormat).toBe("html");
    expect(storedValue).toEqual({ defaultOutputFormat: "html" });
  });

  it("rejects invalid output formats or unknown feature keys and distinguishes validation (400) from persistence errors (500) in controller", async () => {
    const mockStrapi = {
      config: { get: vi.fn(() => ({})) },
      store: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
    } as any;
    const service = createSettingsService({ strapi: mockStrapi });

    await expect(
      service.updateSettings({ defaultOutputFormat: "xml" })
    ).rejects.toThrow(SettingsValidationError);

    await expect(
      service.updateSettings({
        presetOverrides: { default: { unknownFeatureXYZ: true } },
      })
    ).rejects.toThrow("Unknown feature key");

    await expect(
      service.updateSettings({
        presetOverrides: { default: { bold: "invalid-string" as any } },
      })
    ).rejects.toThrow('Invalid value for "bold"');

    const errorLogMock = vi.fn();
    const failingStoreService = createSettingsService({
      strapi: {
        config: { get: vi.fn(() => ({})) },
        store: vi.fn(() => ({
          get: vi.fn(async () => null),
          set: vi.fn(async () => {
            throw new Error("PG::ConnectionBad: core_store write failed");
          }),
        })),
      } as any,
    });

    const controller = createSettingsController({
      strapi: {
        log: { error: errorLogMock },
        plugin: () => ({
          service: () => failingStoreService,
        }),
      } as any,
    });

    const throwMock = vi.fn((status: number, msg: string) => {
      const err = new Error(msg) as Error & { status?: number };
      err.status = status;
      throw err;
    });

    // Validation error -> 400 with validation message
    await expect(
      controller.update({
        state: { userAbility: { cannot: () => false } },
        request: { body: { defaultOutputFormat: "xml" } },
        throw: throwMock,
      } as any)
    ).rejects.toMatchObject({
      status: 400,
      message:
        "Invalid defaultOutputFormat value. Must be json, html, or markdown",
    });

    // Persistence failure -> 500 with generic message & logged server-side
    await expect(
      controller.update({
        state: { userAbility: { cannot: () => false } },
        request: { body: { defaultOutputFormat: "markdown" } },
        throw: throwMock,
      } as any)
    ).rejects.toMatchObject({
      status: 500,
      message: "Failed to save settings",
    });
    expect(errorLogMock).toHaveBeenCalledWith(
      expect.stringContaining("PG::ConnectionBad: core_store write failed")
    );
  });

  it("rejects prototype pollution keys and dangerous feature sub-options while accepting valid customExtensions", async () => {
    const mockStrapi = {
      config: { get: vi.fn(() => ({})) },
      store: vi.fn(() => ({ get: vi.fn(async () => null), set: vi.fn() })),
    } as any;
    const service = createSettingsService({ strapi: mockStrapi });

    // Reserved keys rejected on defaultPreset, presetOverrides, components, and customExtensions
    await expect(
      service.updateSettings({ defaultPreset: "__proto__" })
    ).rejects.toThrow(SettingsValidationError);
    await expect(
      service.updateSettings(
        JSON.parse('{"presetOverrides":{"__proto__":{"bold":true}}}')
      )
    ).rejects.toThrow(SettingsValidationError);
    await expect(
      service.updateSettings({
        presetOverrides: { default: { components: { constructor: true } } },
      })
    ).rejects.toThrow(SettingsValidationError);
    await expect(
      service.updateSettings({
        presetOverrides: { default: { customExtensions: { toString: true } } },
      })
    ).rejects.toThrow(SettingsValidationError);

    // Dangerous sub-options inside presetOverrides rejected
    await expect(
      service.updateSettings({
        presetOverrides: {
          default: { link: { protocols: ["javascript"] } as any },
        },
      })
    ).rejects.toThrow(SettingsValidationError);
    await expect(
      service.updateSettings({
        presetOverrides: {
          default: { link: { isAllowedUri: true } as any },
        },
      })
    ).rejects.toThrow(SettingsValidationError);
    await expect(
      service.updateSettings({
        presetOverrides: {
          default: { link: { HTMLAttributes: { onclick: "alert(1)" } } },
        },
      })
    ).rejects.toThrow(SettingsValidationError);
    await expect(
      service.updateSettings({
        presetOverrides: {
          default: { mediaLibrary: { allowBase64: true } },
        },
      })
    ).rejects.toThrow(SettingsValidationError);
    await expect(
      service.updateSettings({
        presetOverrides: {
          default: { iframe: { allowedDomains: ["https://evil.com/path"] } },
        },
      })
    ).rejects.toThrow(SettingsValidationError);

    // Valid customExtensions and safe sub-options accepted
    const saved = await service.updateSettings({
      presetOverrides: {
        default: {
          link: {
            openOnClick: false,
            HTMLAttributes: { rel: "noopener noreferrer" },
          },
          mediaLibrary: { allowBase64: false },
          iframe: { allowedDomains: ["YouTube.com"] },
          customExtensions: {
            "my-callout": true,
            "badge_v2": { variant: "info" },
          },
        },
      },
    });
    expect(saved.presetOverrides.default?.customExtensions).toEqual({
      "my-callout": true,
      "badge_v2": { variant: "info" },
    });
    expect(saved.presetOverrides.default?.iframe).toEqual({
      allowedDomains: ["youtube.com"],
    });
  });
});

describe("server/services/search", () => {
  const mockStrapi = {
    contentTypes: {
      "api::article.article": {
        kind: "collectionType",
        info: { pluralName: "articles" },
        attributes: {
          title: { type: "string" },
          body: { type: "richtext" },
        },
      },
    },
    components: {},
    documents: vi.fn(() => ({
      findMany: vi.fn(async () => [
        {
          documentId: "doc-101",
          id: 1,
          title: "Getting Started with Tiptap",
          publishedAt: "2026-10-09T00:00:00Z",
          locale: "en",
        },
      ]),
      findOne: vi.fn(async ({ documentId }: { documentId: string }) =>
        documentId === "doc-101"
          ? {
              documentId: "doc-101",
              id: 1,
              title: "Getting Started with Tiptap",
              publishedAt: null,
              locale: "en",
            }
          : null
      ),
    })),
  } as any;

  const allowAllAbility = {
    can: () => true,
    cannot: () => false,
  };

  it("identifies collection title field and searches across linkable collections", async () => {
    const service = createSearchService({ strapi: mockStrapi });
    expect(service.identifyCollectionTitleField("api::article.article")).toBe(
      "title"
    );

    const results = await service.search("Tiptap", "en", allowAllAbility);
    expect(results["api::article.article"]).toHaveLength(1);
    expect(results["api::article.article"][0]).toEqual({
      documentId: "doc-101",
      id: 1,
      label: "Getting Started with Tiptap",
      collectionName: "api::article.article",
      status: "published",
      locale: "en",
    });
  });

  it("resolves a single document by collection UID and documentId", async () => {
    const service = createSearchService({ strapi: mockStrapi });
    const doc = await service.getDocument(
      "api::article.article",
      "doc-101",
      undefined,
      allowAllAbility
    );
    expect(doc?.label).toBe("Getting Started with Tiptap");
    expect(doc?.status).toBe("draft");
  });

  it("rejects invalid collectionName or documentId formats", async () => {
    const service = createSearchService({ strapi: mockStrapi });
    expect(() => service.identifyCollectionTitleField("invalid-uid")).toThrow(
      "Invalid collectionName format"
    );
    await expect(
      service.getDocument(
        "api::article.article",
        "../traversal",
        undefined,
        allowAllAbility
      )
    ).rejects.toThrow("Invalid documentId format");
  });

  it("fails closed when userAbility is missing or denies read access", async () => {
    const service = createSearchService({ strapi: mockStrapi });

    // Missing userAbility fails closed
    expect(await service.search("Tiptap", "en")).toEqual({});
    await expect(
      service.getDocument("api::article.article", "doc-101")
    ).rejects.toThrow("Forbidden");

    const restrictedAbility = {
      cannot: (action: string, subject: string) =>
        action === "plugin::content-manager.explorer.read" &&
        subject === "api::article.article",
    };
    const results = await service.search("Tiptap", "en", restrictedAbility);
    expect(results["api::article.article"]).toBeUndefined();
    await expect(
      service.getDocument(
        "api::article.article",
        "doc-101",
        undefined,
        restrictedAbility
      )
    ).rejects.toThrow("Forbidden");
  });

  it("skips private attributes when selecting collection title field", () => {
    const strapiWithPrivateAttrs = {
      contentTypes: {
        "api::account.account": {
          kind: "collectionType",
          attributes: {
            title: { type: "string", private: true },
            secretToken: { type: "string", private: true },
            displayName: { type: "string", private: false },
          },
        },
        "api::vault.vault": {
          kind: "collectionType",
          attributes: {
            secretKey: { type: "string", private: true },
          },
        },
      },
    } as any;

    const service = createSearchService({ strapi: strapiWithPrivateAttrs });
    expect(service.identifyCollectionTitleField("api::account.account")).toBe(
      "displayName"
    );
    expect(service.identifyCollectionTitleField("api::vault.vault")).toBe(
      "documentId"
    );
  });

  it("does not fall back to unrelated api::* collections when links.links defines targets that userAbility cannot read", () => {
    const strapiWithConfiguredLinks = {
      contentTypes: {
        "api::article.article": {
          kind: "collectionType",
          info: { pluralName: "articles" },
        },
        "api::public-note.public-note": {
          kind: "collectionType",
          info: { pluralName: "public-notes" },
        },
      },
      components: {
        "links.links": {
          attributes: {
            articles: { type: "relation", target: "api::article.article" },
          },
        },
      },
    } as any;

    const abilityDenyingArticlesOnly = {
      cannot: (action: string, subject: string) =>
        action === "plugin::content-manager.explorer.read" &&
        subject === "api::article.article",
    };

    const service = createSearchService({ strapi: strapiWithConfiguredLinks });
    expect(service.getLinkableCollections(abilityDenyingArticlesOnly)).toEqual(
      []
    );
  });

  it("enforces field-level read permission on titleField in search and getDocument", async () => {
    const service = createSearchService({ strapi: mockStrapi });
    const denyTitleFieldAbility = {
      cannot: (action: string, subject: string, field?: string) =>
        action === "plugin::content-manager.explorer.read" &&
        subject === "api::article.article" &&
        field === "title",
    };

    const results = await service.search("Tiptap", "en", denyTitleFieldAbility);
    expect(results["api::article.article"]).toBeUndefined();

    await expect(
      service.getDocument(
        "api::article.article",
        "doc-101",
        undefined,
        denyTitleFieldAbility
      )
    ).rejects.toThrow("Forbidden");
  });
});
