---
title: "خريطة الموقع XML و Hreflang — دليل المطور وواجهة الإدارة"
description: "المرجع الشامل للمطورين وكيانات أنواع المحتوى وحالات الاستخدام وإعدادات الخادم وجولة مصورة في لوحة تحكم Strapi v5 لإضافة @vicacha-devs/strapi-plugin-sitemap."
---

## 1. التثبيت وإعداد الاعتماديات

```bash
pnpm add @vicacha-devs/strapi-plugin-sitemap
```

## 2. إعدادات الخادم (`config/plugins.ts`)

أضف إعدادات الإضافة إلى ملف `config/plugins.ts` في مشروع Strapi v5 الخاص بك:

```ts
// config/plugins.ts
export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => ({
  sitemap: {
    enabled: true,
    config: {
      hostname: env("SITEMAP_HOSTNAME", "https://example.org"),
      includeHreflang: true,
    },
  },
});
```

![خريطة الموقع XML و Hreflang — Strapi v5 Settings Panel](/screenshots/sitemap-settings.png)

## 3. جولة في واجهة الإدارة (Strapi v5 Admin UI — دعم RTL)

بمجرد تفعيل الإضافة، يتم تسجيل مساحة العمل والإعدادات داخل لوحة تحكم Strapi v5 مع دعم كامل للغة العربية واتجاه RTL:

![خريطة الموقع XML و Hreflang — Strapi v5 Admin UI](/screenshots/sitemap-admin.png)

### نماذج من نصوص الواجهة المعربة (العربية)

| مفتاح الترجمة                  | النص المعروض في الواجهة                              |
| :----------------------------- | :--------------------------------------------------- |
| `plugin.name`                  | خريطة الموقع                                         |
| `plugin.section.item`          | الإعدادات                                             |
| `settings.title`               | خريطة الموقع (Sitemap)                               |
| `settings.subtitle`            | إعدادات ملف XML لخريطة الموقع وفهرس الخرائط          |
| `settings.showSitemap`         | عرض خريطة الموقع                                     |
| `settings.baseUrl.title`       | الرابط الأساسي (Base URL)                             |
| `settings.baseUrl.description` | أدخل الرابط الأساسي المستخدم لجميع عناصر خريطة الموقع |
| `settings.baseUrl.placeholder` | https://example.com                                  |

## 4. كيانات أنواع المحتوى ومواقعها ومخططاتها (`strapi.documents`)

Registers two internal Collection Types (`plugin::sitemap.sitemap-content-type` and `plugin::sitemap.sitemap-content-type-single-url`) and one Single Type (`plugin::sitemap.sitemap-option`) with `content-manager.visible: false`, while introspecting all public `api::*` and `plugin::*` Content-Type entities to generate `/api/sitemap/sitemap.xml` and `/api/sitemap/sitemap-{slug}.xml`.

```mermaid
flowchart LR
  CTMap["plugin::sitemap.sitemap-content-type (URL Patterns)"] --> Builder["XML Sitemap & Hreflang Engine"]
  SingleUrl["plugin::sitemap.sitemap-content-type-single-url (Static URLs)"] --> Builder
  Options["plugin::sitemap.sitemap-option (Base URL & Index Rules)"] --> Builder
  Builder --> Output["/api/sitemap/sitemap.xml & /api/sitemap/sitemap-{slug}.xml"]
```

### أين تجد كيانات أنواع المحتوى في Strapi v5

- **Settings Panel (4 Tabs)**: `/admin/settings/sitemap` (`Settings -> Sitemap -> Configuration` — organized into **General & Sitemap Index**, **Collection Types**, **Custom URLs**, and **Excluded URLs** tabs)
- **Internal Persistence Entities**: `plugin::sitemap.sitemap-content-type` (`strapi_5_sitemap_plugin_content_types`), `plugin::sitemap.sitemap-content-type-single-url` (`strapi_5_sitemap_plugin_content_type_single_urls`), and `plugin::sitemap.sitemap-option` (`strapi_5_sitemap_plugin_options`)

### `plugin::sitemap.sitemap-content-type` — Sitemap Content Type

Per-locale URL pattern, priority, and changefreq mapping for a Strapi Content-Type entity

