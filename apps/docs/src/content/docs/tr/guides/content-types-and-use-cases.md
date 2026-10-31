---
title: "İçerik Türü Varlıkları ve Kullanım Senaryoları"
description: "14 @vicacha-devs Strapi v5 eklentisindeki 25 içerik türü varlığı, 2 paylaşılan bileşen ve 4 özel alan: nasıl çalışırlar, ne işe yararlar ve nerede bulunurlar."
---

## Strapi v5 İçinde İçerik Türü Varlıkları Nerede Bulunur?

| Strapi v5 Konumu                                  | URL Yolu / API                                          | Ne Bulunur?                                                                                                       |
| :------------------------------------------------ | :------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------- |
| **İçerik Yöneticisi (Content Manager)**           | `/admin/content-manager/collection-types/plugin::<uid>` | 21 görünür eklenti koleksiyonu (`Booking`, `Event`, `Issued Certificate`, `Publication` vb.).                     |
| **İçerik Türü Oluşturucu (Content-Type Builder)** | `/admin/plugins/content-type-builder`                   | 21 görünür şema, `shared.seo` / `shared.open-graph` bileşenleri ve `rrule`, `currency`, `country` özel alanları.  |
| **Eklenti Çalışma Alanları**                      | `/admin/plugins/<plugin-id>`                            | Özel yönetim ekranları (FullCalendar planlayıcı, Ed25519 sertifika sihirbazı, namaz vakitleri, SLA gelen kutusu). |
| **Document Service API**                          | `strapi.documents("plugin::<id>.<entity>")`             | Sunucu tarafı CRUD işlemleri ve `config.schemaExtensions` ile çalışma zamanı şema genişletme.                     |
