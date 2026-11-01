---
title: "Rezervasyonlar ve Randevular — Geliştirici Kılavuzu ve Yönetim Arayüzü"
description: "İçerik türü varlıkları, kullanım senaryoları, sunucu yapılandırması, servis API'si ve Strapi v5 Yönetim Paneli turu: @vicacha-devs/strapi-plugin-bookings."
---

## 1. Kurulum ve Bağımlılıklar

```bash
pnpm add @vicacha-devs/strapi-plugin-calendar @vicacha-devs/strapi-plugin-bookings
```

## 2. Sunucu Yapılandırması (`config/plugins.ts`)

Strapi v5 projenizin `config/plugins.ts` dosyasına eklenti yapılandırmasını ekleyin:

```ts
// config/plugins.ts
export default ({
  env,
}: {
  env: (key: string, defaultValue?: string) => string;
}) => ({
  bookings: {
    enabled: true,
    config: {
      defaultTimezone: env("CALENDAR_DEFAULT_TIMEZONE", "UTC"),
      defaultSlotDurationMinutes: 60,
    },
  },
});
```

![Rezervasyonlar ve Randevular — Strapi v5 Settings Panel](/screenshots/bookings-settings.png)

## 3. Strapi v5 Yönetim Arayüzü (Admin UI) Turu

Etkinleştirildiğinde eklenti, Strapi Design System v2 bileşenlerini kullanarak çalışma alanını ve ayarlarını yönetim paneline kaydeder:

![Rezervasyonlar ve Randevular — Strapi v5 Admin UI](/screenshots/bookings-admin.png)

### Yerelleştirilmiş Arayüz Etiketleri (Türkçe)

| Çeviri Anahtarı                               | Arayüz Metni                                                                      |
| :-------------------------------------------- | :-------------------------------------------------------------------------------- |
| `settings.theme.breeze.label`                 | Esinti (Gök Mavisi ve Kayrak — Varsayılan)                                        |
| `bookings.settings.theme.breeze.label`        | Esinti (Gök Mavisi ve Kayrak — Varsayılan)                                        |
| `settings.theme.breeze.description`           | Sıcak kehribar Hicri rozetlerle yüksek kontrastlı gök mavisi ve net kayrak ızgara |
| `bookings.settings.theme.breeze.description`  | Sıcak kehribar Hicri rozetlerle yüksek kontrastlı gök mavisi ve net kayrak ızgara |
| `settings.theme.emerald.label`                | Zümrüt Camii (Camgöbeği ve Altın)                                                 |
| `bookings.settings.theme.emerald.label`       | Zümrüt Camii (Camgöbeği ve Altın)                                                 |
| `settings.theme.emerald.description`          | Sıcak altın ikincil takvim vurgularıyla İslami zümrüt yeşili başlıklar            |
| `bookings.settings.theme.emerald.description` | Sıcak altın ikincil takvim vurgularıyla İslami zümrüt yeşili başlıklar            |

## 4. İçerik Türü Varlıkları, Konumları ve Şemaları (`strapi.documents`)

Registers two relational Collection Types (`plugin::bookings.resource` one-to-many `plugin::bookings.booking`). Resources define weekly/seasonal availability windows, slot duration, buffers, and capacity; Bookings store individual customer reservations, party size, status transitions, and hashed self-service cancellation tokens. Supports runtime `schemaExtensions` (`resource`, `booking`) and `customFields` in `config/plugins.ts`.

```mermaid
flowchart LR
  Resource["plugin::bookings.resource (booking_resources)"] -->|"1 : N bookings"| Booking["plugin::bookings.booking (bookings)"]
  Booking -->|"calendar bridge"| Calendar["FullCalendar Workspace (/admin/plugins/calendar)"]
  Resource -->|"availability engine"| Slots["GET /api/bookings/available-slots"]
```

### Strapi v5 İçinde İçerik Türü Varlıkları Nerede Bulunur?

