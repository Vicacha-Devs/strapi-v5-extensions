---
title: "Dijital Sertifikalar (Ed25519) — Geliştirici Kılavuzu ve Yönetim Arayüzü"
description: "İçerik türü varlıkları, kullanım senaryoları, sunucu yapılandırması, servis API'si ve Strapi v5 Yönetim Paneli turu: @vicacha-devs/strapi-plugin-certificates."
---

## 1. Kurulum ve Bağımlılıklar

```bash
pnpm add @vicacha-devs/strapi-plugin-certificates
```

## 2. Sunucu Yapılandırması (`config/plugins.ts`)

Strapi v5 projenizin `config/plugins.ts` dosyasına eklenti yapılandırmasını ekleyin:

```ts
// config/plugins.ts
export default ({
  env,
}: {
  env: (key: string, defaultValue?: string) => string;
}) => ({
  certificates: {
    enabled: true,
    config: {
      organizationName: env("CERTIFICATES_ORG_NAME", "Central Organization"),
      verificationBaseUrl: env(
        "CERTIFICATES_VERIFY_URL",
        "https://example.org/verify"
      ),
    },
  },
});
```

![Dijital Sertifikalar (Ed25519) — Strapi v5 Settings Panel](/screenshots/certificates-settings.png)

## 3. Strapi v5 Yönetim Arayüzü (Admin UI) Turu

Etkinleştirildiğinde eklenti, Strapi Design System v2 bileşenlerini kullanarak çalışma alanını ve ayarlarını yönetim paneline kaydeder:

![Dijital Sertifikalar (Ed25519) — Strapi v5 Admin UI](/screenshots/certificates-admin.png)

### Yerelleştirilmiş Arayüz Etiketleri (Türkçe)

| Çeviri Anahtarı                                        | Arayüz Metni                |
| :----------------------------------------------------- | :-------------------------- |
| `field.certificate_template`                           | Sertifika Şablon            |
| `certificates.field.certificate_template`              | Sertifika Şablon            |
| `placeholder.select_certificate_template`              | Seçin: certificate template |
| `certificates.placeholder.select_certificate_template` | Seçin: certificate template |
| `field.recipient_full_legal_name`                      | Alıcı Tam Legal Ad          |
| `certificates.field.recipient_full_legal_name`         | Alıcı Tam Legal Ad          |
| `placeholder.e_g_carlos_andres_perez`                  | Örn: Carlos Andres Perez    |
| `certificates.placeholder.e_g_carlos_andres_perez`     | Örn: Carlos Andres Perez    |

## 4. İçerik Türü Varlıkları, Konumları ve Şemaları (`strapi.documents`)

Registers two Collection Types (`plugin::certificates.template` and `plugin::certificates.certificate`). Templates define reusable certificate layouts, signatory rules, witness counts, and serial prefixes; Issued Certificates store canonical JSON payloads signed with Ed25519 (`cryptographicSignature`, `publicKeyFingerprint`), salted PII hashes (`nationalIdHash`), and DocuSign envelope status. Supports `schemaExtensions` in `config/plugins.ts`.

```mermaid
flowchart LR
  Template["plugin::certificates.template (certificates_templates)"] -->|"layout & prefix"| Wizard["Issuance Service (Ed25519 Signer)"]
  Wizard -->|"canonicalPayloadHash + signature"| Record["plugin::certificates.certificate (certificates_records)"]
  Record -->|"QR Verification"| Verify["GET /api/certificates/verify/{serialNumber}"]
```

### Strapi v5 İçinde İçerik Türü Varlıkları Nerede Bulunur?

