---
title: "التنقل القابل للطي — دليل المطور وواجهة الإدارة"
description: "المرجع الشامل للمطورين وكيانات أنواع المحتوى وحالات الاستخدام وإعدادات الخادم وجولة مصورة في لوحة تحكم Strapi v5 لإضافة @vicacha-devs/strapi-plugin-collapsible-nav."
---

## 1. التثبيت وإعداد الاعتماديات

```bash
pnpm add @vicacha-devs/strapi-plugin-collapsible-nav
```

## 2. إعدادات الخادم (`config/plugins.ts`)

أضف إعدادات الإضافة إلى ملف `config/plugins.ts` في مشروع Strapi v5 الخاص بك:

```ts
// config/plugins.ts
export default ({
  env,
}: {
  env: (key: string, defaultValue?: string) => string;
}) => ({
  "collapsible-nav": {
    enabled: true,
    config: {
      // No options: install, enable, and restart Strapi.
    },
  },
});
```

## 3. جولة في واجهة الإدارة (Strapi v5 Admin UI — دعم RTL)

بمجرد تفعيل الإضافة، يتم تسجيل مساحة العمل والإعدادات داخل لوحة تحكم Strapi v5 مع دعم كامل للغة العربية واتجاه RTL:

### نماذج من نصوص الواجهة المعربة (العربية)

| مفتاح الترجمة     | النص المعروض في الواجهة                  |
| :---------------- | :--------------------------------------- |
| `plugin.name`     | قائمة جانبية قابلة للطي                  |
| `toggle.expand`   | توسيع القائمة                            |
| `toggle.collapse` | طي القائمة                               |
| `pin.pin`         | تثبيت القائمة الجانبية مفتوحة            |
| `pin.unpin`       | إلغاء تثبيت القائمة الجانبية (طي تلقائي) |

## 4. كيانات أنواع المحتوى ومواقعها ومخططاتها (`strapi.documents`)

Registers no Content-Types, routes, or server services (`server/index.ts` exports an empty object). The admin entry registers the plugin and calls `initCollapsibleNav()` once from `bootstrap()`: a DOM controller that finds Strapi's main left navigation, adds a floating chevron toggle and a Pin/Unpin control, animates the width between `22.4rem` (expanded) and `5.6rem` (collapsed), and stores both choices in the browser's `localStorage` (`strapi-collapsible-nav:expanded` and `strapi-collapsible-nav:pinned`). It only activates at Strapi's `large` desktop breakpoint (`>= 1080px`).

```mermaid
flowchart LR
  Boot["Strapi Admin bootstrap()"] --> Init["initCollapsibleNav()"]
  Init --> Nav["Enhance Left Navigation (Chevron Toggle + Pin/Unpin)"]
  Nav --> Store["localStorage: strapi-collapsible-nav:expanded / :pinned"]
```

### أين تجد كيانات أنواع المحتوى في Strapi v5

- **Every Admin Page**: the chevron toggle sits on the edge of the left navigation sidebar across `/admin/*`, with the Pin/Unpin control next to it.
- **Browser Storage**: `localStorage` keys `strapi-collapsible-nav:expanded` and `strapi-collapsible-nav:pinned` (per browser profile, not per Strapi user).
- **No Content-Types or API**: this plugin creates no entities, routes, settings page, or database tables.

تعمل هذه الإضافة مباشرة على كيانات أنواع المحتوى الحالية في Strapi (`api::*` و `plugin::*`).

## التكامل مع مدير المحتوى في Strapi v5 (`/admin/content-manager`)

> **مجموعة الشريط الجانبي في مدير المحتوى**: `Applies to Strapi's left navigation on every admin page, including all Content Manager screens`

### الكيانات والمكونات المسجلة في مدير المحتوى

- Strapi main left navigation (`NavBrand`, menu links, `NavUser`), enhanced in place with a chevron toggle and a Pin/Unpin control
- Browser `localStorage` keys `strapi-collapsible-nav:expanded` and `strapi-collapsible-nav:pinned` (no Content-Type, route, or database table is created)

### لماذا تنشئ هذه الإضافة كيانات داخل مدير المحتوى (Content Manager)؟

`@vicacha-devs/strapi-plugin-collapsible-nav` does not add fields or panels to Content Manager documents. It gives editors more horizontal room while they work in Content Manager lists and edit views by letting them collapse the left navigation that Strapi v5 does not collapse on desktop.

- **Wider Content Manager Lists and Edit Views**: collapse the sidebar to `5.6rem` icons to fit more columns and wider rich-text fields on screen.
- **Zero Configuration, Zero Server Footprint**: install, enable, and restart Strapi; there are no options, routes, or install scripts.
- **Per-Browser Preference**: the expanded and pinned state is remembered in `localStorage`, so each editor keeps their own layout.

### كيفية الاستخدام داخل مدير المحتوى في Strapi (خطوة بخطوة)