- **Content Manager**: `/admin/content-manager/collection-types/plugin::bookings.resource` & `/admin/content-manager/collection-types/plugin::bookings.booking` (`visible: true`)
- **Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Booking Resource` & `Booking`)
- **Plugin Workspace & Settings**: `/admin/plugins/bookings` (Reservations & Resources manager) and `/admin/settings/bookings`
- **Database Tables**: `booking_resources` and `bookings`

### `plugin::bookings.booking` — Booking

Reservation, appointment, or resource slot booking

> **Kind**: `collectionType` · **DB Table**: `bookings` · **Admin Location**: `/admin/content-manager/collection-types/plugin::bookings.booking` · **Draft & Publish**: `No` · **i18n**: `No`

| Alan (Attribute)    | Strapi Türü   | Zorunlu | Kısıtlamalar / İlişki                                                           |
| :------------------ | :------------ | :------ | :------------------------------------------------------------------------------ |
| `bookingCode`       | `string`      | Yes     | max: 48                                                                         |
| `title`             | `string`      | No      | max: 200                                                                        |
| `resource`          | `relation`    | No      | target: `plugin::bookings.resource`                                             |
| `customerName`      | `string`      | Yes     | max: 120                                                                        |
| `customerEmail`     | `email`       | Yes     | —                                                                               |
| `customerPhone`     | `string`      | No      | max: 40                                                                         |
| `organization`      | `string`      | No      | max: 160                                                                        |
| `startDate`         | `datetime`    | Yes     | —                                                                               |
| `endDate`           | `datetime`    | Yes     | —                                                                               |
| `slotLabel`         | `string`      | No      | max: 80                                                                         |
| `timezone`          | `string`      | No      | max: 64; default: `"UTC"`                                                       |
| `partySize`         | `integer`     | Yes     | default: `1`                                                                    |
| `status`            | `enumeration` | Yes     | enum: `pending, confirmed, completed, cancelled, no_show`; default: `"pending"` |
| `preferredLanguage` | `string`      | No      | max: 16                                                                         |
| `assignedHost`      | `string`      | No      | max: 120                                                                        |
| `notes`             | `text`        | No      | max: 2000                                                                       |
| `internalNotes`     | `text`        | No      | max: 2000; `private: true`                                                      |
| `cancelTokenHash`   | `string`      | No      | max: 128; `private: true`                                                       |
| `sourceCollection`  | `string`      | No      | default: `"plugin::bookings.booking"`                                           |
| `metadata`          | `json`        | No      | —                                                                               |

### `plugin::bookings.resource` — Booking Resource

Bookable service, appointment type, room, staff member, or equipment schedule

> **Kind**: `collectionType` · **DB Table**: `booking_resources` · **Admin Location**: `/admin/content-manager/collection-types/plugin::bookings.resource` · **Draft & Publish**: `No` · **i18n**: `No`

| Alan (Attribute)      | Strapi Türü   | Zorunlu | Kısıtlamalar / İlişki                                                             |
| :-------------------- | :------------ | :------ | :-------------------------------------------------------------------------------- |
| `name`                | `string`      | Yes     | max: 160                                                                          |
| `slug`                | `uid`         | Yes     | —                                                                                 |
| `resourceType`        | `enumeration` | Yes     | enum: `service, appointment, room, staff, equipment, other`; default: `"service"` |
| `description`         | `text`        | No      | —                                                                                 |
| `color`               | `string`      | No      | max: 32; default: `"#0d9488"`                                                     |
| `timezone`            | `string`      | No      | max: 64; default: `"UTC"`                                                         |
| `slotDurationMinutes` | `integer`     | Yes     | default: `60`                                                                     |
| `bufferBeforeMinutes` | `integer`     | No      | default: `0`                                                                      |
| `bufferAfterMinutes`  | `integer`     | No      | default: `0`                                                                      |
| `capacityPerSlot`     | `integer`     | Yes     | default: `1`                                                                      |
| `maxPartySize`        | `integer`     | No      | default: `50`                                                                     |
| `minLeadTimeHours`    | `integer`     | No      | default: `2`                                                                      |
| `maxAdvanceDays`      | `integer`     | No      | default: `90`                                                                     |
| `requiresApproval`    | `boolean`     | No      | default: `false`                                                                  |
| `weeklySchedule`      | `json`        | No      | —                                                                                 |
| `seasonalSchedules`   | `json`        | No      | —                                                                                 |
| `holidayRules`        | `json`        | No      | —                                                                                 |
| `blackoutDates`       | `json`        | No      | —                                                                                 |
| `recurrenceRule`      | `string`      | No      | —                                                                                 |
| `supportedLanguages`  | `json`        | No      | —                                                                                 |
| `assignedHosts`       | `json`        | No      | —                                                                                 |
| `location`            | `string`      | No      | max: 240                                                                          |
| `price`               | `decimal`     | No      | default: `0`                                                                      |
| `currency`            | `string`      | No      | max: 10; default: `"USD"`                                                         |
| `isActive`            | `boolean`     | No      | default: `true`                                                                   |
| `metadata`            | `json`        | No      | —                                                                                 |
| `bookings`            | `relation`    | No      | target: `plugin::bookings.booking`                                                |

## Strapi v5 İçerik Yöneticisi (Content Manager) Entegrasyonu (`/admin/content-manager`)

> **İçerik Yöneticisi Kenar Çubuğu Grubu**: `Events, Scheduling & Bookings`

### İçerik Yöneticisi Varlıkları ve Bileşenleri

- `plugin::bookings.resource` (**Booking Resource** — `/admin/content-manager/collection-types/plugin::bookings.resource`)
- `plugin::bookings.booking` (**Booking** — `/admin/content-manager/collection-types/plugin::bookings.booking`)

![Rezervasyonlar ve Randevular — Strapi v5 Content Manager Varlık ve Düzenleme Görünümü](/screenshots/bookings-content-manager.png)

### Bu Eklenti Neden Content Manager Varlıkları Oluşturur?

`@vicacha-devs/strapi-plugin-bookings` registers both **Booking Resource** (`plugin::bookings.resource`) and **Booking** (`plugin::bookings.booking`) with `pluginOptions['content-manager'].visible = true` so teams can combine the operational slot-availability engine in `/admin/plugins/bookings` with Strapi v5's native Content Manager relational modeling and schema extensibility:

- **Relational Linking to Host Entities (`api::*`)**: Link a `Booking Resource` directly to a `Staff, Scholar & Author` (`api::leader.leader`) record, room media gallery, or department via `schemaExtensions.resource` in `config/plugins.ts`.
- **Custom Intake Attributes (`customFields` & `schemaExtensions.booking`)**: Inspect and edit custom reservation fields (such as `organizationName`, `cateringRequired`, or `equipmentNotes`) alongside native Strapi audit columns (`createdBy`, `updatedBy`).
- **Advanced Filtering & Bulk Operations**: Filter hundreds of historical reservations by `status`, `startAt`, `resource`, or `customerEmail` using Content Manager's multi-condition filter builder and bulk-delete test records.
- **Cross-Plugin Side-Panel Ecosystem**: Attach internal staff handoff notes via `@vicacha-devs/strapi-plugin-notes` in the Content Manager right sidebar or jump straight to a booking via `Cmd+K` (`@vicacha-devs/strapi-plugin-global-search`).

### Strapi Content Manager İçinde Nasıl Kullanılır? (Adım Adım)

1. **Open in Content Manager**: In the left sidebar, click **Content Manager -> Collection Types -> Events, Scheduling & Bookings** and select **Booking Resource** (`/admin/content-manager/collection-types/plugin::bookings.resource`) or **Booking** (`/admin/content-manager/collection-types/plugin::bookings.booking`).
2. **Configure Bookable Resources**: Click **+ Create new entry** in **Booking Resource** to define `name`, `slug`, `resourceType` (`room`, `counselor`, `equipment`, `service`, `appointment`), `capacity`, `slotDurationMinutes`, `bufferBeforeMinutes`, `bufferAfterMinutes`, and `weeklySchedule` JSON rules.
3. **Manage & Link Reservations**: Open any **Booking** entry to inspect or update `bookingCode`, `startAt`, `endAt`, `partySize`, `status`, the linked `resource` relation, and any custom fields registered under `config.schemaExtensions.booking`.
4. **Workspace vs. Content Manager**: Use **Content Manager** for structured resource setup, relational linking, and bulk filtering; use the **Bookings Workspace** (`/admin/plugins/bookings`) for 1-click status transitions (`confirmed`, `completed`, `no_show`) and availability slot testing.

### Content Manager ve Eklenti Çalışma Alanı Senkronizasyonu

```mermaid
flowchart LR
  CM["Strapi Content Manager (/admin/content-manager)"] --> Res["Booking Resource (plugin::bookings.resource)"]
  CM --> Bk["Booking (plugin::bookings.booking)"]
  Ext["config/plugins.ts (schemaExtensions + Relations)"] --> Res
  Ext --> Bk
  Res -->|"1 : N relation"| Bk
  Bk -->|"Live Sync"| Workspace["Bookings Workspace (/admin/plugins/bookings) & FullCalendar"]
