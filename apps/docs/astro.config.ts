import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, passthroughImageService } from "astro/config";
import { existsSync, readFileSync } from "node:fs";
import starlightLlmsTxt from "starlight-llms-txt";
import starlightOpenAPI from "starlight-openapi";

import { guides, type PluginPackageMeta, plugins } from "./docs-packages.ts";
import { remarkPele } from "./src/plugins/remark-pele.ts";

interface SidebarLinkItem {
  label: string;
  link: string;
}

interface SidebarTagGroup {
  label: string;
  collapsed?: boolean;
  items: SidebarLinkItem[];
}

interface SidebarSlugItem {
  label: string;
  translations: Record<string, string>;
  slug: string;
}

type SidebarItem = SidebarSlugItem | SidebarTagGroup;

const sidebarJsonUrl = new URL("./schemas/_sidebar.json", import.meta.url);
const apiSidebar: Record<string, SidebarTagGroup[]> = existsSync(sidebarJsonUrl)
  ? (JSON.parse(readFileSync(sidebarJsonUrl, "utf-8")) as Record<
      string,
      SidebarTagGroup[]
    >)
  : {};

const apiPluginConfigs = plugins
  .filter((p) => Boolean(p.schemaFile))
  .map((p) => ({
    base: `${p.slug}/api`,
    schema: `./schemas/${p.schemaFile}.yaml`,
    label: p.label,
  }));

function buildPluginSidebar(p: PluginPackageMeta) {
  const items: SidebarItem[] = [
    {
      label: "Overview",
      translations: {
        es: "Resumen",
        ar: "نظرة عامة",
        tr: "Genel Bakış",
      },
      slug: p.slug,
    },
    {
      label: "Content Types & Use Cases",
      translations: {
        es: "Entidades Content-Type y Casos de Uso",
        ar: "كيانات المحتوى وحالات الاستخدام",
        tr: "İçerik Türleri ve Kullanım Senaryoları",
      },
      slug: `${p.slug}/use-cases`,
    },
    {
      label: "Developer Guide & Admin UI",
      translations: {
        es: "Guía de Desarrollo y Admin UI",
        ar: "دليل المطور وواجهة الإدارة",
        tr: "Geliştirici Kılavuzu ve Yönetim Arayüzü",
      },
      slug: `${p.slug}/guide`,
    },
  ];
  if (p.schemaFile && apiSidebar[p.slug]) {
    items.push(...apiSidebar[p.slug]);
  }
  return {
    label: p.label,
    translations: p.translations,
    items,
  };
}

export default defineConfig({
  site: "https://strapi-extensions.vicacha.dev",
  output: "static",
  image: {
    service: passthroughImageService(),
  },
  markdown: {
    remarkPlugins: [remarkPele],
  },
  vite: { plugins: [tailwindcss()] },
  integrations: [
    starlight({
      title: {
        en: "Vicacha Strapi v5 Extensions",
        es: "Extensiones Strapi v5 — Vicacha",
        ar: "إضافات Strapi v5 — فيكاتشا",
        tr: "Vicacha Strapi v5 Eklentileri",
      },
      description:
        "Enterprise Strapi v5 plugins for scheduling, events, bookings, digital certificates, donations, omnichannel broadcasts, media feeds, global search, and SEO.",
      defaultLocale: "root",
      locales: {
        root: {
          label: "English",
          lang: "en",
        },
        es: {
          label: "Español",
          lang: "es",
        },
        ar: {
          label: "العربية",
          lang: "ar",
          dir: "rtl",
        },
        tr: {
          label: "Türkçe",
          lang: "tr",
        },
      },
      head: [
        {
          tag: "script",
          attrs: { src: "/vendor/pele.global.js", defer: true },
        },
        {
          tag: "script",
          attrs: { src: "/vendor/pele-init.js", defer: true },
        },
      ],
      plugins: [starlightOpenAPI(apiPluginConfigs), starlightLlmsTxt()],
      sidebar: [
        {
          label: "Architecture & Guides",
          translations: {
            es: "Arquitectura y Guías",
            ar: "الهندسة والأدلة",
            tr: "Mimari ve Kılavuzlar",
          },
          items: guides.map((g) => ({
            label: g.label,
            translations: g.translations,
            slug: g.slug,
          })),
        },
        ...(plugins.map((p) => buildPluginSidebar(p)) as never[]),
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/Vicacha-Devs/strapi-v5-extensions",
        },
      ],
      customCss: ["./src/styles/global.css"],
      favicon: "/favicon.svg",
    }),
  ],
});
