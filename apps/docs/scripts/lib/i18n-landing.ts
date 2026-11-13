import { type NonDefaultLocale, plugins } from "../../docs-packages.ts";
import { yamlQuote } from "./plugin-doc-builder.ts";

export interface LocaleLandingConfig {
  title: string;
  description: string;
  tagline: string;
  ctaPrimary: string;
  ctaSecondary: string;
  pillarsHeading: string;
  pillars: readonly [
    readonly [string, string],
    readonly [string, string],
    readonly [string, string],
    readonly [string, string],
  ];
  matrixHeading: string;
  colPkg: string;
  colId: string;
  colNpm: string;
}

export const LOCALE_LANDING: Record<NonDefaultLocale, LocaleLandingConfig> = {
  es: {
    title: "Extensiones Strapi v5 — Vicacha",
    description:
      "Suite empresarial de 17 plugins Strapi v5 para calendarios, eventos, reservas, certificados digitales, donaciones, difusiones omnicanal, búsqueda global, editor Tiptap y SEO.",
    tagline:
      "17 plugins modulares para Strapi v5 con firmas criptográficas Ed25519, soporte multilingüe (incluyendo RTL), especificaciones OpenAPI interactivas y puentes de integración automática.",
    ctaPrimary: "Primeros Pasos",
    ctaSecondary: "Arquitectura del Monorepo",
    pillarsHeading: "Pilares Fundamentales",
    pillars: [
      [
        "17 Plugins de Producción para Strapi v5",
        "Construidos nativamente sobre la Document Service API (`strapi.documents(uid)`), Design System v2 y compilación dual Admin + Server con `@strapi/sdk-plugin`.",
      ],
      [
        "Puentes Automáticos entre Plugins",
        "`events` y `bookings` se registran automáticamente en `calendar`; `donations` emite recibos firmados vía `certificates`; `islam` sincroniza el calendario Hijri y alertas en `inbox`.",
      ],
      [
        "Seguridad Criptográfica y Webhooks",
        "Firmas digitales Ed25519, validación HMAC-SHA256 en tiempo constante, sanitización DOMPurify, protección contra SSRF/Path Traversal y enmascaramiento de PII.",
      ],
      [
        "Paridad i18n en 13 Idiomas y RTL",
        "Traducciones completas para `en`, `es`, `ar` (RTL), `tr`, `fr`, `de`, `pt`, `it`, `nl`, `pl`, `id`, `ur` (RTL) y `zh` (más `cs` en `tiptap-editor`), y calendarios secundarios CLDR.",
      ],
    ],
    matrixHeading: "Catálogo Completo de Plugins (17 Paquetes)",
    colPkg: "Paquete",
    colId: "Plugin ID",
    colNpm: "Paquete NPM",
  },
  ar: {
    title: "إضافات Strapi v5 — فيكاتشا",
    description:
      "منظومة مؤسسية تضم 17 إضافة لنظام Strapi v5 تشمل التقويم والفعاليات والحجوزات والشهادات الرقمية والتبرعات والبث متعدد القنوات ومحرر النصوص Tiptap و SEO.",
    tagline:
      "17 إضافة معيارية لنظام Strapi v5 مدعومة بالتوقيع الرقمي Ed25519 و 13 لغة (بما فيها العربية RTL) ومراجع OpenAPI التفاعلية والتكامل التلقائي.",
    ctaPrimary: "البدء السريع",
    ctaSecondary: "هندسة المستودع الموحد",
    pillarsHeading: "الركائز الأساسية للمنظومة",
    pillars: [
      [
        "17 إضافة جاهزة للإنتاج على Strapi v5",
        "مبنية بالكامل باستخدام Document Service API (`strapi.documents(uid)`) ونظام التصميم Strapi Design System v2 وبنية الحزم المزدوجة.",
      ],
      [
        "جسور تكامل تلقائية بين الإضافات",
        "تسجيل تلقائي للفعاليات والحجوزات داخل التقويم الموحد، وإصدار إيصالات تبرع موقعة رقمياً عبر الشهادات، ومزامنة الهلال الهجري والتنبيهات.",
      ],
      [
        "تأمين التشفير الرقمي وحماية Webhooks",
        "توقيع Ed25519 الرقمي، والتحقق من تواقيع HMAC-SHA256 بزمن ثابت، وتنقية DOMPurify والحماية من ثغرات SSRF وعبور المسارات وتعمية البيانات الشخصية.",
      ],
      [
        "دعم كامل لـ 13 لغة واتجاه RTL والتقويم الهجري",
        "تكافؤ كامل في ترجمات لوحة التحكم لـ 13 لغة (بالإضافة إلى التشيكية في `tiptap-editor`) مع دعم كامل للغة العربية والأردية (RTL) وتقويم أم القرى الهجري.",
      ],
    ],
    matrixHeading: "دليل الإضافات الكامل (17 حزمة)",
    colPkg: "الإضافة",
    colId: "معرف Strapi",
    colNpm: "حزمة NPM",
  },
  tr: {
    title: "Vicacha Strapi v5 Eklentileri",
    description:
      "Takvim, etkinlikler, rezervasyonlar, dijital sertifikalar, bağışlar, çok kanallı yayınlar, medya akışları, Tiptap düzenleyici, küresel arama ve SEO için 17 kurumsal Strapi v5 eklentisi.",
    tagline:
      "Ed25519 kriptografik imzalama, 13 dil desteği (RTL dahil), etkileşimli OpenAPI referansları ve sıfır yapılandırmalı eklentiler arası köprülerle 17 modüler Strapi v5 eklentisi.",
    ctaPrimary: "Başlangıç Kılavuzu",
    ctaSecondary: "Monorepo Mimarisi",
    pillarsHeading: "Temel Mimari Sütunlar",
    pillars: [
      [
        "17 Üretime Hazır Strapi v5 Eklentisi",
        "Strapi v5 Document Service API (`strapi.documents(uid)`), Design System v2 ve `@strapi/sdk-plugin` çift paket mimarisi üzerine inşa edilmiştir.",
      ],
      [
        "Sıfır Yapılandırmalı Eklenti Köprüleri",
        "`events` ve `bookings` otomatik olarak `calendar` içine kaydolur; `donations` `certificates` üzerinden imzalı makbuz üretir; `islam` Hicri takvim ve `inbox` uyarılarını eşitler.",
      ],
      [
        "Kriptografik Güvenlik ve Webhook Koruması",
        "Ed25519 dijital imzalar, sabit zamanlı HMAC-SHA256 webhook doğrulaması, DOMPurify HTML temizleme, SSRF/Path Traversal koruması ve tuzlanmış PII maskeleme.",
      ],
      [
        "13 Dilde Yönetim Arayüzü ve RTL Desteği",
        "`en`, `es`, `ar` (RTL), `tr`, `fr`, `de`, `pt`, `it`, `nl`, `pl`, `id`, `ur` (RTL) ve `zh` (`tiptap-editor` içinde ayrıca `cs`) dillerinde tam çeviri eşitliği ve ikincil takvimler.",
      ],
    ],
    matrixHeading: "Tüm Eklenti Matrisi (17 Paket)",
    colPkg: "Eklenti",
    colId: "Strapi Eklenti Kimliği",
    colNpm: "NPM Paketi",
  },
};

