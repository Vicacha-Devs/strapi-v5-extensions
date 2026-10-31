---
title: "Primeros Pasos"
description: "Instalación, configuración en config/plugins.ts y verificación de los plugins @vicacha-devs en Strapi v5."
---

## Requisitos del Sistema

| Componente  | Versión Requerida                     | Notas Técnicas                                                           |
| :---------- | :------------------------------------ | :----------------------------------------------------------------------- |
| **Strapi**  | `^5.0.0` (`5.39.0` verificado)        | Utiliza Document Service API (`strapi.documents`) y Design System v2     |
| **Node.js** | `>=20.16.0` (Node 24 LTS recomendado) | Soporte nativo ESM y criptografía Ed25519 (`node:crypto`)                |
| **pnpm**    | `>=10.0.0` (`pnpm@10.33.3`)           | Aislamiento de dependencias peer con `hoistPattern: ["*", "!@strapi/*"]` |

## 1. Instalación de Paquetes

```bash
pnpm add @vicacha-devs/strapi-plugin-calendar @vicacha-devs/strapi-plugin-events @vicacha-devs/strapi-plugin-bookings
```

## 2. Configuración en `config/plugins.ts`

```ts
export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => ({
  calendar: {
    enabled: true,
    config: { defaultTimezone: env("CALENDAR_DEFAULT_TIMEZONE", "America/Bogota") },
  },
  events: { enabled: true },
  bookings: { enabled: true },
});
```

![Panel de Administración Strapi v5](/screenshots/dashboard-overview.png)
