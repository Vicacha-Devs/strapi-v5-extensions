import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function createExpect(actual) {
  return {
    toBe(expected) {
      assert.strictEqual(actual, expected);
    },
    toEqual(expected) {
      assert.deepStrictEqual(actual, expected);
    },
    toContain(substring) {
      if (typeof actual === 'string') {
        assert.ok(
          actual.includes(substring),
          `Expected "${actual}" to contain "${substring}"`
        );
      } else if (Array.isArray(actual)) {
        assert.ok(
          actual.includes(substring),
          `Expected array to contain ${JSON.stringify(substring)}`
        );
      } else {
        assert.fail(`Expected string or array in toContain, got ${typeof actual}`);
      }
    },
    toBeGreaterThan(num) {
      assert.ok(actual > num, `Expected ${actual} > ${num}`);
    },
    toBeGreaterThanOrEqual(num) {
      assert.ok(actual >= num, `Expected ${actual} >= ${num}`);
    },
    toBeTruthy() {
      assert.ok(Boolean(actual), `Expected truthy value, got ${actual}`);
    },
  };
}

export { describe, it };
export const expect = createExpect;
export default { describe, it, expect };
