# `@vicacha-devs/strapi-plugin-resources`

Reusable **Strapi v5 Media Library, Digital Publications, Photo Galleries & Glossary Plugin** (`plugin::resources`) built natively on top of Strapi v5's `@strapi/upload` (`plugin::upload.file` & `plugin::upload.folder`) and `@vicacha-devs/strapi-plugin-calendar`.

## Features

- **Native Strapi v5 Media Library Integration**:
  - Uses `plugin::upload.file` for PDFs, eBooks, cover artwork, multi-photo gallery albums, and glossary pronunciation audio.
  - Uses `plugin::upload.folder` for authenticated admin folder-to-album synchronization (`POST /resources/galleries/:documentId/sync-media-folder`).
  - Automatic Cloudinary `f_auto,q_auto` responsive URL optimization when `@strapi/provider-upload-cloudinary` is active.
- **3 Localized Content-Types (`i18n` & Draft/Publish Ready)**:
  - `plugin::resources.publication`: Digital library guides, books, pamphlets, and press kits with HMAC-SHA256 signed download tickets, atomic `downloadCount` tracking, and extension/MIME allow-list enforcement (active-script types such as `.svg`, `.html`, `.js`, and `.exe` are unconditionally blocked).
  - `plugin::resources.gallery-album`: Curated photo & video albums with `photoCount`, photographer credit, internal framing notes (redacted from public Content-API responses), and secondary calendar dates.
  - `plugin::resources.glossary-term`: Structured A–Z terminology index with native script, transliteration, definition, and optional audio pronunciation.
- **Role-Based Access Control (RBAC)**:
  - `plugin::resources.read`: View catalog hub, media folders, and media files in Strapi Admin.
  - `plugin::resources.manage`: Create, update, delete, and folder-sync publications, gallery albums, and glossary terms.
  - `plugin::resources.settings`: Read and update plugin settings (`/admin/settings/resources`).
- **Public Content-API Endpoints (`/api/resources/*`, `status: "published"` enforced)**:
  - `GET /api/resources/hub`
  - `GET /api/resources/publications` & `GET /api/resources/publications/:slug`
  - `POST /api/resources/publications/:slug/download` (returns `application/json` signed ticket `{ data: { documentId, slug, downloadUrl, expiresAt, signature, recommendedHeaders, ... } }`)
  - `GET /api/resources/galleries` & `GET /api/resources/galleries/:slug`
  - `GET /api/resources/glossary`
- **Multi-Calendar Secondary Dates**:
  - Powered by `@vicacha-devs/strapi-plugin-calendar` (`islamic-umalqura`, `islamic-civil`, `hebrew`, `persian`, `buddhist`, `coptic`, `ethiopic`, or `none`).
- **3-Tab Admin Settings Panel (`/admin/settings/resources`)**:
  - **Tab 1 — Media Library Folders & Organization**: Configure `organizationName`, `defaultPublicationsFolderPath` (default `/publications`), `defaultGalleriesFolderPath` (default `/galleries`), `secondaryCalendar`, `defaultLocale` (default `"es"`), and `supportedLocales` (default `["es", "en", "ar", "tr"]`).
  - **Tab 2 — CDN Optimization & Folder Sync**: Toggle `enableCloudinaryOptimization` (`f_auto,q_auto`), `autoSyncMediaFolders`, and `maxPhotosPerAlbum` (`1`–`500`, default `60`).
  - **Tab 3 — Download Security & Allow-Lists**: Configure `allowedDownloadExtensions` and `allowedDownloadMimeTypes` enforced on `POST /api/resources/publications/:slug/download`.
- **10 Admin UI Locales**: `en`, `es`, `ar`, `tr`, `fr`, `de`, `it`, `pt`, `ru`, `zh`.

## Quick Installation & Configuration

```bash
pnpm add @vicacha-devs/strapi-plugin-resources @vicacha-devs/strapi-plugin-calendar
```

Set `RESOURCES_DOWNLOAD_SECRET` in production (minimum 32 random characters recommended) and configure the plugin in `config/plugins.ts`:

```ts
export default ({ env }) => ({
  resources: {
    enabled: true,
    config: {
      downloadSecret: env("RESOURCES_DOWNLOAD_SECRET"),
      organizationName: env(
        "RESOURCES_ORG_NAME",
        "Community Center & Digital Library"
      ),
      defaultPublicationsFolderPath: "/publications",
      defaultGalleriesFolderPath: "/galleries",
      secondaryCalendar: "islamic-umalqura",
      defaultLocale: "es",
      supportedLocales: ["es", "en", "ar", "tr"],
      enableCloudinaryOptimization: true,
      autoSyncMediaFolders: true,
      maxPhotosPerAlbum: 60,
      allowedDownloadExtensions: [
        ".pdf",
        ".epub",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".mp3",
        ".m4a",
        ".zip",
      ],
      allowedDownloadMimeTypes: [
        "application/pdf",
        "application/epub+zip",
        "image/png",
        "image/jpeg",
        "image/webp",
        "audio/mpeg",
        "audio/mp4",
        "application/zip",
      ],
    },
  },
});
```
