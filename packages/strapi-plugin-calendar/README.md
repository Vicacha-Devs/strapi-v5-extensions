# `@vicacha-devs/strapi-plugin-calendar`

Enterprise, **100% generic Multi-Collection Calendar, Scheduler, Non-Gregorian `RSCALE` Recurrence, Dual-Calendar Overlay, and iCal (`.ics`) Syndication Plugin** for Strapi v5, powered by **FullCalendar v6** (`@fullcalendar/react`) and **Unicode CLDR / `@internationalized/date`**.

---

## ✨ Key Capabilities

1. **Multi-Collection Aggregation & No-Code Field Mapper**:
   - Aggregate events, bookings, Editorial deadlines, classes, or any Strapi v5 collection on a single unified calendar.
   - **No-Code Collection/Field Picker** in **Settings → Calendar Plugin → Sources & Calendar Settings** auto-discovers all collections and classifies their date/string/boolean fields so admins can map `titleField`, `startField`, `endField`, `allDayField`, `rruleField`, `colorField`, and `categoryField` via dropdowns.
   - Companion plugins (`@vicacha-devs/strapi-plugin-events`, `@vicacha-devs/strapi-plugin-bookings`, etc.) can also register sources programmatically via `strapi.plugin('calendar').service('registry').registerSource(...)`.
2. **FullCalendar v6 Interactive Scheduler**:
   - **5 Views out of the box**: Month (`dayGridMonth`), Week (`timeGridWeek`), Day (`timeGridDay`), Agenda (`listMonth`), and Year (`multiMonthYear`).
   - **Drag-and-Drop Rescheduling & Resize**: Drag events across days/times or resize durations to automatically update the underlying Strapi document's mapped `startField` and `endField`.
   - **Drag-to-Create Slot Selection**: Select any time range on the calendar to quick-create a new entry in any mapped collection or jump directly to the Strapi Content Manager.
   - **Configurable Operating Hours & Time Slots**: Customize `slotDuration`, `startHour`, `endHour`, and `firstDayOfWeek`.
3. **Multi-Calendar Systems & Dual-Calendar Day Cells (`Hijri`, `Hebrew`, `Persian`, etc.)**:
   - Supports 13 built-in Unicode CLDR calendar systems (`islamic-umalqura`, `islamic-civil`, `islamic-tbla`, `hebrew`, `persian`, `buddhist`, `chinese`, `japanese`, `indian`, `coptic`, `ethiopic`, `roc`, `iso8601`).
   - Renders secondary calendar dates directly inside FullCalendar day cells (`showInDayCell: true`) and inside the event side panel (`showInSidePanel: true`).
   - Supports **`dayOffset` (`-2..+2`)** for moon-sighting adjustments and **`overrideField`** for explicit document-level date strings (e.g. `hijriDate`).
4. **RFC 5545 `RRULE` + RFC 7529 `RSCALE` Non-Gregorian Recurrence Engine**:
   - Includes a custom field (`plugin::calendar.rrule`) with a visual builder and preset selector.
   - Supports standard Gregorian recurrence (`FREQ=WEEKLY;BYDAY=FR`) **and** non-Gregorian `RSCALE` recurrence (`RSCALE=ISLAMIC-UMALQURA;FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=1` for annual 1st of Ramadan, or `RSCALE=HEBREW` / `RSCALE=PERSIAN`).
5. **Unified RFC 5545 iCalendar (`.ics`) Feed**:
   - Public `/api/calendar/feed.ics` and single-event `/api/calendar/:documentId/invite.ics` endpoints with `?sourceId=`, `?category=`, `?from=`, and `?to=` filters for Google Calendar, Apple Calendar, and Outlook subscriptions.
6. **10 Admin Locales Included**:
   - `en`, `es`, `ar` (RTL), `tr`, `fr`, `de`, `pt`, `it`, `nl`, `pl`.

---

## 📦 Installation

```bash
pnpm add @vicacha-devs/strapi-plugin-calendar
```

---

## ⚙️ Configuration (`config/plugins.ts`)

```ts
export default () => ({
  calendar: {
    enabled: true,
    config: {
      defaultView: "dayGridMonth",
      defaultTimezone: "UTC",
      firstDayOfWeek: 1, // Monday
      slotDuration: "00:30:00",
      startHour: "06:00:00",
      endHour: "22:00:00",
      sources: [
        {
          id: "events",
          label: "Community Events",
          uid: "plugin::events.event",
          color: "#4945FF",
          enabled: true,
          fields: {
            title: "title",
            startDate: "startDate",
            endDate: "endDate",
            rrule: "recurrence",
            location: "location",
            category: "category",
            status: "eventStatus",
            summary: "summary",
            slug: "slug",
          },
        },
        {
          id: "bookings",
          label: "Facility Bookings",
          uid: "plugin::bookings.booking",
          color: "#059669",
          enabled: true,
          fields: {
            title: "customerName",
            startDate: "startDate",
            endDate: "endDate",
            status: "status",
          },
        },
      ],
      secondaryCalendars: [
        {
          id: "hijri",
          label: "Hijri (Umm al-Qura)",
          intlCalendar: "islamic-umalqura",
          dayOffset: 0,
          overrideField: "hijriDate",
          showInDayCell: true,
          showInSidePanel: true,
          enabled: true,
        },
      ],
      recurrencePresets: [
        {
          id: "ramadan-start",
          label: "Every 1st of Ramadan (Hijri Yearly)",
          rrule: "RSCALE=ISLAMIC-UMALQURA;FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=1",
          description: "Recurs annually on 1 Ramadan in the Islamic Umm al-Qura calendar",
        },
      ],
    },
  },
});
```

---

## 🔌 Programmatic Companion Plugin API

Other plugins (such as `@vicacha-devs/strapi-plugin-events` or `@vicacha-devs/strapi-plugin-bookings`) can register their collections automatically during `bootstrap`:

```ts
const calendarRegistry = strapi.plugin("calendar")?.service("registry");

await calendarRegistry?.registerSource({
  id: "events-plugin",
  label: "Events",
  uid: "plugin::events.event",
  color: "#4945FF",
  enabled: true,
  fields: {
    title: "title",
    startDate: "startDate",
    endDate: "endDate",
    rrule: "recurrence",
    location: "location",
    category: "category",
    status: "eventStatus",
  },
});
```

---

## 🌐 REST API Endpoints

### Content API (`/api/calendar/*`)
- `GET /api/calendar/occurrences?from=2026-05-01T00:00:00Z&to=2026-05-31T23:59:59Z&sourceId=events`
- `GET /api/calendar/feed.ics?sourceId=events&category=Religious`
- `GET /api/calendar/:documentId/invite.ics`

### Admin API (`/calendar/*`)
- `GET /calendar/calendar` — Fetch occurrences across all enabled sources
- `POST /calendar/calendar/reschedule` — Drag-and-drop / resize reschedule handler
- `POST /calendar/calendar/quick-create` — Slot selection quick-create handler
- `GET /calendar/content-types` — Discover collections & fields for the No-Code Mapper
- `GET /calendar/settings` / `PUT /calendar/settings` — Read or update plugin settings
- `POST /calendar/clear-settings` — Reset settings to `config/plugins.ts` defaults

---

## 🧪 Testing

```bash
npm test
```

## 📄 License

MIT © Vicacha Devs
