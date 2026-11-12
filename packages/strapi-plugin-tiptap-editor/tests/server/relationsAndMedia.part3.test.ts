import { describe, it, expect, vi } from "vitest";

vi.mock("undici", async () => {
  const actual = await vi.importActual<typeof import("undici")>("undici");
  return {
    ...actual,
    fetch: vi.fn((...args: any[]) => (globalThis.fetch as any)(...args)),
  };
});

import createMediaController from "../../server/src/controllers/media";
import createSearchController from "../../server/src/controllers/search";
import register from "../../server/src/register";
import { matchesMagicBytes } from "../../server/src/services/media";
import createSearchService from "../../server/src/services/search";

describe("server/controllers/media & search authorization", () => {
  it("enforces plugin::upload.assets.create ability in media.uploadByUrl controller", async () => {
    const uploadByUrlMock = vi.fn(async () => ({ id: 1, documentId: "doc-1" }));
    const mockStrapi = {
      plugin: vi.fn(() => ({
        service: vi.fn(() => ({
          isSsrfSafeUrl: () => true,
          uploadByUrl: uploadByUrlMock,
        })),
      })),
    } as any;

    const controller = createMediaController({ strapi: mockStrapi });

    const throwMock = vi.fn((status: number, msg: string) => {
      const err = new Error(msg) as Error & { status?: number };
      err.status = status;
      throw err;
    });

    // Missing userAbility -> 403
    await expect(
      controller.uploadByUrl({
        state: {},
        request: { body: { url: "https://example.com/a.jpg" } },
        throw: throwMock,
      } as any)
    ).rejects.toThrow("Forbidden");

    // Denied userAbility -> 403
    await expect(
      controller.uploadByUrl({
        state: {
          userAbility: {
            cannot: (action: string) =>
              action === "plugin::upload.assets.create",
          },
        },
        request: { body: { url: "https://example.com/a.jpg" } },
        throw: throwMock,
      } as any)
    ).rejects.toThrow("Forbidden");

    expect(uploadByUrlMock).not.toHaveBeenCalled();

    // Permitted userAbility -> succeeds and forwards ctx.state.user
    const adminUser = { id: 7, email: "editor@example.com" };
    const ctxAllowed: any = {
      state: {
        user: adminUser,
        userAbility: {
          cannot: () => false,
        },
      },
      request: { body: { url: "https://example.com/a.jpg", alt: "Alt" } },
      throw: throwMock,
    };
    await controller.uploadByUrl(ctxAllowed);
    expect(uploadByUrlMock).toHaveBeenCalledWith(
      "https://example.com/a.jpg",
      "Alt",
      adminUser
    );
    expect(ctxAllowed.body).toEqual({ id: 1, documentId: "doc-1" });
  });

  it("requires usable userAbility in search controller handlers", async () => {
    const mockStrapi = {
      plugin: vi.fn(() => ({
        service: vi.fn(() => ({
          search: vi.fn(async () => ({})),
          getLinkableCollections: vi.fn(() => []),
          getDocument: vi.fn(async () => null),
          identifyCollectionTitleField: vi.fn(() => "title"),
        })),
      })),
    } as any;

    const controller = createSearchController({ strapi: mockStrapi });
    const throwMock = vi.fn((status: number, msg: string) => {
      const err = new Error(msg) as Error & { status?: number };
      err.status = status;
      throw err;
    });

    await expect(
      controller.search({
        query: { q: "hello" },
        state: {},
        throw: throwMock,
      } as any)
    ).rejects.toThrow("Forbidden");

    await expect(
      controller.getDocument({
        params: { collectionName: "api::article.article", documentId: "doc-1" },
        query: {},
        state: {},
        throw: throwMock,
      } as any)
    ).rejects.toThrow("Forbidden");

    await expect(
      controller.identify({
        params: { collectionName: "api::article.article" },
        state: {},
        throw: throwMock,
      } as any)
    ).rejects.toThrow("Forbidden");
  });

  it("logs outbound fetch exceptions server-side and returns fixed sanitized messages in media controller", async () => {
    const warnMock = vi.fn();
    const mockStrapi = {
      log: { warn: warnMock },
      plugin: vi.fn(() => ({
        service: vi.fn(() => ({
          isSsrfSafeUrl: () => true,
          getLinkPreview: vi.fn(async () => {
            throw new Error("connect ECONNREFUSED 10.0.0.5:80");
          }),
          uploadByUrl: vi.fn(async () => {
            throw new Error("getaddrinfo ENOTFOUND internal.corp.local");
          }),
        })),
      })),
    } as any;

    const controller = createMediaController({ strapi: mockStrapi });
    const throwMock = vi.fn((status: number, msg: string) => {
      const err = new Error(msg) as Error & { status?: number };
      err.status = status;
      throw err;
    });

    await expect(
      controller.linkPreview({
        state: { userAbility: { cannot: () => false } },
        query: { url: "https://example.com" },
        throw: throwMock,
      } as any)
    ).rejects.toThrow("Failed to fetch link preview");
    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining("connect ECONNREFUSED 10.0.0.5:80")
    );

    await expect(
      controller.uploadByUrl({
        state: { userAbility: { cannot: () => false } },
        request: { body: { url: "https://example.com/a.jpg" } },
        throw: throwMock,
      } as any)
    ).rejects.toThrow("Failed to process remote media URL");
    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining("getaddrinfo ENOTFOUND internal.corp.local")
    );
  });

  it("enforces plugin::tiptap-editor.explorer.read ability in media.linkPreview controller", async () => {
    const getLinkPreviewMock = vi.fn(async () => ({
      url: "https://example.com",
      title: "Example",
      description: "",
      image: null,
      siteName: "example.com",
    }));
    const controller = createMediaController({
      strapi: {
        plugin: () => ({
          service: () => ({
            isSsrfSafeUrl: () => true,
            getLinkPreview: getLinkPreviewMock,
          }),
        }),
      } as any,
    });
    const throwMock = vi.fn((status: number, msg: string) => {
      const err = new Error(msg) as Error & { status?: number };
      err.status = status;
      throw err;
    });

    // Missing userAbility -> 403
    await expect(
      controller.linkPreview({
        state: {},
        query: { url: "https://example.com" },
        throw: throwMock,
      } as any)
    ).rejects.toThrow("Forbidden");

    // Denied userAbility via ctx.forbidden -> 403
    const forbiddenMock = vi.fn();
    await controller.linkPreview({
      state: {
        userAbility: {
          cannot: (action: string) =>
            action === "plugin::tiptap-editor.explorer.read",
        },
      },
      query: { url: "https://example.com" },
      forbidden: forbiddenMock,
      throw: throwMock,
    } as any);
    expect(forbiddenMock).toHaveBeenCalledWith("Forbidden");
    expect(getLinkPreviewMock).not.toHaveBeenCalled();

    // Permitted userAbility -> succeeds
    const ctxOk: any = {
      state: { userAbility: { can: () => true } },
      query: { url: "https://example.com" },
      throw: throwMock,
    };
    await controller.linkPreview(ctxOk);
    expect(ctxOk.body?.title).toBe("Example");
  });

  it("scopes search and getDocument queries with Content Manager permission-checker, filters row-level checker.cannot.read, and enforces field-level RBAC in identify", async () => {
    const findManyMock = vi.fn(async (params: any) => {
      if (params?.status === "published") {
        return [{ documentId: "doc-allowed" }];
      }
      return [
        {
          documentId: "doc-allowed",
          id: 1,
          title: "Allowed Doc",
          publishedAt: null,
          locale: "en",
        },
        {
          documentId: "doc-blocked",
          id: 2,
          title: "Blocked Doc",
          publishedAt: null,
          locale: "en",
        },
      ];
    });
    const findOneMock = vi.fn(async () => ({
      documentId: "doc-101",
      id: 1,
      title: "Restricted Doc",
      publishedAt: null,
      locale: "en",
    }));
    const sanitizedReadMock = vi.fn(async (q: any) => ({
      ...q,
      filters: { $and: [q.filters, { createdBy: { id: 7 } }].filter(Boolean) },
    }));
    const cannotReadEntityMock = vi.fn(
      (doc: any) => doc?.documentId === "doc-blocked"
    );

    const strapiWithChecker = {
      contentTypes: {
        "api::article.article": {
          kind: "collectionType",
          info: { pluralName: "articles" },
          attributes: { title: { type: "string" } },
        },
      },
      components: {},
      plugin: vi.fn((name: string) => {
        if (name === "content-manager") {
          return {
            service: vi.fn(() => ({
              create: vi.fn(() => ({
                sanitizedQuery: { read: sanitizedReadMock },
                cannot: { read: cannotReadEntityMock },
              })),
            })),
          };
        }
        return {};
      }),
      documents: vi.fn(() => ({
        findMany: findManyMock,
        findOne: findOneMock,
      })),
    } as any;

    const searchService = createSearchService({ strapi: strapiWithChecker });
    const ability = { can: () => true, cannot: () => false };

    const searchHits = await searchService.search("Doc", "en", ability);
    expect(sanitizedReadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "en",
        limit: 10,
      })
    );
    expect(searchHits["api::article.article"]).toHaveLength(1);
    expect(searchHits["api::article.article"][0]?.documentId).toBe(
      "doc-allowed"
    );
    expect(searchHits["api::article.article"][0]?.status).toBe("published");
    expect(findManyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        fields: ["documentId"],
        filters: { documentId: { $in: ["doc-allowed"] } },
        status: "published",
      })
    );

    const resolvedDoc = await searchService.getDocument(
      "api::article.article",
      "doc-101",
      "en",
      ability
    );
    expect(resolvedDoc?.documentId).toBe("doc-101");
    expect(findOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "doc-101",
        locale: "en",
        filters: expect.objectContaining({
          $and: expect.anything(),
        }),
      })
    );

    cannotReadEntityMock.mockReturnValueOnce(true);
    await expect(
      searchService.getDocument(
        "api::article.article",
        "doc-101",
        "en",
        ability
      )
    ).rejects.toThrow("Forbidden");

    // Search controller identify returns 403 when userAbility denies field-level read on titleField
    const identifyController = createSearchController({
      strapi: {
        plugin: () => ({
          service: () => ({
            identifyCollectionTitleField: () => "title",
          }),
        }),
      } as any,
    });
    const forbiddenMock = vi.fn();
    await identifyController.identify({
      params: { collectionName: "api::article.article" },
      state: {
        userAbility: {
          cannot: (_action: string, _subject?: string, field?: string) =>
            field === "title",
        },
      },
      forbidden: forbiddenMock,
    } as any);
    expect(forbiddenMock).toHaveBeenCalledWith("Forbidden");

    // Search controller getDocument logs unexpected DB errors and returns a fixed 400 message
    const warnMock = vi.fn();
    const controller = createSearchController({
      strapi: {
        log: { warn: warnMock },
        plugin: () => ({
          service: () => ({
            getDocument: async () => {
              throw new Error(
                "SQLITE_ERROR: no such table: internal_secret_table"
              );
            },
          }),
        }),
      } as any,
    });
    const throwMock = vi.fn((status: number, msg: string) => {
      const err = new Error(msg) as Error & { status?: number };
      err.status = status;
      throw err;
    });

    await expect(
      controller.getDocument({
        params: {
          collectionName: "api::article.article",
          documentId: "doc-101",
        },
        query: {},
        state: { userAbility: ability },
        throw: throwMock,
      } as any)
    ).rejects.toThrow("Invalid document lookup parameters");
    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "SQLITE_ERROR: no such table: internal_secret_table"
      )
    );
  });

  it("guards register.ts fieldBindings against prototype pollution keys", () => {
    const contentTypes = {
      "api::article.article": {
        attributes: {
          body: { type: "text" } as Record<string, unknown>,
        },
      },
    };
    const mockStrapi = {
      customFields: { register: vi.fn() },
      config: {
        get: vi.fn(() => ({
          fieldBindings: [
            { uid: "__proto__", field: "polluted", preset: "default" },
            { uid: "constructor", field: "prototype", preset: "default" },
            {
              uid: "api::article.article",
              field: "__proto__",
              preset: "default",
            },
            {
              uid: "api::article.article",
              field: "constructor",
              preset: "default",
            },
            { uid: "api::article.article", field: "body", preset: "edifice" },
          ],
        })),
      },
      contentTypes,
    } as any;

    register({ strapi: mockStrapi });
    expect(({} as any).polluted).toBeUndefined();
    expect(({} as any).customField).toBeUndefined();
    expect(
      contentTypes["api::article.article"].attributes.body.customField
    ).toBe("plugin::tiptap-editor.RichText");
    expect(
      contentTypes["api::article.article"].attributes.body.options
    ).toEqual({
      preset: "edifice",
    });
  });

  it("rejects HTML/UTF-16LE polyglots in matchesMagicBytes for ftyp and audio/mpeg while accepting valid headers", () => {
    const htmlFtypPolyglot = Buffer.from(
      "<!--ftyp--><script>alert(1)</script>",
      "ascii"
    );
    expect(matchesMagicBytes(htmlFtypPolyglot, "video/mp4")).toBe(false);
    expect(matchesMagicBytes(htmlFtypPolyglot, "image/avif")).toBe(false);
    expect(matchesMagicBytes(htmlFtypPolyglot, "audio/mp4")).toBe(false);

    const validMp4 = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
    ]);
    expect(matchesMagicBytes(validMp4, "video/mp4")).toBe(true);

    const utf16BomHtml = Buffer.from([0xff, 0xfe, 0x3c, 0x00]);
    const allOnes = Buffer.from([0xff, 0xff, 0xff, 0xff]);
    expect(matchesMagicBytes(utf16BomHtml, "audio/mpeg")).toBe(false);
    expect(matchesMagicBytes(allOnes, "audio/mpeg")).toBe(false);

    const validMp3Frame = Buffer.from([0xff, 0xfb, 0x90, 0x64]);
    const validId3 = Buffer.from("ID3\x04\x00\x00", "binary");
    expect(matchesMagicBytes(validMp3Frame, "audio/mpeg")).toBe(true);
    expect(matchesMagicBytes(validId3, "audio/mpeg")).toBe(true);
  });
});
