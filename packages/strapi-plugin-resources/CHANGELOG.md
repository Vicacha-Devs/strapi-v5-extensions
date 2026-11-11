# @vicacha-devs/strapi-plugin-resources

## 1.1.0

### Minor Changes

- e11a0f7: Initial release of the resources plugin: ESM-first package with shared i18n registration through `@vicacha-devs/plugin-shared`.

### Patch Changes

- 6c04c54: Use shared linear-time helpers (`isValidEmail`, `slugify`, `stripTrailingSlashes`) instead of per-plugin regexes that backtrack on long inputs.
- Updated dependencies [e11a0f7]
  - @vicacha-devs/strapi-plugin-calendar@1.1.2
