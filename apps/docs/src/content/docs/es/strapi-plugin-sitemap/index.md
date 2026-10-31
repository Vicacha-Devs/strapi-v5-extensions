---
title: "Mapa del Sitio XML y Hreflang (@vicacha-devs/strapi-plugin-sitemap)"
description: "Generador automático de Sitemap XML e Índice de Sitemaps para Strapi v5 con enlaces alternativos hreflang multilingües, URLs estáticas y hoja de estilo XSL."
prev: false
---

> **Package**: `@vicacha-devs/strapi-plugin-sitemap` · **Plugin ID**: `sitemap` · **Category**: `Editorial & SEO` · **Version**: `1.1.0` · **Routes**: `15`

Generador automático de Sitemap XML e Índice de Sitemaps para Strapi v5 con enlaces alternativos hreflang multilingües, URLs estáticas y hoja de estilo XSL.

```bash
pnpm add @vicacha-devs/strapi-plugin-sitemap
```

![Mapa del Sitio XML y Hreflang — Strapi v5 Admin UI](/screenshots/sitemap-admin.png)

![Mapa del Sitio XML y Hreflang — Strapi v5 Settings Panel](/screenshots/sitemap-settings.png)

## 1. Características Principales y Arquitectura

- [Explorar Entidades Content-Type y Casos de Uso (con Diagramas Interactivos)](/es/strapi-plugin-sitemap/use-cases/)
- [Explorar la Guía de Desarrollo y Admin UI](/es/strapi-plugin-sitemap/guide/)
- [Explorar la Referencia Interactiva OpenAPI](/strapi-plugin-sitemap/api/)

## 2. Entidades Content-Type, Ubicación y Esquemas (`strapi.documents`)

Registers two internal Collection Types (`plugin::sitemap.sitemap-content-type` and `plugin::sitemap.sitemap-content-type-single-url`) and one Single Type (`plugin::sitemap.sitemap-option`) with `content-manager.visible: false`, while introspecting all public `api::*` and `plugin::*` Content-Type entities to generate `/api/sitemap/sitemap.xml` and `/api/sitemap/sitemap-{slug}.xml`.

```mermaid
flowchart LR
  CTMap["plugin::sitemap.sitemap-content-type (URL Patterns)"] --> Builder["XML Sitemap & Hreflang Engine"]
  SingleUrl["plugin::sitemap.sitemap-content-type-single-url (Static URLs)"] --> Builder
  Options["plugin::sitemap.sitemap-option (Base URL & Index Rules)"] --> Builder
  Builder --> Output["/api/sitemap/sitemap.xml & /api/sitemap/sitemap-{slug}.xml"]
```

### Dónde Encontrar las Entidades Content-Type en Strapi v5

- **Settings Panel (4 Tabs)**: `/admin/settings/sitemap` (`Settings -> Sitemap -> Configuration` — organized into **General & Sitemap Index**, **Collection Types**, **Custom URLs**, and **Excluded URLs** tabs)
- **Internal Persistence Entities**: `plugin::sitemap.sitemap-content-type` (`strapi_5_sitemap_plugin_content_types`), `plugin::sitemap.sitemap-content-type-single-url` (`strapi_5_sitemap_plugin_content_type_single_urls`), and `plugin::sitemap.sitemap-option` (`strapi_5_sitemap_plugin_options`)

### `plugin::sitemap.sitemap-content-type` — Sitemap Content Type

Per-locale URL pattern, priority, and changefreq mapping for a Strapi Content-Type entity

> **Kind**: `collectionType` · **DB Table**: `strapi_5_sitemap_plugin_content_types` · **Admin Location**: Internal (`/admin/plugins/sitemap`) · **Draft & Publish**: `No` · **i18n**: `No`

| Atributo               | Tipo en Strapi | Requerido | Restricciones / Relación |
| :--------------------- | :------------- | :-------- | :----------------------- |
| `type`                 | `string`       | No        | —                        |
| `langcode`             | `string`       | No        | —                        |
| `pattern`              | `string`       | No        | —                        |
| `priority`             | `float`        | No        | —                        |
| `frequency`            | `string`       | No        | —                        |
| `lastModified`         | `string`       | No        | —                        |
| `thumbnail`            | `string`       | No        | —                        |
| `populateLinkedModels` | `string`       | No        | —                        |

### `plugin::sitemap.sitemap-content-type-single-url` — Sitemap Single URL

