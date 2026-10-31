// Content-Type Entity architecture, locations, Pele Mermaid diagrams, and real-world use cases
// for plugins 8–14: inbox, islam, media-feeds, notes, resources, seo, sitemap.

import type { PluginEntityGuideEntry } from "./plugin-use-cases.ts";

export const PLUGIN_ENTITY_GUIDE_B: Record<string, PluginEntityGuideEntry> = {
  "inbox": {
    howItWorks:
      "Registers three Collection Types (`plugin::inbox.submission`, `plugin::inbox.subscriber`, and `plugin::inbox.alert-banner`). Submissions capture dynamic form payloads and service-desk tickets; Subscribers manage double opt-in topic lists; Alert Banners drive time-bounded site-wide urgent tickers.",
    whereToFind: [
      "**Content Manager**: `/admin/content-manager/collection-types/plugin::inbox.submission`, `plugin::inbox.subscriber`, and `plugin::inbox.alert-banner` (`visible: true`)",
      "**Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Inbox Submission`, `Inbox Subscriber`, `Inbox Alert Banner`)",
      "**Plugin Workspace & Settings**: `/admin/plugins/inbox` (Service Desk Inbox, Subscribers, Alert Banners) and `/admin/settings/inbox`",
      "**Database Tables**: `inbox_submissions`, `inbox_subscribers`, and `inbox_alert_banners`",
    ],
    entityMermaid: `flowchart LR
  Form["Dynamic Form Builder (/api/inbox/forms/{slug})"] --> Submission["plugin::inbox.submission (Service-Desk Ticket)"]
  OptIn["POST /api/inbox/subscribers"] --> Subscriber["plugin::inbox.subscriber (Double Opt-In)"]
  AlertAdmin["Alert Manager & Islam Hilal Bridge"] --> Banner["plugin::inbox.alert-banner (GET /api/inbox/alerts)"]`,
    useCases: [
      [
        "Use Case 1 — Dynamic Public Form Builder & Service-Desk Casework Triage",
        "Render multi-step contact, matrimonial, counseling, or volunteer forms on the frontend and triage submissions with SLA priorities and staff checklists.",
        "Fetch form schemas via `GET /api/inbox/forms/{slug}`, submit via `POST /api/inbox/submit` (creating `plugin::inbox.submission` with a `referenceCode`), and track status via `GET /api/inbox/track/{referenceCode}`.",
        `flowchart LR
  Schema["GET /api/inbox/forms/{slug}"] --> Submit["POST /api/inbox/forms/{slug}/submit"]
  Submit --> Ticket["Create plugin::inbox.submission (referenceCode)"]
  Ticket --> Casework["Staff Triage, Checklist & Booking/Certificate Bridge"]`,
        "admin",
      ],
      [
        "Use Case 2 — Double Opt-In Newsletter & Topic Subscription Management",
        "Collect GDPR-compliant newsletter and community topic subscribers with tokenized confirmation and 1-click unsubscribe.",
        "`POST /api/inbox/subscribe` creates a `plugin::inbox.subscriber` in `pending` status; `POST /api/inbox/confirm` and `POST /api/inbox/unsubscribe` verify `confirmToken` / `unsubscribeToken` (`private: true`).",
        `flowchart LR
  Sub["POST /api/inbox/subscribers"] --> Pending["plugin::inbox.subscriber (status = pending)"]
  Pending --> Confirm["GET /api/inbox/subscribers/confirm/{token}"]
  Confirm --> Active["status = confirmed (Ready for Broadcasts)"]`,
        "settings",
      ],
      [
        "Use Case 3 — Time-Bounded Multilingual Site-Wide Alert Banners",
        "Publish urgent announcements (e.g., Ramadan Hilal sighting, weather closure, live stream alert) in the website header ticker.",
        "Create `plugin::inbox.alert-banner` records with `severity` (`info`, `warning`, `urgent`, `celebration`), `startsAt`, `endsAt`, and `translations`; fetch active banners via `GET /api/inbox/alerts`.",
        `flowchart LR
  Create["Upsert plugin::inbox.alert-banner (startsAt..endsAt)"] --> ActiveFilter["Filter Active & Non-Expired Banners"]
  ActiveFilter --> HeaderTicker["GET /api/inbox/alerts (Localized Urgent Ticker)"]`,
        "content-manager",
      ],
    ],
  },
  "islam": {
    howItWorks:
      "Registers two Collection Types (`plugin::islam.hilal-announcement` and `plugin::islam.scripture-entry`) paired with pure astronomical calculation engines (`prayerEngine`, `qiblaEngine`, `hijriEngine`, `zakatEngine`, `inheritanceEngine`).",
    whereToFind: [
      "**Content Manager**: `/admin/content-manager/collection-types/plugin::islam.hilal-announcement` & `/admin/content-manager/collection-types/plugin::islam.scripture-entry` (`visible: true`)",
      "**Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Islam Hilal Moon-Sighting Announcement` & `Islam Scripture & Dua Entry`)",
      "**Plugin Workspace & Settings**: `/admin/plugins/islam` (Salah & Iqamah, Hilal Sighting, Scripture Hub, Zakat & Mirath) and `/admin/settings/islam`",
      "**Database Tables**: `islam_hilal_announcements` and `islam_scripture_entries`",
    ],
    entityMermaid: `flowchart LR
  Astro["Astronomical Engine (Salah, Qibla, Hijri, Zakat, Mirath)"] --> API["/api/islam/prayers, /qibla, /zakat, /inheritance"]
  Hilal["plugin::islam.hilal-announcement"] -->|"dayOffset + alert"| Bridges["Calendar Umm al-Qura & Inbox Alert Banner"]
  Scripture["plugin::islam.scripture-entry (Ayah / Hadith / Dua)"] --> Daily["GET /api/islam/scripture/daily & /duas"]`,
    useCases: [
      [
        "Use Case 1 — Daily & Monthly Astronomical Salah, Adhan & Iqamah Timetables",
        "Serve accurate Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha, and Jumu'ah Iqamah schedules with high-latitude and Ramadan Imsak/Iftar rules.",
        "Configure coordinates, `calculationMethod` (`MWL`, `UmmAlQura`, `ISNA`, etc.), and Iqamah offsets in `/admin/settings/islam`; query `GET /api/islam/prayers/today` or `GET /api/islam/prayers/monthly`.",
        `flowchart LR
  Coords["Coordinates + Calculation Method (MWL / UmmAlQura)"] --> Solar["Solar Declination & Equation of Time Engine"]
  Solar --> Iqamah["Apply Iqamah Offsets & Jumu'ah Rules"]
  Iqamah --> Timetable["GET /api/islam/prayers/today & /monthly"]`,
        "admin",
      ],
      [
        "Use Case 2 — Official Hilal Moon-Sighting Confirmation & Cross-Plugin Sync",
        "Record official local/regional crescent moon sightings for Ramadan, Eid al-Fitr, and Dhu al-Hijjah and immediately adjust Hijri dates across the platform.",
        "`POST /islam/hilal/confirm` creates a `plugin::islam.hilal-announcement` record, updates the Umm al-Qura `shifting` offset (`-2` to `+2`), and optionally publishes a `plugin::inbox.alert-banner`.",
        `flowchart LR
  Confirm["POST /islam/hilal/confirm"] --> Entity["Persist plugin::islam.hilal-announcement"]
  Entity --> Shift["Update Hijri Lunar Day Offset (-2..+2) in Calendar"]
  Entity --> Banner["Auto-Publish Urgent Alert Banner in Inbox"]`,
        "settings",
      ],
      [
        "Use Case 3 — Curated Multilingual Quran Ayah, Hadith & Hisnul Muslim Dua Hub",
        "Manage verified Arabic scripture entries (`entryKind: 'ayah' | 'hadith' | 'dua'`) with transliteration, translations (`es`, `en`, `ar`, `tr`), audio recitations (defaulting to `Mishari Rashid al-\\`Afasy`, ID `7`), and daily rotation.",
        "Store records in `plugin::islam.scripture-entry` and serve them via `GET /api/islam/scripture/daily`, `GET /api/islam/scripture/duas`, and `GET /api/islam/quran/resources`.",
        `flowchart LR
  Entry["plugin::islam.scripture-entry (Arabic + Translations + Audio)"] --> Rotate["Deterministic Daily Rotation Selector"]
  Rotate --> Endpoints["GET /api/islam/scripture/daily & /duas"]`,
        "content-manager",
      ],
      [
        "Use Case 4 — Qibla Great-Circle Compass, Zakat Nisab & Faraid Inheritance Calculators",
        "Provide interactive liturgical and Fiqh utilities via stateless REST endpoints.",
        "Call `GET /api/islam/qibla?lat=...&lng=...`, `POST /api/islam/zakat/calculate`, and `POST /api/islam/inheritance/calculate`.",
        `flowchart LR
  Client["Frontend Liturgical & Fiqh Widgets"] --> Qibla["GET /api/islam/qibla (Spherical Bearing to Kaaba)"]
  Client --> Zakat["POST /api/islam/zakat/calculate (Gold/Silver Nisab)"]
  Client --> Mirath["POST /api/islam/inheritance/calculate (Quranic Shares)"]`,
      ],
    ],
  },
  "media-feeds": {
    howItWorks:
      "Registers two localized, draft-and-publish Collection Types (`plugin::media-feeds.media-item` and `plugin::media-feeds.media-series`). Media Series group episodes into podcast shows or video playlists; Media Items store multi-language audio/video episodes, OEmbed metadata, audio enclosures, transcripts, and chapter markers. Supports `schemaExtensions` in `config/plugins.ts`.",
    whereToFind: [
      "**Content Manager**: `/admin/content-manager/collection-types/plugin::media-feeds.media-item` & `/admin/content-manager/collection-types/plugin::media-feeds.media-series` (`visible: true`)",
      "**Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Media Episode & Feed Item` & `Media Series & Podcast Show`)",
      "**Plugin Workspace & Settings**: `/admin/plugins/media-feeds` (Episode Hub, Series, OEmbed Enricher, Live Stream Control) and `/admin/settings/media-feeds`",
      "**Database Tables**: `media_feed_items` and `media_feed_series`",
    ],
    entityMermaid: `flowchart LR
  Series["plugin::media-feeds.media-series (media_feed_series)"] -->|"seriesSlug"| Item["plugin::media-feeds.media-item (media_feed_items)"]
  Item -->|"RSS 2.0 + iTunes XML"| Podcast["GET /api/media-feeds/podcast.xml"]
  Item -->|"isLive: true"| Live["GET /api/media-feeds/live"]`,
    useCases: [
      [
        "Use Case 1 — Apple Podcasts & Spotify iTunes RSS 2.0 XML Syndication",
        "Automatically generate standards-compliant podcast RSS feeds with `<itunes:image>`, `<enclosure>`, duration, and per-series filtering.",
        "Organize `plugin::media-feeds.media-item` records under a `plugin::media-feeds.media-series` (`rssEnabled: true`) and syndicate `GET /api/media-feeds/podcast.xml` or `GET /api/media-feeds/podcast/{seriesSlug}.xml`.",
        `flowchart LR
  Series["plugin::media-feeds.media-series (rssEnabled: true)"] --> Episodes["Published plugin::media-feeds.media-item Audio Enclosures"]
  Episodes --> XML["RSS 2.0 + iTunes Namespace XML Builder"]
  XML --> Directory["Apple Podcasts / Spotify (/api/media-feeds/podcast.xml)"]`,
        "admin",
      ],
      [
        "Use Case 2 — SSRF-Hardened YouTube, Vimeo & Spotify OEmbed Auto-Enrichment",
        "Allow editors to paste a YouTube or Vimeo URL and automatically populate episode title, thumbnail, embed URL, and provider ID.",
        "In `/admin/plugins/media-feeds`, trigger `POST /media-feeds/enrich` (which validates hostnames against SSRF private IP ranges) before saving `plugin::media-feeds.media-item`.",
        `flowchart LR
  Paste["Editor Pastes YouTube / Vimeo / Spotify URL"] --> Guard["SSRF Allowlist & Private IP Guard"]
  Guard --> Fetch["Fetch Provider OEmbed Metadata"]
  Fetch --> Populate["Auto-Fill title, thumbnailUrl, embedUrl & providerId"]`,
        "settings",
      ],
      [
        "Use Case 3 — Live Broadcast Status Banner & Stream Switcher",
        "Toggle a live khutbah, lecture, or webinar stream on the website header with real-time status polling.",
        "Mark an episode `isLive: true` or update live stream settings in `/admin/plugins/media-feeds`, and poll `GET /api/media-feeds/live` from the frontend.",
        `flowchart LR
  Toggle["Toggle Live Stream in /admin/plugins/media-feeds"] --> Store["Update isLive Episode or Live Stream Config"]
  Store --> Poll["Frontend Polls GET /api/media-feeds/live"]`,
        "content-manager",
      ],
    ],
  },
  "notes": {
    howItWorks:
      "Registers one internal polymorphic Collection Type (`plugin::notes.note`, `content-manager.visible: false`) that attaches editorial annotations to **any** Strapi Content Manager document via `entitySlug` (e.g., `api::article.article`), `entityDocumentId`, and `entityLocale`.",
    whereToFind: [
      "**Content Manager Right Side Panel**: Open **any** document in `/admin/content-manager/collection-types/...` or `single-types/...` to view, create, and pin notes scoped to that document and locale",
      "**Global Notes Hub Workspace**: `/admin/plugins/notes` (centralized search, category filter, and pin board across all Content-Type entities)",
      "**Database Table**: `notes` (`plugin::notes.note` queried via `strapi.documents('plugin::notes.note')`)",
    ],
    entityMermaid: `flowchart LR
  CM["Any Content Manager Document (entitySlug + entityDocumentId + entityLocale)"] --> SidePanel["Injected Content Manager Notes Panel"]
  SidePanel --> NoteEntity["plugin::notes.note (notes table)"]
  NoteEntity --> Hub["Global Notes Hub (/admin/plugins/notes)"]`,
    useCases: [
      [
        "Use Case 1 — In-Context Editorial Review & Translation Handoff Notes",
        "Leave `todo`, `blocker`, `idea`, or `general` notes directly on a draft Article, Event, or Donation Campaign for fellow editors and translators.",
        "Open the record in Content Manager; the injected side panel queries `GET /notes/entity?entitySlug=...&entityDocumentId=...&entityLocale=...` and creates notes via `POST /notes`.",
        `flowchart LR
  OpenDoc["Editor Opens Document in Content Manager"] --> LoadNotes["GET /notes/entity (Scoped by UID + DocumentId + Locale)"]
  LoadNotes --> AddNote["POST /notes (category: todo | blocker | idea | general)"]
  AddNote --> Saved["Persist plugin::notes.note with Author & Timestamp"]`,
        "content-manager",
      ],
      [
        "Use Case 2 — Pinning Critical Editorial Blockers to the Top of a Document",
        "Ensure legal, theological, or fact-checking warnings stay pinned (`isPinned: true`) at the top of a Content Manager entry.",
        "Toggle pin status in the Content Manager side panel (`PUT /notes/{id}`), surfacing the note both on the document and in the Global Notes Hub.",
        `flowchart LR
  Blocker["Critical Note (category: blocker)"] --> Pin["PUT /notes/{id} (isPinned: true)"]
  Pin --> Top["Pinned to Top of Content Manager Side Panel & Global Hub"]`,
        "admin",
      ],
      [
        "Use Case 3 — Cross-Collection Editorial Triage in the Global Notes Hub",
        "Review all unresolved `blocker` and `todo` annotations across every collection type from a single dashboard.",
        "Navigate to `/admin/plugins/notes` to filter `plugin::notes.note` records by `category`, `isPinned`, `entitySlug`, or keyword and jump straight to the target document.",
        `flowchart LR
  Hub["/admin/plugins/notes (Global Notes Hub)"] --> Filter["Filter by Category, Pinned Status, Entity UID or Keyword"]
  Filter --> Jump["Click Note Card -> Open Target Document in Content Manager"]`,
        "settings",
      ],
    ],
  },
  "resources": {
    howItWorks:
      "Registers three localized (`i18n.localized: true`), draft-and-publish (`draftAndPublish: true`) Collection Types: `plugin::resources.publication`, `plugin::resources.gallery-album`, and `plugin::resources.glossary-term`, plus a 3-tab settings panel (`/admin/settings/resources`) covering Media Library folder paths, multi-calendar secondary dates, Cloudinary `f_auto,q_auto` optimization, album photo caps, and download extension/MIME allow-lists. Supports runtime `schemaExtensions` in `config/plugins.ts`.",
    whereToFind: [
      "**Content Manager**: `/admin/content-manager/collection-types/plugin::resources.publication`, `plugin::resources.gallery-album`, and `plugin::resources.glossary-term` (`visible: true`)",
      "**Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Resource Publication`, `Resource Gallery Album`, `Resource Glossary Term`)",
      "**Plugin Workspace**: `/admin/plugins/resources` (Publications, Gallery Albums, Glossary Terms, Media Folder Sync)",
      "**Settings Panel (3 Tabs)**: `/admin/settings/resources` — **Media Library Folders & Organization** (`organizationName`, `defaultPublicationsFolderPath`, `defaultGalleriesFolderPath`, `secondaryCalendar`, `defaultLocale`, `supportedLocales`), **CDN Optimization & Folder Sync** (`enableCloudinaryOptimization`, `autoSyncMediaFolders`, `maxPhotosPerAlbum`), and **Download Security & Allow-Lists** (`allowedDownloadExtensions`, `allowedDownloadMimeTypes`)",
      "**Database Tables**: `resources_publications`, `resources_gallery_albums`, and `resources_glossary_terms`",
    ],
    entityMermaid: `flowchart LR
  Pub["plugin::resources.publication (resources_publications)"] --> Download["POST /api/resources/publications/{slug}/download"]
  Folder["Strapi Media Library Folder"] -->|"sync-folder"| Album["plugin::resources.gallery-album (resources_gallery_albums)"]
  Glossary["plugin::resources.glossary-term (resources_glossary_terms)"] --> AZ["GET /api/resources/glossary?letter=A"]`,
    useCases: [
      [
        "Use Case 1 — Digital Publications Library with Hardened Download Allow-Lists",
        "Publish downloadable books, PDF guides, pamphlets, and press kits protected by extension (`allowedDownloadExtensions`) and MIME (`allowedDownloadMimeTypes`) allow-lists, `X-Content-Type-Options: nosniff`, and atomic download counters.",
        "Configure allowed extensions/MIME types in `/admin/settings/resources` (**Download Security & Allow-Lists** tab), create `plugin::resources.publication` records, and serve downloads via `POST /api/resources/publications/{slug}/download`.",
        `flowchart LR
  Request["POST /api/resources/publications/{slug}/download"] --> Sanitize["Validate Extension & MIME Allow-Lists (nosniff)"]
  Sanitize --> Counter["Increment downloadCount on plugin::resources.publication"]
  Counter --> Stream["Return Hardened Download Metadata"]`,
        "admin",
      ],
      [
        "Use Case 2 — Configuring Media Library Folders, Secondary Calendars, CDN Optimization & Download Security",
        "Manage all 11 `ResourcesPluginSettings` fields across 3 organized tabs in `/admin/settings/resources` (`Media Library Folders & Organization`, `CDN Optimization & Folder Sync`, and `Download Security & Allow-Lists`) and automatically sync `plugin::upload.folder` assets into `plugin::resources.gallery-album` up to `maxPhotosPerAlbum`.",
        "Configure `defaultPublicationsFolderPath`, `defaultGalleriesFolderPath`, `secondaryCalendar`, `enableCloudinaryOptimization`, `autoSyncMediaFolders`, `maxPhotosPerAlbum`, and download allow-lists in `/admin/settings/resources` (`PUT /resources/settings`), then click **Sync Folder** (`POST /resources/galleries/{documentId}/sync-folder`).",
        `flowchart LR
  Settings["/admin/settings/resources (3 Tabs: Folders, CDN & Sync, Security)"] --> Sync["POST /resources/galleries/{documentId}/sync-folder (up to maxPhotosPerAlbum)"]
  Sync --> Album["Update plugin::resources.gallery-album (Cloudinary f_auto,q_auto + secondaryDateLabel)"]
  Album --> Frontend["GET /api/resources/galleries"]`,
        "settings",
      ],
      [
        "Use Case 3 — Multilingual A–Z Glossary with Native Script & Audio Pronunciation",
        "Maintain an educational glossary of Arabic/Islamic or domain terms (`term`, `nativeScript`, `transliteration`, `definition`, `pronunciationAudio`, `letterGroup`).",
        "Manage entries in `plugin::resources.glossary-term` and query grouped A–Z terms via `GET /api/resources/glossary?letter=A&category=worship`.",
        `flowchart LR
  Term["plugin::resources.glossary-term (term + nativeScript + audio)"] --> Index["Group by letterGroup (A-Z) & Category"]
  Index --> Query["GET /api/resources/glossary?letter=A"]`,
        "content-manager",
      ],
    ],
  },
  "seo": {
    howItWorks:
      "Registers and manages two shared Strapi Components (`shared.seo` and `shared.open-graph`) inside the Content-Type Builder and injects a live Google SERP, OpenGraph/X Social Card, and Keyword Density Analyzer into the Content Manager edit view for any `api::*` Collection Type or Single Type that includes `shared.seo`.",
    whereToFind: [
      "**Content-Type Builder (Components)**: `/admin/plugins/content-type-builder` under **COMPONENTS -> Shared** (`seo` -> `components_shared_seos`, `openGraph` -> `components_shared_open_graphs`)",
      "**Content Manager Edit View**: Open any Collection Type or Single Type with the `seo` component attached (e.g., `/admin/content-manager/single-types/api::about-page.about-page`)",
      "**Plugin Workspace & Settings**: `/admin/plugins/seo` (Content-Type SEO Coverage Audit & 1-Click Component Attachment) and `/admin/settings/seo`",
    ],
    entityMermaid: `flowchart LR
  SeoComp["Component: shared.seo (components_shared_seos)"] -->|"repeatable: false"| OpenGraph["Component: shared.open-graph (components_shared_open_graphs)"]
  SeoComp -->|"attached to"| ContentTypes["Any api::* Collection Type or Single Type"]
  ContentTypes --> Analyzer["Live Google SERP, Social Card & Keyword Density Panel"]`,
    useCases: [
      [
        "Use Case 1 — 1-Click `shared.seo` Component Bootstrap Across Content Types",
        "Automatically create the `shared.seo` and `shared.open-graph` components and attach them to Articles, Pages, Events, or Courses without manual field setup.",
        "On bootstrap (when `autoCreateComponent: true`) or via `/admin/plugins/seo` (`POST /seo/component`), the plugin registers `shared.seo` and attaches it to selected `api::*` schemas.",
        `flowchart LR
  Bootstrap["Plugin Bootstrap or POST /seo/component"] --> CreateComp["Register shared.seo & shared.open-graph Components"]
  CreateComp --> Attach["Attach seo Component to Target api::* Content Types"]`,
        "admin",
      ],
      [
        "Use Case 2 — Live Google SERP, Social Card Preview & Keyword Density Scoring",
        "Give editors real-time feedback on `metaTitle` (<= 60 chars), `metaDescription` (50–160 chars), `canonicalURL`, `metaRobots`, and focus keyword density while editing.",
        "Edit the `seo` component inside any Content Manager entry to preview desktop/mobile Google SERP snippets and OpenGraph social cards.",
        `flowchart LR
  Edit["Editor Updates shared.seo Fields in Content Manager"] --> Score["Compute Title/Description Length & Keyword Density"]
  Score --> Preview["Render Live Google SERP & OpenGraph / X Card Preview"]`,
        "settings",
      ],
      [
        "Use Case 3 — Authoring `SEO & Metadata` (`Meta Title`, `Meta Description`, `Open Graph`, `Canonical URL` & `JSON-LD Structured Data`) in Content Manager",
        "Configure localized meta titles (`max. 60 characters`), meta descriptions (`50–160 characters`), Open Graph social cards, robots/viewport directives, canonical URLs, and Schema.org JSON-LD (`Article`, `Event`, `FAQPage`, `Organization`) directly inside the Content Manager edit view.",
        "Expand **SEO & Metadata** (`shared.seo`) on any entry in `/admin/content-manager`, populate `Meta Title*` (`metaTitle`), `Meta Description*` (`metaDescription`), `Meta Social Share Image` (`metaImage`), `Open Graph (Social Sharing)` (`openGraph`), `SEO Keywords` (`keywords`), `Meta Robots Directive` (`metaRobots`), `Meta Viewport` (`metaViewport`), `Canonical URL` (`canonicalURL`), and `JSON-LD Structured Data` (`structuredData`), and query via `?populate[seo][populate]=*`.",
        `flowchart LR
  JsonLd["Expand SEO & Metadata (shared.seo) in Content Manager"] --> Fields["Set Meta Title, Meta Description, Open Graph & JSON-LD Structured Data"]
  Fields --> API["GET /api/{collection}?populate[seo][populate]=*"]
  API --> Head["Render <meta> Tags & <script type='application/ld+json'>"]`,
        "content-manager",
      ],
    ],
  },
  "sitemap": {
    howItWorks:
      "Registers two internal Collection Types (`plugin::sitemap.sitemap-content-type` and `plugin::sitemap.sitemap-content-type-single-url`) and one Single Type (`plugin::sitemap.sitemap-option`) with `content-manager.visible: false`, while introspecting all public `api::*` and `plugin::*` Content-Type entities to generate `/api/sitemap/sitemap.xml` and `/api/sitemap/sitemap-{slug}.xml`.",
    whereToFind: [
      "**Settings Panel (4 Tabs)**: `/admin/settings/sitemap` (`Settings -> Sitemap -> Configuration` — organized into **General & Sitemap Index**, **Collection Types**, **Custom URLs**, and **Excluded URLs** tabs)",
      "**Internal Persistence Entities**: `plugin::sitemap.sitemap-content-type` (`strapi_5_sitemap_plugin_content_types`), `plugin::sitemap.sitemap-content-type-single-url` (`strapi_5_sitemap_plugin_content_type_single_urls`), and `plugin::sitemap.sitemap-option` (`strapi_5_sitemap_plugin_options`)",
    ],
    entityMermaid: `flowchart LR
  CTMap["plugin::sitemap.sitemap-content-type (URL Patterns)"] --> Builder["XML Sitemap & Hreflang Engine"]
  SingleUrl["plugin::sitemap.sitemap-content-type-single-url (Static URLs)"] --> Builder
  Options["plugin::sitemap.sitemap-option (Base URL & Index Rules)"] --> Builder
  Builder --> Output["/api/sitemap/sitemap.xml & /api/sitemap/sitemap-{slug}.xml"]`,
    useCases: [
      [
        "Use Case 1 — Dynamic Multilingual Entity URL Pattern Mapping & `xhtml:link` Hreflang",
        "Map any localized Strapi Content-Type entity (`api::article.article`, `plugin::events.event`, `plugin::resources.publication`) to dynamic URL patterns with automatic `hreflang` alternates.",
        "In `/admin/settings/sitemap` (**Collection Types** tab), map a content type + `langcode` to a pattern (e.g., `/[locale]/articles/[slug]`), `priority`, and `frequency` (`plugin::sitemap.sitemap-content-type`).",
        `flowchart LR
  Pattern["Map Content-Type + langcode -> /[locale]/articles/[slug]"] --> FetchDocs["Query Published Documents & Localizations"]
  FetchDocs --> Hreflang["Generate <url> + <xhtml:link rel='alternate' hreflang='...' />"]
  Hreflang --> Xml["Serve /api/sitemap/sitemap.xml"]`,
        "admin",
      ],
      [
        "Use Case 2 — Hybrid Static + CMS Sitemap with Custom Single URLs",
        "Include static frontend routes (`/`, `/es/contact`, `/ar/prayer-times`) alongside dynamic CMS entries in the same XML sitemap.",
        "Add static route entries in the **Custom URLs** tab (`plugin::sitemap.sitemap-content-type-single-url`) and exclude internal routes in the **Excluded URLs** tab.",
        `flowchart LR
  CustomTab["Custom URLs Tab (POST /sitemap/admin-custom-urls)"] --> SingleEntity["plugin::sitemap.sitemap-content-type-single-url"]
  SingleEntity --> Merge["Merge Static URLs + Dynamic Content-Type URLs"]`,
      ],
      [
        "Use Case 3 — Multi-File Sitemap Index (`sitemap-{slug}.xml`) for Large Sites",
        "Split large portals into dedicated sub-sitemaps (e.g., `/api/sitemap/sitemap-articles.xml`, `/api/sitemap/sitemap-events.xml`) referenced by a master `<sitemapindex>`.",
        "Enable `useSitemapIndex: true` and define `sitemapDefinitions` in the **General & Sitemap Index** tab of `/admin/settings/sitemap` (`PUT /sitemap/admin-put-options`).",
        `flowchart LR
  Settings["/admin/settings/sitemap (General & Sitemap Index Tab)"] -->Defs["Define Sub-Sitemaps (articles, events, publications)"]
  Defs --> IndexXml["GET /api/sitemap/sitemap.xml (<sitemapindex>)"]
  IndexXml --> SubXml["GET /api/sitemap/sitemap-{slug}.xml"]`,
        "settings",
      ],
    ],
  },
};
