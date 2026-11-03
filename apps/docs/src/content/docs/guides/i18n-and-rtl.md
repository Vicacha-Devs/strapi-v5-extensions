---
title: i18n, RTL & Secondary Calendars
description: 13-locale Strapi Admin UI parity, Arabic/Urdu RTL layout adaptation, and CLDR Hijri, Hebrew, and Persian liturgical calendars.
---

## 13-Locale Admin UI Translation Parity

Every `@vicacha-devs/strapi-plugin-*` package ships with complete, key-verified translation files under `admin/src/translations/` for **13 languages**:

| Locale Code | Language               | Direction | Included in All `@vicacha-devs` Plugins |
| :---------- | :--------------------- | :-------- | :-------------------------------------- |
| `en`        | English                | `LTR`     | Yes (Default)                           |
| `es`        | Español (Spanish)      | `LTR`     | Yes                                     |
| `ar`        | العربية (Arabic)       | `RTL`     | Yes                                     |
| `tr`        | Türkçe (Turkish)       | `LTR`     | Yes                                     |
| `fr`        | Français (French)      | `LTR`     | Yes                                     |
| `de`        | Deutsch (German)       | `LTR`     | Yes                                     |
| `pt`        | Português (Portuguese) | `LTR`     | Yes                                     |
| `it`        | Italiano (Italian)     | `LTR`     | Yes                                     |
| `nl`        | Nederlands (Dutch)     | `LTR`     | Yes                                     |
| `pl`        | Polski (Polish)        | `LTR`     | Yes                                     |
| `id`        | Bahasa Indonesia       | `LTR`     | Yes                                     |
| `ur`        | اردو (Urdu)            | `RTL`     | Yes                                     |
| `zh`        | 中文 (Chinese)         | `LTR`     | Yes                                     |

Each plugin's unit test suite (`tests/*.test.ts`) asserts that every locale exports the exact same set of translation keys as `en.json` with zero empty strings.

---

## Automatic RTL Layout Adaptation (`ar`, `ur`)

In `@vicacha-devs/strapi-plugin-calendar`, `@vicacha-devs/strapi-plugin-events`, `@vicacha-devs/strapi-plugin-bookings`, and `@vicacha-devs/strapi-plugin-islam`:

- When the active Strapi Admin locale is `ar` or `ur` (or when `document.dir === 'rtl'`), FullCalendar v6 automatically switches `direction: 'rtl'`, flipping day-grid columns, navigation arrows, and time-grid axes.
- Arabic Quranic text, Hadith citations, and Dua invocations render with dedicated RTL typography while keeping code snippets, ISO timestamps, and serial numbers strictly `LTR`.

---

## CLDR Secondary Liturgical Calendars

The `@vicacha-devs/strapi-plugin-calendar/shared` engine provides zero-dependency secondary calendar conversion built on `Intl.DateTimeFormat` and `@internationalized/date`:

| Calendar ID     | `intlCalendar` Identifier | Example Output       | Typical Use Case                                                                           |
| :-------------- | :------------------------ | :------------------- | :----------------------------------------------------------------------------------------- |
| `hijri`         | `islamic-umalqura`        | `15 Ramadan 1447 AH` | Islamic observances, Ramadan/Eid schedules, Hilal moon-sighting offset (`-2` to `+2` days) |
| `islamic-civil` | `islamic-civil`           | `15 Ramadan 1447 AH` | Tabular civil Hijri calculations                                                           |
| `hebrew`        | `hebrew`                  | `15 Nisan 5786`      | Jewish liturgical & community calendars                                                    |
| `persian`       | `persian`                 | `1 Farvardin 1405`   | Solar Hijri (Jalali / Nowruz) schedules                                                    |

### Configuring Multiple Secondary Calendars

```ts
// config/plugins.ts
export default () => ({
  calendar: {
    enabled: true,
    config: {
      secondaryCalendars: [
        {
          id: "hijri",
          label: "Hijri (Umm al-Qura)",
          intlCalendar: "islamic-umalqura",
          dayOffset: 0,
          overrideField: "hijriDate",
          enabled: true,
        },
        {
          id: "persian",
          label: "Solar Hijri (Persian)",
          intlCalendar: "persian",
          dayOffset: 0,
          enabled: false,
        },
      ],
    },
  },
});
```