- **Content Manager**: `/admin/content-manager/collection-types/plugin::certificates.template` & `/admin/content-manager/collection-types/plugin::certificates.certificate` (`visible: true`)
- **Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Certificate Template` & `Issued Certificate`)
- **Plugin Workspace & Settings**: `/admin/plugins/certificates` (Issuance Wizard, Ledger & Templates) and `/admin/settings/certificates`
- **Database Tables**: `certificates_templates` and `certificates_records`

### `plugin::certificates.certificate` — Issued Certificate

Cryptographically signed official certificate record with signatory and witness attestation

> **Kind**: `collectionType` · **DB Table**: `certificates_records` · **Admin Location**: `/admin/content-manager/collection-types/plugin::certificates.certificate` · **Draft & Publish**: `No` · **i18n**: `No`

| Alan (Attribute)         | Strapi Türü   | Zorunlu | Kısıtlamalar / İlişki                                                                 |
| :----------------------- | :------------ | :------ | :------------------------------------------------------------------------------------ |
| `serialNumber`           | `string`      | Yes     | max: 64                                                                               |
| `templateDocumentId`     | `string`      | Yes     | max: 120                                                                              |
| `templateSlug`           | `string`      | Yes     | max: 120                                                                              |
| `templateName`           | `string`      | Yes     | max: 160                                                                              |
| `status`                 | `enumeration` | Yes     | enum: `pending_approval, issued, revoked, expired`; default: `"pending_approval"`     |
| `recipientFullName`      | `string`      | Yes     | max: 200                                                                              |
| `recipientChosenName`    | `string`      | No      | max: 200                                                                              |
| `recipientEmail`         | `email`       | No      | —                                                                                     |
| `recipientPhone`         | `string`      | No      | max: 64                                                                               |
| `recipientNationality`   | `string`      | No      | max: 120                                                                              |
| `nationalIdMasked`       | `string`      | No      | max: 32                                                                               |
| `nationalIdHash`         | `string`      | No      | max: 128; `private: true`                                                             |
| `issuedAt`               | `string`      | Yes     | max: 40                                                                               |
| `expiresAt`              | `string`      | No      | max: 40                                                                               |
| `revokedAt`              | `string`      | No      | max: 40                                                                               |
| `revocationReason`       | `text`        | No      | —                                                                                     |
| `signatories`            | `json`        | No      | default: `[]`                                                                         |
| `witnesses`              | `json`        | No      | default: `[]`                                                                         |
| `customData`             | `json`        | No      | default: `{}`                                                                         |
| `secondaryDates`         | `json`        | No      | default: `{}`                                                                         |
| `canonicalPayloadHash`   | `string`      | Yes     | max: 128                                                                              |
| `cryptographicSignature` | `text`        | Yes     | —                                                                                     |
| `publicKeyFingerprint`   | `string`      | Yes     | max: 96                                                                               |
| `verificationToken`      | `string`      | No      | max: 128; `private: true`                                                             |
| `esignProvider`          | `enumeration` | No      | enum: `none, docusign, webhook`; default: `"none"`                                    |
| `esignEnvelopeId`        | `string`      | No      | max: 128                                                                              |
| `esignEnvelopeStatus`    | `enumeration` | No      | enum: `not_sent, sent, delivered, completed, declined, voided`; default: `"not_sent"` |
| `esignCompletedAt`       | `string`      | No      | max: 40                                                                               |
| `linkedBookingCode`      | `string`      | No      | max: 64                                                                               |
| `notes`                  | `text`        | No      | —                                                                                     |

### `plugin::certificates.template` — Certificate Template

Reusable official certificate template with signatory rules, witness requirements, and body statement

> **Kind**: `collectionType` · **DB Table**: `certificates_templates` · **Admin Location**: `/admin/content-manager/collection-types/plugin::certificates.template` · **Draft & Publish**: `No` · **i18n**: `No`

| Alan (Attribute)        | Strapi Türü   | Zorunlu | Kısıtlamalar / İlişki                              |
| :---------------------- | :------------ | :------ | :------------------------------------------------- |
| `name`                  | `string`      | Yes     | max: 160                                           |
| `slug`                  | `uid`         | Yes     | —                                                  |
| `description`           | `text`        | No      | —                                                  |
| `serialPrefix`          | `string`      | Yes     | max: 8; default: `"CERT"`                          |
| `defaultValidityDays`   | `integer`     | No      | —                                                  |
| `requiresWitnesses`     | `boolean`     | No      | default: `false`                                   |
| `minWitnesses`          | `integer`     | No      | default: `0`                                       |
| `requiresApproval`      | `boolean`     | No      | default: `true`                                    |
| `esignEnabled`          | `boolean`     | No      | default: `false`                                   |
| `esignProvider`         | `enumeration` | No      | enum: `none, docusign, webhook`; default: `"none"` |
| `organizationName`      | `string`      | Yes     | max: 200                                           |
| `organizationSubheader` | `string`      | No      | max: 240                                           |
| `headerText`            | `string`      | No      | max: 240                                           |
| `titleText`             | `string`      | Yes     | max: 200                                           |
| `bodyTemplate`          | `text`        | Yes     | —                                                  |
| `footerText`            | `text`        | No      | —                                                  |
| `defaultSignatories`    | `json`        | No      | default: `[]`                                      |
| `customFieldsSchema`    | `json`        | No      | default: `[]`                                      |
| `secondaryCalendars`    | `json`        | No      | default: `[]`                                      |
| `accentColor`           | `string`      | No      | max: 16; default: `"#14532d"`                      |
| `active`                | `boolean`     | No      | default: `true`                                    |

## Strapi v5 İçerik Yöneticisi (Content Manager) Entegrasyonu (`/admin/content-manager`)

> **İçerik Yöneticisi Kenar Çubuğu Grubu**: `Donations & Certificates`

### İçerik Yöneticisi Varlıkları ve Bileşenleri

- `plugin::certificates.template` (**Certificate Template** — `/admin/content-manager/collection-types/plugin::certificates.template`)
- `plugin::certificates.certificate` (**Issued Certificate** — `/admin/content-manager/collection-types/plugin::certificates.certificate`)

![Dijital Sertifikalar (Ed25519) — Strapi v5 Content Manager Varlık ve Düzenleme Görünümü](/screenshots/certificates-content-manager.png)

### Bu Eklenti Neden Content Manager Varlıkları Oluşturur?

`@vicacha-devs/strapi-plugin-certificates` exposes **Certificate Template** (`plugin::certificates.template`) and **Issued Certificate** (`plugin::certificates.certificate`) inside the Strapi v5 Content Manager so legal, academic, and finance administrators can manage templates, link signatories, and audit issued credentials using Strapi's native tools:

- **Structured Template & Signatory Management**: Create and version `Certificate Template` records (`shahada`, `nikah`, `donation_tax`, `course_completion`, `membership`) with default signatory titles, serial prefixes, and witness counts in Content Manager.
- **Cryptographic Audit Trail Inspection**: Inspect `serialNumber`, `canonicalPayloadHash`, `cryptographicSignature` (Ed25519), `publicKeyFingerprint`, `nationalIdMasked` (`***-***-7720`), and `esignEnvelopeStatus` on `Issued Certificate` entries while keeping `nationalIdHash` and `verificationToken` protected (`private: true`).
- **Relational & Schema Extensions**: Link `Issued Certificate` records to `api::leader.leader` officiating scholars or donor profiles via `config/plugins.ts -> schemaExtensions`.

### Strapi Content Manager İçinde Nasıl Kullanılır? (Adım Adım)

1. **Open in Content Manager**: In the left sidebar, expand **Content Manager -> Collection Types -> Donations & Certificates** and click **Certificate Template** (`/admin/content-manager/collection-types/plugin::certificates.template`) or **Issued Certificate** (`/admin/content-manager/collection-types/plugin::certificates.certificate`).
2. **Manage Certificate Templates**: Open **Certificate Template** to configure `name`, `slug`, `category`, `serialPrefix` (e.g., `SHD`, `DON`), `bodyTemplate`, `requiresWitnesses`, and `defaultSignatories`.
3. **Audit or Revoke Issued Certificates**: Open **Issued Certificate** to filter credentials by `serialNumber`, `status` (`active`, `pending_signature`, `revoked`), `recipientName`, or `esignEnvelopeStatus`.
4. **Workspace vs. Content Manager**: Use the **Certificates Workspace** (`/admin/plugins/certificates`) to issue new Ed25519-signed credentials via the cryptographic signing wizard; use **Content Manager** to maintain templates, inspect audit hashes, and manage custom relational fields.

### Content Manager ve Eklenti Çalışma Alanı Senkronizasyonu

```mermaid
flowchart LR
  CM["Strapi Content Manager (/admin/content-manager)"] --> Tpl["Certificate Template (plugin::certificates.template)"]
  Tpl -->|"Selected in Wizard"| Wizard["Ed25519 Issuance Wizard (/admin/plugins/certificates)"]
  Wizard -->|"Signs & Persists"| Cert["Issued Certificate (plugin::certificates.certificate)"]
  CM -->|"Audit & Filter"| Cert