> **Kind**: `collectionType` · **DB Table**: `strapi_5_sitemap_plugin_content_types` · **Admin Location**: Internal (`/admin/plugins/sitemap`) · **Draft & Publish**: `No` · **i18n**: `No`

| الحقل                  | النوع في Strapi | إلزامي | القيود / العلاقات |
| :--------------------- | :-------------- | :----- | :--------------- |
| `type`                 | `string`        | No     | —                |
| `langcode`             | `string`        | No     | —                |
| `pattern`              | `string`        | No     | —                |
| `priority`             | `float`         | No     | —                |
| `frequency`            | `string`        | No     | —                |
| `lastModified`         | `string`        | No     | —                |
| `thumbnail`            | `string`        | No     | —                |
| `populateLinkedModels` | `string`        | No     | —                |

### `plugin::sitemap.sitemap-content-type-single-url` — Sitemap Single URL

Custom static URL entry included alongside dynamic CMS entries in sitemap.xml

> **Kind**: `collectionType` · **DB Table**: `strapi_5_sitemap_plugin_content_type_single_urls` · **Admin Location**: Internal (`/admin/plugins/sitemap`) · **Draft & Publish**: `No` · **i18n**: `No`

| الحقل       | النوع في Strapi | إلزامي | القيود / العلاقات |
| :---------- | :-------------- | :----- | :--------------- |
| `slug`      | `string`        | No     | —                |
| `priority`  | `float`         | No     | —                |
| `frequency` | `string`        | No     | —                |

### `plugin::sitemap.sitemap-option` — Sitemap Options

Global sitemap configuration (baseUrl, excludedUrls, useSitemapIndex, sitemapDefinitions)

> **Kind**: `singleType` · **DB Table**: `strapi_5_sitemap_plugin_options` · **Admin Location**: Internal (`/admin/plugins/sitemap`) · **Draft & Publish**: `No` · **i18n**: `No`

| الحقل                | النوع في Strapi | إلزامي | القيود / العلاقات |
| :------------------- | :-------------- | :----- | :--------------- |
| `baseUrl`            | `string`        | No     | —                |
| `excludedUrls`       | `json`          | No     | default: `[]`    |
| `useSitemapIndex`    | `boolean`       | No     | default: `false` |
| `sitemapDefinitions` | `json`          | No     | default: `[]`    |

## التكامل مع مدير المحتوى في Strapi v5 (`/admin/content-manager`)

> **مجموعة الشريط الجانبي في مدير المحتوى**: `Maps All Public Content Manager Collection Types & Single Types`

### الكيانات والمكونات المسجلة في مدير المحتوى

- `plugin::sitemap.sitemap-content-type` (Internal URL pattern mapping for Content Manager entities)
- `plugin::sitemap.sitemap-content-type-single-url` (Internal custom static URL entries)
- `plugin::sitemap.sitemap-option` (Internal global sitemap settings)

### لماذا تنشئ هذه الإضافة كيانات داخل مدير المحتوى (Content Manager)؟

`@vicacha-devs/strapi-plugin-sitemap` keeps its 3 configuration schemas (`sitemap-content-type`, `sitemap-content-type-single-url`, `sitemap-option`) hidden from the Content Manager sidebar (`content-manager.visible: false`) to prevent accidental schema edits, while dynamically reading published documents and `i18n` localizations from **every public Content Manager Collection Type** (`api::*` and `plugin::*`):

- **Automatic Sync with Content Manager Publishing**: Whenever an editor publishes, updates, or unpublishes an `Article`, `Event`, `Donation Campaign`, or `Resource Publication` in Content Manager, `/api/sitemap/sitemap.xml` automatically reflects its `lastmod` and `xhtml:link` `hreflang` alternates.

### كيفية الاستخدام داخل مدير المحتوى في Strapi (خطوة بخطوة)

1. **Publish Content in Content Manager**: Author and publish localized entries in any `api::*` or `plugin::*` collection inside `/admin/content-manager`.
2. **Map URL Patterns in Sitemap Settings**: Open `/admin/settings/sitemap` (or `/admin/settings/strapi-5-sitemap-plugin`) -> **Collection Types** tab and bind each Content Manager collection UID + locale to its frontend route pattern (e.g., `/[locale]/articles/[slug]`).

### التزامن بين مدير المحتوى ومساحة عمل الإضافة

