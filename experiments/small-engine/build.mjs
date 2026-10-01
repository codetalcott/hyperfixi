#!/usr/bin/env node
// Builds each bundle in src/bundles/ to dist/ (readable + minified) and prints sizes.
import { build } from 'esbuild';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const entries = readdirSync(join(here, 'src/bundles')).filter(f => f.endsWith('.ts'));
for (const entry of entries) {
  const name = entry.replace('.ts', '');
  const common = { entryPoints: [join(here, 'src/bundles', entry)], bundle: true, format: 'iife', target: 'es2022', logLevel: 'error' };
  await build({ ...common, outfile: join(here, 'dist', `${name}.js`) });
  await build({ ...common, minify: true, outfile: join(here, 'dist', `${name}.min.js`) });
  const min = readFileSync(join(here, 'dist', `${name}.min.js`));
  console.log(`${name.padEnd(10)} ${String(min.length).padStart(7)} min  ${String(gzipSync(min, { level: 9 }).length).padStart(6)} gz`);
}
