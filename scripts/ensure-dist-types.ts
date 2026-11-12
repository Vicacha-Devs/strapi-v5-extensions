/**
 * Post-build step for Strapi SDK plugins (`strapi-plugin build`).
 *
 * The SDK writes ESM to `index.mjs` and CJS to `index.js`, matching the
 * `exports` map, and emits declarations for the admin and server entries.
 * It does not emit a declaration file for the `./shared` entry, so
 * `strapi-plugin verify` would fail. This script stubs any declaration file
 * that an export's `types` field points to but that is missing.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

interface PackageExportTarget {
  types?: string;
}

const cwd = process.cwd();
const pkgPath = resolve(cwd, "package.json");

if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    exports?: Record<string, PackageExportTarget>;
  };
  for (const [exportKey, target] of Object.entries(pkg.exports || {})) {
    if (
      !target ||
      typeof target !== "object" ||
      typeof target.types !== "string"
    ) {
      continue;
    }
    const dtsPath = resolve(cwd, target.types);
    if (!dtsPath.startsWith(`${cwd}${sep}`) || existsSync(dtsPath)) {
      continue;
    }
    mkdirSync(dirname(dtsPath), { recursive: true });
    const stub =
      exportKey === "./shared"
        ? "declare const shared: Record<string, unknown>;\nexport default shared;\n"
        : "declare const plugin: Record<string, unknown>;\nexport default plugin;\n";
    writeFileSync(dtsPath, stub, "utf8");
  }
}
