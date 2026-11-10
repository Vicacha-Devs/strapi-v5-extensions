import type { Core } from "@strapi/strapi";

import { CONTENT_TYPE_UIDS } from "../../../shared";
import {
  DEFAULT_SEED_GALLERY_ALBUMS,
  DEFAULT_SEED_GLOSSARY_TERMS,
  DEFAULT_SEED_PUBLICATIONS,
} from "./seedData";

export const MAX_SCAN_WINDOW = 500;

const documentLocks = new Map<string, Promise<void>>();

/**
 * Serializes concurrent async mutations per key (`slug` or `documentId`) so
 * parallel download counter increments never race in-process.
 */
export async function withDocumentLock<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const previous = documentLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(
    () => gate,
    () => gate
  );
  documentLocks.set(key, tail);

  await previous.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (documentLocks.get(key) === tail) {
      documentLocks.delete(key);
    }
  }
}

/**
 * Determines whether a published version exists for `(documentId, locale)` so
 * updates preserve `"draft"` status on unpublished drafts while keeping
 * published entries `"published"`.
 */
export async function resolveDocumentTargetStatus(
  docs: Core.DocumentServiceInstance,
  documentId: string,
  locale?: string
): Promise<"draft" | "published"> {
  const pubCheck = await docs.findMany({
    ...(locale ? { locale } : {}),
    status: "published",
    filters: { documentId },
    limit: 1,
  });
  return Array.isArray(pubCheck) && pubCheck.length > 0 ? "published" : "draft";
}

/**
 * Atomically increments `downloadCount` via SQL (`strapi.db.connection`) when
 * available so editorial drafts are never dirtied, recovering `NULL` / `< 0`
 * rows cleanly and falling back to a `status: "published"` Document Service
 * update inside `withDocumentLock`.
 */
export async function incrementPublicationDownloadCount(
  strapi: Core.Strapi,
  documentId: string | undefined,
  locale: string | undefined,
  currentCount: number
): Promise<number> {
  const safeBase =
    typeof currentCount === "number" && Number.isFinite(currentCount)
      ? Math.max(0, Math.trunc(currentCount))
      : 0;

  if (!documentId) {
    return safeBase + 1;
  }

  const dbConn = strapi.db?.connection;
  if (typeof dbConn === "function") {
    const tableName =
      strapi.contentTypes?.[CONTENT_TYPE_UIDS.publication]?.collectionName ||
      "resources_publications";
    await dbConn(tableName)
      .where({ document_id: documentId })
      .increment("download_count", 1);

    const rows = await dbConn(tableName)
      .where({ document_id: documentId })
      .select("download_count");
    let maxObserved = safeBase + 1;
    let hasInvalidOrNullRow = false;

    if (Array.isArray(rows)) {
      for (const r of rows) {
        const raw = r?.download_count;
        if (raw === null || raw === undefined) {
          hasInvalidOrNullRow = true;
          continue;
        }
        const val = Number(raw);
        if (!Number.isFinite(val) || val < 0) {
          hasInvalidOrNullRow = true;
          continue;
        }
        if (val > maxObserved) {
          maxObserved = Math.trunc(val);
        }
      }
    }

    if (hasInvalidOrNullRow) {
      const recovered = Math.max(1, maxObserved);
      const whereChain = dbConn(tableName).where({ document_id: documentId });
      if (typeof whereChain.update === "function") {
        await whereChain.update({ download_count: recovered });
      }
      return recovered;
    }

    return Math.max(1, maxObserved);
  }

  const nextCount = safeBase + 1;
  await strapi.documents(CONTENT_TYPE_UIDS.publication).update({
    documentId,
    ...(locale ? { locale } : {}),
    status: "published",
    data: { downloadCount: nextCount },
  });
  return nextCount;
}

export function clampListWindow(params?: {
  page?: number;
  pageSize?: number;
  limit?: number;
}): {
  page: number;
  pageSize: number;
  offset: number;
  fetchLimit: number;
} {
  const rawPage = params?.page;
  const page =
    typeof rawPage === "number" && Number.isFinite(rawPage)
      ? Math.max(1, Math.min(10_000, Math.trunc(rawPage)))
      : 1;

  const rawLimit = params?.limit ?? params?.pageSize;
  const pageSize =
    typeof rawLimit === "number" && Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(100, Math.trunc(rawLimit)))
      : 100;

  const offset = (page - 1) * pageSize;
  const fetchLimit = Math.min(MAX_SCAN_WINDOW, offset + pageSize);

  return {
    page,
    pageSize,
    offset,
    fetchLimit,
  };
}

async function documentExistsBySlugAndLocale(
  docs: Core.DocumentServiceInstance,
  slug: string,
  locale: string
): Promise<boolean> {
  const draftOrAny = await docs.findMany({
    locale,
    filters: { slug },
    limit: 1,
  });
  if (Array.isArray(draftOrAny) && draftOrAny.length > 0) {
    return true;
  }
  const published = await docs.findMany({
    locale,
    status: "published",
    filters: { slug },
    limit: 1,
  });
  return Array.isArray(published) && published.length > 0;
}

export async function seedDefaultCatalogRecords(
  strapi: Core.Strapi
): Promise<void> {
  const pubDocs = strapi.documents(CONTENT_TYPE_UIDS.publication);
  for (const item of DEFAULT_SEED_PUBLICATIONS) {
    const exists = await documentExistsBySlugAndLocale(
      pubDocs,
      item.slug,
      item.locale
    );
    if (!exists) {
      const { locale, ...data } = item;
      await pubDocs.create({
        locale,
        status: "published",
        data: { ...data, downloadCount: 0 },
      });
    }
  }

  const albumDocs = strapi.documents(CONTENT_TYPE_UIDS.galleryAlbum);
  for (const item of DEFAULT_SEED_GALLERY_ALBUMS) {
    const exists = await documentExistsBySlugAndLocale(
      albumDocs,
      item.slug,
      item.locale
    );
    if (!exists) {
      const { locale, ...data } = item;
      await albumDocs.create({
        locale,
        status: "published",
        data: { ...data, photoCount: 0 },
      });
    }
  }

  const glossaryDocs = strapi.documents(CONTENT_TYPE_UIDS.glossaryTerm);
  for (const item of DEFAULT_SEED_GLOSSARY_TERMS) {
    const exists = await documentExistsBySlugAndLocale(
      glossaryDocs,
      item.slug,
      item.locale
    );
    if (!exists) {
      const { locale, ...data } = item;
      await glossaryDocs.create({
        locale,
        status: "published",
        data,
      });
    }
  }
}
