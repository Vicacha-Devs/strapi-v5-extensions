// Content-Type Entity architecture, locations, Pele Mermaid diagrams, and real-world use cases
// for all 15 @vicacha-devs Strapi v5 plugins.

import { PLUGIN_ENTITY_GUIDE_A } from "./plugin-use-cases-a.ts";
import { PLUGIN_ENTITY_GUIDE_B } from "./plugin-use-cases-b.ts";

export type UseCaseScreenshotKind =
  | "admin"
  | "settings"
  | "palette"
  | "content-manager";

export type UseCaseTuple = readonly [
  title: string,
  purpose: string,
  workflow: string,
  mermaid: string,
  screenshotKind?: UseCaseScreenshotKind,
];

export interface PluginEntityGuideEntry {
  howItWorks: string;
  whereToFind: string[];
  entityMermaid: string;
  useCases: UseCaseTuple[];
}

export const PLUGIN_ENTITY_GUIDE: Record<string, PluginEntityGuideEntry> = {
  ...PLUGIN_ENTITY_GUIDE_A,
  ...PLUGIN_ENTITY_GUIDE_B,
};
