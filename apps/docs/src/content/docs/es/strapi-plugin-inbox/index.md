---
title: "Bandeja, Formularios y Alertas (@vicacha-devs/strapi-plugin-inbox)"
description: "Constructor de formularios dinámicos, bandeja de atención con seguimiento SLA, suscriptores con doble opt-in y cintillos de alerta global."
prev: false
---

> **Package**: `@vicacha-devs/strapi-plugin-inbox` · **Plugin ID**: `inbox` · **Category**: `Community & Engagement` · **Version**: `1.0.0` · **Routes**: `24`

Constructor de formularios dinámicos, bandeja de atención con seguimiento SLA, suscriptores con doble opt-in y cintillos de alerta global.

```bash
pnpm add @vicacha-devs/strapi-plugin-inbox
```

![Bandeja, Formularios y Alertas — Strapi v5 Admin UI](/screenshots/inbox-admin.png)

![Bandeja, Formularios y Alertas — Strapi v5 Settings Panel](/screenshots/inbox-settings.png)

## 1. Características Principales y Arquitectura

- [Explorar Entidades Content-Type y Casos de Uso (con Diagramas Interactivos)](/es/strapi-plugin-inbox/use-cases/)
- [Explorar la Guía de Desarrollo y Admin UI](/es/strapi-plugin-inbox/guide/)
- [Explorar la Referencia Interactiva OpenAPI](/strapi-plugin-inbox/api/)

## 2. Entidades Content-Type, Ubicación y Esquemas (`strapi.documents`)

Registers three Collection Types (`plugin::inbox.submission`, `plugin::inbox.subscriber`, and `plugin::inbox.alert-banner`). Submissions capture dynamic form payloads and service-desk tickets; Subscribers manage double opt-in topic lists; Alert Banners drive time-bounded site-wide urgent tickers.

```mermaid
flowchart LR
  Form["Dynamic Form Builder (/api/inbox/forms/{slug})"] --> Submission["plugin::inbox.submission (Service-Desk Ticket)"]
  OptIn["POST /api/inbox/subscribers"] --> Subscriber["plugin::inbox.subscriber (Double Opt-In)"]
  AlertAdmin["Alert Manager & Islam Hilal Bridge"] --> Banner["plugin::inbox.alert-banner (GET /api/inbox/alerts)"]
```

### Dónde Encontrar las Entidades Content-Type en Strapi v5

