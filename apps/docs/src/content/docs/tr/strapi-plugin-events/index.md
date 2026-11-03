---
title: "Etkinlikler, LCV ve Giriş (@vicacha-devs/strapi-plugin-events)"
description: "Etkinlik yönetimi, kontenjan kontrolü, otomatik bekleme listesi terfisi, tek tıkla katılımcı girişi, CSV dışa aktarma ve birleşik Takvim köprüsü."
prev: false
---

> **Package**: `@vicacha-devs/strapi-plugin-events` · **Plugin ID**: `events` · **Category**: `Scheduling & Operations` · **Version**: `1.0.0` · **Routes**: `17`

Etkinlik yönetimi, kontenjan kontrolü, otomatik bekleme listesi terfisi, tek tıkla katılımcı girişi, CSV dışa aktarma ve birleşik Takvim köprüsü.

```bash
pnpm add @vicacha-devs/strapi-plugin-events
```

![Etkinlikler, LCV ve Giriş — Strapi v5 Admin UI](/screenshots/events-admin.png)

![Etkinlikler, LCV ve Giriş — Strapi v5 Settings Panel](/screenshots/events-settings.png)

## 1. Temel Yetenekler ve Mimari Özellikler

- [İçerik Türü Varlıkları ve Kullanım Senaryolarını İnceleyin (Diyagramlarla)](/tr/strapi-plugin-events/use-cases/)
- [Geliştirici Kılavuzu ve Admin UI Turunu İnceleyin](/tr/strapi-plugin-events/guide/)
- [Etkileşimli OpenAPI Referansını İnceleyin](/strapi-plugin-events/api/)

## 2. İçerik Türü Varlıkları, Konumları ve Şemaları (`strapi.documents`)

Registers two Collection Types (`plugin::events.event` with `draftAndPublish: true` & `i18n.localized: true`, and `plugin::events.registration`) plus the `plugin::events.rrule` Custom Field. Also supports binding additional custom `api::*` event collections via `sources[]` and extending schemas via `schemaExtensions` in `config/plugins.ts`.

```mermaid
flowchart LR
  Event["plugin::events.event (plugin_events_items)"] -->|"1 : N registrations"| Reg["plugin::events.registration (RSVP & Waitlist)"]
  Event -->|"RRULE + RSCALE"| CalBridge["Unified Calendar Bridge & /api/events/ical.ics"]
```

### Strapi v5 İçinde İçerik Türü Varlıkları Nerede Bulunur?

