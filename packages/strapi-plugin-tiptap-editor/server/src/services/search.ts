import type { Core } from "@strapi/strapi";
import { isSensitiveFieldName } from "@vicacha-devs/plugin-shared";

import { LINKS_COMPONENT_UID } from "../bootstrap";

export interface SearchDocumentHit {
  documentId: string;
  id?: number | string;
  label: string;
  collectionName: string;
  status: string;
  locale?: string;
}

export interface AdminUserAbility {
  cannot?: (action: string, subject?: string, field?: string) => boolean;
  can?: (action: string, subject?: string, field?: string) => boolean;
}

interface ContentTypeAttributeSchema {
  type?: string;
  private?: boolean;
  target?: string;
}

interface ContentTypeSchema {
  kind?: string;
  info?: {
    pluralName?: string;
  };
  attributes?: Record<string, ContentTypeAttributeSchema>;
}

interface ComponentSchema {
  attributes?: Record<string, ContentTypeAttributeSchema>;
}

interface StrapiDocumentRecord {
  documentId?: string;
  id?: number | string;
  publishedAt?: string | null;
  locale?: string;
  [key: string]: unknown;
}

interface DocumentsServiceInstance {
  findMany(params?: Record<string, unknown>): Promise<StrapiDocumentRecord[]>;
  findOne(
    params: Record<string, unknown>
  ): Promise<StrapiDocumentRecord | null>;
}

