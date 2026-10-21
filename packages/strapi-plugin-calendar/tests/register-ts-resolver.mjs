import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const vitestShimUrl = pathToFileURL(resolvePath(currentDir, 'vitest-shim.mjs')).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'vitest') {
      return { url: vitestShimUrl, shortCircuit: true };
    }

    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      context.parentURL
    ) {
      const parentDir = dirname(fileURLToPath(context.parentURL));
      const baseCandidate = resolvePath(parentDir, specifier);

      const candidates = [
        `${baseCandidate}.ts`,
        `${baseCandidate}.tsx`,
        `${baseCandidate}.json`,
        resolvePath(baseCandidate, 'index.ts'),
        resolvePath(baseCandidate, 'index.tsx'),
      ];

      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }

    return nextResolve(specifier, context);
  },

  load(url, context, nextLoad) {
    if (url.endsWith('.json') && !url.includes('/node_modules/')) {
      const filePath = fileURLToPath(url);
      const source = readFileSync(filePath, 'utf8');
      return {
        format: 'module',
        source: `export default ${source}`,
        shortCircuit: true,
      };
    }

    if ((url.endsWith('.ts') || url.endsWith('.tsx')) && !url.includes('/node_modules/')) {
      const filePath = fileURLToPath(url);
      const source = readFileSync(filePath, 'utf8');
      const stripped = stripTypeScriptTypes(source, { mode: 'strip' });
      return {
        format: 'module',
        source: stripped,
        shortCircuit: true,
      };
    }

    return nextLoad(url, context);
  },
});
