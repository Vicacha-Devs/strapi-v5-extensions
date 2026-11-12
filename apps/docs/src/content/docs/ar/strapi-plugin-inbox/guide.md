---
title: "صندوق الوارد والنماذج والتنبيهات — دليل المطور وواجهة الإدارة"
description: "المرجع الشامل للمطورين وكيانات أنواع المحتوى وحالات الاستخدام وإعدادات الخادم وجولة مصورة في لوحة تحكم Strapi v5 لإضافة @vicacha-devs/strapi-plugin-inbox."
---

## 1. التثبيت وإعداد الاعتماديات

```bash
pnpm add @vicacha-devs/strapi-plugin-inbox
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
  inbox: {
    enabled: true,
    config: {
      enableRateLimiting: true,
      doubleOptInRequired: true,
    },
  },
});
```

![صندوق الوارد والنماذج والتنبيهات — Strapi v5 Settings Panel](/screenshots/inbox-settings.png)

## 3. جولة في واجهة الإدارة (Strapi v5 Admin UI — دعم RTL)

بمجرد تفعيل الإضافة، يتم تسجيل مساحة العمل والإعدادات داخل لوحة تحكم Strapi v5 مع دعم كامل للغة العربية واتجاه RTL:

![صندوق الوارد والنماذج والتنبيهات — Strapi v5 Admin UI](/screenshots/inbox-admin.png)

### نماذج من نصوص الواجهة المعربة (العربية)

| مفتاح الترجمة                                             | النص المعروض في الواجهة                            |
| :-------------------------------------------------------- | :------------------------------------------------- |
| `page.ui.inbox_visual_form_builder_service_desk_casework` | Inbox, Visual Form Builder & Service-Desk Casework |
| `page.ui.starter_form_templates_active_forms`             | Starter Form Templates & Active Forms              |
| `page.ui.slug`                                            | Slug                                               |
| `page.ui.title`                                           | العنوان                                            |
| `page.ui.category`                                        | الفئة                                              |
| `page.ui.fields`                                          | Fields                                             |
| `page.ui.checklist`                                       | Checklist                                          |
| `page.ui.submissions`                                     | Submissions                                        |

## 4. كيانات أنواع المحتوى ومواقعها ومخططاتها (`strapi.documents`)

Registers three Collection Types (`plugin::inbox.submission`, `plugin::inbox.subscriber`, and `plugin::inbox.alert-banner`). Submissions capture dynamic form payloads and service-desk tickets; Subscribers manage double opt-in topic lists; Alert Banners drive time-bounded site-wide urgent tickers.

```mermaid
flowchart LR
  Form["Dynamic Form Builder (/api/inbox/forms/{slug})"] --> Submission["plugin::inbox.submission (Service-Desk Ticket)"]
  OptIn["POST /api/inbox/subscribers"] --> Subscriber["plugin::inbox.subscriber (Double Opt-In)"]
  AlertAdmin["Alert Manager & Islam Hilal Bridge"] --> Banner["plugin::inbox.alert-banner (GET /api/inbox/alerts)"]
```

### أين تجد كيانات أنواع المحتوى في Strapi v5