```mermaid
flowchart LR
  CM["Publish Localized Documents in Content Manager (api::* & plugin::*)"] --> Map["URL Pattern Mapping (plugin::sitemap.sitemap-content-type)"]
  Map --> XML["Auto-Updated /api/sitemap/sitemap.xml with xhtml:link hreflang"]
```

### حالات الاستخدام داخل مدير المحتوى ومسارات العمل التحريرية

#### Content Manager Use Case 1 — Auto-Syndicating Published Content Manager Entries to Multilingual XML Sitemaps

- **الغرض والأهمية**: Ensure every newly published localized Event, Article, or Publication in Content Manager is immediately indexed with `hreflang` alternates.
- **خطوات التنفيذ في مدير المحتوى**: Publish the entry across `es`, `en`, `ar`, and `tr` in `/admin/content-manager` and verify its `<url>` block in `GET /api/sitemap/sitemap.xml`.

## 5. حالات الاستخدام ومسارات العمل المتكاملة

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

## 6. نقاط النهاية البرمجية REST API (`content-api` و `admin`)

| الطريقة  | مسار نقطة النهاية                  | النطاق        | المعالج (Handler)                  | المصادقة   |
| :------- | :--------------------------------- | :------------ | :--------------------------------- | :--------- |
| `GET`    | `/api/sitemap/sitemap.xml`         | `content-api` | `controller.getSitemap`            | Bearer JWT |
| `GET`    | `/api/sitemap/sitemap-{slug}.xml`  | `content-api` | `controller.getSitemapBySlug`      | Bearer JWT |
| `GET`    | `/sitemap/admin`                   | `admin`       | `controller.adminGET`              | Bearer JWT |
| `POST`   | `/sitemap/admin`                   | `admin`       | `controller.adminPOST`             | Bearer JWT |
| `PUT`    | `/sitemap/admin`                   | `admin`       | `controller.adminPUT`              | Bearer JWT |
| `DELETE` | `/sitemap/admin`                   | `admin`       | `controller.adminDELETE`           | Bearer JWT |
| `GET`    | `/sitemap/admin-get-content-types` | `admin`       | `controller.adminGETContentTypes`  | Bearer JWT |
| `GET`    | `/sitemap/admin-get-locales`       | `admin`       | `controller.adminGETLocales`       | Bearer JWT |
| `GET`    | `/sitemap/admin-allowed-fields`    | `admin`       | `controller.adminAllowedFields`    | Bearer JWT |
| `GET`    | `/sitemap/admin-get-options`       | `admin`       | `controller.adminGetOptions`       | Bearer JWT |
| `PUT`    | `/sitemap/admin-put-options`       | `admin`       | `controller.adminPutOptions`       | Bearer JWT |
| `GET`    | `/sitemap/admin-custom-urls`       | `admin`       | `controller.adminGetCustomURLs`    | Bearer JWT |
| `POST`   | `/sitemap/admin-custom-urls`       | `admin`       | `controller.adminPostCustomURLs`   | Bearer JWT |
| `PUT`    | `/sitemap/admin-custom-urls`       | `admin`       | `controller.adminPutCustomURLs`    | Bearer JWT |
| `DELETE` | `/sitemap/admin-custom-urls`       | `admin`       | `controller.adminDeleteCustomURLs` | Bearer JWT |

## 7. الاستخدام البرمجي داخل الخادم (`strapi.plugin` و `strapi.documents`)

```ts
// Registered services on plugin "sitemap": "service"
const pluginService = strapi.plugin("sitemap")?.service("service");

// Querying records via the Strapi v5 Document Service API
const records = await strapi.documents("plugin::sitemap.sitemap-content-type").findMany({
  limit: 25,
  sort: "createdAt:desc",
});
```

## 8. استكشاف الأخطاء والتحقق من الجودة

- **عدم ظهور التغييرات في لوحة الإدارة**: قم بتشغيل `pnpm strapi build` بعد تعديل ملف `config/plugins.ts`.
- **عزل حزم Strapi**: حافظ على إعداد `hoistPattern: ["*", "!@strapi/*"]` داخل `pnpm-workspace.yaml` لمنع تكرار سياق React.
- **فحص الأنواع الصارم (TypeScript)**: قم بتشغيل `pnpm check` للتحقق من سلامة حزمتي الواجهة والخادم.
