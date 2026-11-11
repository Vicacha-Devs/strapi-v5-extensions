# @vicacha-devs/strapi-plugin-certificates

## 1.1.1

### Patch Changes

- 6c04c54: Use shared linear-time helpers (`isValidEmail`, `slugify`, `stripTrailingSlashes`) instead of per-plugin regexes that backtrack on long inputs.
- e11a0f7: Use the Strapi SDK default export layout: ESM in `index.mjs` and CJS in `index.js`, without `"type": "module"` or post-build file renaming.
- Updated dependencies [e11a0f7]
  - @vicacha-devs/strapi-plugin-calendar@1.1.2

## 1.1.0

### Minor Changes

- 87f6576: Initial release of the certificates plugin: ESM-first package with shared i18n registration through `@vicacha-devs/plugin-shared`.

### Patch Changes

- Updated dependencies [2620b32]
  - @vicacha-devs/strapi-plugin-calendar@1.1.1
