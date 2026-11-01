---
title: "الفعاليات والتسجيل والحضور — دليل المطور وواجهة الإدارة"
description: "المرجع الشامل للمطورين وكيانات أنواع المحتوى وحالات الاستخدام وإعدادات الخادم وجولة مصورة في لوحة تحكم Strapi v5 لإضافة @vicacha-devs/strapi-plugin-events."
---

## 1. التثبيت وإعداد الاعتماديات

```bash
pnpm add @vicacha-devs/strapi-plugin-calendar @vicacha-devs/strapi-plugin-events
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
  events: {
    enabled: true,
    config: {
      defaultTimezone: env("CALENDAR_DEFAULT_TIMEZONE", "UTC"),
      defaultCapacity: 100,
      waitlistEnabledByDefault: true,
    },
  },
});
```

![الفعاليات والتسجيل والحضور — Strapi v5 Settings Panel](/screenshots/events-settings.png)

## 3. جولة في واجهة الإدارة (Strapi v5 Admin UI — دعم RTL)

بمجرد تفعيل الإضافة، يتم تسجيل مساحة العمل والإعدادات داخل لوحة تحكم Strapi v5 مع دعم كامل للغة العربية واتجاه RTL:

![الفعاليات والتسجيل والحضور — Strapi v5 Admin UI](/screenshots/events-admin.png)

### نماذج من نصوص الواجهة المعربة (العربية)

| مفتاح الترجمة                  | النص المعروض في الواجهة   |
| :----------------------------- | :------------------------ |
| `sidePanel.title`              | ملخص الفعالية والحجوزات   |
| `sidePanel.secondaryCalendars` | Alternative التقويم Dates |
| `sidePanel.rsvpStatus`         | الحجوزات والسعة           |
| `sidePanel.full`               | مكتمل / قائمة الانتظار     |
| `sidePanel.open`               | متاح                      |
| `sidePanel.confirmedSeats`     | المقاعد المؤكدة           |
| `sidePanel.checkedIn`          | تم تسجيل حضورهم           |
| `sidePanel.waitlisted`         | في قائمة الانتظار          |

## 4. كيانات أنواع المحتوى ومواقعها ومخططاتها (`strapi.documents`)

Registers two Collection Types (`plugin::events.event` with `draftAndPublish: true` & `i18n.localized: true`, and `plugin::events.registration`) plus the `plugin::events.rrule` Custom Field. Also supports binding additional custom `api::*` event collections via `sources[]` and extending schemas via `schemaExtensions` in `config/plugins.ts`.

```mermaid
flowchart LR
  Event["plugin::events.event (plugin_events_items)"] -->|"1 : N registrations"| Reg["plugin::events.registration (RSVP & Waitlist)"]
  Event -->|"RRULE + RSCALE"| CalBridge["Unified Calendar Bridge & /api/events/ical.ics"]
```

### أين تجد كيانات أنواع المحتوى في Strapi v5

