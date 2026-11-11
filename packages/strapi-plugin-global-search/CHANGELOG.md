# Changelog

All notable changes to this project are documented in this file.

## [2.0.0] - 2026-08-15

### Breaking

- Requires **Strapi 5**. Strapi 4 apps should stay on `strapi-global-search@1.x`.
- Requires Node 20–26, React 18, `react-router-dom` v6, and `styled-components` v6.
- Search uses the Document Service API (`documentId`, `status`, `locale: '*'`).
- Content Manager links use `/content-manager/collection-types|single-types/...` with `?locale=`.

### Added

- Native `documentId` matching on every content type.

### Changed

- Admin UI migrated off `@strapi/helper-plugin` onto `@strapi/strapi/admin` and Design System v2.
- Plugin config is read from `plugin::global-search`.

## [1.0.0] - 2026-08-15

### Added

- First public release of `strapi-global-search`.
- Admin search page and Ctrl/Cmd + K palette across all `api::` collection and single types.
- Settings UI and optional `config/plugins.js` (`global-search`) for limits, exclusions, and display fields.
- RBAC actions `plugin::global-search.read` and `plugin::global-search.settings`.
