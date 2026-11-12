---
"@vicacha-devs/strapi-plugin-bookings": patch
"@vicacha-devs/strapi-plugin-broadcasts": patch
"@vicacha-devs/strapi-plugin-calendar": patch
"@vicacha-devs/strapi-plugin-certificates": patch
"@vicacha-devs/strapi-plugin-donations": patch
"@vicacha-devs/strapi-plugin-events": patch
"@vicacha-devs/strapi-plugin-global-search": patch
"@vicacha-devs/strapi-plugin-inbox": patch
"@vicacha-devs/strapi-plugin-islam": patch
"@vicacha-devs/strapi-plugin-media-feeds": patch
"@vicacha-devs/strapi-plugin-notes": patch
"@vicacha-devs/strapi-plugin-resources": patch
"@vicacha-devs/strapi-plugin-seo": patch
"@vicacha-devs/strapi-plugin-sitemap": patch
---

Security and consistency hardening: plugins now share prototype-pollution guards, output escapers (HTML, XML, CSV formula-injection, iCalendar), a bounded rate limiter, CSPRNG reference codes, a rich-text normalizer and the calendar registry from `@vicacha-devs/plugin-shared`, with tighter admin/content-api route checks and new security tests.
