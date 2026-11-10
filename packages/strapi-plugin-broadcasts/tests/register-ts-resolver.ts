import { existsSync, readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
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
const reactFallbackUrl =
  "data:text/javascript," +
  encodeURIComponent(
    [
      "export const useState = (v) => [typeof v === 'function' ? v() : v, () => {}];",
      "export const useEffect = () => {};",
      "export const useCallback = (fn) => fn;",
      "export const createElement = (type, props, ...children) => ({ type, props: { ...props, children } });",
      "export const Fragment = 'Fragment';",
      "export default { useState, useEffect, useCallback, createElement, Fragment };",
    ].join("\n")
  );

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@internationalized/date") {
      return { url: intlDateShimUrl, shortCircuit: true };
    }
    if (specifier === "@vicacha-devs/plugin-shared") {
      return { url: pluginSharedEntryUrl, shortCircuit: true };
    }
    if (specifier === "@vicacha-devs/strapi-plugin-calendar/shared") {
      return {
        url: pathToFileURL(resolvePath(calendarPkgRoot, "shared/index.ts"))
          .href,
        shortCircuit: true,
      };
    }
    if (specifier === "react") {
      try {
        return nextResolve(specifier, context);
      } catch {
        return { url: reactFallbackUrl, shortCircuit: true };
      }
    }

    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL &&
      !context.parentURL.startsWith("data:")
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
        if (existsSync(candidate) && /\.(?:ts|tsx|json)$/.test(candidate)) {
          return {
            url: pathToFileURL(candidate).href,
            shortCircuit: true,
          };
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
