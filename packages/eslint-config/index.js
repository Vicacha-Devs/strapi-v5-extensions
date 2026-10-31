/**
 * Shared ESLint rules for @vicacha-devs/strapi-v5-extensions packages.
 * Enforces strict <500 lines per file and TypeScript hygiene.
 */
export default {
  rules: {
    "max-lines": [
      "error",
      {
        max: 500,
        skipBlankLines: true,
        skipComments: true,
      },
    ],
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "@typescript-eslint/no-empty-object-type": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/consistent-type-imports": "warn",
  },
};
