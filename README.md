# `@vicacha-devs/strapi-v5-extensions`

Enterprise **pnpm + Turborepo + Changesets** monorepo for Strapi v5 plugins and extensions, modeled after [`frameless/strapi-v5-extensions`](https://github.com/frameless/strapi-v5-extensions).

---

## Workspace Structure

```text
strapi-v5-extensions/
├── .changeset/                         # Changesets versioning & release configuration
├── apps/
│   └── dashboard/                      # @vicacha-devs/dashboard — Strapi v5 host app wiring all workspace plugins
├── packages/
│   ├── eslint-config/                  # @vicacha-devs/eslint-config — Shared ESLint rules (enforces max-lines < 500)
│   ├── typescript-config/              # @vicacha-devs/typescript-config — Shared base, strapi-admin & strapi-server tsconfigs
│   ├── strapi-plugin-bookings/         # @vicacha-devs/strapi-plugin-bookings — Resources, time slots & appointment reservations
│   ├── strapi-plugin-broadcasts/       # @vicacha-devs/strapi-plugin-broadcasts — Omnichannel WhatsApp/Telegram/Email broadcasts
│   ├── strapi-plugin-calendar/         # @vicacha-devs/strapi-plugin-calendar — FullCalendar v6 multi-source scheduling engine
│   ├── strapi-plugin-certificates/     # @vicacha-devs/strapi-plugin-certificates — Ed25519 digital signing & QR verification
│   ├── strapi-plugin-donations/        # @vicacha-devs/strapi-plugin-donations — Campaigns, pledges, utility bills & calculators
│   ├── strapi-plugin-events/           # @vicacha-devs/strapi-plugin-events — Events, spotlights, RRULE, RSVP/Waitlist & check-in
│   ├── strapi-plugin-inbox/            # @vicacha-devs/strapi-plugin-inbox — Visual form builder, service-desk inbox & alert banners
│   ├── strapi-plugin-islam/            # @vicacha-devs/strapi-plugin-islam — Salah, Qibla, Hijri/Hilal, Quran/Hadith & Zakat suite
│   ├── strapi-plugin-media-feeds/      # @vicacha-devs/strapi-plugin-media-feeds — Audio/video archive, YouTube sync & Podcast RSS 2.0
│   ├── strapi-plugin-resources/        # @vicacha-devs/strapi-plugin-resources — Publications library, photo galleries & glossary
│   └── strapi-plugin-seo/              # @vicacha-devs/strapi-plugin-seo — Strapi v5 SEO metadata, social previews & SERP analyzer
├── package.json                        # Monorepo root scripts (build, dev, test, test:ts, verify, release)
├── pnpm-workspace.yaml                 # Workspace globs + hoistPattern: ["*", "!@strapi/*"]
└── turbo.json                          # Turborepo task pipeline & dependency graph
```

---

## Included Strapi v5 Plugins (11 Packages)

| Package | Strapi Plugin ID | Summary |
| :--- | :--- | :--- |
| [`@vicacha-devs/strapi-plugin-calendar`](./packages/strapi-plugin-calendar) | `calendar` | Universal FullCalendar v6 engine (5 views, 79 locales, RTL/LTR auto-direction, CLDR Hijri/Hebrew/Persian secondary calendars, RFC 5545 RRULE custom field, `.ics` feeds) |
| [`@vicacha-devs/strapi-plugin-events`](./packages/strapi-plugin-events) | `events` | Event lifecycle (`plugin::events.event`, `plugin::events.registration`), RSVP capacity, automatic FIFO waitlist promotion, corner spotlights, and attendee check-in |
| [`@vicacha-devs/strapi-plugin-bookings`](./packages/strapi-plugin-bookings) | `bookings` | Bookable resources (`plugin::bookings.resource`), interval/window slot availability, and token-verified reservations (`plugin::bookings.booking`) |
| [`@vicacha-devs/strapi-plugin-certificates`](./packages/strapi-plugin-certificates) | `certificates` | Official credential templates (`plugin::certificates.template`), Ed25519 cryptographic signing (`plugin::certificates.certificate`), printable HTML/PDF, and public serial verification |
| [`@vicacha-devs/strapi-plugin-donations`](./packages/strapi-plugin-donations) | `donations` | Crowdfunding campaigns (`plugin::donations.campaign`), donor pledges (`plugin::donations.pledge`), utility invoice sponsorship, commodity threshold calculator, and certificate bridge |
| [`@vicacha-devs/strapi-plugin-inbox`](./packages/strapi-plugin-inbox) | `inbox` | Visual form builder (`plugin::inbox.form`), service-desk casework (`plugin::inbox.submission`), double opt-in subscribers (`plugin::inbox.subscriber`), and alert banners (`plugin::inbox.alert-banner`) |
| [`@vicacha-devs/strapi-plugin-islam`](./packages/strapi-plugin-islam) | `islam` | Astronomical Salah/Iqamah/Jumu'ah engine, Qibla bearing, Hilal moon-sighting (`plugin::islam.hilal-announcement`), Quran/Hadith/Dua hub (`plugin::islam.scripture-entry`), and Zakat/Nisab calculators |
| [`@vicacha-devs/strapi-plugin-media-feeds`](./packages/strapi-plugin-media-feeds) | `media-feeds` | Multi-language audio/video episodes (`plugin::media-feeds.media-item`, `plugin::media-feeds.media-series`), YouTube/OEmbed enricher, Apple/Spotify Podcast RSS 2.0, and live stream status |
| [`@vicacha-devs/strapi-plugin-broadcasts`](./packages/strapi-plugin-broadcasts) | `broadcasts` | Omnichannel campaigns (`plugin::broadcasts.campaign`), event-driven automation rules (`plugin::broadcasts.automation-rule`), and delivery logs (`plugin::broadcasts.delivery-log`) |
| [`@vicacha-devs/strapi-plugin-resources`](./packages/strapi-plugin-resources) | `resources` | Downloadable publications (`plugin::resources.publication`), photo gallery albums (`plugin::resources.gallery-album`), and bilingual/phonetic glossary (`plugin::resources.glossary-term`) |
| [`@vicacha-devs/strapi-plugin-seo`](./packages/strapi-plugin-seo) | `seo` | SEO component management, meta/Open Graph social previews, structured data, and keyword density analysis with `ar`, `en`, `es`, `fr`, `pt-BR`, and `tr` translations |

---

## Key Architectural Conventions

1. **Strapi Peer Isolation (`pnpm-workspace.yaml`)**:
   Uses `hoistPattern: ["*", "!@strapi/*"]` so `@strapi/*` packages are never hoisted across workspace boundaries, preventing duplicate context or peer dependency collisions during `strapi-plugin build` and `strapi develop`.
2. **Strict Modularity (`< 500` lines per file)**:
   Every file in the monorepo is strictly `< 500` lines, enforced via `@vicacha-devs/eslint-config`.
3. **Strict TypeScript (`tsc --noEmit`)**:
   Every plugin validates both its Admin (`admin/tsconfig.json`) and Server (`server/tsconfig.json`) bundles against `@vicacha-devs/typescript-config` with zero `any` leaks in implementation code.
4. **Multilingual Admin i18n Parity (`en`, `es`, `ar`, `tr`, +6 locales)**:
   Every `@vicacha-devs` plugin ships with verified translation parity across `en`, `es`, `ar`, `tr`, `fr`, `de`, `pt`, `it`, `nl`, `pl`, `id`, `ur`, and `zh`.

---

## Commands

```bash
# Install all workspace dependencies
pnpm install

# Build all plugins and apps via Turborepo
pnpm build

# Run unit test suites across all workspace packages
pnpm test

# Run strict TypeScript checks (Admin + Server) across all packages
pnpm test:ts

# Verify all Strapi plugins with @strapi/sdk-plugin
pnpm verify

# Start watch mode for all plugins + Strapi v5 dashboard
pnpm dev

# Create a changeset for versioning & publishing
pnpm changeset
```
