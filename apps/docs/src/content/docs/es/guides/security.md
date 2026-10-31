---
title: "Seguridad y Criptografía"
description: "Firmas digitales Ed25519, webhooks HMAC-SHA256 en tiempo constante, prevención de SSRF/Path Traversal y protección de PII."
---

## Controles de Seguridad en Profundidad

1. **Firmas Criptográficas Ed25519 (`certificates`)**: Cada certificado serializa un payload canónico firmado con clave privada Ed25519 y verificable públicamente mediante código QR.
2. **Webhooks HMAC-SHA256 en Tiempo Constante (`donations`, `certificates`)**: Uso estricto de `crypto.timingSafeEqual` para validar notificaciones de Wompi, Stripe y DocuSign.
3. **Protección SSRF y Sanitización de Archivos (`resources`, `media-feeds`)**: Bloqueo de rangos IP privados/loopback y sanitización con `path.basename()` más cabeceras `X-Content-Type-Options: nosniff`.
4. **Enmascaramiento y Hash Salado de PII**: Los documentos de identidad se almacenan con sal única por certificado y se muestran enmascarados (`***-***-4821`).
