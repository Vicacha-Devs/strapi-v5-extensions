---
title: "Calendar & Scheduling — Developer Guide & Admin UI"
description: "Complete developer reference, content-type schemas, use cases, server configuration, and Admin UI tour for @vicacha-devs/strapi-plugin-calendar."
---

## 1. Installation & Peer Setup

```bash
pnpm add @vicacha-devs/strapi-plugin-calendar
```

## 2. Server Configuration (`config/plugins.ts`)

Add the plugin configuration to your Strapi v5 `config/plugins.ts` file:

```ts
// config/plugins.ts
export default ({
  env,
}: {
  env: (key: string, defaultValue?: string) => string;
}) => ({
  calendar: {
    enabled: true,
    config: {
      defaultView: "dayGridMonth",
      defaultTimezone: env("CALENDAR_DEFAULT_TIMEZONE", "UTC"),
    },
  },
});
```

![Calendar & Scheduling — Strapi v5 Settings Panel](/screenshots/calendar-settings.png)

## 3. Strapi v5 Admin UI Tour

Once enabled, the plugin registers its workspace and settings inside the Strapi v5 Admin panel using Strapi Design System v2 components:

![Calendar & Scheduling — Strapi v5 Admin UI](/screenshots/calendar-admin.png)

### Key Localized Admin UI Labels

| Translation Key                        | Rendered UI Label                                                         |
| :------------------------------------- | :------------------------------------------------------------------------ |
| `settings.theme.breeze.label`          | Breeze (Sky & Slate — Default)                                            |
| `settings.theme.breeze.description`    | High-contrast sky-blue & crisp slate grid with warm amber Hijri badges    |
| `settings.theme.emerald.label`         | Emerald Mosque (Teal & Gold)                                              |
| `settings.theme.emerald.description`   | Islamic emerald-teal headers with warm gold secondary calendar highlights |
| `settings.theme.sandstone.label`       | Andalusian Sandstone (Warm Earth)                                         |
| `settings.theme.sandstone.description` | Warm terracotta and parchment tones inspired by Andalusian courtyards     |
| `settings.theme.midnight.label`        | Midnight Observatory (Dark Slate)                                         |
| `settings.theme.midnight.description`  | Deep slate dark-mode canvas with luminous cyan and gold accents           |

## 4. Content-Type Entities, Locations & Schemas (`strapi.documents`)

Acts as a multi-collection scheduler engine that binds to **any** Strapi Content-Type entity (`api::*` or `plugin::*`) configured in `collections[]` or registered dynamically via `calendar.service('registry').registerSource()`. Also registers the `plugin::calendar.rrule` Custom Field (`json`) for RFC 5545 `RRULE` + RFC 7529 `RSCALE` recurrence rules.

```mermaid
flowchart LR
  Events["plugin::events.event"] --> Registry["Calendar Source Registry"]
  Bookings["plugin::bookings.booking"] --> Registry
  CustomApi["Any api::* Collection (+ plugin::calendar.rrule)"] --> Registry
  Registry --> Engine["RRULE + RSCALE + CLDR Secondary Calendar Engine"]
  Engine --> UI["FullCalendar v6 Workspace & /api/calendar/ical.ics"]
```

### Where to Find Content-Type Entities in Strapi v5

- **Bound Content-Type Entities**: Any Content Manager collection mapped in `/admin/settings/calendar` (e.g., `plugin::events.event`, `plugin::bookings.booking`, `api::article.article`)
- **Custom Field in Content-Type Builder**: Add the `plugin::calendar.rrule` custom field to any collection type in `/admin/plugins/content-type-builder`
- **Plugin Workspace & Settings**: `/admin/plugins/calendar` (FullCalendar v6 Month/Week/Day/Agenda workspace) and `/admin/settings/calendar` (General, Prayer & Islamic, Bookings & Availability tabs)

This plugin operates dynamically across existing Strapi `api::*` and `plugin::*` Content-Type entities without creating separate collection tables.

## Strapi v5 Content Manager Integration (`/admin/content-manager`)

> **Content Manager Sidebar Group**: `Events, Scheduling & Bookings`

### Content Manager Entities & Components

- Custom Field `plugin::calendar.rrule` (**RFC 5545 RRULE + RFC 7529 RSCALE Recurrence Field** inside any Content Manager edit view)
- Bound Content Manager Collections (`plugin::events.event`, `plugin::bookings.booking`, and any configured `api::*` collection)

![Calendar & Scheduling — Strapi v5 Content Manager Entities & Editorial View](/screenshots/calendar-content-manager.png)

