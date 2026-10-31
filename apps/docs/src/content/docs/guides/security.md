---
title: Security & Cryptography
description: Ed25519 digital signatures, constant-time HMAC-SHA256 webhooks, SSRF guards, path-traversal sanitization, and PII masking across @vicacha-devs Strapi v5 plugins.
---

## Defense-in-Depth Architecture

Every `@vicacha-devs/strapi-plugin-*` package is engineered against OWASP Top 10 and CWE security standards, validated by unit tests and our automated Security Judge.

| Security Control                           | Plugin(s)                                         | Cryptographic / Validation Primitive                                                                                                         |
| :----------------------------------------- | :------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ed25519 Digital Signatures**             | `certificates`                                    | Node.js `node:crypto` (`crypto.sign(null, canonicalPayload, privateKey)`) + canonical JSON serialization                                     |
| **HMAC-SHA256 Webhook Verification**       | `donations`, `certificates`                       | `crypto.createHmac('sha256', secret)` + `crypto.timingSafeEqual` constant-time digest comparison                                             |
| **Salted PII Hashing & Masking**           | `certificates`, `donations`                       | Per-serial SHA-256 salted national ID hashes + masked public verification (`***-***-4821`)                                                   |
| **SSRF & Outbound URL Validation**         | `certificates`, `media-feeds`                     | Strict HTTPS protocol enforcement + RFC 1918 / loopback (`127.0.0.0/8`, `169.254.169.254`, `10.0.0.0/8`, `::1`) blocklists                   |
| **Path Traversal & MIME Hardening**        | `resources`                                       | `path.basename()` sanitization, strict extension/MIME allow-lists, and `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` |
| **CSV & Formula Injection Neutralization** | `bookings`, `events`, `certificates`, `donations` | Prefixes leading `=`, `+`, `-`, `@`, `\t`, `\r` cells with a safe single quote before CSV export                                             |
| **Token-Verified Public Mutations**        | `bookings`, `events`, `inbox`                     | SHA-256 hashed cancellation, check-in, and double opt-in tokens stored as `private: true` attributes                                         |

---

## 1. Ed25519 Cryptographic Signing (`@vicacha-devs/strapi-plugin-certificates`)

When a certificate (`plugin::certificates.certificate`) is issued, its canonical payload (`serialNumber`, `templateSlug`, `recipientName`, `nationalIdHash`, `issuedAt`, `issuerName`) is signed using **Ed25519**:

```ts
import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

export function signCanonicalPayload(canonicalJson: string, privateKeyPem: string): string {
  const privateKey = createPrivateKey(privateKeyPem);
  const signature = sign(null, Buffer.from(canonicalJson, "utf8"), privateKey);
  return signature.toString("base64url");
}

export function verifyCanonicalPayload(
  canonicalJson: string,
  signatureBase64Url: string,
  publicKeyPem: string
): boolean {
  const publicKey = createPublicKey(publicKeyPem);
  return verify(
    null,
    Buffer.from(canonicalJson, "utf8"),
    publicKey,
    Buffer.from(signatureBase64Url, "base64url")
  );
}
```

Any modification to the recipient name, issue date, or serial number invalidates the Ed25519 signature immediately during public QR verification (`GET /api/certificates/verify/:serialNumber`).

---

## 2. Constant-Time HMAC-SHA256 Webhooks (`donations` & `certificates`)

Payment gateway webhooks (Wompi, Stripe) and e-signature webhooks (DocuSign Connect) verify signatures using `crypto.timingSafeEqual` to prevent timing side-channel attacks:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWebhookHmac(
  rawBody: string,
  providedHexSignature: string,
  secret: string
): boolean {
  if (!secret || !providedHexSignature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const actual = Buffer.from(providedHexSignature, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
```

---

## 3. Private Attributes & RBAC Permissions

- All sensitive hashes (`cancelTokenHash`, `nationalIdSalt`, `optInTokenHash`, `internalNotes`) are marked `"private": true` in their Strapi v5 `schema.json` definitions so they are never serialized in public `content-api` responses.
- Admin endpoints enforce granular RBAC action permissions (`admin::hasPermissions`) registered during plugin bootstrap.
