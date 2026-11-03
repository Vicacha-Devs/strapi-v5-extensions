---
title: "i18n, RTL y Calendarios Litúrgicos"
description: "Soporte completo para 13 idiomas en el Admin UI, adaptación automática RTL (árabe y urdu) y calendarios secundarios CLDR."
---

## Paridad de Traducción en 13 Idiomas

Todos los plugins incluyen diccionarios verificados por pruebas unitarias para `en`, `es`, `ar` (RTL), `tr`, `fr`, `de`, `pt`, `it`, `nl`, `pl`, `id`, `ur` (RTL) y `zh`.

## Calendarios Secundarios CLDR (`islamic-umalqura`, `hebrew`, `persian`)

El motor compartido `@vicacha-devs/strapi-plugin-calendar/shared` permite renderizar fechas secundarias Hijri (Umm al-Qura con ajuste lunar `-2` a `+2`), Hebreas y Persas junto al calendario Gregoriano en todas las vistas.
