# `@vicacha-devs/strapi-plugin-sitemap`

XML Sitemap and Sitemap Index generator for Strapi v5 with multilingual (`i18n`) support, collection & plugin content-type URL patterns, custom static URLs, image sitemap tags (`xmlns:image`), and excluded path rules.

## Public Endpoints

- `GET /api/sitemap/sitemap.xml` — Main XML sitemap (or `<sitemapindex>` when Sitemap Index mode is enabled)
- `GET /api/sitemap/sitemap-:slug.xml` — Individual named XML sitemap when Sitemap Index mode is enabled

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
pnpm --filter @vicacha-devs/strapi-plugin-sitemap test
```
