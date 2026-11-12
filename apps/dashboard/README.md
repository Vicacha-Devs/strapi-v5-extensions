# `@vicacha-devs/dashboard`

Strapi v5 host application for developing, testing, and demonstrating all 15 `@vicacha-devs/strapi-v5-extensions` workspace plugins:

- `@vicacha-devs/strapi-plugin-calendar` — FullCalendar v6 multi-source scheduling engine, 79-locale localization, RTL/LTR auto-direction, CLDR/custom secondary calendar overlays, RFC 5545 RRULE engine, and iCal (`.ics`) syndication.
- `@vicacha-devs/strapi-plugin-events` — Event management, RSVP & seat capacity enforcement, automatic waitlist promotion, corner spotlights, attendee check-in, and CSV export.
- `@vicacha-devs/strapi-plugin-bookings` — Bookable resources, time-slot availability calculation, and token-authenticated reservations.
- `@vicacha-devs/strapi-plugin-certificates` — Credential templates, Ed25519 digital signatures, printable HTML/PDF credentials, and public verification.
- `@vicacha-devs/strapi-plugin-donations` — Fundraising campaigns, pledges, utility invoice sponsorship, threshold calculator, and tax certificate issuance.
- `@vicacha-devs/strapi-plugin-inbox` — Visual form builder, service-desk casework inbox, double opt-in subscribers, and site-wide alert banners.
- `@vicacha-devs/strapi-plugin-islam` — Salah/Iqamah calculation engine, Qibla compass, Hilal moon-sighting, Quran/Hadith/Dua explorer, and Zakat calculators.
- `@vicacha-devs/strapi-plugin-media-feeds` — Audio/video archive, YouTube OEmbed enricher, Apple/Spotify Podcast RSS 2.0, and live broadcast status.
- `@vicacha-devs/strapi-plugin-broadcasts` — Omnichannel WhatsApp, Telegram, and Email campaigns with event-driven automation rules.
- `@vicacha-devs/strapi-plugin-notes` — Polymorphic editorial notes, pinned entries, and Content Manager side-panel annotations.
- `@vicacha-devs/strapi-plugin-resources` — Downloadable PDF publications, photo gallery albums, and searchable phonetic glossary.
- `@vicacha-devs/strapi-plugin-global-search` — Spotlight `Cmd/Ctrl+K` command-palette search across all Strapi v5 content types.
- `@vicacha-devs/strapi-plugin-seo` & `@vicacha-devs/strapi-plugin-sitemap` — Multilingual SEO analysis and XML sitemap generation.
- `@vicacha-devs/strapi-plugin-tiptap-editor` — TipTap v3 + Edifice IO WYSIWYG custom field, 49 features, 4 presets, custom components, Canvas image studio, and voice recorder.

## Usage

From the monorepo root:

```bash
# Watch all plugins and run the Strapi v5 dashboard concurrently
pnpm dev
```
