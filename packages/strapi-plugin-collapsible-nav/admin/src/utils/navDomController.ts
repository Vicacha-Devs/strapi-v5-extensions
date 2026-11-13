import {
  COLLAPSIBLE_NAV_CSS,
  STYLE_ELEMENT_ID,
} from "../styles/collapsibleNavStyles";

export const EXPANDED_STORAGE_KEY = "strapi-collapsible-nav:expanded";
export const PINNED_STORAGE_KEY = "strapi-collapsible-nav:pinned";

const TOGGLE_ATTR = "data-scn-toggle";
const PIN_ATTR = "data-scn-pin";
const LABEL_ATTR = "data-scn-label";
const BRAND_ATTR = "data-scn-brand";
const USER_LABEL_ATTR = "data-scn-user-label";
const BOUND_ATTR = "data-scn-bound";
const TOOLTIP_BOUND_ATTR = "data-scn-tooltip-bound";

export type TranslationBundle = Record<string, string>;

const DEFAULT_MESSAGES: TranslationBundle = {
  "toggle.expand": "Expand navigation",
  "toggle.collapse": "Collapse navigation",
  "pin.pin": "Pin sidebar open",
  "pin.unpin": "Unpin sidebar (auto-collapse)",
};

function readStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return fallback;
  } catch {
    return fallback;
  }
}

function writeStoredBoolean(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

function detectStrapiTheme(): "dark" | "light" {
  try {
    const stored = window.localStorage.getItem("STRAPI_THEME");
    if (stored === "dark") return "dark";
    if (stored === "light") return "light";
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
  } catch {
    // Ignore matchMedia / storage errors
  }
  return "light";
}

function resolveMessage(
  translations: Record<string, TranslationBundle>,
  key: string
): string {
  const rawLang =
    document.documentElement.lang ||
    (typeof navigator !== "undefined" ? navigator.language : "en") ||
    "en";
  const normalized = rawLang.toLowerCase();
  const baseLang = normalized.split("-")[0] || "en";
  const bundle =
    translations[normalized] || translations[baseLang] || translations.en;
  return bundle?.[key] || DEFAULT_MESSAGES[key] || key;
}

function injectStyles(): void {
  if (document.getElementById(STYLE_ELEMENT_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = COLLAPSIBLE_NAV_CSS;
  document.head.appendChild(style);
}

function createChevronSvg(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M9 6l6 6-6 6");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2.2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  svg.appendChild(path);
  return svg;
}

function createPinSvg(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M12 17v5M9 3h6l-1 7 3 3v2H7v-2l3-3-1-7z");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.9");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  svg.appendChild(path);
  return svg;
}

function syncNavLinks(
  nav: HTMLElement,
  isEffectivelyExpanded: () => boolean
): void {
  const links = nav.querySelectorAll<HTMLAnchorElement>("ul li a[aria-label]");
  links.forEach((anchor) => {
    const labelText = anchor.getAttribute("aria-label")?.trim();
    if (!labelText) return;

    if (!anchor.hasAttribute(TOOLTIP_BOUND_ATTR)) {
      anchor.setAttribute(TOOLTIP_BOUND_ATTR, "true");
      const suppressTooltip = (e: Event) => {
        if (isEffectivelyExpanded()) {
          e.stopImmediatePropagation();
        }
      };
      anchor.addEventListener("pointerenter", suppressTooltip, true);
      anchor.addEventListener("pointermove", suppressTooltip, true);
    }

    let labelSpan = anchor.querySelector<HTMLSpanElement>(
      `[${LABEL_ATTR}="true"]`
    );
    if (!labelSpan) {
      labelSpan = document.createElement("span");
      labelSpan.className = "scn-nav-label";
      labelSpan.setAttribute(LABEL_ATTR, "true");
      labelSpan.setAttribute("aria-hidden", "true");

      // Insert after the icon element while keeping any trailing badges aligned right
      const iconContainer = anchor.firstElementChild;
      if (iconContainer?.nextSibling) {
        anchor.insertBefore(labelSpan, iconContainer.nextSibling);
      } else {
        anchor.appendChild(labelSpan);
      }
    }

    if (labelSpan.textContent !== labelText) {
      labelSpan.textContent = labelText;
    }
  });
}

function syncBrandTitle(
  nav: HTMLElement,
  onTogglePin: () => void,
  pinned: boolean,
  translations: Record<string, TranslationBundle>
): void {
  const brandContainer = nav.firstElementChild as HTMLElement | null;
  if (!brandContainer) return;

  if (!brandContainer.querySelector(`[${BRAND_ATTR}="true"]`)) {
    const hiddenSpans = brandContainer.querySelectorAll("span");
    const imgAlt = brandContainer
      .querySelector("img")
      ?.getAttribute("alt")
      ?.trim();
    const mainTitle = hiddenSpans[0]?.textContent?.trim() || imgAlt || "Strapi";
    const subTitle = hiddenSpans[1]?.textContent?.trim() || "";

    const titleWrapper = document.createElement("div");
    titleWrapper.className = "scn-brand-title";
    titleWrapper.setAttribute(BRAND_ATTR, "true");
    titleWrapper.setAttribute("aria-hidden", "true");

    const mainEl = document.createElement("span");
    mainEl.className = "scn-brand-title-main";
    mainEl.textContent = mainTitle;
    titleWrapper.appendChild(mainEl);

    if (subTitle) {
      const subEl = document.createElement("span");
      subEl.className = "scn-brand-title-sub";
      subEl.textContent = subTitle;
      titleWrapper.appendChild(subEl);
    }

    brandContainer.appendChild(titleWrapper);
  }

  let pinBtn = brandContainer.querySelector<HTMLButtonElement>(
    `[${PIN_ATTR}="true"]`
  );
  if (!pinBtn) {
    pinBtn = document.createElement("button");
    pinBtn.type = "button";
    pinBtn.className = "scn-pin-btn";
    pinBtn.setAttribute(PIN_ATTR, "true");
    pinBtn.appendChild(createPinSvg());
    pinBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onTogglePin();
    });
    brandContainer.appendChild(pinBtn);
  }

  const pinLabel = resolveMessage(
    translations,
    pinned ? "pin.unpin" : "pin.pin"
  );
  pinBtn.setAttribute("aria-pressed", String(pinned));
  pinBtn.setAttribute("aria-label", pinLabel);
  pinBtn.setAttribute("title", pinLabel);
}

