# `@vicacha-devs/strapi-plugin-resources`

Reusable **Strapi v5 Media Library, Digital Publications, Photo Galleries & Glossary Plugin** (`plugin::resources`) built natively on top of Strapi v5's `@strapi/upload` (`plugin::upload.file` & `plugin::upload.folder`).

## Features

- **Native Strapi v5 Media Library Integration**:
  - Uses `plugin::upload.file` for PDFs, eBooks, cover artwork, multi-photo gallery albums, and glossary pronunciation audio.
  - Uses `plugin::upload.folder` for one-click folder-to-album synchronization (`POST /api/resources/galleries/:documentId/sync-media-folder`).
  - Automatic Cloudinary `f_auto,q_auto` responsive URL optimization when `@strapi/provider-upload-cloudinary` is active.
- **3 Localized Content-Types (`i18n` Ready)**:
  - `plugin::resources.publication`: Digital library guides, books, pamphlets, and press kits with hardened download tracking (`Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`).
  - `plugin::resources.gallery-album`: Curated photo & video albums with photographer credit, framing notes, and secondary calendar dates.
  - `plugin::resources.glossary-term`: Structured A–Z terminology index with native script, transliteration, definition, and optional audio pronunciation.
- **Multi-Calendar Secondary Dates**:
  - Supports `islamic-umalqura`, `islamic-civil`, `hebrew`, `persian`, `buddhist`, or `none`.
- **10 Admin UI Locales**: `en`, `es`, `ar`, `fr`, `de`, `pt`, `it`, `tr`, `ru`, `zh`.
