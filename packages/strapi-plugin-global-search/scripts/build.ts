import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(rootDir, "dist");

rmSync(distDir, { recursive: true, force: true });

// 1. Emit server TypeScript declarations (.d.ts) via tsc
const tscName = process.platform === "win32" ? "tsc.cmd" : "tsc";
const localTsc = resolve(rootDir, "node_modules", ".bin", tscName);
const workspaceTsc = resolve(rootDir, "..", "..", "node_modules", ".bin", tscName);
const tscBin = existsSync(localTsc) ? localTsc : workspaceTsc;
execFileSync(tscBin, ["-p", "tsconfig.server.json", "--emitDeclarationOnly"], {
  cwd: rootDir,
  stdio: "inherit",
});

// 2. Bundle server entrypoint as pure ESM (.mjs and .js under "type": "module")
await build({
  entryPoints: [resolve(rootDir, "server/index.ts")],
  outfile: resolve(distDir, "server/index.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: ["node20"],
  sourcemap: true,
  external: ["@strapi/*"],
});

cpSync(resolve(distDir, "server/index.mjs"), resolve(distDir, "server/index.js"));
cpSync(resolve(distDir, "server/index.mjs.map"), resolve(distDir, "server/index.js.map"));

// 3. Bundle admin entrypoint as pure ESM (.mjs and .js under "type": "module")
const externalPeers = [
  "react",
  "react-dom",
  "react-dom/client",
  "react/jsx-runtime",
  "react-router-dom",
  "styled-components",
  "@strapi/*",
];

await build({
  entryPoints: [resolve(rootDir, "admin/src/index.ts")],
  outfile: resolve(distDir, "admin/index.mjs"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2020"],
  sourcemap: true,
  external: externalPeers,
});

cpSync(resolve(distDir, "admin/index.mjs"), resolve(distDir, "admin/index.js"));
cpSync(resolve(distDir, "admin/index.mjs.map"), resolve(distDir, "admin/index.js.map"));

mkdirSync(resolve(distDir, "admin/translations"), { recursive: true });
cpSync(resolve(rootDir, "admin/src/translations"), resolve(distDir, "admin/translations"), {
  recursive: true,
});

writeFileSync(
  resolve(distDir, "admin/index.d.ts"),
  "declare const plugin: Record<string, unknown>;\nexport default plugin;\n"
);

process.stdout.write("[global-search] Built pure ESM dist/server and dist/admin successfully.\n");
