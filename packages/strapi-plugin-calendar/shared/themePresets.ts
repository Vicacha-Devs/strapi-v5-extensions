import {
  CALENDAR_COLOR_PALETTES,
  detectEffectiveColorScheme,
  type CalendarColorPaletteDefinition as CalendarColorPalette,
} from "./themePalettes";
import type { CalendarColorPaletteId, CalendarColorScheme, CalendarThemePreset } from "./types";

export interface CalendarThemeDefinition {
  id: CalendarThemePreset;
  label: string;
  description: string;
  category?: "modern" | "design-system" | "heritage";
  fontFamily?: string;
  containerRadius?: string;
  containerShadow?: string;
  eventRadius?: string;
  eventStyle?: "solid" | "tinted" | "accent-bar";
  dayNumberAlign?: "start" | "center" | "end";
  todayHeaderAccent?: "pill" | "top-bar" | "tint";
  primaryColor: string;
  headerBg: string;
  headerText: string;
  cellBg: string;
  cellAltBg: string;
  cellHoverBg: string;
  cellText: string;
  cellMutedText: string;
  borderColor: string;
  todayBg: string;
  todayBorder: string;
  todayNumberBg: string;
  todayNumberText: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const CALENDAR_THEME_PRESETS: Record<CalendarThemePreset, CalendarThemeDefinition> = {
  breeze: {
    id: "breeze",
    label: "Breezy (Modern Default)",
    description:
      "FullCalendar Breezy style — airy sky & slate grid, soft-tinted event pills, and rounded-lg container",
    category: "modern",
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
    containerRadius: "10px",
    containerShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
    eventRadius: "6px",
    eventStyle: "tinted",
    dayNumberAlign: "start",
    todayHeaderAccent: "pill",
    primaryColor: "#0284C7",
    headerBg: "#F8FAFC",
    headerText: "#0F172A",
    cellBg: "#FFFFFF",
    cellAltBg: "#F8FAFC",
    cellHoverBg: "#F0F9FF",
    cellText: "#111827",
    cellMutedText: "#6B7280",
    borderColor: "#E5E7EB",
    todayBg: "#F0F9FF",
    todayBorder: "#0284C7",
    todayNumberBg: "#0284C7",
    todayNumberText: "#FFFFFF",
    badgeBg: "#E0F2FE",
    badgeText: "#0369A1",
    badgeBorder: "#7DD3FC",
  },
  monarch: {
    id: "monarch",
    label: "Monarch (Material 3)",
    description:
      "FullCalendar Monarch style — pill-shaped headers, centered day badges, tonal surfaces & rounded-xl frame",
    category: "modern",
    fontFamily: "'Roboto Variable', Roboto, system-ui, sans-serif",
    containerRadius: "14px",
    containerShadow: "0 2px 8px rgba(103, 80, 164, 0.08)",
    eventRadius: "6px",
    eventStyle: "solid",
    dayNumberAlign: "center",
    todayHeaderAccent: "pill",
    primaryColor: "#6750A4",
    headerBg: "#F7F2FA",
    headerText: "#1D1B20",
    cellBg: "#FFFFFF",
    cellAltBg: "#FAF8FC",
    cellHoverBg: "#F3EDF7",
    cellText: "#0C090C",
    cellMutedText: "#79747E",
    borderColor: "#DEDCE1",
    todayBg: "#F7F2FA",
    todayBorder: "#6750A4",
    todayNumberBg: "#895264",
    todayNumberText: "#FFFFFF",
    badgeBg: "#EADDFF",
    badgeText: "#4F378B",
    badgeBorder: "#D0BCFF",
  },
  forma: {
    id: "forma",
    label: "Forma (Fluent Enterprise)",
    description:
      "FullCalendar Forma style — architectural 6px left-accent event bars, top-accent Today bar & crisp 4px corners",
    category: "modern",
    fontFamily: "'Noto Sans Variable', 'Noto Sans', system-ui, sans-serif",
    containerRadius: "4px",
    containerShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
    eventRadius: "3px",
    eventStyle: "accent-bar",
    dayNumberAlign: "start",
    todayHeaderAccent: "top-bar",
    primaryColor: "#0F6CBD",
    headerBg: "#FFFFFF",
    headerText: "#030712",
    cellBg: "#FFFFFF",
    cellAltBg: "#F9FAFB",
    cellHoverBg: "#EFF6FC",
    cellText: "#030712",
    cellMutedText: "#6B7280",
    borderColor: "#E0E0E0",
    todayBg: "#F5F9FF",
    todayBorder: "#0F6CBD",
    todayNumberBg: "#0F6CBD",
    todayNumberText: "#FFFFFF",
    badgeBg: "#EFF6FC",
    badgeText: "#0F6CBD",
    badgeBorder: "#B4D6FA",
  },
  pulse: {
    id: "pulse",
    label: "Pulse (Apple / macOS)",
    description:
      "FullCalendar Pulse style — right-aligned day numbers, crimson Today circle, elevated controls & dotted minor slots",
    category: "modern",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    containerRadius: "8px",
    containerShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
    eventRadius: "6px",
    eventStyle: "solid",
    dayNumberAlign: "end",
    todayHeaderAccent: "pill",
    primaryColor: "#117AFF",
    headerBg: "#FFFFFF",
    headerText: "#232D3E",
    cellBg: "#FFFFFF",
    cellAltBg: "#F9FAFB",
    cellHoverBg: "#F0F7FF",
    cellText: "#232D3E",
    cellMutedText: "#545C6C",
    borderColor: "#E5E7EB",
    todayBg: "#FFF5F5",
    todayBorder: "#FD453B",
    todayNumberBg: "#FD453B",
    todayNumberText: "#FFFFFF",
    badgeBg: "#EFF6FF",
    badgeText: "#1D4ED8",
    badgeBorder: "#BFDBFE",
  },
  classic: {
    id: "classic",
    label: "Classic (FullCalendar Standard)",
    description:
      "Traditional FullCalendar v6/v7 studio grid with slate headers, warm yellow Today cell tint & solid events",
    category: "modern",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    containerRadius: "6px",
    containerShadow: "none",
    eventRadius: "4px",
    eventStyle: "solid",
    dayNumberAlign: "end",
    todayHeaderAccent: "tint",
    primaryColor: "#3788D8",
    headerBg: "#F8FAFC",
    headerText: "#1E293B",
    cellBg: "#FFFFFF",
    cellAltBg: "#F8FAFC",
    cellHoverBg: "#F1F5F9",
    cellText: "#030712",
    cellMutedText: "#6B7280",
    borderColor: "#DDDDDD",
    todayBg: "#FEFCE8",
    todayBorder: "#EAB308",
    todayNumberBg: "#334155",
    todayNumberText: "#FFFFFF",
    badgeBg: "#F1F5F9",
    badgeText: "#334155",
    badgeBorder: "#CBD5E1",
  },
  shadcn: {
    id: "shadcn",
    label: "Shadcn UI (Zinc Minimal)",
    description:
      "Design-system theme matching Shadcn UI — ultra-clean 1px zinc borders, monochrome primary & tinted badges",
    category: "design-system",
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
    containerRadius: "8px",
    containerShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    eventRadius: "5px",
    eventStyle: "tinted",
    dayNumberAlign: "start",
    todayHeaderAccent: "pill",
    primaryColor: "#18181B",
    headerBg: "#FAFAFA",
    headerText: "#09090B",
    cellBg: "#FFFFFF",
    cellAltBg: "#FAFAFA",
    cellHoverBg: "#F4F4F5",
    cellText: "#09090B",
    cellMutedText: "#71717A",
    borderColor: "#E4E4E7",
    todayBg: "#F4F4F5",
    todayBorder: "#18181B",
    todayNumberBg: "#18181B",
    todayNumberText: "#FAFAFA",
    badgeBg: "#F4F4F5",
    badgeText: "#18181B",
    badgeBorder: "#D4D4D8",
  },
  mui: {
    id: "mui",
    label: "Material UI (MUI Paper)",
    description:
      "Design-system theme matching Material UI — Paper surface elevation, Roboto uppercase headers & Material blue",
    category: "design-system",
    fontFamily: "'Roboto Variable', Roboto, Helvetica, Arial, sans-serif",
    containerRadius: "8px",
    containerShadow: "0px 2px 4px -1px rgba(0,0,0,0.08), 0px 4px 5px 0px rgba(0,0,0,0.05)",
    eventRadius: "4px",
    eventStyle: "solid",
    dayNumberAlign: "center",
    todayHeaderAccent: "pill",
    primaryColor: "#1976D2",
    headerBg: "#F5F7FA",
    headerText: "#1E293B",
    cellBg: "#FFFFFF",
    cellAltBg: "#FAFAFA",
    cellHoverBg: "#E3F2FD",
    cellText: "#212121",
    cellMutedText: "#757575",
    borderColor: "#E0E0E0",
    todayBg: "#E3F2FD",
    todayBorder: "#1976D2",
    todayNumberBg: "#1976D2",
    todayNumberText: "#FFFFFF",
    badgeBg: "#E3F2FD",
    badgeText: "#1565C0",
    badgeBorder: "#90CAF9",
  },
  emerald: {
    id: "emerald",
    label: "Emerald Mosque",
    description: "Lush emerald & teal palette inspired by traditional Islamic architecture",
    category: "heritage",
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
    containerRadius: "10px",
    containerShadow: "0 1px 3px rgba(13, 148, 136, 0.08)",
    eventRadius: "6px",
    eventStyle: "solid",
    dayNumberAlign: "start",
    todayHeaderAccent: "pill",
    primaryColor: "#0D9488",
    headerBg: "#CCFBF1",
    headerText: "#115E59",
    cellBg: "#FFFFFF",
    cellAltBg: "#F0FDFA",
    cellHoverBg: "#CCFBF1",
    cellText: "#0F172A",
    cellMutedText: "#475569",
    borderColor: "#99F6E4",
    todayBg: "#F0FDFA",
    todayBorder: "#0D9488",
    todayNumberBg: "#0D9488",
    todayNumberText: "#FFFFFF",
    badgeBg: "#CCFBF1",
    badgeText: "#0F766E",
    badgeBorder: "#5EEAD4",
  },
  sand: {
    id: "sand",
    label: "Warm Sand & Gold",
    description: "Warm parchment & amber tones for high-comfort reading",
    category: "heritage",
    fontFamily: "'Noto Sans Variable', 'Noto Sans', system-ui, sans-serif",
    containerRadius: "10px",
    containerShadow: "0 1px 3px rgba(180, 83, 9, 0.08)",
    eventRadius: "6px",
    eventStyle: "solid",
    dayNumberAlign: "start",
    todayHeaderAccent: "pill",
    primaryColor: "#B45309",
    headerBg: "#FEF3C7",
    headerText: "#78350F",
    cellBg: "#FFFBEB",
    cellAltBg: "#FEF9C3",
    cellHoverBg: "#FEF3C7",
    cellText: "#1C1917",
    cellMutedText: "#78716C",
    borderColor: "#FDE68A",
    todayBg: "#FEF3C7",
    todayBorder: "#D97706",
    todayNumberBg: "#B45309",
    todayNumberText: "#FFFFFF",
    badgeBg: "#FEF3C7",
    badgeText: "#92400E",
    badgeBorder: "#FCD34D",
  },
  midnight: {
    id: "midnight",
    label: "Midnight Slate",
    description: "Deep dark-mode slate grid with luminous sky accents",
    category: "heritage",
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
    containerRadius: "10px",
    containerShadow: "0 4px 12px rgba(2, 6, 23, 0.35)",
    eventRadius: "6px",
    eventStyle: "tinted",
    dayNumberAlign: "start",
    todayHeaderAccent: "pill",
    primaryColor: "#38BDF8",
    headerBg: "#1E293B",
    headerText: "#E2E8F0",
    cellBg: "#0F172A",
    cellAltBg: "#162032",
    cellHoverBg: "#1E293B",
    cellText: "#F8FAFC",
    cellMutedText: "#94A3B8",
    borderColor: "#334155",
    todayBg: "#172554",
    todayBorder: "#38BDF8",
    todayNumberBg: "#0284C7",
    todayNumberText: "#FFFFFF",
    badgeBg: "#1E293B",
    badgeText: "#7DD3FC",
    badgeBorder: "#0369A1",
  },
};

function applyDarkSurfaceOverride(
  base: CalendarThemeDefinition,
  themeKey: CalendarThemePreset
): CalendarThemeDefinition {
  return {
    ...base,
    headerBg: themeKey === "monarch" ? "#141218" : "#111827",
    headerText: "#F3F4F6",
    cellBg: "#030712",
    cellAltBg: "#0B0F19",
    cellHoverBg: "#1F2937",
    cellText: "#F9FAFB",
    cellMutedText: "#9CA3AF",
    borderColor: themeKey === "forma" ? "#2A2A2A" : "#1F2937",
    todayBg: "#172554",
    todayBorder: base.primaryColor,
    todayNumberBg: base.primaryColor,
    todayNumberText: "#FFFFFF",
    badgeBg: "#1E293B",
    badgeText: "#E2E8F0",
    badgeBorder: "#334155",
  };
}

function selectPaletteColors(palette: CalendarColorPalette, isDark: boolean) {
  if (isDark) {
    return {
      primary: palette.darkPrimary,
      headerBg: palette.darkHeaderBg,
      headerText: palette.darkHeaderText,
      todayBg: palette.darkTodayBg,
      badgeBg: palette.darkBadgeBg,
      badgeText: palette.darkBadgeText,
      badgeBorder: palette.darkBadgeBorder,
    };
  }
  return {
    primary: palette.lightPrimary,
    headerBg: palette.lightHeaderBg,
    headerText: palette.lightHeaderText,
    todayBg: palette.lightTodayBg,
    badgeBg: palette.lightBadgeBg,
    badgeText: palette.lightBadgeText,
    badgeBorder: palette.lightBadgeBorder,
  };
}

function applyPaletteOverride(
  resolved: CalendarThemeDefinition,
  paletteKey: CalendarColorPaletteId,
  isDark: boolean
): CalendarThemeDefinition {
  const palette = CALENDAR_COLOR_PALETTES[paletteKey];
  if (!palette) return resolved;
  const c = selectPaletteColors(palette, isDark);
  return {
    ...resolved,
    primaryColor: c.primary,
    headerBg: c.headerBg,
    headerText: c.headerText,
    todayBg: c.todayBg,
    todayBorder: c.primary,
    todayNumberBg: c.primary,
    todayNumberText: isDark && paletteKey === "purple" ? "#381E72" : "#FFFFFF",
    badgeBg: c.badgeBg,
    badgeText: c.badgeText,
    badgeBorder: c.badgeBorder,
  };
}

export function resolveCalendarTheme(
  themeKey: CalendarThemePreset = "breeze",
  colorScheme: CalendarColorScheme = "auto",
  paletteKey: CalendarColorPaletteId = "default",
  strapiNeutral0?: string
): CalendarThemeDefinition {
  const base = CALENDAR_THEME_PRESETS[themeKey] ?? CALENDAR_THEME_PRESETS.breeze;
  const effectiveScheme = detectEffectiveColorScheme(colorScheme, strapiNeutral0);
  const isDark = effectiveScheme === "dark" || themeKey === "midnight";
  const surfaced =
    isDark && themeKey !== "midnight" ? applyDarkSurfaceOverride(base, themeKey) : { ...base };
  return paletteKey !== "default" ? applyPaletteOverride(surfaced, paletteKey, isDark) : surfaced;
}
