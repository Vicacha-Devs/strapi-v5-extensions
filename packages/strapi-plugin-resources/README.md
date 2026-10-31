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
- **3-Tab Admin Settings Panel (`/admin/settings/resources`)**:
  - **Tab 1 — Media Library Folders & Organization**: Configure `organizationName`, `defaultPublicationsFolderPath` (`/resources/publications`), `defaultGalleriesFolderPath` (`/resources/galleries`), `secondaryCalendar` (`islamic-umalqura`, `islamic-civil`, `hebrew`, `persian`, `buddhist`, `none`), `defaultLocale` (`SingleSelect`), and `supportedLocales` (`MultiSelect` with removable tag chips).
  - **Tab 2 — CDN Optimization & Folder Sync**: Toggle `enableCloudinaryOptimization` (`f_auto,q_auto` + responsive widths `400w`–`1600w`), `autoSyncMediaFolders` (one-click `plugin::upload.folder` sync), and `maxPhotosPerAlbum` (`1`–`500`, default `200`).
  - **Tab 3 — Download Security & Allow-Lists**: Select `allowedDownloadExtensions` (`.pdf`, `.epub`, `.mobi`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.mp3`, `.m4a`, `.ogg`, `.wav`, `.zip`, etc.) and `allowedDownloadMimeTypes` via `MultiSelect` (`withTags`) enforced by `POST /api/resources/publications/:slug/download` (`X-Content-Type-Options: nosniff`).
- **13 Admin UI Locales**: `en`, `es`, `ar`, `tr`, `fr`, `de`, `pt`, `it`, `nl`, `pl`, `id`, `ur`, `zh`.

## Quick Installation & Configuration

```bash
pnpm add @vicacha-devs/strapi-plugin-resources
```

Enable and configure the plugin in `config/plugins.ts`:

```ts
export default ({ env }) => ({
  resources: {
    enabled: true,
    config: {
      organizationName: env("RESOURCES_ORG_NAME", "Community Resource Center"),
      defaultPublicationsFolderPath: "/resources/publications",
      defaultGalleriesFolderPath: "/resources/galleries",
      secondaryCalendar: "islamic-umalqura",
      defaultLocale: "es",
      supportedLocales: ["es", "en", "ar", "tr"],
      enableCloudinaryOptimization: true,
      autoSyncMediaFolders: true,
      maxPhotosPerAlbum: 200,
      allowedDownloadExtensions: [".pdf", ".epub", ".mobi", ".zip", ".mp3", ".m4a", ".ogg", ".wav"],
      allowedDownloadMimeTypes: [
        "application/pdf",
        "application/epub+zip",
        "application/x-mobipocket-ebook",
        "application/zip",
        "audio/mpeg",
        "audio/mp4",
        "audio/ogg",
        "audio/wav",
      ],
    },
  },
});
```

