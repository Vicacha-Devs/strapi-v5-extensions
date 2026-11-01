# `@vicacha-devs/strapi-plugin-sitemap`

XML Sitemap and Sitemap Index generator for Strapi v5 with automatic multilingual (`i18n` + `xhtml:link` `hreflang`) alternates, collection & plugin content-type URL patterns, nested relation and component placeholders, Google Image Sitemap (`xmlns:image`) support, custom static URLs, and excluded path rules.

## Key Features

- **Dynamic Collection & Plugin Content-Type URL Patterns**: Map any visible `api::*` or `plugin::*` collection type to custom URL patterns such as `/[locale]/articles/[category.slug]/[slug]`.
- **Automatic `xhtml:link` `hreflang` Alternates**: Automatically links localized Strapi v5 documents sharing the same `documentId` with `<xhtml:link rel="alternate" hreflang="..." href="..." />` (`xmlns:xhtml="http://www.w3.org/1999/xhtml"`).
- **Sitemap Index & Multi-File Sub-Sitemaps**: Serve either a single `<urlset>` at `/api/sitemap/sitemap.xml` or a master `<sitemapindex>` referencing dedicated sub-sitemaps at `/api/sitemap/sitemap-:slug.xml`.
- **Google Image Sitemap (`xmlns:image`)**: Include `<image:image><image:loc>...</image:loc><image:title>...</image:title></image:image>` tags from media fields, automatically resolving relative `/uploads/...` URLs against `baseUrl` and falling back to document titles when media names are empty.
- **Static Custom URLs & Excluded Paths**: Combine static frontend routes (`/about`, `/es/contact`) with dynamic CMS entries while filtering out excluded paths.
- **Unified Settings Persistence**: Synchronizes configuration across Strapi's internal `plugin::sitemap.sitemap-option`, `plugin::sitemap.sitemap-content-type`, and `plugin::sitemap.sitemap-content-type-single-url` entities via `GET / PUT /sitemap/settings`.

## Installation & Configuration

Enable the plugin in `config/plugins.ts` (or `config/plugins.js`):

```ts
export default ({ env }) => ({
  sitemap: {
    enabled: true,
    config: {
      // Optional fallback base URL when baseUrl is not yet set in the Admin UI
      hostname: env("PUBLIC_SITE_URL", "https://example.com"),
      // Emit <xhtml:link rel="alternate" hreflang="..." /> across localized documents (default: true)
      includeHreflang: true,
    },
  },
});
```

## Public Endpoints (Content API)

- `GET /api/sitemap/sitemap.xml` — Main XML sitemap (`<urlset>`) or `<sitemapindex>` when Sitemap Index mode is enabled (`auth: false`).
- `GET /api/sitemap/sitemap-:slug.xml` — Named sub-sitemap (`<urlset>`) for a specific sitemap definition slug when Sitemap Index mode is enabled (`auth: false`).

## Admin Endpoints

- `GET /sitemap/settings` — Retrieve unified sitemap settings (`baseUrl`, `collectionTypes`, `customURLs`, `excludedUrls`, `useSitemapIndex`, `sitemaps`).
- `PUT /sitemap/settings` — Update and synchronize unified sitemap settings across all internal sitemap tables.
- `GET /sitemap/content-types` — List visible `api::*` and `plugin::*` collection types available for URL pattern mapping.
- `GET /sitemap/locales` — List configured Strapi `i18n` locale codes.
- `GET /sitemap/allowed-fields?singularName=<type>&populateLinkedModels=<bool>` — Inspect scalar, component, media (`mediaFields`), and first-level relation fields (`allowedFields`) for pattern interpolation.

## URL Pattern Placeholders

Patterns use bracket notation (`[field]`) and support:

