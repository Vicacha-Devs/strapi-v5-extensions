import assert from "node:assert/strict";
import { describe, it } from "node:test";

import ar from "../admin/src/translations/ar.json";
import de from "../admin/src/translations/de.json";
import en from "../admin/src/translations/en.json";
import es from "../admin/src/translations/es.json";
import fr from "../admin/src/translations/fr.json";
import itLocale from "../admin/src/translations/it.json";
import pt from "../admin/src/translations/pt.json";
import ru from "../admin/src/translations/ru.json";
import tr from "../admin/src/translations/tr.json";
import zh from "../admin/src/translations/zh.json";
import createNotesController from "../server/src/controllers/notesController";
import createNotesService from "../server/src/services/notesService";
import {
  buildContentManagerNoteLink,
  computeNotesSummaryStats,
  filterNotesList,
  formatNoteAuthorDisplay,
  formatNoteTimestamp,
  NOTE_CATEGORIES,
  normalizeNoteRecord,
  PLUGIN_ID,
  sanitizeEntityDocumentId,
  sanitizeEntityId,
  sanitizeEntityLocale,
  sanitizeEntitySlug,
  sanitizeNoteAuthor,
  sortNotesPinnedFirst,
  validateNoteCreatePayload,
  validateNoteUpdatePayload,
} from "../shared";

function createMockStrapi() {
  const strapi: any = {
    log: {
      debug() {},
      info() {},
      warn() {},
      error() {},
    },
    config: {
      get(_key: string, defaultVal?: unknown) {
        return defaultVal;
      },
    },
    contentTypes: {},
  };
  const serviceInstance = createNotesService({ strapi });
  strapi.plugin = (name: string) => {
    assert.equal(name, PLUGIN_ID);
    return {
      service(serviceName: string) {
        assert.ok(
          serviceName === "notesService" || serviceName === "noteService" || serviceName === "note"
        );
        return serviceInstance;
      },
    };
  };
  return {
    strapi,
    service: serviceInstance,
    controller: createNotesController({ strapi }),
  };
}

