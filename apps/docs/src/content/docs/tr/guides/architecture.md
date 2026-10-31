---
title: "Monorepo Mimarisi"
description: "pnpm + Turborepo çalışma alanı yapısı, Strapi bağımlılık izolasyonu, çift paket derlemesi ve 500 satır modülerlik kuralı."
---

## Strapi Peer İzolasyonu (`pnpm-workspace.yaml`)

`pnpm-workspace.yaml` içindeki `hoistPattern: ["*", "!@strapi/*"]` ve `linkWorkspacePackages: true` ayarları, React bağlamlarının çoğaltılmasını önlerken eklentiler arası bağımlılıkları yerel olarak çözümler.

## Çift Paket Mimarisi (`admin` + `server` + `shared`)

1. `./strapi-admin`: React 18, Strapi Design System v2 ve 13 dilde yerelleştirilmiş yönetim arayüzü.
2. `./strapi-server`: İçerik türleri, denetleyiciler, servisler, RBAC politikaları ve REST API rotaları.
3. `./shared`: İzomorfik TypeScript motorları (RRULE, zaman dilimi hesaplama, Hicri/CLDR takvim ve iCal/CSV).
