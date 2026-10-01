#!/usr/bin/env node
// Builds dist/: the library entry (ESM) and each browser bundle in src/bundles/ (readable and
// minified), and prints the bundles' sizes. Declarations are emitted by `tsc` after this.
import { build } from 'esbuild';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));
const shared = {
  bundle: true,
  target: 'es2022',
  logLevel: 'error',
  define: { __ENGINE_VERSION__: JSON.stringify(version) },
};

await build({
  ...shared,
  entryPoints: [join(here, 'src/index.ts')],
  format: 'esm',
  outfile: join(here, 'dist/index.js'),
});

const entries = readdirSync(join(here, 'src/bundles')).filter(f => f.endsWith('.ts'));
for (const entry of entries) {
  const name = entry.replace('.ts', '');
  const bundle = { ...shared, entryPoints: [join(here, 'src/bundles', entry)], format: 'iife' };
  await build({ ...bundle, outfile: join(here, 'dist', `${name}.js`) });
  await build({ ...bundle, minify: true, outfile: join(here, 'dist', `${name}.min.js`) });
  const min = readFileSync(join(here, 'dist', `${name}.min.js`));
  const gz = gzipSync(min, { level: 9 }).length;
  console.log(
    `${name.padEnd(10)} ${String(min.length).padStart(7)} min  ${String(gz).padStart(6)} gz`
  );
}
