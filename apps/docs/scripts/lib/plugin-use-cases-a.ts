// Content-Type Entity architecture, locations, Pele Mermaid diagrams, and real-world use cases
// for plugins 1–7: bookings, broadcasts, calendar, certificates, donations, events, global-search.

import type { PluginEntityGuideEntry } from "./plugin-use-cases.ts";

export const PLUGIN_ENTITY_GUIDE_A: Record<string, PluginEntityGuideEntry> = {
  "bookings": {
    howItWorks:
      "Registers two relational Collection Types (`plugin::bookings.resource` one-to-many `plugin::bookings.booking`). Resources define weekly/seasonal availability windows, slot duration, buffers, and capacity; Bookings store individual customer reservations, party size, status transitions, and hashed self-service cancellation tokens. Supports runtime `schemaExtensions` (`resource`, `booking`) and `customFields` in `config/plugins.ts`.",
    whereToFind: [
      "**Content Manager**: `/admin/content-manager/collection-types/plugin::bookings.resource` & `/admin/content-manager/collection-types/plugin::bookings.booking` (`visible: true`)",
      "**Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Booking Resource` & `Booking`)",
      "**Plugin Workspace & Settings**: `/admin/plugins/bookings` (Reservations & Resources manager) and `/admin/settings/bookings`",
      "**Database Tables**: `booking_resources` and `bookings`",
    ],
    entityMermaid: `flowchart LR
  Resource["plugin::bookings.resource (booking_resources)"] -->|"1 : N bookings"| Booking["plugin::bookings.booking (bookings)"]
  Booking -->|"calendar bridge"| Calendar["FullCalendar Workspace (/admin/plugins/calendar)"]
  Resource -->|"availability engine"| Slots["GET /api/bookings/available-slots"]`,
    useCases: [
      [
        "Use Case 1 — Public Self-Service Slot Discovery & Reservation",
        "Allow website visitors to query available time slots for a room, counselor, imam, or equipment resource and book a slot without double-booking.",
        "Query `GET /api/bookings/available-slots?resourceSlug=main-conference-hall&date=2026-05-15`, then submit `POST /api/bookings/reserve` to create a `plugin::bookings.booking` entity and receive a one-time cancellation token.",
        `flowchart LR
  Visitor["Website Visitor"] -->|"1. GET /api/bookings/available-slots"| Engine["Slot Availability Engine"]
  Engine -->|"2. Check weeklySchedule + existing bookings"| Resource["plugin::bookings.resource"]
  Visitor -->|"3. POST /api/bookings/reserve"| Create["Create plugin::bookings.booking"]
  Create -->|"4. Return bookingCode + cancelToken"| Confirmation["Confirmed / Pending Slot"]`,
        "admin",
      ],
      [
        "Use Case 2 — Multi-Host Appointment & Buffer Enforcement",
        "Manage 1-on-1 consultations or guided tours with automatic pre/post buffer windows (`bufferBeforeMinutes`, `bufferAfterMinutes`), minimum lead time (`minLeadTimeHours`), and host assignment (`assignedHost`).",
        "Configure `weeklySchedule`, `seasonalSchedules`, and `blackoutDates` on `plugin::bookings.resource`; staff approve or mark `completed` / `no_show` via `PUT /bookings/bookings/{documentId}/status`.",
        `flowchart LR
  Config["Settings & Resource Rules (buffers, minLeadTimeHours)"] --> Schedule["Resource Weekly & Seasonal Schedule"]
  Schedule --> Assign["Assign Host (assignedHost)"]
  Assign --> Status["PUT /bookings/bookings/{documentId}/status (confirmed / completed)"]`,
        "settings",
      ],
      [
        "Use Case 3 — Tokenized Self-Service Rescheduling & Cancellation",
        "Let customers reschedule or cancel their reservation from an email link without requiring a Strapi account.",
        "Pass the customer's `bookingCode` and plaintext `cancelToken` (verified against `cancelTokenHash`) to `POST /api/bookings/reschedule` or `POST /api/bookings/cancel`.",
        `flowchart LR
  Customer["Customer Email Link (bookingCode + cancelToken)"] --> Verify["SHA-256 Verify cancelTokenHash"]
  Verify -->|"Valid Token"| Action["POST /api/bookings/reschedule or /cancel"]
  Action --> Update["Update plugin::bookings.booking & Free Slot"]`,
        "content-manager",
      ],
      [
        "Use Case 4 — Unified Calendar & iCal Feed Synchronization",
        "Project all confirmed and pending reservations into the FullCalendar workspace and external Google/Apple Calendar clients.",
        "At bootstrap, `bookings` registers `plugin::bookings.booking` with `strapi.plugin('calendar').service('registry')` and exposes `GET /api/bookings/feed.ics`.",
        `flowchart LR
  Bookings["plugin::bookings.booking"] -->|"registerSource() at bootstrap"| Registry["Calendar Source Registry"]
  Registry --> FullCal["FullCalendar Admin Grid"]
  Bookings -->|"RFC 5545 serializer"| ICal["GET /api/bookings/feed.ics"]`,
      ],
    ],
  },
  "broadcasts": {
    howItWorks:
      "Registers three Collection Types (`plugin::broadcasts.campaign`, `plugin::broadcasts.automation-rule`, `plugin::broadcasts.delivery-log`). Campaigns store multi-channel message payloads; Automation Rules subscribe to Strapi `eventHub` events (e.g., `entry.publish`); Delivery Logs store idempotent (`idempotencyKey`), PII-masked (`recipientMasked`) audit trails. Supports `schemaExtensions` in `config/plugins.ts`.",
    whereToFind: [
      "**Content Manager**: `/admin/content-manager/collection-types/plugin::broadcasts.campaign`, `plugin::broadcasts.automation-rule`, and `plugin::broadcasts.delivery-log` (`visible: true`)",
      "**Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types**",
      "**Plugin Workspace & Settings**: `/admin/plugins/broadcasts` (Campaigns, Automation Rules, Delivery Audit) and `/admin/settings/broadcasts`",
      "**Database Tables**: `broadcast_campaigns`, `broadcast_automation_rules`, and `broadcast_delivery_logs`",
    ],
    entityMermaid: `flowchart LR
  Campaign["plugin::broadcasts.campaign"] -->|"dispatch"| Dispatcher["Omnichannel Dispatcher (Email / Telegram / WhatsApp)"]
  Rule["plugin::broadcasts.automation-rule"] -->|"eventHub trigger"| Dispatcher
  Dispatcher -->|"idempotent audit"| Log["plugin::broadcasts.delivery-log (PII Masked)"]`,
    useCases: [
      [
        "Use Case 1 — Omnichannel Manual & Scheduled Community Campaigns",
        "Dispatch announcements simultaneously across Email (SMTP/Resend), Telegram Bot channels/threads, and WhatsApp Cloud API.",
        "Create a `plugin::broadcasts.campaign` entity with `channels: ['email', 'telegram', 'whatsapp']`, preview via `POST /broadcasts/campaigns/{id}/dry-run`, and dispatch via `POST /broadcasts/campaigns/{id}/send`.",
        `flowchart LR
  Editor["Strapi Editor (/admin/plugins/broadcasts)"] --> Campaign["plugin::broadcasts.campaign"]
  Campaign -->|"1. Dry-Run Preview"| DryRun["POST /broadcasts/campaigns/{id}/dry-run"]
  DryRun -->|"2. Send Now"| Channels["Email + Telegram Bot + WhatsApp Cloud API"]`,
        "admin",
      ],
      [
        "Use Case 2 — EventHub Zero-Touch Publish Automation",
        "Automatically broadcast a Telegram/WhatsApp notification whenever an editor publishes a new Event, Hilal Announcement, or Urgent Campaign.",
        "Create a `plugin::broadcasts.automation-rule` entity matching `eventName: 'entry.publish'` and `targetContentType: 'plugin::events.event'` with Mustache-style `subjectTemplate` and `bodyTextTemplate`.",
        `flowchart LR
  Publish["Strapi EventHub (entry.publish)"] --> Match["plugin::broadcasts.automation-rule"]
  Match --> Render["Render Mustache Template ({{title}}, {{startDate}})"]
  Render --> Dispatch["Auto-Broadcast to Configured Channels"]`,
        "settings",
      ],
      [
        "Use Case 3 — Idempotent PII-Masked Delivery Auditing",
        "Guarantee no subscriber receives duplicate messages on retry while keeping phone numbers and emails masked in database logs.",
        "Every dispatch computes a deterministic `idempotencyKey` recorded in `plugin::broadcasts.delivery-log` with `recipientMasked` (`j***@example.org`, `+57***4821`).",
        `flowchart LR
  Attempt["Channel Send Attempt"] --> Key["Compute SHA-256 idempotencyKey"]
  Key -->|"Not Yet Sent"| Send["Deliver Message & Mask PII (j***@example.org)"]
  Send --> Audit["Persist plugin::broadcasts.delivery-log"]`,
        "content-manager",
      ],
    ],
  },
  "calendar": {
    howItWorks:
      "Acts as a multi-collection scheduler engine that binds to **any** Strapi Content-Type entity (`api::*` or `plugin::*`) configured in `collections[]` or registered dynamically via `calendar.service('registry').registerSource()`. Also registers the `plugin::calendar.rrule` Custom Field (`json`) for RFC 5545 `RRULE` + RFC 7529 `RSCALE` recurrence rules.",
    whereToFind: [
      "**Bound Content-Type Entities**: Any Content Manager collection mapped in `/admin/settings/calendar` (e.g., `plugin::events.event`, `plugin::bookings.booking`, `api::article.article`)",
      "**Custom Field in Content-Type Builder**: Add the `plugin::calendar.rrule` custom field to any collection type in `/admin/plugins/content-type-builder`",
      "**Plugin Workspace & Settings**: `/admin/plugins/calendar` (FullCalendar v6 Month/Week/Day/Agenda workspace) and `/admin/settings/calendar` (General, Prayer & Islamic, Bookings & Availability tabs)",
    ],
    entityMermaid: `flowchart LR
  Events["plugin::events.event"] --> Registry["Calendar Source Registry"]
  Bookings["plugin::bookings.booking"] --> Registry
  CustomApi["Any api::* Collection (+ plugin::calendar.rrule)"] --> Registry
  Registry --> Engine["RRULE + RSCALE + CLDR Secondary Calendar Engine"]
  Engine --> UI["FullCalendar v6 Workspace & /api/calendar/ical.ics"]`,
    useCases: [
      [
        "Use Case 1 — Aggregating Multiple Strapi Collections into One Calendar",
        "Display Events, Bookings, Courses, and Editorial Deadlines from different Content-Type entities on a single color-coded FullCalendar grid.",
        "Map each collection's `uid`, `titleField`, `startField`, `endField`, and `rruleField` in `/admin/settings/calendar` or `config/plugins.ts`, then query `GET /api/calendar/occurrences?start=...&end=...`.",
        `flowchart LR
  Sources["Mapped Collections (events, bookings, api::*)"] --> Aggregator["calendarService.getOccurrences(start, end)"]
  Aggregator --> Expand["Expand RRULE & Attach CLDR Hijri/Hebrew/Persian Dates"]
  Expand --> Grid["Unified FullCalendar v6 Month / Week / Day / List Grid"]`,
        "admin",
      ],
      [
        "Use Case 2 — Sacred & Lunar Recurrence (`RRULE` + `RSCALE=ISLAMIC-UMALQURA`)",
        "Schedule annual or monthly recurring events that follow the Hijri, Hebrew, or Persian calendar and automatically project onto Gregorian dates.",
        "Attach `plugin::calendar.rrule` to your Content-Type entity to author RFC 7529 rules (`RSCALE=ISLAMIC-UMALQURA;FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=1`).",
        `flowchart LR
  Field["plugin::calendar.rrule Custom Field"] --> Rule["RSCALE=ISLAMIC-UMALQURA;FREQ=YEARLY;BYMONTH=9"]
  Rule --> Converter["CLDR Umm al-Qura + Lunar Day Offset (-2..+2)"]
  Converter --> Gregorian["Projected Gregorian Occurrences"]`,
        "settings",
      ],
      [
        "Use Case 3 — Drag-and-Drop Rescheduling & Quick-Create into Target Entities",
        "Let editors drag an event on the calendar grid or click a date cell to create/update the underlying Strapi document directly.",
        "Uses `POST /calendar/quick-create` and `POST /calendar/reschedule` to mutate the mapped `strapi.documents(uid)` record in place.",
        `flowchart LR
  Drag["Editor Drags Event or Clicks Date Cell"] --> Endpoint["POST /calendar/reschedule or /quick-create"]
  Endpoint --> DocService["strapi.documents(targetUid).update / create"]
  DocService --> Refresh["Live Calendar Grid Refresh"]`,
        "content-manager",
      ],
      [
        "Use Case 4 — Public RFC 5545 iCal (`.ics`) Subscription Feeds",
        "Allow users to subscribe to live calendar feeds in Google Calendar, Apple Calendar, or Outlook.",
        "Subscribe to `GET /api/calendar/ical.ics` (all sources) or `GET /api/calendar/ical/{collectionId}.ics` (single source).",
        `flowchart LR
  Client["Google / Apple / Outlook Calendar"] -->|"GET /api/calendar/ical.ics"| Feed["RFC 5545 VCALENDAR Generator"]
  Feed -->|"VEVENT + RRULE + UID"| Sync["Subscribed Live Calendar Feed"]`,
      ],
    ],
  },
  "certificates": {
    howItWorks:
      "Registers two Collection Types (`plugin::certificates.template` and `plugin::certificates.certificate`). Templates define reusable certificate layouts, signatory rules, witness counts, and serial prefixes; Issued Certificates store canonical JSON payloads signed with Ed25519 (`cryptographicSignature`, `publicKeyFingerprint`), salted PII hashes (`nationalIdHash`), and DocuSign envelope status. Supports `schemaExtensions` in `config/plugins.ts`.",
    whereToFind: [
      "**Content Manager**: `/admin/content-manager/collection-types/plugin::certificates.template` & `/admin/content-manager/collection-types/plugin::certificates.certificate` (`visible: true`)",
      "**Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Certificate Template` & `Issued Certificate`)",
      "**Plugin Workspace & Settings**: `/admin/plugins/certificates` (Issuance Wizard, Ledger & Templates) and `/admin/settings/certificates`",
      "**Database Tables**: `certificates_templates` and `certificates_records`",
    ],
    entityMermaid: `flowchart LR
  Template["plugin::certificates.template (certificates_templates)"] -->|"layout & prefix"| Wizard["Issuance Service (Ed25519 Signer)"]
  Wizard -->|"canonicalPayloadHash + signature"| Record["plugin::certificates.certificate (certificates_records)"]
  Record -->|"QR Verification"| Verify["GET /api/certificates/verify/{serialNumber}"]`,
    useCases: [
      [
        "Use Case 1 — Issuing Cryptographically Signed Official Credentials",
        "Issue tamper-evident Shahada, Marriage (Nikah), Course Completion, or Tax Donation certificates signed with an Ed25519 private key.",
        "Select a `plugin::certificates.template` in `/admin/plugins/certificates` or call `POST /certificates/certificates/issue`; the service canonicalizes the payload, signs it with Ed25519, and persists `plugin::certificates.certificate`.",
        `flowchart LR
  Template["Select plugin::certificates.template"] --> Canonical["Canonicalize Recipient & Signatory Payload"]
  Canonical --> Sign["Sign with Ed25519 Private Key (node:crypto)"]
  Sign --> Persist["Persist plugin::certificates.certificate + QR Token"]`,
        "admin",
      ],
      [
        "Use Case 2 — Public QR Code Verification & Tamper Detection",
        "Let third parties (embassies, employers, auditors) verify a certificate's authenticity by scanning its QR code.",
        "Call `GET /api/certificates/verify/{serialNumber}?token=...` to re-verify the Ed25519 signature against `canonicalPayloadHash` and return masked recipient details.",
        `flowchart LR
  Scan["Scan Certificate QR Code"] --> VerifyAPI["GET /api/certificates/verify/{serialNumber}"]
  VerifyAPI --> CryptoCheck["crypto.verify(Ed25519, canonicalPayloadHash, signature)"]
  CryptoCheck --> Result["Return Verified Status + Masked Recipient Metadata"]`,
        "content-manager",
      ],
      [
        "Use Case 3 — Privacy-Preserving National ID Lookup (`nationalIdHash`)",
        "Verify whether a certificate belongs to a specific national ID number without storing plaintext national IDs in the database.",
        "The entity stores only `nationalIdMasked` (`***-***-7720`) and a per-serial salted SHA-256 `nationalIdHash` (`private: true`).",
        `flowchart LR
  Input["National ID Input + Serial Number"] --> Hash["Compute Salted SHA-256(serial + pepper + nationalId)"]
  Hash --> Compare["Constant-Time Compare with nationalIdHash"]
  Compare --> Display["Display Masked ID (***-***-7720)"]`,
        "settings",
      ],
      [
        "Use Case 4 — DocuSign / Webhook Multi-Party E-Signature Attestation",
        "Route pending certificates to signatories and witnesses via DocuSign envelopes and automatically transition status upon completion.",
        "Webhook events hit `POST /api/certificates/webhooks/esign` (verified with constant-time HMAC-SHA256) and update `esignEnvelopeStatus` on `plugin::certificates.certificate`.",
        `flowchart LR
  Envelope["DocuSign Envelope Sent to Signatories"] --> Webhook["POST /api/certificates/webhooks/esign"]
  Webhook --> Hmac["timingSafeEqual HMAC-SHA256 Verification"]
  Hmac --> Activate["Update esignEnvelopeStatus = completed & status = active"]`,
      ],
    ],
  },
  "donations": {
    howItWorks:
      "Registers two Collection Types (`plugin::donations.campaign` with `draftAndPublish: true` and `i18n.localized: true`, and `plugin::donations.pledge`) plus two Custom Fields (`plugin::donations.currency` and `plugin::donations.country`). Supports runtime `schemaExtensions` in `config/plugins.ts`.",
    whereToFind: [
      "**Content Manager**: `/admin/content-manager/collection-types/plugin::donations.campaign` & `/admin/content-manager/collection-types/plugin::donations.pledge` (`visible: true`)",
      "**Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** + Custom Fields `plugin::donations.currency` & `plugin::donations.country`",
      "**Plugin Workspace & Settings**: `/admin/plugins/donations` (Campaigns, Utility Bills, Pledges, Nisab Calculator) and `/admin/settings/donations`",
      "**Database Tables**: `vicacha_donation_campaigns` and `vicacha_donation_pledges`",
    ],
    entityMermaid: `flowchart LR
  Campaign["plugin::donations.campaign (major_campaign / utility_invoice)"] -->|"campaignSlug"| Pledge["plugin::donations.pledge (vicacha_donation_pledges)"]
  Pledge -->|"verified payment"| CertBridge["Certificates Bridge (Ed25519 Tax Receipt)"]`,
    useCases: [
      [
        "Use Case 1 — Multi-Currency Crowdfunding Campaigns (`major_campaign`)",
        "Run localized (`en`, `es`, `ar`, `tr`) fundraising campaigns with real-time progress bars (`goalAmount`, `raisedAmount`, `donorCount`).",
        "Publish a `plugin::donations.campaign` entity (`campaignKind: 'major_campaign'`), list via `GET /api/donations/campaigns`, and submit pledges via `POST /api/donations/pledges`.",
        `flowchart LR
  Campaign["Publish plugin::donations.campaign (i18n)"] --> List["GET /api/donations/campaigns"]
  List --> Donor["Donor Submits POST /api/donations/pledges"]
  Donor --> Pledge["Create plugin::donations.pledge (referenceCode)"]`,
        "admin",
      ],
      [
        "Use Case 2 — Operational Utility Invoice Sponsorship (`utility_invoice`)",
        "Allow community members to pay off specific monthly utility bills (electricity, water, internet) partially or in full (`coversRemainingBalance`).",
        "Create a `plugin::donations.campaign` with `campaignKind: 'utility_invoice'`, `invoiceReference`, `dueDate`, and `invoiceDocumentUrl`; query via `GET /api/donations/utility-bills`.",
        `flowchart LR
  Bill["plugin::donations.campaign (campaignKind: utility_invoice)"] --> BillsAPI["GET /api/donations/utility-bills"]
  BillsAPI --> Sponsor["Sponsor Full or Partial Balance"]
  Sponsor --> Paid["Auto-Transition Status when raisedAmount >= goalAmount"]`,
        "content-manager",
      ],
      [
        "Use Case 3 — HMAC-SHA256 Payment Gateway Webhooks & Auto-Certificate Bridge",
        "Automatically verify pledges from Wompi/Stripe webhooks, increment campaign totals, and issue an Ed25519 tax certificate.",
        "`POST /api/donations/webhook` verifies the signature, marks `plugin::donations.pledge` as `verified`, updates `raisedAmount`, and calls `strapi.plugin('certificates').service('issuance')`.",
        `flowchart LR
  Gateway["Wompi / Stripe Payment Webhook"] --> Verify["POST /api/donations/webhook (HMAC-SHA256)"]
  Verify --> UpdatePledge["Mark plugin::donations.pledge = verified & Increment raisedAmount"]
  UpdatePledge --> IssueCert["Auto-Issue Ed25519 Tax Certificate (certificateSerial)"]`,
        "settings",
      ],
      [
        "Use Case 4 — Precious-Metal Threshold (Zakat / Nisab) Calculation",
        "Provide donors with an interactive calculator based on live gold/silver gram thresholds in their local currency.",
        "Call `POST /api/donations/calculate-threshold` with asset balances and liabilities to compute net zakatable wealth and recommended contribution.",
        `flowchart LR
  Assets["Donor Assets & Liabilities Input"] --> Calc["POST /api/donations/calculate-threshold"]
  Calc --> Nisab["Compare Against Gold (85g) / Silver (595g) Threshold"]
  Nisab --> Output["Return Net Eligible Wealth & 2.5% Contribution"]`,
      ],
    ],
  },
  "events": {
    howItWorks:
      "Registers two Collection Types (`plugin::events.event` with `draftAndPublish: true` & `i18n.localized: true`, and `plugin::events.registration`) plus the `plugin::events.rrule` Custom Field. Also supports binding additional custom `api::*` event collections via `sources[]` and extending schemas via `schemaExtensions` in `config/plugins.ts`.",
    whereToFind: [
      "**Content Manager**: `/admin/content-manager/collection-types/plugin::events.event` & `/admin/content-manager/collection-types/plugin::events.registration` (`visible: true`)",
      "**Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Event` & `Event Registration (RSVP)`) + Custom Field `plugin::events.rrule`",
      "**Plugin Workspace & Settings**: `/admin/plugins/events` (Events Manager, RSVP Roster, Waitlist, Check-In) and `/admin/settings/events`",
      "**Database Tables**: `plugin_events_items` and `plugin_events_registrations`",
    ],
    entityMermaid: `flowchart LR
  Event["plugin::events.event (plugin_events_items)"] -->|"1 : N registrations"| Reg["plugin::events.registration (RSVP & Waitlist)"]
  Event -->|"RRULE + RSCALE"| CalBridge["Unified Calendar Bridge & /api/events/ical.ics"]`,
    useCases: [
      [
        "Use Case 1 — Multilingual Recurring Events with Poster & Speaker Metadata",
        "Publish localized single or recurring lectures, workshops, and community gatherings with speaker profiles and virtual/hybrid links.",
        "Author records in `plugin::events.event` (using `plugin::events.rrule` for recurrence) and query expanded occurrences via `GET /api/events/upcoming` or `GET /api/events/calendar`.",
        `flowchart LR
  Author["Author plugin::events.event (i18n + rrule)"] --> Expand["Recurrence Expansion Service"]
  Expand --> Upcoming["GET /api/events/upcoming & /api/events/calendar"]
  Expand --> ICal["GET /api/events/ical.ics"]`,
        "admin",
      ],
      [
        "Use Case 2 — Capacity-Controlled Public RSVP & Automatic Waitlist Promotion",
        "Enforce seat limits (`capacity`, `maxGuestsPerRegistration`) per occurrence date and automatically promote waitlisted guests when someone cancels.",
        "Visitors submit `POST /api/events/rsvp` (creating `plugin::events.registration` as `confirmed` or `waitlisted`); `POST /api/events/rsvp/cancel` cancels a seat and promotes the oldest waitlisted record.",
        `flowchart LR
  RSVP["POST /api/events/rsvp"] --> CheckCap{"Seats Available?"}
  CheckCap -->|"Yes"| Confirmed["status = confirmed (confirmedCount++)"]
  CheckCap -->|"No (Full)"| Waitlist["status = waitlisted (waitlistCount++)"]
  Cancel["POST /api/events/rsvp/cancel"] --> Promote["Auto-Promote Oldest Waitlisted Guest"]`,
        "settings",
      ],
      [
        "Use Case 3 — 1-Click Door Check-In & Formula-Injection-Safe CSV Roster Export",
        "Check in attendees at the venue entrance and export clean attendee rosters for spreadsheets.",
        "Use `POST /events/registrations/{documentId}/check-in` in `/admin/plugins/events` and download rosters via `GET /events/registrations/export.csv`.",
        `flowchart LR
  CheckIn["POST /events/registrations/{documentId}/check-in"] --> Mark["status = checked_in & checkedInAt = now()"]
  Mark --> Export["GET /events/registrations/export.csv (Formula-Sanitized)"]`,
        "content-manager",
      ],
    ],
  },
  "global-search": {
    howItWorks:
      "Operates as a universal zero-schema introspection engine over **all** registered Strapi v5 Content-Type entities (`api::*` collection types, single types, and `plugin::*` entities) plus nested components and dynamic zones. Uses `strapi.contentTypes` metadata and `strapi.documents(uid).findMany()` with RBAC permission filtering.",
    whereToFind: [
      "**Spotlight Command Palette Overlay**: Press `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) from **any** Strapi Admin screen (including Content Manager, Calendar, or Settings)",
      "**Dedicated Search Workspace**: `/admin/plugins/global-search` (`Global Search` in the main left sidebar)",
      "**Settings Panel**: `/admin/settings/global-search` (`Settings -> Global Search -> Configuration` — organized into **Search behaviour** and **Content types** tabs)",
      "**Target Entities**: Opens matched documents directly at `/admin/content-manager/collection-types/{uid}/{documentId}?plugins[i18n][locale]={locale}`",
    ],
    entityMermaid: `flowchart LR
  Shortcut["Cmd+K / Ctrl+K Palette or /admin/plugins/global-search"] --> Query["GET /global-search/search?q=..."]
  Query --> Introspect["Introspect api::* + plugin::* + Nested Components"]
  Introspect -->RBAC["RBAC Permission & Locale Filter"]
  RBAC --> Open["Open Document in Content Manager"]`,
    useCases: [
      [
        "Use Case 1 — Instant `Cmd+K` / `Ctrl+K` Spotlight Navigation Across All Entities",
        "Jump directly to any Article, Course, Event, Booking, Certificate, or Single Type record from anywhere in Strapi Admin without leaving the keyboard.",
        "Press `Cmd+K`, type a query (e.g., `islam`), navigate with `↑`/`↓`, and press `Enter` to open the document in Content Manager (or `Cmd/Ctrl + Enter` for a new tab).",
        `flowchart LR
  Key["Press Cmd+K / Ctrl+K Anywhere in Admin"] --> Modal["Spotlight Command Palette Modal"]
  Modal --> Type["Type Query (e.g. islam) + Filter by Type / Status"]
  Type --> Navigate["Press Enter -> Open in Content Manager"]`,
        "palette",
      ],
      [
        "Use Case 2 — Deep Component & Multilingual Script Search (Arabic, Turkish, Spanish)",
        "Find records by text buried inside repeatable components, SEO meta descriptions, or Arabic/RTL localized variants.",
        "`GET /global-search/search?q=...&locale=all` normalizes diacritics and Arabic Alef/Teh Marbuta variants and searches both top-level and nested component fields.",
        `flowchart LR
  Workspace["Global Search Workspace (/admin/plugins/global-search)"] --> Normalize["Normalize Diacritics & Arabic/Turkish Script"]
  Normalize --> DeepScan["Scan Collection Types + Single Types + Dynamic Zones"]
  DeepScan --> Grouped["Render Grouped Results with Status & Locale Badges"]`,
        "admin",
      ],
      [
        "Use Case 3 — Tabbed Search Behaviour & Per-Content-Type Inclusion Tuning",
        "Fine-tune query thresholds (`Minimum characters`, `Debounce (ms)`, `Results per content type`, `Maximum results`, `Component depth`, `Query timeout (ms)`, `Search inside components`, `Include drafts`, `Include plugin content types`) and toggle which Content-Type entities appear in global search.",
        "Configure the **Search behaviour** and **Content types** tabs in `/admin/settings/global-search` (`PUT /global-search/settings`).",
        `flowchart LR
  Settings["/admin/settings/global-search"] --> BehaviourTab["Search behaviour Tab (Limits, Depth, Drafts & Plugins)"]
  Settings --> TypesTab["Content types Tab (Toggle api::* & plugin::* UIDs)"]
  BehaviourTab --> Save["PUT /global-search/settings (Persisted in Plugin Store)"]
  TypesTab --> Save`,
        "settings",
      ],
    ],
  },
};
