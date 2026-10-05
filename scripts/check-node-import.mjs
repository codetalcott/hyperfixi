/**
 * Bare-Node import check for @hyperfixi/core.
 *
 * Guards the Node/SSR-safety of core's published entry points: each one is
 * imported (or required) in bare Node, with no DOM, and must resolve to the
 * names a consumer reaches for. Since 4.0 the root is `@hyperfixi/engine`
 * re-exported (ESM only, the engine external: one engine, one grammar), and the
 * tooling stays on subpaths.
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

const ENGINE_NAMES = ['api', 'register', 'everything', 'parse', 'evaluate', 'processNode', 'boot'];

await check('@hyperfixi/core — bare-Node import (main index)', async () => {
  const m = await import('@hyperfixi/core');
  for (const name of [...ENGINE_NAMES, 'VERSION']) assert(name in m, `${name} missing`);
  const engine = await import('@hyperfixi/engine');
  // The SAME engine, not a copy: a second instance would have its own grammar.
  assert(m.register === engine.register, "register is not @hyperfixi/engine's own");
  assert(m.api === engine.api, "api is not @hyperfixi/engine's own");
  return `${Object.keys(m).length} exports, the engine's own`;
});

// ---------------------------------------------------------------------------
// The engine / front-end boundary, at the ARTIFACT level.
//
// `packages/core/src` reaches `@lokascript/semantic` only through
// `await import(...)` in `/multilingual` (the source-level ratchet,
// scripts/check-semantic-boundary.cjs, records it). That proves nothing about
// what ships: with `external: []` rollup followed the workspace symlinks and
// `inlineDynamicImports` flattened the import, so a dist file carried semantic
// whole — 3.33 MB once, and a consumer that also imported semantic loaded two
// copies. The sourcemap is the oracle: its `sources` names every inlined file by
// path. ENGINE_MIGRATION_PLAN.md, Arc 1 step 2.
// ---------------------------------------------------------------------------

const INLINE_FORBIDDEN = ['/semantic/', '/intent/', '/i18n/', '/framework/', '/engine/'];

async function sourcemapSources(relPath) {
  const { readFile } = await import('node:fs/promises');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const pkgJson = require.resolve('@hyperfixi/core/package.json');
  const file = new URL(relPath, `file://${pkgJson.replace(/package\.json$/, '')}`).pathname;
  const map = JSON.parse(await readFile(`${file}.map`, 'utf8'));
  return { file, sources: map.sources };
}

for (const entry of [
  'dist/index.mjs',
  'dist/multilingual/index.mjs',
  'dist/multilingual/index.cjs',
]) {
  await check(
    `@hyperfixi/core — ${entry} inlines neither the engine nor the front-end`,
    async () => {
      const { sources } = await sourcemapSources(entry);
      // Workspace paths look like `../../semantic/dist/index.js`; a consumer's
      // node_modules copy would be `node_modules/@lokascript/semantic/...`.
      const inlined = sources.filter(
        s => INLINE_FORBIDDEN.some(d => s.includes(d)) && !s.includes('/core/')
      );
      assert(inlined.length === 0, `inlined: ${inlined.slice(0, 3).join(', ')}`);
      return `${sources.length} sources, all core's`;
    }
  );
}

await check(
  '@hyperfixi/core — dist/multilingual/index.mjs defers the front-end with a real import()',
  async () => {
    const { readFile } = await import('node:fs/promises');
    const { file } = await sourcemapSources('dist/multilingual/index.mjs');
    const text = await readFile(file, 'utf8');
    const hits = text.match(/import\(['"]@lokascript\/semantic['"]\)/g) ?? [];
    assert(hits.length > 0, 'no import("@lokascript/semantic") left — the front-end was inlined');
    return `${hits.length} deferred import(s)`;
  }
);

// ---------------------------------------------------------------------------
// The CJS surface of the subpaths. Core's package.json says `"type": "module"`,
// so a CommonJS build must be a `.cjs` file — 3.0.0 shipped `.js` ones and
// `require('@hyperfixi/core')` returned `{}`. The root is ESM only since 4.0
// (the engine has no CommonJS entry to require); the subpaths keep theirs.
// ---------------------------------------------------------------------------

const { createRequire } = await import('node:module');
const requireCjs = createRequire(import.meta.url);

await check('@hyperfixi/core/multilingual — bare-Node require()', async () => {
  const m = requireCjs('@hyperfixi/core/multilingual');
  const names = ['parse', 'render', 'translate'];
  for (const name of names) assert(typeof m[name] === 'function', `${name} missing from require()`);
  return names.join(' + ');
});

for (const [subpath, name] of [
  ['@hyperfixi/core/reference', 'commands'],
  ['@hyperfixi/core/metadata', 'packageInfo'],
  ['@hyperfixi/core/lsp-metadata', 'HOVER_DOCS'],
  ['@hyperfixi/core/ast-utils', 'withEnginePositions'],
]) {
  await check(`${subpath} — bare-Node import and require()`, async () => {
    const esm = await import(subpath);
    assert(name in esm, `${name} missing from import()`);
    assert(name in requireCjs(subpath), `${name} missing from require()`);
    return name;
  });
}

process.exit(failed ? 1 : 0);
