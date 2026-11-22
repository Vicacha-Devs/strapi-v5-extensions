---
title: "Araçlar, CI ve Sürüm Akışı"
description: "oxfmt, oxlint, ESLint v10, Husky, Commitlint, publint, Semantic Release ve dokümantasyon portalı iş akışı."
---

## Dokümantasyon Portalı Kullanımı ve Bakımı (`apps/docs`)

1. **Genel Bakış (`/<plugin-slug>/`)**: `packages/<dir>/README.md` dosyalarından ve Playwright yönetim paneli ekran görüntülerinden senkronize edilir.
2. **Geliştirici Kılavuzu (`/<plugin-slug>/guide/`)**: İçerik türü şemaları (`schema.json`), 13 dil çeviri kapsamı, TypeScript servis örnekleri ve uç nokta özet tablosu.
3. **Etkileşimli OpenAPI 3.0.3 Referansı (`/<plugin-slug>/api/`)**: `scripts/generate-openapi.ts` ile otomatik üretilir.
4. **Yapay Zeka Bağlam İndeksi (`/llms.txt` ve `/llms-full.txt`)**: Yapay zeka kodlama asistanları için tam dokümantasyon indeksi.

```bash
pnpm --filter @vicacha-devs/docs dev
pnpm --filter @vicacha-devs/docs build
pnpm --filter @vicacha-devs/docs test:judges
pnpm format:check && pnpm lint && pnpm verify
```

## Eklenti Oluşturucu ve QA Kontrol Merkezi

5 dil desteği (`en/es/ar/tr/fr`), çevrimdışı testler ve isteğe bağlı `apps/dashboard` bağlantısı ile yeni Strapi v5 eklentileri oluşturun ve çoklu depo QA raporları üretin:

```bash
pnpm plugin:new -- announcements --display-name "Announcements" --with-content-type --wire-dashboard
pnpm qa:doctor && pnpm qa:judges && pnpm qa:verify && pnpm qa:report
pnpm qa:docker:up && pnpm qa:smoke && pnpm qa:e2e && pnpm qa:docker:down
```

Yalıtılmış QA altyapısı (`docker-compose.qa.yml`) yalnızca `127.0.0.1` (`5434/6381/8110/1027`) üzerinde çalışır ve `.github/workflows/qa-e2e.yml` Dashboard Playwright E2E testlerini otomatik olarak çalıştırır.
