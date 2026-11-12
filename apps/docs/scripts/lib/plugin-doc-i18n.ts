// Localized headings, sample server configs, and inline schema metadata for plugin-doc-builder.ts

import type { SupportedLocale } from "../../docs-packages.ts";

export interface SchemaAttributeDoc {
  type: string;
  required?: boolean;
  enum?: string[];
  target?: string;
  customField?: string;
  component?: string;
  maxLength?: number;
  default?: unknown;
  private?: boolean;
}

export interface ContentTypeDoc {
  uidOverride?: string;
  singularName: string;
  displayName: string;
  kind: string;
  collectionName: string;
  visibleInContentManager: boolean;
  draftAndPublish: boolean;
  localized: boolean;
  description: string;
  attributes: Record<string, SchemaAttributeDoc>;
}

export interface LocaleDocText {
  guideTitleSuffix: string;
  guideDescPrefix: string;
  useCasesPageTitleSuffix: string;
  useCasesPageDescPrefix: string;
  installHeading: string;
  configHeading: string;
  configIntro: string;
  adminHeading: string;
  adminIntro: string;
  uiKeysHeading: string;
  uiKeyCol: string;
  uiValCol: string;
  schemasHeading: string;
  overviewSchemasHeading: string;
  whereToFindLabel: string;
  useCasesHeading: string;
  overviewUseCasesHeading: string;
  noSchemasNote: string;
  fieldCol: string;
  typeCol: string;
  reqCol: string;
  detailsCol: string;
  routesHeading: string;
  overviewRoutesHeading: string;
  methodCol: string;
  pathCol: string;
  scopeCol: string;
  handlerCol: string;
  authCol: string;
  serviceHeading: string;
  troubleshootingHeading: string;
  troubleshootingItems: string[];
  exploreUseCasesLink: string;
  exploreGuideLink: string;
  exploreApiLink: string;
  featuresHeading: string;
}

export const PLUGIN_SAMPLE_CONFIG: Record<string, string> = {
  "bookings":
    '      defaultTimezone: env("CALENDAR_DEFAULT_TIMEZONE", "UTC"),\n      defaultSlotDurationMinutes: 60,',
  "broadcasts":
    '      defaultSenderName: env("BROADCASTS_SENDER_NAME", "Community Hub"),\n      dryRun: false,',
  "calendar":
    '      defaultView: "dayGridMonth",\n      defaultTimezone: env("CALENDAR_DEFAULT_TIMEZONE", "UTC"),',
  "certificates":
    '      organizationName: env("CERTIFICATES_ORG_NAME", "Central Organization"),\n      verificationBaseUrl: env("CERTIFICATES_VERIFY_URL", "https://example.org/verify"),',
  "donations":
    '      baseCurrency: "USD",\n      autoIssueCertificateOnVerify: true,\n      enableCertificatesBridge: true,',
  "events":
    '      defaultTimezone: env("CALENDAR_DEFAULT_TIMEZONE", "UTC"),\n      defaultCapacity: 100,\n      waitlistEnabledByDefault: true,',
  "global-search":
    "      minChars: 2,\n      maxResults: 100,\n      includeDrafts: true,",
  "inbox": "      enableRateLimiting: true,\n      doubleOptInRequired: true,",
  "islam":
    '      defaultLat: 4.6685,\n      defaultLon: -74.0758,\n      method: "3",\n      quranFoundation: {\n        defaultScript: "uthmani",\n        defaultReciterId: 7, // Mishari Rashid al-`Afasy\n        defaultChapterReciterId: 7, // Mishari Rashid al-`Afasy\n      },\n      enableInboxAlertBridge: true,',
  "media-feeds":
    '      podcastTitle: env("PODCAST_TITLE", "Community Lectures"),\n      podcastLanguage: "es",',
  "notes": "      enablePinning: true,\n      enableLocaleScoping: true,",
  "resources":
    '      organizationName: env("RESOURCES_ORG_NAME", "Community Resource Center"),\n      defaultPublicationsFolderPath: "/resources/publications",\n      defaultGalleriesFolderPath: "/resources/galleries",\n      secondaryCalendar: "islamic-umalqura",\n      enableCloudinaryOptimization: true,\n      autoSyncMediaFolders: true,\n      maxPhotosPerAlbum: 200,',
  "seo": "      autoCreateComponent: true,",
  "sitemap":
    '      hostname: env("SITEMAP_HOSTNAME", "https://example.org"),\n      includeHreflang: true,',
  "tiptap-editor":
    '      presets: {\n        editorial: { bold: true, italic: true, heading: { levels: [1, 2, 3] }, link: true, mediaLibrary: true, table: true },\n      },\n      settings: {\n        defaultPreset: "editorial",\n        defaultOutputFormat: "json",\n        enableRelationalSync: true,\n      },',
};

