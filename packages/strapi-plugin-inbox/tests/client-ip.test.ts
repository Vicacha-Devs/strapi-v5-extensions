import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveClientIp } from "../server/src/controllers/formHandlers";

describe("client IP resolution", () => {
  const ctxWith = (ip: string | undefined, headers: Record<string, string>) =>
    ({ ip, request: { ip, headers } }) as unknown as Parameters<
      typeof resolveClientIp
    >[0];

  it("uses the server-provided IP and never trusts X-Forwarded-For", () => {
    assert.equal(
      resolveClientIp(ctxWith("203.0.113.9", { "x-forwarded-for": "1.2.3.4" })),
      "203.0.113.9"
    );
    assert.equal(
      resolveClientIp(ctxWith(undefined, { "x-forwarded-for": "1.2.3.4" })),
      "127.0.0.1"
    );
    assert.equal(resolveClientIp(ctxWith("  ", {})), "127.0.0.1");
  });
});