- **Content Manager**: `/admin/content-manager/collection-types/plugin::events.event` & `/admin/content-manager/collection-types/plugin::events.registration` (`visible: true`)
- **Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Event` & `Event Registration (RSVP)`) + Custom Field `plugin::events.rrule`
- **Plugin Workspace & Settings**: `/admin/plugins/events` (Events Manager, RSVP Roster, Waitlist, Check-In) and `/admin/settings/events`
- **Database Tables**: `plugin_events_items` and `plugin_events_registrations`

### `plugin::events.event` — Event

Recurring & single events managed by strapi-plugin-events

> **Kind**: `collectionType` · **DB Table**: `plugin_events_items` · **Admin Location**: `/admin/content-manager/collection-types/plugin::events.event` · **Draft & Publish**: `Yes` · **i18n**: `Yes`

| الحقل                      | النوع في Strapi | إلزامي | القيود / العلاقات                                                             |
| :------------------------- | :-------------- | :----- | :--------------------------------------------------------------------------- |
| `title`                    | `string`        | Yes    | max: 200                                                                     |
| `slug`                     | `uid`           | Yes    | —                                                                            |
| `summary`                  | `text`          | No     | max: 500                                                                     |
| `description`              | `richtext`      | No     | —                                                                            |
| `startDate`                | `datetime`      | Yes    | —                                                                            |
| `endDate`                  | `datetime`      | No     | —                                                                            |
| `allDay`                   | `boolean`       | No     | default: `false`                                                             |
| `timezone`                 | `string`        | No     | default: `"UTC"`                                                             |
| `recurrence`               | `customField`   | No     | customField: `plugin::events.rrule`                                          |
| `eventStatus`              | `enumeration`   | Yes    | enum: `scheduled, cancelled, postponed, rescheduled`; default: `"scheduled"` |
| `locationType`             | `enumeration`   | No     | enum: `in_person, online, hybrid`; default: `"in_person"`                    |
| `location`                 | `string`        | No     | —                                                                            |
| `virtualUrl`               | `string`        | No     | —                                                                            |
| `category`                 | `string`        | No     | default: `"general"`                                                         |
| `speaker`                  | `string`        | No     | —                                                                            |
| `speakerSlug`              | `string`        | No     | —                                                                            |
| `color`                    | `string`        | No     | default: `"#0D9488"`                                                         |
| `featured`                 | `boolean`       | No     | default: `false`                                                             |
| `rsvpEnabled`              | `boolean`       | No     | default: `false`                                                             |
| `capacity`                 | `integer`       | No     | —                                                                            |
| `waitlistEnabled`          | `boolean`       | No     | default: `true`                                                              |
| `maxGuestsPerRegistration` | `integer`       | No     | default: `5`                                                                 |
| `registrationDeadline`     | `datetime`      | No     | —                                                                            |
| `alternateDates`           | `json`          | No     | —                                                                            |
| `poster`                   | `media`         | No     | —                                                                            |
| `actionLinks`              | `json`          | No     | —                                                                            |
| `spotlightConfig`          | `json`          | No     | —                                                                            |
| `metadata`                 | `json`          | No     | —                                                                            |

### `plugin::events.registration` — Event Registration (RSVP)

Attendee RSVPs, waitlists, and check-ins managed by strapi-plugin-events

> **Kind**: `collectionType` · **DB Table**: `plugin_events_registrations` · **Admin Location**: `/admin/content-manager/collection-types/plugin::events.registration` · **Draft & Publish**: `No` · **i18n**: `No`

| الحقل             | النوع في Strapi | إلزامي | القيود / العلاقات                                                             |
| :---------------- | :-------------- | :----- | :--------------------------------------------------------------------------- |
| `eventUid`        | `string`        | Yes    | default: `"plugin::events.event"`                                            |
| `eventDocumentId` | `string`        | Yes    | —                                                                            |
| `eventTitle`      | `string`        | No     | —                                                                            |
| `occurrenceDate`  | `string`        | Yes    | —                                                                            |
| `attendeeName`    | `string`        | Yes    | max: 160                                                                     |
| `attendeeEmail`   | `email`         | Yes    | —                                                                            |
| `attendeePhone`   | `string`        | No     | max: 50                                                                      |
| `guestsCount`     | `integer`       | Yes    | default: `1`                                                                 |
| `status`          | `enumeration`   | Yes    | enum: `confirmed, waitlisted, cancelled, checked_in`; default: `"confirmed"` |
| `checkInToken`    | `string`        | No     | `private: true`                                                              |
| `checkedInAt`     | `datetime`      | No     | —                                                                            |
| `locale`          | `string`        | No     | default: `"es"`                                                              |
| `notes`           | `text`          | No     | max: 2000                                                                    |
| `metadata`        | `json`          | No     | —                                                                            |

## التكامل مع مدير المحتوى في Strapi v5 (`/admin/content-manager`)

> **مجموعة الشريط الجانبي في مدير المحتوى**: `Events, Scheduling & Bookings`

### الكيانات والمكونات المسجلة في مدير المحتوى

- `plugin::events.event` (**Event** — `/admin/content-manager/collection-types/plugin::events.event`)
- `plugin::events.registration` (**Event Registration (RSVP)** — `/admin/content-manager/collection-types/plugin::events.registration`)
- Custom Field `plugin::events.rrule`

![الفعاليات والتسجيل والحضور — واجهة إدارة الكيانات في مدير المحتوى Strapi v5](/screenshots/events-content-manager.png)

### لماذا تنشئ هذه الإضافة كيانات داخل مدير المحتوى (Content Manager)؟

`@vicacha-devs/strapi-plugin-events` registers **Event** (`plugin::events.event`, with `i18n.localized: true` and `draftAndPublish: true`) and **Event Registration (RSVP)** (`plugin::events.registration`) as primary Content Manager collection types so editorial teams can author rich multilingual event pages while operations staff manage RSVPs and check-ins:

- **Rich Editorial & Speaker Relations**: In Content Manager, `Event` records support rich-text descriptions, poster images, speaker relations (e.g., linking `Staff, Scholar & Author` `api::leader.leader`), virtual meeting URLs, and `plugin::events.rrule` recurrence rules.
- **Multilingual (`i18n`) Event Publishing**: Author event pages across `en`, `es`, `ar`, and `tr` (`?plugins[i18n][locale]=en`) with independent draft/publish control per locale.
- **Injected Right-Sidebar Widgets**: Opening an `Event` in Content Manager displays both the **Calendar & Schedule** widget (Hijri date + `.ics` export) and the **Event & RSVP Summary** panel alongside **Editorial Notes**.
- **Direct RSVP Roster Inspection**: Inspect, filter, and search individual `Event Registration (RSVP)` records (`confirmed`, `waitlisted`, `checked_in`, `cancelled`) directly in Content Manager.

### كيفية الاستخدام داخل مدير المحتوى في Strapi (خطوة بخطوة)

1. **Open in Content Manager**: In the left sidebar, click **Content Manager -> Collection Types -> Events, Scheduling & Bookings** and select **Event** (`/admin/content-manager/collection-types/plugin::events.event?plugins[i18n][locale]=en`) or **Event Registration (RSVP)** (`/admin/content-manager/collection-types/plugin::events.registration`).
2. **Author & Localize Events**: Click **+ Create new entry** in **Event**, fill in `title`, `slug`, `summary`, `description`, `startDate`, `endDate`, `rrule`, `capacity`, and `waitlistEnabled`, then click **Publish**.
3. **Inspect RSVP Registrations**: Open **Event Registration (RSVP)** in Content Manager to filter attendees by `status`, `occurrenceDate`, `attendeeEmail`, or linked `event`.
4. **Workspace vs. Content Manager**: Use **Content Manager** for rich multilingual event authoring, poster uploads, and speaker relations; use the **Events Workspace** (`/admin/plugins/events`) for 1-click door check-in, waitlist promotion, and formula-sanitized CSV exports.

### التزامن بين مدير المحتوى ومساحة عمل الإضافة

```mermaid
flowchart LR
  CM["Strapi Content Manager (i18n + Draft & Publish)"] --> Ev["Event (plugin::events.event)"]
  CM --> Reg["Event Registration (RSVP) (plugin::events.registration)"]
  Ev -->|"1 : N registrations"| Reg
  Ev -->|"Auto-Registered Source"| Cal["Unified Calendar (/admin/plugins/calendar)"]
  Reg -->|"Check-In & CSV Roster"| WS["Events Workspace (/admin/plugins/events)"]
