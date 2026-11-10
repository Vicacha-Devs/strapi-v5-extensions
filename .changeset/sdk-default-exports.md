---
"@vicacha-devs/strapi-plugin-calendar": patch
"@vicacha-devs/strapi-plugin-certificates": patch
"@vicacha-devs/strapi-plugin-notes": patch
"@vicacha-devs/strapi-plugin-seo": patch
---

Use the Strapi SDK default export layout: ESM in `index.mjs` and CJS in `index.js`, without `"type": "module"` or post-build file renaming.
