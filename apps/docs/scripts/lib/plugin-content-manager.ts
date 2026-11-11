// Renders the Strapi v5 Content Manager Integration section (Screenshot, Why, How to Use,
// Interactive Pele Mermaid Diagram, and Content Manager Use Cases) for every plugin.

import type {
  PluginPackageMeta,
  SupportedLocale,
} from "../../docs-packages.ts";
import { PLUGIN_CM_GUIDE_A } from "./plugin-cm-guide-a.ts";
import { PLUGIN_CM_GUIDE_B } from "./plugin-cm-guide-b.ts";

export type ContentManagerUseCaseTuple = readonly [
  title: string,
  whyAndPurpose: string,
  howToExecute: string,
];

export interface PluginContentManagerGuide {
  sidebarGroup: string;
  cmEntities: string[];
  whySummary: string;
  whyBullets: string[];
  howToUseSteps: string[];
  cmMermaid: string;
  cmUseCases: ContentManagerUseCaseTuple[];
}

export const PLUGIN_CM_GUIDE: Record<string, PluginContentManagerGuide> = {
  ...PLUGIN_CM_GUIDE_A,
  ...PLUGIN_CM_GUIDE_B,
};

interface CmLocaleHeadings {
  sectionHeading: string;
  sidebarGroupLabel: string;
  registeredEntitiesLabel: string;
  whyHeading: string;
  howToUseHeading: string;
  workflowDiagramHeading: string;
  useCasesHeading: string;
  purposeLabel: string;
  stepsLabel: string;
  screenshotCaptionSuffix: string;
}

export const CM_LOCALE_HEADINGS: Record<SupportedLocale, CmLocaleHeadings> = {
  en: {
    sectionHeading:
      "Strapi v5 Content Manager Integration (`/admin/content-manager`)",
    sidebarGroupLabel: "Content Manager Sidebar Group",
    registeredEntitiesLabel: "Content Manager Entities & Components",
    whyHeading: "Why This Plugin Creates & Integrates Content Manager Entities",
    howToUseHeading: "How to Use in Strapi Content Manager (Step-by-Step)",
    workflowDiagramHeading:
      "Content Manager & Plugin Workspace Synchronization",
    useCasesHeading: "Content Manager Use Cases & Editorial Workflows",
    purposeLabel: "Why & What it is for",
    stepsLabel: "How to use in Content Manager",
    screenshotCaptionSuffix:
      "Strapi v5 Content Manager Entities & Editorial View",
  },
  es: {
    sectionHeading:
      "Integración con el Content Manager de Strapi v5 (`/admin/content-manager`)",
    sidebarGroupLabel: "Grupo en la Barra Lateral del Content Manager",
    registeredEntitiesLabel: "Entidades y Componentes en el Content Manager",
    whyHeading:
      "Por Qué Este Plugin Crea e Integra Entidades en el Content Manager",
    howToUseHeading:
      "Cómo Usarlo en el Content Manager de Strapi (Paso a Paso)",
    workflowDiagramHeading:
      "Sincronización entre el Content Manager y el Espacio del Plugin",
    useCasesHeading: "Casos de Uso en el Content Manager y Flujos Editoriales",
    purposeLabel: "Para qué sirve y por qué usarlo",
    stepsLabel: "Cómo ejecutarlo en el Content Manager",
    screenshotCaptionSuffix:
      "Vista de Entidades en el Content Manager de Strapi v5",
  },
  ar: {
    sectionHeading:
      "التكامل مع مدير المحتوى في Strapi v5 (`/admin/content-manager`)",
    sidebarGroupLabel: "مجموعة الشريط الجانبي في مدير المحتوى",
    registeredEntitiesLabel: "الكيانات والمكونات المسجلة في مدير المحتوى",
    whyHeading:
      "لماذا تنشئ هذه الإضافة كيانات داخل مدير المحتوى (Content Manager)؟",
    howToUseHeading: "كيفية الاستخدام داخل مدير المحتوى في Strapi (خطوة بخطوة)",
    workflowDiagramHeading: "التزامن بين مدير المحتوى ومساحة عمل الإضافة",
    useCasesHeading: "حالات الاستخدام داخل مدير المحتوى ومسارات العمل التحريرية",
    purposeLabel: "الغرض والأهمية",
    stepsLabel: "خطوات التنفيذ في مدير المحتوى",
    screenshotCaptionSuffix: "واجهة إدارة الكيانات في مدير المحتوى Strapi v5",
  },
  tr: {
    sectionHeading:
      "Strapi v5 İçerik Yöneticisi (Content Manager) Entegrasyonu (`/admin/content-manager`)",
    sidebarGroupLabel: "İçerik Yöneticisi Kenar Çubuğu Grubu",
    registeredEntitiesLabel: "İçerik Yöneticisi Varlıkları ve Bileşenleri",
    whyHeading: "Bu Eklenti Neden Content Manager Varlıkları Oluşturur?",
    howToUseHeading:
      "Strapi Content Manager İçinde Nasıl Kullanılır? (Adım Adım)",
    workflowDiagramHeading:
      "Content Manager ve Eklenti Çalışma Alanı Senkronizasyonu",
    useCasesHeading:
      "Content Manager Kullanım Senaryoları ve Editöryal İş Akışları",
    purposeLabel: "Amacı ve Neden Kullanıldığı",
    stepsLabel: "Content Manager İçinde Uygulama Adımları",
    screenshotCaptionSuffix:
      "Strapi v5 Content Manager Varlık ve Düzenleme Görünümü",
  },
};