```

### حالات الاستخدام داخل مدير المحتوى ومسارات العمل التحريرية

#### Content Manager Use Case 1 — Authoring Multilingual Recurring Classes & Community Dinners

- **الغرض والأهمية**: Create and translate recurring educational classes (`Classical Arabic Course`), youth circles (`Weekly Youth Circle`), and scholarship announcements (`Türkiye Bursları Scholarship Orientation`) in Content Manager.
- **خطوات التنفيذ في مدير المحتوى**: Open `/admin/content-manager/collection-types/plugin::events.event?plugins[i18n][locale]=en`, edit the event attributes and `rrule` recurrence, verify the Hijri date in the right sidebar, and publish across locales.

#### Content Manager Use Case 2 — Filtering Waitlisted or Checked-In Attendees Across Occurrences

- **الغرض والأهمية**: Search attendee registrations by email, occurrence date, or dietary/accessibility notes inside Content Manager.
- **خطوات التنفيذ في مدير المحتوى**: Open `/admin/content-manager/collection-types/plugin::events.registration` and filter by `status = waitlisted` or `status = checked_in`.

## 5. حالات الاستخدام ومسارات العمل المتكاملة

### Use Case 1 — Multilingual Recurring Events with Poster & Speaker Metadata

- **What it is for**: Publish localized single or recurring lectures, workshops, and community gatherings with speaker profiles and virtual/hybrid links.
- **How it works**: Author records in `plugin::events.event` (using `plugin::events.rrule` for recurrence) and query expanded occurrences via `GET /api/events/upcoming` or `GET /api/events/calendar`.

```mermaid
flowchart LR
  Author["Author plugin::events.event (i18n + rrule)"] --> Expand["Recurrence Expansion Service"]
  Expand --> Upcoming["GET /api/events/upcoming & /api/events/calendar"]
  Expand --> ICal["GET /api/events/ical.ics"]
```

![Events, RSVP & Check-In — Strapi v5 Admin Workspace](/screenshots/events-admin.png)

### Use Case 2 — Capacity-Controlled Public RSVP & Automatic Waitlist Promotion

- **What it is for**: Enforce seat limits (`capacity`, `maxGuestsPerRegistration`) per occurrence date and automatically promote waitlisted guests when someone cancels.
- **How it works**: Visitors submit `POST /api/events/rsvp` (creating `plugin::events.registration` as `confirmed` or `waitlisted`); `POST /api/events/rsvp/cancel` cancels a seat and promotes the oldest waitlisted record.

```mermaid
flowchart LR
  RSVP["POST /api/events/rsvp"] --> CheckCap{"Seats Available?"}
  CheckCap -->|"Yes"| Confirmed["status = confirmed (confirmedCount++)"]
  CheckCap -->|"No (Full)"| Waitlist["status = waitlisted (waitlistCount++)"]
  Cancel["POST /api/events/rsvp/cancel"] --> Promote["Auto-Promote Oldest Waitlisted Guest"]
