---
title: Content-Type Entities & Use Cases
description: Complete directory of all 25 Content-Type entities, 2 shared components, and 4 custom fields across the 14 @vicacha-devs Strapi v5 plugins — how they work, what they are for, where to find them, and how to extend them.
---

## Overview: How Plugin Content-Type Entities Work in Strapi v5

Across the 14 `@vicacha-devs` plugins, data is modeled and exposed through **four complementary Strapi v5 mechanisms**:

1. **Visible Plugin Collection Types (21 Entities)**:
   Registered with `pluginOptions["content-manager"].visible: true` and `pluginOptions["content-type-builder"].visible: true`. They appear **both** inside each plugin's dedicated workspace (`/admin/plugins/<id>`) **and** inside the standard Strapi **Content Manager** (`/admin/content-manager/collection-types/plugin::<id>.<entity>`) and **Content-Type Builder** (`/admin/plugins/content-type-builder`).
2. **Internal Plugin Content-Type Entities (4 Entities)**:
   Registered by `notes` (`plugin::notes.note`) and `sitemap` (`plugin::sitemap.sitemap-content-type`, `plugin::sitemap.sitemap-content-type-single-url`, `plugin::sitemap.sitemap-option`) with `content-manager.visible: false`. These store polymorphic annotations or XML routing rules and are managed through the Content Manager right side panel or the Sitemap workspace (`/admin/plugins/sitemap`), while still remaining queryable on the server via `strapi.documents(uid)`.
3. **Shared Components (2 Components) & Custom Fields (4 Custom Fields)**:
   - `@vicacha-devs/strapi-plugin-seo` creates `shared.seo` and `shared.open-graph` under **Content-Type Builder -> Components -> Shared**.
   - `calendar`, `events`, and `donations` register `plugin::calendar.rrule`, `plugin::events.rrule`, `plugin::donations.currency`, and `plugin::donations.country` for use on any `api::*` or `plugin::*` schema.
4. **Multi-Collection Consumers (`calendar` & `global-search`)**:
   Instead of locking you into a rigid schema, `calendar` and `global-search` dynamically bind to **your existing `api::*` and `plugin::*` Content-Type entities**.

---

## Where to Find Content-Type Entities in Strapi v5

| Location in Strapi v5                                 | URL Path / API                                          | What You Find There                                                                                                                               |
| :---------------------------------------------------- | :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1. Content Manager (Collection Types)**             | `/admin/content-manager/collection-types/plugin::<uid>` | All 21 visible plugin collection types (`Booking`, `Booking Resource`, `Broadcast Campaign`, `Event`, `Issued Certificate`, `Publication`, etc.). |
| **2. Content Manager (Right Side Panel & Edit View)** | Any `/admin/content-manager/...` document edit screen   | **Editorial Notes** side panel (`plugin::notes.note`) and **SEO & SERP Analyzer** (`shared.seo` / `shared.open-graph`).                           |
| **3. Content-Type Builder**                           | `/admin/plugins/content-type-builder`                   | Inspect all 21 visible plugin schemas, attach `shared.seo` / `shared.open-graph` components, or add `rrule` / `currency` / `country` fields.      |
| **4. Dedicated Plugin Workspaces**                    | `/admin/plugins/<plugin-id>`                            | Domain-specific UIs (FullCalendar scheduler, Ed25519 certificate issuance wizard, Salah timetable, Service-Desk SLA inbox, Podcast OEmbed hub).   |
| **5. Plugin Settings Panels**                         | `/admin/settings/<plugin-id>`                           | Configure collection mappings, calculation methods, webhooks, and defaults persisted in `strapi_core_store_settings`.                             |
| **6. Spotlight Command Palette (`Cmd+K` / `Ctrl+K`)** | Press `⌘K` / `Ctrl+K` anywhere in `/admin`              | Instant cross-entity search across every `api::*` and `plugin::*` document with 1-keystroke jump to Content Manager.                              |
| **7. Server Document Service API**                    | `strapi.documents("plugin::<id>.<entity>")`             | TypeScript/Node.js CRUD (`findMany`, `findOne`, `create`, `update`, `delete`, `publish`, `unpublish`).                                            |

---

## Master Directory of All 25 Content-Type Entities

