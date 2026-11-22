import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(repoRoot, "packages");
const dashboardDir = join(repoRoot, "apps", "dashboard");
const SLUG_RE = /^[a-z][a-z0-9-]{1,40}$/;

function assertWithin(target: string, root: string): string {
  const normRoot = resolve(root);
  const normTarget = resolve(target);
  if (normTarget !== normRoot && !normTarget.startsWith(`${normRoot}${sep}`)) {
    throw new Error(`Path "${normTarget}" escapes "${normRoot}"`);
  }
  return normTarget;
}

function toDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let displayName = "";
  let description = "";
  let withContentType = false;
  let wireDashboard = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--display-name" && argv[i + 1]) {
      displayName = argv[++i];
    } else if (arg === "--description" && argv[i + 1]) {
      description = argv[++i];
    } else if (arg === "--with-content-type") {
      withContentType = true;
    } else if (arg === "--wire-dashboard") {
      wireDashboard = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }
  return {
    rawSlug: positional[0] ?? "",
    displayName,
    description,
    withContentType,
    wireDashboard,
    dryRun,
  };
}

const opts = parseArgs(process.argv.slice(2));
const slug = opts.rawSlug.replace(/^strapi-plugin-/, "");

if (!SLUG_RE.test(slug)) {
  console.error(
    'Usage: pnpm plugin:new -- <slug> [--display-name "..."] [--description "..."] [--with-content-type] [--wire-dashboard] [--dry-run]\n' +
      "Slug must match ^[a-z][a-z0-9-]{1,40}$ (e.g. announcements)."
  );
  process.exit(1);
}

const folderName = `strapi-plugin-${slug}`;
const pkgName = `@vicacha-devs/${folderName}`;
const displayName = opts.displayName || toDisplayName(slug);
const description =
  opts.description || `Strapi v5 ${displayName} plugin by Vicacha Devs.`;
const targetDir = assertWithin(join(packagesDir, folderName), packagesDir);

if (existsSync(targetDir)) {
  console.error(`[plugin:new] Target already exists: ${targetDir}`);
  process.exit(1);
}

const tradsByLocale: Record<string, Record<string, string>> = {
  en: {
    "plugin.name": displayName,
    "page.title": displayName,
    "page.empty": `No ${displayName.toLowerCase()} records yet.`,
  },
  es: {
    "plugin.name": displayName,
    "page.title": displayName,
    "page.empty": `Aún no hay registros de ${displayName.toLowerCase()}.`,
  },
  ar: {
    "plugin.name": displayName,
    "page.title": displayName,
    "page.empty": `لا توجد سجلات لـ ${displayName} حتى الآن.`,
  },
  tr: {
    "plugin.name": displayName,
    "page.title": displayName,
    "page.empty": `Henüz ${displayName.toLowerCase()} kaydı yok.`,
  },
  fr: {
    "plugin.name": displayName,
    "page.title": displayName,
    "page.empty": `Aucun enregistrement ${displayName.toLowerCase()} pour le moment.`,
  },
};

