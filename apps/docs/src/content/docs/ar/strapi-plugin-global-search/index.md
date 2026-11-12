---
title: "البحث الشامل السريع (@vicacha-devs/strapi-plugin-global-search)"
description: "لوحة أوامر وبحث شامل فوري (Cmd+K / Ctrl+K) عبر جميع أنواع المحتوى والمكونات المتداخلة في لوحة تحكم Strapi v5."
prev: false
---

> **Package**: `@vicacha-devs/strapi-plugin-global-search` · **Plugin ID**: `global-search` · **Category**: `Editorial & SEO` · **Version**: `2.1.0` · **Routes**: `6`

لوحة أوامر وبحث شامل فوري (Cmd+K / Ctrl+K) عبر جميع أنواع المحتوى والمكونات المتداخلة في لوحة تحكم Strapi v5.

```bash
pnpm add @vicacha-devs/strapi-plugin-global-search
```

![البحث الشامل السريع — Strapi v5 Admin UI](/screenshots/global-search-admin.png)

![البحث الشامل السريع — Spotlight Cmd+K Command Palette](/screenshots/global-search-palette.png)

![البحث الشامل السريع — Strapi v5 Settings Panel](/screenshots/global-search-settings.png)

## 1. المزايا الرئيسية والقدرات المعمارية

- [استكشف كيانات المحتوى وحالات الاستخدام (مع المخططات التفاعلية)](/ar/strapi-plugin-global-search/use-cases/)
- [استكشف دليل المطور وواجهة الإدارة](/ar/strapi-plugin-global-search/guide/)
- [استكشف مرجع OpenAPI التفاعلي](/strapi-plugin-global-search/api/)

## 2. كيانات أنواع المحتوى ومواقعها ومخططاتها (`strapi.documents`)

Operates as a universal zero-schema introspection engine over **all** registered Strapi v5 Content-Type entities (`api::*` collection types, single types, and `plugin::*` entities) plus nested components and dynamic zones. Uses `strapi.contentTypes` metadata and `strapi.documents(uid).findMany()` with RBAC permission filtering.

```mermaid
flowchart LR
  Shortcut["Cmd+K / Ctrl+K Palette or /admin/plugins/global-search"] --> Query["GET /global-search/search?q=..."]
  Query --> Introspect["Introspect api::* + plugin::* + Nested Components"]
  Introspect -->RBAC["RBAC Permission & Locale Filter"]
  RBAC --> Open["Open Document in Content Manager"]
```

### أين تجد كيانات أنواع المحتوى في Strapi v5

- **Spotlight Command Palette Overlay**: Press `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) from **any** Strapi Admin screen (including Content Manager, Calendar, or Settings)
- **Dedicated Search Workspace**: `/admin/plugins/global-search` (`Global Search` in the main left sidebar)
- **Settings Panel**: `/admin/settings/global-search` (`Settings -> Global Search -> Configuration` — organized into **Search behaviour** and **Content types** tabs)
- **Target Entities**: Opens matched documents directly at `/admin/content-manager/collection-types/{uid}/{documentId}?plugins[i18n][locale]={locale}`

تعمل هذه الإضافة مباشرة على كيانات أنواع المحتوى الحالية في Strapi (`api::*` و `plugin::*`).

## التكامل مع مدير المحتوى في Strapi v5 (`/admin/content-manager`)

> **مجموعة الشريط الجانبي في مدير المحتوى**: `All Content Manager Collection Types & Single Types (`Cmd+K`/`Ctrl+K`)`

### الكيانات والمكونات المسجلة في مدير المحتوى

- Universal Introspection across all `api::*` and `plugin::*` Content Manager Collection Types, Single Types, and Nested Components

### لماذا تنشئ هذه الإضافة كيانات داخل مدير المحتوى (Content Manager)؟

`@vicacha-devs/strapi-plugin-global-search` does not create an isolated database table because its entire purpose is to act as a high-speed **Content Manager Command Palette & Deep-Link Router** over every `api::*` and `plugin::*` entity registered in Strapi v5:

- **Instant Deep-Linking into Content Manager**: Pressing `Enter` on any search result navigates directly to `/admin/content-manager/collection-types/{uid}/{documentId}?plugins[i18n][locale]={locale}` (or `single-types/{uid}`).
- **Searches Both Host `api::*` and Plugin `plugin::*` Entities**: Simultaneously indexes articles, scholars (`api::leader.leader`), events (`plugin::events.event`), scripture entries (`plugin::islam.scripture-entry`), donations (`plugin::donations.campaign`), and publications (`plugin::resources.publication`).

### كيفية الاستخدام داخل مدير المحتوى في Strapi (خطوة بخطوة)

1. **Invoke from Anywhere**: Press `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) while inside Content Manager or any plugin page.
2. **Filter by Entity Type, Status & Locale**: Type a keyword and narrow results by Collection Type, `Draft`/`Published` status, or `i18n` locale badge.
3. **Open in Content Manager**: Press `Enter` to open the entry in Content Manager in the current tab, or `Cmd/Ctrl + Enter` to open it in a new tab.

