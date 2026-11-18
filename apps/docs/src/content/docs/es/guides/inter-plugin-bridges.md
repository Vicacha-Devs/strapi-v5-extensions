---
title: "Puentes entre Plugins"
description: "Descubrimiento automático en tiempo de arranque entre calendar, events, bookings, donations, certificates, islam e inbox."
---

## Topología de Integración Automática

| Plugin Origen   | Plugin Destino           | Comportamiento en `bootstrap`                                                                                       |
| :-------------- | :----------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **`events`**    | **`calendar`**           | Registra automáticamente la colección `plugin::events.event` como fuente del calendario unificado con reglas RRULE. |
| **`bookings`**  | **`calendar`**           | Registra las reservas `plugin::bookings.booking` con colores por estado (`confirmed`, `pending`, `cancelled`).      |
| **`donations`** | **`certificates`**       | Emite certificados fiscales firmados con Ed25519 al confirmarse el pago de una donación o factura.                  |
| **`islam`**     | **`calendar` & `inbox`** | Sincroniza el ajuste lunar Hijri (`dayOffset`) y publica alertas globales al confirmarse el avistamiento del Hilal. |

![Calendario Unificado con Eventos y Reservas](/screenshots/calendar-admin.png)
