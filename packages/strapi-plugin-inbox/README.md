# `@vicacha-devs/strapi-plugin-inbox`

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