```

### Content Manager Kullanım Senaryoları ve Editöryal İş Akışları

#### Content Manager Use Case 1 — Designing & Updating Official Shahada, Nikah & Tax Certificate Templates

- **Amacı ve Neden Kullanıldığı**: Maintain standardized legal wording, serial prefixes (`SHD-`, `TAX-`), and default signatory blocks in Content Manager.
- **Content Manager İçinde Uygulama Adımları**: Open `/admin/content-manager/collection-types/plugin::certificates.template`, edit `Official Shahada Certificate` or `Tax-Deductible Donation Certificate`, and save.

#### Content Manager Use Case 2 — Compliance Filtering of Issued Credentials by Status & Fiscal Year

- **Amacı ve Neden Kullanıldığı**: Audit all active or revoked tax donation and consular certificates for annual compliance reporting.
- **Content Manager İçinde Uygulama Adımları**: Open `/admin/content-manager/collection-types/plugin::certificates.certificate` and filter by `category = donation_tax` and `status = active`.

## 5. Uçtan Uca Kullanım Senaryoları ve İş Akışları

### Use Case 1 — Issuing Cryptographically Signed Official Credentials

- **What it is for**: Issue tamper-evident Shahada, Marriage (Nikah), Course Completion, or Tax Donation certificates signed with an Ed25519 private key.
- **How it works**: Select a `plugin::certificates.template` in `/admin/plugins/certificates` or call `POST /certificates/certificates/issue`; the service canonicalizes the payload, signs it with Ed25519, and persists `plugin::certificates.certificate`.

```mermaid
flowchart LR
  Template["Select plugin::certificates.template"] --> Canonical["Canonicalize Recipient & Signatory Payload"]
  Canonical --> Sign["Sign with Ed25519 Private Key (node:crypto)"]
  Sign --> Persist["Persist plugin::certificates.certificate + QR Token"]
