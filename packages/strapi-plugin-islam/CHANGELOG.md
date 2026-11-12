# @vicacha-devs/strapi-plugin-islam

## 1.1.1

### Patch Changes

- 690dcda: Security and consistency hardening: plugins now share prototype-pollution guards, output escapers (HTML, XML, CSV formula-injection, iCalendar), a bounded rate limiter, CSPRNG reference codes, a rich-text normalizer and the calendar registry from `@vicacha-devs/plugin-shared`, with tighter admin/content-api route checks and new security tests.
- Updated dependencies [690dcda]
  - @vicacha-devs/strapi-plugin-calendar@1.1.3

## 1.1.0

### Minor Changes

- 6ac1f1e: Initial release of the islam plugin: ESM-first package with shared i18n registration through `@vicacha-devs/plugin-shared`.

### Patch Changes

- Updated dependencies [e11a0f7]
  - @vicacha-devs/strapi-plugin-calendar@1.1.2
