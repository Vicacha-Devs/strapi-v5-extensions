---
title: "Media Feeds & Podcast RSS — Developer Guide & Admin UI"
description: "Complete developer reference, content-type schemas, use cases, server configuration, and Admin UI tour for @vicacha-devs/strapi-plugin-media-feeds."
---

## 1. Installation & Peer Setup

```bash
pnpm add @vicacha-devs/strapi-plugin-media-feeds
```

## 2. Server Configuration (`config/plugins.ts`)

Add the plugin configuration to your Strapi v5 `config/plugins.ts` file:

```ts
// config/plugins.ts
export default ({
  env,
}: {
  env: (key: string, defaultValue?: string) => string;
}) => ({
  "media-feeds": {
    enabled: true,
    config: {
      podcastTitle: env("PODCAST_TITLE", "Community Lectures"),
      podcastLanguage: "es",
    },
  },
});
```

![Media Feeds & Podcast RSS — Strapi v5 Settings Panel](/screenshots/media-feeds-settings.png)

## 3. Strapi v5 Admin UI Tour

Once enabled, the plugin registers its workspace and settings inside the Strapi v5 Admin panel using Strapi Design System v2 components:

![Media Feeds & Podcast RSS — Strapi v5 Admin UI](/screenshots/media-feeds-admin.png)

### Key Localized Admin UI Labels

| Translation Key              | Rendered UI Label                 |
| :--------------------------- | :-------------------------------- |
| `common.disabled`            | Disabled                          |
| `common.enabled`             | Enabled                           |
| `common.remove`              | Remove                            |
| `field.author_organization`  | Author / Organization             |
| `field.default_locale`       | Default Locale                    |
| `field.live_broadcast_title` | Live Broadcast Title              |
| `field.live_event_slug`      | Linked Event Slug (Optional)      |
| `field.live_schedule_label`  | Schedule / Broadcast Window Label |

## 4. Content-Type Entities, Locations & Schemas (`strapi.documents`)

Registers two localized, draft-and-publish Collection Types (`plugin::media-feeds.media-item` and `plugin::media-feeds.media-series`). Media Series group episodes into podcast shows or video playlists; Media Items store multi-language audio/video episodes, OEmbed metadata, audio enclosures, transcripts, and chapter markers. Supports `schemaExtensions` in `config/plugins.ts`.

```mermaid
flowchart LR
  Series["plugin::media-feeds.media-series (media_feed_series)"] -->|"seriesSlug"| Item["plugin::media-feeds.media-item (media_feed_items)"]
  Item -->|"RSS 2.0 + iTunes XML"| Podcast["GET /api/media-feeds/podcast.xml"]
  Item -->|"isLive: true"| Live["GET /api/media-feeds/live"]
```

### Where to Find Content-Type Entities in Strapi v5

- **Content Manager**: `/admin/content-manager/collection-types/plugin::media-feeds.media-item` & `/admin/content-manager/collection-types/plugin::media-feeds.media-series` (`visible: true`)
- **Content-Type Builder**: `/admin/plugins/content-type-builder` under **Collection Types** (`Media Episode & Feed Item` & `Media Series & Podcast Show`)
- **Plugin Workspace & Settings**: `/admin/plugins/media-feeds` (Episode Hub, Series, OEmbed Enricher, Live Stream Control) and `/admin/settings/media-feeds`
- **Database Tables**: `media_feed_items` and `media_feed_series`

### `plugin::media-feeds.media-item` — Media Episode & Feed Item

Generic multi-language video, podcast, audio lecture, YouTube item, or live broadcast

> **Kind**: `collectionType` · **DB Table**: `media_feed_items` · **Admin Location**: `/admin/content-manager/collection-types/plugin::media-feeds.media-item` · **Draft & Publish**: `Yes` · **i18n**: `Yes`

