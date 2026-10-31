import type { Linter } from "eslint";
import { defineConfig } from "eslint/config";

import { STRAPI_GLOBAL_IGNORES, STRAPI_SHARED_RULES, strapiBaseConfig } from "./base.ts";
import { strapiAdminConfig } from "./strapi-admin.ts";
import { strapiServerConfig } from "./strapi-server.ts";

export {
  STRAPI_GLOBAL_IGNORES,
  STRAPI_SHARED_RULES,
  strapiAdminConfig,
  strapiBaseConfig,
  strapiServerConfig,
};

/**
 * Complete Strapi v5 ESLint Flat Config combining:
 * 1. Base TypeScript, SonarJS, JSON & Vitest rules (with strict <= 500 physical lines)
 * 2. Strapi Admin (Frontend) React + JSX-a11y + browser globals preset
 * 3. Strapi Server (Backend) Node.js globals + restricted DOM globals preset
 */
export const strapiMonorepoConfig: Linter.Config[] = defineConfig([
  ...strapiBaseConfig,
  strapiAdminConfig,
  strapiServerConfig,
]);

export default strapiMonorepoConfig;
