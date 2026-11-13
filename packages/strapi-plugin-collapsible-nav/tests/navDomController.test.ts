import assert from "node:assert/strict";
import test from "node:test";

import {
  COLLAPSIBLE_NAV_CSS,
  STYLE_ELEMENT_ID,
} from "../admin/src/styles/collapsibleNavStyles";
import ar from "../admin/src/translations/ar.json";
import en from "../admin/src/translations/en.json";
import es from "../admin/src/translations/es.json";
import fr from "../admin/src/translations/fr.json";
import tr from "../admin/src/translations/tr.json";
import { initCollapsibleNav } from "../admin/src/utils/navDomController";

test("COLLAPSIBLE_NAV_CSS scopes desktop rules, dark mode, RTL, and reduced motion", () => {
  assert.ok(STYLE_ELEMENT_ID.length > 0);
  assert.match(COLLAPSIBLE_NAV_CSS, /@media\s*\(min-width:\s*1080px\)/);
  assert.match(COLLAPSIBLE_NAV_CSS, /@media\s*\(max-width:\s*1079px\)/);
  assert.match(
    COLLAPSIBLE_NAV_CSS,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)/
  );
  assert.match(COLLAPSIBLE_NAV_CSS, /\[dir="rtl"\]/);
  assert.match(COLLAPSIBLE_NAV_CSS, /inset-inline-end:\s*-1\.2rem/);
  assert.match(COLLAPSIBLE_NAV_CSS, /\[data-scn-theme="dark"\]/);
  assert.match(COLLAPSIBLE_NAV_CSS, /var\(--strapi-colors-primary600/);
});

test("initCollapsibleNav is SSR-safe when document is undefined", () => {
  const cleanup = initCollapsibleNav();
  assert.equal(typeof cleanup, "function");
  cleanup();
});

test("all 5 admin translation locales share identical keys", () => {
  const locales = { en, es, fr, ar, tr };
  const expectedKeys = Object.keys(en).sort();

  for (const [locale, bundle] of Object.entries(locales)) {
    assert.deepEqual(
      Object.keys(bundle).sort(),
      expectedKeys,
      `Locale "${locale}" is missing or has extra translation keys`
    );
    for (const key of expectedKeys) {
      assert.ok(
        bundle[key as keyof typeof bundle].trim().length > 0,
        `Locale "${locale}" has empty value for "${key}"`
      );
    }
  }
});
