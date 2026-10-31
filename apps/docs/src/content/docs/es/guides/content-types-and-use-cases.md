---
title: "Entidades Content-Type y Casos de Uso"
description: "Directorio completo de las 25 entidades Content-Type, 2 componentes compartidos y 4 campos personalizados en Strapi v5: cómo funcionan, para qué sirven y dónde encontrarlos."
---

## Dónde Encontrar las Entidades Content-Type en Strapi v5

| Ubicación en Strapi v5             | Ruta / API                                              | Qué Encontrará                                                                                                                         |
| :--------------------------------- | :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------- |
| **Content Manager (Colecciones)**  | `/admin/content-manager/collection-types/plugin::<uid>` | Las 21 colecciones visibles (`Booking`, `Booking Resource`, `Broadcast Campaign`, `Event`, `Issued Certificate`, `Publication`, etc.). |
| **Content-Type Builder**           | `/admin/plugins/content-type-builder`                   | Esquemas de las 21 colecciones visibles, componentes `shared.seo` / `shared.open-graph` y campos `rrule`, `currency` y `country`.      |
| **Espacios de Trabajo de Plugins** | `/admin/plugins/<plugin-id>`                            | Interfaces especializadas (calendario FullCalendar, asistente de certificados Ed25519, horarios de oración, bandeja SLA, podcast RSS). |
| **Document Service API**           | `strapi.documents("plugin::<id>.<entity>")`             | Operaciones CRUD programáticas (`findMany`, `findOne`, `create`, `update`, `publish`) y extensión mediante `config.schemaExtensions`.  |