| Plugin             | Entity UID (`strapi.documents`)                   | Display Name                           | Kind             | DB Table (`collectionName`)                        | Content Manager Visibility | i18n / Draft & Publish | What It Is For (Primary Purpose)                                                                 |
| :----------------- | :------------------------------------------------ | :------------------------------------- | :--------------- | :------------------------------------------------- | :------------------------- | :--------------------- | :----------------------------------------------------------------------------------------------- |
| **`bookings`**     | `plugin::bookings.resource`                       | Booking Resource                       | `collectionType` | `booking_resources`                                | Visible (`true`)           | No / No                | Bookable rooms, services, staff, or equipment with weekly/seasonal schedules and slot capacity.  |
| **`bookings`**     | `plugin::bookings.booking`                        | Booking                                | `collectionType` | `bookings`                                         | Visible (`true`)           | No / No                | Individual customer reservations, party size, status workflow, and hashed cancel tokens.         |
| **`broadcasts`**   | `plugin::broadcasts.campaign`                     | Broadcast Campaign                     | `collectionType` | `broadcast_campaigns`                              | Visible (`true`)           | No / No                | Omnichannel Email, Telegram & WhatsApp campaign payloads, scheduling, and delivery stats.        |
| **`broadcasts`**   | `plugin::broadcasts.automation-rule`              | Broadcast Automation Rule              | `collectionType` | `broadcast_automation_rules`                       | Visible (`true`)           | No / No                | EventHub-triggered (`entry.publish`) automated broadcast templates per target content type.      |
| **`broadcasts`**   | `plugin::broadcasts.delivery-log`                 | Broadcast Delivery Log                 | `collectionType` | `broadcast_delivery_logs`                          | Visible (`true`)           | No / No                | Idempotent (`idempotencyKey`), PII-masked (`recipientMasked`) per-recipient audit trail.         |
| **`certificates`** | `plugin::certificates.template`                   | Certificate Template                   | `collectionType` | `certificates_templates`                           | Visible (`true`)           | No / No                | Reusable official credential layouts, serial prefixes, witness requirements, and signatories.    |
| **`certificates`** | `plugin::certificates.certificate`                | Issued Certificate                     | `collectionType` | `certificates_records`                             | Visible (`true`)           | No / No                | Ed25519-signed credential records, salted `nationalIdHash`, QR tokens, and DocuSign status.      |
| **`donations`**    | `plugin::donations.campaign`                      | Donation Campaign & Invoice            | `collectionType` | `vicacha_donation_campaigns`                       | Visible (`true`)           | **Yes / Yes**          | Localized crowdfunding campaigns (`major_campaign`), utility bills (`utility_invoice`), & needs. |
| **`donations`**    | `plugin::donations.pledge`                        | Donation Pledge & Contribution         | `collectionType` | `vicacha_donation_pledges`                         | Visible (`true`)           | No / No                | Donor pledges, payment gateway references, verification state, and linked certificate serials.   |
| **`events`**       | `plugin::events.event`                            | Event                                  | `collectionType` | `plugin_events_items`                              | Visible (`true`)           | **Yes / Yes**          | Localized single & recurring (`plugin::events.rrule`) events, speakers, and RSVP capacity rules. |
| **`events`**       | `plugin::events.registration`                     | Event Registration (RSVP)              | `collectionType` | `plugin_events_registrations`                      | Visible (`true`)           | No / No                | Attendee RSVPs, guest counts, automatic waitlist queue, and 1-click door check-in tokens.        |
| **`inbox`**        | `plugin::inbox.submission`                        | Inbox Submission                       | `collectionType` | `inbox_submissions`                                | Visible (`true`)           | No / No                | Dynamic form submissions and service-desk tickets with SLA priority, checklists, and tracking.   |
| **`inbox`**        | `plugin::inbox.subscriber`                        | Inbox Subscriber                       | `collectionType` | `inbox_subscribers`                                | Visible (`true`)           | No / No                | Double opt-in newsletter & community topic subscribers with hashed confirmation tokens.          |
| **`inbox`**        | `plugin::inbox.alert-banner`                      | Inbox Alert Banner                     | `collectionType` | `inbox_alert_banners`                              | Visible (`true`)           | No / No                | Time-bounded multilingual urgent announcement banners (`info`, `warning`, `urgent`).             |
| **`islam`**        | `plugin::islam.hilal-announcement`                | Islam Hilal Moon-Sighting Announcement | `collectionType` | `islam_hilal_announcements`                        | Visible (`true`)           | No / No                | Official Ramadan, Eid al-Fitr, and Dhu al-Hijjah moon-sighting confirmations & Hijri offsets.    |
| **`islam`**        | `plugin::islam.scripture-entry`                   | Islam Scripture & Dua Entry            | `collectionType` | `islam_scripture_entries`                          | Visible (`true`)           | No / No                | Curated Quranic Ayahs, Prophetic Hadiths, and Hisnul Muslim Duas with Arabic & audio URLs.       |
| **`media-feeds`**  | `plugin::media-feeds.media-item`                  | Media Episode & Feed Item              | `collectionType` | `media_feed_items`                                 | Visible (`true`)           | **Yes / Yes**          | Multilingual video/podcast episodes, OEmbed metadata, audio files, transcripts, & live flags.    |
| **`media-feeds`**  | `plugin::media-feeds.media-series`                | Media Series & Podcast Show            | `collectionType` | `media_feed_series`                                | Visible (`true`)           | **Yes / Yes**          | Podcast shows and lecture playlists syndicated as Apple/Spotify RSS 2.0 XML feeds.               |
| **`notes`**        | `plugin::notes.note`                              | Notes                                  | `collectionType` | `notes`                                            | Internal (`false`)         | No / No                | Polymorphic editorial annotations (`todo`, `blocker`, `idea`) attached to any CMS document.      |
| **`resources`**    | `plugin::resources.publication`                   | Resource Publication                   | `collectionType` | `resources_publications`                           | Visible (`true`)           | **Yes / Yes**          | Digital books, guides, pamphlets, and press kits with SSRF-hardened download tracking.           |
| **`resources`**    | `plugin::resources.gallery-album`                 | Resource Gallery Album                 | `collectionType` | `resources_gallery_albums`                         | Visible (`true`)           | **Yes / Yes**          | Photo & video albums synced with Strapi v5 Media Library folders (`mediaFolderId`).              |
| **`resources`**    | `plugin::resources.glossary-term`                 | Resource Glossary Term                 | `collectionType` | `resources_glossary_terms`                         | Visible (`true`)           | **Yes / Yes**          | Multilingual A–Z glossary terms with native script, transliteration, and audio pronunciation.    |
| **`sitemap`**      | `plugin::sitemap.sitemap-content-type`            | Sitemap Content Type                   | `collectionType` | `strapi_5_sitemap_plugin_content_types`            | Internal (`false`)         | No / No                | Maps each Content-Type entity + locale (`langcode`) to URL patterns, priority, and frequency.    |
| **`sitemap`**      | `plugin::sitemap.sitemap-content-type-single-url` | Sitemap Single URL                     | `collectionType` | `strapi_5_sitemap_plugin_content_type_single_urls` | Internal (`false`)         | No / No                | Stores custom static URLs (`/about`, `/contact`) merged into the generated XML sitemap.          |
| **`sitemap`**      | `plugin::sitemap.sitemap-option`                  | Sitemap Options                        | `singleType`     | `strapi_5_sitemap_plugin_options`                  | Internal (`false`)         | No / No                | Stores global `baseUrl`, `excludedUrls`, `useSitemapIndex`, and sub-sitemap definitions.         |

