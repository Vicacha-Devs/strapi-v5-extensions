---
title: "Recursos, Galerías y Glosario (@vicacha-devs/strapi-plugin-resources)"
description: "Biblioteca de publicaciones digitales con descargas seguras, galerías fotográficas sincronizadas con carpetas de Media Library y glosario multilingüe con audio."
prev: false
---

> **Package**: `@vicacha-devs/strapi-plugin-resources` · **Plugin ID**: `resources` · **Category**: `Community & Engagement` · **Version**: `1.1.0` · **Routes**: `25`

Biblioteca de publicaciones digitales con descargas seguras, galerías fotográficas sincronizadas con carpetas de Media Library y glosario multilingüe con audio.

```bash
pnpm add @vicacha-devs/strapi-plugin-resources
```

![Recursos, Galerías y Glosario — Strapi v5 Admin UI](/screenshots/resources-admin.png)

![Recursos, Galerías y Glosario — Strapi v5 Settings Panel](/screenshots/resources-settings.png)

## 1. Características Principales y Arquitectura

- [Explorar Entidades Content-Type y Casos de Uso (con Diagramas Interactivos)](/es/strapi-plugin-resources/use-cases/)
- [Explorar la Guía de Desarrollo y Admin UI](/es/strapi-plugin-resources/guide/)
- [Explorar la Referencia Interactiva OpenAPI](/strapi-plugin-resources/api/)

## 2. Entidades Content-Type, Ubicación y Esquemas (`strapi.documents`)

Registers three localized (`i18n.localized: true`), draft-and-publish (`draftAndPublish: true`) Collection Types: `plugin::resources.publication`, `plugin::resources.gallery-album`, and `plugin::resources.glossary-term`, plus a 3-tab settings panel (`/admin/settings/resources`) covering Media Library folder paths, multi-calendar secondary dates, Cloudinary `f_auto,q_auto` optimization, album photo caps, and download extension/MIME allow-lists. Supports runtime `schemaExtensions` in `config/plugins.ts`.

```mermaid
flowchart LR
  Pub["plugin::resources.publication (resources_publications)"] --> Download["POST /api/resources/publications/{slug}/download"]
  Folder["Strapi Media Library Folder"] -->|"sync-folder"| Album["plugin::resources.gallery-album (resources_gallery_albums)"]
  Glossary["plugin::resources.glossary-term (resources_glossary_terms)"] --> AZ["GET /api/resources/glossary?letter=A"]
```

### Dónde Encontrar las Entidades Content-Type en Strapi v5