| Attribute          | Strapi Type   | Required | Constraints / Target                                                                              |
| :----------------- | :------------ | :------- | :------------------------------------------------------------------------------------------------ |
| `title`            | `string`      | Yes      | —                                                                                                 |
| `slug`             | `uid`         | Yes      | —                                                                                                 |
| `description`      | `text`        | Yes      | —                                                                                                 |
| `transcript`       | `richtext`    | No       | —                                                                                                 |
| `type`             | `string`      | Yes      | default: `"video"`                                                                                |
| `provider`         | `enumeration` | No       | enum: `youtube, spotify, apple_podcasts, vimeo, soundcloud, direct, upload`; default: `"youtube"` |
| `externalId`       | `string`      | No       | —                                                                                                 |
| `sourceUrl`        | `string`      | No       | —                                                                                                 |
| `embedUrl`         | `string`      | No       | —                                                                                                 |
| `speaker`          | `string`      | No       | —                                                                                                 |
| `speakerSlug`      | `string`      | No       | —                                                                                                 |
| `seriesSlug`       | `string`      | No       | —                                                                                                 |
| `duration`         | `string`      | No       | —                                                                                                 |
| `publishedAtLabel` | `string`      | No       | —                                                                                                 |
| `imageUrl`         | `string`      | No       | —                                                                                                 |
| `imageAlt`         | `string`      | No       | —                                                                                                 |
| `thumbnail`        | `media`       | No       | —                                                                                                 |
| `audioFile`        | `media`       | No       | —                                                                                                 |
| `transcriptFile`   | `media`       | No       | —                                                                                                 |
| `spokenLanguages`  | `json`        | No       | default: `["es"]`                                                                                 |
| `languageTracks`   | `json`        | No       | default: `[]`                                                                                     |
| `chapters`         | `json`        | No       | default: `[]`                                                                                     |
| `featured`         | `boolean`     | No       | default: `false`                                                                                  |
| `isLive`           | `boolean`     | No       | default: `false`                                                                                  |

### `plugin::media-feeds.media-series` — Media Series & Podcast Show

Generic multi-language podcast show, video playlist, or lecture series

> **Kind**: `collectionType` · **DB Table**: `media_feed_series` · **Admin Location**: `/admin/content-manager/collection-types/plugin::media-feeds.media-series` · **Draft & Publish**: `Yes` · **i18n**: `Yes`

| Attribute           | Strapi Type | Required | Constraints / Target             |
| :------------------ | :---------- | :------- | :------------------------------- |
| `title`             | `string`    | Yes      | —                                |
| `slug`              | `uid`       | Yes      | —                                |
| `description`       | `text`      | Yes      | —                                |
| `author`            | `string`    | No       | —                                |
| `coverImageUrl`     | `string`    | No       | —                                |
| `category`          | `string`    | No       | default: `"Education"`           |
| `defaultType`       | `string`    | No       | default: `"podcast"`             |
| `spokenLanguages`   | `json`      | No       | default: `["es","en","ar","tr"]` |
| `rssEnabled`        | `boolean`   | No       | default: `true`                  |
| `youtubePlaylistId` | `string`    | No       | —                                |
| `spotifyShowUrl`    | `string`    | No       | —                                |
| `applePodcastsUrl`  | `string`    | No       | —                                |
| `active`            | `boolean`   | No       | default: `true`                  |

## Strapi v5 Content Manager Integration (`/admin/content-manager`)

> **Content Manager Sidebar Group**: `Media, Resources & Library`

### Content Manager Entities & Components

- `plugin::media-feeds.media-item` (**Media Episode & Feed Item** — `/admin/content-manager/collection-types/plugin::media-feeds.media-item`)
- `plugin::media-feeds.media-series` (**Media Series & Podcast Show** — `/admin/content-manager/collection-types/plugin::media-feeds.media-series`)

![Media Feeds & Podcast RSS — Strapi v5 Content Manager Entities & Editorial View](/screenshots/media-feeds-content-manager.png)

### Why This Plugin Creates & Integrates Content Manager Entities

`@vicacha-devs/strapi-plugin-media-feeds` registers **Media Episode & Feed Item** (`plugin::media-feeds.media-item`) and **Media Series & Podcast Show** (`plugin::media-feeds.media-series`) with `i18n.localized: true`, `draftAndPublish: true`, and `content-manager.visible: true` so media producers can manage multilingual episodes, transcripts, and speaker relations in Content Manager:

