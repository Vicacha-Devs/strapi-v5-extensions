import { existsSync, readFileSync, statSync } from "node:fs";
import * as nodeModule from "node:module";
const { registerHooks, stripTypeScriptTypes } = nodeModule as Record<
  string,
  any
>;
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier: string, context: any, nextResolve: any) {
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
        if (existsSync(candidate) && statSync(candidate).isFile()) {
          return nextResolve(pathToFileURL(candidate).href, context);
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
