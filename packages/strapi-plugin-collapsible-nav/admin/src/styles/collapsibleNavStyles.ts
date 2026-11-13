export const STYLE_ELEMENT_ID = "strapi-collapsible-nav-styles";

export const COLLAPSIBLE_NAV_CSS = `
/* Scoped strictly to Strapi desktop breakpoint (1080px / large) */
@media (min-width: 1080px) {
  nav[data-scn-managed="true"] {
    --scn-primary: var(--strapi-colors-primary600, #4945ff);
    --scn-shadow: var(--strapi-shadows-filterShadow, 0 1px 4px rgba(33, 33, 52, 0.12));
    width: 5.6rem !important;
    min-width: 5.6rem !important;
    flex-shrink: 0 !important;
    transition: width 260ms cubic-bezier(0.4, 0, 0.2, 1),
      min-width 260ms cubic-bezier(0.4, 0, 0.2, 1);
    will-change: width;
    overflow: visible !important;
  }

  nav[data-scn-managed="true"][data-scn-theme="dark"] {
    --scn-primary: var(--strapi-colors-primary600, #7b79ff);
    --scn-shadow: var(--strapi-shadows-filterShadow, 0 2px 6px rgba(0, 0, 0, 0.45));
  }

  nav[data-scn-managed="true"][data-scn-expanded="true"] {
    width: 22.4rem !important;
    min-width: 22.4rem !important;
  }

  /* Brand header: keep logo anchored at inline-start so it never jumps */
  nav[data-scn-managed="true"] > div:first-child {
    width: 100%;
    justify-content: flex-start !important;
    padding-inline-start: 1.2rem !important;
    padding-inline-end: 1rem !important;
    gap: 0;
    transition: gap 220ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  nav[data-scn-managed="true"][data-scn-expanded="true"] > div:first-child {
    gap: 1rem;
  }

  .scn-brand-title {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    max-width: 0;
    overflow: hidden;
    opacity: 0;
    transform: translateX(-6px);
    pointer-events: none;
    transition: max-width 240ms cubic-bezier(0.4, 0, 0.2, 1),
      opacity 180ms ease,
      transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  [dir="rtl"] .scn-brand-title {
    transform: translateX(6px);
  }

  nav[data-scn-managed="true"][data-scn-expanded="true"] .scn-brand-title {
    max-width: 14rem;
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
  }

  .scn-brand-title-main {
    font-size: 1.4rem;
    font-weight: 600;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .scn-brand-title-sub {
    font-size: 1.1rem;
    opacity: 0.7;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Pin / Unpin button in expanded brand header */
  .scn-pin-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 0;
    height: 2.8rem;
    border-radius: 4px;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    opacity: 0;
    overflow: hidden;
    pointer-events: none;
    cursor: pointer;
    padding: 0;
    transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1),
      opacity 160ms ease,
      background-color 150ms ease,
      color 150ms ease,
      border-color 150ms ease;
  }

  nav[data-scn-managed="true"][data-scn-expanded="true"] .scn-pin-btn {
    width: 2.8rem;
    opacity: 0.65;
    pointer-events: auto;
  }

  nav[data-scn-managed="true"][data-scn-expanded="true"] .scn-pin-btn:hover {
    opacity: 1;
    background: color-mix(in srgb, currentColor 8%, transparent);
  }

  nav[data-scn-managed="true"][data-scn-expanded="true"] .scn-pin-btn[aria-pressed="true"] {
    opacity: 1;
    color: var(--scn-primary);
    background: color-mix(in srgb, var(--scn-primary) 12%, transparent);
    border-color: color-mix(in srgb, var(--scn-primary) 28%, transparent);
  }

  .scn-pin-btn:focus-visible {
    outline: 2px solid var(--scn-primary);
    outline-offset: 2px;
  }

  .scn-pin-btn svg {
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
    transition: transform 180ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .scn-pin-btn[aria-pressed="false"] svg {
    transform: rotate(45deg);
  }

  /* Nav list & links: keep icons anchored so they never jump on expand/collapse */
  nav[data-scn-managed="true"] ul {
    align-items: stretch !important;
    padding-inline: 0.8rem !important;
  }

  nav[data-scn-managed="true"] ul > li {
    width: 100% !important;
  }

  nav[data-scn-managed="true"] ul > li > span {
    width: 100% !important;
    display: block !important;
  }

  nav[data-scn-managed="true"] ul > li a[aria-label] {
    width: 100% !important;
    justify-content: flex-start !important;
    padding-inline: 1rem !important;
    gap: 0 !important;
    transition: gap 220ms cubic-bezier(0.4, 0, 0.2, 1),
      background-color 150ms ease;
  }

  nav[data-scn-managed="true"][data-scn-expanded="true"] ul > li a[aria-label] {
    gap: 1.2rem !important;
  }

  .scn-nav-label {
    display: inline-block;
    flex: 1;
    min-width: 0;
    max-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 1.4rem;
    line-height: 1.4;
    font-weight: 500;
    text-align: start;
    opacity: 0;
    transform: translateX(-6px);
    transition: max-width 240ms cubic-bezier(0.4, 0, 0.2, 1),
      opacity 180ms ease,
      transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  [dir="rtl"] .scn-nav-label {
    transform: translateX(6px);
  }

  nav[data-scn-managed="true"][data-scn-expanded="true"] .scn-nav-label {
    max-width: 16rem;
    opacity: 1;
    transform: translateX(0);
    transition-delay: 0ms, 40ms, 20ms;
  }

  nav[data-scn-managed="true"][data-scn-expanded="true"] ul > li a.active .scn-nav-label {
    font-weight: 600;
    color: var(--scn-primary);
  }

  /* User menu trigger at bottom of sidebar */
  nav[data-scn-managed="true"] button[aria-haspopup="menu"] {
    width: 100% !important;
    justify-content: flex-start !important;
    padding-inline: 0.4rem !important;
  }

  nav[data-scn-managed="true"] [data-scn-user-label="true"] {
    position: static !important;
    display: inline-block !important;
    width: auto !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    clip: auto !important;
    clip-path: none !important;
    white-space: nowrap !important;
    text-overflow: ellipsis !important;
    font-size: 1.4rem !important;
    font-weight: 500 !important;
    max-width: 0;
    opacity: 0;
    transform: translateX(-6px);
    transition: max-width 240ms cubic-bezier(0.4, 0, 0.2, 1),
      opacity 180ms ease,
      transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  [dir="rtl"] nav[data-scn-managed="true"] [data-scn-user-label="true"] {
    transform: translateX(6px);
  }

  nav[data-scn-managed="true"][data-scn-expanded="true"] [data-scn-user-label="true"] {
    max-width: 14rem;
    opacity: 1;
    transform: translateX(0);
  }

  /* Strapi 4-style collapse/expand toggle button on sidebar inline-end edge */
  .scn-toggle-btn {
    position: absolute;
    bottom: 6.8rem;
    inset-inline-end: -1.2rem;
    z-index: 6;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 4px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    background: inherit;
    color: inherit;
    cursor: pointer;
    box-shadow: var(--scn-shadow);
    transition: transform 150ms ease, box-shadow 150ms ease;
    padding: 0;
  }

  .scn-toggle-btn:hover {
    box-shadow: 0 2px 8px color-mix(in srgb, currentColor 22%, transparent);
  }

  .scn-toggle-btn:focus-visible {
    outline: 2px solid var(--scn-primary);
    outline-offset: 2px;
  }

  .scn-toggle-btn svg {
    width: 1.2rem;
    height: 1.2rem;
    transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  nav[data-scn-managed="true"][data-scn-expanded="true"] .scn-toggle-btn svg {
    transform: rotate(180deg);
  }

  [dir="rtl"] .scn-toggle-btn svg {
    transform: rotate(180deg);
  }

  [dir="rtl"] nav[data-scn-managed="true"][data-scn-expanded="true"] .scn-toggle-btn svg {
    transform: rotate(0deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  nav[data-scn-managed="true"],
  nav[data-scn-managed="true"] > div:first-child,
  .scn-brand-title,
  .scn-pin-btn,
  .scn-pin-btn svg,
  nav[data-scn-managed="true"] ul > li a[aria-label],
  .scn-nav-label,
  nav[data-scn-managed="true"] [data-scn-user-label="true"],
  .scn-toggle-btn,
  .scn-toggle-btn svg {
    transition: none !important;
  }
}

@media (max-width: 1079px) {
  .scn-nav-label,
  .scn-brand-title,
  .scn-pin-btn,
  .scn-toggle-btn {
    display: none !important;
  }
}
`;