function syncUserLabel(nav: HTMLElement): void {
  const menuBtn = nav.querySelector<HTMLButtonElement>(
    'button[aria-haspopup="menu"]'
  );
  if (!menuBtn) return;

  if (menuBtn.querySelector(`[${USER_LABEL_ATTR}="true"]`)) return;

  const flexRow = menuBtn.firstElementChild;
  const candidate = flexRow?.lastElementChild as HTMLElement | null;
  if (
    candidate &&
    candidate.tagName === "SPAN" &&
    candidate.textContent?.trim()
  ) {
    candidate.setAttribute(USER_LABEL_ATTR, "true");
  }
}

function ensureToggleButton(
  nav: HTMLElement,
  onToggle: () => void,
  effectivelyExpanded: boolean,
  translations: Record<string, TranslationBundle>
): void {
  let btn = nav.querySelector<HTMLButtonElement>(`[${TOGGLE_ATTR}="true"]`);
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "scn-toggle-btn";
    btn.setAttribute(TOGGLE_ATTR, "true");
    btn.appendChild(createChevronSvg());
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onToggle();
    });
    nav.appendChild(btn);
  }

  const label = resolveMessage(
    translations,
    effectivelyExpanded ? "toggle.collapse" : "toggle.expand"
  );
  btn.setAttribute("aria-expanded", String(effectivelyExpanded));
  btn.setAttribute("aria-label", label);
  btn.setAttribute("title", label);
}

/**
 * Matches only Strapi's primary LeftMenu `<nav>`, ignoring unrelated `<nav>`
 * elements (breadcrumbs, pagination) inside plugin pages.
 */
