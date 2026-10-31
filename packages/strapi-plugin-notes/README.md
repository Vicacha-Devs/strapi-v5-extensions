# `@vicacha-devs/strapi-plugin-notes`

A Strapi v5 plugin (forked and modernized from [`strapi-community/strapi-plugin-notes`](https://github.com/strapi-community/strapi-plugin-notes)) that enables editorial teams to attach rich, categorized, and pinned notes to any Content Manager entry and browse all notes from a centralized Admin Hub.

## Key Features

1. **Note Modal Meta Information ([Issue #18](https://github.com/strapi-community/strapi-plugin-notes/issues/18))**:
   - Displays a Strapi **Audit Logs**-style 2×2 metadata panel (`Created At`, `Created By`, `Updated At`, `Updated By`) inside `NoteModal` when viewing or editing an existing note.
   - Automatically tracks `createdBy` and `updatedBy` on the server from `ctx.state.user`, with safe fallback display names if an admin user is later removed and strict PII sanitization.
2. **Pinned & Color/Category Badges**:
   - Pin critical notes so they stay at the top of the Content Manager side panel (`isPinned DESC, createdAt DESC`).
   - Classify notes with color-coded category badges (`General`, `Todo`, `Blocker`, `Idea`).
3. **Strapi v5 Document & Locale Scoping**:
   - Binds notes to Strapi v5's stable `documentId` (`entityDocumentId`) alongside legacy `entityId` and `entitySlug`, ensuring notes remain attached across Draft/Publish cycles.
   - Optional per-locale scoping (`entityLocale`) so editors can attach notes either to all locales of a document or to the currently active i18n locale.
4. **Content Manager Side Panel UX Polish**:
   - Quick search & category filtering inside the Content Manager side panel.
   - Compact author and date subtitle on each note item.
   - Delete confirmation dialog to prevent accidental one-click note deletion.
5. **Global Notes Hub**:
   - Dedicated **Notes** page in the Strapi Admin navigation with KPI summary cards, search/filter controls across content types, categories, and pinned status, plus one-click deep links straight into the target Content Manager entry.