export function buildLocalizedLanding(locale: NonDefaultLocale): string {
  const d = LOCALE_LANDING[locale];
  const pluginRows = plugins.map(
    (p) =>
      `| [${p.translations[locale]}](/${locale}/${p.slug}/) | \`${p.pluginId}\` | \`${p.npmName}\` |`
  );

  return [
    "---",
    `title: ${yamlQuote(d.title)}`,
    `description: ${yamlQuote(d.description)}`,
    "template: splash",
    "hero:",
    `  tagline: ${yamlQuote(d.tagline)}`,
    "  image:",
    "    file: ../../../../public/screenshots/dashboard-overview.png",
    "  actions:",
    `    - text: ${yamlQuote(d.ctaPrimary)}`,
    `      link: /${locale}/guides/getting-started/`,
    "      icon: right-arrow",
    `    - text: ${yamlQuote(d.ctaSecondary)}`,
    `      link: /${locale}/guides/architecture/`,
    "      variant: minimal",
    "      icon: external",
    "---",
    "",
    'import { Card, CardGrid } from "@astrojs/starlight/components";',
    "",
    `## ${d.pillarsHeading}`,
    "",
    "<CardGrid stagger>",
    `  <Card title=${yamlQuote(d.pillars[0][0])} icon="puzzle">${d.pillars[0][1]}</Card>`,
    `  <Card title=${yamlQuote(d.pillars[1][0])} icon="random">${d.pillars[1][1]}</Card>`,
    `  <Card title=${yamlQuote(d.pillars[2][0])} icon="approve-check-circle">${d.pillars[2][1]}</Card>`,
    `  <Card title=${yamlQuote(d.pillars[3][0])} icon="translate">${d.pillars[3][1]}</Card>`,
    "</CardGrid>",
    "",
    `## ${d.matrixHeading}`,
    "",
    `| ${d.colPkg} | ${d.colId} | ${d.colNpm} |`,
    "| :--- | :--- | :--- |",
    ...pluginRows,
    "",
  ].join("\n");
}