- **Content Manager**: `/admin/content-manager/collection-types/plugin::inbox.submission`, `plugin::inbox.subscriber`, and `plugin::inbox.alert-banner` (`visible: true`)
- **Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Inbox Submission`, `Inbox Subscriber`, `Inbox Alert Banner`)
- **Plugin Workspace & Settings**: `/admin/plugins/inbox` (Service Desk Inbox, Subscribers, Alert Banners) and `/admin/settings/inbox`
- **Database Tables**: `inbox_submissions`, `inbox_subscribers`, and `inbox_alert_banners`

### `plugin::inbox.alert-banner` — Inbox Alert Banner

Time-bounded multi-language urgent announcement ticker / banner

> **Kind**: `collectionType` · **DB Table**: `inbox_alert_banners` · **Admin Location**: `/admin/content-manager/collection-types/plugin::inbox.alert-banner` · **Draft & Publish**: `No` · **i18n**: `No`

| الحقل          | النوع في Strapi | إلزامي | القيود / العلاقات                                              |
| :------------- | :-------------- | :----- | :------------------------------------------------------------ |
| `code`         | `string`        | Yes    | —                                                             |
| `title`        | `string`        | Yes    | —                                                             |
| `message`      | `text`          | Yes    | —                                                             |
| `severity`     | `enumeration`   | Yes    | enum: `info, warning, urgent, celebration`; default: `"info"` |
| `ctaLabel`     | `string`        | No     | —                                                             |
| `ctaUrl`       | `string`        | No     | —                                                             |
| `dismissible`  | `boolean`       | No     | default: `true`                                               |
| `active`       | `boolean`       | No     | default: `true`                                               |
| `priority`     | `integer`       | No     | default: `10`                                                 |
| `startsAt`     | `datetime`      | No     | —                                                             |
| `endsAt`       | `datetime`      | No     | —                                                             |
| `translations` | `json`          | No     | default: `{}`                                                 |

### `plugin::inbox.submission` — Inbox Submission

Form submission & Service-Desk Casework ticket

> **Kind**: `collectionType` · **DB Table**: `inbox_submissions` · **Admin Location**: `/admin/content-manager/collection-types/plugin::inbox.submission` · **Draft & Publish**: `No` · **i18n**: `No`

| الحقل                     | النوع في Strapi | إلزامي | القيود / العلاقات                                                                             |
| :------------------------ | :-------------- | :----- | :------------------------------------------------------------------------------------------- |
| `referenceCode`           | `string`        | Yes    | —                                                                                            |
| `formSlug`                | `string`        | Yes    | —                                                                                            |
| `formTitle`               | `string`        | No     | —                                                                                            |
| `category`                | `enumeration`   | No     | enum: `contact, service_desk, inquiry, application, volunteer, custom`; default: `"contact"` |
| `status`                  | `enumeration`   | Yes    | enum: `new, read, under_review, scheduled, completed, rejected, archived`; default: `"new"`  |
| `priority`                | `enumeration`   | Yes    | enum: `low, normal, high, urgent`; default: `"normal"`                                       |
| `department`              | `string`        | No     | default: `"general"`                                                                         |
| `locale`                  | `string`        | No     | default: `"es"`                                                                              |
| `applicantName`           | `string`        | No     | —                                                                                            |
| `applicantEmail`          | `email`         | No     | —                                                                                            |
| `applicantPhone`          | `string`        | No     | —                                                                                            |
| `data`                    | `json`          | Yes    | default: `{}`                                                                                |
| `checklistItems`          | `json`          | No     | default: `[]`                                                                                |
| `staffNotes`              | `text`          | No     | —                                                                                            |
| `assignedTo`              | `string`        | No     | —                                                                                            |
| `linkedBookingId`         | `string`        | No     | —                                                                                            |
| `linkedCertificateNumber` | `string`        | No     | —                                                                                            |
| `formBuilderSubmissionId` | `integer`       | No     | —                                                                                            |
| `ipAddress`               | `string`        | No     | `private: true`                                                                              |
| `userAgent`               | `string`        | No     | `private: true`                                                                              |
| `submittedAt`             | `datetime`      | Yes    | —                                                                                            |
| `secondaryDate`           | `json`          | No     | —                                                                                            |

### `plugin::inbox.subscriber` — Inbox Subscriber

Double Opt-In newsletter and community topic subscriber

> **Kind**: `collectionType` · **DB Table**: `inbox_subscribers` · **Admin Location**: `/admin/content-manager/collection-types/plugin::inbox.subscriber` · **Draft & Publish**: `No` · **i18n**: `No`

| الحقل              | النوع في Strapi | إلزامي | القيود / العلاقات                                               |
| :----------------- | :-------------- | :----- | :------------------------------------------------------------- |
| `email`            | `email`         | Yes    | —                                                              |
| `fullName`         | `string`        | No     | —                                                              |
| `phone`            | `string`        | No     | —                                                              |
| `locale`           | `string`        | No     | default: `"es"`                                                |
| `topics`           | `json`          | No     | default: `["announcements"]`                                   |
| `status`           | `enumeration`   | Yes    | enum: `pending, confirmed, unsubscribed`; default: `"pending"` |
| `confirmToken`     | `string`        | No     | `private: true`                                                |
| `unsubscribeToken` | `string`        | Yes    | `private: true`                                                |
| `confirmedAt`      | `datetime`      | No     | —                                                              |
| `unsubscribedAt`   | `datetime`      | No     | —                                                              |
| `sourceFormSlug`   | `string`        | No     | —                                                              |

## التكامل مع مدير المحتوى في Strapi v5 (`/admin/content-manager`)

> **مجموعة الشريط الجانبي في مدير المحتوى**: `Inbox & Omnichannel Broadcasts`

### الكيانات والمكونات المسجلة في مدير المحتوى

- `plugin::inbox.submission` (**Inbox Submission** — `/admin/content-manager/collection-types/plugin::inbox.submission`)
- `plugin::inbox.subscriber` (**Inbox Subscriber** — `/admin/content-manager/collection-types/plugin::inbox.subscriber`)
- `plugin::inbox.alert-banner` (**Inbox Alert Banner** — `/admin/content-manager/collection-types/plugin::inbox.alert-banner`)

![صندوق الوارد والنماذج والتنبيهات — واجهة إدارة الكيانات في مدير المحتوى Strapi v5](/screenshots/inbox-content-manager.png)

### لماذا تنشئ هذه الإضافة كيانات داخل مدير المحتوى (Content Manager)؟

`@vicacha-devs/strapi-plugin-inbox` registers all three of its entities (`Inbox Submission`, `Inbox Subscriber`, and `Inbox Alert Banner`) with `pluginOptions['content-manager'].visible = true` so service-desk coordinators, newsletter managers, and editors can combine the operational triage board in `/admin/plugins/inbox` with Strapi v5's native Content Manager:

- **Structured Casework & Cross-Entity Linking**: In Content Manager, `Inbox Submission` (`plugin::inbox.submission`) exposes `referenceCode`, `category`, `status`, `priority`, `department`, `checklistItems`, `linkedBookingId`, and `linkedCertificateNumber` while keeping `ipAddress` and `userAgent` protected (`private: true`).
- **Subscriber Topic & GDPR Compliance Management**: Filter `Inbox Subscriber` (`plugin::inbox.subscriber`) by `status` (`pending`, `confirmed`, `unsubscribed`), `locale`, and `topics` while `confirmToken` and `unsubscribeToken` remain private.
- **Time-Bounded Urgent Alert Authoring**: Author and schedule `Inbox Alert Banner` (`plugin::inbox.alert-banner`) records (`severity`: `info`, `warning`, `urgent`, `celebration`, `startsAt`, `endsAt`, `translations`) directly in Content Manager.

### كيفية الاستخدام داخل مدير المحتوى في Strapi (خطوة بخطوة)

1. **Open in Content Manager**: In the left sidebar, navigate to **Content Manager -> Collection Types -> Inbox & Omnichannel Broadcasts** and select **Inbox Submission**, **Inbox Subscriber**, or **Inbox Alert Banner**.
2. **Manage Urgent Alert Banners**: Open **Inbox Alert Banner** (`/admin/content-manager/collection-types/plugin::inbox.alert-banner`) to create or toggle site-wide announcements (`RAMADAN-HILAL-1447`, `JUMUAH-LIVE-KHUTBAH`, `WINTER-BLANKET-CAMPAIGN`).
3. **Filter & Assign Service-Desk Submissions**: Open **Inbox Submission** (`/admin/content-manager/collection-types/plugin::inbox.submission`) to filter tickets by `priority = urgent`, `department`, or `status = under_review`, and update `assignedTo` and `staffNotes`.
4. **Workspace vs. Content Manager**: Use **Content Manager** for bulk filtering, alert banner scheduling, and subscriber list audits; use the **Inbox Workspace** (`/admin/plugins/inbox`) for dynamic form schema design and interactive service-desk SLA triage.

### التزامن بين مدير المحتوى ومساحة عمل الإضافة

```mermaid
flowchart LR
  CM["Strapi Content Manager (/admin/content-manager)"] --> Sub["Inbox Submission (plugin::inbox.submission)"]
  CM --> News["Inbox Subscriber (plugin::inbox.subscriber)"]
  CM --> Alert["Inbox Alert Banner (plugin::inbox.alert-banner)"]
  Alert -->|"GET /api/inbox/alerts"| Ticker["Live Website Urgent Header Ticker"]
  News -->|"Confirmed Subscribers"| Broadcasts["Omnichannel Broadcasts Bridge"]
