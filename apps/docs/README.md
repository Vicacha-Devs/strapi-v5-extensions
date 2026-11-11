# `@vicacha-devs/docs`

Starlight documentation site and OpenAPI reference for the workspace plugins.
Content under `src/content/docs` and `schemas/` is generated from the plugin
packages by `scripts/sync-readmes.ts` and `scripts/generate-openapi.ts`, which
run as part of `pnpm build`.

```bash
pnpm docs:dev      # generate + astro dev server on 127.0.0.1
pnpm docs:build    # generate + static build into apps/docs/dist
pnpm docs:preview  # serve the built site locally
```

## Deployment (GitHub Pages)

`.github/workflows/docs.yml` builds the site on every pull request that touches
`apps/docs/**` or `packages/**` (typecheck + build, no deploy) and deploys it to
GitHub Pages on pushes to `main`.

One-time repository setup: **Settings → Pages → Build and deployment → Source:
GitHub Actions**.

The site is served from `/` on the custom domain
`https://strapi-extensions.vicacha.dev` (point a `CNAME` DNS record at
`vicacha-devs.github.io` and set the custom domain in Settings → Pages). To serve
the project URL instead, set these repository variables (Settings → Secrets and
variables → Actions → Variables):

| Variable    | Value                           |
| ----------- | ------------------------------- |
| `DOCS_SITE` | `https://vicacha-devs.github.io` |
| `DOCS_BASE` | `/strapi-v5-extensions`          |

The same variables work locally, e.g.
`DOCS_SITE=https://vicacha-devs.github.io DOCS_BASE=/strapi-v5-extensions pnpm docs:build`.
`src/plugins/rehype-base-links.ts` and `src/route-middleware.ts` prefix
root-relative content links and landing-page hero buttons with the base path.
