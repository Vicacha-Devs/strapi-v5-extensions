# `@vicacha-devs/strapi-plugin-events`

Enterprise-grade **Events, RFC 5545 Recurrence (`RRULE`), Multi-Calendar System Engine, Unified Admin Calendar View, RSVP/Capacity/Waitlist & iCal (`.ics`)** plugin for **Strapi v5**.

---

## Features

1. **Full Strapi v5 Admin Calendar View (`/admin/plugins/events`)**
   - **5 View Modes**: **Month**, **Week**, **Day**, **Agenda**, and **Attendees & Check-In**.
   - **Dual-Calendar Grid & Overlay Switcher**: Switch between Gregorian-only or overlay any secondary calendar system (`Hijri`, `Hebrew`, `Persian`, `Buddhist`, `Chinese Lunar`, `Japanese`, etc.) directly inside the Month/Week day cells and occurrence drawer.
   - **Drag-and-Drop Rescheduling**: Drag an occurrence to a new date to either reschedule the entire series or create a single-occurrence override (`overrides[YYYY-MM-DD]`).
   - **Quick-Create Modal**: Click any day cell to create and publish an event with configurable `recurrencePresets` and RSVP capacity.
2. **Extensible Secondary Calendar Systems (`secondaryCalendars` + Custom Formatters)**
   - Built-in ECMA-402 / Unicode CLDR support (`islamic-umalqura`, `islamic-civil`, `hebrew`, `persian`, `buddhist`, `japanese`, `chinese`, `indian`, `coptic`, `ethiopic`).
   - Configurable `dayOffset` (`-2` to `+2` days) for lunar sighting or regional adjustments.
   - Per-document override field support (`overrideField` / `alternateDateFields`, e.g. `hijriDate`) so manual dates override the base occurrence while recurring occurrences dynamically compute their dates.
   - Programmatic custom date formatter registry (`registerCalendarFormatter(id, fn)`) for custom non-Intl calendars (e.g., fiscal quarters, academic weeks).
3. **Declarative Schema & Field Extensions (`schemaExtensions`, `customFields`)**
   - Extend built-in `plugin::events.event` and `plugin::events.registration` schemas directly from `config/plugins.ts` without modifying plugin source files.
   - Pass arbitrary collection attributes (`customFields: ['hijriDate', 'speaker', ...]`) through to `ExpandedOccurrence.customFields`.
4. **Hybrid Content Model**
   - Ships ready-to-use `plugin::events.event` and `plugin::events.registration` Content-Types (including generic `alternateDates` and `metadata` JSON fields) **and** maps any existing Strapi v5 collection types onto one unified Calendar View and API.
5. **RFC 5545 Recurrence (`plugin::events.rrule`) & iCal (`.ics`) Syndication**
   - Visual `RRuleInput` custom field (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`, `INTERVAL`, `BYDAY`, `BYMONTHDAY`, `COUNT`, `UNTIL`, `exdates`, and per-occurrence `overrides`).
   - Public `.ics` subscription feed (`/api/events/feed.ics`) and single-event `.ics` invites.
6. **RSVP, Seat Capacity, Automatic Waitlist Promotion & 1-Click Check-In**
   - Enforces capacity per occurrence, automatically promotes waitlisted attendees when confirmed attendees cancel, and exports formula-injection-safe CSVs.

---

## Configuration (`config/plugins.ts`)

```ts
export default ({ env }) => ({
  events: {
    enabled: true,
    config: {
      defaultTimezone: env('EVENTS_TIMEZONE', 'UTC'),
      defaultCapacity: 100,
      waitlistEnabledByDefault: true,
      defaultMaxGuestsPerRegistration: 5,
      sendRsvpEmails: true,
      feedTitle: 'Organization Events Calendar',

      // 1. Optional Secondary Calendar Systems (Unicode CLDR or custom formatter ID)
      secondaryCalendars: [
        {
          id: 'hijri',
          label: 'Hijri (Umm al-Qura)',
          intlCalendar: 'islamic-umalqura',
          dayOffset: env.int('HIJRI_DAY_OFFSET', 0),
          overrideField: 'hijriDate',
          enabled: true,
        },
      ],

      // 2. Optional Custom Recurrence Presets for Quick-Create & RRuleInput
      recurrencePresets: [
        { id: 'daily', label: 'Daily', rrule: 'FREQ=DAILY;INTERVAL=1' },
        { id: 'weekly-fri', label: 'Weekly on Fridays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=FR' },
        { id: 'monthly', label: 'Monthly', rrule: 'FREQ=MONTHLY;INTERVAL=1' },
      ],

      // 3. Optional Declarative Schema Extensions on plugin::events.event / registration
      schemaExtensions: {
        event: {
          hijriDate: {
            type: 'string',
            pluginOptions: { i18n: { localized: true } },
          },
        },
      },

      // 4. Mapped Collection Sources
      sources: [
        {
          id: 'public-events',
          label: 'Events',
          uid: 'api::event.event',
          color: '#0D9488',
          enabled: true,
          fields: {
            title: 'title',
            startDate: 'startDate',
            endDate: 'endDate',
            rrule: 'recurrence',
            location: 'location',
            category: 'category',
            summary: 'summary',
            slug: 'slug',
            capacity: 'capacity',
            rsvpEnabled: 'rsvpEnabled',
            alternateDateFields: {
              hijri: 'hijriDate',
            },
            customFields: ['hijriDate', 'featured'],
          },
        },
      ],
    },
  },
});
```

---

## Registering a Custom Programmatic Date System

To add a custom non-Intl date system (such as Fiscal Quarters or Academic Weeks), register a formatter in your Strapi application's `src/index.ts`:

```ts
export default {
  bootstrap({ strapi }) {
    strapi
      .plugin('events')
      .service('occurrence')
      .registerCalendarFormatter('custom-fiscal', (date, { compact }) => {
        const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
        return compact ? `Q${quarter}` : `FY${date.getUTCFullYear()} Q${quarter}`;
      });
  },
};
```
