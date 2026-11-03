---
title: "Inbox, Forms & Alert Banners (@vicacha-devs/strapi-plugin-inbox)"
description: "Generic Strapi v5 Visual Form Builder, Service-Desk Casework Inbox, Double Opt-In Subscriber Lists & Site-Wide Alert Banners (forked & extended from devCluna/strapi-plugin-form-builder-cms)"
prev: false
---

Generic **Visual Form Builder, Service-Desk Casework Inbox, Double Opt-In Subscribers & Site-Wide Alert Banners** for **Strapi v5**, powered by [`@vicacha-devs/strapi-plugin-calendar`](../strapi-plugin-calendar), [`@vicacha-devs/strapi-plugin-bookings`](../strapi-plugin-bookings), and [`@vicacha-devs/strapi-plugin-certificates`](../strapi-plugin-certificates).

---

## Key Features

- **Dynamic Form Definitions & Service-Desk Workflows (`plugin::inbox.form`)**:
  - Define custom intake forms and structured service-desk workflows (`GET /api/inbox/forms`, `GET /api/inbox/forms/:slug`) with field validation, rate limiting, and honeypot/CAPTCHA protection.
- **Casework Submissions & Cross-Plugin Bridges (`plugin::inbox.submission`)**:
  - Public submission endpoint (`POST /api/inbox/forms/:slug/submit`) with SLA tracking, priority tags, assignee routing, and one-click conversion into bookings (`@vicacha-devs/strapi-plugin-bookings`) or certificates (`@vicacha-devs/strapi-plugin-certificates`).
- **Double Opt-In Newsletter Subscribers (`plugin::inbox.subscriber`)**:
  - Subscription (`POST /api/inbox/subscribe`), token confirmation (`GET /api/inbox/confirm`), and one-click unsubscribe (`POST /api/inbox/unsubscribe`).
- **Site-Wide Urgent Alert Banners (`plugin::inbox.alert-banner`)**:
  - Scheduled, localized announcement banners (`GET /api/inbox/alerts`) with severity levels (`info`, `important`, `urgent`).
- **13-Locale Admin UI**:
  - Ships with full translations for `en`, `es`, `ar`, `tr`, `fr`, `de`, `pt`, `it`, `nl`, `pl`, `id`, `ur`, and `zh`.

## Quick Installation & Configuration

```bash
pnpm add @vicacha-devs/strapi-plugin-inbox
```

Enable the plugin in `config/plugins.ts`:

```ts
export default () => ({
  inbox: {
    enabled: true,
  },
});
```

## Content-Type Entities & Where to Find Them

Registers three Collection Types (`plugin::inbox.submission`, `plugin::inbox.subscriber`, and `plugin::inbox.alert-banner`). Submissions capture dynamic form payloads and service-desk tickets; Subscribers manage double opt-in topic lists; Alert Banners drive time-bounded site-wide urgent tickers.

```mermaid
flowchart LR
  Form["Dynamic Form Builder (/api/inbox/forms/{slug})"] --> Submission["plugin::inbox.submission (Service-Desk Ticket)"]
  OptIn["POST /api/inbox/subscribers"] --> Subscriber["plugin::inbox.subscriber (Double Opt-In)"]
  AlertAdmin["Alert Manager & Islam Hilal Bridge"] --> Banner["plugin::inbox.alert-banner (GET /api/inbox/alerts)"]
```