- **Content Manager**: `/admin/content-manager/collection-types/plugin::resources.publication`, `plugin::resources.gallery-album`, and `plugin::resources.glossary-term` (`visible: true`)
- **Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Resource Publication`, `Resource Gallery Album`, `Resource Glossary Term`)
- **Plugin Workspace**: `/admin/plugins/resources` (Publications, Gallery Albums, Glossary Terms, Media Folder Sync)
- **Settings Panel (3 Tabs)**: `/admin/settings/resources` — **Media Library Folders & Organization** (`organizationName`, `defaultPublicationsFolderPath`, `defaultGalleriesFolderPath`, `secondaryCalendar`, `defaultLocale`, `supportedLocales`), **CDN Optimization & Folder Sync** (`enableCloudinaryOptimization`, `autoSyncMediaFolders`, `maxPhotosPerAlbum`), and **Download Security & Allow-Lists** (`allowedDownloadExtensions`, `allowedDownloadMimeTypes`)
- **Database Tables**: `resources_publications`, `resources_gallery_albums`, and `resources_glossary_terms`

### `plugin::resources.gallery-album` — Resource Gallery Album

Curated photo and video albums synced with Strapi v5 Media Library folders and Cloudinary optimization

> **Kind**: `collectionType` · **DB Table**: `resources_gallery_albums` · **Admin Location**: `/admin/content-manager/collection-types/plugin::resources.gallery-album` · **Draft & Publish**: `Yes` · **i18n**: `Yes`

| Atributo                | Tipo en Strapi | Requerido | Restricciones / Relación                                                                      |
| :---------------------- | :------------- | :-------- | :-------------------------------------------------------------------------------------------- |
| `title`                 | `string`       | Yes       | max: 200                                                                                      |
| `slug`                  | `uid`          | Yes       | —                                                                                             |
| `description`           | `text`         | No        | —                                                                                             |
| `category`              | `enumeration`  | Yes       | enum: `architecture, community, events, ramadan_eid, heritage, press`; default: `"community"` |
| `coverPhoto`            | `media`        | No        | —                                                                                             |
| `photos`                | `media`        | No        | —                                                                                             |
| `mediaFolderId`         | `integer`      | No        | —                                                                                             |
| `mediaFolderPath`       | `string`       | No        | max: 160                                                                                      |
| `eventDate`             | `date`         | No        | —                                                                                             |
| `secondaryDateOverride` | `string`       | No        | max: 80                                                                                       |
| `photographerCredit`    | `string`       | No        | max: 140                                                                                      |
| `framingNotes`          | `string`       | No        | max: 500                                                                                      |
| `featured`              | `boolean`      | No        | default: `false`                                                                              |
| `sortOrder`             | `integer`      | No        | default: `0`                                                                                  |
| `photoCount`            | `integer`      | No        | default: `0`                                                                                  |

### `plugin::resources.glossary-term` — Resource Glossary Term

Multilingual A-Z glossary terms with native script, transliteration, and Strapi Media Library audio pronunciation

> **Kind**: `collectionType` · **DB Table**: `resources_glossary_terms` · **Admin Location**: `/admin/content-manager/collection-types/plugin::resources.glossary-term` · **Draft & Publish**: `Yes` · **i18n**: `Yes`

| Atributo             | Tipo en Strapi | Requerido | Restricciones / Relación                                                            |
| :------------------- | :------------- | :-------- | :---------------------------------------------------------------------------------- |
| `term`               | `string`       | Yes       | max: 120                                                                            |
| `slug`               | `uid`          | Yes       | —                                                                                   |
| `nativeScript`       | `string`       | No        | max: 200                                                                            |
| `transliteration`    | `string`       | No        | max: 200                                                                            |
| `definition`         | `text`         | Yes       | —                                                                                   |
| `category`           | `enumeration`  | Yes       | enum: `beliefs, worship, ethics, history, community, general`; default: `"general"` |
| `letterGroup`        | `string`       | No        | max: 4; default: `"A"`                                                              |
| `pronunciationAudio` | `media`        | No        | —                                                                                   |
| `relatedTerms`       | `json`         | No        | —                                                                                   |
| `featured`           | `boolean`      | No        | default: `false`                                                                    |

### `plugin::resources.publication` — Resource Publication

Localized digital library books, guides, pamphlets, and press kit assets backed by the Strapi v5 Media Library

> **Kind**: `collectionType` · **DB Table**: `resources_publications` · **Admin Location**: `/admin/content-manager/collection-types/plugin::resources.publication` · **Draft & Publish**: `Yes` · **i18n**: `Yes`

| Atributo                | Tipo en Strapi | Requerido | Restricciones / Relación                                                        |
| :---------------------- | :------------- | :-------- | :------------------------------------------------------------------------------ |
| `title`                 | `string`       | Yes       | max: 200                                                                        |
| `slug`                  | `uid`          | Yes       | —                                                                               |
| `summary`               | `text`         | No        | —                                                                               |
| `category`              | `enumeration`  | Yes       | enum: `guide, book, pamphlet, press_kit, academic, general`; default: `"guide"` |
| `file`                  | `media`        | No        | —                                                                               |
| `coverImage`            | `media`        | No        | —                                                                               |
| `authorName`            | `string`       | No        | max: 140                                                                        |
| `authorSlug`            | `string`       | No        | max: 140                                                                        |
| `isbnOrReference`       | `string`       | No        | max: 80                                                                         |
| `pageCount`             | `integer`      | No        | —                                                                               |
| `languageCode`          | `string`       | No        | max: 10; default: `"es"`                                                        |
| `publishedAtDate`       | `date`         | No        | —                                                                               |
| `secondaryDateOverride` | `string`       | No        | max: 80                                                                         |
| `mediaFolderPath`       | `string`       | No        | max: 160                                                                        |
| `externalDownloadUrl`   | `string`       | No        | max: 500                                                                        |
| `downloadCount`         | `integer`      | No        | default: `0`                                                                    |
| `featured`              | `boolean`      | No        | default: `false`                                                                |
| `allowPublicDownload`   | `boolean`      | No        | default: `true`                                                                 |

## Integración con el Content Manager de Strapi v5 (`/admin/content-manager`)

> **Grupo en la Barra Lateral del Content Manager**: `Media, Resources & Library`

### Entidades y Componentes en el Content Manager

- `plugin::resources.publication` (**Resource Publication** — `/admin/content-manager/collection-types/plugin::resources.publication`)
- `plugin::resources.gallery-album` (**Resource Gallery Album** — `/admin/content-manager/collection-types/plugin::resources.gallery-album`)
- `plugin::resources.glossary-term` (**Resource Glossary Term** — `/admin/content-manager/collection-types/plugin::resources.glossary-term`)

![Recursos, Galerías y Glosario — Vista de Entidades en el Content Manager de Strapi v5](/screenshots/resources-content-manager.png)

### Por Qué Este Plugin Crea e Integra Entidades en el Content Manager

`@vicacha-devs/strapi-plugin-resources` registers all three of its entities (`Resource Publication`, `Resource Gallery Album`, and `Resource Glossary Term`) with `i18n.localized: true`, `draftAndPublish: true`, and `content-manager.visible: true` so librarians, scholars, and archivists can manage digital books, photo albums, and glossary terms inside the Strapi v5 Content Manager:

- **Multilingual (`i18n`) Digital Library & Glossary Authoring**: Author publications, photo gallery descriptions, and A–Z glossary definitions across `en`, `es`, `ar`, and `tr` (`?plugins[i18n][locale]=en`) with native Draft & Publish staging.
- **Relational Author Profile Linking (`authorProfile`)**: In Content Manager, link `Resource Publication` records directly to `Staff, Scholar & Author` (`api::leader.leader`) profiles via `config/plugins.ts -> schemaExtensions.publication`.
- **Direct Media Library Asset & Folder Binding**: Attach cover images, downloadable PDF files, pronunciation audio clips, and Media Library folder paths directly inside Content Manager forms.

### Cómo Usarlo en el Content Manager de Strapi (Paso a Paso)

1. **Open in Content Manager**: In the left sidebar, expand **Content Manager -> Collection Types -> Media, Resources & Library** and select **Resource Publication** (`/admin/content-manager/collection-types/plugin::resources.publication?plugins[i18n][locale]=en`), **Resource Gallery Album** (`plugin::resources.gallery-album`), or **Resource Glossary Term** (`plugin::resources.glossary-term`).
2. **Publish Books, Guides & Press Kits**: In **Resource Publication**, populate `title`, `slug`, `summary`, `category` (`book`, `guide`, `pamphlet`, `press_kit`), `fileUrl`, `pageCount`, and `authorProfile`, then click **Publish**.
3. **Curate A–Z Glossary Terms**: In **Resource Glossary Term**, enter `term`, `nativeScript` (Arabic script), `transliteration`, `definition`, `letterGroup` (`A`–`Z`), and `pronunciationAudioUrl`.
4. **Workspace vs. Content Manager**: Use **Content Manager** for multilingual authoring, scholar `authorProfile` relations, and bulk publishing; use the **Resources Workspace** (`/admin/plugins/resources`) for 1-click Media Library folder synchronization (`Sync Folder`) and download analytics.

### Sincronización entre el Content Manager y el Espacio del Plugin

```mermaid
flowchart LR
  CM["Strapi Content Manager (i18n + Draft & Publish)"] --> Pub["Resource Publication (plugin::resources.publication)"]
  CM --> Alb["Resource Gallery Album (plugin::resources.gallery-album)"]
  CM --> Glo["Resource Glossary Term (plugin::resources.glossary-term)"]
  Leader["Staff, Scholar & Author (api::leader.leader)"] -->|"authorProfile relation"| Pub
  Alb <-->|"Sync Media Folder"| WS["Resources Workspace (/admin/plugins/resources)"]
