import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FORM_BUILDER_CMS_FORM_UID } from "../shared";
import { createMockStrapi } from "./mockStrapi";

describe("file upload fields", () => {
  it("preserves native file upload field config across Form Builder CMS sync", async () => {
    const { strapi, services } = createMockStrapi();
    const created = await services.formService.createFromTemplate(
      "service-desk-application"
    );
    const fileField = created.fields.find((f) => f.type === "file");
    assert.ok(fileField);
    assert.equal(fileField.name, "supportingDocuments");
    assert.equal(fileField.accept, ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx");
    assert.equal(fileField.maxSizeMb, 10);
    assert.equal(fileField.multiple, true);
    assert.equal(fileField.maxFiles, 5);

    const cmsForm = await (
      strapi.db as {
        query: (uid: string) => {
          findOne: (arg: {
            where: Record<string, unknown>;
          }) => Promise<Record<string, unknown> | null>;
        };
      }
    )
      .query(FORM_BUILDER_CMS_FORM_UID)
      .findOne({ where: { id: created.formBuilderId } });
    assert.ok(cmsForm);
    const cmsFields = cmsForm.fields as Array<Record<string, unknown>>;
    const cmsFileField = cmsFields.find(
      (f) => f.name === "supportingDocuments"
    );
    assert.ok(cmsFileField);
    assert.equal(cmsFileField.type, "file");
    assert.equal(cmsFileField.accept, ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx");
    assert.equal(cmsFileField.maxSizeMb, 10);
    assert.equal(cmsFileField.multiple, true);
    assert.equal(cmsFileField.maxFiles, 5);

    await services.formService.syncWithFormBuilderCms();
    const resynced = await services.formService.findBySlug("service-request");
    const resyncedFile = resynced?.fields.find(
      (f) => f.name === "supportingDocuments"
    );
    assert.ok(resyncedFile);
    assert.equal(resyncedFile.type, "file");
    assert.equal(resyncedFile.maxSizeMb, 10);
    assert.equal(resyncedFile.maxFiles, 5);
  });
});