```

![Digital Certificates (Ed25519) — Strapi v5 Admin Workspace](/screenshots/certificates-admin.png)

### Use Case 2 — Public QR Code Verification & Tamper Detection

- **What it is for**: Let third parties (embassies, employers, auditors) verify a certificate's authenticity by scanning its QR code.
- **How it works**: Call `GET /api/certificates/verify/{serialNumber}?token=...` to re-verify the Ed25519 signature against `canonicalPayloadHash` and return masked recipient details.

```mermaid
flowchart LR
  Scan["Scan Certificate QR Code"] --> VerifyAPI["GET /api/certificates/verify/{serialNumber}"]
  VerifyAPI --> CryptoCheck["crypto.verify(Ed25519, canonicalPayloadHash, signature)"]
  CryptoCheck --> Result["Return Verified Status + Masked Recipient Metadata"]
```

![Digital Certificates (Ed25519) — Strapi v5 Content Manager Entities](/screenshots/certificates-content-manager.png)

### Use Case 3 — Privacy-Preserving National ID Lookup (`nationalIdHash`)

- **What it is for**: Verify whether a certificate belongs to a specific national ID number without storing plaintext national IDs in the database.
- **How it works**: The entity stores only `nationalIdMasked` (`***-***-7720`) and a per-serial salted SHA-256 `nationalIdHash` (`private: true`).

```mermaid
flowchart LR
  Input["National ID Input + Serial Number"] --> Hash["Compute Salted SHA-256(serial + pepper + nationalId)"]
  Hash --> Compare["Constant-Time Compare with nationalIdHash"]
  Compare --> Display["Display Masked ID (***-***-7720)"]
```

![Digital Certificates (Ed25519) — Strapi v5 Settings Panel](/screenshots/certificates-settings.png)

### Use Case 4 — DocuSign / Webhook Multi-Party E-Signature Attestation

- **What it is for**: Route pending certificates to signatories and witnesses via DocuSign envelopes and automatically transition status upon completion.
- **How it works**: Webhook events hit `POST /api/certificates/webhooks/esign` (verified with constant-time HMAC-SHA256) and update `esignEnvelopeStatus` on `plugin::certificates.certificate`.

```mermaid
flowchart LR
  Envelope["DocuSign Envelope Sent to Signatories"] --> Webhook["POST /api/certificates/webhooks/esign"]
  Webhook --> Hmac["timingSafeEqual HMAC-SHA256 Verification"]
  Hmac --> Activate["Update esignEnvelopeStatus = completed & status = active"]
