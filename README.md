# `@vicacha-devs/strapi-v5-extensions`

Enterprise **pnpm + Turborepo + Changesets** monorepo for Strapi v5 plugins and extensions, modeled after [`frameless/strapi-v5-extensions`](https://github.com/frameless/strapi-v5-extensions).

---

## Workspace Structure

```text
strapi-v5-extensions/
├── .changeset/                      # Changesets versioning & release configuration
├── apps/
│   └── dashboard/                   # @vicacha-devs/dashboard — Strapi v5 host app wiring all workspace plugins
├── packages/
│   ├── eslint-config/               # @vicacha-devs/eslint-config — Shared ESLint rules (enforces max-lines < 500)
│   ├── typescript-config/           # @vicacha-devs/typescript-config — Shared base, strapi-admin & strapi-server tsconfigs
│   ├── strapi-plugin-calendar/      # @vicacha-devs/strapi-plugin-calendar — FullCalendar v6 multi-source scheduling engine
│   └── strapi-plugin-events/        # @vicacha-devs/strapi-plugin-events — Events, RRULE, RSVP/Waitlist & check-in plugin
├── package.json                     # Monorepo root scripts (build, dev, test, test:ts, verify, release)
├── pnpm-workspace.yaml              # Workspace globs + hoistPattern: ["*", "!@strapi/*"]
└── turbo.json                       # Turborepo task pipeline & dependency graph
```

---

## Included Strapi v5 Plugins

### 1. [`@vicacha-devs/strapi-plugin-calendar`](./packages/strapi-plugin-calendar)
Universal FullCalendar v6 scheduling and calendar visualization engine for any Strapi v5 Content-Type:
- **5 Interactive FullCalendar v6 Views**: Month (`dayGridMonth`), TimeGrid Week (`timeGridWeek`), TimeGrid Day (`timeGridDay`), Agenda List (`listMonth`), and Multi-Month Year (`multiMonthYear`).
- **Full Localization (`@fullcalendar/core/locales-all`)**: 79 locales, live Admin toolbar locale switcher, automatic **RTL (`ar`, `he`, `fa`, `ur`) / LTR** layout switching, configurable `firstDay`, `weekNumbers`, `weekNumberCalculation` (`ISO` | `local`), and `hour24` formatting.
- **Multi-Source Registry**: Aggregates any Strapi v5 collection type (`api::booking.booking`, `api::event.event`, `plugin::events.event`, editorial schedules) with drag-and-drop rescheduling, resize duration updates, and click/drag range quick-create.
- **Secondary & Alternative Calendar Overlays**: Built-in CLDR support (`islamic-umalqura`, `islamic-civil`, `hebrew`, `persian`, `buddhist`, `japanese`, `chinese`, `indian`, `coptic`, `ethiopic`) + custom programmatic date formatters.
- **RFC 5545 RRULE Custom Field (`plugin::calendar.rrule`) & iCal (`.ics`) Feeds**.

### 2. [`@vicacha-devs/strapi-plugin-events`](./packages/strapi-plugin-events)
End-to-end event lifecycle, RSVP capacity, waitlist automation, and attendee management for Strapi v5:
- **Built-in Content-Types**: `plugin::events.event` and `plugin::events.registration` with declarative `schemaExtensions` support.
- **RSVP, Capacity & Automatic Waitlist Promotion**: Seat tracking, party size limits, registration deadlines, token-based cancellation, and automatic FIFO promotion from waitlist when seats open up.
- **Attendee Check-In & CSV Export**: Admin check-in manager and CWE-1236 formula-injection-safe CSV export.
- **Automatic Calendar Bridge**: When installed alongside `@vicacha-devs/strapi-plugin-calendar`, `strapi-plugin-events` automatically registers all of its configured event sources into the unified `calendar` registry on `bootstrap`.

---

## Key Architectural Conventions

1. **Strapi Peer Isolation (`pnpm-workspace.yaml`)**:
   Uses `hoistPattern: ["*", "!@strapi/*"]` so `@strapi/*` packages are never hoisted across workspace boundaries, preventing duplicate context or peer dependency collisions during `strapi-plugin build` and `strapi develop`.
2. **Strict Modularity (`< 500` lines per file)**:
   Every file in the monorepo is strictly `< 500` lines, enforced via `@vicacha-devs/eslint-config`.
3. **Strict TypeScript (`tsc --noEmit`)**:
   Every plugin validates both its Admin (`admin/tsconfig.json`) and Server (`server/tsconfig.json`) bundles against `@vicacha-devs/typescript-config` with zero `any` leaks in implementation code.
4. **10-Locale Admin i18n Parity**:
   Every plugin ships with verified translation parity across `en`, `es`, `fr`, `de`, `pt`, `it`, `nl`, `pl`, `tr`, and `ar`.

---

## Commands

```bash
# Install all workspace dependencies
pnpm install

# Build all plugins and apps via Turborepo
pnpm build

# Run unit test suites across all workspace packages
pnpm test

# Run strict TypeScript checks (Admin + Server) across all packages
pnpm test:ts

# Verify all Strapi plugins with @strapi/sdk-plugin
pnpm verify

# Start watch mode for all plugins + Strapi v5 dashboard
pnpm dev

# Create a changeset for versioning & publishing
pnpm changeset
```

---

## Adding a New Plugin (e.g. `packages/strapi-plugin-bookings`)

1. Create `packages/strapi-plugin-<name>/package.json` with `"@vicacha-devs/typescript-config": "workspace:*"` and `"@vicacha-devs/eslint-config": "workspace:*"`.
2. Extend `../../typescript-config/strapi-admin.json` in `admin/tsconfig.json` and `../../typescript-config/strapi-server.json` in `server/tsconfig.json`.
3. Optionally register its schedulable collection type in `bootstrap.ts` via:
   ```ts
   await strapi.plugin('calendar')?.service('registry')?.registerSource({
     id: 'bookings',
     label: 'Bookings',
     uid: 'plugin::bookings.booking',
     color: '#2563EB',
     enabled: true,
     fields: { title: 'guestName', startDate: 'checkInDate', endDate: 'checkOutDate' },
   });
   ```
4. Add `"@vicacha-devs/strapi-plugin-<name>": "workspace:*"` to `apps/dashboard/package.json`.
