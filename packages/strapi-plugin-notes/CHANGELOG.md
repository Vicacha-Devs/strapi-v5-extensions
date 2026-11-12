# @vicacha-devs/strapi-plugin-notes

## 1.1.3

### Patch Changes

- 690dcda: Security and consistency hardening: plugins now share prototype-pollution guards, output escapers (HTML, XML, CSV formula-injection, iCalendar), a bounded rate limiter, CSPRNG reference codes, a rich-text normalizer and the calendar registry from `@vicacha-devs/plugin-shared`, with tighter admin/content-api route checks and new security tests.

## 1.1.2

### Patch Changes

- e11a0f7: Use the Strapi SDK default export layout: ESM in `index.mjs` and CJS in `index.js`, without `"type": "module"` or post-build file renaming.

## 1.1.1

### Patch Changes

- 2620b32: Pick up the refreshed `@vicacha-devs/plugin-shared` utilities (locale and option handling, translation registration).

## 1.1.0

### Minor Changes

- 62d3265: Add the notes plugin: ESM-first package with shared i18n registration through `@vicacha-devs/plugin-shared`.
