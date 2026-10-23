## Summary

<!-- Describe the changes introduced in this Pull Request and why they are needed. -->

## Related Issue(s)

- Closes #

## Affected Package(s)

- [ ] `@vicacha-devs/strapi-plugin-bookings`
- [ ] `@vicacha-devs/strapi-plugin-broadcasts`
- [ ] `@vicacha-devs/strapi-plugin-calendar`
- [ ] `@vicacha-devs/strapi-plugin-certificates`
- [ ] `@vicacha-devs/strapi-plugin-donations`
- [ ] `@vicacha-devs/strapi-plugin-events`
- [ ] `@vicacha-devs/strapi-plugin-inbox`
- [ ] `@vicacha-devs/strapi-plugin-islam`
- [ ] `@vicacha-devs/strapi-plugin-media-feeds`
- [ ] `@vicacha-devs/strapi-plugin-resources`
- [ ] `@vicacha-devs/dashboard` (Strapi v5 Sandbox App)
- [ ] `@vicacha-devs/eslint-config` / `@vicacha-devs/typescript-config`

## Type of Change

- [ ] `feat`: New plugin feature, admin component, content-type, or API endpoint
- [ ] `fix`: Bug fix in server or admin package
- [ ] `refactor`: Code restructuring / modularity improvement
- [ ] `docs`: README or inline documentation update
- [ ] `test`: Unit or integration tests (Vitest + Testing Library)
- [ ] `build` / `ci` / `chore`: Build pipeline, Turborepo, or Changesets update

## Strapi v5 Plugin Verification Checklist

- [ ] **Build & SDK Verify**: `pnpm build` and `pnpm --filter <plugin> verify` (`strapi-plugin verify`) pass with 0 errors
- [ ] **Dual TypeScript Check**: `pnpm test:ts` passes for both `admin/tsconfig.json` and `server/tsconfig.json`
- [ ] **Unit Tests**: `pnpm test` passes across all affected packages
- [ ] **500-Line Modularity Rule**: No source file exceeds **500 lines**
- [ ] **10-Locale Admin i18n Parity**: Any new admin UI translation keys are added across all 10 supported locales (`en`, `es`, `fr`, `de`, `pt`, `it`, `nl`, `pl`, `tr`, `ar`)
- [ ] **Strapi v5 Document Service**: Server queries use `strapi.documents('plugin::...')` (no legacy v4 `strapi.entityService`)
- [ ] **Changeset Included**: Ran `pnpm changeset` if this PR introduces user-facing package changes

## How to Test in Sandbox (`apps/dashboard`)

1. Run `pnpm build && pnpm --filter @vicacha-devs/dashboard develop`
2. 
3. 