### Why This Plugin Creates & Integrates Content Manager Entities

Instead of locking schedules inside an isolated table, `@vicacha-devs/strapi-plugin-calendar` embeds directly into the **Strapi v5 Content Manager** edit view of any mapped collection (`plugin::events.event`, `plugin::bookings.booking`, or custom `api::*` entities) via its `plugin::calendar.rrule` Custom Field and right-sidebar **Calendar & Schedule** widget:

- **In-Place Secondary Calendar Preview in Content Manager**: When editing an event in Content Manager, the right-sidebar **Calendar & Schedule** panel automatically computes and displays the corresponding Hijri (Umm al-Qura), Hebrew, or Persian date (`4 Jumada I 1448 AH`) plus 1-click `.ics` download and **Open in Calendar View** buttons.
- **Visual RFC 5545 `RRULE` + RFC 7529 `RSCALE` Authoring**: The `plugin::calendar.rrule` custom field lets editors configure Gregorian or lunar recurrence rules directly inside any Content Manager form.
- **Zero Data Duplication**: Dragging an event in `/admin/plugins/calendar` or editing start/end dates in `/admin/content-manager/collection-types/plugin::events.event` mutates the exact same Strapi v5 Document Service record.

### How to Use in Strapi Content Manager (Step-by-Step)

1. **Open a Bound Collection in Content Manager**: Navigate to **Content Manager -> Collection Types -> Events, Scheduling & Bookings -> Event** (`/admin/content-manager/collection-types/plugin::events.event?plugins[i18n][locale]=en`) and open any entry.
2. **Configure Start/End Dates & Recurrence**: Edit `startDate`, `endDate`, `allDay`, `timezone`, and the `rrule` custom field directly inside the Content Manager form.
3. **Use the Right-Sidebar Calendar Panel**: In the right column of the Content Manager edit view, inspect the live **Alternative Calendar Dates** badge, click **Download .ics Invite**, or click **Open in Calendar View** to jump to `/admin/plugins/calendar`.
4. **Bind Additional Content Manager Collections**: In `/admin/settings/calendar`, map any `api::*` collection's `titleField`, `startField`, `endField`, and `rruleField` to project its Content Manager entries onto the unified calendar grid.

### Content Manager & Plugin Workspace Synchronization

```mermaid
flowchart LR
  CMEdit["Content Manager Edit View (plugin::events.event / api::*)"] --> RRule["plugin::calendar.rrule Custom Field"]
  CMEdit --> SideWidget["Right-Sidebar Calendar & Secondary Date Panel (.ics + Hijri)"]
  RRule --> Grid["FullCalendar v6 Workspace (/admin/plugins/calendar)"]
  Grid <-->|"Two-Way Sync (strapi.documents)"| CMEdit
```

### Content Manager Use Cases & Editorial Workflows

#### Content Manager Use Case 1 — Authoring a Localized Recurring Course with Live Hijri Date Preview

- **Why & What it is for**: Edit a weekly Arabic course (`Classical Arabic Course`) in Content Manager while verifying its Umm al-Qura Hijri date and downloading its `.ics` invite from the right sidebar.
- **How to use in Content Manager**: Open `/admin/content-manager/collection-types/plugin::events.event/{documentId}?plugins[i18n][locale]=en`, set `startDate` and `rrule`, and verify the **Calendar & Schedule** panel on the right.

## 5. End-to-End Use Cases & Workflows

### Use Case 1 — Aggregating Multiple Strapi Collections into One Calendar

- **What it is for**: Display Events, Bookings, Courses, and Editorial Deadlines from different Content-Type entities on a single color-coded FullCalendar grid.
- **How it works**: Map each collection's `uid`, `titleField`, `startField`, `endField`, and `rruleField` in `/admin/settings/calendar` or `config/plugins.ts`, then query `GET /api/calendar/occurrences?start=...&end=...`.

```mermaid
flowchart LR
  Sources["Mapped Collections (events, bookings, api::*)"] --> Aggregator["calendarService.getOccurrences(start, end)"]
  Aggregator --> Expand["Expand RRULE & Attach CLDR Hijri/Hebrew/Persian Dates"]
  Expand --> Grid["Unified FullCalendar v6 Month / Week / Day / List Grid"]
```

![Calendar & Scheduling — Strapi v5 Admin Workspace](/screenshots/calendar-admin.png)

### Use Case 2 — Sacred & Lunar Recurrence (`RRULE` + `RSCALE=ISLAMIC-UMALQURA`)