```

### حالات الاستخدام داخل مدير المحتوى ومسارات العمل التحريرية

#### Content Manager Use Case 1 — Scheduling Multilingual Urgent & Celebration Alert Banners

- **الغرض والأهمية**: Publish time-bounded header banners for Ramadan Hilal confirmation (`severity: 'celebration'`), Friday live khutbah streams (`info`), or emergency relief appeals (`urgent`).
- **خطوات التنفيذ في مدير المحتوى**: Open `/admin/content-manager/collection-types/plugin::inbox.alert-banner`, click **+ Create new entry**, set `code`, `title`, `message`, `severity`, `startsAt`, `endsAt`, and `translations`, and save.

#### Content Manager Use Case 2 — Auditing Service-Desk Submissions & Linking Bookings/Certificates

- **الغرض والأهمية**: Filter high-priority counseling or matrimonial requests in Content Manager and link them to an appointment (`linkedBookingId`) or certificate (`linkedCertificateNumber`).
- **خطوات التنفيذ في مدير المحتوى**: Open `/admin/content-manager/collection-types/plugin::inbox.submission`, filter by `priority = high`, and update the record.

## 5. حالات الاستخدام ومسارات العمل المتكاملة

### Use Case 1 — Dynamic Public Form Builder & Service-Desk Casework Triage

- **What it is for**: Render multi-step contact, matrimonial, counseling, or volunteer forms on the frontend and triage submissions with SLA priorities and staff checklists.
- **How it works**: Fetch form schemas via `GET /api/inbox/forms/{slug}`, submit via `POST /api/inbox/submit` (creating `plugin::inbox.submission` with a `referenceCode`), and track status via `GET /api/inbox/track/{referenceCode}`.

```mermaid
flowchart LR
  Schema["GET /api/inbox/forms/{slug}"] --> Submit["POST /api/inbox/forms/{slug}/submit"]
  Submit --> Ticket["Create plugin::inbox.submission (referenceCode)"]
  Ticket --> Casework["Staff Triage, Checklist & Booking/Certificate Bridge"]
