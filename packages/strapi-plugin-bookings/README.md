# `@vicacha-devs/strapi-plugin-bookings`

Generic **Bookings, Appointments, Resource Scheduling & Time-Slot Availability Engine** for **Strapi v5**, powered by [`@vicacha-devs/strapi-plugin-calendar`](../strapi-plugin-calendar).

---

## Key Features

- **Bookable Resources & Operating Schedules (`plugin::bookings.resource`)**:
  - Model any bookable resource: services, consultations, appointments, rooms, staff members, or equipment.
  - Supports both **interval slicing** (`slotDurationMinutes` + `bufferBeforeMinutes` + `bufferAfterMinutes`) and **named time windows** (`mode: 'window'`, e.g. `morning` `09:00-12:00`, `afternoon` `14:00-17:00`).
  - Per-slot capacity (`capacityPerSlot`), maximum party size (`maxPartySize`), minimum lead-time hours (`minLeadTimeHours`), maximum advance horizon (`maxAdvanceDays`), and blackout periods (`blackoutDates`).
- **Reservations & Self-Service Token Workflows (`plugin::bookings.booking`)**:
  - Atomic capacity and double-booking validation across overlapping slots and buffer windows.
  - Automatic staff/host assignment matching `preferredLanguage` and real-time slot availability.
  - Cryptographically generated self-service reschedule & cancel tokens (`SHA-256` hashed at rest, verified with `crypto.timingSafeEqual`).
- **Powered by `@vicacha-devs/strapi-plugin-calendar`**:
  - Renders `<FullCalendarCanvas />` in the Strapi v5 Admin panel with drag-and-drop rescheduling, slot quick-create, and secondary calendar badges (Hijri, Hebrew, Persian, Buddhist, etc.).
  - Automatically registers `plugin::bookings.booking` as a companion source in the unified Strapi Calendar on server bootstrap.
- **100% Generic & Extensible**:
  - Extend `resource` and `booking` schemas via `schemaExtensions` in `config/plugins.ts` without forking the plugin.
  - Map existing Strapi collections into the Bookings Calendar & Ledger via `sources`.
- **10-Locale Admin UI**:
  - Ships with full translations for `en`, `es`, `ar`, `fr`, `de`, `pt`, `tr`, `id`, `ur`, and `zh`.
