---
title: Monorepo Architecture
description: Deep dive into the pnpm + Turborepo workspace layout, Strapi v5 dual-bundle compilation, and strict 500-line file modularity.
---

## Workspace Layout

The `strapi-v5-extensions` repository is organized as a **pnpm + Turborepo** monorepo containing two applications (`apps/dashboard` and `apps/docs`), shared configuration/utility packages, and 15 publishable Strapi v5 plugins:

```text
strapi-v5-extensions/
├── apps/
│   ├── dashboard/                      # @vicacha-devs/dashboard — Strapi v5 host app (SQLite + all 15 plugins)
│   └── docs/                           # @vicacha-devs/docs — Astro Starlight documentation & OpenAPI portal
├── packages/
│   ├── eslint-config/                  # @vicacha-devs/eslint-config — Shared ESLint rules (max-lines <= 500)
│   ├── plugin-shared/                  # @vicacha-devs/plugin-shared — Shared i18n, locale & validation utilities
│   ├── typescript-config/              # @vicacha-devs/typescript-config — Shared Admin & Server tsconfigs
│   └── strapi-plugin-*/                # 17 publishable @vicacha-devs/strapi-plugin-* packages
├── scripts/
│   ├── ensure-dist-types.ts            # Stubs missing entry .d.ts files so strapi-plugin verify passes
│   ├── publint-all.ts                  # Strict publint validation across all 17 plugins
│   └── release.ts                      # Per-package semantic-release & pnpm publish orchestrator
├── pnpm-workspace.yaml                 # Peer isolation & workspace linking rules
└── turbo.json                          # Dependency-aware task pipeline
```

---

## Strapi Peer Isolation (`pnpm-workspace.yaml`)

Strapi v5 plugins rely on singleton contexts (`@strapi/strapi`, `@strapi/admin`, `@strapi/design-system`, `react`, `react-dom`, `react-router-dom`, `styled-components`). In [`pnpm-workspace.yaml`](https://github.com/Vicacha-Devs/strapi-v5-extensions/blob/main/pnpm-workspace.yaml), we enforce two critical rules:

1. **`hoistPattern: ["*", "!@strapi/*"]`**: Prevents `@strapi/*` packages from being hoisted into the root `node_modules/.pnpm` virtual store across workspace boundaries, avoiding duplicate React context crashes during `strapi-plugin build` and `strapi develop`.
2. **`linkWorkspacePackages: true`**: Ensures inter-plugin peer dependencies (such as `@vicacha-devs/strapi-plugin-events` depending on `@vicacha-devs/strapi-plugin-calendar`) resolve directly to the local workspace package during development and CI.

---

## Dual-Bundle Plugin Anatomy (`admin` + `server` + `shared`)

Every plugin in `packages/strapi-plugin-*/` follows the official `@strapi/sdk-plugin` v5 structure with an additional `./shared` subpath export for isomorphic TypeScript types and pure engines:

| Directory     | Subpath Export    | Runtime Environment         | Responsibility                                                                                                        |
| :------------ | :---------------- | :-------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| `admin/src/`  | `./strapi-admin`  | Browser (Vite / React 18)   | Registers Admin menu links, Settings pages, Custom Fields, Content Manager panels, and 13-locale translation bundles  |
| `server/src/` | `./strapi-server` | Node.js >= 20 (Strapi v5)   | Registers Content-Types, Controllers, Services, Lifecycles, Middlewares, Policies, and `content-api` + `admin` Routes |
| `shared/`     | `./shared`        | Isomorphic (Node + Browser) | Pure TypeScript engines (RRULE expansion, slot availability, Hijri/CLDR date formatting, iCal/CSV serialization)      |

### Post-Build ESM & Declaration Guarantee

When `strapi-plugin build` finishes, `scripts/ensure-esm-dist.ts` runs automatically to:

1. Copy `.mjs` bundles to `.js` under `{"type": "module"}` so Node's native ESM resolver resolves both `.mjs` and `.js` entrypoints seamlessly.
2. Verify and emit any missing top-level `.d.ts` entrypoints (`./dist/server/src/index.d.ts`, `./dist/admin/src/index.d.ts`, `./dist/shared/index.d.ts`) so every plugin passes `publint` with `strict: true`.

---

## Strict 500-Line Modularity Rule

Every source file, test file, script, and documentation file in the monorepo is strictly capped at **500 lines** (`max-lines: 500` in `eslint.config.ts` and verified by Judge 1 in `apps/docs/scripts/adversarial-judges.ts`).

This architectural constraint guarantees:

- **Focused Responsibility**: Controllers delegate business logic to dedicated service modules and pure helper engines in `shared/`.
- **Testable Pure Functions**: Astronomical calculations (`islam`), Ed25519 signing (`certificates`), slot generation (`bookings`), and iCal/CSV serialization (`calendar`, `events`) live in standalone modules tested directly via Node's native test runner.
- **Maintainable React Workspaces**: Admin pages split modals, tables, and toolbars into composable sub-components under `admin/src/components/`.
