#!/usr/bin/env node
// What a module costs: the full bundle's size with some registrations dropped.
//
//   node packages/engine/cost.mjs                  # every registered module, one at a time
//   node packages/engine/cost.mjs add,remove put   # these sets (a comma joins a set)
//
// Reads `src/bundles/full.ts`, removes the named modules from its `register(...)` call and
// rebuilds. The difference is what the module adds to a bundle that has everything else, so
// code it shares with other modules is not counted.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'src/bundles');
const source = readFileSync(join(dir, 'full.ts'), 'utf8');
const call = source.indexOf('\nregister(') + 1;
const registered = source
  .slice(call + 'register('.length, source.indexOf(');', call))
  .replace(/\/\/.*$/gm, '')
  .split(',')
  .map(name => name.trim())
  .filter(Boolean);

async function size(drop) {
  for (const name of drop) {
    if (!registered.includes(name)) throw new Error(`not registered: ${name}`);
  }
  const kept = registered.filter(name => !drop.includes(name));
  const contents = source.slice(0, call) + `register(${kept.join(', ')});\nboot();\n`;
  const result = await build({
    stdin: { contents, resolveDir: dir, loader: 'ts' },
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2022',
    write: false,
    logLevel: 'error',
    define: { __ENGINE_VERSION__: '"0"' },
  });
  const out = result.outputFiles[0].contents;
  return [out.length, gzipSync(out, { level: 9 }).length];
}

const [min, gz] = await size([]);
console.log(
  `${'everything'.padEnd(36)} ${String(min).padStart(6)} min ${String(gz).padStart(6)} gz`
);
const sets = process.argv.length > 2 ? process.argv.slice(2) : registered;
const rows = [];
for (const set of sets) {
  const [withoutMin, withoutGz] = await size(set.split(','));
  rows.push([set, min - withoutMin, gz - withoutGz]);
}
if (process.argv.length <= 2) rows.sort((a, b) => b[2] - a[2]);
for (const [set, dMin, dGz] of rows) {
  console.log(
    `${set.padEnd(36).slice(0, 70)} ${String(dMin).padStart(6)} min ${String(dGz).padStart(6)} gz`
  );
}
