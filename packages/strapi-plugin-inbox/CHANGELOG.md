# @vicacha-devs/strapi-plugin-inbox

## 1.1.0

### Minor Changes

- 2d97fd8: Initial release of the inbox plugin: ESM-first package with shared i18n registration through `@vicacha-devs/plugin-shared`.

### Patch Changes

- 6c04c54: Use shared linear-time helpers (`isValidEmail`, `slugify`, `stripTrailingSlashes`) instead of per-plugin regexes that backtrack on long inputs.
- Updated dependencies [060be7b]
- Updated dependencies [6c04c54]
- Updated dependencies [e11a0f7]
  - @vicacha-devs/strapi-plugin-bookings@1.1.0
  - @vicacha-devs/strapi-plugin-certificates@1.1.1
  - @vicacha-devs/strapi-plugin-calendar@1.1.2