export function buildContentManagerSectionMarkdown(
  pluginMeta: PluginPackageMeta,
  locale: SupportedLocale = "en",
  headingOverride?: string
): string {
  const cmGuide = PLUGIN_CM_GUIDE[pluginMeta.pluginId];
  if (!cmGuide) return "";

  const h = CM_LOCALE_HEADINGS[locale] || CM_LOCALE_HEADINGS.en;
  const localizedLabel =
    locale === "en"
      ? pluginMeta.label
      : pluginMeta.translations[locale] || pluginMeta.label;
  const heading = headingOverride || h.sectionHeading;

  const lines: string[] = [
    `## ${heading}`,
    "",
    `> **${h.sidebarGroupLabel}**: \`${cmGuide.sidebarGroup}\``,
    "",
    `### ${h.registeredEntitiesLabel}`,
    "",
    ...cmGuide.cmEntities.map((item) => `- ${item}`),
    "",
  ];

  if (pluginMeta.contentManagerScreenshot) {
    lines.push(
      `![${localizedLabel} — ${h.screenshotCaptionSuffix}](${pluginMeta.contentManagerScreenshot})`,
      ""
    );
  }

  lines.push(
    `### ${h.whyHeading}`,
    "",
    cmGuide.whySummary,
    "",
    ...cmGuide.whyBullets.map((b) => `- ${b}`),
    "",
    `### ${h.howToUseHeading}`,
    "",
    ...cmGuide.howToUseSteps.map((step, idx) => `${idx + 1}. ${step}`),
    ""
  );

  if (cmGuide.cmMermaid) {
    lines.push(
      `### ${h.workflowDiagramHeading}`,
      "",
      "```mermaid",
      cmGuide.cmMermaid,
      "```",
      ""
    );
  }

  if (cmGuide.cmUseCases.length > 0) {
    lines.push(`### ${h.useCasesHeading}`, "");
    for (const [ucTitle, ucPurpose, ucSteps] of cmGuide.cmUseCases) {
      lines.push(
        `#### ${ucTitle}`,
        "",
        `- **${h.purposeLabel}**: ${ucPurpose}`,
        `- **${h.stepsLabel}**: ${ucSteps}`,
        ""
      );
    }
  }

  return lines.join("\n");
}
