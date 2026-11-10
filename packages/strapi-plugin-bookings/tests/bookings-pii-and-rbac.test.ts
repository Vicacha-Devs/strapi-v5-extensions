import { createRegisterTrads } from "@vicacha-devs/plugin-shared";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { PLUGIN_PERMISSIONS } from "../admin/src/permissions.ts";
import serverPlugin from "../server/src/index.ts";
import adminRoutes from "../server/src/routes/admin.ts";
import contentApiRoutes from "../server/src/routes/content-api.ts";
import { mapExternalSourceRowToBooking } from "../server/src/services/reservationHelpers.ts";
import { isDiscoverableCollectionUid } from "../server/src/services/settings.ts";
import {
  escapeICalText,
  sanitizeCsvCell,
  selectAvailableHostsForSlot,
  type BookingResource,
} from "../shared/index.ts";
import {
  createMockHttpCtx,
  createTestHarness,
  getFutureMonday,
} from "./test-harness.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Adversarial Hardening: RBAC, PII Stripping, Escaping & Pollution", () => {
  it("enforces RBAC policies on all 11 admin routes and exports RRuleInput component", () => {
    assert.equal(adminRoutes.length, 11);
    for (const route of adminRoutes) {
      assert.ok(Array.isArray(route.config.policies));
      assert.equal(route.config.policies[0], "admin::isAuthenticatedAdmin");
      const permPolicy = route.config.policies[1] as {
        name: string;
        config: { actions: string[] };
      };
      assert.equal(permPolicy.name, "admin::hasPermissions");
      assert.ok(permPolicy.config.actions[0].startsWith("plugin::bookings."));
    }
    assert.equal(PLUGIN_PERMISSIONS.read[0].action, "plugin::bookings.read");
    assert.equal(
      PLUGIN_PERMISSIONS.manage[0].action,
      "plugin::bookings.manage"
    );
    assert.equal(
      PLUGIN_PERMISSIONS.settings[0].action,
      "plugin::bookings.settings"
    );
    assert.equal(typeof createRegisterTrads, "function");

    const rruleSrc = fs.readFileSync(
      path.resolve(__dirname, "../admin/src/components/RRuleInput.tsx"),
      "utf8"
    );
    assert.ok(rruleSrc.includes("export default RRuleInput;"));
    assert.equal(
      rruleSrc.includes("export {\n  RRuleInput,\n  default,"),
      false
    );
  });

  it("strips internalNotes, host email, metadata, and anonymizes public /feed.ics", async () => {
    const { strapi, services } = createTestHarness({
      icalFeedToken: "secret-feed-token-123",
    });
    const contentApi = serverPlugin.controllers["content-api"]({
      strapi: strapi as never,
    });
    const adminCtrl = serverPlugin.controllers.admin({
      strapi: strapi as never,
    });
    const targetMonday = getFutureMonday(14);

    const resource = await services.availability.saveResource({
      name: "Counseling Suite",
      timezone: "UTC",
      slotDurationMinutes: 60,
      capacityPerSlot: 4,
      maxPartySize: 4,
      minLeadTimeHours: 0,
      weeklySchedule: {
        mode: "interval",
        days: { "1": [{ start: "09:00", end: "11:00" }] },
      },
      assignedHosts: [
        {
          id: "h-priv",
          name: "Counselor Nora",
          email: "nora.secret@internal.org",
          languages: ["en"],
        },
      ],
      metadata: { secretApiKey: "do-not-expose" },
    });

    const pubResCtx = createMockHttpCtx({});
    await contentApi.listPublicResources(pubResCtx);
    const pubResBody = pubResCtx.body as {
      data: Array<Record<string, unknown>>;
    };
    assert.equal("metadata" in pubResBody.data[0], false);
    const pubHosts = pubResBody.data[0].assignedHosts as Array<
      Record<string, unknown>
    >;
    assert.equal("email" in pubHosts[0], false);

    const pubSlotsCtx = createMockHttpCtx({
      query: { from: targetMonday, to: targetMonday },
    });
    await contentApi.getAvailableSlots(pubSlotsCtx);
    const pubSlotsBody = pubSlotsCtx.body as {
      data: Array<{ availableHosts: Array<Record<string, unknown>> }>;
    };
    assert.equal("email" in pubSlotsBody.data[0].availableHosts[0], false);

    const createCtx = createMockHttpCtx({
      body: {
        resourceDocumentId: resource.documentId,
        customerName: "Jane Doe",
        customerEmail: "jane@private.com",
        startDate: `${targetMonday}T09:00:00.000Z`,
        notes: "Confidential medical note",
        metadata: { debugFlag: true },
      },
    });
    await contentApi.createReservation(createCtx);
    const createdBooking = (
      createCtx.body as { data: { booking: Record<string, unknown> } }
    ).data.booking;
    await services.reservation.updateBookingStatus(
      String(createdBooking.documentId),
      "confirmed",
      { internalNotes: "Staff-only private note" }
    );
    assert.equal("internalNotes" in createdBooking, false);
    assert.equal("sourceCollection" in createdBooking, false);
    assert.equal("metadata" in createdBooking, false);
    assert.equal("cancelTokenHash" in createdBooking, false);

    // Public /feed.ics without token MUST anonymize PII!
    const publicFeedCtx = createMockHttpCtx({
      query: { from: targetMonday, to: targetMonday },
    });
    await contentApi.getICalFeed(publicFeedCtx);
    const publicIcs = String(publicFeedCtx.body);
    assert.ok(publicIcs.includes("SUMMARY:Reserved"));
    assert.ok(publicIcs.includes("Status: Busy"));
    assert.equal(publicIcs.includes("Jane Doe"), false);
    assert.equal(publicIcs.includes(String(createdBooking.bookingCode)), false);
    assert.equal(publicIcs.includes("Confidential medical note"), false);
    assert.equal(publicIcs.includes("Counselor Nora"), false);

    // Public /feed.ics WITH valid token and Admin /export.ics retain full details
    const authedFeedCtx = createMockHttpCtx({
      query: {
        from: targetMonday,
        to: targetMonday,
        token: "secret-feed-token-123",
      },
    });
    await contentApi.getICalFeed(authedFeedCtx);
    assert.ok(String(authedFeedCtx.body).includes("Jane Doe"));

    const adminFeedCtx = createMockHttpCtx({
      query: { from: targetMonday, to: targetMonday },
    });
    await adminCtrl.exportICal(adminFeedCtx);
    assert.ok(String(adminFeedCtx.body).includes("Jane Doe"));

    // Admin GET /calendar (plugin::bookings.read) MUST strip secret icalFeedToken
    const adminCalCtx = createMockHttpCtx({
      query: { from: targetMonday, to: targetMonday },
    });
    await adminCtrl.getCalendar(adminCalCtx);
    const calSettings = (
      adminCalCtx.body as { data: { settings: Record<string, unknown> } }
    ).data.settings;
    assert.equal("icalFeedToken" in calSettings, false);

    // Content-API routes must delegate auth to Strapi Users & Permissions (no auth: false)
    assert.equal(contentApiRoutes.length, 6);
    for (const route of contentApiRoutes) {
      assert.equal("auth" in route.config, false);
    }
  });

  it("escapes CSV leading whitespace & iCal bare CR, blocks system UIDs & prototype pollution", async () => {
    assert.equal(sanitizeCsvCell("   =1+1"), '"\'   =1+1"');
    assert.equal(sanitizeCsvCell("\n+cmd"), '"\'\n+cmd"');
    assert.equal(sanitizeCsvCell("|calc"), '"\'|calc"');
    assert.equal(
      escapeICalText("Line1\rATTENDEE:evil\r\nLine3"),
      "Line1\\nATTENDEE:evil\\nLine3"
    );

    const malformedRes = {
      assignedHosts: [
        null,
        { id: 123, name: null },
        { id: "ok", name: "Maya" },
      ],
    } as unknown as BookingResource;
    assert.equal(selectAvailableHostsForSlot(malformedRes, []).length, 1);

    assert.equal(isDiscoverableCollectionUid("admin::user"), false);
    assert.equal(
      isDiscoverableCollectionUid("plugin::users-permissions.user"),
      false
    );
    assert.equal(isDiscoverableCollectionUid("__proto__"), false);

    const h1 = createTestHarness();
    const h2 = createTestHarness();
    h1.services.settings.registerSource({
      id: "blocked",
      uid: "plugin::users-permissions.user",
      label: "Users",
      color: "#000",
      enabled: true,
      customerNameField: "username",
      dateField: "createdAt",
    });
    h1.services.settings.registerSource({
      id: "valid-ext",
      uid: "api::tour.tour",
      label: "Tours",
      color: "#0d9488",
      enabled: true,
      customerNameField: "visitor",
      dateField: "visitDate",
    });
    assert.equal((await h1.services.settings.getSettings()).sources.length, 1);
    assert.equal((await h2.services.settings.getSettings()).sources.length, 0);
    serverPlugin.destroy({ strapi: h1.strapi as never });
    assert.equal((await h1.services.settings.getSettings()).sources.length, 0);

    const mapped = mapExternalSourceRowToBooking(
      {
        documentId: "d1",
        visitor: "Sam",
        visitDate: "2026-10-19",
        slot: "constructor",
      },
      {
        id: "s1",
        uid: "api::tour.tour",
        label: "Tours",
        color: "#000",
        enabled: true,
        customerNameField: "visitor",
        dateField: "visitDate",
        slotLabelField: "slot",
      }
    );
    assert.equal(mapped?.startDate, "2026-10-19T09:00:00.000Z");
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
  });
});