- **Content Manager**: `/admin/content-manager/collection-types/plugin::events.event` & `/admin/content-manager/collection-types/plugin::events.registration` (`visible: true`)
- **Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Event` & `Event Registration (RSVP)`) + Custom Field `plugin::events.rrule`
- **Plugin Workspace & Settings**: `/admin/plugins/events` (Events Manager, RSVP Roster, Waitlist, Check-In) and `/admin/settings/events`
- **Database Tables**: `plugin_events_items` and `plugin_events_registrations`

### `plugin::events.event` — Event

Recurring & single events managed by strapi-plugin-events

> **Kind**: `collectionType` · **DB Table**: `plugin_events_items` · **Admin Location**: `/admin/content-manager/collection-types/plugin::events.event` · **Draft & Publish**: `Yes` · **i18n**: `Yes`

| Alan (Attribute)           | Strapi Türü   | Zorunlu | Kısıtlamalar / İlişki                                                        |
| :------------------------- | :------------ | :------ | :--------------------------------------------------------------------------- |
| `title`                    | `string`      | Yes     | max: 200                                                                     |
| `slug`                     | `uid`         | Yes     | —                                                                            |
| `summary`                  | `text`        | No      | max: 500                                                                     |
| `description`              | `richtext`    | No      | —                                                                            |
| `startDate`                | `datetime`    | Yes     | —                                                                            |
| `endDate`                  | `datetime`    | No      | —                                                                            |
| `allDay`                   | `boolean`     | No      | default: `false`                                                             |
| `timezone`                 | `string`      | No      | default: `"UTC"`                                                             |
| `recurrence`               | `customField` | No      | customField: `plugin::events.rrule`                                          |
| `eventStatus`              | `enumeration` | Yes     | enum: `scheduled, cancelled, postponed, rescheduled`; default: `"scheduled"` |
| `locationType`             | `enumeration` | No      | enum: `in_person, online, hybrid`; default: `"in_person"`                    |
| `location`                 | `string`      | No      | —                                                                            |
| `virtualUrl`               | `string`      | No      | —                                                                            |
| `category`                 | `string`      | No      | default: `"general"`                                                         |
| `speaker`                  | `string`      | No      | —                                                                            |
| `speakerSlug`              | `string`      | No      | —                                                                            |
| `color`                    | `string`      | No      | default: `"#0D9488"`                                                         |
| `featured`                 | `boolean`     | No      | default: `false`                                                             |
| `rsvpEnabled`              | `boolean`     | No      | default: `false`                                                             |
| `capacity`                 | `integer`     | No      | —                                                                            |
| `waitlistEnabled`          | `boolean`     | No      | default: `true`                                                              |
| `maxGuestsPerRegistration` | `integer`     | No      | default: `5`                                                                 |
| `registrationDeadline`     | `datetime`    | No      | —                                                                            |
| `alternateDates`           | `json`        | No      | —                                                                            |
| `poster`                   | `media`       | No      | —                                                                            |
| `actionLinks`              | `json`        | No      | —                                                                            |
| `spotlightConfig`          | `json`        | No      | —                                                                            |
| `metadata`                 | `json`        | No      | —                                                                            |

### `plugin::events.registration` — Event Registration (RSVP)

Attendee RSVPs, waitlists, and check-ins managed by strapi-plugin-events

> **Kind**: `collectionType` · **DB Table**: `plugin_events_registrations` · **Admin Location**: `/admin/content-manager/collection-types/plugin::events.registration` · **Draft & Publish**: `No` · **i18n**: `No`

| Alan (Attribute)  | Strapi Türü   | Zorunlu | Kısıtlamalar / İlişki                                                        |
| :---------------- | :------------ | :------ | :--------------------------------------------------------------------------- |
| `eventUid`        | `string`      | Yes     | default: `"plugin::events.event"`                                            |
| `eventDocumentId` | `string`      | Yes     | —                                                                            |
| `eventTitle`      | `string`      | No      | —                                                                            |
| `occurrenceDate`  | `string`      | Yes     | —                                                                            |
| `attendeeName`    | `string`      | Yes     | max: 160                                                                     |
| `attendeeEmail`   | `email`       | Yes     | —                                                                            |
| `attendeePhone`   | `string`      | No      | max: 50                                                                      |
| `guestsCount`     | `integer`     | Yes     | default: `1`                                                                 |
| `status`          | `enumeration` | Yes     | enum: `confirmed, waitlisted, cancelled, checked_in`; default: `"confirmed"` |
| `checkInToken`    | `string`      | No      | `private: true`                                                              |
| `checkedInAt`     | `datetime`    | No      | —                                                                            |
| `locale`          | `string`      | No      | default: `"es"`                                                              |
| `notes`           | `text`        | No      | max: 2000                                                                    |
| `metadata`        | `json`        | No      | —                                                                            |

## Strapi v5 İçerik Yöneticisi (Content Manager) Entegrasyonu (`/admin/content-manager`)

> **İçerik Yöneticisi Kenar Çubuğu Grubu**: `Events, Scheduling & Bookings`

### İçerik Yöneticisi Varlıkları ve Bileşenleri

- `plugin::events.event` (**Event** — `/admin/content-manager/collection-types/plugin::events.event`)
- `plugin::events.registration` (**Event Registration (RSVP)** — `/admin/content-manager/collection-types/plugin::events.registration`)
- Custom Field `plugin::events.rrule`

![Etkinlikler, LCV ve Giriş — Strapi v5 Content Manager Varlık ve Düzenleme Görünümü](/screenshots/events-content-manager.png)

### Bu Eklenti Neden Content Manager Varlıkları Oluşturur?

`@vicacha-devs/strapi-plugin-events` registers **Event** (`plugin::events.event`, with `i18n.localized: true` and `draftAndPublish: true`) and **Event Registration (RSVP)** (`plugin::events.registration`) as primary Content Manager collection types so editorial teams can author rich multilingual event pages while operations staff manage RSVPs and check-ins:

- **Rich Editorial & Speaker Relations**: In Content Manager, `Event` records support rich-text descriptions, poster images, speaker relations (e.g., linking `Staff, Scholar & Author` `api::leader.leader`), virtual meeting URLs, and `plugin::events.rrule` recurrence rules.
- **Multilingual (`i18n`) Event Publishing**: Author event pages across `en`, `es`, `ar`, and `tr` (`?plugins[i18n][locale]=en`) with independent draft/publish control per locale.
- **Injected Right-Sidebar Widgets**: Opening an `Event` in Content Manager displays both the **Calendar & Schedule** widget (Hijri date + `.ics` export) and the **Event & RSVP Summary** panel alongside **Editorial Notes**.
- **Direct RSVP Roster Inspection**: Inspect, filter, and search individual `Event Registration (RSVP)` records (`confirmed`, `waitlisted`, `checked_in`, `cancelled`) directly in Content Manager.

### Strapi Content Manager İçinde Nasıl Kullanılır? (Adım Adım)

1. **Open in Content Manager**: In the left sidebar, click **Content Manager -> Collection Types -> Events, Scheduling & Bookings** and select **Event** (`/admin/content-manager/collection-types/plugin::events.event?plugins[i18n][locale]=en`) or **Event Registration (RSVP)** (`/admin/content-manager/collection-types/plugin::events.registration`).
2. **Author & Localize Events**: Click **+ Create new entry** in **Event**, fill in `title`, `slug`, `summary`, `description`, `startDate`, `endDate`, `rrule`, `capacity`, and `waitlistEnabled`, then click **Publish**.
3. **Inspect RSVP Registrations**: Open **Event Registration (RSVP)** in Content Manager to filter attendees by `status`, `occurrenceDate`, `attendeeEmail`, or linked `event`.
4. **Workspace vs. Content Manager**: Use **Content Manager** for rich multilingual event authoring, poster uploads, and speaker relations; use the **Events Workspace** (`/admin/plugins/events`) for 1-click door check-in, waitlist promotion, and formula-sanitized CSV exports.

### Content Manager ve Eklenti Çalışma Alanı Senkronizasyonu

```mermaid
flowchart LR
  CM["Strapi Content Manager (i18n + Draft & Publish)"] --> Ev["Event (plugin::events.event)"]
  CM --> Reg["Event Registration (RSVP) (plugin::events.registration)"]
  Ev -->|"1 : N registrations"| Reg
  Ev -->|"Auto-Registered Source"| Cal["Unified Calendar (/admin/plugins/calendar)"]
  Reg -->|"Check-In & CSV Roster"| WS["Events Workspace (/admin/plugins/events)"]