```

### Content Manager Kullanım Senaryoları ve Editöryal İş Akışları

#### Content Manager Use Case 1 — Linking Counselors & Imams (`api::leader.leader`) to Bookable Resources

- **Amacı ve Neden Kullanıldığı**: Connect each appointment or counseling resource in `plugin::bookings.resource` to an institutional profile in `api::leader.leader` and a Media Library cover photo.
- **Content Manager İçinde Uygulama Adımları**: Extend `resource` via `schemaExtensions` in `config/plugins.ts`, open `/admin/content-manager/collection-types/plugin::bookings.resource`, select the assigned scholar/counselor relation, and save.

#### Content Manager Use Case 2 — Auditing & Bulk-Filtering Reservations with Editorial Notes

- **Amacı ve Neden Kullanıldığı**: Filter pending or high-capacity room bookings in Content Manager and attach internal preparation checklists in the right sidebar.
- **Content Manager İçinde Uygulama Adımları**: Open `/admin/content-manager/collection-types/plugin::bookings.booking`, apply a filter on `status = pending` or `partySize > 20`, open the entry, and add a pinned note in the **Notes** side panel.

## 5. Uçtan Uca Kullanım Senaryoları ve İş Akışları

### Use Case 1 — Public Self-Service Slot Discovery & Reservation

- **What it is for**: Allow website visitors to query available time slots for a room, counselor, imam, or equipment resource and book a slot without double-booking.
- **How it works**: Query `GET /api/bookings/available-slots?resourceSlug=main-conference-hall&date=2026-05-15`, then submit `POST /api/bookings/reserve` to create a `plugin::bookings.booking` entity and receive a one-time cancellation token.

```mermaid
flowchart LR
  Visitor["Website Visitor"] -->|"1. GET /api/bookings/available-slots"| Engine["Slot Availability Engine"]
  Engine -->|"2. Check weeklySchedule + existing bookings"| Resource["plugin::bookings.resource"]
  Visitor -->|"3. POST /api/bookings/reserve"| Create["Create plugin::bookings.booking"]
  Create -->|"4. Return bookingCode + cancelToken"| Confirmation["Confirmed / Pending Slot"]