export function findMainNav(root: ParentNode = document): HTMLElement | null {
  const navs = root.querySelectorAll<HTMLElement>("nav");
  for (const nav of navs) {
    const hasMenuLinks = Boolean(nav.querySelector("ul li a[aria-label]"));
    const hasStrapiChrome = Boolean(
      nav.querySelector('button[aria-haspopup="menu"]') ||
      nav.querySelector("img[alt]")
    );
    if (hasMenuLinks && hasStrapiChrome) {
      return nav;
    }
  }
  return null;
}

export function initCollapsibleNav(
  translations: Record<string, TranslationBundle> = {}
): () => void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }

  injectStyles();

  let pinned = readStoredBoolean(PINNED_STORAGE_KEY, true);
  let expanded = pinned ? readStoredBoolean(EXPANDED_STORAGE_KEY, true) : false;
  let hovered = false;
  let syncing = false;
  let rafId: number | null = null;

  const isEffectivelyExpanded = () => (pinned ? expanded : hovered);

  const applyToNav = () => {
    if (syncing) return;
    syncing = true;
    try {
      const nav = findMainNav();
      if (!nav) return;

      if (!nav.hasAttribute(BOUND_ATTR)) {
        nav.setAttribute(BOUND_ATTR, "true");

        const expandPreview = () => {
          if (!pinned && !hovered) {
            hovered = true;
            applyToNav();
          }
        };

        const collapsePreviewIfIdle = () => {
          if (!pinned && hovered) {
            const menuOpen = nav.querySelector(
              'button[aria-haspopup="menu"][aria-expanded="true"]'
            );
            if (menuOpen) return;
            hovered = false;
            applyToNav();
          }
        };

        nav.addEventListener("mouseenter", expandPreview);
        nav.addEventListener("mouseleave", collapsePreviewIfIdle);
        nav.addEventListener("focusin", expandPreview);
        nav.addEventListener("focusout", (e: FocusEvent) => {
          const next = e.relatedTarget as Node | null;
          if (!next || !nav.contains(next)) {
            collapsePreviewIfIdle();
          }
        });
      }

      const showExpanded = isEffectivelyExpanded();
      nav.setAttribute("data-scn-managed", "true");
      nav.setAttribute("data-scn-theme", detectStrapiTheme());
      nav.setAttribute("data-scn-pinned", String(pinned));
      nav.setAttribute("data-scn-expanded", String(showExpanded));

      syncBrandTitle(nav, handleTogglePin, pinned, translations);
      syncNavLinks(nav, isEffectivelyExpanded);
      syncUserLabel(nav);
      ensureToggleButton(nav, handleToggleExpand, showExpanded, translations);
    } finally {
      syncing = false;
    }
  };

  const handleToggleExpand = () => {
    if (!pinned) {
      pinned = true;
      expanded = true;
      hovered = false;
    } else {
      expanded = !expanded;
    }
    writeStoredBoolean(PINNED_STORAGE_KEY, pinned);
    writeStoredBoolean(EXPANDED_STORAGE_KEY, expanded);
    applyToNav();
  };

  const handleTogglePin = () => {
    pinned = !pinned;
    if (pinned) {
      expanded = true;
      hovered = false;
    } else {
      expanded = false;
      hovered = false;
    }
    writeStoredBoolean(PINNED_STORAGE_KEY, pinned);
    writeStoredBoolean(EXPANDED_STORAGE_KEY, expanded);
    applyToNav();
  };

  applyToNav();

  const observer = new MutationObserver(() => {
    if (rafId !== null) return;
    const schedule =
      typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window)
        : (cb: FrameRequestCallback) => window.setTimeout(cb, 16);
    rafId = schedule(() => {
      rafId = null;
      applyToNav();
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => {
    observer.disconnect();
    if (rafId !== null) {
      if (typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(rafId);
      } else {
        window.clearTimeout(rafId);
      }
      rafId = null;
    }
  };
}