```

### Content Manager Kullanım Senaryoları ve Editöryal İş Akışları

#### Content Manager Use Case 1 — Authoring Multilingual Recurring Classes & Community Dinners

- **Amacı ve Neden Kullanıldığı**: Create and translate recurring educational classes (`Classical Arabic Course`), youth circles (`Weekly Youth Circle`), and scholarship announcements (`Türkiye Bursları Scholarship Orientation`) in Content Manager.
- **Content Manager İçinde Uygulama Adımları**: Open `/admin/content-manager/collection-types/plugin::events.event?plugins[i18n][locale]=en`, edit the event attributes and `rrule` recurrence, verify the Hijri date in the right sidebar, and publish across locales.

#### Content Manager Use Case 2 — Filtering Waitlisted or Checked-In Attendees Across Occurrences

- **Amacı ve Neden Kullanıldığı**: Search attendee registrations by email, occurrence date, or dietary/accessibility notes inside Content Manager.
- **Content Manager İçinde Uygulama Adımları**: Open `/admin/content-manager/collection-types/plugin::events.registration` and filter by `status = waitlisted` or `status = checked_in`.

## 3. Uçtan Uca Kullanım Senaryoları ve İş Akışları

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

## 4. REST API Uç Noktaları (`content-api` ve `admin`)

| Metot  | Uç Nokta Yolu                                 | Kapsam  | Denetleyici (Handler)            | Kimlik Doğrulama |
| :----- | :-------------------------------------------- | :------ | :------------------------------- | :--------------- |
| `GET`  | `/events/settings`                            | `admin` | `admin.getSettings`              | Bearer JWT       |
| `PUT`  | `/events/settings`                            | `admin` | `admin.updateSettings`           | Bearer JWT       |
| `GET`  | `/events/calendar`                            | `admin` | `admin.getCalendar`              | Bearer JWT       |
| `POST` | `/events/calendar/reschedule`                 | `admin` | `admin.reschedule`               | Bearer JWT       |
| `POST` | `/events/calendar/quick-create`               | `admin` | `admin.quickCreate`              | Bearer JWT       |
| `GET`  | `/events/stats/{documentId}`                  | `admin` | `admin.getEventStats`            | Bearer JWT       |
| `GET`  | `/events/registrations`                       | `admin` | `admin.listRegistrations`        | Bearer JWT       |
| `GET`  | `/events/registrations/export.csv`            | `admin` | `admin.exportRegistrationsCsv`   | Bearer JWT       |
| `POST` | `/events/registrations/{documentId}/status`   | `admin` | `admin.updateRegistrationStatus` | Bearer JWT       |
| `POST` | `/events/registrations/{documentId}/check-in` | `admin` | `admin.checkIn`                  | Bearer JWT       |
