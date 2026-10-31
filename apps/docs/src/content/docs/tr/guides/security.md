---
title: "Güvenlik ve Kriptografi"
description: "Ed25519 dijital imzalar, sabit zamanlı HMAC-SHA256 webhook doğrulaması, SSRF/Path Traversal koruması ve PII maskeleme."
---

## Derinlemesine Güvenlik Kontrolleri

1. **Ed25519 Dijital İmzalar (`certificates`)**: Her sertifika kanonik JSON yükü üzerinden Ed25519 özel anahtarıyla imzalanır ve QR kod ile doğrulanır.
2. **Sabit Zamanlı HMAC-SHA256 Webhooks (`donations`, `certificates`)**: Zamanlama saldırılarını önlemek için `crypto.timingSafeEqual` kullanılır.
3. **SSRF ve Dosya Yolu Güvenliği (`resources`, `media-feeds`)**: Özel IP blokları engellenir ve dosya adları `path.basename()` ile temizlenir.
4. **Tuzlanmış PII Özeti ve Maskeleme**: Kimlik numaraları seri bazlı tuz ile özetlenir ve `***-***-4821` biçiminde maskelenir.
