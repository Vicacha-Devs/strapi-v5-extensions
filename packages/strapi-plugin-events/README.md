# `@vicacha-devs/strapi-plugin-events`

Enterprise-grade **Events, RFC 5545 Recurrence (`RRULE`), Multi-Calendar System Engine, RSVP/Capacity/Waitlist & iCal (`.ics`)** plugin for **Strapi v5**, powered by [`@vicacha-devs/strapi-plugin-calendar`](../strapi-plugin-calendar) as a required dependency.

---

## Features

1. **Dedicated Events RSVP, Waitlist & Check-In Workspace (`/admin/plugins/events`) + Unified Calendar Integration**
   - **Required Dependency on `@vicacha-devs/strapi-plugin-calendar`**: Automatically registers all event sources into the central `/admin/plugins/calendar` workspace on server bootstrap so all Month/Week/Day/Agenda/Year schedule views are unified in one place (with a 1-click **Open in Calendar** shortcut to `/admin/plugins/calendar?source=events`).
   - **RSVP, Waitlist & Attendee Check-In Workspace**: KPI summary cards (Total Registrations, Confirmed Seats, Checked-In Seats, Waitlisted Seats, Events with RSVPs), attendee search & status filters, 1-click attendee check-in, status updates with automatic waitlist promotion, Quick-Create Event panel, and formula-injection-safe CSV export.
2. **Extensible Secondary Calendar Systems (`secondaryCalendars` + Custom Formatters)**
   - Built-in ECMA-402 / Unicode CLDR support (`islamic-umalqura`, `islamic-civil`, `hebrew`, `persian`, `buddhist`, `japanese`, `chinese`, `indian`, `coptic`, `ethiopic`).
   - Configurable `dayOffset` (`-2` to `+2` days) for lunar sighting or regional adjustments.
   - Per-document override field support (`overrideField` / `alternateDateFields`, e.g. `hijriDate`) so manual dates override the base occurrence while recurring occurrences dynamically compute their dates.
   - Programmatic custom date formatter registry (`registerCalendarFormatter(id, fn)`) for custom non-Intl calendars (e.g., fiscal quarters, academic weeks).
3. **Declarative Schema & Field Extensions (`schemaExtensions`, `customFields`)**
   - Extend built-in `plugin::events.event` and `plugin::events.registration` schemas directly from `config/plugins.ts` without modifying plugin source files.
   - Pass arbitrary collection attributes (`customFields: ['hijriDate', 'speaker', ...]`) through to `ExpandedOccurrence.customFields`.
4. **Hybrid Content Model**
   - Ships ready-to-use `plugin::events.event` and `plugin::events.registration` Content-Types (including generic `alternateDates` and `metadata` JSON fields) **and** maps any existing Strapi v5 collection types onto the unified Calendar View and API.
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
