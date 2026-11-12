import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isVisibleCollectionType,
  sanitizeBaseUrl,
} from "../server/src/services/settings.ts";
import type { PopulateMap } from "../server/src/services/types.ts";
import {
  buildCollectionUrlEntry,
  escapeXml,
  extractAllowedFieldsFromSchema,
  insertNestedPath,
} from "../server/src/services/xml-builder.ts";

describe("strapi-plugin-sitemap security & edge-case regressions", () => {
  it("blocks protocol-relative and non-http(s) URLs in sanitizeBaseUrl", () => {
    assert.equal(sanitizeBaseUrl("//evil.example.com"), "");
    assert.equal(sanitizeBaseUrl("javascript:alert(1)"), "");
    assert.equal(sanitizeBaseUrl("data:text/xml,<urlset/>"), "");
    assert.equal(
      sanitizeBaseUrl("https://mezquitacentral.org///"),
      "https://mezquitacentral.org"
    );
  });

  it("excludes internal/transactional plugin collection types from sitemap discovery", () => {
    const schema = {
      kind: "collectionType",
      info: { singularName: "item", pluralName: "items", displayName: "Item" },
      attributes: {},
    };
    assert.equal(isVisibleCollectionType("api::article.article", schema), true);
    assert.equal(
      isVisibleCollectionType("plugin::bookings.booking", schema),
      false
    );
    assert.equal(
      isVisibleCollectionType("plugin::donations.pledge", schema),
      false
    );
    assert.equal(
      isVisibleCollectionType("plugin::inbox.submission", schema),
      false
    );
    assert.equal(isVisibleCollectionType("plugin::notes.note", schema), false);
  });

  it("blocks private, password, and token fields from allowedFields and URL patterns", () => {
    const { allowedFields, mediaFields } = extractAllowedFieldsFromSchema(
      {
        kind: "collectionType",
        info: {
          singularName: "booking",
          pluralName: "bookings",
          displayName: "Booking",
        },
        attributes: {
          slug: { type: "uid" },
          cancelToken: { type: "string" },
          verificationToken: { type: "string" },
          secretKey: { type: "string" },
          internalField: { type: "string", private: true },
          userPassword: { type: "password" },
          seo: { type: "component", component: "shared.seo" },
        },
      },
      {
        "shared.seo": {
          attributes: {
            metaTitle: { type: "string" },
            metaImage: { type: "media" },
            apiToken: { type: "string" },
          },
        },
      }
    );

    assert.ok(allowedFields.includes("slug"));
    assert.ok(allowedFields.includes("seo.metaTitle"));
    assert.ok(mediaFields.includes("seo.metaImage"));
    assert.equal(allowedFields.includes("cancelToken"), false);
    assert.equal(allowedFields.includes("verificationToken"), false);
    assert.equal(allowedFields.includes("secretKey"), false);
    assert.equal(allowedFields.includes("internalField"), false);
    assert.equal(allowedFields.includes("userPassword"), false);
    assert.equal(allowedFields.includes("seo.apiToken"), false);

    // Attempting to interpolate a token field into a URL pattern returns null
    const leaked = buildCollectionUrlEntry(
      "https://example.org",
      {
        type: "booking",
        langcode: "en",
        pattern: "/bookings/[cancelToken]",
        priority: 0.5,
        frequency: "daily",
        lastModified: "false",
        thumbnail: "seo.metaImage",
      },
      {
        slug: "room-a",
        cancelToken: "secret-token-123",
        seo: { metaImage: { url: "/uploads/meta.png", name: "Meta Image" } },
      }
    );
    assert.equal(leaked, null);

    // Component media field seo.metaImage resolves properly on valid pattern
    const valid = buildCollectionUrlEntry(
      "https://example.org",
      {
        type: "booking",
        langcode: "en",
        pattern: "/bookings/[slug]",
        priority: 0.5,
        frequency: "daily",
        lastModified: "false",
        thumbnail: "seo.metaImage",
      },
      {
        slug: "room-a",
        seo: { metaImage: { url: "/uploads/meta.png", name: "Meta Image" } },
      }
    );
    assert.ok(valid);
    assert.equal(valid.thumbnail, "https://example.org/uploads/meta.png");
    assert.equal(valid.thumbnailTitle, "Meta Image");
  });

  it("preserves deeper populate trees in insertNestedPath and strips XML 1.0 control chars", () => {
    const populate: PopulateMap = {};
    insertNestedPath(populate, ["category", "parent"]);
    insertNestedPath(populate, ["category"]);
    assert.deepEqual(populate, {
      category: { populate: { parent: true } },
    });

    assert.equal(
      escapeXml("hello\u0000\u0007\u001F<world>"),
      "hello&lt;world&gt;"
    );
  });
});
