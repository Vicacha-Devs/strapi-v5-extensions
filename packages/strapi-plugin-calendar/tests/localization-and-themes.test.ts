import { describe, it, expect } from "vitest";

import { buildOrderedRecurrencePresets } from "../admin/src/components/calendar/calendarPageHelpers";
import ar from "../admin/src/translations/ar.json";
import de from "../admin/src/translations/de.json";
import en from "../admin/src/translations/en.json";
import es from "../admin/src/translations/es.json";
import fr from "../admin/src/translations/fr.json";
import itLocale from "../admin/src/translations/it.json";
import nl from "../admin/src/translations/nl.json";
import pl from "../admin/src/translations/pl.json";
import pt from "../admin/src/translations/pt.json";
import tr from "../admin/src/translations/tr.json";
import {
  buildFullCalendarTimeFormat,
  getLocalizedCalendarBundle,
  isRtlLocale,
  resolveCalendarDirection,
  resolveFullCalendarLocale,
  resolveLocaleFirstDay,
  SUPPORTED_CALENDAR_LOCALES,
} from "../shared/localization";
import {
  CALENDAR_COLOR_PALETTES,
  CALENDAR_THEME_PRESETS,
  detectEffectiveColorScheme,
  resolveCalendarTheme,
} from "../shared/types";

describe("FullCalendar Localization & 10-Locale Translation Parity", () => {
  it("ensures all 10 locales contain identical translation keys and non-empty strings", () => {
    const locales: Record<string, Record<string, string>> = {
      en,
      es,
      fr,
      de,
      pt,
      it: itLocale,
      nl,
      pl,
      tr,
      ar,
    };
    const baseKeys = Object.keys(en).sort();
    expect(baseKeys.length).toBeGreaterThanOrEqual(20);

    for (const [, dict] of Object.entries(locales)) {
      const keys = Object.keys(dict).sort();
      expect(keys).toEqual(baseKeys);
      for (const k of keys) {
        expect(typeof dict[k]).toBe("string");
        expect(dict[k].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("resolves FullCalendar LocaleInput bundles, RTL direction, firstDay, and 12h/24h time formats", () => {
    expect(SUPPORTED_CALENDAR_LOCALES.length).toBe(10);

    // Locale precedence: runtimeOverride > defaultLocaleSetting > uiLocale
    expect(resolveFullCalendarLocale("en", "auto", "auto")).toBe("en");
    expect(resolveFullCalendarLocale("fr-FR", "auto", "auto")).toBe("fr");
    expect(resolveFullCalendarLocale("en", "es", "auto")).toBe("es");
    expect(resolveFullCalendarLocale("en", "es", "ar-SA")).toBe("ar");

    // RTL detection & explicit direction override
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("he")).toBe(true);
    expect(isRtlLocale("es")).toBe(false);
    expect(resolveCalendarDirection("ar", "auto")).toBe("rtl");
    expect(resolveCalendarDirection("ar", "ltr")).toBe("ltr");
    expect(resolveCalendarDirection("es", "auto")).toBe("ltr");

    // Locale-specific firstDay & buttonText bundle
    const arBundle = getLocalizedCalendarBundle("ar");
    expect(arBundle.direction).toBe("rtl");
    expect(arBundle.buttonText.today).toBe("اليوم");
    expect(resolveLocaleFirstDay("ar", null)).toBe(6); // Saturday
    expect(resolveLocaleFirstDay("es", null)).toBe(1); // Monday
    expect(resolveLocaleFirstDay("en", null)).toBe(0); // Sunday
    expect(resolveLocaleFirstDay("ar", 1)).toBe(1); // Explicit override

    // 24h vs 12h time format
    expect(buildFullCalendarTimeFormat(true).hour12).toBe(false);
    expect(buildFullCalendarTimeFormat(false).hour12).toBe(true);
  });

  it("resolves modern FullCalendar themes (Breezy, Monarch, Forma, Pulse, Classic, Shadcn, MUI) across light/dark schemes and accent palettes", () => {
    const themeKeys = Object.keys(CALENDAR_THEME_PRESETS);
    for (const key of [
      "breeze",
      "monarch",
      "forma",
      "pulse",
      "classic",
      "shadcn",
      "mui",
      "emerald",
      "sand",
      "midnight",
    ]) {
      expect(themeKeys).toContain(key);
    }
    expect(Object.keys(CALENDAR_COLOR_PALETTES).length).toBeGreaterThanOrEqual(
      7
    );

    // Breezy (tinted event style, 10px container radius)
    const breezyLight = resolveCalendarTheme("breeze", "light", "default");
    expect(breezyLight.eventStyle).toBe("tinted");
    expect(breezyLight.containerRadius).toBe("10px");
    expect(breezyLight.primaryColor).toBe("#0284C7");

    // Forma (6px left accent-bar event style, top-bar Today highlight)
    const formaDarkEmerald = resolveCalendarTheme("forma", "dark", "emerald");
    expect(formaDarkEmerald.eventStyle).toBe("accent-bar");
    expect(formaDarkEmerald.todayHeaderAccent).toBe("top-bar");
    expect(formaDarkEmerald.primaryColor).toBe("#34D399");
    expect(formaDarkEmerald.cellBg).toBe("#030712");

    // Monarch (Material 3 Expressive: solid event style, centered header, 14px radius)
    const monarchRose = resolveCalendarTheme("monarch", "light", "rose");
    expect(monarchRose.eventStyle).toBe("solid");
    expect(monarchRose.dayNumberAlign).toBe("center");
    expect(monarchRose.containerRadius).toBe("14px");
    expect(monarchRose.primaryColor).toBe("#E11D48");

    // Shadcn & MUI design-system themes
    const shadcnDark = resolveCalendarTheme("shadcn", "dark", "default");
    expect(shadcnDark.category).toBe("design-system");
    expect(shadcnDark.eventStyle).toBe("tinted");
    expect(shadcnDark.cellBg).toBe("#030712");

    const muiLight = resolveCalendarTheme("mui", "light", "blue");
    expect(muiLight.category).toBe("design-system");
    expect(muiLight.eventStyle).toBe("solid");
    expect(muiLight.primaryColor).toBe("#0F6CBD");

    // Auto colorScheme detection from Strapi Admin neutral0 token (#212134 dark vs #ffffff light)
    expect(detectEffectiveColorScheme("auto", "#212134")).toBe("dark");
    expect(detectEffectiveColorScheme("auto", "#181826")).toBe("dark");
    expect(detectEffectiveColorScheme("auto", "#ffffff")).toBe("light");
    expect(detectEffectiveColorScheme("dark", "#ffffff")).toBe("dark");
    expect(detectEffectiveColorScheme("light", "#212134")).toBe("light");

    const autoDarkBreeze = resolveCalendarTheme(
      "breeze",
      "auto",
      "default",
      "#212134"
    );
    expect(autoDarkBreeze.cellBg).toBe("#030712");
    expect(autoDarkBreeze.headerBg).toBe("#111827");
  });

  it("orders recurrence presets so the selected startDate weekday (e.g. Every Sunday) appears first after Single Entry", () => {
    // 2026-11-01 is a Sunday
    const sundayPresets = buildOrderedRecurrencePresets([], "2026-11-01T17:00");
    expect(sundayPresets[0]).toEqual({
      id: "every-su",
      label: "Every Sunday",
      rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=SU",
    });

    // 2026-10-30 is a Friday
    const fridayPresets = buildOrderedRecurrencePresets([], "2026-10-30T13:00");
    expect(fridayPresets[0]?.rrule).toBe("FREQ=WEEKLY;INTERVAL=1;BYDAY=FR");
  });
});
