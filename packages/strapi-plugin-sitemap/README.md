# `@vicacha-devs/strapi-plugin-sitemap`

XML Sitemap and Sitemap Index generator for Strapi v5 with multilingual (`i18n`) support, collection & plugin content-type URL patterns, custom static URLs, image sitemap tags (`xmlns:image`), and excluded path rules.

## Public Endpoints

- `GET /api/sitemap/sitemap.xml` — Main XML sitemap (or `<sitemapindex>` when Sitemap Index mode is enabled)
- `GET /api/sitemap/sitemap-:slug.xml` — Individual named XML sitemap when Sitemap Index mode is enabled

## Migrating from `strapi-5-sitemap-plugin`

This package uses the plugin id `sitemap` instead of `strapi-5-sitemap-plugin`, so:

- Public URLs change from `/api/strapi-5-sitemap-plugin/sitemap.xml` to `/api/sitemap/sitemap.xml`. Update any `robots.txt` entries, Search Console submissions and public-role permissions.
- Settings are stored in new tables (`sitemap-*` content types). Settings saved by the old plugin are not migrated, so re-enter them in **Settings → Sitemap**.

## Development

```bash
pnpm --filter @vicacha-devs/strapi-plugin-sitemap test
```
