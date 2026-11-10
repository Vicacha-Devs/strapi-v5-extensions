import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { slugify, stripTrailingSlashes, trimEdgeChars } from "../src/index.ts";

describe("trimEdgeChars", () => {
  it("trims only the given character at both edges", () => {
    assert.equal(trimEdgeChars("--a-b--", "-"), "a-b");
    assert.equal(trimEdgeChars("___", "_"), "");
    assert.equal(trimEdgeChars("a", "-"), "a");
    assert.equal(trimEdgeChars("", "-"), "");
    assert.equal(trimEdgeChars("-a_", "-"), "a_");
  });
});

describe("stripTrailingSlashes", () => {
  it("removes only trailing slashes", () => {
    assert.equal(stripTrailingSlashes("https://x.org///"), "https://x.org");
    assert.equal(stripTrailingSlashes("/a/b"), "/a/b");
    assert.equal(stripTrailingSlashes("///"), "");
    assert.equal(stripTrailingSlashes(""), "");
  });
});

describe("slugify", () => {
  it("lowercases, strips diacritics and collapses separators", () => {
    assert.equal(slugify("  Café Müller -- 2026!  "), "cafe-muller-2026");
    assert.equal(slugify("---"), "");
    assert.equal(slugify(""), "");
  });

  it("can keep accented letters as separators", () => {
    assert.equal(slugify("Café", { normalization: false }), "caf");
  });

  it("supports NFKD, custom separator and max length", () => {
    assert.equal(slugify("ﬁne Art", { normalization: "NFKD" }), "fine-art");
    assert.equal(slugify("a b c", { separator: "_" }), "a_b_c");
    assert.equal(slugify("abcdefghij", { maxLength: 4 }), "abcd");
  });

  it("runs in linear time on pathological input", () => {
    const hostile = `${"-".repeat(200_000)}a${"-".repeat(200_000)}!`;
    const start = Date.now();
    assert.equal(slugify(hostile), "a");
    assert.equal(trimEdgeChars(hostile, "-").length, 200_002);
    assert.equal(stripTrailingSlashes(`a${"/".repeat(200_000)}`), "a");
    assert.ok(Date.now() - start < 300, "slugify must be linear");
  });
});