Custom static URL entry included alongside dynamic CMS entries in sitemap.xml

> **Kind**: `collectionType` · **DB Table**: `strapi_5_sitemap_plugin_content_type_single_urls` · **Admin Location**: Internal (`/admin/plugins/sitemap`) · **Draft & Publish**: `No` · **i18n**: `No`

| Atributo    | Tipo en Strapi | Requerido | Restricciones / Relación |
| :---------- | :------------- | :-------- | :----------------------- |
| `slug`      | `string`       | No        | —                        |
| `priority`  | `float`        | No        | —                        |
| `frequency` | `string`       | No        | —                        |

### `plugin::sitemap.sitemap-option` — Sitemap Options

Global sitemap configuration (baseUrl, excludedUrls, useSitemapIndex, sitemapDefinitions)

> **Kind**: `singleType` · **DB Table**: `strapi_5_sitemap_plugin_options` · **Admin Location**: Internal (`/admin/plugins/sitemap`) · **Draft & Publish**: `No` · **i18n**: `No`

| Atributo             | Tipo en Strapi | Requerido | Restricciones / Relación |
| :------------------- | :------------- | :-------- | :----------------------- |
| `baseUrl`            | `string`       | No        | —                        |
| `excludedUrls`       | `json`         | No        | default: `[]`            |
| `useSitemapIndex`    | `boolean`      | No        | default: `false`         |
| `sitemapDefinitions` | `json`         | No        | default: `[]`            |

## Integración con el Content Manager de Strapi v5 (`/admin/content-manager`)

> **Grupo en la Barra Lateral del Content Manager**: `Maps All Public Content Manager Collection Types & Single Types`

### Entidades y Componentes en el Content Manager

- `plugin::sitemap.sitemap-content-type` (Internal URL pattern mapping for Content Manager entities)
- `plugin::sitemap.sitemap-content-type-single-url` (Internal custom static URL entries)
- `plugin::sitemap.sitemap-option` (Internal global sitemap settings)

### Por Qué Este Plugin Crea e Integra Entidades en el Content Manager

`@vicacha-devs/strapi-plugin-sitemap` keeps its 3 configuration schemas (`sitemap-content-type`, `sitemap-content-type-single-url`, `sitemap-option`) hidden from the Content Manager sidebar (`content-manager.visible: false`) to prevent accidental schema edits, while dynamically reading published documents and `i18n` localizations from **every public Content Manager Collection Type** (`api::*` and `plugin::*`):

- **Automatic Sync with Content Manager Publishing**: Whenever an editor publishes, updates, or unpublishes an `Article`, `Event`, `Donation Campaign`, or `Resource Publication` in Content Manager, `/api/sitemap/sitemap.xml` automatically reflects its `lastmod` and `xhtml:link` `hreflang` alternates.

### Cómo Usarlo en el Content Manager de Strapi (Paso a Paso)

1. **Publish Content in Content Manager**: Author and publish localized entries in any `api::*` or `plugin::*` collection inside `/admin/content-manager`.
2. **Map URL Patterns in Sitemap Settings**: Open `/admin/settings/sitemap` (or `/admin/settings/strapi-5-sitemap-plugin`) -> **Collection Types** tab and bind each Content Manager collection UID + locale to its frontend route pattern (e.g., `/[locale]/articles/[slug]`).

### Sincronización entre el Content Manager y el Espacio del Plugin

```mermaid
flowchart LR
  CM["Publish Localized Documents in Content Manager (api::* & plugin::*)"] --> Map["URL Pattern Mapping (plugin::sitemap.sitemap-content-type)"]
  Map --> XML["Auto-Updated /api/sitemap/sitemap.xml with xhtml:link hreflang"]
```

### Casos de Uso en el Content Manager y Flujos Editoriales

#### Content Manager Use Case 1 — Auto-Syndicating Published Content Manager Entries to Multilingual XML Sitemaps

- **Para qué sirve y por qué usarlo**: Ensure every newly published localized Event, Article, or Publication in Content Manager is immediately indexed with `hreflang` alternates.
- **Cómo ejecutarlo en el Content Manager**: Publish the entry across `es`, `en`, `ar`, and `tr` in `/admin/content-manager` and verify its `<url>` block in `GET /api/sitemap/sitemap.xml`.

## 3. Casos de Uso y Flujos de Trabajo

### Use Case 1 — Dynamic Multilingual Entity URL Pattern Mapping & `xhtml:link` Hreflang

