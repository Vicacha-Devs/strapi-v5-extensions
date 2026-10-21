# `@vicacha-devs/strapi-plugin-broadcasts`

Omnichannel Community Broadcasts & EventHub Automation Engine for Strapi v5:

- **Multi-Channel Transports**:
  - **Email Newsletters**: Dispatches via `strapi.plugin('email')` (and optional `strapi-plugin-email-designer-5` templates) with `List-Unsubscribe` headers and per-subscriber `{{unsubscribeUrl}}`.
  - **Telegram Bot & Channel/Supergroup Broadcasts**: Dispatches rich HTML messages with inline CTA buttons (`InlineKeyboardMarkup`) and optional Forum topic thread (`message_thread_id`) routing.
  - **WhatsApp Broadcasts**: Supports **Meta WhatsApp Cloud API** (`meta-cloud` — WABA templates & text) and self-hosted gateways (**OpenWA / WAHA / Evolution API**) with E.164 phone normalization.
  - **Dry-Run Sandbox Mode**: Automatically records simulated deliveries when `dryRun: true` or when external provider tokens are not configured.
- **Ecosystem Bridges**:
  - **`@vicacha-devs/strapi-plugin-inbox` Bridge**: Segments confirmed double opt-in subscribers (`plugin::inbox.subscriber`) by `topic` and `locale`, selecting each subscriber's localized campaign copy (`es`, `en`, `ar`, `tr`, etc.).
  - **`@vicacha-devs/strapi-plugin-calendar` Bridge**: Computes Hijri (`islamic-umalqura`) or other secondary calendar dates on every campaign (`secondaryDateLabel`).
- **EventHub Automation Rules**:
  - Trigger automatic Telegram/WhatsApp/Email broadcasts when Strapi `eventHub` events fire (e.g., `inbox.alert.published`, `api::event.event` published, `plugin::media-feeds.episode` synced).
- **Idempotent & PII-Masked Delivery Ledger**:
  - Deduplicates dispatches via deterministic SHA-256 `idempotencyKey` and masks recipient emails/phones (`j***@example.com`, `+57***4567`) in `plugin::broadcasts.delivery-log`.