export const SITEMAP_INLINE_CONTENT_TYPES: ContentTypeDoc[] = [
  {
    singularName: "sitemap-content-type",
    displayName: "Sitemap Content Type",
    kind: "collectionType",
    collectionName: "strapi_5_sitemap_plugin_content_types",
    visibleInContentManager: false,
    draftAndPublish: false,
    localized: false,
    description:
      "Per-locale URL pattern, priority, and changefreq mapping for a Strapi Content-Type entity",
    attributes: {
      type: { type: "string" },
      langcode: { type: "string" },
      pattern: { type: "string" },
      priority: { type: "float" },
      frequency: { type: "string" },
      lastModified: { type: "string" },
      thumbnail: { type: "string" },
      populateLinkedModels: { type: "string" },
    },
  },
  {
    singularName: "sitemap-content-type-single-url",
    displayName: "Sitemap Single URL",
    kind: "collectionType",
    collectionName: "strapi_5_sitemap_plugin_content_type_single_urls",
    visibleInContentManager: false,
    draftAndPublish: false,
    localized: false,
    description:
      "Custom static URL entry included alongside dynamic CMS entries in sitemap.xml",
    attributes: {
      slug: { type: "string" },
      priority: { type: "float" },
      frequency: { type: "string" },
    },
  },
  {
    singularName: "sitemap-option",
    displayName: "Sitemap Options",
    kind: "singleType",
    collectionName: "strapi_5_sitemap_plugin_options",
    visibleInContentManager: false,
    draftAndPublish: false,
    localized: false,
    description:
      "Global sitemap configuration (baseUrl, excludedUrls, useSitemapIndex, sitemapDefinitions)",
    attributes: {
      baseUrl: { type: "string" },
      excludedUrls: { type: "json", default: [] },
      useSitemapIndex: { type: "boolean", default: false },
      sitemapDefinitions: { type: "json", default: [] },
    },
  },
];