- **Content Manager**: `/admin/content-manager/collection-types/plugin::inbox.submission`, `plugin::inbox.subscriber`, and `plugin::inbox.alert-banner` (`visible: true`)
- **Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Inbox Submission`, `Inbox Subscriber`, `Inbox Alert Banner`)
- **Plugin Workspace & Settings**: `/admin/plugins/inbox` (Service Desk Inbox, Subscribers, Alert Banners) and `/admin/settings/inbox`
- **Database Tables**: `inbox_submissions`, `inbox_subscribers`, and `inbox_alert_banners`

## Strapi v5 Content Manager Integration (`/admin/content-manager`)

> **Content Manager Sidebar Group**: `Inbox & Omnichannel Broadcasts`

### Content Manager Entities & Components

- `plugin::inbox.submission` (**Inbox Submission** — `/admin/content-manager/collection-types/plugin::inbox.submission`)
- `plugin::inbox.subscriber` (**Inbox Subscriber** — `/admin/content-manager/collection-types/plugin::inbox.subscriber`)
- `plugin::inbox.alert-banner` (**Inbox Alert Banner** — `/admin/content-manager/collection-types/plugin::inbox.alert-banner`)

![Inbox, Forms & Alert Banners — Strapi v5 Content Manager Entities & Editorial View](/screenshots/inbox-content-manager.png)

### Why This Plugin Creates & Integrates Content Manager Entities

`@vicacha-devs/strapi-plugin-inbox` registers all three of its entities (`Inbox Submission`, `Inbox Subscriber`, and `Inbox Alert Banner`) with `pluginOptions['content-manager'].visible = true` so service-desk coordinators, newsletter managers, and editors can combine the operational triage board in `/admin/plugins/inbox` with Strapi v5's native Content Manager:

- **Structured Casework & Cross-Entity Linking**: In Content Manager, `Inbox Submission` (`plugin::inbox.submission`) exposes `referenceCode`, `category`, `status`, `priority`, `department`, `checklistItems`, `linkedBookingId`, and `linkedCertificateNumber` while keeping `ipAddress` and `userAgent` protected (`private: true`).
- **Subscriber Topic & GDPR Compliance Management**: Filter `Inbox Subscriber` (`plugin::inbox.subscriber`) by `status` (`pending`, `confirmed`, `unsubscribed`), `locale`, and `topics` while `confirmToken` and `unsubscribeToken` remain private.
- **Time-Bounded Urgent Alert Authoring**: Author and schedule `Inbox Alert Banner` (`plugin::inbox.alert-banner`) records (`severity`: `info`, `warning`, `urgent`, `celebration`, `startsAt`, `endsAt`, `translations`) directly in Content Manager.

### How to Use in Strapi Content Manager (Step-by-Step)

1. **Open in Content Manager**: In the left sidebar, navigate to **Content Manager -> Collection Types -> Inbox & Omnichannel Broadcasts** and select **Inbox Submission**, **Inbox Subscriber**, or **Inbox Alert Banner**.
2. **Manage Urgent Alert Banners**: Open **Inbox Alert Banner** (`/admin/content-manager/collection-types/plugin::inbox.alert-banner`) to create or toggle site-wide announcements (`RAMADAN-HILAL-1447`, `JUMUAH-LIVE-KHUTBAH`, `WINTER-BLANKET-CAMPAIGN`).
3. **Filter & Assign Service-Desk Submissions**: Open **Inbox Submission** (`/admin/content-manager/collection-types/plugin::inbox.submission`) to filter tickets by `priority = urgent`, `department`, or `status = under_review`, and update `assignedTo` and `staffNotes`.
4. **Workspace vs. Content Manager**: Use **Content Manager** for bulk filtering, alert banner scheduling, and subscriber list audits; use the **Inbox Workspace** (`/admin/plugins/inbox`) for dynamic form schema design and interactive service-desk SLA triage.

### Content Manager & Plugin Workspace Synchronization

```mermaid
flowchart LR
  CM["Strapi Content Manager (/admin/content-manager)"] --> Sub["Inbox Submission (plugin::inbox.submission)"]
  CM --> News["Inbox Subscriber (plugin::inbox.subscriber)"]
  CM --> Alert["Inbox Alert Banner (plugin::inbox.alert-banner)"]
  Alert -->|"GET /api/inbox/alerts"| Ticker["Live Website Urgent Header Ticker"]
  News -->|"Confirmed Subscribers"| Broadcasts["Omnichannel Broadcasts Bridge"]
```

### Content Manager Use Cases & Editorial Workflows

#### Content Manager Use Case 1 — Scheduling Multilingual Urgent & Celebration Alert Banners

- **Why & What it is for**: Publish time-bounded header banners for Ramadan Hilal confirmation (`severity: 'celebration'`), Friday live khutbah streams (`info`), or emergency relief appeals (`urgent`).
- **How to use in Content Manager**: Open `/admin/content-manager/collection-types/plugin::inbox.alert-banner`, click **+ Create new entry**, set `code`, `title`, `message`, `severity`, `startsAt`, `endsAt`, and `translations`, and save.

#### Content Manager Use Case 2 — Auditing Service-Desk Submissions & Linking Bookings/Certificates

- **Why & What it is for**: Filter high-priority counseling or matrimonial requests in Content Manager and link them to an appointment (`linkedBookingId`) or certificate (`linkedCertificateNumber`).
- **How to use in Content Manager**: Open `/admin/content-manager/collection-types/plugin::inbox.submission`, filter by `priority = high`, and update the record.

## End-to-End Use Cases & Workflows

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

## Admin Workspace, Content Manager & Settings Panel Preview

![Inbox, Forms & Alert Banners — Strapi v5 Admin Workspace](/screenshots/inbox-admin.png)

### Strapi v5 Content Manager Entities (`/admin/content-manager`)

![Inbox, Forms & Alert Banners — Strapi v5 Content Manager Entities](/screenshots/inbox-content-manager.png)

### Settings Panel (`Settings -> Configuration`)

![Inbox, Forms & Alert Banners — Strapi v5 Settings Panel](/screenshots/inbox-settings.png)

> Explore [**Content Types & Use Cases**](/strapi-plugin-inbox/use-cases/), the [**Developer Guide & Admin UI Tour**](/strapi-plugin-inbox/guide/), and the [**Interactive OpenAPI Reference**](/strapi-plugin-inbox/api/) for complete schema, workflow diagram, and endpoint documentation.
