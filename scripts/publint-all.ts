import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publint } from "publint";
import { formatMessage } from "publint/utils";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(rootDir, "packages");

const pluginDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter(
    (entry) => entry.isDirectory() && entry.name.startsWith("strapi-plugin-")
  )
  .map((entry) => join(packagesDir, entry.name))
  .sort();

let totalErrors = 0;

for (const pkgDir of pluginDirs) {
  const pkgJsonPath = join(pkgDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as {
    name: string;
  } & Record<string, unknown>;
  const { messages } = await publint({
    pkgDir,
    pack: "pnpm",
    strict: true,
  });

  if (messages.length === 0) {
    console.warn(`[publint] PASS ${pkg.name}`);
  } else {
    console.error(`[publint] FAIL ${pkg.name} (${messages.length} issue(s)):`);
    for (const message of messages) {
      console.error(`  - ${formatMessage(message, pkg)}`);
    }
    totalErrors += messages.length;
  }
}

if (totalErrors > 0) {
  console.error(
    `\n[publint] Failed with ${totalErrors} total issue(s) across plugins.`
  );
  process.exit(1);
}

console.warn(
  `\n[publint] All ${pluginDirs.length} Strapi plugins passed strict publint validation.`
);
