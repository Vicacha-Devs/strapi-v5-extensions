import type {
  ContentTypeDescriptor,
  PluginSettings,
  StrapiLike,
} from "../types";
import {
  PLUGIN_ID,
  SEARCHABLE_SCALAR_TYPES,
  SYSTEM_PLUGIN_PREFIXES,
  SKIPPED_ATTRIBUTE_TYPES,
  BLOCKLISTED_ATTRIBUTE_NAMES,
  IDENTIFIER_FIELDS,
  MAIN_FIELD_FALLBACKS,
} from "../utils/constants";

export interface AttributeLike {
  type?: string;
  private?: boolean;
  searchable?: boolean;
  component?: string;
  customField?: string;
}

export interface ContentTypeLike {
  uid: string;
  kind?: string;
  apiName?: string;
  attributes?: Record<string, AttributeLike>;
  info?: { displayName?: string; singularName?: string };
  pluginOptions?: {
    "i18n"?: { localized?: boolean };
    "content-manager"?: { visible?: boolean };
  };
  options?: { draftAndPublish?: boolean };
}

interface SchemaCache {
  signature: string;
  types: ContentTypeDescriptor[];
}

export default ({ strapi }: { strapi: StrapiLike }) => {
  let cache: SchemaCache | null = null;

  const computeSignature = (settings: PluginSettings): string =>
    JSON.stringify({
      settings,
      uids: Object.keys(strapi.contentTypes).sort(),
    });

  return {
    /**
     * Content types the plugin is allowed to look at: the app's own `api::` types
     * plus user-facing `plugin::` types (excluding internal Strapi system plugins
     * and types explicitly hidden from the Content Manager).
     */
    listCandidateUids(includePluginContentTypes = true): string[] {
      return Object.keys(strapi.contentTypes).filter((uid) => {
        if (uid.startsWith("api::")) return true;
        if (!includePluginContentTypes || !uid.startsWith("plugin::"))
          return false;
        if (SYSTEM_PLUGIN_PREFIXES.some((prefix) => uid.startsWith(prefix)))
          return false;

        const contentType = strapi.contentTypes[uid] as
          | ContentTypeLike
          | undefined;
        if (contentType?.pluginOptions?.["content-manager"]?.visible === false)
          return false;

        return true;
      });
    },

    isSearchableAttribute(
      name: string,
      attribute: AttributeLike | undefined
    ): boolean {
      if (
        !attribute ||
        BLOCKLISTED_ATTRIBUTE_NAMES.includes(name) ||
        /token|secret|password|privatekey|apikey|hash/i.test(name)
      )
        return false;
      if (attribute.private === true) return false;
      if (attribute.searchable === false) return false;
      if (attribute.type && SKIPPED_ATTRIBUTE_TYPES.includes(attribute.type))
        return false;

      return Boolean(
        attribute.type && SEARCHABLE_SCALAR_TYPES.includes(attribute.type)
      );
    },

    isSafeDisplayAttribute(
      name: string,
      attribute: AttributeLike | undefined
    ): boolean {
      if (!name || typeof name !== "string") return false;
      if (
        BLOCKLISTED_ATTRIBUTE_NAMES.includes(name) ||
        /token|secret|password|privatekey|apikey|hash/i.test(name)
      )
        return false;
      if (!attribute || attribute.private === true) return false;
      if (attribute.type && SKIPPED_ATTRIBUTE_TYPES.includes(attribute.type))
        return false;
      return true;
    },

    /**
     * Flattens an attribute map into dotted, searchable field paths, walking into
     * components up to `maxDepth`. `visited` breaks component cycles (a component
     * that, directly or not, contains itself).
     */
    collectFieldPaths(
      attributes: Record<string, AttributeLike> = {},
      {
        maxDepth,
        depth = 0,
        prefix = "",
        visited = new Set<string>(),
      }: {
        maxDepth: number;
        depth?: number;
        prefix?: string;
        visited?: Set<string>;
      } = {
        maxDepth: 0,
      }
    ): string[] {
      const paths: string[] = [];

      Object.entries(attributes).forEach(([name, attribute]) => {
        const path = prefix ? `${prefix}.${name}` : name;

        if (this.isSearchableAttribute(name, attribute)) {
          paths.push(path);
          return;
        }

        if (attribute.type !== "component" || depth >= maxDepth) return;

        const component = strapi.components[attribute.component as string];
        if (
          !component ||
          !attribute.component ||
          visited.has(attribute.component)
        )
          return;

        paths.push(
          ...this.collectFieldPaths(component.attributes, {
            maxDepth,
            depth: depth + 1,
            prefix: path,
            visited: new Set([...visited, attribute.component]),
          })
        );
      });

      return paths;
    },

    /** Resolves the field the Content Manager uses to label an entry. */
    async resolveMainField(contentType: ContentTypeLike): Promise<string> {
      try {
        const configuration = await strapi
          .plugin("content-manager")
          .service("content-types")
          .findConfiguration(contentType);

        const mainField =
          configuration &&
          configuration.settings &&
          configuration.settings.mainField;

        if (
          mainField &&
          mainField !== "id" &&
          this.isSafeDisplayAttribute(
            mainField,
            contentType.attributes?.[mainField]
          )
        ) {
          return mainField;
        }
      } catch (error) {
        const msg = (error as Error).message;
        strapi.log.debug(
          `[${PLUGIN_ID}] CM config read failed (${contentType.uid}): ${msg}`
        );
      }

      const fallback = MAIN_FIELD_FALLBACKS.find((name) =>
        this.isSearchableAttribute(name, contentType.attributes?.[name])
      );

      return fallback || "id";
    },

    extractExcludedFields(uid: string, excludedFields?: string[]): Set<string> {
      return new Set(
        (excludedFields || [])
          .filter(
            (entry): entry is string =>
              typeof entry === "string" &&
              (entry.startsWith(`${uid}:`) || entry.startsWith(`${uid}.`))
          )
          .map((entry) => entry.slice(uid.length + 1))
      );
    },

    resolveDisplayName(uid: string, info?: ContentTypeLike["info"]): string {
      return info?.displayName || info?.singularName || uid;
    },

    hasAnySearchableField(
      fields: {
        idFields: string[];
        topLevelFields: string[];
        nestedFields: string[];
      },
      isMainSearchable: boolean
    ): boolean {
      if (fields.idFields.length > 0 || fields.topLevelFields.length > 0)
        return true;
      return fields.nestedFields.length > 0 || isMainSearchable;
    },

    async describeContentType(
      uid: string,
      settings: PluginSettings
    ): Promise<ContentTypeDescriptor | null> {
      const contentType = strapi.contentTypes[uid] as
        | ContentTypeLike
        | undefined;
      if (!contentType) return null;

      const attributes = contentType.attributes || {};
      const excludedForType = this.extractExcludedFields(
        uid,
        settings.excludedFields
      );
      const allPaths = this.collectFieldPaths(attributes, {
        maxDepth: settings.maxDepth,
      }).filter((path) => !excludedForType.has(path));
      const mainField = await this.resolveMainField(contentType);
      const mainFieldSearchable =
        !excludedForType.has(mainField) &&
        this.isSearchableAttribute(mainField, attributes[mainField]);

      const idFields = [
        "documentId",
        ...IDENTIFIER_FIELDS.filter((name) =>
          this.isSearchableAttribute(name, attributes[name])
        ),
      ].filter((name) => !excludedForType.has(name));

      const topLevelFields = allPaths.filter(
        (path) =>
          !path.includes(".") && path !== mainField && !idFields.includes(path)
      );
      const nestedFields = settings.deep
        ? allPaths.filter((path) => path.includes("."))
        : [];

      const rawDisplay = settings.displayFields?.[uid];
      const displayFields = Array.isArray(rawDisplay)
        ? rawDisplay
            .filter((name) =>
              this.isSafeDisplayAttribute(name, attributes[name])
            )
            .slice(0, 2)
        : [];

      return {
        uid,
        kind: contentType.kind || "collectionType",
        displayName: this.resolveDisplayName(uid, contentType.info),
        apiName: contentType.apiName,
        mainField,
        mainFieldSearchable,
        idFields,
        topLevelFields,
        nestedFields,
        displayFields,
        localized: Boolean(contentType.pluginOptions?.i18n?.localized),
        draftAndPublish: Boolean(contentType.options?.draftAndPublish),
        /** Nothing to match against — the type is listed but never queried. */
        searchable: this.hasAnySearchableField(
          { idFields, topLevelFields, nestedFields },
          mainFieldSearchable
        ),
      };
    },

    async getSearchableContentTypes({
      force = false,
    }: { force?: boolean } = {}): Promise<ContentTypeDescriptor[]> {
      const settings = (await strapi
        .plugin(PLUGIN_ID)
        .service("settings")
        .get()) as PluginSettings;
      const signature = computeSignature(settings);

      if (cache && !force && cache.signature === signature) {
        return cache.types;
      }

      const excluded = new Set(settings.excludedContentTypes || []);
      const includePlugins = settings.includePluginContentTypes !== false;

      const described = await Promise.all(
        this.listCandidateUids(includePlugins)
          .filter((uid) => !excluded.has(uid))
          .map((uid) => this.describeContentType(uid, settings))
      );

      const types = described
        .filter((type): type is ContentTypeDescriptor =>
          Boolean(type && type.searchable)
        )
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      cache = { signature, types };

      return types;
    },

    /** Every candidate type, searchable or not — the Settings page needs the full list. */
    async getAllContentTypes(): Promise<ContentTypeDescriptor[]> {
      const settings = (await strapi
        .plugin(PLUGIN_ID)
        .service("settings")
        .get()) as PluginSettings;
      const includePlugins = settings.includePluginContentTypes !== false;
      const described = await Promise.all(
        this.listCandidateUids(includePlugins).map((uid) =>
          this.describeContentType(uid, settings)
        )
      );

      return described
        .filter((type): type is ContentTypeDescriptor => Boolean(type))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
    },

    clearCache() {
      cache = null;
    },
  };
};
