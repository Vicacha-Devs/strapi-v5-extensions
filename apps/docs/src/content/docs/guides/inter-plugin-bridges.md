---
title: Inter-Plugin Bridges
description: How @vicacha-devs Strapi v5 plugins discover each other at bootstrap and synchronize schedules, certificates, Hijri offsets, and alert banners.
---

## Overview

While most plugins in the `@vicacha-devs` suite can run standalone, installing related plugins together unlocks **automatic inter-plugin bridges** during Strapi's `bootstrap` lifecycle (`server/src/bootstrap.ts`). Bridges use runtime service discovery (`strapi.plugin('<id>')?.service('<service>')`) so optional companion plugins remain loosely coupled without hard crashes when a companion plugin is omitted.

---

## Bridge Topology

| Source Plugin              | Target Plugin      | Bridge Mechanism                                          | Runtime Behavior                                                                                                                                                                     |
| :------------------------- | :----------------- | :-------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`events`**               | **`calendar`**     | `calendar.service('registry').registerSource(...)`        | Automatically registers `plugin::events.event` into the unified FullCalendar workspace with category colors, RRULE expansion, and iCal feed aggregation.                             |
| **`bookings`**             | **`calendar`**     | `calendar.service('registry').registerSource(...)`        | Automatically registers confirmed & pending `plugin::bookings.booking` reservations into the unified FullCalendar workspace.                                                         |
| **`donations`**            | **`certificates`** | `certificates.service('issuance').issueCertificate(...)`  | When a donation pledge transitions to `verified` (`paid`), automatically issues an Ed25519-signed tax/donation certificate and stores the verification serial.                       |
| **`islam`**                | **`calendar`**     | Shared Umm al-Qura Hijri offset (`shifting` `-2` to `+2`) | When an official Hilal (crescent moon) sighting is confirmed in `plugin::islam.hilal-announcement`, updates the Umm al-Qura Hijri day offset (`-2` to `+2`) across liturgical views. |
| **`islam`**                | **`inbox`**        | `strapi.documents('plugin::inbox.alert-banner').create()` | Publishes high-priority community alert banners (e.g., Ramadan/Eid moon-sighting announcements) directly into `plugin::inbox.alert-banner` when `enableInboxAlertBridge` is enabled. |
| **`events` / `donations`** | **`broadcasts`**   | Document Service lifecycle hooks                          | Triggers automated WhatsApp, Telegram, or Email broadcast rules (`plugin::broadcasts.automation-rule`) when events are published or fundraising milestones are reached.              |

---

## 1. Calendar Source Registration Bridge (`events` & `bookings` -> `calendar`)

During `bootstrap`, both `@vicacha-devs/strapi-plugin-events` and `@vicacha-devs/strapi-plugin-bookings` inspect whether `@vicacha-devs/strapi-plugin-calendar` is loaded and register their sources via the `registry` service:

```ts
// Inside packages/strapi-plugin-events/server/src/bootstrap.ts
const calendarPlugin = strapi.plugin("calendar");
const calendarRegistry = calendarPlugin?.service("registry");
if (calendarRegistry && typeof calendarRegistry.registerSource === "function" && settings) {
  for (const source of settings.sources ?? []) {
    await calendarRegistry.registerSource({
      id: source.id,
      label: source.label,
      uid: source.uid,
      color: source.color,
      enabled: source.enabled,
      fields: {
        title: source.fields.title,
        startDate: source.fields.startDate,
        endDate: source.fields.endDate,
        rrule: source.fields.rrule,
        location: source.fields.location,
        category: source.fields.category,
        status: source.fields.status,
      },
      timeSlotMap: source.timeSlotMap,
      categoryColors: source.categoryColors,
      defaultAllDay: source.defaultAllDay,
    });
  }
}
```

![Unified Calendar Aggregating Events and Bookings](/screenshots/calendar-admin.png)

---

## 2. Cryptographic Tax Receipt Bridge (`donations` -> `certificates`)

When a pledge (`plugin::donations.pledge`) is verified via a Wompi/Stripe HMAC-SHA256 webhook or admin approval, `@vicacha-devs/strapi-plugin-donations` checks if `@vicacha-devs/strapi-plugin-certificates` is installed and both `autoIssueCertificateOnVerify` and `enableCertificatesBridge` are enabled:

```ts
// Inside packages/strapi-plugin-donations/server/src/services/pledgeService.ts
const certPlugin = strapi.plugin("certificates");
const certService = (certPlugin?.service("issuance") ?? certPlugin?.service("certificate")) as
  | CertificateIssuerService
  | undefined;
if (certService && typeof certService.issueCertificate === "function") {
  const issued = await certService.issueCertificate({
    templateSlug: settings.defaultCertificateTemplateSlug || "certificado-donacion-anual",
    recipientFullName: String(existing.donorName || "Donante Anónimo"),
    recipientDocumentId: String(existing.donorDocumentNumber || ""),
    recipientEmail: String(existing.donorEmail || ""),
    metadata: {
      pledgeCode: existing.pledgeCode,
      amount: existing.amount,
      currency: existing.currency,
      category: existing.category,
    },
  });
}
```

---

## 3. Hilal Sighting Synchronization (`islam` -> `calendar` & `inbox`)

Confirming a crescent moon sighting in `@vicacha-devs/strapi-plugin-islam` (`POST /islam/hilal/confirm`) atomically:

1. Persists the `plugin::islam.hilal-announcement` record.
2. Updates the Hijri day offset (`shifting`) and Ramadan/Eid active dates in `@vicacha-devs/strapi-plugin-islam` settings.
3. Creates an active announcement banner in `@vicacha-devs/strapi-plugin-inbox` (`strapi.documents("plugin::inbox.alert-banner").create(...)`) when `activateBanner` and `enableInboxAlertBridge` are enabled.
