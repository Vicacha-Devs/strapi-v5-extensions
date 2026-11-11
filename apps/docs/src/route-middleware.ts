import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

import { normalizeBase } from "./plugins/rehype-base-links.ts";

/**
 * Prefixes landing-page hero action links (frontmatter `hero.actions[].link`)
 * with the configured Astro `base`; Starlight leaves those untouched. No-op
 * when the site is served from "/".
 */
export const onRequest = defineRouteMiddleware((context) => {
  const base = normalizeBase(import.meta.env.BASE_URL);
  if (!base) return;
  const hero = context.locals.starlightRoute.entry.data.hero;
  for (const action of hero?.actions ?? []) {
    if (
      typeof action.link === "string" &&
      action.link.startsWith("/") &&
      !action.link.startsWith("//") &&
      !action.link.startsWith(`${base}/`)
    ) {
      action.link = `${base}${action.link}`;
    }
  }
});