```

![Inbox, Forms & Alert Banners — Strapi v5 Admin Workspace](/screenshots/inbox-admin.png)

### Use Case 2 — Double Opt-In Newsletter & Topic Subscription Management

- **What it is for**: Collect GDPR-compliant newsletter and community topic subscribers with tokenized confirmation and 1-click unsubscribe.
- **How it works**: `POST /api/inbox/subscribe` creates a `plugin::inbox.subscriber` in `pending` status; `POST /api/inbox/confirm` and `POST /api/inbox/unsubscribe` verify `confirmToken` / `unsubscribeToken` (`private: true`).

```mermaid
flowchart LR
  Sub["POST /api/inbox/subscribers"] --> Pending["plugin::inbox.subscriber (status = pending)"]
  Pending --> Confirm["GET /api/inbox/subscribers/confirm/{token}"]
  Confirm --> Active["status = confirmed (Ready for Broadcasts)"]
```

![Inbox, Forms & Alert Banners — Strapi v5 Settings Panel](/screenshots/inbox-settings.png)

### Use Case 3 — Time-Bounded Multilingual Site-Wide Alert Banners

- **What it is for**: Publish urgent announcements (e.g., Ramadan Hilal sighting, weather closure, live stream alert) in the website header ticker.
- **How it works**: Create `plugin::inbox.alert-banner` records with `severity` (`info`, `warning`, `urgent`, `celebration`), `startsAt`, `endsAt`, and `translations`; fetch active banners via `GET /api/inbox/alerts`.

```mermaid
flowchart LR
  Create["Upsert plugin::inbox.alert-banner (startsAt..endsAt)"] --> ActiveFilter["Filter Active & Non-Expired Banners"]
  ActiveFilter --> HeaderTicker["GET /api/inbox/alerts (Localized Urgent Ticker)"]
