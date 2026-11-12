import js from "@eslint/js";
import json from "@eslint/json";
import vitest from "@vitest/eslint-plugin";
import type { Linter } from "eslint";
import { importX } from "eslint-plugin-import-x";
import { configs as sonarjs } from "eslint-plugin-sonarjs";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export const STRAPI_GLOBAL_IGNORES: string[] = [
  "coverage",
  "**/coverage",
  "dist",
  "**/dist",
  "build",
  "**/build",
  ".strapi",
  "**/.strapi",
  ".astro",
  "**/.astro",
  ".turbo",
  "**/.turbo",
  "node_modules",
  "**/node_modules",
  ".github",
  ".vscode",
  "**/public/vendor/**",
  "**/*.mdx",
  "**/*.md",
  "**/*.css",
];

export const STRAPI_SHARED_RULES: Linter.RulesRecord = {
  "max-len": [
    "error",
    {
      code: 80,
      tabWidth: 2,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true,
      ignoreComments: true,
    },
  ],
  "max-lines": [
    "error",
    {
      max: 500,
      skipBlankLines: false,
      skipComments: false,
    },
  ],
  "no-console": ["warn", { allow: ["warn", "error"] }],
  "no-control-regex": "off",
  "no-eval": "error",
  "no-implied-eval": "error",
  "no-new-func": "error",
  "no-var": "error",
  "prefer-const": "error",
  "eqeqeq": ["error", "always", { null: "ignore" }],
  "@typescript-eslint/no-empty-object-type": "off",
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/consistent-type-imports": [
    "warn",
    {
      prefer: "type-imports",
      disallowTypeAnnotations: false,
    },
  ],
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
    },
  ],
  "import-x/no-unresolved": "off",
  "import-x/no-duplicates": "warn",
};

export const strapiBaseConfig: Linter.Config[] = defineConfig([
  globalIgnores(STRAPI_GLOBAL_IGNORES),
  {
    ...sonarjs.recommended,
    ignores: ["**/*.{json,md,mdx,css}"],
    rules: {
      ...sonarjs.recommended.rules,
      // Duplicate of @typescript-eslint/no-unused-vars (lacks ^_ ignore rules)
      "sonarjs/no-unused-vars": "off",
      // Stylistic rules conflicting with JSX, ASCII regexes & TS types
      "sonarjs/cognitive-complexity": "off",
      "sonarjs/concise-regex": "off",
      "sonarjs/no-nested-conditional": "off",
      "sonarjs/no-nested-functions": "off",
      "sonarjs/no-nested-template-literals": "off",
      "sonarjs/redundant-type-aliases": "off",
      "sonarjs/use-type-alias": "off",
      // Surfaced as warnings without blocking builds on existing helpers
      "sonarjs/no-duplicated-branches": "warn",
      "sonarjs/no-identical-functions": "warn",
      "sonarjs/no-inverted-boolean-check": "warn",
      "sonarjs/no-nested-assignment": "warn",
      "sonarjs/pseudo-random": "warn",
      "sonarjs/slow-regex": "warn",
      "sonarjs/super-linear-regex": "warn",
      "sonarjs/todo-tag": "warn",
    },
  },
  importX.configs.typescript as Linter.Config,
  {
    name: "@vicacha-devs/eslint-config/base",
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    plugins: {
      js,
      "import-x": importX as unknown as Record<string, unknown>,
    },
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: STRAPI_SHARED_RULES,
  },
  {
    name: "@vicacha-devs/eslint-config/admin-void",
    files: [
      "packages/*/admin/**/*.{js,jsx,ts,tsx}",
      "apps/dashboard/src/admin/**/*.{js,jsx,ts,tsx}",
      "apps/docs/src/**/*.{js,jsx,ts,tsx,mjs}",
    ],
    plugins: sonarjs.recommended.plugins,
    rules: {
      // Allow `void fetchSettings()` fire-and-forget promises in React effects
      "sonarjs/void-use": "off",
    },
  },
  {
    name: "@vicacha-devs/eslint-config/translations",
    files: ["**/translations/**/*.{js,ts}"],
    plugins: sonarjs.recommended.plugins,
    rules: {
      // UI field labels/placeholders with "password"/"secret"/"token" keys
      "sonarjs/hardcoded-secret-signatures": "off",
      "sonarjs/no-hardcoded-passwords": "off",
    },
  },
  {
    name: "@vicacha-devs/eslint-config/scripts",
    files: [
      "scripts/**/*.{js,mjs,cjs,ts,mts,cts}",
      "apps/*/scripts/**/*.{js,mjs,cjs,ts,mts,cts}",
      "packages/*/scripts/**/*.{js,mjs,cjs,ts,mts,cts}",
    ],
    plugins: sonarjs.recommended.plugins,
    rules: {
      // CLI build, release & Playwright scripts legitimately invoke git/pnpm
      "sonarjs/no-hardcoded-ip": "off",
      "sonarjs/no-os-command-from-path": "off",
    },
  },
  {
    name: "@vicacha-devs/eslint-config/network-allowlist",
    files: [
      "apps/dashboard/config/**/*.{js,ts}",
      "packages/strapi-plugin-broadcasts/shared/validator.ts",
      "packages/strapi-plugin-inbox/server/**/*.{js,ts}",
    ],
    plugins: sonarjs.recommended.plugins,
    rules: {
      // Loopback 127.0.0.1 binding/fallbacks and SSRF metadata IP blocklists
      "sonarjs/no-hardcoded-ip": "off",
    },
  },
  {
    name: "@vicacha-devs/eslint-config/xml-namespaces",
    files: [
      "packages/strapi-plugin-media-feeds/shared/rssGenerator.ts",
      "packages/strapi-plugin-sitemap/server/src/services/xml-builder.ts",
    ],
    plugins: sonarjs.recommended.plugins,
    rules: {
      // Standard http:// XML namespace URIs (xmlns:itunes, sitemaps.org)
      "sonarjs/no-clear-text-protocols": "off",
    },
  },
  {
    name: "@vicacha-devs/eslint-config/json",
    files: ["**/*.json"],
    ignores: ["package-lock.json", "**/tsconfig*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    name: "@vicacha-devs/eslint-config/tests",
    files: ["**/tests/**/*.{js,mjs,ts,tsx}"],
    plugins: sonarjs.recommended.plugins,
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
      "sonarjs/hardcoded-secret-signatures": "off",
      "sonarjs/no-clear-text-protocols": "off",
      "sonarjs/no-duplicated-branches": "off",
      "sonarjs/no-empty-test-file": "off",
      "sonarjs/no-hardcoded-ip": "off",
      "sonarjs/no-hardcoded-passwords": "off",
      "sonarjs/no-identical-functions": "off",
      "sonarjs/prefer-specific-assertions": "off",
      "sonarjs/pseudo-random": "off",
    },
  },
  {
    ...vitest.configs.recommended,
    name: "@vicacha-devs/eslint-config/vitest",
    files: [
      "packages/*/tests/**/*.test.{js,mjs,ts,tsx}",
      "tests/**/*.test.{js,mjs,ts,tsx}",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...vitest.environments.env.globals,
      },
    },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/expect-expect": "off",
      "vitest/no-import-node-test": "off",
      "no-console": "off",
    },
  },
]);