- **What it is for**: Map any localized Strapi Content-Type entity (`api::article.article`, `plugin::events.event`, `plugin::resources.publication`) to dynamic URL patterns with automatic `hreflang` alternates.
- **How it works**: In `/admin/settings/sitemap` (**Collection Types** tab), map a content type + `langcode` to a pattern (e.g., `/[locale]/articles/[slug]`), `priority`, and `frequency` (`plugin::sitemap.sitemap-content-type`).

```mermaid
flowchart LR
  Pattern["Map Content-Type + langcode -> /[locale]/articles/[slug]"] --> FetchDocs["Query Published Documents & Localizations"]
  FetchDocs --> Hreflang["Generate <url> + <xhtml:link rel='alternate' hreflang='...' />"]
  Hreflang --> Xml["Serve /api/sitemap/sitemap.xml"]
```

![XML Sitemap & Hreflang — Strapi v5 Admin Workspace](/screenshots/sitemap-admin.png)

### Use Case 2 — Hybrid Static + CMS Sitemap with Custom Single URLs

- **What it is for**: Include static frontend routes (`/`, `/es/contact`, `/ar/prayer-times`) alongside dynamic CMS entries in the same XML sitemap.
- **How it works**: Add static route entries in the **Custom URLs** tab (`plugin::sitemap.sitemap-content-type-single-url`) and exclude internal routes in the **Excluded URLs** tab.

```mermaid
flowchart LR
  CustomTab["Custom URLs Tab (POST /sitemap/admin-custom-urls)"] --> SingleEntity["plugin::sitemap.sitemap-content-type-single-url"]
  SingleEntity --> Merge["Merge Static URLs + Dynamic Content-Type URLs"]
```

### Use Case 3 — Multi-File Sitemap Index (`sitemap-{slug}.xml`) for Large Sites

- **What it is for**: Split large portals into dedicated sub-sitemaps (e.g., `/api/sitemap/sitemap-articles.xml`, `/api/sitemap/sitemap-events.xml`) referenced by a master `<sitemapindex>`.
- **How it works**: Enable `useSitemapIndex: true` and define `sitemapDefinitions` in the **General & Sitemap Index** tab of `/admin/settings/sitemap` (`PUT /sitemap/admin-put-options`).

```mermaid
flowchart LR
  Settings["/admin/settings/sitemap (General & Sitemap Index Tab)"] -->Defs["Define Sub-Sitemaps (articles, events, publications)"]
  Defs --> IndexXml["GET /api/sitemap/sitemap.xml (<sitemapindex>)"]
  IndexXml --> SubXml["GET /api/sitemap/sitemap-{slug}.xml"]
```

![XML Sitemap & Hreflang — Strapi v5 Settings Panel](/screenshots/sitemap-settings.png)

## 4. Endpoints REST API (`content-api` y `admin`)

| Método   | Ruta del Endpoint                  | Ámbito        | Controlador                       | Autenticación |
| :------- | :--------------------------------- | :------------ | :-------------------------------- | :------------ |
| `GET`    | `/api/sitemap/sitemap.xml`         | `content-api` | `controller.getSitemap`           | Bearer JWT    |
| `GET`    | `/api/sitemap/sitemap-{slug}.xml`  | `content-api` | `controller.getSitemapBySlug`     | Bearer JWT    |
| `GET`    | `/sitemap/admin`                   | `admin`       | `controller.adminGET`             | Bearer JWT    |
| `POST`   | `/sitemap/admin`                   | `admin`       | `controller.adminPOST`            | Bearer JWT    |
| `PUT`    | `/sitemap/admin`                   | `admin`       | `controller.adminPUT`             | Bearer JWT    |
| `DELETE` | `/sitemap/admin`                   | `admin`       | `controller.adminDELETE`          | Bearer JWT    |
| `GET`    | `/sitemap/admin-get-content-types` | `admin`       | `controller.adminGETContentTypes` | Bearer JWT    |
| `GET`    | `/sitemap/admin-get-locales`       | `admin`       | `controller.adminGETLocales`      | Bearer JWT    |
| `GET`    | `/sitemap/admin-allowed-fields`    | `admin`       | `controller.adminAllowedFields`   | Bearer JWT    |
| `GET`    | `/sitemap/admin-get-options`       | `admin`       | `controller.adminGetOptions`      | Bearer JWT    |
