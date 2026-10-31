// Canonical package list for the @vicacha-devs/docs site — single source of truth
// shared by astro.config.ts, scripts/generate-openapi.ts, scripts/sync-readmes.ts,
// scripts/capture-screenshots.ts, and scripts/adversarial-judges.ts.

export type SupportedLocale = "en" | "es" | "ar" | "tr";
export type NonDefaultLocale = "es" | "ar" | "tr";

export interface PluginPackageMeta {
  slug: string;
  npmName: string;
  pluginId: string;
  category: string;
  label: string;
  translations: Record<NonDefaultLocale, string>;
  summary: Record<SupportedLocale, string>;
  schemaFile: string;
  dir: string;
  screenshot: string;
  contentManagerScreenshot?: string;
  paletteScreenshot?: string;
  settingsScreenshot?: string;
}

export interface GuideMeta {
  slug: string;
  label: string;
  translations: Record<NonDefaultLocale, string>;
}

export const SUPPORTED_LOCALES: SupportedLocale[] = ["en", "es", "ar", "tr"];

export const plugins: PluginPackageMeta[] = [
  {
    slug: "strapi-plugin-bookings",
    npmName: "@vicacha-devs/strapi-plugin-bookings",
    pluginId: "bookings",
    category: "Scheduling & Operations",
    label: "Bookings & Reservations",
    translations: {
      es: "Reservas y Citas",
      ar: "الحجوزات والمواعيد",
      tr: "Rezervasyonlar ve Randevular",
    },
    summary: {
      en: "Bookable resources, interval & window availability engine, host assignment, and self-service reservation workflows for Strapi v5.",
      es: "Recursos reservables, motor de disponibilidad por intervalos y franjas, asignación de anfitriones y reservas de autoservicio para Strapi v5.",
      ar: "إدارة الموارد القابلة للحجز ومحرك حساب الفترات المتاحة وتعيين المضيفين ومسارات الحجز الذاتي لنظام Strapi v5.",
      tr: "Strapi v5 için rezerve edilebilir kaynaklar, zaman dilimi uygunluk motoru, görevli ataması ve self-servis rezervasyon iş akışları.",
    },
    schemaFile: "bookings",
    dir: "strapi-plugin-bookings",
    screenshot: "/screenshots/bookings-admin.png",
    contentManagerScreenshot: "/screenshots/bookings-content-manager.png",
    settingsScreenshot: "/screenshots/bookings-settings.png",
  },
  {
    slug: "strapi-plugin-broadcasts",
    npmName: "@vicacha-devs/strapi-plugin-broadcasts",
    pluginId: "broadcasts",
    category: "Community & Engagement",
    label: "Omnichannel Broadcasts",
    translations: {
      es: "Difusiones Omnicanal",
      ar: "البث متعدد القنوات",
      tr: "Çok Kanallı Yayınlar",
    },
    summary: {
      en: "Omnichannel community broadcasts across WhatsApp, Telegram, and Email with Strapi EventHub automation rules and PII-masked delivery logs.",
      es: "Difusiones comunitarias omnicanal por WhatsApp, Telegram y correo electrónico con reglas de automatización EventHub y registros con PII enmascarado.",
      ar: "بث مجتمعي متعدد القنوات عبر واتساب وتيليجرام والبريد الإلكتروني مع قواعد أتمتة EventHub وسجلات تسليم محمية.",
      tr: "Strapi EventHub otomasyon kuralları ve PII maskeli teslimat günlükleri ile WhatsApp, Telegram ve E-posta üzerinden çok kanallı yayınlar.",
    },
    schemaFile: "broadcasts",
    dir: "strapi-plugin-broadcasts",
    screenshot: "/screenshots/broadcasts-admin.png",
    contentManagerScreenshot: "/screenshots/broadcasts-content-manager.png",
    settingsScreenshot: "/screenshots/broadcasts-settings.png",
  },
  {
    slug: "strapi-plugin-calendar",
    npmName: "@vicacha-devs/strapi-plugin-calendar",
    pluginId: "calendar",
    category: "Scheduling & Operations",
    label: "Calendar & Scheduling",
    translations: {
      es: "Calendario y Programación",
      ar: "التقويم والجدولة",
      tr: "Takvim ve Planlama",
    },
    summary: {
      en: "Multi-collection FullCalendar v6 scheduler, RFC 5545 RRULE + RFC 7529 RSCALE recurrence engine, CLDR secondary calendars (Hijri, Hebrew, Persian), and iCal (.ics) feeds.",
      es: "Planificador FullCalendar v6 multicolección, motor de recurrencia RRULE + RSCALE, calendarios secundarios CLDR (Hijri, Hebreo, Persa) y canales iCal (.ics).",
      ar: "تقويم FullCalendar v6 متعدد المجموعات مع محرك تكرار RRULE و RSCALE والتقويم الهجري أم القرى والتقاويم الثانوية وخلاصات iCal.",
      tr: "Çoklu koleksiyon FullCalendar v6 planlayıcı, RRULE + RSCALE tekrarlama motoru, CLDR ikincil takvimler (Hicri, İbranice, Farsça) ve iCal (.ics) beslemeleri.",
    },
    schemaFile: "calendar",
    dir: "strapi-plugin-calendar",
    screenshot: "/screenshots/calendar-admin.png",
    contentManagerScreenshot: "/screenshots/calendar-content-manager.png",
    settingsScreenshot: "/screenshots/calendar-settings.png",
  },
  {
    slug: "strapi-plugin-certificates",
    npmName: "@vicacha-devs/strapi-plugin-certificates",
    pluginId: "certificates",
    category: "Trust & Finance",
    label: "Digital Certificates (Ed25519)",
    translations: {
      es: "Certificados Digitales (Ed25519)",
      ar: "الشهادات الرقمية (Ed25519)",
      tr: "Dijital Sertifikalar (Ed25519)",
    },
    summary: {
      en: "Official credential issuance, Ed25519 cryptographic signing, constant-time QR verification portal, salted PII hashing, and DocuSign envelope webhooks.",
      es: "Emisión de certificados oficiales, firma criptográfica Ed25519, portal de verificación QR en tiempo constante, hash salado de PII y webhooks de DocuSign.",
      ar: "إصدار الشهادات الرسمية والتوقيع الرقمي Ed25519 وبوابة التحقق الفوري عبر QR وتعمية البيانات الشخصية وتكامل DocuSign.",
      tr: "Resmi sertifika düzenleme, Ed25519 kriptografik imzalama, sabit zamanlı QR doğrulama portalı, tuzlanmış PII özeti ve DocuSign entegrasyonu.",
    },
    schemaFile: "certificates",
    dir: "strapi-plugin-certificates",
    screenshot: "/screenshots/certificates-admin.png",
    contentManagerScreenshot: "/screenshots/certificates-content-manager.png",
    settingsScreenshot: "/screenshots/certificates-settings.png",
  },
  {
    slug: "strapi-plugin-donations",
    npmName: "@vicacha-devs/strapi-plugin-donations",
    pluginId: "donations",
    category: "Trust & Finance",
    label: "Donations & Campaigns",
    translations: {
      es: "Donaciones y Campañas",
      ar: "التبرعات والحملات",
      tr: "Bağışlar ve Kampanyalar",
    },
    summary: {
      en: "Multi-currency crowdfunding campaigns, utility invoice sponsorship, precious-metal threshold calculator, HMAC-SHA256 payment webhooks, and automatic tax certificate bridge.",
      es: "Campañas de recaudación multidivisa, patrocinio de facturas de servicios públicos, calculadora de umbrales en metales preciosos, webhooks HMAC-SHA256 y puente de certificados fiscales.",
      ar: "حملات التبرعات متعددة العملات ورعاية فواتير المرافق وحاسبة النصاب والتحقق من بوابات الدفع عبر HMAC-SHA256 وإصدار شهادات التبرع تلقائياً.",
      tr: "Çok para birimli bağış kampanyaları, fatura sponsorluğu, kıymetli maden eşik hesaplayıcısı, HMAC-SHA256 ödeme webhook'ları ve otomatik vergi sertifikası köprüsü.",
    },
    schemaFile: "donations",
    dir: "strapi-plugin-donations",
    screenshot: "/screenshots/donations-admin.png",
    contentManagerScreenshot: "/screenshots/donations-content-manager.png",
    settingsScreenshot: "/screenshots/donations-settings.png",
  },
  {
    slug: "strapi-plugin-events",
    npmName: "@vicacha-devs/strapi-plugin-events",
    pluginId: "events",
    category: "Scheduling & Operations",
    label: "Events, RSVP & Check-In",
    translations: {
      es: "Eventos, RSVP y Check-In",
      ar: "الفعاليات والتسجيل والحضور",
      tr: "Etkinlikler, LCV ve Giriş",
    },
    summary: {
      en: "Event management, seat capacity enforcement, automatic waitlist promotion, 1-click attendee check-in, CSV export, and unified Calendar bridge.",
      es: "Gestión de eventos, control de cupos, promoción automática desde lista de espera, check-in en 1 clic, exportación CSV segura e integración con el Calendario unificado.",
      ar: "إدارة الفعاليات والتحكم في السعة والترقية التلقائية لقوائم الانتظار وتسجيل الحضور الفوري وتصدير CSV والتكامل مع التقويم الموحد.",
      tr: "Etkinlik yönetimi, kontenjan kontrolü, otomatik bekleme listesi terfisi, tek tıkla katılımcı girişi, CSV dışa aktarma ve birleşik Takvim köprüsü.",
    },
    schemaFile: "events",
    dir: "strapi-plugin-events",
    screenshot: "/screenshots/events-admin.png",
    contentManagerScreenshot: "/screenshots/events-content-manager.png",
    settingsScreenshot: "/screenshots/events-settings.png",
  },
  {
    slug: "strapi-plugin-global-search",
    npmName: "@vicacha-devs/strapi-plugin-global-search",
    pluginId: "global-search",
    category: "Editorial & SEO",
    label: "Global Command Search",
    translations: {
      es: "Búsqueda Global (Cmd+K)",
      ar: "البحث الشامل السريع",
      tr: "Küresel Komut Araması",
    },
    summary: {
      en: "Spotlight-style Cmd+K / Ctrl+K command palette and global search across all Strapi v5 collection types, single types, and nested components.",
      es: "Paleta de comandos estilo Spotlight (Cmd+K / Ctrl+K) y búsqueda global en todas las colecciones, tipos únicos y componentes anidados de Strapi v5.",
      ar: "لوحة أوامر وبحث شامل فوري (Cmd+K / Ctrl+K) عبر جميع أنواع المحتوى والمكونات المتداخلة في لوحة تحكم Strapi v5.",
      tr: "Tüm Strapi v5 koleksiyon türleri, tekil türler ve iç içe bileşenler genelinde Spotlight tarzı Cmd+K / Ctrl+K komut paleti ve küresel arama.",
    },
    schemaFile: "global-search",
    dir: "strapi-plugin-global-search",
    screenshot: "/screenshots/global-search-admin.png",
    paletteScreenshot: "/screenshots/global-search-palette.png",
    settingsScreenshot: "/screenshots/global-search-settings.png",
  },
  {
    slug: "strapi-plugin-inbox",
    npmName: "@vicacha-devs/strapi-plugin-inbox",
    pluginId: "inbox",
    category: "Community & Engagement",
    label: "Inbox, Forms & Alert Banners",
    translations: {
      es: "Bandeja, Formularios y Alertas",
      ar: "صندوق الوارد والنماذج والتنبيهات",
      tr: "Gelen Kutusu, Formlar ve Uyarılar",
    },
    summary: {
      en: "Dynamic form builder, service-desk submission inbox with SLA tracking, double opt-in newsletter subscribers, and site-wide urgent alert banners.",
      es: "Constructor de formularios dinámicos, bandeja de atención con seguimiento SLA, suscriptores con doble opt-in y cintillos de alerta global.",
      ar: "منشئ نماذج ديناميكي وصندوق وارد لطلبات الخدمة مع تتبع SLA ومشتركي النشرات البريدية وأشرطة التنبيه العاجلة للموقع.",
      tr: "Dinamik form oluşturucu, SLA takipli başvuru gelen kutusu, çift onaylı bülten aboneleri ve site genelinde acil uyarı bantları.",
    },
    schemaFile: "inbox",
    dir: "strapi-plugin-inbox",
    screenshot: "/screenshots/inbox-admin.png",
    contentManagerScreenshot: "/screenshots/inbox-content-manager.png",
    settingsScreenshot: "/screenshots/inbox-settings.png",
  },
  {
    slug: "strapi-plugin-islam",
    npmName: "@vicacha-devs/strapi-plugin-islam",
    pluginId: "islam",
    category: "Community & Engagement",
    label: "Islam Suite (Salah, Qibla, Hijri)",
    translations: {
      es: "Suite Islámica (Salah, Qibla, Hijri)",
      ar: "المنظومة الإسلامية (الصلاة، القبلة، الهجري)",
      tr: "İslam Paketi (Namaz, Kıble, Hicri)",
    },
    summary: {
      en: "Astronomical Salah, Adhan & Iqamah engine, Qibla spherical compass, Hilal moon-sighting confirmation, Quran/Hadith/Dua hub, and Zakat/Nisab calculators.",
      es: "Motor astronómico de Salah, Adhan e Iqamah, brújula esférica de Qibla, confirmación de avistamiento de Hilal, centro de Corán/Hadiz/Dua y calculadoras de Zakat/Nisab.",
      ar: "محرك المواقيت الفلكية للصلاة والأذان والإقامة وبوصلة القبلة الكروية وتأكيد رؤية الهلال ومركز القرآن والحديث والأدعية وحاسبات الزكاة والنصاب.",
      tr: "Astronomik Namaz, Ezan ve Kamet motoru, küresel Kıble pusulası, Hilal gözlem onayı, Kur'an/Hadis/Dua merkezi ve Zekat/Nisap hesaplayıcıları.",
    },
    schemaFile: "islam",
    dir: "strapi-plugin-islam",
    screenshot: "/screenshots/islam-admin.png",
    contentManagerScreenshot: "/screenshots/islam-content-manager.png",
    settingsScreenshot: "/screenshots/islam-settings.png",
  },
  {
    slug: "strapi-plugin-media-feeds",
    npmName: "@vicacha-devs/strapi-plugin-media-feeds",
    pluginId: "media-feeds",
    category: "Community & Engagement",
    label: "Media Feeds & Podcast RSS",
    translations: {
      es: "Canales Multimedia y Podcast RSS",
      ar: "الوسائط المتعددة وخلاصات البودكاست",
      tr: "Medya Akışları ve Podcast RSS",
    },
    summary: {
      en: "Multilingual audio/video episode hub, SSRF-safe YouTube & Vimeo OEmbed enricher, Apple/Spotify Podcast RSS 2.0 XML generator, and live stream status API.",
      es: "Centro de episodios de audio y video multilingüe, enriquecedor OEmbed seguro contra SSRF, generador XML de Podcast RSS 2.0 para Apple/Spotify y estado de transmisión en vivo.",
      ar: "مركز الحلقات الصوتية والمرئية متعدد اللغات ومثري بيانات يوتيوب وفيميو الآمن ومولد خلاصات البودكاست RSS 2.0 وحالة البث المباشر.",
      tr: "Çok dilli ses/video bölüm merkezi, SSRF korumalı YouTube/Vimeo OEmbed zenginleştirici, Apple/Spotify Podcast RSS 2.0 XML üreticisi ve canlı yayın durumu API'si.",
    },
    schemaFile: "media-feeds",
    dir: "strapi-plugin-media-feeds",
    screenshot: "/screenshots/media-feeds-admin.png",
    contentManagerScreenshot: "/screenshots/media-feeds-content-manager.png",
    settingsScreenshot: "/screenshots/media-feeds-settings.png",
  },
  {
    slug: "strapi-plugin-notes",
    npmName: "@vicacha-devs/strapi-plugin-notes",
    pluginId: "notes",
    category: "Editorial & SEO",
    label: "Editorial Notes & Pins",
    translations: {
      es: "Notas Editoriales y Anotaciones",
      ar: "الملاحظات التحريرية والتثبيت",
      tr: "Editöryal Notlar ve Sabitlemeler",
    },
    summary: {
      en: "Polymorphic editorial notes, color-coded category badges, pinned Content Manager side-panel annotations, and a centralized Global Notes Hub.",
      es: "Notas editoriales polimórficas, etiquetas por categoría, anotaciones fijadas en el panel lateral del Content Manager y centro global de notas.",
      ar: "ملاحظات تحريرية متعددة الأنواع وشارات تصنيف ملونة وتثبيت الملاحظات في الشريط الجانبي لمدير المحتوى ومركز ملاحظات شامل.",
      tr: "Çok biçimli editöryal notlar, renk kodlu kategori rozetleri, İçerik Yöneticisi yan panelinde sabitlenmiş notlar ve merkezi Küresel Notlar Merkezi.",
    },
    schemaFile: "notes",
    dir: "strapi-plugin-notes",
    screenshot: "/screenshots/notes-admin.png",
    contentManagerScreenshot: "/screenshots/notes-content-manager.png",
    settingsScreenshot: "/screenshots/notes-settings.png",
  },
  {
    slug: "strapi-plugin-resources",
    npmName: "@vicacha-devs/strapi-plugin-resources",
    pluginId: "resources",
    category: "Community & Engagement",
    label: "Resources, Galleries & Glossary",
    translations: {
      es: "Recursos, Galerías y Glosario",
      ar: "الموارد والمعارض والمسرد",
      tr: "Kaynaklar, Galeriler ve Sözlük",
    },
    summary: {
      en: "Digital publications library with hardened downloads, Media Library folder-synced photo galleries, and a multilingual glossary with native script & audio.",
      es: "Biblioteca de publicaciones digitales con descargas seguras, galerías fotográficas sincronizadas con carpetas de Media Library y glosario multilingüe con audio.",
      ar: "مكتبة الإصدارات الرقمية مع تنزيلات محمية ومعارض الصور المتزامنة مع مكتبة الوسائط ومسرد المصطلحات متعدد اللغات مع النطق الصوتي.",
      tr: "Güvenli indirmelere sahip dijital yayın kütüphanesi, Medya Kütüphanesi klasörleriyle senkronize fotoğraf galerileri ve sesli çok dilli sözlük.",
    },
    schemaFile: "resources",
    dir: "strapi-plugin-resources",
    screenshot: "/screenshots/resources-admin.png",
    contentManagerScreenshot: "/screenshots/resources-content-manager.png",
    settingsScreenshot: "/screenshots/resources-settings.png",
  },
  {
    slug: "strapi-plugin-seo",
    npmName: "@vicacha-devs/strapi-plugin-seo",
    pluginId: "seo",
    category: "Editorial & SEO",
    label: "SEO & SERP Analyzer",
    translations: {
      es: "SEO y Analizador SERP",
      ar: "تحسين محركات البحث (SEO)",
      tr: "SEO ve SERP Analizörü",
    },
    summary: {
      en: "Shared SEO & social meta component manager, live Google SERP & OpenGraph/X preview cards, and real-time keyword density and metadata analyzer.",
      es: "Gestor del componente compartido SEO y redes sociales, vista previa en vivo de Google SERP y OpenGraph/X, y analizador de densidad de palabras clave.",
      ar: "إدارة مكونات تحسين محركات البحث والشبكات الاجتماعية ومعاينة نتائج بحث Google وبطاقات OpenGraph وتحليل الكلمات المفتاحية الفوري.",
      tr: "Paylaşılan SEO ve sosyal meta bileşen yöneticisi, canlı Google SERP ve OpenGraph/X önizleme kartları ve gerçek zamanlı anahtar kelime yoğunluğu analizörü.",
    },
    schemaFile: "seo",
    dir: "strapi-plugin-seo",
    screenshot: "/screenshots/seo-admin.png",
    contentManagerScreenshot: "/screenshots/seo-content-manager.png",
    settingsScreenshot: "/screenshots/seo-settings.png",
  },
  {
    slug: "strapi-plugin-sitemap",
    npmName: "@vicacha-devs/strapi-plugin-sitemap",
    pluginId: "sitemap",
    category: "Editorial & SEO",
    label: "XML Sitemap & Hreflang",
    translations: {
      es: "Mapa del Sitio XML y Hreflang",
      ar: "خريطة الموقع XML و Hreflang",
      tr: "XML Site Haritası ve Hreflang",
    },
    summary: {
      en: "Automated XML Sitemap and Sitemap Index generator for Strapi v5 with multilingual hreflang alternates, custom static URLs, and XSL stylesheet.",
      es: "Generador automático de Sitemap XML e Índice de Sitemaps para Strapi v5 con enlaces alternativos hreflang multilingües, URLs estáticas y hoja de estilo XSL.",
      ar: "مولد خرائط الموقع XML وفهارسها لنظام Strapi v5 مع دعم الروابط البديلة متعددة اللغات (hreflang) والروابط المخصصة.",
      tr: "Çok dilli hreflang alternatifleri, özel statik URL'ler ve XSL stil sayfası ile Strapi v5 için otomatik XML Site Haritası ve Site Haritası İndeksi üreticisi.",
    },
    schemaFile: "sitemap",
    dir: "strapi-plugin-sitemap",
    screenshot: "/screenshots/sitemap-admin.png",
    settingsScreenshot: "/screenshots/sitemap-settings.png",
  },
];

