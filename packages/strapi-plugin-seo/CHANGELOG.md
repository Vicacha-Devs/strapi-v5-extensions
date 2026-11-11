# @vicacha-devs/strapi-plugin-seo

## 2.1.1

### Patch Changes

- e11a0f7: Use the Strapi SDK default export layout: ESM in `index.mjs` and CJS in `index.js`, without `"type": "module"` or post-build file renaming.

## 2.1.0

### Minor Changes

- 8023ca0: Add the seo plugin: ESM-first package with shared i18n registration through `@vicacha-devs/plugin-shared`.

### Patch Changes

- 2620b32: Fix rich text extraction in the seo plugin's `getRichTextData`.
