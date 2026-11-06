import type { ContentTypeDescriptor, StrapiLike } from "./types";
import { PLUGIN_ID } from "./utils/constants";

export default async ({ strapi }: { strapi: StrapiLike }) => {
  // Warm the schema cache so the first keystroke does not pay for introspection,
  // and surface a misconfigured install in the boot logs rather than at search time.
  try {
    const types = (await strapi
      .plugin(PLUGIN_ID)
      .service("schema")
      .getSearchableContentTypes()) as ContentTypeDescriptor[];

    const uidList = types.map((type) => type.uid).join(", ");
    strapi.log.debug(
      `[${PLUGIN_ID}] indexed ${types.length} content type(s): ${uidList}`
    );
  } catch (error) {
    const msg = (error as Error).message;
    strapi.log.error(
      `[${PLUGIN_ID}] failed to introspect content types: ${msg}`
    );
  }
};
