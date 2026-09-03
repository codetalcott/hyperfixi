#!/usr/bin/env node
/**
 * Tests for scripts/check-semantic-boundary.cjs
 *
 *     node --test scripts/check-semantic-boundary.test.cjs
 *
 * The import-kind cases carry the weight. This gate's only real claim is that
 * a `static-value` import costs something a `static-type` one does not; if the
 * classifier is wrong, the allowlist ranks the debt backwards and the arc
 * chases the wrong files.
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  stripComments,
  frontEndImports,
  analyze,
  check,
  writeBaseline,
  isFrontEndSide,
  KINDS,
} = require('./check-semantic-boundary.cjs');

/** Classify a snippet the way analyze() does: strip comments, then match. */
function kinds(src) {
  return frontEndImports(stripComments(src)).map(i => i.kind);
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

test('a value import is static-value — the kind that is actually debt', () => {
  assert.deepEqual(kinds("import { parseSemantic } from '@lokascript/semantic';"), [
    'static-value',
  ]);
});

test('a type import is static-type, not static-value', () => {
  assert.deepEqual(kinds("import type { SemanticNode } from '@lokascript/semantic';"), [
    'static-type',
  ]);
  assert.deepEqual(kinds("export type { ASTNode } from '@lokascript/semantic';"), ['static-type']);
});

test('a deferred import is dynamic, and is NOT double-counted as a typeof query', () => {
  assert.deepEqual(kinds("const m = await import('@lokascript/semantic');"), ['dynamic']);
});

test('a typeof import query is typeof-import, and is NOT counted as dynamic', () => {
  // These two look almost identical in source and mean opposite things: one
  // pulls the module at runtime, the other erases entirely.
  assert.deepEqual(kinds("let m: typeof import('@lokascript/semantic') | null = null;"), [
    'typeof-import',
  ]);
});

test('subpath imports count', () => {
  assert.deepEqual(kinds("import { esKeywords } from '@lokascript/i18n/browser';"), [
    'static-value',
  ]);
  assert.deepEqual(kinds("import { fromProtocolJSON } from '@lokascript/intent';"), [
    'static-value',
  ]);
});

test('a non-front-end import is ignored', () => {
  assert.deepEqual(kinds("import { morph } from 'morphlex';"), []);
  assert.deepEqual(kinds("import { debug } from '../utils/debug';"), []);
});

// ---------------------------------------------------------------------------
// Comment stripping — the measurement this gate got wrong first time
// ---------------------------------------------------------------------------

test('an example import inside a docblock is not an import', () => {
  // Measured before stripping existed: 13 static-value imports reported where
  // there are 8, because five were example lines in docblocks.
  const src = [
    '/**',
    " * import { createSemanticAnalyzer } from '@lokascript/semantic';",
    ' */',
    'export const x = 1;',
  ].join('\n');
  assert.deepEqual(kinds(src), []);
});

test('an example import in a line comment is not an import', () => {
  assert.deepEqual(kinds("// import { parseSemantic } from '@lokascript/semantic';"), []);
});

test('string CONTENTS are kept, because the specifier is a string', () => {
  // The opposite of what check-type-escapes needs, and the reason this file
  // has its own stripper rather than importing that one.
  assert.deepEqual(kinds("import { x } from '@lokascript/semantic';"), ['static-value']);
});

test('real code after a docblock is still seen', () => {
  const src = [
    "/** Uses '@lokascript/semantic' internally. */",
    "import { buildAST } from '@lokascript/semantic';",
  ].join('\n');
  assert.deepEqual(kinds(src), ['static-value']);
});

// ---------------------------------------------------------------------------
// The ratchet
// ---------------------------------------------------------------------------

const analysisOf = files => ({
  files,
  totals: Object.fromEntries(
    KINDS.map(k => [k, Object.values(files).reduce((n, c) => n + (c[k] ?? 0), 0)])
  ),
});

test('passes when the allowlist matches (front-end-side rows)', () => {
  const a = analysisOf({ 'multilingual/bridge.ts': { 'static-type': 1, dynamic: 1 } });
  const base = { files: { 'multilingual/bridge.ts': { 'static-type': 1, dynamic: 1 } } };
  assert.deepEqual(check(a, base).failures, []);
});

test('a NEW front-end-side file importing the front-end fails until it is recorded', () => {
  const failures = check(analysisOf({ 'multilingual/new.ts': { 'static-value': 1 } }), {
    files: {},
  }).failures;
  assert.equal(failures.length, 1);
  assert.match(failures[0], /NEW front-end import in packages\/core\/src\/multilingual\/new\.ts/);
});

// ---------------------------------------------------------------------------
// The hard rule (Arc 1 steps 2–3): the engine side may not import the
// front-end at all — allowlisted or not, in any kind.
// ---------------------------------------------------------------------------

test('the front-end side is exactly the bundles and multilingual/', () => {
  assert.equal(isFrontEndSide('compatibility/browser-bundle.ts'), true);
  assert.equal(isFrontEndSide('compatibility/browser-bundle-multilingual.ts'), true);
  assert.equal(isFrontEndSide('multilingual/bridge.ts'), true);
  assert.equal(isFrontEndSide('multilingual/deep/file.ts'), true);
  assert.equal(isFrontEndSide('api/hyperscript-api.ts'), false);
  assert.equal(isFrontEndSide('compatibility/metadata.ts'), false);
  assert.equal(isFrontEndSide('parser/semantic-integration.ts'), false);
});

test('an engine-side file fails even with a matching allowlist row', () => {
  // This was the ratchet's whole blind spot: a row was a licence. Now it is
  // only a record, and the API's old `dynamic: 2` row would not save it.
  const a = analysisOf({ 'api/hyperscript-api.ts': { dynamic: 2 } });
  const base = { files: { 'api/hyperscript-api.ts': { dynamic: 2, reason: 'was allowed' } } };
  const { failures } = check(a, base);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /ENGINE side of the boundary/);
  assert.match(failures[0], /hyperscript\.use\(frontEnd\)/);
});