interface PermissionCheckerInstance {
  sanitizedQuery?: {
    read?: (query: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  cannot?: {
    read?: (entity: StrapiDocumentRecord) => boolean;
  };
}

interface PermissionCheckerService {
  create?: (options: {
    userAbility?: AdminUserAbility;
    model: string;
  }) => PermissionCheckerInstance;
}

interface StrapiSearchInternal {
  contentTypes?: Record<string, ContentTypeSchema>;
  components?: Record<string, ComponentSchema>;
  documents?: (uid: string) => DocumentsServiceInstance;
  plugin?: (
    name: string
  ) =>
    | { service?: (name: string) => PermissionCheckerService | undefined }
    | undefined;
}

export const MAX_SEARCH_QUERY_LENGTH = 200;
const LOCALE_FORMAT_RE = /^[a-zA-Z]{2,3}(?:[-_][a-zA-Z0-9]{2,8})*$/;

const TITLE_CANDIDATES = [
  "title",
  "name",
  "label",
  "headline",
  "subject",
  "slug",
];
const STRING_TYPES = new Set(["string", "text", "uid", "email"]);

/**
 * Validates that a locale parameter matches standard Strapi/BCP-47 locale code format.
 */
export const isValidLocaleFormat = (locale: string): boolean =>
  LOCALE_FORMAT_RE.test(locale);

/**
 * Validates that a collection UID follows Strapi's `api::name.name` or `plugin::name.name` pattern.
 */
const isSafeCollectionUid = (uid: string): boolean =>
  /^(api::[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+|plugin::[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)$/.test(
    uid
  );

/**
 * Checks whether the current admin user ability permits reading from `collectionUid` (and optional `field`).
 * Fails closed (`false`) when `userAbility` is absent or lacks permission-checking methods.
 */
export function canReadCollection(
  collectionUid: string,
  userAbility?: AdminUserAbility,
  field?: string
): boolean {
  if (!userAbility) return false;
  if (typeof userAbility.cannot === "function") {
    return !userAbility.cannot(
      "plugin::content-manager.explorer.read",
      collectionUid,
      field
    );
  }
  if (typeof userAbility.can === "function") {
    return Boolean(
      userAbility.can(
        "plugin::content-manager.explorer.read",
        collectionUid,
        field
      )
    );
  }
  return false;
}

/**
 * Creates the internal Strapi document search and resolution service for the Linker extension.
 */
const createSearchService = ({ strapi }: { strapi: Core.Strapi }) => {
  const internalStrapi = strapi as unknown as StrapiSearchInternal;

  return {
    /**
     * Identifies the best human-readable label field for a given Strapi collection type UID.
     */
    identifyCollectionTitleField(collectionName: string): string {
      if (!isSafeCollectionUid(collectionName)) {
        throw new Error("Invalid collectionName format");
      }

      const contentTypes = internalStrapi?.contentTypes;
      const schema = contentTypes?.[collectionName];
      const attributes = schema?.attributes;

      if (!attributes || typeof attributes !== "object") {
        return "documentId";
      }

      for (const candidate of TITLE_CANDIDATES) {
        if (isSensitiveFieldName(candidate)) continue;
        const attr = attributes[candidate];
        if (
          attr &&
          !attr.private &&
          typeof attr.type === "string" &&
          STRING_TYPES.has(attr.type)
        ) {
          return candidate;
        }
      }

      for (const [fieldName, attr] of Object.entries(attributes)) {
        if (isSensitiveFieldName(fieldName)) continue;
        if (
          attr &&
          !attr.private &&
          typeof attr.type === "string" &&
          STRING_TYPES.has(attr.type)
        ) {
          return fieldName;
        }
      }

      return "documentId";
    },

    /**
     * Returns all collection type UIDs configured in 'links.links' or falls back to api::* collection types.
     */
    getLinkableCollections(
      userAbility?: AdminUserAbility
    ): Array<{ attributeName: string; targetUid: string }> {
      const components = internalStrapi?.components;
      const linksComp = components?.[LINKS_COMPONENT_UID];
      const results: Array<{ attributeName: string; targetUid: string }> = [];
      let hasConfiguredTargets = false;

      if (linksComp?.attributes && typeof linksComp.attributes === "object") {
        for (const [attrName, attrDef] of Object.entries(
          linksComp.attributes
        )) {
          if (
            attrDef?.type === "relation" &&
            typeof attrDef.target === "string" &&
            isSafeCollectionUid(attrDef.target)
          ) {
            hasConfiguredTargets = true;
            if (canReadCollection(attrDef.target, userAbility)) {
              results.push({
                attributeName: attrName,
                targetUid: attrDef.target,
              });
            }
          }
        }
      }

      if (hasConfiguredTargets) {
        return results;
      }

      // Fallback: discover api::* collection types permitted by userAbility
      const contentTypes = internalStrapi?.contentTypes;
      if (contentTypes && typeof contentTypes === "object") {
        for (const [uid, schema] of Object.entries(contentTypes)) {
          if (
            uid.startsWith("api::") &&
            (schema?.kind === "collectionType" || !schema?.kind) &&
            canReadCollection(uid, userAbility)
          ) {
            const shortName =
              schema?.info?.pluralName || uid.split(".")[1] || uid;
            results.push({ attributeName: shortName, targetUid: uid });
          }
        }
      }

      return results;
    },

    /**
     * Searches across all linkable collections permitted by `userAbility` for documents matching query and optional locale.
     */
    async search(
      rawQuery: string,
      locale?: string,
      userAbility?: AdminUserAbility
    ): Promise<Record<string, SearchDocumentHit[]>> {
      const query = (rawQuery ?? "").trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
      if (!query) return {};

      const cleanLocale = typeof locale === "string" ? locale.trim() : "";
      if (cleanLocale && !isValidLocaleFormat(cleanLocale)) {
        throw new Error("Invalid locale format");
      }
      const effectiveLocale = cleanLocale || undefined;

      const collections = this.getLinkableCollections(userAbility);
      const resultsByCollection: Record<string, SearchDocumentHit[]> = {};

      for (const { targetUid } of collections) {
        if (!canReadCollection(targetUid, userAbility)) {
          continue;
        }
        const titleField = this.identifyCollectionTitleField(targetUid);
        if (
          titleField !== "documentId" &&
          !canReadCollection(targetUid, userAbility, titleField)
        ) {
          continue;
        }
        try {
          const documentsApi = internalStrapi?.documents;
          if (typeof documentsApi === "function") {
            const filters =
              titleField === "documentId"
                ? { documentId: { $containsi: query } }
                : {
                    $or: [
                      { [titleField]: { $containsi: query } },
                      { documentId: { $containsi: query } },
                    ],
                  };

            const checker = internalStrapi
              ?.plugin?.("content-manager")
              ?.service?.("permission-checker")
              ?.create?.({ userAbility, model: targetUid });
            const baseQuery: Record<string, unknown> = {
              filters,
              limit: 10,
              ...(effectiveLocale ? { locale: effectiveLocale } : {}),
            };
            const permissionQuery =
              typeof checker?.sanitizedQuery?.read === "function"
                ? await checker.sanitizedQuery.read(baseQuery)
                : baseQuery;
            const docs =
              await documentsApi(targetUid).findMany(permissionQuery);
            const permittedDocs = Array.isArray(docs)
              ? docs.filter(
                  (doc: StrapiDocumentRecord) =>
                    !(
                      typeof checker?.cannot?.read === "function" &&
                      checker.cannot.read(doc)
                    )
                )
              : [];

            if (permittedDocs.length > 0) {
              const publishedDocs = await documentsApi(targetUid).findMany({
                fields: ["documentId"],
                filters: {
                  documentId: {
                    $in: permittedDocs
                      .map((doc: StrapiDocumentRecord) => doc.documentId)
                      .filter((id): id is string => Boolean(id)),
                  },
                },
                status: "published",
                limit: permittedDocs.length,
                ...(effectiveLocale ? { locale: effectiveLocale } : {}),
              });
              const publishedDocumentIds = new Set(
                (Array.isArray(publishedDocs) ? publishedDocs : []).map(
                  (doc: StrapiDocumentRecord) => String(doc.documentId ?? "")
                )
              );

              resultsByCollection[targetUid] = permittedDocs.map(
                (doc: StrapiDocumentRecord) => ({
                  documentId: String(doc.documentId ?? doc.id ?? ""),
                  id: doc.id,
                  label: String(
                    doc[titleField] || doc.documentId || doc.id || ""
                  ),
                  collectionName: targetUid,
                  status:
                    doc.publishedAt ||
                    publishedDocumentIds.has(String(doc.documentId ?? ""))
                      ? "published"
                      : "draft",
                  locale: doc.locale,
                })
              );
            }
          }
        } catch (err) {
          strapi?.log?.warn?.(
            `[tiptap-editor] Search failed on ${targetUid}: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }

      return resultsByCollection;
    },

    /**
     * Resolves a single document by collection UID and documentId after verifying read permission.
     */
    async getDocument(
      collectionName: string,
      documentId: string,
      locale?: string,
      userAbility?: AdminUserAbility
    ): Promise<SearchDocumentHit | null> {
      if (!isSafeCollectionUid(collectionName)) {
        throw new Error("Invalid collectionName format");
      }
      const cleanDocId = (documentId ?? "").trim();
      if (!cleanDocId || !/^[a-zA-Z0-9_-]+$/.test(cleanDocId)) {
        throw new Error("Invalid documentId format");
      }
      const cleanLocale = typeof locale === "string" ? locale.trim() : "";
      if (cleanLocale && !isValidLocaleFormat(cleanLocale)) {
        throw new Error("Invalid locale format");
      }
      const effectiveLocale = cleanLocale || undefined;

      const titleField = this.identifyCollectionTitleField(collectionName);
      if (
        !canReadCollection(collectionName, userAbility) ||
        (titleField !== "documentId" &&
          !canReadCollection(collectionName, userAbility, titleField))
      ) {
        const forbiddenError = new Error("Forbidden") as Error & {
          status?: number;
        };
        forbiddenError.status = 403;
        throw forbiddenError;
      }

      const documentsApi = internalStrapi?.documents;
      if (typeof documentsApi !== "function") {
        return null;
      }

      const checker = internalStrapi
        ?.plugin?.("content-manager")
        ?.service?.("permission-checker")
        ?.create?.({ userAbility, model: collectionName });
      const baseQuery: Record<string, unknown> = {
        documentId: cleanDocId,
        ...(effectiveLocale ? { locale: effectiveLocale } : {}),
      };
      const permissionQuery =
        typeof checker?.sanitizedQuery?.read === "function"
          ? await checker.sanitizedQuery.read(baseQuery)
          : baseQuery;

      const doc = await documentsApi(collectionName).findOne({
        ...permissionQuery,
        documentId: cleanDocId,
        ...(effectiveLocale ? { locale: effectiveLocale } : {}),
      });

      if (!doc) return null;

      if (
        typeof checker?.cannot?.read === "function" &&
        checker.cannot.read(doc)
      ) {
        const forbiddenError = new Error("Forbidden") as Error & {
          status?: number;
        };
        forbiddenError.status = 403;
        throw forbiddenError;
      }

      const publishedDoc = doc.publishedAt
        ? doc
        : await documentsApi(collectionName).findOne({
            documentId: cleanDocId,
            status: "published",
            ...(effectiveLocale ? { locale: effectiveLocale } : {}),
          });

      return {
        documentId: String(doc.documentId ?? cleanDocId),
        id: doc.id,
        label: String(doc[titleField] || doc.documentId || cleanDocId),
        collectionName,
        status: publishedDoc?.publishedAt ? "published" : "draft",
        locale: doc.locale,
      };
    },
  };
};

export default createSearchService;
