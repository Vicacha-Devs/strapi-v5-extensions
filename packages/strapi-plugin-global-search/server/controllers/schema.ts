import type { ContentTypeDescriptor, StrapiLike } from "../types";
import { PLUGIN_ID } from "../utils/constants";

type Ctx = {
  request: { query: Record<string, unknown>; body?: Record<string, unknown> };
  state: { userAbility?: { can: (action: string, subject: string) => boolean } | null };
  body?: unknown;
  throw: (code: number, msg: string) => void;
};

/** Field paths are internal detail; the admin only needs counts and labels. */
const toSummary = (type: ContentTypeDescriptor) => ({
  uid: type.uid,
  kind: type.kind,
  displayName: type.displayName,
  mainField: type.mainField,
  localized: type.localized,
  draftAndPublish: type.draftAndPublish,
  fieldCount: type.idFields.length + type.topLevelFields.length + type.nestedFields.length,
  searchable: type.searchable,
});

export default ({ strapi }: { strapi: StrapiLike }) => ({
  /** Powers the content-type filter chips on the search page. */
  async find(ctx: Ctx) {
    const types = await strapi.plugin(PLUGIN_ID).service("schema").getSearchableContentTypes();
    const readable = strapi
      .plugin(PLUGIN_ID)
      .service("permissions")
      .filterReadableTypes(types, ctx.state.userAbility);

    const settings = await strapi.plugin(PLUGIN_ID).service("settings").get();

    ctx.body = {
      contentTypes: readable.map(toSummary),
      settings: { minChars: settings.minChars, debounce: settings.debounce },
    };
  },

  /** Full picture, including excluded and unsearchable types, for Settings. */
  async findAll(ctx: Ctx) {
    const types = await strapi.plugin(PLUGIN_ID).service("schema").getAllContentTypes();
    const settings = await strapi.plugin(PLUGIN_ID).service("settings").get();

    ctx.body = {
      contentTypes: types.map((type: ContentTypeDescriptor) => ({
        ...toSummary(type),
        excluded: (settings.excludedContentTypes || []).includes(type.uid),
        fields: [...type.idFields, ...type.topLevelFields, ...type.nestedFields],
      })),
    };
  },
});
