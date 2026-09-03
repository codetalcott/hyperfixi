#!/usr/bin/env node
/**
 * Tests for scripts/check-layering.cjs
 *
 *     node --test scripts/check-layering.test.cjs
 *
 * The import-parsing cases are the load-bearing ones. A layering gate that
 * miscounts `export type { X } from '../commands/…'` as a runtime dependency
 * would put the barrel at the top of the debt list and the real cycle
 * (`parser/runtime.ts` → `commands/helpers`) below it.
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { unitOf, relativeImports, analyze, check, LAYERS } = require('./check-layering.cjs');

// ---------------------------------------------------------------------------
// Import parsing
// ---------------------------------------------------------------------------

test('reads a plain value import', () => {
  assert.deepEqual(relativeImports("import { parse } from '../parser/parser';"), [
    { spec: '../parser/parser', typeOnly: false },
  ]);
});

test('marks `import type` and `export type` as type-only', () => {
  assert.deepEqual(relativeImports("import type { ASTNode } from '../types/base-types';"), [
    { spec: '../types/base-types', typeOnly: true },
  ]);
  assert.deepEqual(relativeImports("export type { SwapCommandInput } from '../commands/dom/swap';"), [
    { spec: '../commands/dom/swap', typeOnly: true },
  ]);
});

test('a mixed clause counts as a value import', () => {
  // One runtime binding is enough to make the edge real.
  assert.deepEqual(relativeImports("export { runIt, type Opts } from '../runtime/runtime';"), [
    { spec: '../runtime/runtime', typeOnly: false },
  ]);
});

test('dynamic and side-effect imports are value imports', () => {
  assert.deepEqual(relativeImports("const m = await import('../multilingual/bridge');"), [
    { spec: '../multilingual/bridge', typeOnly: false },
  ]);
  assert.deepEqual(relativeImports("\nimport '../compatibility/bundle-shell';"), [
    { spec: '../compatibility/bundle-shell', typeOnly: false },
  ]);
});

test('ignores bare-specifier (cross-package) imports', () => {
  assert.deepEqual(relativeImports("import { parseSemantic } from '@lokascript/semantic';"), []);
});

test('a multi-line import clause is still read as one import', () => {
  const src = ['import {', '  createContext,', '  createChildContext,', "} from '../core/context';'"].join('\n');
  assert.deepEqual(relativeImports(src), [{ spec: '../core/context', typeOnly: false }]);
});

test('does not run across statements to pair the wrong specifier', () => {
  const src = ["import { a } from '../utils/debug';", "import { b } from '../types/core';"].join('\n');
  assert.deepEqual(relativeImports(src), [
    { spec: '../utils/debug', typeOnly: false },
    { spec: '../types/core', typeOnly: false },
  ]);
});

// ---------------------------------------------------------------------------
// Unit resolution
// ---------------------------------------------------------------------------

test('a nested file belongs to its first path segment', () => {
  assert.equal(unitOf('parser/command-parsers/dom-commands.ts'), 'parser');
});

test('a root FILE is its own unit, a root DIRECTORY is not', () => {
  // The distinction that made `compatibility -> version` stop reading as
  // `compatibility -> .` (11 imports of a leaf, mislabelled as a violation).
  const isDir = p => p === 'behaviors';
  assert.equal(unitOf('version.ts', isDir), 'root:version');
  assert.equal(unitOf('index.ts', isDir), 'root:index');
  assert.equal(unitOf('behaviors', isDir), 'behaviors');
});

test('every layered unit has a numeric layer', () => {
  for (const [unit, layer] of LAYERS) {
    assert.equal(typeof layer, 'number', `${unit} has a non-numeric layer`);
  }
});

test('the spine is ordered as the plan states', () => {
  const at = u => LAYERS.get(u);
  assert.ok(at('types') < at('ast'), 'types below ast');
  assert.ok(at('ast') < at('parser'), 'ast below parser');
  assert.ok(at('parser') < at('commands'), 'parser below commands');
  assert.equal(at('commands'), at('expressions'), 'expressions sits BESIDE commands');
  assert.ok(at('commands') < at('runtime'), 'commands below runtime');
  assert.ok(at('runtime') < at('api'), 'runtime below api');
  assert.ok(at('api') < at('compatibility'), 'api below compatibility');
  assert.ok(at('compatibility') < at('root:index'), 'compatibility below the entry point');
});

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

/** Analyze a synthetic file set: { 'path.ts': 'source' }. */
function analyzeFiles(files) {
  return analyze(Object.keys(files), rel => files[rel]);
}

test('an upward import is recorded with its value/type split', () => {
  const a = analyzeFiles({
    'parser/runtime.ts': "import { toElementList } from '../commands/helpers/target-elements';",
    'types/index.ts': "export type { SwapCommandInput } from '../commands/dom/swap';",
  });
  assert.deepEqual(a.upward.get('parser -> commands'), { count: 1, value: 1, typeOnly: 0 });
  assert.deepEqual(a.upward.get('types -> commands'), { count: 1, value: 0, typeOnly: 1 });
});

