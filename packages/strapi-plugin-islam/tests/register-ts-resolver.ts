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
const pluginSharedEntryUrl = pathToFileURL(
  resolvePath(currentDir, "../../plugin-shared/src/index.ts")
).href;
const intlDateShimUrl = pathToFileURL(
  resolvePath(calendarPkgRoot, "tests/intl-date-shim.mjs")
).href;

function isExistingFile(filePath: string): boolean {
  try {
    return existsSync(filePath) && statSync(filePath).isFile();
  } catch {
    return false;
  }
}

registerHooks({
  resolve(specifier: string, context: any, nextResolve: any) {
    if (specifier === "react") {
      return {
        url: "data:text/javascript,export const createElement = (type, props, ...children) => ({ type, props: { ...props, children } }); export default { createElement };",
        shortCircuit: true,
      };
    }
    if (specifier === "@vicacha-devs/plugin-shared") {
      return { url: pluginSharedEntryUrl, shortCircuit: true };
    }
    if (specifier === "@internationalized/date") {
      return { url: intlDateShimUrl, shortCircuit: true };
    }
    if (specifier === "@vicacha-devs/strapi-plugin-calendar/shared") {
      return {
        url: pathToFileURL(resolvePath(calendarPkgRoot, "shared/index.ts"))
          .href,
        shortCircuit: true,
      };
    }

    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL
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
        if (isExistingFile(candidate)) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true };
        }
      }
    }

    return nextResolve(specifier, context);
  },

  load(url: string, context: any, nextLoad: any) {
    if (url.endsWith(".json") && !url.includes("/node_modules/")) {
      const filePath = fileURLToPath(url);
      const source = readFileSync(filePath, "utf8");
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