- **Top-level scalar fields**: `[id]`, `[slug]`, `[title]`
- **Locale placeholder**: `[locale]` (automatically falls back to the entry's configured `langcode` if the document does not carry a `locale` property)
- **Component & nested relation fields**: `[meta.canonical]`, `[category.slug]`, `[department.category.slug]` (when `populateLinkedModels` is enabled)

## Admin Settings UI (`/admin/settings/sitemap` — 4 Tabs)

Navigate to **Settings → Sitemap → Configuration** (`/admin/settings/sitemap`) in the Strapi v5 Admin panel:

1. **General & Sitemap Index** (`/screenshots/sitemap-settings.png`): Configure the canonical **Base URL**, toggle **Use sitemap index with multiple sitemaps** (`When enabled, sitemap.xml becomes the index; each entry below generates sitemap-{name}.xml.`), review the public permission notice (`getSitemapBySlug in Users & Permissions → Public → Sitemap`), and manage named sub-sitemaps (`pages`, `editorial-and-library`, `events-and-liturgy`).
2. **Collection Types** (`/screenshots/sitemap-admin.png`): Bind localized `api::*` and `plugin::*` collection types (`type` + `langcode`) to dynamic URL patterns (`/[locale]/articles/[slug]`), `priority`, `frequency`, `lastModified`, and `thumbnail` media fields.
3. **Custom URLs** (`/screenshots/sitemap-content-manager.png`): Add, edit, or delete static frontend route entries (`/es`, `/es/about-us`, `/en/about-us`) with per-route priority and frequency.
4. **Excluded URLs** (`/screenshots/sitemap-excluded-urls.png`): Exclude internal or non-indexable route prefixes (`/admin`, `/api`, `/404`) from all generated XML sitemaps.

![XML Sitemap & Hreflang — Excluded URLs Tab](/screenshots/sitemap-excluded-urls.png)

## Permissions

The sitemap endpoints are public routes. In **Settings → Users & Permissions → Roles → Public**, enable the `Sitemap` plugin actions: `getSitemap` (required) and `getSitemapBySlug` (only for Sitemap Index mode).

## Configuration

Configure everything in **Settings → Sitemap**:

- **Base URL** — prefixed to every generated URL (e.g. `https://example.com`).
- **Collection types** — one entry per content type: URL pattern, language code, priority, change frequency, optional `lastmod` (from `updatedAt`) and an optional media field used as the image thumbnail. Only published entries are included.
- **Custom URLs** — static paths with their own priority and change frequency.
- **Excluded URLs** — paths removed from the output (matched on the URL path, with or without a leading or trailing slash).
- **Sitemap Index** — when enabled, `sitemap.xml` returns a `<sitemapindex>` linking to the named sitemaps you define. Each named sitemap selects which collection-type entries it contains and whether custom URLs are included.

### URL patterns

Patterns use `[field]` placeholders filled from each entry:

| Pattern | Result |
| --- | --- |
| `/blog/[slug]` | `/blog/my-post` |
| `/[category.slug]/[slug]` | `/news/my-post` (relation fields; enable **Populate linked models**) |

- An entry is skipped when a plain placeholder (e.g. `[slug]`) has no value.
- A relation placeholder (e.g. `[category.slug]`) with no value is dropped from the URL instead.
- Repeated slashes are collapsed.

### Multilingual (i18n)

Set the language code of a collection-type entry to a locale (e.g. `es`) to list that locale's published entries, or `-` to not filter by locale. Add one entry per locale to cover several languages.

## Migrating from `strapi-5-sitemap-plugin`

This package uses the plugin id `sitemap` instead of `strapi-5-sitemap-plugin`, so:

- Public URLs change from `/api/strapi-5-sitemap-plugin/sitemap.xml` to `/api/sitemap/sitemap.xml`. Update any `robots.txt` entries, Search Console submissions and public-role permissions.
- Settings are stored in new tables (`sitemap-*` content types). Settings saved by the old plugin are not migrated, so re-enter them in **Settings → Sitemap**.

## Development

```bash
pnpm --filter @vicacha-devs/strapi-plugin-sitemap test   # builds first, then runs node:test
```