test('an engine-side file fails in the cheapest kind too', () => {
  const { failures } = check(analysisOf({ 'runtime/runtime.ts': { 'static-type': 1 } }), {
    files: {},
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /ENGINE side of the boundary/);
});

test('--update refuses to write an engine-side row', () => {
  assert.throws(
    () => writeBaseline(analysisOf({ 'api/hyperscript-api.ts': { dynamic: 1 } })),
    /refusing to write a baseline with engine-side rows/
  );
});

test('a risen static-value count fails', () => {
  const base = { files: { 'multilingual/a.ts': { 'static-value': 1 } } };
  const failures = check(analysisOf({ 'multilingual/a.ts': { 'static-value': 2 } }), base).failures;
  assert.equal(failures.length, 1);
  assert.match(failures[0], /static-value front-end imports rose 1 -> 2/);
});

test('a dynamic import HARDENING into static-value fails at the same total', () => {
  // The case a per-file allowlist alone cannot see: same file, same number of
  // imports, but a deferred dependency became an eager bundled one.
  const base = { files: { 'multilingual/a.ts': { dynamic: 1, 'static-value': 0 } } };
  const failures = check(analysisOf({ 'multilingual/a.ts': { 'static-value': 1 } }), base).failures;
  assert.ok(failures.some(f => /static-value front-end imports rose 0 -> 1/.test(f)));
});

test('a type-only import HARDENING into static-value fails', () => {
  const base = { files: { 'multilingual/a.ts': { 'static-type': 1 } } };
  const failures = check(
    analysisOf({ 'multilingual/a.ts': { 'static-type': 1, 'static-value': 1 } }),
    base
  ).failures;
  assert.ok(failures.some(f => /static-value front-end imports rose 0 -> 1/.test(f)));
});

test('a dropped count is an improvement, not a failure', () => {
  const base = { files: { 'multilingual/a.ts': { 'static-value': 2 } } };
  const { failures, improvements } = check(
    analysisOf({ 'multilingual/a.ts': { 'static-value': 1 } }),
    base
  );
  assert.deepEqual(failures, []);
  assert.deepEqual(improvements, ['multilingual/a.ts static-value: 2 -> 1']);
});

test('a file that loses ALL front-end imports fails as a stale row', () => {
  // Ratchet-down enforcement: the PR that earns the win must prune the row.
  const base = { files: { 'multilingual/a.ts': { 'static-value': 1 } } };
  const { failures } = check(analysisOf({}), base);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /STALE allowlist row/);
});

// ---------------------------------------------------------------------------
// Integration — the real tree
// ---------------------------------------------------------------------------

test('integration: the real tree matches its committed baseline', () => {
  const real = analyze();
  const baseline = require('../packages/core/baselines/semantic-boundary.json');
  assert.deepEqual(
    check(real, baseline).failures,
    [],
    'the committed baseline is stale — run `npm run check:semantic-boundary:update`'
  );
});

test('integration: every allowlisted row carries a real reason', () => {
  const baseline = require('../packages/core/baselines/semantic-boundary.json');
  for (const [file, row] of Object.entries(baseline.files)) {
    assert.ok(row.reason && row.reason.length > 40, `${file} needs a reason`);
    assert.doesNotMatch(row.reason, /^TODO/, `${file} still has the generated placeholder`);
  }
});

test('integration: the engine core (parser, runtime, commands, expressions) is already clean', () => {
  // The property most worth protecting, and one that is TRUE today: the
  // dependency lives in the api, the bundles and the multilingual module — not
  // in the parser, the runtime, the commands or the expressions. A regression
  // here would be far worse than the rows on the list, so it is asserted
  // separately rather than left to the allowlist's silence.
  const real = analyze();
  const offenders = Object.keys(real.files).filter(f =>
    /^(parser|runtime|commands|expressions|types|core)\//.test(f)
  );
  assert.deepEqual(offenders, []);
});

test('integration: every file in the real tree is on the front-end side', () => {
  // The endpoint Arc 1 named, as a property of the tree: the bundles that ship
  // the front-end and the module that is the front-end, nothing else.
  const real = analyze();
  const engineSide = Object.keys(real.files).filter(f => !isFrontEndSide(f));
  assert.deepEqual(engineSide, [], `engine-side front-end imports: ${engineSide.join(', ')}`);
});
