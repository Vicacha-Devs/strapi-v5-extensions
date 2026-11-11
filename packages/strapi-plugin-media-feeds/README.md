# `@vicacha-devs/strapi-plugin-media-feeds`

Generic **Multi-Language Audio/Video Media Hub, YouTube & OEmbed Enricher, Apple/Spotify Podcast RSS 2.0 Generator & Live Broadcast Status Plugin** for **Strapi v5**, powered by [`@vicacha-devs/strapi-plugin-calendar`](../strapi-plugin-calendar).

---

## Key Features

- **Media Episodes & Series (`plugin::media-feeds.media-item`, `plugin::media-feeds.media-series`)**:
  - Manage multilingual sermons (khutbahs), lectures, interviews, and podcast series (`GET /api/media-feeds/episodes`, `GET /api/media-feeds/episodes/:slug`, `GET /api/media-feeds/series`) with duration, transcript, speaker, and downloadable audio/video enclosures.
- **YouTube, Vimeo & OEmbed Metadata Enricher**:
  - Automatically extracts video IDs, thumbnails, embed URLs, and durations from YouTube, Vimeo, and direct media URLs.
- **RSS 2.0 & Apple/Spotify Podcast Feeds**:
  - Generates standard RSS 2.0 XML (`GET /api/media-feeds/rss.xml`) and iTunes/Spotify-compliant Podcast XML (`GET /api/media-feeds/podcast.xml`).
- **Live Broadcast Status (`GET /api/media-feeds/live`)**:
  - Exposes real-time livestream status, embed URL, and upcoming broadcast schedule synced with `@vicacha-devs/strapi-plugin-calendar`.
- **10-Locale Admin UI**:
  - Ships with full translations for `en`, `es`, `ar`, `tr`, `fr`, `de`, `pt`, `id`, `ur`, and `zh`.
