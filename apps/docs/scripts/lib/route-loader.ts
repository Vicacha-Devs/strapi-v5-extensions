import { existsSync, readFileSync } from "node:fs";
import * as nodeModule from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export interface NormalizedPluginRoute {
  method: string;
  path: string;
  handler: string;
  routeType: string;
  authenticated: boolean;
}

interface RawRouteConfig {
  auth?: boolean;
}

interface RawRouteDefinition {
  method?: string;
  path?: string;
  handler?: string;
  config?: RawRouteConfig;
}

interface RawRouteGroup {
  type?: string;
  routes?: RawRouteDefinition[];
}

interface ResolveContext {
  parentURL?: string;
}

type NextResolve = (specifier: string, context: ResolveContext) => unknown;
type NextLoad = (url: string, context: unknown) => unknown;

interface NodeModuleWithTypeScriptHooks {
  registerHooks: (hooks: {
    resolve: (
      specifier: string,
      context: ResolveContext,
      nextResolve: NextResolve
    ) => unknown;
    load: (url: string, context: unknown, nextLoad: NextLoad) => unknown;
  }) => void;
  stripTypeScriptTypes: (
    code: string,
    options?: { mode?: "strip" | "transform" }
  ) => string;
}

const tsModuleApi = nodeModule as unknown as NodeModuleWithTypeScriptHooks;

let hooksRegistered = false;

export function ensureTsModuleHooks(): void {
  if (hooksRegistered) return;
  hooksRegistered = true;
  tsModuleApi.registerHooks({
    resolve(
      specifier: string,
      context: ResolveContext,
      nextResolve: NextResolve
    ) {
      if (
        (specifier.startsWith("./") || specifier.startsWith("../")) &&
        context.parentURL
      ) {
        const parentDir = dirname(fileURLToPath(context.parentURL));
        const baseCandidate = resolve(parentDir, specifier);
        const candidates = [
          `${baseCandidate}.ts`,
          `${baseCandidate}.tsx`,
          `${baseCandidate}.json`,
          resolve(baseCandidate, "index.ts"),
          resolve(baseCandidate, "index.tsx"),
        ];
        for (const candidate of candidates) {
          if (existsSync(candidate)) {
            return nextResolve(pathToFileURL(candidate).href, context);
          }
        }
      }
      return nextResolve(specifier, context);
    },
    load(url: string, context: unknown, nextLoad: NextLoad) {
      if (url.endsWith(".json") && !url.includes("/node_modules/")) {
        const source = readFileSync(fileURLToPath(url), "utf8");
        return {
          format: "module",
          source: `export default ${source}`,
          shortCircuit: true,
        };
      }
      if (
        (url.endsWith(".ts") || url.endsWith(".tsx")) &&
        !url.includes("/node_modules/")
      ) {
        const source = readFileSync(fileURLToPath(url), "utf8");
        return {
          format: "module",
          source: tsModuleApi.stripTypeScriptTypes(source, { mode: "strip" }),
          shortCircuit: true,
        };
      }
      return nextLoad(url, context);
    },
  });
}

export async function loadPluginRoutes(
  pkgDir: string,
  pluginId: string
): Promise<NormalizedPluginRoute[]> {
  ensureTsModuleHooks();
  const candidates = [
    join(pkgDir, "server/src/routes/index.ts"),
    join(pkgDir, "server/routes/index.ts"),
  ];
  const found = candidates.find(existsSync);
  if (!found) return [];

  const mod = (await import(pathToFileURL(found).href)) as {
    default?: Record<string, RawRouteDefinition[] | RawRouteGroup>;
  };
  const exported = mod.default || {};
  const normalized: NormalizedPluginRoute[] = [];

  for (const [groupKey, groupVal] of Object.entries(exported)) {
    const routeList = Array.isArray(groupVal)
      ? groupVal
      : groupVal?.routes || [];
    const routeType =
      (!Array.isArray(groupVal) && groupVal?.type) ||
      (groupKey.includes("content") || groupKey === "frontend"
        ? "content-api"
        : "admin");

    for (const route of routeList) {
      if (!route?.method || !route?.path) continue;
      const prefix =
        routeType === "content-api" ? `/api/${pluginId}` : `/${pluginId}`;
      const cleanRoutePath = route.path.startsWith("/")
        ? route.path
        : `/${route.path}`;
      const fullPath = `${prefix}${cleanRoutePath}`.replace(
        /:([A-Za-z0-9_]+)/g,
        "{$1}"
      );
      const isPublic = route.config?.auth === false;
      normalized.push({
        method: String(route.method).toLowerCase(),
        path: fullPath,
        handler: String(route.handler || "controller.action"),
        routeType,
        authenticated: !isPublic,
      });
    }
  }
  return normalized;
}

export async function loadPluginServiceNames(
  pkgDir: string
): Promise<string[]> {
  ensureTsModuleHooks();
  const candidates = [
    join(pkgDir, "server/src/services/index.ts"),
    join(pkgDir, "server/services/index.ts"),
  ];
  const found = candidates.find(existsSync);
  if (!found) return ["service"];
  try {
    const mod = (await import(pathToFileURL(found).href)) as {
      default?: Record<string, unknown>;
    };
    const keys = Object.keys(mod.default || {});
    return keys.length > 0 ? keys : ["service"];
  } catch {
    return ["service"];
  }
}
