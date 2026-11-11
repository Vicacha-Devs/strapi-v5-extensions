import type { Linter } from "eslint";
// @ts-expect-error -- eslint-plugin-jsx-a11y does not ship bundled TypeScript declarations
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

/**
 * Strapi v5 Admin (Frontend) ESLint configuration preset.
 * Targets Strapi Design System React components, custom fields, settings pages,
 * and browser-side documentation/dashboard UI code.
 */
export const strapiAdminConfig: Linter.Config = {
  name: "@vicacha-devs/eslint-config/strapi-admin",
  files: [
    "packages/*/admin/**/*.{js,jsx,ts,tsx}",
    "apps/dashboard/src/admin/**/*.{js,jsx,ts,tsx}",
    "apps/docs/src/**/*.{js,jsx,ts,tsx,mjs}",
  ],
  plugins: {
    "jsx-a11y": jsxA11y as Record<string, unknown>,
  },
  languageOptions: {
    globals: {
      ...globals.browser,
    },
  },
  rules: {
    "jsx-a11y/alt-text": "warn",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-proptypes": "error",
    "jsx-a11y/aria-unsupported-elements": "error",
    "jsx-a11y/role-has-required-aria-props": "error",
    "jsx-a11y/role-supports-aria-props": "error",
  },
};

export default strapiAdminConfig;
