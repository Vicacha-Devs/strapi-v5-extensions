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
  "@typescript-eslint/no-explicit-any": "off",
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
      "sonarjs/cognitive-complexity": "off",
      "sonarjs/concise-regex": "off",
      "sonarjs/hardcoded-secret-signatures": "off",
      "sonarjs/no-clear-text-protocols": "off",
      "sonarjs/no-duplicated-branches": "off",
      "sonarjs/no-empty-test-file": "off",
      "sonarjs/no-hardcoded-ip": "off",
      "sonarjs/no-hardcoded-passwords": "off",
      "sonarjs/no-identical-functions": "off",
      "sonarjs/no-inverted-boolean-check": "off",
      "sonarjs/no-nested-assignment": "off",
      "sonarjs/no-nested-conditional": "off",
      "sonarjs/no-nested-functions": "off",
      "sonarjs/no-nested-template-literals": "off",
      "sonarjs/no-os-command-from-path": "off",
      "sonarjs/no-unused-vars": "off",
      "sonarjs/prefer-specific-assertions": "off",
      "sonarjs/pseudo-random": "off",
      "sonarjs/redundant-type-aliases": "off",
      "sonarjs/slow-regex": "off",
      "sonarjs/super-linear-regex": "off",
      "sonarjs/todo-tag": "warn",
      "sonarjs/use-type-alias": "off",
      "sonarjs/void-use": "off",
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
    name: "@vicacha-devs/eslint-config/json",
    files: ["**/*.json"],
    ignores: ["package-lock.json", "**/tsconfig*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/tests/**/*.test.{js,mjs,ts,tsx}"],
    ...vitest.configs.recommended,
    name: "@vicacha-devs/eslint-config/vitest",
    languageOptions: {
      globals: {
        ...globals.node,
        ...vitest.environments.env.globals,
      },
    },
    rules: {
      "vitest/expect-expect": "off",
      "no-console": "off",
    },
  },
]);
