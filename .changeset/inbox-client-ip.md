---
"@vicacha-devs/strapi-plugin-inbox": patch
---

Resolve the form submission client IP only from the server-provided `ctx.ip`, no longer falling back to the spoofable `X-Forwarded-For` header when computing rate-limit keys.
