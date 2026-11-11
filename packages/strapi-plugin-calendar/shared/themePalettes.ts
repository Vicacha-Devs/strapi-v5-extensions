import type { CalendarColorPaletteId, CalendarColorScheme } from "./types";

export interface CalendarColorPaletteDefinition {
  id: CalendarColorPaletteId;
  label: string;
  lightPrimary: string;
  darkPrimary: string;
  lightHeaderBg: string;
  lightHeaderText: string;
  lightTodayBg: string;
  lightBadgeBg: string;
  lightBadgeText: string;
  lightBadgeBorder: string;
  darkHeaderBg: string;
  darkHeaderText: string;
  darkTodayBg: string;
  darkBadgeBg: string;
  darkBadgeText: string;
  darkBadgeBorder: string;
}

export const CALENDAR_COLOR_PALETTES: Record<
  CalendarColorPaletteId,
  CalendarColorPaletteDefinition
> = {
  default: {
    id: "default",
    label: "Theme Default",
    lightPrimary: "#0284C7",
    darkPrimary: "#38BDF8",
    lightHeaderBg: "#E0F2FE",
    lightHeaderText: "#0C4A6E",
    lightTodayBg: "#F0F9FF",
    lightBadgeBg: "#E0F2FE",
    lightBadgeText: "#0369A1",
    lightBadgeBorder: "#7DD3FC",
    darkHeaderBg: "#1E293B",
    darkHeaderText: "#E2E8F0",
    darkTodayBg: "#172554",
    darkBadgeBg: "#1E293B",
    darkBadgeText: "#7DD3FC",
    darkBadgeBorder: "#0369A1",
  },
  purple: {
    id: "purple",
    label: "Monarch Purple",
    lightPrimary: "#6750A4",
    darkPrimary: "#D0BCFF",
    lightHeaderBg: "#F3EDF7",
    lightHeaderText: "#381E72",
    lightTodayBg: "#F7F2FA",
    lightBadgeBg: "#EADDFF",
    lightBadgeText: "#4F378B",
    lightBadgeBorder: "#D0BCFF",
    darkHeaderBg: "#211F26",
    darkHeaderText: "#E6E0E9",
    darkTodayBg: "#2B223C",
    darkBadgeBg: "#381E72",
    darkBadgeText: "#EADDFF",
    darkBadgeBorder: "#4F378B",
  },
  blue: {
    id: "blue",
    label: "Forma / Pulse Blue",
    lightPrimary: "#0F6CBD",
    darkPrimary: "#60A5FA",
    lightHeaderBg: "#EFF6FC",
    lightHeaderText: "#0A4478",
    lightTodayBg: "#F0F7FF",
    lightBadgeBg: "#DBEAFE",
    lightBadgeText: "#1E40AF",
    lightBadgeBorder: "#93C5FD",
    darkHeaderBg: "#172130",
    darkHeaderText: "#DBEAFE",
    darkTodayBg: "#172554",
    darkBadgeBg: "#1E3A8A",
    darkBadgeText: "#BFDBFE",
    darkBadgeBorder: "#2563EB",
  },
  indigo: {
    id: "indigo",
    label: "Breezy Indigo",
    lightPrimary: "#4F46E5",
    darkPrimary: "#818CF8",
    lightHeaderBg: "#EEF2FF",
    lightHeaderText: "#312E81",
    lightTodayBg: "#EEF2FF",
    lightBadgeBg: "#E0E7FF",
    lightBadgeText: "#3730A3",
    lightBadgeBorder: "#A5B4FC",
    darkHeaderBg: "#1E1B4B",
    darkHeaderText: "#E0E7FF",
    darkTodayBg: "#1E1B4B",
    darkBadgeBg: "#312E81",
    darkBadgeText: "#C7D2FE",
    darkBadgeBorder: "#4F46E5",
  },
  emerald: {
    id: "emerald",
    label: "Emerald Green",
    lightPrimary: "#059669",
    darkPrimary: "#34D399",
    lightHeaderBg: "#ECFDF5",
    lightHeaderText: "#065F46",
    lightTodayBg: "#F0FDF4",
    lightBadgeBg: "#D1FAE5",
    lightBadgeText: "#065F46",
    lightBadgeBorder: "#6EE7B7",
    darkHeaderBg: "#064E3B",
    darkHeaderText: "#D1FAE5",
    darkTodayBg: "#064E3B",
    darkBadgeBg: "#065F46",
    darkBadgeText: "#A7F3D0",
    darkBadgeBorder: "#059669",
  },
  rose: {
    id: "rose",
    label: "Pulse Rose",
    lightPrimary: "#E11D48",
    darkPrimary: "#FB7185",
    lightHeaderBg: "#FFF1F2",
    lightHeaderText: "#881337",
    lightTodayBg: "#FFF1F2",
    lightBadgeBg: "#FFE4E6",
    lightBadgeText: "#9F1239",
    lightBadgeBorder: "#FDA4AF",
    darkHeaderBg: "#3B0A19",
    darkHeaderText: "#FFE4E6",
    darkTodayBg: "#4C0519",
    darkBadgeBg: "#881337",
    darkBadgeText: "#FECDD3",
    darkBadgeBorder: "#E11D48",
  },
  amber: {
    id: "amber",
    label: "Monarch Amber",
    lightPrimary: "#D97706",
    darkPrimary: "#FBBF24",
    lightHeaderBg: "#FFFBEB",
    lightHeaderText: "#78350F",
    lightTodayBg: "#FEF3C7",
    lightBadgeBg: "#FEF3C7",
    lightBadgeText: "#92400E",
    lightBadgeBorder: "#FCD34D",
    darkHeaderBg: "#3B2506",
    darkHeaderText: "#FEF3C7",
    darkTodayBg: "#451A03",
    darkBadgeBg: "#78350F",
    darkBadgeText: "#FDE68A",
    darkBadgeBorder: "#D97706",
  },
};

function detectFromHexLuminance(
  strapiNeutral0?: string
): "light" | "dark" | null {
  if (typeof strapiNeutral0 !== "string" || !strapiNeutral0.startsWith("#")) {
    return null;
  }
  const hex = strapiNeutral0.slice(1).trim();
  const r =
    hex.length === 3
      ? Number.parseInt(hex[0] + hex[0], 16)
      : Number.parseInt(hex.slice(0, 2), 16);
  if (Number.isNaN(r)) return null;
  return r < 128 ? "dark" : "light";
}

function detectFromBrowserEnvironment(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  try {
    const storedTheme = window.localStorage?.getItem("STRAPI_THEME");
    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }
  } catch {
    // ignore storage errors
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
    ? "dark"
    : "light";
}

/**
 * Detects the active 'light' | 'dark' color scheme from:
 * 1. Explicit 'light' or 'dark' preference
 * 2. Strapi Design System theme's `colors.neutral0` hex luminance (e.g. #212134 in dark mode vs #ffffff in light mode)
 * 3. Strapi Admin localStorage `STRAPI_THEME` and browser `prefers-color-scheme: dark` media query
 */
export function detectEffectiveColorScheme(
  colorScheme: CalendarColorScheme = "auto",
  strapiNeutral0?: string
): "light" | "dark" {
  if (colorScheme === "dark" || colorScheme === "light") {
    return colorScheme;
  }
  return (
    detectFromHexLuminance(strapiNeutral0) ?? detectFromBrowserEnvironment()
  );
}
