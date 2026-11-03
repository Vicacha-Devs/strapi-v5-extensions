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