test('a downward import conforms and is not recorded', () => {
  const a = analyzeFiles({ 'commands/dom/toggle.ts': "import { debug } from '../../utils/debug';" });
  assert.equal(a.upward.size, 0);
  assert.equal(a.conforming, 1);
});

test('a same-unit import is ignored entirely', () => {
  const a = analyzeFiles({ 'parser/parser.ts': "import { tokenize } from './tokenizer';" });
  assert.equal(a.upward.size, 0);
  assert.equal(a.conforming, 0);
});

test('same-layer imports conform (expressions beside commands)', () => {
  const a = analyzeFiles({ 'commands/dom/add.ts': "import { asNumber } from '../../expressions/type-helpers';" });
  assert.equal(a.upward.size, 0);
  assert.equal(a.conforming, 1);
});

test('an unlayered unit is reported rather than silently skipped', () => {
  const a = analyzeFiles({ 'brandnew/thing.ts': "import { x } from '../types/core';" });
  assert.deepEqual([...a.unclassified], ['brandnew']);
});

// ---------------------------------------------------------------------------
// The ratchet
// ---------------------------------------------------------------------------

const edge = (count, value = count) => ({ count, value, typeOnly: count - value });
const analysisOf = obj => ({
  upward: new Map(Object.entries(obj)),
  conforming: 0,
  unclassified: new Set(),
});

test('passes when the allowlist matches', () => {
  const a = analysisOf({ 'parser -> commands': edge(3) });
  const base = { upwardEdges: { 'parser -> commands': { count: 3, valueImports: 3 } } };
  assert.deepEqual(check(a, base).failures, []);
});

test('a NEW upward edge fails', () => {
  const failures = check(analysisOf({ 'parser -> runtime': edge(1) }), { upwardEdges: {} }).failures;
  assert.equal(failures.length, 1);
  assert.match(failures[0], /NEW upward import: parser -> runtime/);
});

test('a GROWN edge fails', () => {
  const base = { upwardEdges: { 'parser -> commands': { count: 3, valueImports: 3 } } };
  const failures = check(analysisOf({ 'parser -> commands': edge(4) }), base).failures;
  assert.equal(failures.length, 1);
  assert.match(failures[0], /grew: 4 imports, allowlisted at 3/);
});

test('a STALE row fails, so the list can only ratchet down', () => {
  const base = { upwardEdges: { 'core -> parser': { count: 1, valueImports: 1 } } };
  const failures = check(analysisOf({}), base).failures;
  assert.equal(failures.length, 1);
  assert.match(failures[0], /STALE allowlist row: core -> parser no longer exists/);
});

test('a SHRUNK edge is an improvement, not a failure', () => {
  const base = { upwardEdges: { 'types -> validation': { count: 10, valueImports: 4 } } };
  const { failures, improvements } = check(analysisOf({ 'types -> validation': edge(6, 2) }), base);
  assert.deepEqual(failures, []);
  assert.deepEqual(improvements, [{ edge: 'types -> validation', before: 10, after: 6 }]);
});

test('a type-only edge that HARDENS into a value edge fails at the same total', () => {
  // The case a count-only ratchet cannot see: `export type { X } from '../commands/…'`
  // becoming a real runtime import erases no line but creates a bundle edge.
  const base = { upwardEdges: { 'types -> commands': { count: 3, valueImports: 0 } } };
  const failures = check(analysisOf({ 'types -> commands': edge(3, 2) }), base).failures;
  assert.equal(failures.length, 1);
  assert.match(failures[0], /hardened: 2 value imports, allowlisted at 0/);
});

test('an unclassified unit fails the check', () => {
  const a = { upward: new Map(), conforming: 0, unclassified: new Set(['brandnew']) };
  const failures = check(a, { upwardEdges: {} }).failures;
  assert.equal(failures.length, 1);
  assert.match(failures[0], /`brandnew` has no layer/);
});

// ---------------------------------------------------------------------------
// Integration — the real tree
// ---------------------------------------------------------------------------

test('integration: the real tree analyzes clean against its committed baseline', () => {
  const real = analyze();
  assert.deepEqual([...real.unclassified], [], 'every packages/core/src unit must have a layer');
  assert.ok(real.conforming > 500, 'expected the bulk of imports to conform');

  const baseline = require('../packages/core/baselines/layering.json');
  const { failures } = check(real, baseline);
  assert.deepEqual(failures, [], 'the committed baseline is stale — run `npm run check:layering:update`');
});

test('integration: every allowlisted row carries a real reason', () => {
  const baseline = require('../packages/core/baselines/layering.json');
  for (const [edge, row] of Object.entries(baseline.upwardEdges)) {
    assert.ok(row.reason && row.reason.length > 40, `${edge} needs a reason, not a placeholder`);
    assert.doesNotMatch(row.reason, /^TODO/, `${edge} still has the generated placeholder reason`);
  }
});