- **Content Manager**: `/admin/content-manager/collection-types/plugin::inbox.submission`, `plugin::inbox.subscriber`, and `plugin::inbox.alert-banner` (`visible: true`)
- **Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Inbox Submission`, `Inbox Subscriber`, `Inbox Alert Banner`)
- **Plugin Workspace & Settings**: `/admin/plugins/inbox` (Service Desk Inbox, Subscribers, Alert Banners) and `/admin/settings/inbox`
- **Database Tables**: `inbox_submissions`, `inbox_subscribers`, and `inbox_alert_banners`

### `plugin::inbox.alert-banner` — Inbox Alert Banner

Time-bounded multi-language urgent announcement ticker / banner

> **Kind**: `collectionType` · **DB Table**: `inbox_alert_banners` · **Admin Location**: `/admin/content-manager/collection-types/plugin::inbox.alert-banner` · **Draft & Publish**: `No` · **i18n**: `No`

| Atributo       | Tipo en Strapi | Requerido | Restricciones / Relación                                      |
| :------------- | :------------- | :-------- | :------------------------------------------------------------ |
| `code`         | `string`       | Yes       | —                                                             |
| `title`        | `string`       | Yes       | —                                                             |
| `message`      | `text`         | Yes       | —                                                             |
| `severity`     | `enumeration`  | Yes       | enum: `info, warning, urgent, celebration`; default: `"info"` |
| `ctaLabel`     | `string`       | No        | —                                                             |
| `ctaUrl`       | `string`       | No        | —                                                             |
| `dismissible`  | `boolean`      | No        | default: `true`                                               |
| `active`       | `boolean`      | No        | default: `true`                                               |
| `priority`     | `integer`      | No        | default: `10`                                                 |
| `startsAt`     | `datetime`     | No        | —                                                             |
| `endsAt`       | `datetime`     | No        | —                                                             |
| `translations` | `json`         | No        | default: `{}`                                                 |

### `plugin::inbox.submission` — Inbox Submission

Form submission & Service-Desk Casework ticket

> **Kind**: `collectionType` · **DB Table**: `inbox_submissions` · **Admin Location**: `/admin/content-manager/collection-types/plugin::inbox.submission` · **Draft & Publish**: `No` · **i18n**: `No`

| Atributo                  | Tipo en Strapi | Requerido | Restricciones / Relación                                                                     |
| :------------------------ | :------------- | :-------- | :------------------------------------------------------------------------------------------- |
| `referenceCode`           | `string`       | Yes       | —                                                                                            |
| `formSlug`                | `string`       | Yes       | —                                                                                            |
| `formTitle`               | `string`       | No        | —                                                                                            |
| `category`                | `enumeration`  | No        | enum: `contact, service_desk, inquiry, application, volunteer, custom`; default: `"contact"` |
| `status`                  | `enumeration`  | Yes       | enum: `new, read, under_review, scheduled, completed, rejected, archived`; default: `"new"`  |
| `priority`                | `enumeration`  | Yes       | enum: `low, normal, high, urgent`; default: `"normal"`                                       |
| `department`              | `string`       | No        | default: `"general"`                                                                         |
| `locale`                  | `string`       | No        | default: `"es"`                                                                              |
| `applicantName`           | `string`       | No        | —                                                                                            |
| `applicantEmail`          | `email`        | No        | —                                                                                            |
| `applicantPhone`          | `string`       | No        | —                                                                                            |
| `data`                    | `json`         | Yes       | default: `{}`                                                                                |
| `checklistItems`          | `json`         | No        | default: `[]`                                                                                |
| `staffNotes`              | `text`         | No        | —                                                                                            |
| `assignedTo`              | `string`       | No        | —                                                                                            |
| `linkedBookingId`         | `string`       | No        | —                                                                                            |
| `linkedCertificateNumber` | `string`       | No        | —                                                                                            |
| `formBuilderSubmissionId` | `integer`      | No        | —                                                                                            |
| `ipAddress`               | `string`       | No        | `private: true`                                                                              |
| `userAgent`               | `string`       | No        | `private: true`                                                                              |
| `submittedAt`             | `datetime`     | Yes       | —                                                                                            |
| `secondaryDate`           | `json`         | No        | —                                                                                            |

### `plugin::inbox.subscriber` — Inbox Subscriber

Double Opt-In newsletter and community topic subscriber

> **Kind**: `collectionType` · **DB Table**: `inbox_subscribers` · **Admin Location**: `/admin/content-manager/collection-types/plugin::inbox.subscriber` · **Draft & Publish**: `No` · **i18n**: `No`

| Atributo           | Tipo en Strapi | Requerido | Restricciones / Relación                                       |
| :----------------- | :------------- | :-------- | :------------------------------------------------------------- |
| `email`            | `email`        | Yes       | —                                                              |
| `fullName`         | `string`       | No        | —                                                              |
| `phone`            | `string`       | No        | —                                                              |
| `locale`           | `string`       | No        | default: `"es"`                                                |
| `topics`           | `json`         | No        | default: `["announcements"]`                                   |
| `status`           | `enumeration`  | Yes       | enum: `pending, confirmed, unsubscribed`; default: `"pending"` |
| `confirmToken`     | `string`       | No        | `private: true`                                                |
| `unsubscribeToken` | `string`       | Yes       | `private: true`                                                |
| `confirmedAt`      | `datetime`     | No        | —                                                              |
| `unsubscribedAt`   | `datetime`     | No        | —                                                              |
| `sourceFormSlug`   | `string`       | No        | —                                                              |

## Integración con el Content Manager de Strapi v5 (`/admin/content-manager`)

> **Grupo en la Barra Lateral del Content Manager**: `Inbox & Omnichannel Broadcasts`

### Entidades y Componentes en el Content Manager

- `plugin::inbox.submission` (**Inbox Submission** — `/admin/content-manager/collection-types/plugin::inbox.submission`)
- `plugin::inbox.subscriber` (**Inbox Subscriber** — `/admin/content-manager/collection-types/plugin::inbox.subscriber`)
- `plugin::inbox.alert-banner` (**Inbox Alert Banner** — `/admin/content-manager/collection-types/plugin::inbox.alert-banner`)

![Bandeja, Formularios y Alertas — Vista de Entidades en el Content Manager de Strapi v5](/screenshots/inbox-content-manager.png)

### Por Qué Este Plugin Crea e Integra Entidades en el Content Manager

`@vicacha-devs/strapi-plugin-inbox` registers all three of its entities (`Inbox Submission`, `Inbox Subscriber`, and `Inbox Alert Banner`) with `pluginOptions['content-manager'].visible = true` so service-desk coordinators, newsletter managers, and editors can combine the operational triage board in `/admin/plugins/inbox` with Strapi v5's native Content Manager:

- **Structured Casework & Cross-Entity Linking**: In Content Manager, `Inbox Submission` (`plugin::inbox.submission`) exposes `referenceCode`, `category`, `status`, `priority`, `department`, `checklistItems`, `linkedBookingId`, and `linkedCertificateNumber` while keeping `ipAddress` and `userAgent` protected (`private: true`).
- **Subscriber Topic & GDPR Compliance Management**: Filter `Inbox Subscriber` (`plugin::inbox.subscriber`) by `status` (`pending`, `confirmed`, `unsubscribed`), `locale`, and `topics` while `confirmToken` and `unsubscribeToken` remain private.
- **Time-Bounded Urgent Alert Authoring**: Author and schedule `Inbox Alert Banner` (`plugin::inbox.alert-banner`) records (`severity`: `info`, `warning`, `urgent`, `celebration`, `startsAt`, `endsAt`, `translations`) directly in Content Manager.

### Cómo Usarlo en el Content Manager de Strapi (Paso a Paso)

1. **Open in Content Manager**: In the left sidebar, navigate to **Content Manager -> Collection Types -> Inbox & Omnichannel Broadcasts** and select **Inbox Submission**, **Inbox Subscriber**, or **Inbox Alert Banner**.
2. **Manage Urgent Alert Banners**: Open **Inbox Alert Banner** (`/admin/content-manager/collection-types/plugin::inbox.alert-banner`) to create or toggle site-wide announcements (`RAMADAN-HILAL-1447`, `JUMUAH-LIVE-KHUTBAH`, `WINTER-BLANKET-CAMPAIGN`).
3. **Filter & Assign Service-Desk Submissions**: Open **Inbox Submission** (`/admin/content-manager/collection-types/plugin::inbox.submission`) to filter tickets by `priority = urgent`, `department`, or `status = under_review`, and update `assignedTo` and `staffNotes`.
4. **Workspace vs. Content Manager**: Use **Content Manager** for bulk filtering, alert banner scheduling, and subscriber list audits; use the **Inbox Workspace** (`/admin/plugins/inbox`) for dynamic form schema design and interactive service-desk SLA triage.

### Sincronización entre el Content Manager y el Espacio del Plugin

```mermaid
flowchart LR
  CM["Strapi Content Manager (/admin/content-manager)"] --> Sub["Inbox Submission (plugin::inbox.submission)"]
  CM --> News["Inbox Subscriber (plugin::inbox.subscriber)"]
  CM --> Alert["Inbox Alert Banner (plugin::inbox.alert-banner)"]
  Alert -->|"GET /api/inbox/alerts"| Ticker["Live Website Urgent Header Ticker"]
  News -->|"Confirmed Subscribers"| Broadcasts["Omnichannel Broadcasts Bridge"]
