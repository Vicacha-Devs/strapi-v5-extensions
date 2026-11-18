---
title: "Arquitectura del Monorepo"
description: "Estructura pnpm + Turborepo, aislamiento de dependencias Strapi, compilación dual y límite estricto de 500 líneas por archivo."
---

## Aislamiento de Dependencias Peer (`pnpm-workspace.yaml`)

Para evitar duplicación de contextos de React y `@strapi/design-system`, el archivo `pnpm-workspace.yaml` aplica dos reglas esenciales:

- `hoistPattern: ["*", "!@strapi/*"]`: Impide que los paquetes `@strapi/*` se eleven a la raíz del monorepo.
- `linkWorkspacePackages: true`: Resuelve dependencias peer entre plugins (`@vicacha-devs/strapi-plugin-calendar`) directamente desde el espacio de trabajo local.

## Anatomía Dual (`admin` + `server` + `shared`)

Cada plugin exporta tres puntos de entrada validados con `publint ({ strict: true })` y `@strapi/sdk-plugin`:

1. `./strapi-admin`: Interfaz en React 18 + Strapi Design System v2 + 13 idiomas.
2. `./strapi-server`: Content-Types, controladores, servicios, políticas RBAC y rutas REST.
3. `./shared`: Motores puros en TypeScript (expansión RRULE, cálculo de turnos, calendarios CLDR e iCal/CSV).
