---
title: "البدء السريع"
description: "تثبيت وإعداد إضافات @vicacha-devs على نظام Strapi v5 والتحقق من جاهزيتها."
---

## متطلبات النظام الأساسية

| المكون      | الإصدار المطلوب                    | ملاحظات تقنية                                                         |
| :---------- | :-------------------------------- | :------------------------------------------------------------------- |
| **Strapi**  | `^5.0.0` (`5.39.0`)               | يعتمد على Document Service API (`strapi.documents`) ونظام التصميم v2 |
| **Node.js** | `>=20.16.0` (يُوصى بـ Node 24 LTS) | دعم أصلي لوحدات ESM والتوقيع الرقمي Ed25519                          |
| **pnpm**    | `>=10.0.0` (`pnpm@10.33.3`)       | عزل حزم Strapi عبر `hoistPattern: ["*", "!@strapi/*"]`               |

```bash
pnpm add @vicacha-devs/strapi-plugin-calendar @vicacha-devs/strapi-plugin-events @vicacha-devs/strapi-plugin-bookings
```

![لوحة تحكم Strapi v5 مع كافة الإضافات](/screenshots/dashboard-overview.png)