```

### Casos de Uso en el Content Manager y Flujos Editoriales

#### Content Manager Use Case 1 — Publishing Multilingual PDF Guides Linked to Institutional Authors (`api::leader.leader`)

- **Para qué sirve y por qué usarlo**: Author downloadable PDF guides (`Mosque Welcome & Visitor Etiquette Guide`, `Introduction to the Five Pillars of Islam`) in Content Manager and link each publication to its scholar author.
- **Cómo ejecutarlo en el Content Manager**: Open `/admin/content-manager/collection-types/plugin::resources.publication?plugins[i18n][locale]=en`, edit the entry, select the `authorProfile` relation, switch locales (`es`, `ar`, `tr`) to translate, and click **Publish**.

#### Content Manager Use Case 2 — Managing Multilingual Glossary Terms with Native Script & Audio

- **Para qué sirve y por qué usarlo**: Curate A–Z glossary entries with vocalized Arabic script, phonetic transliteration, and audio pronunciation links in Content Manager.
- **Cómo ejecutarlo en el Content Manager**: Open `/admin/content-manager/collection-types/plugin::resources.glossary-term?plugins[i18n][locale]=en`, filter by `letterGroup` or `category`, and publish.

## 3. Casos de Uso y Flujos de Trabajo

### Use Case 1 — Digital Publications Library with Hardened Download Allow-Lists

- **What it is for**: Publish downloadable books, PDF guides, pamphlets, and press kits protected by extension (`allowedDownloadExtensions`) and MIME (`allowedDownloadMimeTypes`) allow-lists, `X-Content-Type-Options: nosniff`, and atomic download counters.
- **How it works**: Configure allowed extensions/MIME types in `/admin/settings/resources` (**Download Security & Allow-Lists** tab), create `plugin::resources.publication` records, and serve downloads via `POST /api/resources/publications/{slug}/download`.

```mermaid
flowchart LR
  Request["POST /api/resources/publications/{slug}/download"] --> Sanitize["Validate Extension & MIME Allow-Lists (nosniff)"]
  Sanitize --> Counter["Increment downloadCount on plugin::resources.publication"]
  Counter --> Stream["Return Hardened Download Metadata"]