```

![Bookings & Reservations — Strapi v5 Admin Workspace](/screenshots/bookings-admin.png)

### Use Case 2 — Multi-Host Appointment & Buffer Enforcement

- **What it is for**: Manage 1-on-1 consultations or guided tours with automatic pre/post buffer windows (`bufferBeforeMinutes`, `bufferAfterMinutes`), minimum lead time (`minLeadTimeHours`), and host assignment (`assignedHost`).
- **How it works**: Configure `weeklySchedule`, `seasonalSchedules`, and `blackoutDates` on `plugin::bookings.resource`; staff approve or mark `completed` / `no_show` via `PUT /bookings/bookings/{documentId}/status`.

```mermaid
flowchart LR
  Config["Settings & Resource Rules (buffers, minLeadTimeHours)"] --> Schedule["Resource Weekly & Seasonal Schedule"]
  Schedule --> Assign["Assign Host (assignedHost)"]
  Assign --> Status["PUT /bookings/bookings/{documentId}/status (confirmed / completed)"]
```

![Bookings & Reservations — Strapi v5 Settings Panel](/screenshots/bookings-settings.png)

### Use Case 3 — Tokenized Self-Service Rescheduling & Cancellation

- **What it is for**: Let customers reschedule or cancel their reservation from an email link without requiring a Strapi account.
- **How it works**: Pass the customer's `bookingCode` and plaintext `cancelToken` (verified against `cancelTokenHash`) to `POST /api/bookings/reschedule` or `POST /api/bookings/cancel`.

```mermaid
flowchart LR
  Customer["Customer Email Link (bookingCode + cancelToken)"] --> Verify["SHA-256 Verify cancelTokenHash"]
  Verify -->|"Valid Token"| Action["POST /api/bookings/reschedule or /cancel"]
  Action --> Update["Update plugin::bookings.booking & Free Slot"]