```

### Casos de Uso en el Content Manager y Flujos Editoriales

#### Content Manager Use Case 1 — Scheduling Multilingual Urgent & Celebration Alert Banners

- **Para qué sirve y por qué usarlo**: Publish time-bounded header banners for Ramadan Hilal confirmation (`severity: 'celebration'`), Friday live khutbah streams (`info`), or emergency relief appeals (`urgent`).
- **Cómo ejecutarlo en el Content Manager**: Open `/admin/content-manager/collection-types/plugin::inbox.alert-banner`, click **+ Create new entry**, set `code`, `title`, `message`, `severity`, `startsAt`, `endsAt`, and `translations`, and save.

#### Content Manager Use Case 2 — Auditing Service-Desk Submissions & Linking Bookings/Certificates

- **Para qué sirve y por qué usarlo**: Filter high-priority counseling or matrimonial requests in Content Manager and link them to an appointment (`linkedBookingId`) or certificate (`linkedCertificateNumber`).
- **Cómo ejecutarlo en el Content Manager**: Open `/admin/content-manager/collection-types/plugin::inbox.submission`, filter by `priority = high`, and update the record.

## 3. Casos de Uso y Flujos de Trabajo

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

## 4. Endpoints REST API (`content-api` y `admin`)

| Método | Ruta del Endpoint                            | Ámbito        | Controlador                           | Autenticación |
| :----- | :------------------------------------------- | :------------ | :------------------------------------ | :------------ |
| `GET`  | `/api/inbox/forms`                           | `content-api` | `inboxController.listForms`           | Public        |
| `GET`  | `/api/inbox/forms/{slug}`                    | `content-api` | `inboxController.getFormBySlug`       | Public        |
| `POST` | `/api/inbox/forms/{slug}/submit`             | `content-api` | `inboxController.submitForm`          | Public        |
| `POST` | `/api/inbox/subscribers`                     | `content-api` | `inboxController.subscribe`           | Public        |
| `GET`  | `/api/inbox/subscribers/confirm/{token}`     | `content-api` | `inboxController.confirmSubscription` | Public        |
| `GET`  | `/api/inbox/subscribers/unsubscribe/{token}` | `content-api` | `inboxController.unsubscribe`         | Public        |
| `GET`  | `/api/inbox/alerts`                          | `content-api` | `inboxController.getActiveAlerts`     | Public        |
| `GET`  | `/inbox/settings`                            | `admin`       | `inboxController.getSettings`         | Bearer JWT    |
| `PUT`  | `/inbox/settings`                            | `admin`       | `inboxController.updateSettings`      | Bearer JWT    |
| `GET`  | `/inbox/templates`                           | `admin`       | `inboxController.listTemplates`       | Bearer JWT    |
