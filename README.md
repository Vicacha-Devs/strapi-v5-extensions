# `@vicacha-devs/strapi-v5-extensions`

Enterprise **pnpm + Turborepo + Semantic Release** monorepo for Strapi v5 plugins and extensions, modeled after [`frameless/strapi-v5-extensions`](https://github.com/frameless/strapi-v5-extensions).

---

## Workspace Structure

```text
strapi-v5-extensions/
├── .github/workflows/                  # CI (ci.yml) & automated npm release (npm-release.yml)
├── .husky/                             # Git hooks (commit-msg, pre-commit, pre-push)
├── apps/
│   └── dashboard/                      # @vicacha-devs/dashboard — Strapi v5 host app wiring all workspace plugins
├── packages/
│   ├── eslint-config/                  # @vicacha-devs/eslint-config — Shared ESLint rules (enforces max-lines <= 500)
│   ├── typescript-config/              # @vicacha-devs/typescript-config — Shared base, strapi-admin & strapi-server tsconfigs
│   ├── strapi-plugin-bookings/         # @vicacha-devs/strapi-plugin-bookings — Resources, time slots & appointment reservations
│   ├── strapi-plugin-broadcasts/       # @vicacha-devs/strapi-plugin-broadcasts — Omnichannel WhatsApp/Telegram/Email broadcasts
│   ├── strapi-plugin-calendar/         # @vicacha-devs/strapi-plugin-calendar — FullCalendar v6 multi-source scheduling engine
│   ├── strapi-plugin-certificates/     # @vicacha-devs/strapi-plugin-certificates — Ed25519 digital signing & QR verification
│   ├── strapi-plugin-donations/        # @vicacha-devs/strapi-plugin-donations — Campaigns, pledges, utility bills & calculators
│   ├── strapi-plugin-events/           # @vicacha-devs/strapi-plugin-events — Events, spotlights, RRULE, RSVP/Waitlist & check-in
│   ├── strapi-plugin-global-search/    # @vicacha-devs/strapi-plugin-global-search — Command-palette global search across content types
│   ├── strapi-plugin-inbox/            # @vicacha-devs/strapi-plugin-inbox — Visual form builder, service-desk inbox & alert banners
│   ├── strapi-plugin-islam/            # @vicacha-devs/strapi-plugin-islam — Salah, Qibla, Hijri/Hilal, Quran/Hadith & Zakat suite
│   ├── strapi-plugin-media-feeds/      # @vicacha-devs/strapi-plugin-media-feeds — Audio/video archive, YouTube sync & Podcast RSS 2.0
│   ├── strapi-plugin-notes/            # @vicacha-devs/strapi-plugin-notes — Polymorphic editorial notes, pins & activity logs
│   ├── strapi-plugin-resources/        # @vicacha-devs/strapi-plugin-resources — Publications library, photo galleries & glossary
│   ├── strapi-plugin-seo/              # @vicacha-devs/strapi-plugin-seo — Strapi v5 SEO metadata & SERP analyzer
│   └── strapi-plugin-sitemap/          # @vicacha-devs/strapi-plugin-sitemap — Multilingual XML sitemap & robots.txt generator
├── scripts/
│   ├── ensure-esm-dist.ts              # Ensures dist/package.json ({"type":"module"}) & entry .d.ts files
│   ├── publint-all.ts                  # Strict publint validation across all 14 publishable plugins
│   └── release.ts                      # Monorepo per-package semantic-release & pnpm publish runner
├── commitlint.config.ts                # Conventional Commits + optional [TICKET-123] prefix
├── eslint.config.ts                    # Root ESLint v10 flat configuration
├── .oxfmtrc.json                       # Oxfmt code formatting configuration
├── .oxlintrc.json                      # Oxlint fast static analysis configuration
├── .releaserc.json                     # Semantic Release configuration
├── package.json                        # Monorepo root scripts (format, lint, check, build, publint, verify, release)
├── pnpm-workspace.yaml                 # Workspace globs, linkWorkspacePackages, onlyBuiltDependencies & peerDependencyRules
└── turbo.json                          # Turborepo task pipeline & dependency graph
```

---

## Included Strapi v5 Plugins (14 Packages)

| Package | Strapi Plugin ID | Summary |
| :--- | :--- | :--- |
| [`@vicacha-devs/strapi-plugin-calendar`](./packages/strapi-plugin-calendar) | `calendar` | Unified FullCalendar v6 scheduling workspace (`/admin/plugins/calendar`, 5 views, 79 locales, RTL/LTR auto-direction, CLDR Hijri/Hebrew/Persian secondary calendars, RFC 5545 RRULE custom field, `.ics` feeds). Required dependency of `events` and `bookings`. |
| [`@vicacha-devs/strapi-plugin-events`](./packages/strapi-plugin-events) | `events` | Event lifecycle (`plugin::events.event`, `plugin::events.registration`), dedicated RSVP, Waitlist Auto-Promotion & Attendee Check-In Workspace (`/admin/plugins/events`), corner spotlights, and automatic source registration into `calendar` |
| [`@vicacha-devs/strapi-plugin-bookings`](./packages/strapi-plugin-bookings) | `bookings` | Bookable resources (`plugin::bookings.resource`), interval/window slot availability, token-verified reservations (`plugin::bookings.booking`), dedicated Reservations Approval & Ledger Workspace (`/admin/plugins/bookings`), and automatic registration into `calendar` |
| [`@vicacha-devs/strapi-plugin-certificates`](./packages/strapi-plugin-certificates) | `certificates` | Official credential templates (`plugin::certificates.template`), Ed25519 cryptographic signing (`plugin::certificates.certificate`), printable HTML/PDF, and public serial verification |
| [`@vicacha-devs/strapi-plugin-donations`](./packages/strapi-plugin-donations) | `donations` | Crowdfunding campaigns (`plugin::donations.campaign`), donor pledges (`plugin::donations.pledge`), utility invoice sponsorship, commodity threshold calculator, and certificate bridge |
| [`@vicacha-devs/strapi-plugin-global-search`](./packages/strapi-plugin-global-search) | `global-search` | Instant `Cmd/Ctrl+K` global command-palette search across Strapi v5 content types, fuzzy matching, and recent-item navigation |
| [`@vicacha-devs/strapi-plugin-inbox`](./packages/strapi-plugin-inbox) | `inbox` | Visual form builder (`plugin::inbox.form`), service-desk casework (`plugin::inbox.submission`), double opt-in subscribers (`plugin::inbox.subscriber`), and alert banners (`plugin::inbox.alert-banner`) |
| [`@vicacha-devs/strapi-plugin-islam`](./packages/strapi-plugin-islam) | `islam` | Astronomical Salah/Iqamah/Jumu'ah engine, Qibla bearing, Hilal moon-sighting (`plugin::islam.hilal-announcement`), Quran/Hadith/Dua hub (`plugin::islam.scripture-entry`), and Zakat/Nisab calculators |
| [`@vicacha-devs/strapi-plugin-media-feeds`](./packages/strapi-plugin-media-feeds) | `media-feeds` | Multi-language audio/video episodes (`plugin::media-feeds.media-item`, `plugin::media-feeds.media-series`), YouTube/OEmbed enricher, Apple/Spotify Podcast RSS 2.0, and live stream status |
| [`@vicacha-devs/strapi-plugin-notes`](./packages/strapi-plugin-notes) | `notes` | Polymorphic editorial notes (`plugin::notes.note`), pinned entry annotations, color labels, and content-manager sidebar integration |
| [`@vicacha-devs/strapi-plugin-broadcasts`](./packages/strapi-plugin-broadcasts) | `broadcasts` | Omnichannel campaigns (`plugin::broadcasts.campaign`), event-driven automation rules (`plugin::broadcasts.automation-rule`), and delivery logs (`plugin::broadcasts.delivery-log`) |
| [`@vicacha-devs/strapi-plugin-resources`](./packages/strapi-plugin-resources) | `resources` | Downloadable publications (`plugin::resources.publication`), photo gallery albums (`plugin::resources.gallery-album`), and bilingual/phonetic glossary (`plugin::resources.glossary-term`) |
| [`@vicacha-devs/strapi-plugin-seo`](./packages/strapi-plugin-seo) | `seo` | Strapi v5 SEO component management, meta/social preview, and keyword density analysis with `ar`, `en`, `es`, `fr`, `pt-BR`, and `tr` translations |
| [`@vicacha-devs/strapi-plugin-sitemap`](./packages/strapi-plugin-sitemap) | `sitemap` | Multilingual XML sitemap (`hreflang`), sitemap index, and custom URL management |

---

## Key Architectural Conventions

1. **Workspace Linking & Peer Rules (`pnpm-workspace.yaml`)**:
   Uses `linkWorkspacePackages: true`, `hoistPattern: ["*"]`, `onlyBuiltDependencies`, and `peerDependencyRules` so inter-plugin `@vicacha-devs/*` peer dependencies link locally with consistent `@strapi/*` singleton resolution.
2. **Strict Modularity (`<= 500` lines per file)**:
   Every file in the monorepo is strictly `<= 500` lines, enforced via `eslint.config.ts` and `@vicacha-devs/eslint-config`.
3. **Strict TypeScript (`tsc --noEmit`)**:
   Every plugin validates both its Admin (`admin/tsconfig.json`) and Server (`server/tsconfig.json`) bundles against `@vicacha-devs/typescript-config` with zero `any` leaks in implementation code.
4. **Multilingual Admin i18n Parity (`en`, `es`, `ar`, `tr`, +9 locales)**:
   Every `@vicacha-devs` plugin ships with verified translation parity across `en`, `es`, `ar`, `tr`, `fr`, `de`, `pt`, `it`, `nl`, `pl`, `id`, `ur`, and `zh`.
5. **NPM Package Quality (`publint` + `@strapi/sdk-plugin`)**:
   All 14 plugins are validated with `strapi-plugin verify` and strict `publint` (`pack: "pnpm"`) prior to automated `semantic-release` publishing with npm provenance.

---

## Commands

```bash
# Install all workspace dependencies
pnpm install

# Format and check formatting across the monorepo (oxfmt)
pnpm format
pnpm format:check

# Run static analysis across the monorepo (oxlint + ESLint v10)
pnpm lint
pnpm lint:fix

# Build all 14 Strapi v5 plugins via Turborepo
pnpm build

# Run strict TypeScript checks (Admin + Server) across all packages
pnpm check

# Validate all 14 plugin packages with @strapi/sdk-plugin and strict publint
pnpm verify:sdk
pnpm publint

# Run unit test suites across all workspace packages
pnpm test

# Run the complete verification pipeline (format:check + lint + build + check + verify:sdk + publint + test)
pnpm verify

# Preview per-package semantic-release version bumps and changelogs
pnpm release:dry
```

