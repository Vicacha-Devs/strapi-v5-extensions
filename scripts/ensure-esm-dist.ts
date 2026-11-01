import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const cwd = process.cwd();
const distDir = resolve(cwd, "dist");

for (const subdir of ["server", "admin", "shared"]) {
  const mjsPath = resolve(distDir, subdir, "index.mjs");
  const jsPath = resolve(distDir, subdir, "index.js");
  if (existsSync(mjsPath)) {
    copyFileSync(mjsPath, jsPath);
  }
}

interface PackageExportTarget {
  types?: string;
}

const pkgPath = resolve(cwd, "package.json");
if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    exports?: Record<string, PackageExportTarget>;
  };
  const exportsMap = pkg.exports || {};
  for (const [exportKey, target] of Object.entries(exportsMap)) {
    if (
      !target ||
      typeof target !== "object" ||
      typeof target.types !== "string"
    ) {
      continue;
    }
    const dtsPath = resolve(cwd, target.types);
    if (!existsSync(dtsPath)) {
      mkdirSync(dirname(dtsPath), { recursive: true });
      if (exportKey === "./shared") {
        writeFileSync(
          dtsPath,
          "export * from '../../shared/index.js';\n",
          "utf8"
        );
      } else {
        writeFileSync(
          dtsPath,
          "declare const plugin: Record<string, unknown>;\nexport default plugin;\n",
          "utf8"
        );
      }
    }
  }
}

if (existsSync(distDir)) {
  const distPkgPath = resolve(distDir, "package.json");
  if (!existsSync(distPkgPath)) {
    writeFileSync(
      distPkgPath,
      `${JSON.stringify({ type: "module" }, null, 2)}\n`,
      "utf8"
    );
  }
}