```

![Inbox, Forms & Alert Banners — Strapi v5 Content Manager Entities](/screenshots/inbox-content-manager.png)

## 6. نقاط النهاية البرمجية REST API (`content-api` و `admin`)

| الطريقة | مسار نقطة النهاية                                   | النطاق        | المعالج (Handler)                      | المصادقة   |
| :------ | :-------------------------------------------------- | :------------ | :------------------------------------- | :--------- |
| `GET`   | `/api/inbox/forms`                                  | `content-api` | `inboxController.listForms`            | Public     |
| `GET`   | `/api/inbox/forms/{slug}`                           | `content-api` | `inboxController.getFormBySlug`        | Public     |
| `POST`  | `/api/inbox/forms/{slug}/submit`                    | `content-api` | `inboxController.submitForm`           | Public     |
| `POST`  | `/api/inbox/subscribers`                            | `content-api` | `inboxController.subscribe`            | Public     |
| `GET`   | `/api/inbox/subscribers/confirm/{token}`            | `content-api` | `inboxController.confirmSubscription`  | Public     |
| `GET`   | `/api/inbox/subscribers/unsubscribe/{token}`        | `content-api` | `inboxController.unsubscribe`          | Public     |
| `GET`   | `/api/inbox/public/unsubscribe`                     | `content-api` | `inboxController.unsubscribe`          | Public     |
| `GET`   | `/api/inbox/alerts`                                 | `content-api` | `inboxController.getActiveAlerts`      | Public     |
| `GET`   | `/inbox/settings`                                   | `admin`       | `inboxController.getSettings`          | Bearer JWT |
| `PUT`   | `/inbox/settings`                                   | `admin`       | `inboxController.updateSettings`       | Bearer JWT |
| `GET`   | `/inbox/templates`                                  | `admin`       | `inboxController.listTemplates`        | Bearer JWT |
| `GET`   | `/inbox/form-builder-forms`                         | `admin`       | `inboxController.listFormBuilderForms` | Bearer JWT |
| `POST`  | `/inbox/forms/sync-builder`                         | `admin`       | `inboxController.syncFormBuilder`      | Bearer JWT |
| `GET`   | `/inbox/forms`                                      | `admin`       | `inboxController.listForms`            | Bearer JWT |
| `POST`  | `/inbox/forms`                                      | `admin`       | `inboxController.saveForm`             | Bearer JWT |
| `POST`  | `/inbox/forms/from-template`                        | `admin`       | `inboxController.createFromTemplate`   | Bearer JWT |
| `GET`   | `/inbox/submissions`                                | `admin`       | `inboxController.listSubmissions`      | Bearer JWT |
| `PUT`   | `/inbox/submissions/{documentId}/casework`          | `admin`       | `inboxController.updateCasework`       | Bearer JWT |
| `POST`  | `/inbox/submissions/{documentId}/schedule-booking`  | `admin`       | `inboxController.scheduleBooking`      | Bearer JWT |
| `POST`  | `/inbox/submissions/{documentId}/issue-certificate` | `admin`       | `inboxController.issueCertificate`     | Bearer JWT |
| `GET`   | `/inbox/submissions/export-csv`                     | `admin`       | `inboxController.exportCsv`            | Bearer JWT |
| `POST`  | `/inbox/captcha/test`                               | `admin`       | `inboxController.testCaptcha`          | Bearer JWT |
| `GET`   | `/inbox/subscribers`                                | `admin`       | `inboxController.listSubscribers`      | Bearer JWT |
| `GET`   | `/inbox/alerts`                                     | `admin`       | `inboxController.getActiveAlerts`      | Bearer JWT |
| `POST`  | `/inbox/alerts`                                     | `admin`       | `inboxController.upsertAlertBanner`    | Bearer JWT |

## 7. الاستخدام البرمجي داخل الخادم (`strapi.plugin` و `strapi.documents`)

```ts
// Registered services on plugin "inbox": "settings", "formService", "submissionService", "subscriberService", "alertService"
const pluginService = strapi.plugin("inbox")?.service("formService");

// Querying records via the Strapi v5 Document Service API
const records = await strapi.documents("plugin::inbox.alert-banner").findMany({
  limit: 25,
  sort: "createdAt:desc",
});
```

## 8. استكشاف الأخطاء والتحقق من الجودة

- **عدم ظهور التغييرات في لوحة الإدارة**: قم بتشغيل `pnpm strapi build` بعد تعديل ملف `config/plugins.ts`.
- **عزل حزم Strapi**: حافظ على إعداد `hoistPattern: ["*", "!@strapi/*"]` داخل `pnpm-workspace.yaml` لمنع تكرار سياق React.
- **فحص الأنواع الصارم (TypeScript)**: قم بتشغيل `pnpm check` للتحقق من سلامة حزمتي الواجهة والخادم.