export const LOCALE_TEXT: Record<SupportedLocale, LocaleDocText> = {
  en: {
    guideTitleSuffix: "Developer Guide & Admin UI",
    guideDescPrefix:
      "Complete developer reference, content-type schemas, use cases, server configuration, and Admin UI tour for",
    useCasesPageTitleSuffix: "Content Types & Use Cases",
    useCasesPageDescPrefix:
      "Content-Type entities, Strapi v5 locations, interactive Pele architecture diagrams, and end-to-end use cases with screenshots for",
    installHeading: "1. Installation & Peer Setup",
    configHeading: "2. Server Configuration (`config/plugins.ts`)",
    configIntro:
      "Add the plugin configuration to your Strapi v5 `config/plugins.ts` file:",
    adminHeading: "3. Strapi v5 Admin UI Tour",
    adminIntro:
      "Once enabled, the plugin registers its workspace and settings inside the Strapi v5 Admin panel using Strapi Design System v2 components:",
    uiKeysHeading: "Key Localized Admin UI Labels",
    uiKeyCol: "Translation Key",
    uiValCol: "Rendered UI Label",
    schemasHeading:
      "4. Content-Type Entities, Locations & Schemas (`strapi.documents`)",
    overviewSchemasHeading:
      "2. Content-Type Entities, Locations & Schemas (`strapi.documents`)",
    whereToFindLabel: "Where to Find Content-Type Entities in Strapi v5",
    useCasesHeading: "5. End-to-End Use Cases & Workflows",
    overviewUseCasesHeading: "3. End-to-End Use Cases & Workflows",
    noSchemasNote:
      "This plugin operates dynamically across existing Strapi `api::*` and `plugin::*` Content-Type entities without creating separate collection tables.",
    fieldCol: "Attribute",
    typeCol: "Strapi Type",
    reqCol: "Required",
    detailsCol: "Constraints / Target",
    routesHeading: "6. REST API Endpoints (`content-api` & `admin`)",
    overviewRoutesHeading: "4. REST API Endpoints (`content-api` & `admin`)",
    methodCol: "Method",
    pathCol: "Endpoint Path",
    scopeCol: "Scope",
    handlerCol: "Controller Handler",
    authCol: "Auth",
    serviceHeading:
      "7. Programmatic Server Usage (`strapi.plugin` & `strapi.documents`)",
    troubleshootingHeading: "8. Troubleshooting & Verification",
    troubleshootingItems: [
      "**Admin panel changes not visible**: Run `pnpm strapi build` after modifying `config/plugins.ts`.",
      '**Peer dependency isolation**: Keep `hoistPattern: ["*", "!@strapi/*"]` in `pnpm-workspace.yaml` so `@strapi/*` contexts are never duplicated.',
      "**TypeScript type-checking**: Validate both `admin/tsconfig.json` and `server/tsconfig.json` via `pnpm --filter <pkg> test:ts`.",
    ],
    exploreUseCasesLink:
      "Explore Content-Type Entities & Use Cases (with Interactive Diagrams)",
    exploreGuideLink: "Explore the Developer Guide & Admin UI Tour",
    exploreApiLink: "Explore the Interactive OpenAPI Reference",
    featuresHeading: "1. Key Capabilities & Architecture",
  },
  es: {
    guideTitleSuffix: "Guía de Desarrollo y Admin UI",
    guideDescPrefix:
      "Referencia completa para desarrolladores, entidades Content-Type, casos de uso, configuración del servidor y Admin UI para",
    useCasesPageTitleSuffix: "Entidades Content-Type y Casos de Uso",
    useCasesPageDescPrefix:
      "Entidades Content-Type, ubicaciones en Strapi v5, diagramas interactivos Pele y casos de uso con capturas para",
    installHeading: "1. Instalación y Dependencias",
    configHeading: "2. Configuración del Servidor (`config/plugins.ts`)",
    configIntro:
      "Agregue la configuración del plugin en el archivo `config/plugins.ts` de su aplicación Strapi v5:",
    adminHeading:
      "3. Recorrido por la Interfaz de Administración (Strapi v5 Admin UI)",
    adminIntro:
      "Una vez habilitado, el plugin registra su espacio de trabajo y ajustes dentro del panel de administración de Strapi v5 utilizando Strapi Design System v2:",
    uiKeysHeading: "Etiquetas Localizadas de la Interfaz (Español)",
    uiKeyCol: "Clave de Traducción",
    uiValCol: "Texto en Interfaz",
    schemasHeading:
      "4. Entidades Content-Type, Ubicación y Esquemas (`strapi.documents`)",
    overviewSchemasHeading:
      "2. Entidades Content-Type, Ubicación y Esquemas (`strapi.documents`)",
    whereToFindLabel: "Dónde Encontrar las Entidades Content-Type en Strapi v5",
    useCasesHeading: "5. Casos de Uso y Flujos de Trabajo",
    overviewUseCasesHeading: "3. Casos de Uso y Flujos de Trabajo",
    noSchemasNote:
      "Este plugin opera dinámicamente sobre las entidades Content-Type existentes de Strapi (`api::*` y `plugin::*`).",
    fieldCol: "Atributo",
    typeCol: "Tipo en Strapi",
    reqCol: "Requerido",
    detailsCol: "Restricciones / Relación",
    routesHeading: "6. Endpoints REST API (`content-api` y `admin`)",
    overviewRoutesHeading: "4. Endpoints REST API (`content-api` y `admin`)",
    methodCol: "Método",
    pathCol: "Ruta del Endpoint",
    scopeCol: "Ámbito",
    handlerCol: "Controlador",
    authCol: "Autenticación",
    serviceHeading:
      "7. Uso Programático en el Servidor (`strapi.plugin` y `strapi.documents`)",
    troubleshootingHeading: "8. Solución de Problemas y Verificación",
    troubleshootingItems: [
      "**Cambios no visibles en el panel Admin**: Ejecute `pnpm strapi build` después de editar `config/plugins.ts`.",
      '**Aislamiento de dependencias peer**: Mantenga `hoistPattern: ["*", "!@strapi/*"]` en `pnpm-workspace.yaml` para evitar colisiones de contexto en React.',
      "**Verificación estricta de TypeScript**: Ejecute `pnpm check` para validar `admin/tsconfig.json` y `server/tsconfig.json`.",
    ],
    exploreUseCasesLink:
      "Explorar Entidades Content-Type y Casos de Uso (con Diagramas Interactivos)",
    exploreGuideLink: "Explorar la Guía de Desarrollo y Admin UI",
    exploreApiLink: "Explorar la Referencia Interactiva OpenAPI",
    featuresHeading: "1. Características Principales y Arquitectura",
  },
  ar: {
    guideTitleSuffix: "دليل المطور وواجهة الإدارة",
    guideDescPrefix:
      "المرجع الشامل للمطورين وكيانات أنواع المحتوى وحالات الاستخدام وإعدادات الخادم وجولة مصورة في لوحة تحكم Strapi v5 لإضافة",
    useCasesPageTitleSuffix: "كيانات المحتوى وحالات الاستخدام",
    useCasesPageDescPrefix:
      "كيانات أنواع المحتوى ومواقعها في Strapi v5 ومخططات Pele التفاعلية وحالات الاستخدام المصورة لإضافة",
    installHeading: "1. التثبيت وإعداد الاعتماديات",
    configHeading: "2. إعدادات الخادم (`config/plugins.ts`)",
    configIntro:
      "أضف إعدادات الإضافة إلى ملف `config/plugins.ts` في مشروع Strapi v5 الخاص بك:",
    adminHeading: "3. جولة في واجهة الإدارة (Strapi v5 Admin UI — دعم RTL)",
    adminIntro:
      "بمجرد تفعيل الإضافة، يتم تسجيل مساحة العمل والإعدادات داخل لوحة تحكم Strapi v5 مع دعم كامل للغة العربية واتجاه RTL:",
    uiKeysHeading: "نماذج من نصوص الواجهة المعربة (العربية)",
    uiKeyCol: "مفتاح الترجمة",
    uiValCol: "النص المعروض في الواجهة",
    schemasHeading:
      "4. كيانات أنواع المحتوى ومواقعها ومخططاتها (`strapi.documents`)",
    overviewSchemasHeading:
      "2. كيانات أنواع المحتوى ومواقعها ومخططاتها (`strapi.documents`)",
    whereToFindLabel: "أين تجد كيانات أنواع المحتوى في Strapi v5",
    useCasesHeading: "5. حالات الاستخدام ومسارات العمل المتكاملة",
    overviewUseCasesHeading: "3. حالات الاستخدام ومسارات العمل المتكاملة",
    noSchemasNote:
      "تعمل هذه الإضافة مباشرة على كيانات أنواع المحتوى الحالية في Strapi (`api::*` و `plugin::*`).",
    fieldCol: "الحقل",
    typeCol: "النوع في Strapi",
    reqCol: "إلزامي",
    detailsCol: "القيود / العلاقات",
    routesHeading:
      "6. نقاط النهاية البرمجية REST API (`content-api` و `admin`)",
    overviewRoutesHeading:
      "4. نقاط النهاية البرمجية REST API (`content-api` و `admin`)",
    methodCol: "الطريقة",
    pathCol: "مسار نقطة النهاية",
    scopeCol: "النطاق",
    handlerCol: "المعالج (Handler)",
    authCol: "المصادقة",
    serviceHeading:
      "7. الاستخدام البرمجي داخل الخادم (`strapi.plugin` و `strapi.documents`)",
    troubleshootingHeading: "8. استكشاف الأخطاء والتحقق من الجودة",
    troubleshootingItems: [
      "**عدم ظهور التغييرات في لوحة الإدارة**: قم بتشغيل `pnpm strapi build` بعد تعديل ملف `config/plugins.ts`.",
      '**عزل حزم Strapi**: حافظ على إعداد `hoistPattern: ["*", "!@strapi/*"]` داخل `pnpm-workspace.yaml` لمنع تكرار سياق React.',
      "**فحص الأنواع الصارم (TypeScript)**: قم بتشغيل `pnpm check` للتحقق من سلامة حزمتي الواجهة والخادم.",
    ],
    exploreUseCasesLink:
      "استكشف كيانات المحتوى وحالات الاستخدام (مع المخططات التفاعلية)",
    exploreGuideLink: "استكشف دليل المطور وواجهة الإدارة",
    exploreApiLink: "استكشف مرجع OpenAPI التفاعلي",
    featuresHeading: "1. المزايا الرئيسية والقدرات المعمارية",
  },
  tr: {
    guideTitleSuffix: "Geliştirici Kılavuzu ve Yönetim Arayüzü",
    guideDescPrefix:
      "İçerik türü varlıkları, kullanım senaryoları, sunucu yapılandırması, servis API'si ve Strapi v5 Yönetim Paneli turu:",
    useCasesPageTitleSuffix: "İçerik Türleri ve Kullanım Senaryoları",
    useCasesPageDescPrefix:
      "Strapi v5 içerik türü varlıkları, konumları, etkileşimli Pele diyagramları ve ekran görüntülü kullanım senaryoları:",
    installHeading: "1. Kurulum ve Bağımlılıklar",
    configHeading: "2. Sunucu Yapılandırması (`config/plugins.ts`)",
    configIntro:
      "Strapi v5 projenizin `config/plugins.ts` dosyasına eklenti yapılandırmasını ekleyin:",
    adminHeading: "3. Strapi v5 Yönetim Arayüzü (Admin UI) Turu",
    adminIntro:
      "Etkinleştirildiğinde eklenti, Strapi Design System v2 bileşenlerini kullanarak çalışma alanını ve ayarlarını yönetim paneline kaydeder:",
    uiKeysHeading: "Yerelleştirilmiş Arayüz Etiketleri (Türkçe)",
    uiKeyCol: "Çeviri Anahtarı",
    uiValCol: "Arayüz Metni",
    schemasHeading:
      "4. İçerik Türü Varlıkları, Konumları ve Şemaları (`strapi.documents`)",
    overviewSchemasHeading:
      "2. İçerik Türü Varlıkları, Konumları ve Şemaları (`strapi.documents`)",
    whereToFindLabel: "Strapi v5 İçinde İçerik Türü Varlıkları Nerede Bulunur?",
    useCasesHeading: "5. Uçtan Uca Kullanım Senaryoları ve İş Akışları",
    overviewUseCasesHeading: "3. Uçtan Uca Kullanım Senaryoları ve İş Akışları",
    noSchemasNote:
      "Bu eklenti, doğrudan mevcut Strapi içerik türü varlıkları (`api::*` ve `plugin::*`) üzerinde çalışır.",
    fieldCol: "Alan (Attribute)",
    typeCol: "Strapi Türü",
    reqCol: "Zorunlu",
    detailsCol: "Kısıtlamalar / İlişki",
    routesHeading: "6. REST API Uç Noktaları (`content-api` ve `admin`)",
    overviewRoutesHeading:
      "4. REST API Uç Noktaları (`content-api` ve `admin`)",
    methodCol: "Metot",
    pathCol: "Uç Nokta Yolu",
    scopeCol: "Kapsam",
    handlerCol: "Denetleyici (Handler)",
    authCol: "Kimlik Doğrulama",
    serviceHeading:
      "7. Sunucu Tarafı Programatik Kullanım (`strapi.plugin` ve `strapi.documents`)",
    troubleshootingHeading: "8. Sorun Giderme ve Doğrulama",
    troubleshootingItems: [
      "**Yönetim paneli değişiklikleri görünmüyor**: `config/plugins.ts` dosyasını güncelledikten sonra `pnpm strapi build` komutunu çalıştırın.",
      '**Strapi bağımlılık izolasyonu**: React bağlam çakışmalarını önlemek için `pnpm-workspace.yaml` içinde `hoistPattern: ["*", "!@strapi/*"]` ayarını koruyun.',
      "**Sıkı TypeScript kontrolü**: Hem `admin` hem de `server` paketlerini doğrulamak için `pnpm check` komutunu çalıştırın.",
    ],
    exploreUseCasesLink:
      "İçerik Türü Varlıkları ve Kullanım Senaryolarını İnceleyin (Diyagramlarla)",
    exploreGuideLink: "Geliştirici Kılavuzu ve Admin UI Turunu İnceleyin",
    exploreApiLink: "Etkileşimli OpenAPI Referansını İnceleyin",
    featuresHeading: "1. Temel Yetenekler ve Mimari Özellikler",
  },
};