```

![Bookings & Reservations — Strapi v5 Content Manager Entities](/screenshots/bookings-content-manager.png)

### Use Case 4 — Unified Calendar & iCal Feed Synchronization

- **What it is for**: Project all confirmed and pending reservations into the FullCalendar workspace and external Google/Apple Calendar clients.
- **How it works**: At bootstrap, `bookings` registers `plugin::bookings.booking` with `strapi.plugin('calendar').service('registry')` and exposes `GET /api/bookings/feed.ics`.

```mermaid
flowchart LR
  Bookings["plugin::bookings.booking"] -->|"registerSource() at bootstrap"| Registry["Calendar Source Registry"]
  Registry --> FullCal["FullCalendar Admin Grid"]
  Bookings -->|"RFC 5545 serializer"| ICal["GET /api/bookings/feed.ics"]
```

## 6. REST API Uç Noktaları (`content-api` ve `admin`)

| Metot  | Uç Nokta Yolu                            | Kapsam        | Denetleyici (Handler)               | Kimlik Doğrulama |
| :----- | :--------------------------------------- | :------------ | :---------------------------------- | :--------------- |
| `GET`  | `/bookings/settings`                     | `admin`       | `admin.getSettings`                 | Bearer JWT       |
| `PUT`  | `/bookings/settings`                     | `admin`       | `admin.updateSettings`              | Bearer JWT       |
| `GET`  | `/bookings/schemas`                      | `admin`       | `admin.discoverSchemas`             | Bearer JWT       |
| `GET`  | `/bookings/resources`                    | `admin`       | `admin.listResources`               | Bearer JWT       |
| `POST` | `/bookings/resources`                    | `admin`       | `admin.saveResource`                | Bearer JWT       |
| `GET`  | `/bookings/calendar`                     | `admin`       | `admin.getCalendar`                 | Bearer JWT       |
| `POST` | `/bookings/bookings`                     | `admin`       | `admin.createBooking`               | Bearer JWT       |
| `PUT`  | `/bookings/bookings/{documentId}/status` | `admin`       | `admin.updateBookingStatus`         | Bearer JWT       |
| `POST` | `/bookings/bookings/reschedule`          | `admin`       | `admin.rescheduleBooking`           | Bearer JWT       |
| `GET`  | `/bookings/export.csv`                   | `admin`       | `admin.exportCsv`                   | Bearer JWT       |
| `GET`  | `/bookings/export.ics`                   | `admin`       | `admin.exportICal`                  | Bearer JWT       |
| `GET`  | `/api/bookings/resources`                | `content-api` | `content-api.listPublicResources`   | Public           |
| `GET`  | `/api/bookings/available-slots`          | `content-api` | `content-api.getAvailableSlots`     | Public           |
| `POST` | `/api/bookings/reserve`                  | `content-api` | `content-api.createReservation`     | Public           |
| `POST` | `/api/bookings/reschedule`               | `content-api` | `content-api.rescheduleReservation` | Public           |
| `POST` | `/api/bookings/cancel`                   | `content-api` | `content-api.cancelReservation`     | Public           |
| `GET`  | `/api/bookings/feed.ics`                 | `content-api` | `content-api.getICalFeed`           | Public           |

## 7. Sunucu Tarafı Programatik Kullanım (`strapi.plugin` ve `strapi.documents`)

```ts
// Registered services on plugin "bookings": "settings", "availability", "reservation"
const pluginService = strapi.plugin("bookings")?.service("availability");

// Querying records via the Strapi v5 Document Service API
const records = await strapi.documents("plugin::bookings.booking").findMany({
  limit: 25,
  sort: "createdAt:desc",
});
```

## 8. Sorun Giderme ve Doğrulama

- **Yönetim paneli değişiklikleri görünmüyor**: `config/plugins.ts` dosyasını güncelledikten sonra `pnpm strapi build` komutunu çalıştırın.
- **Strapi bağımlılık izolasyonu**: React bağlam çakışmalarını önlemek için `pnpm-workspace.yaml` içinde `hoistPattern: ["*", "!@strapi/*"]` ayarını koruyun.
- **Sıkı TypeScript kontrolü**: Hem `admin` hem de `server` paketlerini doğrulamak için `pnpm check` komutunu çalıştırın.