1. **Open Any Content Manager Screen**: go to `/admin/content-manager` on a desktop viewport (`>= 1080px`).
2. **Click the Chevron Toggle**: use the control on the sidebar edge to collapse or expand the navigation.
3. **Choose Pinned or Hover-to-Peek**: use Pin/Unpin to keep the labels visible, or leave the sidebar compact and hover it to read the labels.

### التزامن بين مدير المحتوى ومساحة عمل الإضافة

```mermaid
flowchart LR
  CM["Content Manager List or Edit View"] --> Toggle["Chevron Toggle (Collapse / Expand)"]
  Toggle --> Space["More Horizontal Room for Fields and Tables"]
  Toggle --> Remember["Preference Saved in localStorage"]
```

### حالات الاستخدام داخل مدير المحتوى ومسارات العمل التحريرية

#### Content Manager Use Case 1 — Editing Wide Entries Without Horizontal Squeeze

- **الغرض والأهمية**: Keep wide Content Manager tables and multi-column edit views readable on laptop screens by collapsing the navigation to icons.
- **خطوات التنفيذ في مدير المحتوى**: Open a collection in `/admin/content-manager`, click the chevron toggle to collapse the sidebar, and reopen it later; the collapsed state is restored automatically.

## 5. حالات الاستخدام ومسارات العمل المتكاملة

### Use Case 1 — Reclaiming Workspace Width on Dense Admin Pages

- **What it is for**: Give editors more room for wide Content Manager tables, the Calendar, and the Media Library by collapsing the left navigation to icons only (`5.6rem`).
- **How it works**: Click the chevron toggle on the sidebar edge; the width animates between `22.4rem` and `5.6rem` while icons, the brand logo, and the user avatar stay anchored. The choice is saved in `strapi-collapsible-nav:expanded` and restored on the next visit.

```mermaid
flowchart LR
  Toggle["Chevron Toggle on Sidebar Edge"] --> Width["Width 22.4rem <-> 5.6rem (260ms transition)"]
  Width --> Persist["localStorage strapi-collapsible-nav:expanded"]
```

### Use Case 2 — Compact Sidebar with Hover-to-Peek (Unpinned Mode)

- **What it is for**: Keep the navigation compact by default but still read the full labels on demand.
- **How it works**: Unpin the sidebar with the Pin/Unpin control: it stays at `5.6rem` and expands on hover, then collapses again. Pin it to keep the labels visible. The state is saved in `strapi-collapsible-nav:pinned`.

```mermaid
flowchart LR
  Pin["Pin / Unpin Control"] --> Mode{"Pinned?"}
  Mode -- "Yes" --> Open["Stays Expanded (22.4rem)"]
  Mode -- "No" --> Peek["Compact (5.6rem) + Expand on Hover"]
```

### Use Case 3 — Localized, Theme-Aware Labels for Multilingual Teams

- **What it is for**: Show tooltips and control labels in each editor's language and in the active light or dark theme.
- **How it works**: The controller reads each menu link's localized `aria-label` (plus the `NavBrand` and `NavUser` labels) so collapsed items keep readable tooltips; toggle and pin labels come from the plugin's `en`, `es`, `ar`, `fr`, and `tr` translations registered through `registerTrads`, and colors follow Strapi's `STRAPI_THEME` setting or the system preference.

```mermaid
flowchart LR
  Links["Menu Links (localized aria-label)"] --> Tips["Tooltips on Collapsed Items"]
  Trads["registerTrads: en, es, ar, fr, tr"] --> Labels["Toggle and Pin Labels"]
  Theme["STRAPI_THEME or prefers-color-scheme"] --> Colors["Light / Dark Colors"]
```

## 6. نقاط النهاية البرمجية REST API (`content-api` و `admin`)

| الطريقة | مسار نقطة النهاية | النطاق | المعالج (Handler) | المصادقة |
| :------ | :---------------- | :----- | :---------------- | :------- |

## 7. الاستخدام البرمجي داخل الخادم (`strapi.plugin` و `strapi.documents`)

```ts
// Registered services on plugin "collapsible-nav": "service"
const pluginService = strapi.plugin("collapsible-nav")?.service("service");

// Retrieving plugin settings via Strapi plugin store
const store = strapi.store({ type: "plugin", name: "collapsible-nav" });
const settings = await store.get({ key: "settings" });
```

## 8. استكشاف الأخطاء والتحقق من الجودة

- **عدم ظهور التغييرات في لوحة الإدارة**: قم بتشغيل `pnpm strapi build` بعد تعديل ملف `config/plugins.ts`.
- **عزل حزم Strapi**: حافظ على إعداد `hoistPattern: ["*", "!@strapi/*"]` داخل `pnpm-workspace.yaml` لمنع تكرار سياق React.
- **فحص الأنواع الصارم (TypeScript)**: قم بتشغيل `pnpm check` للتحقق من سلامة حزمتي الواجهة والخادم.
