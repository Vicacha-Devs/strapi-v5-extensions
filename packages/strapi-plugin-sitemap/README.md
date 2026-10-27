# `@vicacha-devs/strapi-plugin-sitemap`

XML Sitemap and Sitemap Index generator for Strapi v5 with multilingual (`i18n`) support, collection & plugin content-type URL patterns, custom static URLs, image sitemap tags (`xmlns:image`), and excluded path rules.

## Public Endpoints

- `GET /api/sitemap/sitemap.xml` — Main XML sitemap (or `<sitemapindex>` when Sitemap Index mode is enabled)
- `GET /api/sitemap/sitemap-:slug.xml` — Individual named XML sitemap when Sitemap Index mode is enabled
