import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isValidEmail } from "../src/index.ts";

describe("isValidEmail", () => {
  it("accepts ordinary addresses", () => {
    for (const email of [
      "a@b.co",
      "first.last+tag@sub.example.org",
      "x@y.z.w",
    ]) {
      assert.equal(isValidEmail(email), true, email);
    }
  });

  it("rejects malformed addresses", () => {
    for (const email of [
      "",
      "plain",
      "@example.com",
      "a@",
      "a@b",
      "a@.com",
      "a@b.",
      "a@@b.co",
      "a@b@c.co",
      "a b@c.co",
      "a@b .co",
      "a@b.co\n",
      "a@b.co\u0000",
      "a@example..com",
      "a@-example.com",
      "a@example-.com",
      ".a@example.com",
      "a.@example.com",
      "a..b@example.com",
      `${"a".repeat(65)}@example.com`,
      `a@${"b".repeat(250)}.com`,
    ]) {
      assert.equal(isValidEmail(email), false, JSON.stringify(email));
    }
  });

  it("runs in linear time on pathological dotted input", () => {
    const hostile = `a@${".".repeat(200_000)}`;
    const start = Date.now();
    isValidEmail(hostile);
    isValidEmail(`${hostile}\u0000 `);
    assert.ok(Date.now() - start < 200, "isValidEmail must be linear");
  });
});
