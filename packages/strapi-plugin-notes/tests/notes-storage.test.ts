import assert from "node:assert/strict";
import { describe, it } from "node:test";

import bootstrap from "../server/src/bootstrap";
import pluginConfig from "../server/src/config";
import adminRoutes from "../server/src/routes/admin";
import createNotesService from "../server/src/services/notesService";
import { NOTE_CONTENT_TYPE_UID, PLUGIN_ID } from "../shared";

describe("@vicacha-devs/strapi-plugin-notes — Storage, Config & RBAC", () => {
  it("validates plugin config, sort order, and locale scoping", async () => {
    assert.doesNotThrow(() =>
      pluginConfig.validator({
        defaultSortOrder: "ASC",
        enableLocaleScoping: false,
      })
    );
    assert.doesNotThrow(() =>
      pluginConfig.validator({ defaultSortOrder: "DESC" })
    );
    assert.throws(
      () => pluginConfig.validator({ defaultSortOrder: "RANDOM" }),
      /defaultSortOrder must be "ASC" or "DESC"/
    );
    assert.throws(
      () => pluginConfig.validator({ enableLocaleScoping: "yes" as any }),
      /enableLocaleScoping must be a boolean/
    );
    assert.throws(
      () => pluginConfig.validator(null as any),
      /expected an object/
    );

    const strapi: any = {
      config: {
        get(key: string) {
          assert.equal(key, `plugin::${PLUGIN_ID}`);
          return {
            defaultSortOrder: "ASC",
            enableLocaleScoping: false,
          };
        },
      },
    };
    const service = createNotesService({ strapi });

    const first = await service.create({
      title: "First note",
      entitySlug: "api::page.page",
      entityDocumentId: "doc_page_1",
      entityLocale: "fr",
    });
    // enableLocaleScoping: false forces entityLocale to null on create
    assert.equal(first.entityLocale, null);

    await new Promise((resolve) => setTimeout(resolve, 5));
    await service.create({
      title: "Second note",
      entitySlug: "api::page.page",
      entityDocumentId: "doc_page_1",
      entityLocale: "es",
    });

    const found = await service.find({
      entitySlug: "api::page.page",
      entityDocumentId: "doc_page_1",
      entityLocale: "en",
    });
    assert.equal(found.length, 2);
    // defaultSortOrder: "ASC" puts older note first
    assert.equal(found[0].title, "First note");
    assert.equal(found[1].title, "Second note");
  });

  it("registers RBAC permissions and enforces route policies", async () => {
    let registeredActions: any[] = [];
    const strapi: any = {
      admin: {
        services: {
          permission: {
            actionProvider: {
              async registerMany(actions: any[]) {
                registeredActions = actions;
              },
            },
          },
        },
      },
    };

    await bootstrap({ strapi });
    assert.equal(registeredActions.length, 3);
    assert.deepEqual(
      registeredActions.map((a) => a.uid),
      ["read", "update", "delete"]
    );

    assert.equal(adminRoutes.type, "admin");
    assert.equal(adminRoutes.routes.length, 6);
    for (const route of adminRoutes.routes) {
      assert.ok(
        Array.isArray(route.config.policies) &&
          route.config.policies.length === 2,
        `Route ${route.method} ${route.path} must have auth + RBAC policies`
      );
    }
  });

  it("persists notes via db.query and guards INT32 overflow", async () => {
    const dbRows: any[] = [];
    let lastFindManyArgs: any = null;
    const findOneWhereCalls: any[] = [];

    const strapi: any = {
      config: { get: () => ({}) },
      db: {
        query(uid: string) {
          assert.equal(uid, NOTE_CONTENT_TYPE_UID);
          return {
            async findMany(args: any) {
              lastFindManyArgs = args;
              return dbRows;
            },
            async findOne({ where }: any) {
              findOneWhereCalls.push(where);
              return (
                dbRows.find(
                  (r) =>
                    (where.id !== undefined && r.id === where.id) ||
                    (where.documentId !== undefined &&
                      r.documentId === where.documentId)
                ) ?? null
              );
            },
            async create({ data }: any) {
              const row = {
                id: dbRows.length + 1,
                documentId: `db_doc_${dbRows.length + 1}`,
                ...data,
                createdAt: "2026-03-01T10:00:00.000Z",
                updatedAt: "2026-03-01T10:00:00.000Z",
                // Simulate unpopulated relation stub returned by DB adapter
                createdBy: { id: data.createdBy },
                updatedBy: { id: data.updatedBy },
              };
              dbRows.push(row);
              return row;
            },
            async update({ where, data }: any) {
              const idx = dbRows.findIndex((r) => r.id === where.id);
              if (idx < 0) return null;
              dbRows[idx] = {
                ...dbRows[idx],
                ...data,
                updatedAt: "2026-03-02T12:00:00.000Z",
                updatedBy: { id: data.updatedBy ?? dbRows[idx].updatedBy?.id },
              };
              return dbRows[idx];
            },
            async delete({ where }: any) {
              const idx = dbRows.findIndex((r) => r.id === where.id);
              if (idx >= 0) dbRows.splice(idx, 1);
            },
          };
        },
      },
    };

    const service = createNotesService({ strapi });
    const created = await service.create(
      {
        title: "DB-backed note",
        content: "Stored via strapi.db.query",
        category: "todo",
        isPinned: true,
        entitySlug: "api::article.article",
        entityDocumentId: "doc_art_1",
        entityId: 9_999_999_999,
      },
      { id: 11, firstname: "Grace", lastname: "Hopper" }
    );

    assert.equal(created.id, 1);
    assert.equal(created.entityId, null);
    assert.equal(created.createdBy?.displayName, "Grace Hopper");

    // 11-digit numeric string must skip `where: { id }` and query documentId
    findOneWhereCalls.length = 0;
    await service.findOne("99999999999");
    assert.equal(findOneWhereCalls.length, 1);
    assert.deepEqual(findOneWhereCalls[0], { documentId: "99999999999" });

    const listed = await service.find({
      entitySlug: "api::article.article",
      category: "todo",
      isPinned: true,
    });
    assert.equal(listed.length, 1);
    assert.deepEqual(lastFindManyArgs.where, {
      entitySlug: "api::article.article",
      category: "todo",
      isPinned: true,
    });

    const updated = await service.update(
      1,
      { title: "DB-backed note (edited)", entityId: "doc_non_int" },
      { id: 22, firstname: "Alan", lastname: "Turing" }
    );
    assert.ok(updated);
    assert.equal(updated.title, "DB-backed note (edited)");
    assert.equal(updated.entityId, null);
    assert.equal(updated.createdBy?.displayName, "Grace Hopper");
    assert.equal(updated.updatedBy?.displayName, "Alan Turing");

    const deleted = await service.delete(1);
    assert.ok(deleted);
    assert.equal(await service.findOne(1), null);
    assert.equal(await service.update(1, { title: "Ghost" }), null);
  });

  it("persists notes via strapi.documents without db.query", async () => {
    const docs: any[] = [];
    const strapi: any = {
      config: { get: () => ({}) },
      documents(uid: string) {
        assert.equal(uid, NOTE_CONTENT_TYPE_UID);
        return {
          async findMany() {
            return docs;
          },
          async findOne({ documentId }: any) {
            return docs.find((d) => d.documentId === documentId) ?? null;
          },
          async create({ data }: any) {
            const doc = {
              id: docs.length + 1,
              documentId: `v5_doc_${docs.length + 1}`,
              ...data,
              createdAt: "2026-04-01T00:00:00.000Z",
              updatedAt: "2026-04-01T00:00:00.000Z",
            };
            docs.push(doc);
            return doc;
          },
          async update({ documentId, data }: any) {
            const idx = docs.findIndex((d) => d.documentId === documentId);
            if (idx < 0) return null;
            docs[idx] = { ...docs[idx], ...data };
            return docs[idx];
          },
          async delete({ documentId }: any) {
            const idx = docs.findIndex((d) => d.documentId === documentId);
            if (idx >= 0) docs.splice(idx, 1);
          },
        };
      },
    };

    const service = createNotesService({ strapi });
    const created = await service.create({
      title: "Document service note",
      entitySlug: "api::event.event",
      entityDocumentId: "doc_evt_9",
    });
    assert.equal(created.documentId, "v5_doc_1");

    const updated = await service.update("v5_doc_1", { isPinned: true });
    assert.ok(updated);
    assert.equal(updated.isPinned, true);

    const deleted = await service.delete("v5_doc_1");
    assert.ok(deleted);
    assert.equal((await service.find()).length, 0);
  });
});