```

## 6. REST API Uç Noktaları (`content-api` ve `admin`)

| Metot  | Uç Nokta Yolu                                           | Kapsam        | Denetleyici (Handler)               | Kimlik Doğrulama |
| :----- | :------------------------------------------------------ | :------------ | :---------------------------------- | :--------------- |
| `GET`  | `/certificates/settings`                                | `admin`       | `admin.getSettings`                 | Bearer JWT       |
| `PUT`  | `/certificates/settings`                                | `admin`       | `admin.updateSettings`              | Bearer JWT       |
| `POST` | `/certificates/settings/rotate-keys`                    | `admin`       | `admin.rotateKeys`                  | Bearer JWT       |
| `GET`  | `/certificates/templates`                               | `admin`       | `admin.listTemplates`               | Bearer JWT       |
| `POST` | `/certificates/templates`                               | `admin`       | `admin.createTemplate`              | Bearer JWT       |
| `POST` | `/certificates/templates/seed`                          | `admin`       | `admin.seedTemplates`               | Bearer JWT       |
| `GET`  | `/certificates/certificates`                            | `admin`       | `admin.listCertificates`            | Bearer JWT       |
| `POST` | `/certificates/certificates/issue`                      | `admin`       | `admin.issueCertificate`            | Bearer JWT       |
| `POST` | `/certificates/certificates/{documentId}/send-docusign` | `admin`       | `admin.sendDocuSignEnvelope`        | Bearer JWT       |
| `PUT`  | `/certificates/certificates/{documentId}/approve`       | `admin`       | `admin.approveCertificate`          | Bearer JWT       |
| `PUT`  | `/certificates/certificates/{documentId}/revoke`        | `admin`       | `admin.revokeCertificate`           | Bearer JWT       |
| `GET`  | `/certificates/certificates/{documentId}/print`         | `admin`       | `admin.printCertificate`            | Bearer JWT       |
| `GET`  | `/certificates/certificates/export/csv`                 | `admin`       | `admin.exportCsv`                   | Bearer JWT       |
| `GET`  | `/api/certificates/templates`                           | `content-api` | `content-api.listPublicTemplates`   | Public           |
| `GET`  | `/api/certificates/public-key`                          | `content-api` | `content-api.getPublicKey`          | Public           |
| `POST` | `/api/certificates/apply`                               | `content-api` | `content-api.applyCertificate`      | Public           |
| `GET`  | `/api/certificates/verify/{serial}`                     | `content-api` | `content-api.verifyBySerial`        | Public           |
| `GET`  | `/api/certificates/verify/{serial}/print`               | `content-api` | `content-api.downloadPrintableHtml` | Public           |
| `POST` | `/api/certificates/webhooks/docusign`                   | `content-api` | `content-api.docusignWebhook`       | Public           |

## 7. Sunucu Tarafı Programatik Kullanım (`strapi.plugin` ve `strapi.documents`)

```ts
// Registered services on plugin "certificates": "settings", "issuance", "docusign"
const pluginService = strapi.plugin("certificates")?.service("issuance");

// Querying records via the Strapi v5 Document Service API
const records = await strapi
  .documents("plugin::certificates.certificate")
  .findMany({
    limit: 25,
    sort: "createdAt:desc",
  });
```

## 8. Sorun Giderme ve Doğrulama

- **Yönetim paneli değişiklikleri görünmüyor**: `config/plugins.ts` dosyasını güncelledikten sonra `pnpm strapi build` komutunu çalıştırın.
- **Strapi bağımlılık izolasyonu**: React bağlam çakışmalarını önlemek için `pnpm-workspace.yaml` içinde `hoistPattern: ["*", "!@strapi/*"]` ayarını koruyun.
- **Sıkı TypeScript kontrolü**: Hem `admin` hem de `server` paketlerini doğrulamak için `pnpm check` komutunu çalıştırın.
