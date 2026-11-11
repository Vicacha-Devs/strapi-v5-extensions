import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { pluginPermissions } from "../admin/src/permissions";
import adminRoutes from "../server/src/routes/admin";
import contentApiRoutes from "../server/src/routes/content-api";
import {
  EVENT_CONTENT_TYPE_UID,
  PLUGIN_ID,
  foldIcsLine,
  sanitizeEventUrl,
} from "../shared";

const currentTestDir = path.dirname(fileURLToPath(import.meta.url));

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{[a-zA-Z0-9_]+\}/g);
  return matches ? [...matches].sort() : [];
}

describe("10-Locale Admin Translation Parity & Placeholder Integrity", () => {
  const locales = ["en", "es", "fr", "de", "pt", "it", "nl", "pl", "tr", "ar"];
  const translationsDir = path.resolve(
    currentTestDir,
    "../admin/src/translations"
  );

  const requiredKeys = [
    "rrule.weekday.mo",
    "rrule.weekday.tu",
    "rrule.weekday.we",
    "rrule.weekday.th",
    "rrule.weekday.fr",
    "rrule.weekday.sa",
    "rrule.weekday.su",
    "rrule.section.advanced",
    "rrule.options.required",
    "rrule.options.required.description",
    "settings.loadError",
    "common.retry",
  ];

  const mustBeTranslatedInNonEnglish = [
    "sidePanel.secondaryCalendars",
    "placeholder.all_statuses",
    "calendar.rsvpOverview",
    "settings.loadError",
    "common.retry",
    "settings.secondaryCalendarsHint",
    "settings.defaultCapacityHint",
    "settings.waitlistEnabledByDefaultHint",
  ];

  it("has 100% key, placeholder, and localization parity across all 10 locales", () => {
    const enRaw = fs.readFileSync(
      path.join(translationsDir, "en.json"),
      "utf8"
    );
    const enMap = JSON.parse(enRaw) as Record<string, string>;
    const enKeys = Object.keys(enMap).sort();
    assert.equal(enKeys.length, 211);

    for (const rk of requiredKeys) {
      assert.ok(Boolean(enMap[rk]), `Missing required key "${rk}" in en.json`);
    }

    for (const locale of locales) {
      const filePath = path.join(translationsDir, `${locale}.json`);
      assert.equal(fs.existsSync(filePath), true);
      const map = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<
        string,
        string
      >;
      const locKeys = Object.keys(map).sort();
      assert.deepEqual(
        locKeys,
        enKeys,
        `Key set mismatch in ${locale}.json vs en.json`
      );

      for (const k of enKeys) {
        assert.ok(
          typeof map[k] === "string" && map[k].trim().length > 0,
          `Empty or missing value for "${k}" in ${locale}.json`
        );
        assert.deepEqual(
          extractPlaceholders(map[k]),
          extractPlaceholders(enMap[k]),
          `Placeholder mismatch on "${k}" in ${locale}.json`
        );
      }

      if (locale !== "en") {
        for (const tk of mustBeTranslatedInNonEnglish) {
          assert.notEqual(
            map[tk],
            enMap[tk],
            `Key "${tk}" left untranslated in ${locale}.json`
          );
        }
      }
    }
  });
});

describe("Admin RBAC Permissions, Content-API Auth & Route Policy Enforcement", () => {
  it("exports shared constants/utilities and admin RBAC permission descriptors", () => {
    assert.equal(PLUGIN_ID, "events");
    assert.equal(EVENT_CONTENT_TYPE_UID, "plugin::events.event");
    assert.equal(typeof foldIcsLine, "function");
    assert.equal(typeof sanitizeEventUrl, "function");
    assert.deepEqual(pluginPermissions, {
      read: [{ action: "plugin::events.read", subject: null }],
      update: [{ action: "plugin::events.update", subject: null }],
      settings: [{ action: "plugin::events.settings.update", subject: null }],
    });
  });

  it("enforces admin::isAuthenticatedAdmin and admin::hasPermissions on all 10 admin routes", () => {
    assert.equal(adminRoutes.type, "admin");
    assert.equal(adminRoutes.routes.length, 10);

    const expectedRouteActions: Record<string, string> = {
      "GET /settings": "plugin::events.read",
      "PUT /settings": "plugin::events.settings.update",
      "GET /calendar": "plugin::events.read",
      "POST /calendar/reschedule": "plugin::events.update",
      "POST /calendar/quick-create": "plugin::events.update",
      "GET /stats/:documentId": "plugin::events.read",
      "GET /registrations": "plugin::events.read",
      "GET /registrations/export.csv": "plugin::events.read",
      "POST /registrations/:documentId/status": "plugin::events.update",
      "POST /registrations/:documentId/check-in": "plugin::events.update",
    };

    for (const route of adminRoutes.routes) {
      const routeKey = `${route.method} ${route.path}`;
      const expectedAction = expectedRouteActions[routeKey];
      assert.ok(expectedAction, `Unexpected admin route: ${routeKey}`);

      const policies = route.config.policies;
      assert.equal(policies[0], "admin::isAuthenticatedAdmin");
      const permPolicy = policies[1] as {
        name: string;
        config: { actions: string[] };
      };
      assert.equal(permPolicy.name, "admin::hasPermissions");
      assert.deepEqual(permPolicy.config.actions, [expectedAction]);
    }
  });

  it("wires content-api routes through Users & Permissions / API tokens (no auth: false)", () => {
    assert.equal(contentApiRoutes.type, "content-api");
    assert.equal(contentApiRoutes.routes.length, 7);
    for (const route of contentApiRoutes.routes) {
      const cfg = route.config as Record<string, unknown>;
      assert.equal(cfg.auth, undefined);
      assert.deepEqual(cfg.policies, []);
    }
  });
});
