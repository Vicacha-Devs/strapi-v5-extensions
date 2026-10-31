import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import semanticRelease, { type PluginSpec } from "semantic-release";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(rootDir, "packages");
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isNoCi = args.includes("--no-ci");

// Topological priority so base plugins publish before dependents
const PRIORITY_ORDER = ["strapi-plugin-calendar", "strapi-plugin-certificates"];

const allPluginDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("strapi-plugin-"))
  .map((entry) => entry.name)
  .sort((a, b) => {
    const idxA = PRIORITY_ORDER.indexOf(a);
    const idxB = PRIORITY_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

const filterArg = args.find((arg) => arg.startsWith("--filter="));
const targetFilter = filterArg ? filterArg.slice("--filter=".length) : null;

const selectedDirs = targetFilter
  ? allPluginDirs.filter((dir) => dir === targetFilter || `@vicacha-devs/${dir}` === targetFilter)
  : allPluginDirs;

if (selectedDirs.length === 0) {
  console.error(`No matching plugin packages found for filter: ${targetFilter}`);
  process.exit(1);
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

  console.warn(
    `\n=== Running semantic-release for ${pkg.name} (${isDryRun ? "dry-run" : "publish"}) ===`
  );

  const changelogPath = join(pkgDir, "CHANGELOG.md");
  if (!existsSync(changelogPath)) {
    writeFileSync(changelogPath, `# Changelog — \`${pkg.name}\`\n`, "utf8");
  }

  const plugins: PluginSpec[] = [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          { type: "docs", scope: "README", release: "patch" },
          { type: "perf", release: "patch" },
          { type: "refactor", release: "patch" },
        ],
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        presetConfig: {
          types: [
            { type: "feat", section: "Features" },
            { type: "fix", section: "Bug Fixes" },
            { type: "perf", section: "Performance Improvements" },
            { type: "refactor", section: "Code Refactoring" },
            { type: "docs", section: "Documentation", hidden: false },
            { type: "build", section: "Build System", hidden: true },
            { type: "chore", section: "Miscellaneous Chores", hidden: true },
            { type: "ci", section: "Continuous Integration", hidden: true },
            { type: "style", section: "Styles", hidden: true },
            { type: "test", section: "Tests", hidden: true },
          ],
        },
      },
    ],
  ];

  if (!isDryRun) {
    plugins.push(
      [
        "@semantic-release/changelog",
        {
          changelogFile: `packages/${dirName}/CHANGELOG.md`,
        },
      ],
      [
        "@semantic-release/git",
        {
          assets: [`packages/${dirName}/CHANGELOG.md`, `packages/${dirName}/package.json`],
          message: `chore(release): ${pkg.name}@\${nextRelease.version} [skip ci]\n\n\${nextRelease.notes}`,
        },
      ],
      "@semantic-release/github"
    );
  }

  const result = await semanticRelease(
    {
      branches: ["main"],
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
      pkg.version = nextVersion;
      writeFileSync(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
      execFileSync(
        "pnpm",
        ["publish", "--filter", pkg.name, "--no-git-checks", "--access", "public", "--provenance"],
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
