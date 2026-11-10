import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publint } from "publint";
import { formatMessage } from "publint/utils";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(rootDir, "packages");

const pluginDirs = existsSync(packagesDir)
  ? readdirSync(packagesDir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() && entry.name.startsWith("strapi-plugin-")
      )
      .map((entry) => join(packagesDir, entry.name))
      .sort()
  : [];

if (pluginDirs.length === 0) {
  console.warn(
    "[publint] No Strapi plugin packages found in packages/. Skipping."
  );
  process.exit(0);
}

let totalErrors = 0;

const privateWorkspacePackages = new Set<string>(
  existsSync(packagesDir)
    ? readdirSync(packagesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .flatMap((entry) => {
          const manifestPath = join(packagesDir, entry.name, "package.json");
          if (!existsSync(manifestPath)) {
            return [];
          }
          const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
            name?: string;
            private?: boolean;
          };
          return manifest.private && manifest.name ? [manifest.name] : [];
        })
    : []
);

for (const pkgDir of pluginDirs) {
  const pkgJsonPath = join(pkgDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as {
    name: string;
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  } & Record<string, unknown>;

  const leakedPrivateDeps: string[] = [];
  for (const field of [
    "dependencies",
    "peerDependencies",
    "optionalDependencies",
  ] as const) {
    const depMap = pkg[field];
    if (!depMap) {
      continue;
    }
    for (const depName of Object.keys(depMap)) {
      if (privateWorkspacePackages.has(depName)) {
        leakedPrivateDeps.push(`${field}.${depName}`);
      }
    }
  }

  const { messages } = await publint({
    pkgDir,
    pack: "pnpm",
    strict: true,
  });

  if (messages.length === 0 && leakedPrivateDeps.length === 0) {
    console.warn(`[publint] PASS ${pkg.name}`);
  } else {
    const issueCount = messages.length + leakedPrivateDeps.length;
    console.error(`[publint] FAIL ${pkg.name} (${issueCount} issue(s)):`);
    for (const leaked of leakedPrivateDeps) {
      console.error(
        `  - Private workspace package "${leaked}" must only be in devDependencies.`
      );
    }
    for (const message of messages) {
      console.error(`  - ${formatMessage(message, pkg)}`);
    }
    totalErrors += issueCount;
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
