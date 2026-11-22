import { existsSync, readFileSync } from "node:fs";
import * as nodeModule from "node:module";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const { registerHooks, stripTypeScriptTypes } = nodeModule;
const repoRoot = resolvePath(dirname(fileURLToPath(import.meta.url)), "../..");
const packagesDir = join(repoRoot, "packages");

function resolveWorkspacePackage(specifier) {
  if (!specifier.startsWith("@vicacha-devs/")) return null;
  const rest = specifier.slice("@vicacha-devs/".length);
  const parts = rest.split("/");
  const pkgFolder = parts[0];
  const subPath = parts.slice(1).join("/");
  const pkgDir = join(packagesDir, pkgFolder);
  if (!existsSync(pkgDir)) return null;

  const candidates = subPath
    ? [
        join(pkgDir, `${subPath}.ts`),
        join(pkgDir, subPath, "index.ts"),
        join(pkgDir, "src", `${subPath}.ts`),
        join(pkgDir, "src", subPath, "index.ts"),
      ]
    : [
        join(pkgDir, "src", "index.ts"),
        join(pkgDir, "shared", "index.ts"),
        join(pkgDir, "index.ts"),
      ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return pathToFileURL(candidate).href;
    }
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const workspaceUrl = resolveWorkspacePackage(specifier);
    if (workspaceUrl) {
      return { url: workspaceUrl, shortCircuit: true };
    }
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL
    ) {
      const base = resolvePath(
        dirname(fileURLToPath(context.parentURL)),
        specifier
      );
      const candidates = [
        `${base}.ts`,
        `${base}.tsx`,
        `${base}.json`,
        join(base, "index.ts"),
        join(base, "index.tsx"),
      ];
      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },

  load(url, context, nextLoad) {
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
      !url.includes("/node_modules/") &&
      typeof stripTypeScriptTypes === "function"
    ) {
      const source = readFileSync(fileURLToPath(url), "utf8");
      return {
        format: "module",
        source: stripTypeScriptTypes(source, { mode: "strip" }),
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});
