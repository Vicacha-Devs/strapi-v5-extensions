---
title: "Başlangıç Kılavuzu"
description: "@vicacha-devs Strapi v5 eklentilerinin kurulumu, config/plugins.ts yapılandırması ve doğrulanması."
---

## Sistem Gereksinimleri

| Bileşen     | Desteklenen Sürüm                  | Teknik Notlar                                                          |
| :---------- | :--------------------------------- | :--------------------------------------------------------------------- |
| **Strapi**  | `^5.0.0` (`5.39.0` test edildi)    | Document Service API (`strapi.documents`) ve Design System v2 kullanır |
| **Node.js** | `>=20.16.0` (Node 24 LTS önerilir) | Yerel ESM ve Ed25519 kriptografik imzalama desteği                     |
| **pnpm**    | `>=10.0.0` (`pnpm@10.33.3`)        | `hoistPattern: ["*", "!@strapi/*"]` ile peer bağımlılık izolasyonu     |

```bash
pnpm add @vicacha-devs/strapi-plugin-calendar @vicacha-devs/strapi-plugin-events @vicacha-devs/strapi-plugin-bookings
```

![Strapi v5 Yönetim Paneli Genel Görünümü](/screenshots/dashboard-overview.png)
