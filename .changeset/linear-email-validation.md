---
"@vicacha-devs/strapi-plugin-bookings": patch
"@vicacha-devs/strapi-plugin-certificates": patch
"@vicacha-devs/strapi-plugin-events": patch
"@vicacha-devs/strapi-plugin-inbox": patch
"@vicacha-devs/strapi-plugin-resources": patch
"@vicacha-devs/strapi-plugin-sitemap": patch
---

Use shared linear-time helpers (`isValidEmail`, `slugify`, `stripTrailingSlashes`) instead of per-plugin regexes that backtrack on long inputs.
