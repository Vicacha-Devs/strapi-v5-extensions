---
title: "Eklentiler Arası Köprüler"
description: "calendar, events, bookings, donations, certificates, islam ve inbox eklentileri arasındaki otomatik çalışma zamanı köprüleri."
---

## Otomatik Entegrasyon Matrisi

| Kaynak Eklenti  | Hedef Eklenti             | Çalışma Zamanı Davranışı                                                                                          |
| :-------------- | :------------------------ | :---------------------------------------------------------------------------------------------------------------- |
| **`events`**    | **`calendar`**            | `plugin::events.event` kayıtlarını RRULE tekrarıyla birlikte birleşik FullCalendar çalışma alanına kaydeder.      |
| **`bookings`**  | **`calendar`**            | Onaylanan ve bekleyen `plugin::bookings.booking` rezervasyonlarını birleşik takvimde gösterir.                    |
| **`donations`** | **`certificates`**        | Bağış veya fatura ödemesi onaylandığında otomatik olarak Ed25519 imzalı sertifika/makbuz üretir.                  |
| **`islam`**     | **`calendar` ve `inbox`** | Hilal gözlemi onaylandığında Hicri gün farkını (`dayOffset`) günceller ve `inbox` üzerinde duyuru bandı yayınlar. |

![Birleşik Takvim Çalışma Alanı](/screenshots/calendar-admin.png)
