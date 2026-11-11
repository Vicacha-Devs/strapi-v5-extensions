# @vicacha-devs/strapi-plugin-events

## 1.1.0

### Minor Changes

- 3f17d8e: Initial release of the events plugin: ESM-first package with shared i18n registration through `@vicacha-devs/plugin-shared`.

### Patch Changes

- 6c04c54: Use shared linear-time helpers (`isValidEmail`, `slugify`, `stripTrailingSlashes`) instead of per-plugin regexes that backtrack on long inputs.
- Updated dependencies [e11a0f7]
  - @vicacha-devs/strapi-plugin-calendar@1.1.2