- **Multilingual (`i18n`) Episode & Podcast Show Publishing**: Localize episode titles, summaries, full transcripts, and chapter markers across `en`, `es`, `ar`, and `tr` (`?plugins[i18n][locale]=en`).
- **Relational Speaker & Series Linking**: Link episodes in Content Manager to `Staff, Scholar & Author` (`api::leader.leader`) profiles via `schemaExtensions` and group them under `Media Series & Podcast Show` (`seriesSlug`).
- **Draft Staging Before Podcast RSS Syndication**: Only `Published` `plugin::media-feeds.media-item` records are emitted in `/api/media-feeds/podcast.xml`, allowing producers to stage upcoming episodes in `Draft` status inside Content Manager.

### How to Use in Strapi Content Manager (Step-by-Step)

1. **Open in Content Manager**: In the left sidebar, click **Content Manager -> Collection Types -> Media, Resources & Library** and select **Media Episode & Feed Item** (`/admin/content-manager/collection-types/plugin::media-feeds.media-item?plugins[i18n][locale]=en`) or **Media Series & Podcast Show** (`/admin/content-manager/collection-types/plugin::media-feeds.media-series`).
2. **Create Podcast Shows & Video Series**: In **Media Series & Podcast Show**, define `title`, `slug`, `author`, `coverUrl`, `itunesCategory`, and `rssEnabled`.
3. **Publish Multilingual Episodes**: In **Media Episode & Feed Item**, populate `title`, `slug`, `mediaType` (`video`, `audio`, `podcast`, `khutbah`, `live`), `sourceUrl`, `audioEnclosureUrl`, `durationSeconds`, and `transcript`, then click **Publish**.
4. **Workspace vs. Content Manager**: Use **Content Manager** for multilingual transcript authoring, draft staging, and speaker relations; use the **Media Feeds Workspace** (`/admin/plugins/media-feeds`) for 1-click SSRF-safe YouTube/Vimeo OEmbed enrichment and live stream banner toggling.

### Content Manager & Plugin Workspace Synchronization

```mermaid
flowchart LR
  CM["Strapi Content Manager (i18n + Draft & Publish)"] --> Series["Media Series & Podcast Show (plugin::media-feeds.media-series)"]
  CM --> Item["Media Episode & Feed Item (plugin::media-feeds.media-item)"]
  Series -->|"seriesSlug"| Item
  Item -->|"Published Audio Enclosures"| RSS["Apple / Spotify Podcast RSS (/api/media-feeds/podcast.xml)"]
```

### Content Manager Use Cases & Editorial Workflows

#### Content Manager Use Case 1 — Staging & Translating Friday Khutbahs and Podcast Episodes

- **Why & What it is for**: Author English, Spanish, and Arabic episode descriptions, chapter markers, and transcripts in Content Manager before publishing to Apple Podcasts and Spotify.
- **How to use in Content Manager**: Open `/admin/content-manager/collection-types/plugin::media-feeds.media-item?plugins[i18n][locale]=en`, edit `Jumu'ah Khutbah: Mercy and Coexistence`, switch locales, and click **Publish**.

## 5. End-to-End Use Cases & Workflows

### Use Case 1 — Apple Podcasts & Spotify iTunes RSS 2.0 XML Syndication

- **What it is for**: Automatically generate standards-compliant podcast RSS feeds with `<itunes:image>`, `<enclosure>`, duration, and per-series filtering.
- **How it works**: Organize `plugin::media-feeds.media-item` records under a `plugin::media-feeds.media-series` (`rssEnabled: true`) and syndicate `GET /api/media-feeds/podcast.xml` or `GET /api/media-feeds/podcast/{seriesSlug}.xml`.

```mermaid
flowchart LR
  Series["plugin::media-feeds.media-series (rssEnabled: true)"] --> Episodes["Published plugin::media-feeds.media-item Audio Enclosures"]
  Episodes --> XML["RSS 2.0 + iTunes Namespace XML Builder"]
  XML --> Directory["Apple Podcasts / Spotify (/api/media-feeds/podcast.xml)"]
```

