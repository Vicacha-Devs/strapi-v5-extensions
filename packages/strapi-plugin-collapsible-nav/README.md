# `@vicacha-devs/strapi-plugin-collapsible-nav`

[![Strapi 5](https://img.shields.io/badge/strapi-v5-blue)](https://strapi.io)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Restores Strapi v4-style **collapsible & expandable** left navigation in the **Strapi v5** admin panel—complete with **Pin / Unpin** (hover-to-peek) support, `localStorage` persistence, and smooth desktop-only transitions.

---

## Features

- **Strapi v4-Style Collapse & Expand** — Adds a floating chevron toggle button on the sidebar edge to smoothly expand (`22.4rem`) or collapse (`5.6rem`) the desktop navigation rail.
- **Pin / Unpin Mode** — Pin the sidebar open, or unpin it so it stays compact (`5.6rem`) and **auto-expands on hover** to peek at labels without losing workspace width.
- **Zero-Jump Anchored Layout** — Icons, brand logo, and user avatar stay anchored in place while labels glide in smoothly (`260ms cubic-bezier(0.4, 0, 0.2, 1)`).
- **Theme & Locale Aware** — Reads each link's localized `aria-label` (plus `NavBrand` and `NavUser` accessible labels) and inherits Strapi's light/dark theme colors.
- **Desktop Scoped** — Only activates at Strapi's `large` desktop breakpoint (`>= 1080px`); mobile/tablet `NavBurgerMenu` remains untouched.
- **Zero Configuration** — Install, enable, and restart Strapi. No `preinstall` / `install` / `postinstall` scripts.

---

## Installation

```bash
pnpm add @vicacha-devs/strapi-plugin-collapsible-nav
# or
npm install @vicacha-devs/strapi-plugin-collapsible-nav
```

Enable it in `config/plugins.ts` (or `config/plugins.js`):

```ts
export default () => ({
  "collapsible-nav": {
    enabled: true,
  },
});
```

Rebuild and start Strapi:

```bash
pnpm build && pnpm develop
```

> **Upgrading / Local Dev:** If Strapi's Vite pre-bundler has cached an older version of the admin bundle, clear `node_modules/.strapi` and `.strapi` before restarting `develop`.

---

## Controls & Persistence

| Control | Location | Behavior |
| :--- | :--- | :--- |
| **Chevron Toggle** | Bottom-right edge of sidebar | Expands/collapses when pinned; pins open if clicked while unpinned. |
| **Pin / Unpin Button** | Top-right of expanded brand header | Locks sidebar open (`pinned: true`) or enables auto-collapse with hover-to-peek (`pinned: false`). |

State is persisted per browser in `localStorage`:
- `strapi-collapsible-nav:expanded` (`"true"` | `"false"`, default `"true"`)
- `strapi-collapsible-nav:pinned` (`"true"` | `"false"`, default `"true"`)

---

## How It Works

Strapi v5's `LeftMenu` / `MainNav` component renders an icon-only desktop sidebar without an official plugin override slot. At `bootstrap()`, this plugin:
1. Injects desktop-scoped CSS (`#strapi-collapsible-nav-styles`) into `document.head`.
2. Observes `<nav>` via `MutationObserver` to keep dynamically mounted plugin links synchronized.
3. Hydrates `.scn-nav-label` spans from each link's `aria-label`, reveals `NavBrand` / `NavUser` accessible text when expanded, and mounts accessible `<button>` controls for toggling and pinning.

---

## License

MIT © Vicacha Devs
