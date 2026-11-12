import type { NonDefaultLocale } from "../../docs-packages.ts";
import { buildLocalizedLanding } from "./i18n-landing.ts";
import { writeMarkdownFile, yamlQuote } from "./plugin-doc-builder.ts";

interface GuideTemplateEntry {
  title: string;
  description: string;
  body: string;
}

const GUIDE_TEMPLATES: Record<
  NonDefaultLocale,
  Record<string, GuideTemplateEntry>
> = {
  es: {
    "getting-started": {
      title: "Primeros Pasos",
      description:
        "Instalación, configuración en config/plugins.ts y verificación de los plugins @vicacha-devs en Strapi v5.",
      body: `## Requisitos del Sistema

| Componente | Versión Requerida | Notas Técnicas |
| :--- | :--- | :--- |
| **Strapi** | \`^5.0.0\` (\`5.39.0\` verificado) | Utiliza Document Service API (\`strapi.documents\`) y Design System v2 |
| **Node.js** | \`>=20.16.0\` (Node 24 LTS recomendado) | Soporte nativo ESM y criptografía Ed25519 (\`node:crypto\`) |
| **pnpm** | \`>=10.0.0\` (\`pnpm@10.33.3\`) | Aislamiento de dependencias peer con \`hoistPattern: ["*", "!@strapi/*"]\` |

## 1. Instalación de Paquetes

\`\`\`bash
pnpm add @vicacha-devs/strapi-plugin-calendar @vicacha-devs/strapi-plugin-events @vicacha-devs/strapi-plugin-bookings
\`\`\`

## 2. Configuración en \`config/plugins.ts\`

\`\`\`ts
export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => ({
  calendar: { enabled: true, config: { defaultTimezone: env("CALENDAR_DEFAULT_TIMEZONE", "America/Bogota") } },
  events: { enabled: true },
  bookings: { enabled: true },
});
\`\`\`

![Panel de Administración Strapi v5](/screenshots/dashboard-overview.png)`,
    },
    "architecture": {
      title: "Arquitectura del Monorepo",
      description:
        "Estructura pnpm + Turborepo, aislamiento de dependencias Strapi, compilación dual y límite estricto de 500 líneas por archivo.",
      body: `## Aislamiento de Dependencias Peer (\`pnpm-workspace.yaml\`)

Para evitar duplicación de contextos de React y \`@strapi/design-system\`, el archivo \`pnpm-workspace.yaml\` aplica dos reglas esenciales:
- \`hoistPattern: ["*", "!@strapi/*"]\`: Impide que los paquetes \`@strapi/*\` se eleven a la raíz del monorepo.
- \`linkWorkspacePackages: true\`: Resuelve dependencias peer entre plugins (\`@vicacha-devs/strapi-plugin-calendar\`) directamente desde el espacio de trabajo local.

## Anatomía Dual (\`admin\` + \`server\` + \`shared\`)

Cada plugin exporta tres puntos de entrada validados con \`publint ({ strict: true })\` y \`@strapi/sdk-plugin\`:
1. \`./strapi-admin\`: Interfaz en React 18 + Strapi Design System v2 + 13 idiomas.
2. \`./strapi-server\`: Content-Types, controladores, servicios, políticas RBAC y rutas REST.
3. \`./shared\`: Motores puros en TypeScript (expansión RRULE, cálculo de turnos, calendarios CLDR e iCal/CSV).`,
    },
    "inter-plugin-bridges": {
      title: "Puentes entre Plugins",
      description:
        "Descubrimiento automático en tiempo de arranque entre calendar, events, bookings, donations, certificates, islam e inbox.",
      body: `## Topología de Integración Automática

| Plugin Origen | Plugin Destino | Comportamiento en \`bootstrap\` |
| :--- | :--- | :--- |
| **\`events\`** | **\`calendar\`** | Registra automáticamente la colección \`plugin::events.event\` como fuente del calendario unificado con reglas RRULE. |
| **\`bookings\`** | **\`calendar\`** | Registra las reservas \`plugin::bookings.booking\` con colores por estado (\`confirmed\`, \`pending\`, \`cancelled\`). |
| **\`donations\`** | **\`certificates\`** | Emite certificados fiscales firmados con Ed25519 al confirmarse el pago de una donación o factura. |
| **\`islam\`** | **\`calendar\` & \`inbox\`** | Sincroniza el ajuste lunar Hijri (\`dayOffset\`) y publica alertas globales al confirmarse el avistamiento del Hilal. |

![Calendario Unificado con Eventos y Reservas](/screenshots/calendar-admin.png)`,
    },
    "security": {
      title: "Seguridad y Criptografía",
      description:
        "Firmas digitales Ed25519, webhooks HMAC-SHA256 en tiempo constante, prevención de SSRF/Path Traversal y protección de PII.",
      body: `## Controles de Seguridad en Profundidad

1. **Firmas Criptográficas Ed25519 (\`certificates\`)**: Cada certificado serializa un payload canónico firmado con clave privada Ed25519 y verificable públicamente mediante código QR.
2. **Webhooks HMAC-SHA256 en Tiempo Constante (\`donations\`, \`certificates\`)**: Uso estricto de \`crypto.timingSafeEqual\` para validar notificaciones de Wompi, Stripe y DocuSign.
3. **Protección SSRF y Sanitización de Archivos (\`resources\`, \`media-feeds\`)**: Bloqueo de rangos IP privados/loopback y sanitización con \`path.basename()\` más cabeceras \`X-Content-Type-Options: nosniff\`.
4. **Enmascaramiento y Hash Salado de PII**: Los documentos de identidad se almacenan con sal única por certificado y se muestran enmascarados (\`***-***-4821\`).`,
    },
    "i18n-and-rtl": {
      title: "i18n, RTL y Calendarios Litúrgicos",
      description:
        "Soporte completo para 13 idiomas en el Admin UI, adaptación automática RTL (árabe y urdu) y calendarios secundarios CLDR.",
      body: `## Paridad de Traducción en 13 Idiomas

Todos los plugins incluyen diccionarios verificados por pruebas unitarias para \`en\`, \`es\`, \`ar\` (RTL), \`tr\`, \`fr\`, \`de\`, \`pt\`, \`it\`, \`nl\`, \`pl\`, \`id\`, \`ur\` (RTL) y \`zh\`.

## Calendarios Secundarios CLDR (\`islamic-umalqura\`, \`hebrew\`, \`persian\`)

El motor compartido \`@vicacha-devs/strapi-plugin-calendar/shared\` permite renderizar fechas secundarias Hijri (Umm al-Qura con ajuste lunar \`-2\` a \`+2\`), Hebreas y Persas junto al calendario Gregoriano en todas las vistas.`,
    },
    "contributing": {
      title: "Herramientas, CI y Lanzamientos",
      description:
        "Flujo de calidad con oxfmt, oxlint, ESLint v10, Husky, Commitlint, publint, Semantic Release y portal de documentación.",
      body: `## Cómo Usar y Mantener el Portal de Documentación (\`apps/docs\`)

1. **Resumen (\`/<plugin-slug>/\`)**: Sincronizado desde \`packages/<dir>/README.md\` con capturas Playwright del Admin de Strapi v5.
2. **Entidades Content-Type y Casos de Uso (\`/<plugin-slug>/use-cases/\`)**: Entidades Content-Type, diagramas interactivos Pele (Mermaid) y capturas por caso de uso.
3. **Guía de Desarrollo y Admin UI (\`/<plugin-slug>/guide/\`)**: Referencia de Content-Types (\`schema.json\`), cobertura i18n de 13 idiomas, ejemplos TypeScript y tabla de rutas.
4. **Referencia OpenAPI 3.0.3 (\`/<plugin-slug>/api/\`)**: Generada automáticamente por \`scripts/generate-openapi.ts\`.
5. **Índice IA (\`/llms.txt\` y \`/llms-full.txt\`)**: Contexto completo listo para asistentes de código e IA.

\`\`\`bash
pnpm --filter @vicacha-devs/docs dev
pnpm --filter @vicacha-devs/docs build
pnpm --filter @vicacha-devs/docs test:judges
pnpm format:check && pnpm lint && pnpm verify
\`\`\``,
    },
  },
  ar: {
    "getting-started": {
      title: "البدء السريع",
      description:
        "تثبيت وإعداد إضافات @vicacha-devs على نظام Strapi v5 والتحقق من جاهزيتها.",
      body: `## متطلبات النظام الأساسية

| المكون | الإصدار المطلوب | ملاحظات تقنية |
| :--- | :--- | :--- |
| **Strapi** | \`^5.0.0\` (\`5.39.0\`) | يعتمد على Document Service API (\`strapi.documents\`) ونظام التصميم v2 |
| **Node.js** | \`>=20.16.0\` (يُوصى بـ Node 24 LTS) | دعم أصلي لوحدات ESM والتوقيع الرقمي Ed25519 |
| **pnpm** | \`>=10.0.0\` (\`pnpm@10.33.3\`) | عزل حزم Strapi عبر \`hoistPattern: ["*", "!@strapi/*"]\` |

\`\`\`bash
pnpm add @vicacha-devs/strapi-plugin-calendar @vicacha-devs/strapi-plugin-events @vicacha-devs/strapi-plugin-bookings
\`\`\`

![لوحة تحكم Strapi v5 مع كافة الإضافات](/screenshots/dashboard-overview.png)`,
    },
    "architecture": {
      title: "هندسة المستودع الموحد",
      description:
        "بنية pnpm + Turborepo وعزل اعتماديات Strapi وبنية الحزم المزدوجة للواجهة والخادم.",
      body: `## عزل اعتماديات Strapi (\`pnpm-workspace.yaml\`)

يعتمد المستودع على إعداد \`hoistPattern: ["*", "!@strapi/*"]\` و \`linkWorkspacePackages: true\` لضمان عدم تكرار سياقات React داخل لوحة التحكم مع ربط الإضافات المتكاملة محلياً.

## البنية الثلاثية للإضافات (\`admin\` + \`server\` + \`shared\`)

1. \`./strapi-admin\`: واجهات React 18 متوافقة مع Strapi Design System v2 و 13 لغة (بما فيها العربية RTL).
2. \`./strapi-server\`: مخططات البيانات، المعالجات، الخدمات، ونقاط النهاية البرمجية.
3. \`./shared\`: محركات حسابية نقية (التقويم الهجري، المواقيت الفلكية، وتوزيع الفترات الزمنية).`,
    },
    "inter-plugin-bridges": {
      title: "جسور التكامل بين الإضافات",
      description:
        "كيف تتكامل إضافات التقويم والفعاليات والحجوزات والتبرعات والشهادات والمنظومة الإسلامية وصندوق الوارد تلقائياً.",
      body: `## مصفوفة التكامل التلقائي

| الإضافة المصدر | الإضافة الهدف | آلية التكامل التلقائي |
| :--- | :--- | :--- |
| **\`events\`** | **\`calendar\`** | تسجيل الفعاليات والمؤتمرات تلقائياً في التقويم الموحد مع دعم قواعد التكرار RRULE. |
| **\`bookings\`** | **\`calendar\`** | عرض الحجوزات المؤكدة وقيد الانتظار مباشرة داخل مساحة عمل التقويم. |
| **\`donations\`** | **\`certificates\`** | إصدار شهادة تبرع موقعة رقمياً بـ Ed25519 فور تأكيد الدفع عبر البوابات الإلكترونية. |
| **\`islam\`** | **\`calendar\` و \`inbox\`** | تحديث فرق الهلال الهجري (\`dayOffset\`) ونشر شريط تنبيه عاجل عند ثبوت رؤية الهلال. |

![التقويم الموحد مع الفعاليات والحجوزات](/screenshots/calendar-admin.png)`,
    },
    "security": {
      title: "الأمان والتشفير الرقمي",
      description:
        "التوقيع الرقمي Ed25519 والتحقق من Webhooks عبر HMAC-SHA256 والحماية من ثغرات SSRF وعبور المسارات.",
      body: `## منظومة الحماية متعددة الطبقات

1. **التوقيع الرقمي Ed25519 (\`certificates\`)**: توقيع البيانات القانونية للشهادات والتحقق الفوري عبر رمز الاستجابة السريعة QR.
2. **حماية Webhooks بـ HMAC-SHA256 (\`donations\`, \`certificates\`)**: استخدام \`crypto.timingSafeEqual\` لمنع هجمات التوقيت الجانبية.
3. **منع SSRF وتأمين التنزيلات (\`resources\`)**: حظر العناوين الداخلية وتطهير أسماء الملفات عبر \`path.basename()\`.
4. **تعمية البيانات الشخصية (PII Masking)**: تجزئة أرقام الهوية مع ملح تشفيري فريد لكل شهادة.`,
    },
    "i18n-and-rtl": {
      title: "التدويل و RTL والتقاويم الثانوية",
      description:
        "دعم كامل لـ 13 لغة واتجاه الكتابة من اليمين إلى اليسار (RTL) وتقويم أم القرى الهجري والتقويم الفارسي والعبري.",
      body: `## تكافؤ الترجمة في 13 لغة واتجاه RTL

تدعم جميع الإضافات 13 لغة تشمل العربية (\`ar\`) والأردية (\`ur\`) باتجاه \`RTL\` كامل، بالإضافة إلى الإنجليزية والإسبانية والتركية والفرنسية والألمانية والبرتغالية والإيطالية والهولندية والبولندية والإندونيسية والصينية.

## التقويم الهجري (أم القرى) والتقاويم الثانوية

يوفر محرك \`calendar/shared\` عرض التواريخ الهجرية (\`islamic-umalqura\`) باللغة العربية أو المحلية جنباً إلى جنب مع التاريخ الميلادي مع إمكانية تعديل فرق الهلال من لوحة التحكم.`,
    },
    "contributing": {
      title: "أدوات التطوير والنشر المستمر",
      description:
        "منظومة الجودة باستخدام oxfmt و oxlint و ESLint v10 و Husky و Commitlint و publint و Semantic Release وبوابة التوثيق.",
      body: `## كيفية استخدام وتحديث بوابة التوثيق (\`apps/docs\`)

1. **نظرة عامة (\`/<plugin-slug>/\`)**: تُزامن تلقائياً من ملفات \`README.md\` مع لقطات Playwright للوحة التحكم.
2. **كيانات المحتوى وحالات الاستخدام (\`/<plugin-slug>/use-cases/\`)**: توثيق كيانات كل إضافة ومخططات Pele التفاعلية ولقطات الشاشة.
3. **دليل المطور ولوحة التحكم (\`/<plugin-slug>/guide/\`)**: توثيق شامل للمخططات والخدمات واللغات الـ 13.
4. **مرجع OpenAPI 3.0.3 التفاعلي (\`/<plugin-slug>/api/\`)**: يُولّد تلقائياً من مسارات الخادم.
5. **فهرس الذكاء الاصطناعي (\`/llms.txt\` و \`/llms-full.txt\`)**: جاهز لمساعدات البرمجة الذكية.

\`\`\`bash
pnpm --filter @vicacha-devs/docs dev
pnpm --filter @vicacha-devs/docs build
pnpm --filter @vicacha-devs/docs test:judges
pnpm format:check && pnpm lint && pnpm verify
\`\`\``,
    },
  },
  tr: {
    "getting-started": {
      title: "Başlangıç Kılavuzu",
      description:
        "@vicacha-devs Strapi v5 eklentilerinin kurulumu, config/plugins.ts yapılandırması ve doğrulanması.",
      body: `## Sistem Gereksinimleri

| Bileşen | Desteklenen Sürüm | Teknik Notlar |
| :--- | :--- | :--- |
| **Strapi** | \`^5.0.0\` (\`5.39.0\` test edildi) | Document Service API (\`strapi.documents\`) ve Design System v2 kullanır |
| **Node.js** | \`>=20.16.0\` (Node 24 LTS önerilir) | Yerel ESM ve Ed25519 kriptografik imzalama desteği |
| **pnpm** | \`>=10.0.0\` (\`pnpm@10.33.3\`) | \`hoistPattern: ["*", "!@strapi/*"]\` ile peer bağımlılık izolasyonu |

\`\`\`bash
pnpm add @vicacha-devs/strapi-plugin-calendar @vicacha-devs/strapi-plugin-events @vicacha-devs/strapi-plugin-bookings
\`\`\`

![Strapi v5 Yönetim Paneli Genel Görünümü](/screenshots/dashboard-overview.png)`,
    },
    "architecture": {
      title: "Monorepo Mimarisi",
      description:
        "pnpm + Turborepo çalışma alanı yapısı, Strapi bağımlılık izolasyonu, çift paket derlemesi ve 500 satır modülerlik kuralı.",
      body: `## Strapi Peer İzolasyonu (\`pnpm-workspace.yaml\`)

\`pnpm-workspace.yaml\` içindeki \`hoistPattern: ["*", "!@strapi/*"]\` ve \`linkWorkspacePackages: true\` ayarları, React bağlamlarının çoğaltılmasını önlerken eklentiler arası bağımlılıkları yerel olarak çözümler.

## Çift Paket Mimarisi (\`admin\` + \`server\` + \`shared\`)

1. \`./strapi-admin\`: React 18, Strapi Design System v2 ve 13 dilde yerelleştirilmiş yönetim arayüzü.
2. \`./strapi-server\`: İçerik türleri, denetleyiciler, servisler, RBAC politikaları ve REST API rotaları.
3. \`./shared\`: İzomorfik TypeScript motorları (RRULE, zaman dilimi hesaplama, Hicri/CLDR takvim ve iCal/CSV).`,
    },
    "inter-plugin-bridges": {
      title: "Eklentiler Arası Köprüler",
      description:
        "calendar, events, bookings, donations, certificates, islam ve inbox eklentileri arasındaki otomatik çalışma zamanı köprüleri.",
      body: `## Otomatik Entegrasyon Matrisi

| Kaynak Eklenti | Hedef Eklenti | Çalışma Zamanı Davranışı |
| :--- | :--- | :--- |
| **\`events\`** | **\`calendar\`** | \`plugin::events.event\` kayıtlarını RRULE tekrarıyla birlikte birleşik FullCalendar çalışma alanına kaydeder. |
| **\`bookings\`** | **\`calendar\`** | Onaylanan ve bekleyen \`plugin::bookings.booking\` rezervasyonlarını birleşik takvimde gösterir. |
| **\`donations\`** | **\`certificates\`** | Bağış veya fatura ödemesi onaylandığında otomatik olarak Ed25519 imzalı sertifika/makbuz üretir. |
| **\`islam\`** | **\`calendar\` ve \`inbox\`** | Hilal gözlemi onaylandığında Hicri gün farkını (\`dayOffset\`) günceller ve \`inbox\` üzerinde duyuru bandı yayınlar. |

![Birleşik Takvim Çalışma Alanı](/screenshots/calendar-admin.png)`,
    },
    "security": {
      title: "Güvenlik ve Kriptografi",
      description:
        "Ed25519 dijital imzalar, sabit zamanlı HMAC-SHA256 webhook doğrulaması, SSRF/Path Traversal koruması ve PII maskeleme.",
      body: `## Derinlemesine Güvenlik Kontrolleri

1. **Ed25519 Dijital İmzalar (\`certificates\`)**: Her sertifika kanonik JSON yükü üzerinden Ed25519 özel anahtarıyla imzalanır ve QR kod ile doğrulanır.
2. **Sabit Zamanlı HMAC-SHA256 Webhooks (\`donations\`, \`certificates\`)**: Zamanlama saldırılarını önlemek için \`crypto.timingSafeEqual\` kullanılır.
3. **SSRF, DOMPurify ve Dosya Yolu Güvenliği (\`resources\`, \`media-feeds\`, \`tiptap-editor\`)**: Özel IP blokları engellenir, HTML çıktıları temizlenir ve dosya adları \`path.basename()\` ile doğrulanır.
4. **Tuzlanmış PII Özeti ve Maskeleme**: Kimlik numaraları seri bazlı tuz ile özetlenir ve \`***-***-4821\` biçiminde maskelenir.`,
    },
    "i18n-and-rtl": {
      title: "i18n, RTL ve İkincil Takvimler",
      description:
        "13 dilde Yönetim Paneli çeviri eşitliği, Arapça/Urduca RTL düzen uyumu ve Hicri, İbranice ve Farsça takvimler.",
      body: `## 13 Dilde Yönetim Paneli Çeviri Eşitliği

Tüm eklentiler \`en\`, \`es\`, \`ar\` (RTL), \`tr\`, \`fr\`, \`de\`, \`pt\`, \`it\`, \`nl\`, \`pl\`, \`id\`, \`ur\` (RTL) ve \`zh\` dillerinde birim testleriyle doğrulanmış tam çeviri sözlükleriyle gelir.

## CLDR İkincil Takvim Motoru

\`@vicacha-devs/strapi-plugin-calendar/shared\` paketi Miladi takvimin yanında Hicri (\`islamic-umalqura\`), İbranice (\`hebrew\`) ve Farsça (\`persian\`) tarihleri sıfır harici bağımlılıkla görüntüler.`,
    },
    "contributing": {
      title: "Araçlar, CI ve Sürüm Akışı",
      description:
        "oxfmt, oxlint, ESLint v10, Husky, Commitlint, publint, Semantic Release ve dokümantasyon portalı iş akışı.",
      body: `## Dokümantasyon Portalı Kullanımı ve Bakımı (\`apps/docs\`)

1. **Genel Bakış (\`/<plugin-slug>/\`)**: \`packages/<dir>/README.md\` dosyalarından ve Playwright yönetim paneli ekran görüntülerinden senkronize edilir.
2. **Geliştirici Kılavuzu (\`/<plugin-slug>/guide/\`)**: İçerik türü şemaları (\`schema.json\`), 13 dil çeviri kapsamı, TypeScript servis örnekleri ve uç nokta özet tablosu.
3. **Etkileşimli OpenAPI 3.0.3 Referansı (\`/<plugin-slug>/api/\`)**: \`scripts/generate-openapi.ts\` ile otomatik üretilir.
4. **Yapay Zeka Bağlam İndeksi (\`/llms.txt\` ve \`/llms-full.txt\`)**: Yapay zeka kodlama asistanları için tam dokümantasyon indeksi.

\`\`\`bash
pnpm --filter @vicacha-devs/docs dev
pnpm --filter @vicacha-devs/docs build
pnpm --filter @vicacha-devs/docs test:judges
pnpm format:check && pnpm lint && pnpm verify
\`\`\``,
    },
  },
};

export function generateLocalizedLandingAndGuides(
  contentDocsRoot: string
): void {
  const locales: NonDefaultLocale[] = ["es", "ar", "tr"];
  for (const locale of locales) {
    const landingMdx = buildLocalizedLanding(locale);
    writeMarkdownFile(contentDocsRoot, `${locale}/index.mdx`, landingMdx);

    const localeGuides = GUIDE_TEMPLATES[locale];
    for (const [guideName, guideData] of Object.entries(localeGuides)) {
      const md = [
        "---",
        `title: ${yamlQuote(guideData.title)}`,
        `description: ${yamlQuote(guideData.description)}`,
        "---",
        "",
        guideData.body.trim(),
        "",
      ].join("\n");
      writeMarkdownFile(
        contentDocsRoot,
        `${locale}/guides/${guideName}.md`,
        md
      );
    }
  }
}
