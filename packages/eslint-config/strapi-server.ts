import type { Linter } from "eslint";
import globals from "globals";

/**
 * Strapi v5 Server (Backend) ESLint configuration preset.
 * Targets plugin server controllers, services, routes, content-types, middlewares,
 * and Node.js CLI/automation scripts.
 * Note: `shared/` directories are intentionally excluded here because shared modules
 * are isomorphic (imported by both `admin` and `server` bundles).
 */
export const strapiServerConfig: Linter.Config = {
  name: "@vicacha-devs/eslint-config/strapi-server",
  files: [
    "packages/*/server/**/*.{js,mjs,cjs,ts,mts,cts}",
    "apps/dashboard/{src,config,database}/**/*.{js,mjs,cjs,ts,mts,cts}",
    "scripts/**/*.{js,mjs,cjs,ts,mts,cts}",
  ],
  ignores: ["apps/dashboard/src/admin/**"],
  languageOptions: {
    globals: {
      ...globals.node,
    },
  },
  rules: {
    "no-restricted-globals": [
      "error",
      {
        name: "window",
        message: "Do not access browser `window` inside Strapi server code.",
      },
      {
        name: "document",
        message: "Do not access browser `document` inside Strapi server code.",
      },
    ],
  },
};

export default strapiServerConfig;