### التزامن بين مدير المحتوى ومساحة عمل الإضافة

```mermaid
flowchart LR
  Palette["Press Cmd+K / Ctrl+K Anywhere in Admin"] --> Search["Query api::* + plugin::* + Components"]
  Search --> Select["Select Result (e.g. Islam Scripture or Event)"]
  Select --> OpenCM["Open Directly in Strapi Content Manager (/admin/content-manager/...)"]
```

### حالات الاستخدام داخل مدير المحتوى ومسارات العمل التحريرية

#### Content Manager Use Case 1 — Jumping Between Plugin Entities & Host Collections Without Leaving the Keyboard

- **الغرض والأهمية**: Switch from editing a `Booking Resource` to a `Donation Campaign` or `Islam Scripture Entry` in Content Manager in under a second.
- **خطوات التنفيذ في مدير المحتوى**: Press `Cmd+K`, type the title or slug, and press `Enter` to load the target document in Content Manager.

## 3. حالات الاستخدام ومسارات العمل المتكاملة

### Use Case 1 — Instant `Cmd+K` / `Ctrl+K` Spotlight Navigation Across All Entities

- **What it is for**: Jump directly to any Article, Course, Event, Booking, Certificate, or Single Type record from anywhere in Strapi Admin without leaving the keyboard.
- **How it works**: Press `Cmd+K`, type a query (e.g., `islam`), navigate with `↑`/`↓`, and press `Enter` to open the document in Content Manager (or `Cmd/Ctrl + Enter` for a new tab).

```mermaid
flowchart LR
  Key["Press Cmd+K / Ctrl+K Anywhere in Admin"] --> Modal["Spotlight Command Palette Modal"]
  Modal --> Type["Type Query (e.g. islam) + Filter by Type / Status"]
  Type --> Navigate["Press Enter -> Open in Content Manager"]
```

![Global Command Search — Spotlight Cmd+K Command Palette](/screenshots/global-search-palette.png)

### Use Case 2 — Deep Component & Multilingual Script Search (Arabic, Turkish, Spanish)

- **What it is for**: Find records by text buried inside repeatable components, SEO meta descriptions, or Arabic/RTL localized variants.
- **How it works**: `GET /global-search/search?q=...&locale=all` normalizes diacritics and Arabic Alef/Teh Marbuta variants and searches both top-level and nested component fields.

```mermaid
flowchart LR
  Workspace["Global Search Workspace (/admin/plugins/global-search)"] --> Normalize["Normalize Diacritics & Arabic/Turkish Script"]
  Normalize --> DeepScan["Scan Collection Types + Single Types + Dynamic Zones"]
  DeepScan --> Grouped["Render Grouped Results with Status & Locale Badges"]
```

![Global Command Search — Strapi v5 Admin Workspace](/screenshots/global-search-admin.png)

### Use Case 3 — Tabbed Search Behaviour & Per-Content-Type Inclusion Tuning

- **What it is for**: Fine-tune query thresholds (`Minimum characters`, `Debounce (ms)`, `Results per content type`, `Maximum results`, `Component depth`, `Query timeout (ms)`, `Search inside components`, `Include drafts`, `Include plugin content types`) and toggle which Content-Type entities appear in global search.
- **How it works**: Configure the **Search behaviour** and **Content types** tabs in `/admin/settings/global-search` (`PUT /global-search/settings`).

```mermaid
flowchart LR
  Settings["/admin/settings/global-search"] --> BehaviourTab["Search behaviour Tab (Limits, Depth, Drafts & Plugins)"]
  Settings --> TypesTab["Content types Tab (Toggle api::* & plugin::* UIDs)"]
  BehaviourTab --> Save["PUT /global-search/settings (Persisted in Plugin Store)"]
  TypesTab --> Save
```

![Global Command Search — Strapi v5 Settings Panel](/screenshots/global-search-settings.png)

## 4. نقاط النهاية البرمجية REST API (`content-api` و `admin`)

| الطريقة | مسار نقطة النهاية               | النطاق  | المعالج (Handler) | المصادقة   |
| :------ | :------------------------------ | :------ | :---------------- | :--------- |
| `GET`   | `/global-search/search`         | `admin` | `search.find`     | Bearer JWT |
| `GET`   | `/global-search/schema`         | `admin` | `schema.find`     | Bearer JWT |
| `GET`   | `/global-search/schema/all`     | `admin` | `schema.findAll`  | Bearer JWT |
| `GET`   | `/global-search/settings`       | `admin` | `settings.find`   | Bearer JWT |
| `PUT`   | `/global-search/settings`       | `admin` | `settings.update` | Bearer JWT |
| `POST`  | `/global-search/settings/reset` | `admin` | `settings.reset`  | Bearer JWT |