```

![Resources, Galleries & Glossary — Strapi v5 Admin Workspace](/screenshots/resources-admin.png)

### Use Case 2 — Configuring Media Library Folders, Secondary Calendars, CDN Optimization & Download Security

- **What it is for**: Manage all 11 `ResourcesPluginSettings` fields across 3 organized tabs in `/admin/settings/resources` (`Media Library Folders & Organization`, `CDN Optimization & Folder Sync`, and `Download Security & Allow-Lists`) and automatically sync `plugin::upload.folder` assets into `plugin::resources.gallery-album` up to `maxPhotosPerAlbum`.
- **How it works**: Configure `defaultPublicationsFolderPath`, `defaultGalleriesFolderPath`, `secondaryCalendar`, `enableCloudinaryOptimization`, `autoSyncMediaFolders`, `maxPhotosPerAlbum`, and download allow-lists in `/admin/settings/resources` (`PUT /resources/settings`), then click **Sync Folder** (`POST /resources/galleries/{documentId}/sync-folder`).

```mermaid
flowchart LR
  Settings["/admin/settings/resources (3 Tabs: Folders, CDN & Sync, Security)"] --> Sync["POST /resources/galleries/{documentId}/sync-folder (up to maxPhotosPerAlbum)"]
  Sync --> Album["Update plugin::resources.gallery-album (Cloudinary f_auto,q_auto + secondaryDateLabel)"]
  Album --> Frontend["GET /api/resources/galleries"]
```

![Resources, Galleries & Glossary — Strapi v5 Settings Panel](/screenshots/resources-settings.png)

### Use Case 3 — Multilingual A–Z Glossary with Native Script & Audio Pronunciation

- **What it is for**: Maintain an educational glossary of Arabic/Islamic or domain terms (`term`, `nativeScript`, `transliteration`, `definition`, `pronunciationAudio`, `letterGroup`).
- **How it works**: Manage entries in `plugin::resources.glossary-term` and query grouped A–Z terms via `GET /api/resources/glossary?letter=A&category=worship`.

```mermaid
flowchart LR
  Term["plugin::resources.glossary-term (term + nativeScript + audio)"] --> Index["Group by letterGroup (A-Z) & Category"]
  Index --> Query["GET /api/resources/glossary?letter=A"]
```

![Resources, Galleries & Glossary — Strapi v5 Content Manager Entities](/screenshots/resources-content-manager.png)

## 4. Endpoints REST API (`content-api` y `admin`)

| Método   | Ruta del Endpoint                                     | Ámbito  | Controlador                                 | Autenticación |
| :------- | :---------------------------------------------------- | :------ | :------------------------------------------ | :------------ |
| `GET`    | `/resources/hub`                                      | `admin` | `resourcesController.getAdminHubOverview`   | Bearer JWT    |
| `GET`    | `/resources/publications`                             | `admin` | `resourcesController.listAdminPublications` | Bearer JWT    |
| `POST`   | `/resources/publications`                             | `admin` | `resourcesController.createPublication`     | Bearer JWT    |
| `PUT`    | `/resources/publications/{documentId}`                | `admin` | `resourcesController.updatePublication`     | Bearer JWT    |
| `DELETE` | `/resources/publications/{documentId}`                | `admin` | `resourcesController.deletePublication`     | Bearer JWT    |
| `GET`    | `/resources/galleries`                                | `admin` | `resourcesController.listAdminGalleries`    | Bearer JWT    |
| `POST`   | `/resources/galleries`                                | `admin` | `resourcesController.createGalleryAlbum`    | Bearer JWT    |
| `PUT`    | `/resources/galleries/{documentId}`                   | `admin` | `resourcesController.updateGalleryAlbum`    | Bearer JWT    |
| `DELETE` | `/resources/galleries/{documentId}`                   | `admin` | `resourcesController.deleteGalleryAlbum`    | Bearer JWT    |
| `POST`   | `/resources/galleries/{documentId}/sync-media-folder` | `admin` | `resourcesController.syncAlbumMediaFolder`  | Bearer JWT    |
