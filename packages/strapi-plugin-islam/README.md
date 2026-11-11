# `@vicacha-devs/strapi-plugin-islam`

Comprehensive Strapi v5 Islamic Liturgical, Scriptural & Fiqh Suite for Mosques, Islamic Cultural Centers, and Community Platforms.

## 5 Core Pillars

1. **Salah, Adhan, Iqamah, Jumu'ah & Ramadan Imsakiyah Engine**
   - Built-in deterministic astronomical engine (all calculation methods `0`–`23`, Shafi'i & Hanafi Asr shadow factors, per-prayer minute adjustments, high-latitude rules) + optional upstream `IslamicAPI` sync with in-memory TTL caching.
   - Mosque Iqamah rules (`offset_minutes` or `fixed_time`), multi-shift Jumu'ah schedules, Prohibited/Makruh prayer windows (Sunrise, Zawal, Sunset), Adhan audio profiles, and RFC 5545 `.ics` prayer calendar export.
2. **Qibla Spherical Geolocation Compass**
   - Exact Great-Circle bearing (`degrees` clockwise from True North + 16-point compass cardinal) and Haversine geodesic distance (`km` & `mi`) to the Sacred Kaaba in Makkah (`21.422487° N, 39.826206° E`).
3. **Hilal Moon-Sighting, Ramadan, Eid & Islamic Observances**
   - Bidirectional Gregorian ↔ Hijri conversion (`islamic-umalqura` + tabular fallback) with Imam Hilal moon-sighting day offset (`-2` to `+2` days) and explicit Gregorian date confirmation.
   - Automatic countdowns for Ramadan, Laylat al-Qadr, Eid al-Fitr, Day of Arafah, Eid al-Adha, Islamic New Year, Day of Ashura, Mawlid al-Nabi, and Isra & Mi'raj, with Ecosystem Bridges to `@vicacha-devs/strapi-plugin-calendar`, `@vicacha-devs/strapi-plugin-inbox`, and `@vicacha-devs/strapi-plugin-donations`.
4. **Quran, Hadith & Dua / Adhkar Hub**
   - Complete 114 Surah directory + curated Quranic Ayat, Prophetic Hadiths, Hisnul Muslim Duas & Adhkar (with Tasbih repetition counts), 99 Names of Allah (*Asma-ul-Husna*), Digital Tasbih presets, Five Pillars & Shahada reference, and Daily Inspiration with Imam Pin Override.
5. **Fiqh Financial Calculators (Zakat al-Mal, Nisab, Zakat al-Fitr, Fidyah, Kaffarah & Hawl)**
   - Live/Fallback Gold (`85g` Common / `87.48g` Classical) & Silver (`595g` Common / `612.36g` Classical) Nisab thresholds in `COP`, `USD`, `EUR`, and `TRY` with `24K`, `22K`, `21K`, `18K`, `14K` gold carat purity math, agricultural Ushr (`5%` / `10%`), Zakat al-Fitr per-person calculator, Fidyah/Kaffarah calculator, and `354`-day Lunar Hawl maturity tracker.
