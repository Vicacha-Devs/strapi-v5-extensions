import { existsSync, readFileSync, statSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const pluginSharedEntry = resolvePath(
  currentDir,
  "../../plugin-shared/src/index.ts"
);
const calendarPkgRoot = resolvePath(currentDir, "../../strapi-plugin-calendar");

const WORKSPACE_ALIASES: Record<string, string> = {
  "@vicacha-devs/plugin-shared": pluginSharedEntry,
  "@vicacha-devs/strapi-plugin-calendar/shared": resolvePath(
    calendarPkgRoot,
    "shared/index.ts"
  ),
  "@vicacha-devs/strapi-plugin-calendar/strapi-admin": resolvePath(
    calendarPkgRoot,
    "admin/src/index.ts"
  ),
  "@vicacha-devs/strapi-plugin-calendar/strapi-server": resolvePath(
    calendarPkgRoot,
    "server/src/index.ts"
  ),
};

function isRegularFile(filePath: string): boolean {
  try {
    return existsSync(filePath) && statSync(filePath).isFile();
  } catch {
    return false;
  }
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (Object.hasOwn(WORKSPACE_ALIASES, specifier)) {
      return {
        url: pathToFileURL(WORKSPACE_ALIASES[specifier]).href,
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
        if (isRegularFile(candidate)) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }

    return nextResolve(specifier, context);
  },

  load(url, context, nextLoad) {
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