![Media Feeds & Podcast RSS — Strapi v5 Admin Workspace](/screenshots/media-feeds-admin.png)

### Use Case 2 — SSRF-Hardened YouTube, Vimeo & Spotify OEmbed Auto-Enrichment

- **What it is for**: Allow editors to paste a YouTube or Vimeo URL and automatically populate episode title, thumbnail, embed URL, and provider ID.
- **How it works**: In `/admin/plugins/media-feeds`, trigger `POST /media-feeds/enrich` (which validates hostnames against SSRF private IP ranges) before saving `plugin::media-feeds.media-item`.

```mermaid
flowchart LR
  Paste["Editor Pastes YouTube / Vimeo / Spotify URL"] --> Guard["SSRF Allowlist & Private IP Guard"]
  Guard --> Fetch["Fetch Provider OEmbed Metadata"]
  Fetch --> Populate["Auto-Fill title, thumbnailUrl, embedUrl & providerId"]
```

![Media Feeds & Podcast RSS — Strapi v5 Settings Panel](/screenshots/media-feeds-settings.png)

### Use Case 3 — Live Broadcast Status Banner & Stream Switcher

- **What it is for**: Toggle a live khutbah, lecture, or webinar stream on the website header with real-time status polling.
- **How it works**: Mark an episode `isLive: true` or update live stream settings in `/admin/plugins/media-feeds`, and poll `GET /api/media-feeds/live` from the frontend.

```mermaid
flowchart LR
  Toggle["Toggle Live Stream in /admin/plugins/media-feeds"] --> Store["Update isLive Episode or Live Stream Config"]
  Store --> Poll["Frontend Polls GET /api/media-feeds/live"]
```

![Media Feeds & Podcast RSS — Strapi v5 Content Manager Entities](/screenshots/media-feeds-content-manager.png)

## 6. REST API Endpoints (`content-api` & `admin`)

| Method | Endpoint Path               | Scope         | Controller Handler          | Auth       |
| :----- | :-------------------------- | :------------ | :-------------------------- | :--------- |
| `GET`  | `/media-feeds/overview`     | `admin`       | `admin.getOverview`         | Bearer JWT |
| `GET`  | `/media-feeds/settings`     | `admin`       | `admin.getSettings`         | Bearer JWT |
| `PUT`  | `/media-feeds/settings`     | `admin`       | `admin.updateSettings`      | Bearer JWT |
| `POST` | `/media-feeds/enrich-url`   | `admin`       | `admin.enrichUrl`           | Bearer JWT |
| `POST` | `/media-feeds/sync-youtube` | `admin`       | `admin.syncYouTube`         | Bearer JWT |
| `GET`  | `/api/media-feeds/episodes` | `content-api` | `content-api.listEpisodes`  | Public     |
| `GET`  | `/api/media-feeds/series`   | `content-api` | `content-api.listSeries`    | Public     |
| `GET`  | `/api/media-feeds/live`     | `content-api` | `content-api.getLiveStatus` | Public     |
| `GET`  | `/api/media-feeds/rss.xml`  | `content-api` | `content-api.getRssXml`     | Public     |

## 7. Programmatic Server Usage (`strapi.plugin` & `strapi.documents`)

```ts
// Registered services on plugin "media-feeds": "settings", "feedService", "syncService"
const pluginService = strapi.plugin("media-feeds")?.service("feedService");

// Querying records via the Strapi v5 Document Service API
const records = await strapi
  .documents("plugin::media-feeds.media-item")
  .findMany({
    limit: 25,
    sort: "createdAt:desc",
  });
```

## 8. Troubleshooting & Verification

- **Admin panel changes not visible**: Run `pnpm strapi build` after modifying `config/plugins.ts`.
- **Peer dependency isolation**: Keep `hoistPattern: ["*", "!@strapi/*"]` in `pnpm-workspace.yaml` so `@strapi/*` contexts are never duplicated.
- **TypeScript type-checking**: Validate both `admin/tsconfig.json` and `server/tsconfig.json` via `pnpm --filter <pkg> test:ts`.
