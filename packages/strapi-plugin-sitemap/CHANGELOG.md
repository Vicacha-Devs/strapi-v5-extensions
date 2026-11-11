# @vicacha-devs/strapi-plugin-sitemap

## 1.2.0

### Minor Changes

- d930bdf: Remove the unused `admin-get-options` and `admin-put-options` admin routes (the Settings page uses `/settings`), add unit tests for the XML and URL-pattern helpers, and document migrating from `strapi-5-sitemap-plugin`.

### Patch Changes

- 6c04c54: Use shared linear-time helpers (`isValidEmail`, `slugify`, `stripTrailingSlashes`) instead of per-plugin regexes that backtrack on long inputs.
- e11a0f7: Use the Strapi SDK default export layout: ESM in `index.mjs` and CJS in `index.js`, without `"type": "module"` or post-build file renaming.