```

![Events, RSVP & Check-In — Strapi v5 Settings Panel](/screenshots/events-settings.png)

### Use Case 3 — 1-Click Door Check-In & Formula-Injection-Safe CSV Roster Export

- **What it is for**: Check in attendees at the venue entrance and export clean attendee rosters for spreadsheets.
- **How it works**: Use `POST /events/registrations/{documentId}/check-in` in `/admin/plugins/events` and download rosters via `GET /events/registrations/export.csv`.

```mermaid
flowchart LR
  CheckIn["POST /events/registrations/{documentId}/check-in"] --> Mark["status = checked_in & checkedInAt = now()"]
  Mark --> Export["GET /events/registrations/export.csv (Formula-Sanitized)"]
```

![Events, RSVP & Check-In — Strapi v5 Content Manager Entities](/screenshots/events-content-manager.png)

## 6. نقاط النهاية البرمجية REST API (`content-api` و `admin`)

| الطريقة | مسار نقطة النهاية                             | النطاق        | المعالج (Handler)                    | المصادقة   |
| :------ | :-------------------------------------------- | :------------ | :----------------------------------- | :--------- |
| `GET`   | `/events/settings`                            | `admin`       | `admin.getSettings`                  | Bearer JWT |
| `PUT`   | `/events/settings`                            | `admin`       | `admin.updateSettings`               | Bearer JWT |
| `GET`   | `/events/calendar`                            | `admin`       | `admin.getCalendar`                  | Bearer JWT |
| `POST`  | `/events/calendar/reschedule`                 | `admin`       | `admin.reschedule`                   | Bearer JWT |
| `POST`  | `/events/calendar/quick-create`               | `admin`       | `admin.quickCreate`                  | Bearer JWT |
| `GET`   | `/events/stats/{documentId}`                  | `admin`       | `admin.getEventStats`                | Bearer JWT |
| `GET`   | `/events/registrations`                       | `admin`       | `admin.listRegistrations`            | Bearer JWT |
| `GET`   | `/events/registrations/export.csv`            | `admin`       | `admin.exportRegistrationsCsv`       | Bearer JWT |
| `POST`  | `/events/registrations/{documentId}/status`   | `admin`       | `admin.updateRegistrationStatus`     | Bearer JWT |
| `POST`  | `/events/registrations/{documentId}/check-in` | `admin`       | `admin.checkIn`                      | Bearer JWT |
| `GET`   | `/api/events/occurrences`                     | `content-api` | `content-api.listOccurrences`        | Public     |
| `GET`   | `/api/events/spotlights`                      | `content-api` | `content-api.listSpotlights`         | Public     |
| `GET`   | `/api/events/feed.ics`                        | `content-api` | `content-api.downloadFeedIcs`        | Public     |
| `GET`   | `/api/events/{documentId}/invite.ics`         | `content-api` | `content-api.downloadEventInviteIcs` | Public     |
| `GET`   | `/api/events/{documentId}/stats`              | `content-api` | `content-api.getEventStats`          | Public     |
| `POST`  | `/api/events/{documentId}/register`           | `content-api` | `content-api.registerAttendee`       | Public     |
| `POST`  | `/api/events/registrations/{token}/cancel`    | `content-api` | `content-api.cancelRegistration`     | Public     |

## 7. الاستخدام البرمجي داخل الخادم (`strapi.plugin` و `strapi.documents`)

```ts
// Registered services on plugin "events": "settings", "occurrence", "rsvp", "ical"
const pluginService = strapi.plugin("events")?.service("occurrence");

// Querying records via the Strapi v5 Document Service API
const records = await strapi.documents("plugin::events.event").findMany({
  limit: 25,
  sort: "createdAt:desc",
});
```

## 8. استكشاف الأخطاء والتحقق من الجودة

- **عدم ظهور التغييرات في لوحة الإدارة**: قم بتشغيل `pnpm strapi build` بعد تعديل ملف `config/plugins.ts`.
- **عزل حزم Strapi**: حافظ على إعداد `hoistPattern: ["*", "!@strapi/*"]` داخل `pnpm-workspace.yaml` لمنع تكرار سياق React.
- **فحص الأنواع الصارم (TypeScript)**: قم بتشغيل `pnpm check` للتحقق من سلامة حزمتي الواجهة والخادم.
