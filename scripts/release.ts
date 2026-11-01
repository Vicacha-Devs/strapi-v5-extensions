import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import semanticRelease, { type PluginSpec } from "semantic-release";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(rootDir, "packages");
const releaseRcPath = join(rootDir, ".releaserc.json");
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isNoCi = args.includes("--no-ci");

const releaseRc = JSON.parse(readFileSync(releaseRcPath, "utf8")) as {
  branches?: string[];
  plugins?: PluginSpec[];
};

const basePlugins: PluginSpec[] = (releaseRc.plugins ?? []).filter((plugin) => {
  const name = Array.isArray(plugin) ? plugin[0] : plugin;
  return (
    name === "@semantic-release/commit-analyzer" ||
    name === "@semantic-release/release-notes-generator"
  );
});

// Topological priority so base plugins publish before dependents
const PRIORITY_ORDER = ["strapi-plugin-calendar", "strapi-plugin-certificates"];

const allPluginDirs = existsSync(packagesDir)
  ? readdirSync(packagesDir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() && entry.name.startsWith("strapi-plugin-")
      )
      .map((entry) => entry.name)
      .sort((a, b) => {
        const idxA = PRIORITY_ORDER.indexOf(a);
        const idxB = PRIORITY_ORDER.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      })
  : [];

const filterArg = args.find((arg) => arg.startsWith("--filter="));
const targetFilter = filterArg ? filterArg.slice("--filter=".length) : null;

const selectedDirs = targetFilter
  ? allPluginDirs.filter(
      (dir) => dir === targetFilter || `@vicacha-devs/${dir}` === targetFilter
    )
  : allPluginDirs;

if (selectedDirs.length === 0) {
  if (targetFilter) {
    console.error(
      `No matching plugin packages found for filter: ${targetFilter}`
    );
    process.exit(1);
  }
  console.warn(
    "[release] No Strapi plugin packages found in packages/. Skipping."
  );
  process.exit(0);
}

function hasCommitsForPackage(pkgName: string, dirName: string): boolean {
  try {
    const latestTag = execFileSync(
      "git",
      ["tag", "--list", `${pkgName}@*`, "--sort=-v:refname"],
      { cwd: rootDir, encoding: "utf8" }
    )
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean);

    const revRange = latestTag ? `${latestTag}..HEAD` : "HEAD";
    const commits = execFileSync(
      "git",
      ["log", revRange, "--oneline", "--", `packages/${dirName}`],
      { cwd: rootDir, encoding: "utf8" }
    ).trim();

    return commits.length > 0;
  } catch {
    return true;
  }
}

for (const dirName of selectedDirs) {
  const pkgDir = join(packagesDir, dirName);
  const pkgJsonPath = join(pkgDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as {
    name: string;
    version: string;
    private?: boolean;
  } & Record<string, unknown>;

  if (pkg.private) {
    continue;
  }

  if (!hasCommitsForPackage(pkg.name, dirName)) {
    console.warn(
      `[release] No new commits in packages/${dirName} for ${pkg.name}. Skipping.`
    );
    continue;
  }

  console.warn(
    `\n=== Running semantic-release for ${pkg.name} (${isDryRun ? "dry-run" : "publish"}) ===`
  );

  const changelogPath = join(pkgDir, "CHANGELOG.md");
  if (!existsSync(changelogPath)) {
    writeFileSync(changelogPath, `# Changelog — \`${pkg.name}\`\n`, "utf8");
  }

  const plugins: PluginSpec[] = [...basePlugins];

  if (!isDryRun) {
    plugins.push(
      [
        "@semantic-release/changelog",
        {
          changelogFile: `packages/${dirName}/CHANGELOG.md`,
        },
      ],
      [
        "@semantic-release/npm",
        {
          npmPublish: false,
          pkgRoot: `packages/${dirName}`,
        },
      ],
      [
        "@semantic-release/git",
        {
          assets: [
            `packages/${dirName}/CHANGELOG.md`,
            `packages/${dirName}/package.json`,
          ],
          message: `chore(release): ${pkg.name}@\${nextRelease.version} [skip ci]\n\n\${nextRelease.notes}`,
        },
      ],
      "@semantic-release/github"
    );
  }

  const result = await semanticRelease(
    {
      branches: releaseRc.branches ?? ["main"],
      tagFormat: `${pkg.name}@\${version}`,
      dryRun: isDryRun,
      ci: !isNoCi,
      plugins,
    },
    {
      cwd: rootDir,
      env: process.env as Record<string, string>,
    }
  );

  if (result && result.nextRelease) {
    const nextVersion = result.nextRelease.version;
    console.warn(`[release] ${pkg.name} -> ${nextVersion}`);
    if (!isDryRun) {
      execFileSync(
        "pnpm",
        [
          "publish",
          "--filter",
          pkg.name,
          "--no-git-checks",
          "--access",
          "public",
          "--provenance",
        ],
        {
          cwd: rootDir,
          stdio: "inherit",
          env: process.env,
        }
      );
    }
  } else {
    console.warn(`[release] No release needed for ${pkg.name}.`);
  }
}
