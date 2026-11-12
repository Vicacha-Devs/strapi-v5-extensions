import { existsSync, readFileSync, statSync } from "node:fs";
import * as nodeModule from "node:module";
const { registerHooks, stripTypeScriptTypes } = nodeModule as Record<
  string,
  any
>;
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const calendarPkgRoot = resolvePath(currentDir, "../../strapi-plugin-calendar");
const pluginSharedRoot = resolvePath(currentDir, "../../plugin-shared");

const ICONS_SHIM_URL =
  "data:text/javascript," +
  encodeURIComponent(
    "export const Play = () => null; export const Microphone = () => null; export const Television = () => null;"
  );

registerHooks({
  resolve(specifier: string, context: any, nextResolve: any) {
    if (specifier === "@vicacha-devs/plugin-shared") {
      return {
        url: pathToFileURL(resolvePath(pluginSharedRoot, "src/index.ts")).href,
        shortCircuit: true,
      };
    }

    if (specifier === "@vicacha-devs/strapi-plugin-calendar/shared") {
      return {
        url: pathToFileURL(resolvePath(calendarPkgRoot, "shared/index.ts"))
          .href,
        shortCircuit: true,
      };
    }

    if (specifier === "@strapi/icons") {
      // The real package is browser ESM that needs named exports from CJS
      // `react`, which Node cannot load; tests only need inert icon stubs.
      return { url: ICONS_SHIM_URL, shortCircuit: true };
    }

    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL &&
      context.parentURL.startsWith("file:")
    ) {
      const parentDir = dirname(fileURLToPath(context.parentURL));
      const baseCandidate = resolvePath(parentDir, specifier);

      const candidates = [
        baseCandidate,
        `${baseCandidate}.ts`,
        `${baseCandidate}.tsx`,
        `${baseCandidate}.json`,
        resolvePath(baseCandidate, "index.ts"),
        resolvePath(baseCandidate, "index.tsx"),
      ];

      for (const candidate of candidates) {
        if (existsSync(candidate) && statSync(candidate).isFile()) {
          const candidateUrl = pathToFileURL(candidate).href;
          if (
            candidate.endsWith(".json") ||
            candidate.endsWith(".ts") ||
            candidate.endsWith(".tsx")
          ) {
            return { url: candidateUrl, shortCircuit: true };
          }
          return nextResolve(candidateUrl, context);
        }
      }
    }

    return nextResolve(specifier, context);
  },

  load(url: string, context: any, nextLoad: any) {
    if (
      url.startsWith("file:") &&
      url.endsWith(".json") &&
      !url.includes("/node_modules/")
    ) {
      const filePath = fileURLToPath(url);
      const source = readFileSync(filePath, "utf8");
      return {
        format: "module",
        source: `export default ${source}`,
        shortCircuit: true,
      };
    }

    if (
      url.startsWith("file:") &&
      (url.endsWith(".ts") || url.endsWith(".tsx")) &&
      !url.includes("/node_modules/")
    ) {
      const filePath = fileURLToPath(url);
      const source = readFileSync(filePath, "utf8");
      const stripped = stripTypeScriptTypes(source, { mode: "strip" });
      return {
        format: "module",
        source: stripped,
        shortCircuit: true,
      };
    }

    return nextLoad(url, context);
  },
});
