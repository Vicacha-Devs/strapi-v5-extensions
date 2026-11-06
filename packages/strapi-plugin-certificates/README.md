# `@vicacha-devs/strapi-plugin-certificates`

Generic **Official Certificates, Cryptographic Ed25519 Signing, Printable Credentials & Public Serial Verification Plugin** for **Strapi v5**, powered by [`@vicacha-devs/strapi-plugin-calendar`](../strapi-plugin-calendar).

---

## Key Features

- **Certificate Templates (`plugin::certificates.template`)**:
  - Configurable credential types (e.g., Shahada / Declaration of Faith, Nikah / Marriage, Course Completion, Tax-Deductible Donation Receipt) with customizable HTML/CSS layouts, placeholders, required applicant fields, and witness requirements.
- **Cryptographic Ed25519 Signing & Verification (`plugin::certificates.certificate`)**:
  - Signs issued certificate payloads (`serialNumber`, `recipientName`, `templateSlug`, `issuedAt`, `canonicalPayloadHash`) using **Ed25519** (`node:crypto`) and exposes the public verification key at `GET /api/certificates/public-key` and verification endpoint at `GET /api/certificates/verify/:serial`.
- **Self-Service Applications & Printable Credentials**:
  - Public application intake (`POST /api/certificates/apply`), printable HTML/PDF rendering (`GET /api/certificates/verify/:serial/print`), and DocuSign webhook status sync (`POST /api/certificates/webhooks/docusign`).
- **Calendar Bridge**:
  - Automatically syncs ceremony/appointment dates into `@vicacha-devs/strapi-plugin-calendar`.
- **13-Locale Admin UI**:
  - Ships with full translations for `en`, `es`, `ar`, `tr`, `fr`, `de`, `pt`, `it`, `nl`, `pl`, `id`, `ur`, and `zh`.