export const guides: GuideMeta[] = [
  {
    slug: "guides/getting-started",
    label: "Getting Started",
    translations: {
      es: "Primeros Pasos",
      ar: "البدء السريع",
      tr: "Başlangıç Kılavuzu",
    },
  },
  {
    slug: "guides/architecture",
    label: "Monorepo Architecture",
    translations: {
      es: "Arquitectura del Monorepo",
      ar: "هندسة المستودع الموحد",
      tr: "Monorepo Mimarisi",
    },
  },
  {
    slug: "guides/inter-plugin-bridges",
    label: "Inter-Plugin Bridges",
    translations: {
      es: "Puentes entre Plugins",
      ar: "جسور التكامل بين الإضافات",
      tr: "Eklentiler Arası Köprüler",
    },
  },
  {
    slug: "guides/security",
    label: "Security & Cryptography",
    translations: {
      es: "Seguridad y Criptografía",
      ar: "الأمان والتشفير الرقمي",
      tr: "Güvenlik ve Kriptografi",
    },
  },
  {
    slug: "guides/i18n-and-rtl",
    label: "i18n, RTL & Secondary Calendars",
    translations: {
      es: "i18n, RTL y Calendarios Litúrgicos",
      ar: "التدويل و RTL والتقاويم الثانوية",
      tr: "i18n, RTL ve İkincil Takvimler",
    },
  },
  {
    slug: "guides/contributing",
    label: "Tooling, CI & Release Workflow",
    translations: {
      es: "Herramientas, CI y Lanzamientos",
      ar: "أدوات التطوير والنشر المستمر",
      tr: "Araçlar, CI ve Sürüm Akışı",
    },
  },
];