---

## Shared Components & Custom Fields Registered by Plugins

| Plugin          | Component / Custom Field UID | Kind          | Underlying Type / Table          | Where to Attach It                                                                               |
| :-------------- | :--------------------------- | :------------ | :------------------------------- | :----------------------------------------------------------------------------------------------- |
| **`seo`**       | `shared.seo`                 | `component`   | `components_shared_seos`         | Attach to any `api::*` Collection Type or Single Type (or auto-attach via `/admin/plugins/seo`). |
| **`seo`**       | `shared.open-graph`          | `component`   | `components_shared_open_graphs`  | Nested inside `shared.seo.openGraph` for Facebook/LinkedIn/X social cards.                       |
| **`calendar`**  | `plugin::calendar.rrule`     | `customField` | `json` (RFC 5545 + RFC 7529)     | Add to any event or schedule collection in Content-Type Builder for visual recurrence rules.     |
| **`events`**    | `plugin::events.rrule`       | `customField` | `json` (RFC 5545 + RFC 7529)     | Pre-attached on `plugin::events.event.recurrence`; reusable on any custom `api::*` event model.  |
| **`donations`** | `plugin::donations.currency` | `customField` | `string` (ISO 4217 code)         | Pre-attached on `campaign` & `pledge`; reusable on any commerce or finance content type.         |
| **`donations`** | `plugin::donations.country`  | `customField` | `string` (ISO 3166 country code) | Reusable on donor, address, or international branch content types.                               |

---

## Extending Plugin Content-Type Entities (`schemaExtensions`)

Seven plugins (`bookings`, `broadcasts`, `certificates`, `donations`, `events`, `media-feeds`, and `resources`) allow you to inject custom attributes, relations, or components directly into their Content-Type entities at startup via `config.schemaExtensions` in `config/plugins.ts` — **without forking the plugin package**:

```ts
// config/plugins.ts
export default () => ({
  events: {
    enabled: true,
    config: {
      schemaExtensions: {
        // Extends plugin::events.event in-place during Strapi register()
        event: {
          department: {
            type: "enumeration",
            enum: ["education", "youth", "culture", "outreach"],
            default: "education",
          },
          sponsorRelation: {
            type: "relation",
            relation: "manyToOne",
            target: "api::sponsor.sponsor",
          },
        },
      },
    },
  },
  bookings: {
    enabled: true,
    config: {
      schemaExtensions: {
        resource: {
          floorNumber: { type: "integer", default: 1 },
        },
        booking: {
          cateringRequired: { type: "boolean", default: false },
        },
      },
    },
  },
});
```
