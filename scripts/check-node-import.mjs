/**
 * Bare-Node import check for @hyperfixi/core.
 *
 * Guards the Node/SSR-safety of core's published entry points. morphlex does
 * module-scope DOM feature-detection (`"moveBefore" in Element.prototype`)
 * that threw `ReferenceError: Element is not defined` in bare Node until the
 * dom-globals shim (packages/core/src/lib/dom-globals-shim.ts) was added.
 * This check fails if that shim is dropped, reordered after morphlex, or a
 * dependency upgrade introduces a new module-scope DOM global.
 *
 * Runs from the repo root against built dist via workspace resolution
 * (CI: export-validation job, after build artifacts are restored).
 * Prints one `PASS <desc>` / `FAIL <desc>` line per check; exits 1 if any fail.
 */

let failed = 0;

async function check(desc, fn) {
  try {
    const detail = await fn();
    console.log(`PASS ${desc}${detail ? ` (${detail})` : ''}`);
  } catch (e) {
    console.log(`FAIL ${desc} — ${e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

await check('@hyperfixi/core — bare-Node import (main index)', async () => {
  const m = await import('@hyperfixi/core');
  // Name the entry points a Node consumer actually reaches for, rather than
  // leaning on a raw export count: the count was `> 40` until Arc 6b deleted
  // the 24 dead `features/` values (53 → 29), and a threshold that a
  // deletion of dead code can trip is measuring the wrong thing. The floor
  // below only catches an import that resolved to an empty or stub module.
  for (const name of ['hyperscript', 'parse', 'Runtime', 'createContext', 'getElementScopeMap']) {
    assert(name in m, `${name} missing`);
  }
  const exportCount = Object.keys(m).length;
  assert(exportCount > 20, `only ${exportCount} exports (expected > 20)`);
  return `${exportCount} exports`;
});

// ---------------------------------------------------------------------------
// The engine / front-end boundary, at the ARTIFACT level.
//
// `packages/core/src` reaches `@lokascript/semantic`, `/intent`, `/i18n` and
// `@lokascript/framework` only through `await import(...)` (the source-level
// ratchet, scripts/check-semantic-boundary.cjs, records every site). That
// proves nothing about what ships: with `external: []` rollup followed the
// workspace symlinks and `inlineDynamicImports` flattened every one of those
// imports, so dist/index.mjs carried the three packages whole — 3.33 MB with
// zero dynamic imports left, and a consumer that also imported semantic loaded
// two copies. The sourcemap is the oracle: its `sources` names every inlined
// file by path. ENGINE_MIGRATION_PLAN.md, Arc 1 step 2.
// ---------------------------------------------------------------------------

const FRONT_END_DIRS = ['/semantic/', '/intent/', '/i18n/', '/framework/'];

async function sourcemapSources(relPath) {
  const { readFile } = await import('node:fs/promises');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const pkgJson = require.resolve('@hyperfixi/core/package.json');
  const file = new URL(relPath, `file://${pkgJson.replace(/package\.json$/, '')}`).pathname;
  const map = JSON.parse(await readFile(`${file}.map`, 'utf8'));
  return { file, sources: map.sources };
}

for (const entry of ['dist/index.mjs', 'dist/index.cjs', 'dist/multilingual/index.mjs']) {
  await check(`@hyperfixi/core — ${entry} inlines no front-end package`, async () => {
    const { sources } = await sourcemapSources(entry);
    // Workspace paths look like `../../semantic/dist/index.js`; a consumer's
    // node_modules copy would be `node_modules/@lokascript/semantic/...`.
    const inlined = sources.filter(
      s => FRONT_END_DIRS.some(d => s.includes(d)) && !s.includes('/core/')
    );
    assert(inlined.length === 0, `inlined from the front-end: ${inlined.slice(0, 3).join(', ')}`);
    return `${sources.length} sources, all engine`;
  });
}

await check(
  '@hyperfixi/core — dist/index.mjs defers the front-end with a real import()',
  async () => {
    const { readFile } = await import('node:fs/promises');
    const { file } = await sourcemapSources('dist/index.mjs');
    const text = await readFile(file, 'utf8');
    const hits = text.match(/import\(['"]@lokascript\/semantic['"]\)/g) ?? [];
    assert(hits.length > 0, 'no import("@lokascript/semantic") left — the front-end was inlined');
    return `${hits.length} deferred import(s)`;
  }
);
// ---------------------------------------------------------------------------
// The CJS surface. Every `exports.*.require` and `main` pointed at a `.js`
// file built as CommonJS — but core's package.json says `"type": "module"`,
// so Node read those files as ESM and `require('@hyperfixi/core')` returned
// `{}` (the subpaths threw), on the published 3.0.0 too. Nothing above could
// see it: this script only ever `import()`ed. The CJS outputs are `.cjs` now;
// these checks `require()` them and assert the same named entry points.
// ---------------------------------------------------------------------------

const { createRequire } = await import('node:module');
const requireCjs = createRequire(import.meta.url);

await check('@hyperfixi/core — bare-Node require() (CJS main)', async () => {
  const m = requireCjs('@hyperfixi/core');
  for (const name of ['hyperscript', 'parse', 'Runtime', 'createContext', 'getElementScopeMap']) {
    assert(name in m, `${name} missing from require()`);
  }
  const exportCount = Object.keys(m).length;
  assert(exportCount > 20, `only ${exportCount} exports from require() (expected > 20)`);
  return `${exportCount} exports`;
});

await check('@hyperfixi/core/commands — bare-Node require()', async () => {
  const m = requireCjs('@hyperfixi/core/commands');
  assert(typeof m.swap === 'function', 'swap factory missing from require()');
  return 'swap factory';
});

await check('@hyperfixi/core/multilingual — bare-Node require()', async () => {
  const m = requireCjs('@hyperfixi/core/multilingual');
  assert(typeof m.schemaRoleInferrer === 'function', 'schemaRoleInferrer missing from require()');
  return 'schemaRoleInferrer';
});

await check('@hyperfixi/core/commands — bare-Node import', async () => {
  const m = await import('@hyperfixi/core/commands');
  assert(typeof m.swap === 'function', 'swap factory missing');
  assert(typeof m.morph === 'function', 'morph factory missing');
  return 'swap + morph factories';
});

await check('@hyperfixi/core/behaviors — bare-Node import', async () => {
  const m = await import('@hyperfixi/core/behaviors');
  assert(typeof m.registerHistorySwap === 'function', 'registerHistorySwap missing');
  return 'registerHistorySwap';
});

process.exit(failed ? 1 : 0);