const files: Record<string, string> = {
  "package.json": `${JSON.stringify(
    {
      name: pkgName,
      version: "0.1.0",
      description,
      license: "MIT",
      author: "Vicacha Devs",
      files: ["dist"],
      exports: {
        "./package.json": "./package.json",
        "./strapi-admin": {
          types: "./dist/admin/src/index.d.ts",
          source: "./admin/src/index.ts",
          import: "./dist/admin/index.mjs",
          require: "./dist/admin/index.js",
          default: "./dist/admin/index.js",
        },
        "./strapi-server": {
          types: "./dist/server/src/index.d.ts",
          source: "./server/src/index.ts",
          import: "./dist/server/index.mjs",
          require: "./dist/server/index.js",
          default: "./dist/server/index.js",
        },
        "./shared": {
          types: "./dist/shared/index.d.ts",
          source: "./shared/index.ts",
          import: "./dist/shared/index.mjs",
          require: "./dist/shared/index.js",
          default: "./dist/shared/index.js",
        },
      },
      publishConfig: { access: "public", provenance: true },
      scripts: {
        "build":
          "strapi-plugin build && node ../../scripts/ensure-dist-types.ts",
        "test":
          "node --import ./tests/register-ts-resolver.ts --test tests/*.test.ts",
        "test:ts":
          "tsc --noEmit -p admin/tsconfig.json && tsc --noEmit -p server/tsconfig.json",
        "verify": "strapi-plugin verify",
        "watch": "strapi-plugin watch",
      },
      dependencies: {
        "@strapi/design-system": "^2.0.0-rc.21",
        "@strapi/icons": "^2.0.0-rc.21",
        "react-intl": "^6.6.8",
      },
      devDependencies: {
        "@strapi/sdk-plugin": "6.1.1",
        "@strapi/strapi": "^5.39.0",
        "@types/react": "19.2.14",
        "@types/react-dom": "19.2.3",
        "@vicacha-devs/eslint-config": "workspace:*",
        "@vicacha-devs/plugin-shared": "workspace:*",
        "@vicacha-devs/typescript-config": "workspace:*",
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "react-router-dom": "^6.26.2",
        "styled-components": "^6.1.13",
        "typescript": "^5.5.4",
      },
      peerDependencies: {
        "@strapi/strapi": "^5.0.0",
        "react": "^17.0.0 || ^18.0.0",
        "react-dom": "^17.0.0 || ^18.0.0",
        "react-router-dom": "^6.0.0",
        "styled-components": "^6.0.0",
      },
      engines: { node: ">=20.16.0", pnpm: ">=10.0.0" },
      strapi: {
        name: slug,
        displayName,
        description,
        kind: "plugin",
        required: false,
      },
    },
    null,
    2
  )}\n`,

  "tsconfig.json": `${JSON.stringify(
    { extends: "@vicacha-devs/typescript-config/base.json" },
    null,
    2
  )}\n`,

  "admin/tsconfig.json": `${JSON.stringify(
    {
      extends: "@vicacha-devs/typescript-config/strapi-admin.json",
      include: ["./src", "../shared"],
    },
    null,
    2
  )}\n`,

  "server/tsconfig.json": `${JSON.stringify(
    {
      extends: "@vicacha-devs/typescript-config/strapi-server.json",
      include: ["./src", "../shared"],
    },
    null,
    2
  )}\n`,

  "shared/index.ts": `export const PLUGIN_ID = "${slug}";\n\nexport interface PluginHealthPayload {\n  plugin: string;\n  status: "ok";\n}\n`,

  "admin/src/pluginId.ts": `export { PLUGIN_ID } from "../../shared/index";\n`,

  "admin/src/components/Initializer.tsx": `import { useEffect, useRef } from "react";\n\nimport { PLUGIN_ID } from "../pluginId";\n\ninterface InitializerProps {\n  setPlugin: (id: string) => void;\n}\n\nexport function Initializer({ setPlugin }: InitializerProps) {\n  const ref = useRef(setPlugin);\n  useEffect(() => {\n    ref.current(PLUGIN_ID);\n  }, []);\n  return null;\n}\n`,

  "admin/src/pages/HomePage.tsx": `import { Box, Typography } from "@strapi/design-system";\nimport { useIntl } from "react-intl";\n\nimport { PLUGIN_ID } from "../pluginId";\n\nexport function HomePage() {\n  const { formatMessage } = useIntl();\n  return (\n    <Box padding={6}>\n      <Typography variant="alpha">\n        {formatMessage({\n          id: \`\${PLUGIN_ID}.page.title\`,\n          defaultMessage: "${displayName}",\n        })}\n      </Typography>\n    </Box>\n  );\n}\n`,

  "admin/src/index.ts": `import { createRegisterTrads } from "@vicacha-devs/plugin-shared";\n\nimport { Initializer } from "./components/Initializer";\nimport { PLUGIN_ID } from "./pluginId";\n\nexport default {\n  register(app: {\n    registerPlugin: (plugin: Record<string, unknown>) => void;\n  }) {\n    app.registerPlugin({\n      id: PLUGIN_ID,\n      initializer: Initializer,\n      isReady: false,\n      name: PLUGIN_ID,\n    });\n  },\n  registerTrads: createRegisterTrads({\n    pluginId: PLUGIN_ID,\n    defaultLocales: ["en", "es", "ar", "tr", "fr"],\n    loadTranslation: (locale) => import(\`./translations/\${locale}.json\`),\n  }),\n};\n`,

  "server/src/config/index.ts": `export default {\n  default: { enabled: true },\n  validator(config: Record<string, unknown>) {\n    if (typeof config.enabled !== "boolean") {\n      throw new Error("${slug} config.enabled must be a boolean");\n    }\n  },\n};\n`,

  "server/src/services/index.ts": `import { PLUGIN_ID } from "../../../shared/index";\n\nexport default {\n  health: () => ({\n    status: () => ({ plugin: PLUGIN_ID, status: "ok" as const }),\n  }),\n};\n`,

  "server/src/controllers/index.ts": `export default {\n  health: ({ strapi }: { strapi: { plugin: (id: string) => { service: (s: string) => { status: () => unknown } } } }) => ({\n    index(ctx: { body: unknown }) {\n      ctx.body = strapi.plugin("${slug}").service("health").status();\n    },\n  }),\n};\n`,

  "server/src/routes/index.ts": `export default {\n  admin: {\n    type: "admin",\n    routes: [\n      {\n        method: "GET",\n        path: "/health",\n        handler: "health.index",\n        config: { policies: ["admin::isAuthenticatedAdmin"] },\n      },\n    ],\n  },\n};\n`,

  "server/src/index.ts": `import config from "./config/index";\nimport controllers from "./controllers/index";\nimport routes from "./routes/index";\nimport services from "./services/index";\n\nexport default {\n  config,\n  controllers,\n  routes,\n  services,\n};\n`,

  "tests/register-ts-resolver.ts": `import { existsSync, readFileSync } from "node:fs";\nimport * as nodeModule from "node:module";\nimport { dirname, resolve as resolvePath } from "node:path";\nimport { fileURLToPath, pathToFileURL } from "node:url";\n\nconst { registerHooks, stripTypeScriptTypes } = nodeModule as Record<string, unknown> as {\n  registerHooks: (hooks: Record<string, unknown>) => void;\n  stripTypeScriptTypes: (code: string, opts: { mode: string }) => string;\n};\n\nregisterHooks({\n  resolve(specifier: string, context: { parentURL?: string }, nextResolve: (s: string, c: unknown) => unknown) {\n    if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL) {\n      const base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);\n      for (const cand of [\`\${base}.ts\`, \`\${base}.tsx\`, \`\${base}.json\`, resolvePath(base, "index.ts")]) {\n        if (existsSync(cand)) return nextResolve(pathToFileURL(cand).href, context);\n      }\n    }\n    return nextResolve(specifier, context);\n  },\n  load(url: string, context: unknown, nextLoad: (u: string, c: unknown) => unknown) {\n    if (url.endsWith(".json") && !url.includes("/node_modules/")) {\n      return { format: "module", source: \`export default \${readFileSync(fileURLToPath(url), "utf8")}\`, shortCircuit: true };\n    }\n    if ((url.endsWith(".ts") || url.endsWith(".tsx")) && !url.includes("/node_modules/")) {\n      return { format: "module", source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "strip" }), shortCircuit: true };\n    }\n    return nextLoad(url, context);\n  },\n});\n`,

  [`tests/${slug}.test.ts`]: `import assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nimport { dirname, join, resolve } from "node:path";\nimport { describe, it } from "node:test";\nimport { fileURLToPath } from "node:url";\n\nimport serverPlugin from "../server/src/index";\nimport { PLUGIN_ID } from "../shared/index";\n\nconst pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");\n\ndescribe("${pkgName}", () => {\n  it("exposes healthy server service and valid config validator", () => {\n    assert.equal(PLUGIN_ID, "${slug}");\n    const svc = serverPlugin.services.health();\n    assert.deepEqual(svc.status(), { plugin: "${slug}", status: "ok" });\n    serverPlugin.config.validator({ enabled: true });\n  });\n\n  it("maintains 100% key parity across en/es/ar/tr/fr locales", () => {\n    const tradsDir = join(pkgRoot, "admin", "src", "translations");\n    const enKeys = Object.keys(\n      JSON.parse(readFileSync(join(tradsDir, "en.json"), "utf8")) as Record<string, string>\n    ).sort();\n    for (const locale of ["es", "ar", "tr", "fr"]) {\n      const keys = Object.keys(\n        JSON.parse(readFileSync(join(tradsDir, \`\${locale}.json\`), "utf8")) as Record<string, string>\n      ).sort();\n      assert.deepEqual(keys, enKeys, \`Locale \${locale} diverged from en.json\`);\n    }\n  });\n});\n`,

  "README.md": `# ${pkgName}\n\n${description}\n\n## QA & Verification\n\n\`\`\`bash\npnpm --filter ${pkgName} test\npnpm --filter ${pkgName} test:ts\npnpm --filter ${pkgName} build\n\`\`\`\n`,
};

