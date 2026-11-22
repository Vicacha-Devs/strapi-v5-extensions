---
title: "Herramientas, CI y Lanzamientos"
description: "Flujo de calidad con oxfmt, oxlint, ESLint v10, Husky, Commitlint, publint, Semantic Release y portal de documentación."
---

## Cómo Usar y Mantener el Portal de Documentación (`apps/docs`)

1. **Resumen (`/<plugin-slug>/`)**: Sincronizado desde `packages/<dir>/README.md` con capturas Playwright del Admin de Strapi v5.
2. **Entidades Content-Type y Casos de Uso (`/<plugin-slug>/use-cases/`)**: Entidades Content-Type, diagramas interactivos Pele (Mermaid) y capturas por caso de uso.
3. **Guía de Desarrollo y Admin UI (`/<plugin-slug>/guide/`)**: Referencia de Content-Types (`schema.json`), cobertura i18n de 13 idiomas, ejemplos TypeScript y tabla de rutas.
4. **Referencia OpenAPI 3.0.3 (`/<plugin-slug>/api/`)**: Generada automáticamente por `scripts/generate-openapi.ts`.
5. **Índice IA (`/llms.txt` y `/llms-full.txt`)**: Contexto completo listo para asistentes de código e IA.

```bash
pnpm --filter @vicacha-devs/docs dev
pnpm --filter @vicacha-devs/docs build
pnpm --filter @vicacha-devs/docs test:judges
pnpm format:check && pnpm lint && pnpm verify
```

## Generador de Plugins y Centro de Control QA

Crea nuevos plugins con paridad de 5 idiomas (`en/es/ar/tr/fr`), pruebas offline y conexión opcional al `apps/dashboard`, y ejecuta verificaciones QA multi-repositorio:

```bash
pnpm plugin:new -- announcements --display-name "Announcements" --with-content-type --wire-dashboard
pnpm qa:doctor && pnpm qa:judges && pnpm qa:verify && pnpm qa:report
pnpm qa:docker:up && pnpm qa:smoke && pnpm qa:e2e && pnpm qa:docker:down
```

La infraestructura QA (`docker-compose.qa.yml`) usa puertos aislados en `127.0.0.1` (`5434/6381/8110/1027`) y el flujo `.github/workflows/qa-e2e.yml` ejecuta pruebas smoke y Playwright del Dashboard automáticamente.
