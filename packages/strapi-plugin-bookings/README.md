# `@vicacha-devs/strapi-plugin-bookings`

Generic **Bookings, Appointments, Resource Scheduling & Time-Slot Availability Engine** for **Strapi v5**, powered by [`@vicacha-devs/strapi-plugin-calendar`](../strapi-plugin-calendar) as a required dependency.

---

## Key Features

- **Bookable Resources & Operating Schedules (`plugin::bookings.resource`)**:
  - Model any bookable resource: services, consultations, appointments, rooms, staff members, or equipment.
  - Supports both **interval slicing** (`slotDurationMinutes` + `bufferBeforeMinutes` + `bufferAfterMinutes`) and **named time windows** (`mode: 'window'`, e.g. `morning` `09:00-12:00`, `afternoon` `14:00-17:00`).
  - Per-slot capacity (`capacityPerSlot`), maximum party size (`maxPartySize`), minimum lead-time hours (`minLeadTimeHours`), maximum advance horizon (`maxAdvanceDays`), seasonal schedule overrides (`seasonalSchedules`), holiday rules (`holidayRules`), and blackout periods (`blackoutDates`).
- **Reservations & Self-Service Token Workflows (`plugin::bookings.booking`)**:
  - Atomic capacity and double-booking validation across overlapping slots and buffer windows.
  - Automatic staff/host assignment matching `preferredLanguage` and real-time slot availability.
  - Cryptographically generated self-service reschedule & cancel tokens (`SHA-256` hashed at rest, verified with `crypto.timingSafeEqual`).
- **Dedicated Reservations Approval & Resource Workspace (`/admin/plugins/bookings`) + Unified Calendar Integration**:
  - **Required Dependency on `@vicacha-devs/strapi-plugin-calendar`**: Automatically registers `plugin::bookings.booking` into the central `/admin/plugins/calendar` registry on server bootstrap so all schedule grid views are unified in one place (with a 1-click **Open in Calendar** shortcut to `/admin/plugins/calendar?source=bookings`).
  - **Reservations Approval, Resource Filter & Ledger Workspace**: KPI summary cards, bookable resource / status / search filters, the reservations ledger, `BookingSidePanel` for Approve / Reject / Cancel / Complete & staff host assignment, and `+ New Booking` creation modal.
- **100% Generic & Extensible**:
  - Extend `resource` and `booking` schemas via `schemaExtensions` in `config/plugins.ts` without forking the plugin.
  - Map existing Strapi collections into the Bookings Ledger via `sources`.
- **10-Locale Admin UI**:
  - Ships with full translations for `en`, `es`, `ar`, `fr`, `de`, `pt`, `tr`, `id`, `ur`, and `zh`.