for (const [locale, data] of Object.entries(tradsByLocale)) {
  files[`admin/src/translations/${locale}.json`] =
    `${JSON.stringify(data, null, 2)}\n`;
}

if (opts.withContentType) {
  files[`server/src/content-types/${slug}/schema.json`] = `${JSON.stringify(
    {
      kind: "collectionType",
      collectionName: `${slug.replace(/-/g, "_")}_items`,
      info: {
        singularName: slug,
        pluralName: `${slug}s`,
        displayName,
      },
      options: { draftAndPublish: true },
      pluginOptions: { i18n: { localized: true } },
      attributes: {
        title: { type: "string", required: true },
      },
    },
    null,
    2
  )}\n`;
}

if (opts.dryRun) {
  process.stdout.write(
    `[plugin:new] DRY RUN — would create ${pkgName} at ${targetDir}:\n`
  );
  for (const rel of Object.keys(files).sort()) {
    process.stdout.write(`  + ${rel}\n`);
  }
  if (opts.wireDashboard) {
    process.stdout.write(
      "  ~ apps/dashboard/package.json & apps/dashboard/config/plugins.ts\n"
    );
  }
  process.exit(0);
}

for (const [rel, content] of Object.entries(files)) {
  const fullPath = assertWithin(join(targetDir, rel), targetDir);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

if (opts.wireDashboard) {
  const dashPkgPath = assertWithin(
    join(dashboardDir, "package.json"),
    repoRoot
  );
  const dashPkg = JSON.parse(readFileSync(dashPkgPath, "utf8")) as {
    dependencies: Record<string, string>;
  };
  dashPkg.dependencies[pkgName] = "workspace:*";
  dashPkg.dependencies = Object.fromEntries(
    Object.entries(dashPkg.dependencies).sort(([a], [b]) => a.localeCompare(b))
  );
  writeFileSync(dashPkgPath, `${JSON.stringify(dashPkg, null, 2)}\n`, "utf8");

  const configPath = assertWithin(
    join(dashboardDir, "config", "plugins.ts"),
    repoRoot
  );
  const configSrc = readFileSync(configPath, "utf8");
  if (!configSrc.includes(`"${slug}"`)) {
    const updated = configSrc.replace(
      "\n});",
      `\n  "${slug}": {\n    enabled: true,\n  },\n});`
    );
    writeFileSync(configPath, updated, "utf8");
  }
}

process.stdout.write(
  `[plugin:new] Created ${pkgName} (${Object.keys(files).length} files).\n` +
    `Next: pnpm --filter ${pkgName} test\n`
);