describe("@vicacha-devs/strapi-plugin-notes — Issue #18 & Strapi v5 Suite", () => {
  describe("Issue #18: Author & Timestamp Meta Information (Created At / By, Updated At / By)", () => {
    it("sanitizes admin user objects and strips sensitive/PII fields", () => {
      const rawAdminUser = {
        id: 42,
        firstname: "Ada",
        lastname: "Lovelace",
        username: "adal",
        email: "ada@secret.org",
        password: "$2b$10$hashedpassword",
        resetPasswordToken: "reset-token-123",
        registrationToken: "reg-token-456",
      };

      const sanitized = sanitizeNoteAuthor(rawAdminUser);
      assert.ok(sanitized);
      assert.equal(sanitized.id, 42);
      assert.equal(sanitized.firstname, "Ada");
      assert.equal(sanitized.lastname, "Lovelace");
      assert.equal(sanitized.username, "adal");
      assert.equal(sanitized.displayName, "Ada Lovelace");
      assert.equal("password" in (sanitized as Record<string, unknown>), false);
      assert.equal("email" in (sanitized as Record<string, unknown>), false);
      assert.equal("resetPasswordToken" in (sanitized as Record<string, unknown>), false);
      assert.equal(formatNoteAuthorDisplay(sanitized), "Ada Lovelace");
    });

    it("falls back to username or deleted-user snapshot name when firstname/lastname are absent", () => {
      const usernameOnly = sanitizeNoteAuthor({
        id: 7,
        username: "comfortably_coding",
      });
      assert.ok(usernameOnly);
      assert.equal(formatNoteAuthorDisplay(usernameOnly), "comfortably_coding");

      // Deleted user relation (null) but preserved createdByName snapshot
      const deletedUserFallback = sanitizeNoteAuthor(null, "Former Editor");
      assert.ok(deletedUserFallback);
      assert.equal(formatNoteAuthorDisplay(deletedUserFallback), "Former Editor");

      // Completely missing author
      assert.equal(formatNoteAuthorDisplay(null), "-");
    });

    it("formats ISO timestamps for the NoteModal Audit Logs-style metadata grid", () => {
      const formatted = formatNoteTimestamp("2026-10-29T10:00:00.000Z", "en");
      assert.ok(formatted.length > 4);
      assert.notEqual(formatted, "-");

      assert.equal(formatNoteTimestamp(null, "en"), "-");
      assert.equal(formatNoteTimestamp("not-a-valid-date", "en"), "-");
    });

    it("automatically populates createdBy/updatedBy on create and updates only updatedBy on update", async () => {
      const { controller } = createMockStrapi();

      const creatorUser = {
        id: 10,
        firstname: "Alice",
        lastname: "Creator",
        username: "alice",
      };
      const editorUser = {
        id: 25,
        firstname: "Bob",
        lastname: "Reviewer",
        username: "bob",
      };

      const createCtx: any = {
        request: {
          body: {
            data: {
              title: "Verify hero banner contrast",
              content: "WCAG AA check needed before publishing.",
              category: "blocker",
              isPinned: true,
              entitySlug: "api::article.article",
              entityId: 101,
              entityDocumentId: "doc_article_101",
              entityLocale: "en",
            },
          },
        },
        state: { user: creatorUser },
      };

      const createdRes: any = await controller.create(createCtx);
      assert.equal(createCtx.status, 201);
      const createdNote = createdRes.data;
      assert.equal(createdNote.title, "Verify hero banner contrast");
      assert.equal(createdNote.createdBy.displayName, "Alice Creator");
      assert.equal(createdNote.updatedBy.displayName, "Alice Creator");
      assert.ok(createdNote.createdAt);
      assert.ok(createdNote.updatedAt);
      // Backward-compatible attributes mirror
      assert.equal(createdNote.attributes.createdBy.displayName, "Alice Creator");
      assert.equal(createdNote.attributes.updatedBy.displayName, "Alice Creator");

      // Update the same note as a different admin user (Bob Reviewer)
      const updateCtx: any = {
        params: { id: String(createdNote.id) },
        request: {
          body: {
            data: {
              title: "Verify hero banner contrast (resolved)",
              category: "todo",
            },
          },
        },
        state: { user: editorUser },
      };

      const updatedRes: any = await controller.update(updateCtx);
      assert.equal(updateCtx.status, 200);
      const updatedNote = updatedRes.data;

      assert.equal(updatedNote.title, "Verify hero banner contrast (resolved)");
      assert.equal(updatedNote.category, "todo");
      // Created By must remain Alice Creator while Updated By becomes Bob Reviewer!
      assert.equal(updatedNote.createdBy.displayName, "Alice Creator");
      assert.equal(updatedNote.createdBy.id, 10);
      assert.equal(updatedNote.updatedBy.displayName, "Bob Reviewer");
      assert.equal(updatedNote.updatedBy.id, 25);
    });
  });

  describe("Pinned Notes, Category Badges, Document & Locale Scoping, and Global Hub", () => {
    it("sorts pinned notes first and filters by category, documentId, locale, and search query", async () => {
      const { service } = createMockStrapi();

      await service.create(
        {
          title: "General editorial note",
          content: "First unpinned note",
          category: "general",
          isPinned: false,
          entitySlug: "api::event.event",
          entityId: 1,
          entityDocumentId: "doc_event_1",
          entityLocale: null,
        },
        { id: 1, firstname: "Sarah", lastname: "Editor" }
      );

      await service.create(
        {
          title: "Critical legal review blocker",
          content: "Requires sign-off from legal counsel",
          category: "blocker",
          isPinned: true,
          entitySlug: "api::event.event",
          entityId: 2, // Simulates Strapi v5 new numeric id after publish on same documentId
          entityDocumentId: "doc_event_1",
          entityLocale: "es",
        },
        { id: 2, firstname: "Marco", lastname: "Legal" }
      );

      await service.create(
        {
          title: "French translation idea",
          content: "Localize callout box for Paris event",
          category: "idea",
          isPinned: false,
          entitySlug: "api::event.event",
          entityId: 3,
          entityDocumentId: "doc_event_1",
          entityLocale: "fr",
        },
        { id: 3, firstname: "Claire", lastname: "Translator" }
      );

      // Query for doc_event_1 in locale 'es' -> returns global note (null) + 'es' note, with pinned first
      const esNotes = await service.find({
        entitySlug: "api::event.event",
        entityDocumentId: "doc_event_1",
        entityLocale: "es",
      });
      assert.equal(esNotes.length, 2);
      assert.equal(esNotes[0].title, "Critical legal review blocker");
      assert.equal(esNotes[0].isPinned, true);
      assert.equal(esNotes[1].title, "General editorial note");

      // Query for Global Hub (includeAllLocales: true)
      const allNotes = await service.find({
        includeAllLocales: true,
      });
      assert.equal(allNotes.length, 3);

      // Summary stats
      const stats = computeNotesSummaryStats(allNotes);
      assert.equal(stats.total, 3);
      assert.equal(stats.pinned, 1);
      assert.equal(stats.byCategory.blocker, 1);
      assert.equal(stats.byCategory.general, 1);
      assert.equal(stats.byCategory.idea, 1);
      assert.deepEqual(stats.entitySlugs, ["api::event.event"]);

      // Search by author name or content
      const searchByAuthor = filterNotesList(allNotes, {
        search: "Marco Legal",
        includeAllLocales: true,
      });
      assert.equal(searchByAuthor.length, 1);
      assert.equal(searchByAuthor[0].category, "blocker");
    });

    it("builds safe Content Manager deep links and rejects invalid slugs", () => {
      const linkWithLocale = buildContentManagerNoteLink({
        entitySlug: "api::article.article",
        entityDocumentId: "doc_abc_123",
        entityId: 5,
        entityLocale: "es",
      });
      assert.equal(
        linkWithLocale,
        "/content-manager/collection-types/api%3A%3Aarticle.article/doc_abc_123?plugins[i18n][locale]=es"
      );

      const invalidLink = buildContentManagerNoteLink({
        entitySlug: "../../../etc/passwd",
        entityDocumentId: "doc_abc_123",
        entityId: null,
        entityLocale: null,
      });
      assert.equal(invalidLink, null);
    });

    it("validates create and update payloads strictly", () => {
      const badCreate = validateNoteCreatePayload({
        title: "   ",
        entitySlug: "invalid/slug",
      });
      assert.equal(badCreate.valid, false);
      assert.equal(badCreate.errors.length, 3);

      const badUpdate = validateNoteUpdatePayload({});
      assert.equal(badUpdate.valid, false);

      const emptyTitleUpdate = validateNoteUpdatePayload({ title: "  " });
      assert.equal(emptyTitleUpdate.valid, false);
    });

    it("maintains 10-locale translation key parity including Issue #18 metadata keys", () => {
      const baseKeys = Object.keys(en).sort();
      for (const requiredKey of [
        "note.modal.meta.createdAt",
        "note.modal.meta.createdBy",
        "note.modal.meta.updatedAt",
        "note.modal.meta.updatedBy",
        "note.modal.new.title",
        "note.modal.existing.title",
      ]) {
        assert.ok(baseKeys.includes(requiredKey), `Missing required key ${requiredKey} in en.json`);
      }

      const locales: Record<string, Record<string, string>> = {
        en,
        es,
        fr,
        de,
        it: itLocale,
        pt,
        ar,
        ru,
        tr,
        zh,
      };

      for (const [code, dict] of Object.entries(locales)) {
        assert.deepEqual(
          Object.keys(dict).sort(),
          baseKeys,
          `Locale ${code} keys do not match en.json`
        );
        for (const [k, val] of Object.entries(dict)) {
          assert.ok(
            typeof val === "string" && val.trim().length > 0,
            `Empty translation for ${code}.${k}`
          );
        }
      }
    });

    it("sorts pinned notes ahead of unpinned notes in both ASC and DESC modes", () => {
      const n1 = normalizeNoteRecord({
        id: 1,
        title: "Older unpinned",
        isPinned: false,
        entitySlug: "api::post.post",
        entityId: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      const n2 = normalizeNoteRecord({
        id: 2,
        title: "Newer pinned",
        isPinned: true,
        entitySlug: "api::post.post",
        entityId: 1,
        createdAt: "2026-01-02T00:00:00.000Z",
      });
      const sortedAsc = sortNotesPinnedFirst([n1, n2], "ASC");
      assert.equal(sortedAsc[0].id, 2);
      assert.equal(NOTE_CATEGORIES.length, 4);
    });

    it("rejects prototype pollution keys, dot traversal, null bytes, oversized identifiers, and inherited update properties", () => {
      for (const token of [
        "__proto__",
        "constructor",
        "prototype",
        "..",
        ".",
        "api::..",
        ".hidden",
        "trailing.",
      ]) {
        assert.equal(sanitizeEntitySlug(token), "");
        assert.equal(sanitizeEntityDocumentId(token), "");
        assert.equal(sanitizeEntityId(token), null);
        assert.equal(sanitizeEntityLocale(token), null);
      }
      assert.equal(sanitizeEntitySlug("api::post.post\0evil"), "");
      assert.equal(sanitizeEntityDocumentId("doc_123\0evil"), "");
      assert.equal(sanitizeEntityId("123\0"), null);
      assert.equal(sanitizeEntityLocale("en\0"), null);
      assert.equal(sanitizeEntitySlug("a".repeat(161)), "");
      assert.equal(sanitizeEntityDocumentId("a".repeat(129)), "");
      assert.equal(sanitizeEntityId("a".repeat(129)), null);
      assert.equal(sanitizeEntityLocale("a".repeat(33)), null);

      const inheritedPayload = Object.create({ title: "Inherited Title" });
      const updateResult = validateNoteUpdatePayload(inheritedPayload);
      assert.equal(updateResult.valid, false);

      const unpopulatedAuthor = sanitizeNoteAuthor(10, "Alice Creator");
      assert.deepEqual(unpopulatedAuthor, {
        id: 10,
        firstname: "",
        lastname: "",
        username: "",
        displayName: "Alice Creator",
      });
    });
  });
});
