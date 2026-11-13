---
title: Tooling, CI & Release Workflow
description: How oxfmt, oxlint, ESLint v10, Husky, Commitlint, publint, and Semantic Release power the @vicacha-devs monorepo.
---

## Developer Tooling Stack

The monorepo uses a fast, modern Rust + TypeScript quality toolchain modeled after `@vicacha-devs/astro-tiptap-blocks`:

| Tool                    | Config File                             | Command                             | Purpose                                                                                                                |
| :---------------------- | :-------------------------------------- | :---------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **Oxfmt**               | `.oxfmtrc.json`                         | `pnpm format` / `pnpm format:check` | Sub-second formatting & import sorting across all workspace files                                                      |
| **Oxlint**              | `.oxlintrc.json`                        | `pnpm lint:oxc`                     | Fast static analysis (`typescript`, `unicorn`, `oxc`, `import` plugins)                                                |
| **ESLint v10**          | `eslint.config.ts`                      | `pnpm lint:eslint`                  | Flat config enforcing `max-lines: 500`, `sonarjs`, `jsx-a11y`, and JSON validation                                     |
| **TypeScript 5.9**      | `tsconfig.json`                         | `pnpm check`                        | Strict `tsc --noEmit` across both `admin/tsconfig.json` and `server/tsconfig.json`                                     |
| **Strapi SDK**          | `package.json`                          | `pnpm verify:sdk`                   | Runs `strapi-plugin verify` across all 15 plugins                                                                      |
| **Publint**             | `scripts/publint-all.ts`                | `pnpm publint`                      | Packs each plugin with `pnpm` and enforces `publint({ strict: true })`                                                 |
| **Husky + lint-staged** | `.husky/*`, `.lintstagedrc.json`        | Git hooks                           | Runs `commitlint` on `commit-msg`, `lint-staged` on `pre-commit`, and `lint + check + test` on `pre-push`              |
| **Semantic Release**    | `.releaserc.json`, `scripts/release.ts` | `pnpm release` / `pnpm release:dry` | Per-package conventional-commit version calculation, changelog generation, and `pnpm publish` with npm OIDC provenance |

---

## Commit Message Convention (`commitlint.config.ts`)

All commits must follow **Conventional Commits** (`type(scope): subject`), with an optional `[TICKET-123]` prefix:

```text
feat(calendar): add RFC 5545 EXDATE exception date editor
fix(certificates): enforce constant-time token comparison on QR verification
[MOSQUE-42] feat(islam): sync confirmed Hilal offset to calendar plugin
docs(events): add RSVP waitlist promotion sequence diagram
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

---

## How to Use & Navigate the Documentation Portal

Every plugin in the `@vicacha-devs` suite is documented through four complementary layers:

1. **Overview (`/<plugin-slug>/`)**: Synchronized directly from `packages/<dir>/README.md` with quick-install snippets, feature tables, and high-resolution Playwright captures of the Strapi v5 Admin workspace and Settings panel.
2. **Content Types & Use Cases (`/<plugin-slug>/use-cases/`)**: Plugin-by-plugin Content-Type entity directory (`strapi.documents`), Strapi v5 Admin locations, interactive **Pele** (`https://pele.run/`) SVG Mermaid architecture & workflow diagrams, and real Strapi v5 screenshots for each use case.
3. **Developer Guide & Admin UI Tour (`/<plugin-slug>/guide/`)**: Deep-dive architectural reference detailing Content-Type UIDs (`schema.json` attributes), Admin UI translation coverage across 13 locales, TypeScript service & custom field integration examples, and a full endpoint summary table.
4. **Interactive OpenAPI 3.0.3 Reference (`/<plugin-slug>/api/`)**: Generated automatically by `scripts/generate-openapi.ts` from each plugin's `server/src/routes/index.ts` and `content-types/*/schema.json`, complete with request/response schemas and `bearerAuth` security definitions.
5. **AI / LLM Context Index (`/llms.txt` & `/llms-full.txt`)**: Generated at build time via `starlight-llms-txt` so AI coding assistants (Cursor, Windsurf, Claude Code, Antigravity) can ingest the entire monorepo documentation in a single request.
6. **Quadrilingual Switcher (`/`, `/es/`, `/ar/`, `/tr/`)**: Use the top-right language selector to switch between English, Español, العربية (with native `dir="rtl"` layout), and Türkçe.

---

## Documentation Build & Adversarial Verification

The documentation site in `apps/docs` automatically synchronizes with the plugin packages on every build:

```bash
# Start interactive local development server at http://localhost:4321
pnpm --filter @vicacha-devs/docs dev

# 1. Generate OpenAPI 3.0.3 YAML schemas from all 17 plugins' server routes & content-types
pnpm --filter @vicacha-devs/docs generate:openapi

# 2. Sync package README.md files + generate localized (en, es, ar, tr) Overview & Guide pages
pnpm --filter @vicacha-devs/docs sync:readmes

# 3. Capture fresh 1440x900 Strapi v5 Admin screenshots via Playwright
pnpm --filter @vicacha-devs/docs capture:screenshots

# 4. Build the static multi-locale Starlight site (EN, ES, AR, TR + Pagefind + llms.txt)
pnpm --filter @vicacha-devs/docs build

# 5. Run the 5 Adversarial Judges (Modularity <=500 lines, Completeness, 4-Locale i18n/RTL, Visual/Links, Security)
pnpm --filter @vicacha-devs/docs test:judges
```

---

## Adding or Updating a Plugin in `apps/docs`

1. **Register the package** in `apps/docs/docs-packages.ts` with its `slug`, `dir`, `npmName`, `pluginId`, `label`, `category`, `schemaFile`, `screenshot`, `settingsScreenshot`, and localized `summary` (`en`, `es`, `ar`, `tr`).
2. **Document Content-Type entities & use cases** in `apps/docs/scripts/lib/plugin-use-cases.ts` so `sync-readmes.ts` and `capture-screenshots.ts` include full Strapi v5 entity paths, workflows, and screenshots.
3. **Run `pnpm --filter @vicacha-devs/docs build && pnpm --filter @vicacha-devs/docs test:judges`** to generate the OpenAPI spec, sync all 4 locales, and verify all 5 adversarial judges pass.
