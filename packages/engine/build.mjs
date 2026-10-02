#!/usr/bin/env node
// Builds dist/: the library entry (ESM) and each browser bundle in src/bundles/ (readable and
// minified; a script-tag product's own name is the minified file), and prints the bundles' sizes. Declarations are emitted by `tsc` after this.
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

const PRODUCTS = ['hyperfixi-hs'];
const entries = readdirSync(join(here, 'src/bundles')).filter(f => f.endsWith('.ts'));
for (const entry of entries) {
  const name = entry.replace('.ts', '');
  const bundle = { ...shared, entryPoints: [join(here, 'src/bundles', entry)], format: 'iife' };
  // A script-tag product is minified under its own name, as core's `hyperfixi.js` is: the
  // name a page loads is the small file. Its readable build is `<name>.dev.js`.
  const product = PRODUCTS.includes(name);
  const readable = product ? `${name}.dev.js` : `${name}.js`;
  const minified = product ? `${name}.js` : `${name}.min.js`;
  await build({ ...bundle, outfile: join(here, 'dist', readable) });
  await build({ ...bundle, minify: true, outfile: join(here, 'dist', minified) });
  const min = readFileSync(join(here, 'dist', minified));
  const gz = gzipSync(min, { level: 9 }).length;
  console.log(
    `${name.padEnd(10)} ${String(min.length).padStart(7)} min  ${String(gz).padStart(6)} gz`
  );
}