- **What it is for**: Schedule annual or monthly recurring events that follow the Hijri, Hebrew, or Persian calendar and automatically project onto Gregorian dates.
- **How it works**: Attach `plugin::calendar.rrule` to your Content-Type entity to author RFC 7529 rules (`RSCALE=ISLAMIC-UMALQURA;FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=1`).

```mermaid
flowchart LR
  Field["plugin::calendar.rrule Custom Field"] --> Rule["RSCALE=ISLAMIC-UMALQURA;FREQ=YEARLY;BYMONTH=9"]
  Rule --> Converter["CLDR Umm al-Qura + Lunar Day Offset (-2..+2)"]
  Converter --> Gregorian["Projected Gregorian Occurrences"]
```

![Calendar & Scheduling — Strapi v5 Settings Panel](/screenshots/calendar-settings.png)

### Use Case 3 — Drag-and-Drop Rescheduling & Quick-Create into Target Entities

- **What it is for**: Let editors drag an event on the calendar grid or click a date cell to create/update the underlying Strapi document directly.
- **How it works**: Uses `POST /calendar/quick-create` and `POST /calendar/reschedule` to mutate the mapped `strapi.documents(uid)` record in place.

```mermaid
flowchart LR
  Drag["Editor Drags Event or Clicks Date Cell"] --> Endpoint["POST /calendar/reschedule or /quick-create"]
  Endpoint --> DocService["strapi.documents(targetUid).update / create"]
  DocService --> Refresh["Live Calendar Grid Refresh"]
```

![Calendar & Scheduling — Strapi v5 Content Manager Entities](/screenshots/calendar-content-manager.png)

### Use Case 4 — Public RFC 5545 iCal (`.ics`) Subscription Feeds

- **What it is for**: Allow users to subscribe to live calendar feeds in Google Calendar, Apple Calendar, or Outlook.
- **How it works**: Subscribe to `GET /api/calendar/ical.ics` (all sources) or `GET /api/calendar/ical/{collectionId}.ics` (single source).

```mermaid
flowchart LR
  Client["Google / Apple / Outlook Calendar"] -->|"GET /api/calendar/ical.ics"| Feed["RFC 5545 VCALENDAR Generator"]
  Feed -->|"VEVENT + RRULE + UID"| Sync["Subscribed Live Calendar Feed"]
```

## 6. REST API Endpoints (`content-api` & `admin`)

| Method | Endpoint Path                           | Scope         | Controller Handler             | Auth       |
| :----- | :-------------------------------------- | :------------ | :----------------------------- | :--------- |
| `GET`  | `/calendar/calendar`                    | `admin`       | `admin.getCalendar`            | Bearer JWT |
| `POST` | `/calendar/calendar/reschedule`         | `admin`       | `admin.reschedule`             | Bearer JWT |
| `POST` | `/calendar/calendar/quick-create`       | `admin`       | `admin.quickCreate`            | Bearer JWT |
| `GET`  | `/calendar/content-types`               | `admin`       | `admin.getContentTypes`        | Bearer JWT |
| `GET`  | `/calendar/settings`                    | `admin`       | `admin.getSettings`            | Bearer JWT |
| `PUT`  | `/calendar/settings`                    | `admin`       | `admin.updateSettings`         | Bearer JWT |
| `POST` | `/calendar/clear-settings`              | `admin`       | `admin.clearSettings`          | Bearer JWT |
| `GET`  | `/api/calendar/occurrences`             | `content-api` | `content-api.getOccurrences`   | Public     |
| `GET`  | `/api/calendar/feed.ics`                | `content-api` | `content-api.downloadFeedIcs`  | Public     |
| `GET`  | `/api/calendar/{documentId}/invite.ics` | `content-api` | `content-api.downloadEventIcs` | Public     |

## 7. Programmatic Server Usage (`strapi.plugin` & `strapi.documents`)

```ts
// Registered services on plugin "calendar": "settings", "registry", "occurrence", "ical"
const pluginService = strapi.plugin("calendar")?.service("registry");

// Retrieving plugin settings via Strapi plugin store
const store = strapi.store({ type: "plugin", name: "calendar" });
const settings = await store.get({ key: "settings" });
```

## 8. Troubleshooting & Verification

- **Admin panel changes not visible**: Run `pnpm strapi build` after modifying `config/plugins.ts`.
- **Peer dependency isolation**: Keep `hoistPattern: ["*", "!@strapi/*"]` in `pnpm-workspace.yaml` so `@strapi/*` contexts are never duplicated.
- **TypeScript type-checking**: Validate both `admin/tsconfig.json` and `server/tsconfig.json` via `pnpm --filter <pkg> test:ts`.
