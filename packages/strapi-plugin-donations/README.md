# `@vicacha-devs/strapi-plugin-donations`

Generic **Crowdfunding Campaigns, Donor Pledges, Utility Invoice Sponsorship, Commodity Assessment Calculator & Tax Certificate Bridge** for **Strapi v5**, powered by [`@vicacha-devs/strapi-plugin-calendar`](../strapi-plugin-calendar) and [`@vicacha-devs/strapi-plugin-certificates`](../strapi-plugin-certificates).

---

## Key Features

- **Fundraising Campaigns & Utility Invoice Transparency (`plugin::donations.campaign`)**:
  - Track campaign goals (`goalAmount`), raised totals (`raisedAmount`), donor counts, urgency badges, and recurring monthly utility bills (`category: 'utility_invoice'`, e.g., Electricity, Water, Gas, Internet).
- **Donor Pledges & Payment Proof Verification (`plugin::donations.pledge`)**:
  - Public pledge submission (`POST /api/donations/pledges`) and HMAC-verified payment gateway webhook receiver (`POST /api/donations/webhooks/:provider`).
  - Automatic campaign progress recalculation and tax-deductible receipt issuance via `@vicacha-devs/strapi-plugin-certificates`.
- **Rule-Based Assessment & Commodity Threshold Calculator**:
  - Configurable precious-metal/commodity thresholds (`GET /api/donations/calculator`, `POST /api/donations/calculate`) supporting multi-currency (`COP`, `USD`, `EUR`, `TRY`) assessments.
- **10-Locale Admin UI**:
  - Ships with full translations for `en`, `es`, `ar`, `tr`, `fr`, `de`, `pt`, `id`, `ur`, and `zh`.
