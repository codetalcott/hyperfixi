#!/usr/bin/env node
/**
 * dist/hyperfixi.js is the engine's hyperfixi-hs.js under core's name.
 *
 * Phase C3 of the engine cutover (C-R4b), owner decision 2026-10-03: for one
 * major, `hyperfixi.js` and `hyperfixi-hs.js` are the same file, and
 * `hyperfixi-hs.js` is the canonical name. `@hyperfixi/engine` builds it
 * (packages/engine/build.mjs); this copies it into core's dist/ so
 * `@hyperfixi/core/browser`, the CDN path `@hyperfixi/core/dist/hyperfixi.js`,
 * and every page that loads dist/hyperfixi.js keep resolving.
 *
 * Until C-R4b, dist/hyperfixi.js was core's own full bundle
 * (src/compatibility/browser-bundle.ts: core's parser and runtime, the
 * reactivity and realtime plugins, ~352 KB gzipped).
 */
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '../../engine/dist/hyperfixi-hs.js');
const dist = resolve(here, '../dist');
const target = join(dist, 'hyperfixi.js');

if (!existsSync(source)) {
  console.error(
    `[copy-engine-bundle] ${relative(process.cwd(), source)} is missing.\n` +
      '  Build the engine first: npm run build --prefix packages/engine'
  );
  process.exit(1);
}

mkdirSync(dist, { recursive: true });
copyFileSync(source, target);
// Core's own bundle had a sourcemap; the engine's minified product has none, so
// a map left from an earlier build would describe a different file.
rmSync(`${target}.map`, { force: true });
console.log(`[copy-engine-bundle] ${relative(process.cwd(), target)} <- engine hyperfixi-hs.js`);
