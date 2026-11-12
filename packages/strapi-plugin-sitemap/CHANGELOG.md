# @vicacha-devs/strapi-plugin-sitemap

## 1.2.1

### Patch Changes

- 690dcda: Security and consistency hardening: plugins now share prototype-pollution guards, output escapers (HTML, XML, CSV formula-injection, iCalendar), a bounded rate limiter, CSPRNG reference codes, a rich-text normalizer and the calendar registry from `@vicacha-devs/plugin-shared`, with tighter admin/content-api route checks and new security tests.

## 1.2.0

### Minor Changes

- d930bdf: Remove the unused `admin-get-options` and `admin-put-options` admin routes (the Settings page uses `/settings`), add unit tests for the XML and URL-pattern helpers, and document migrating from `strapi-5-sitemap-plugin`.

### Patch Changes

- 6c04c54: Use shared linear-time helpers (`isValidEmail`, `slugify`, `stripTrailingSlashes`) instead of per-plugin regexes that backtrack on long inputs.
- e11a0f7: Use the Strapi SDK default export layout: ESM in `index.mjs` and CJS in `index.js`, without `"type": "module"` or post-build file renaming.
