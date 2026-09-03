#!/usr/bin/env node
/**
 * Tests for scripts/check-type-escapes.cjs
 *
 * Node's built-in runner, to keep the zero-runtime-deps story:
 *     node --test scripts/check-type-escapes.test.cjs
 *
 * The stripping cases are the ones that matter. A ratchet whose number moves
 * when someone rewords a doc comment gets muted within a week, so the comment
 * and string cases below are the load-bearing tests, not the counting ones.
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  stripCommentsAndStrings,
  countEscapes,
  isExcluded,
  directoryOf,
  measure,
  check,
  improvements,
} = require('./check-type-escapes.cjs');

/** Count escapes the way measure() does: strip first, then match. */
function count(src) {
  return countEscapes(stripCommentsAndStrings(src));
}

// ---------------------------------------------------------------------------
// Counting
// ---------------------------------------------------------------------------

test('counts each of the five patterns', () => {
  const counts = count(
    [
      'function f(x: any) {}',
      'const a = x as any;',
      'const b = node as Record<string, unknown>;',
      'const c = node as unknown as Foo;',
      'const d: Map<string, any> = m;',
    ].join('\n')
  );
  assert.deepEqual(counts, {
    colonAny: 1,
    asAny: 1,
    asRecordUnknown: 1,
    asUnknownAs: 1,
    genericAny: 1,
  });
});

test('counts any[] but not identifiers that merely start with any', () => {
  const counts = count('let a: any[] = []; const anyOf = 1; type Anything = { x: anything };');
  assert.equal(counts.colonAny, 1);
  assert.equal(counts.genericAny, 0);
});

test('genericAny catches the shapes `: any` structurally cannot', () => {
  // The dodge this pattern exists to close: same hatch, no colon in sight.
  assert.equal(count('let m: Map<string, any>;').genericAny, 1);
  assert.equal(count('function f(): Promise<any> {}').genericAny, 1);
  assert.equal(count('let r: Record<string, any>;').genericAny, 1);
  assert.equal(count('let both: Pair<any, any>;').genericAny, 2);
  // ...and what it must NOT catch.
  assert.equal(count('let ok: Map<string, unknown>;').genericAny, 0);
  assert.equal(count('let s: Set<anything>;').genericAny, 0);
});

test('as unknown as is counted once, not also as an asAny', () => {
  const counts = count('const v = x as unknown as Y;');
  assert.equal(counts.asUnknownAs, 1);
  assert.equal(counts.asAny, 0);
});

// ---------------------------------------------------------------------------
// Stripping — the load-bearing cases
// ---------------------------------------------------------------------------

test('a doc comment mentioning (node: any) is not a hatch', () => {
  const src = ['/**', ' * Narrows the `(node: any)` parameters at the call site.', ' */', 'function f(n: Node) {}'].join(
    '\n'
  );
  assert.equal(count(src).colonAny, 0);
});

test('a line comment mentioning as any is not a hatch', () => {
  assert.equal(count('const x = 1; // was `x as any` before #123').asAny, 0);
});

test('a URL inside a string does not swallow the rest of the line', () => {
  const src = "const url = 'https://example.com/x'; const v = y as any;";
  assert.equal(count(src).asAny, 1);
});

test('a string containing the pattern is not a hatch', () => {
  assert.equal(count("const msg = 'use as any sparingly';").asAny, 0);
});

test('an escaped quote does not end the string early', () => {
  const src = "const s = 'it\\'s as any in here'; const v = z as any;";
  assert.equal(count(src).asAny, 1);
});

test('template literals are stripped like strings', () => {
  assert.equal(count('const t = `cast with as any here`;').asAny, 0);
});

test('code after a block comment is still counted', () => {
  assert.equal(count('/* as any as any */ const v = q as any;').asAny, 1);
});

test('a division that looks like a comment start does not eat the file', () => {
  assert.equal(count('const half = total / 2; const v = w as any;').asAny, 1);
});

// ---------------------------------------------------------------------------
// File selection
// ---------------------------------------------------------------------------

test('excludes test files and test utilities, includes .d.ts', () => {
  assert.equal(isExcluded('parser/parser.test.ts'), true);
  assert.equal(isExcluded('multilingual/browser-e2e.spec.ts'), true);
  assert.equal(isExcluded('commands/dom/__tests__/toggle.test.ts'), true);
  assert.equal(isExcluded('__test-utils__/context.ts'), true);
  assert.equal(isExcluded('test-helpers/dom.ts'), true);
  assert.equal(isExcluded('test-ast-debug.ts'), true);

  assert.equal(isExcluded('types.d.ts'), false);
  assert.equal(isExcluded('parser/parser.ts'), false);
});

test('attributes files to their first path segment', () => {
  assert.equal(directoryOf('parser/command-parsers/dom-commands.ts'), 'parser');
  assert.equal(directoryOf('metadata.ts'), '.');
});

// ---------------------------------------------------------------------------
// The ratchet itself
// ---------------------------------------------------------------------------

/** Build a measurement the way measure() returns one, from directory totals. */
function measured(totals) {
  const directories = {};
  let total = 0;
  for (const [dir, n] of Object.entries(totals)) {
    directories[dir] = { total: n, colonAny: n, asAny: 0, asRecordUnknown: 0, asUnknownAs: 0 };
    total += n;
  }
  return { directories, total };
}

test('passes when every directory is at or below baseline', () => {
  const base = { directories: { parser: { total: 10 }, commands: { total: 5 } } };
  assert.deepEqual(check(measured({ parser: 10, commands: 4 }), base), []);
});

test('fails when a directory rises', () => {
  const base = { directories: { parser: { total: 10 } } };
  const failures = check(measured({ parser: 11 }), base);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /packages\/core\/src\/parser: 11 type escapes, baseline 10 \(\+1\)/);
});

test('fails when a brand-new directory arrives with hatches', () => {
  const failures = check(measured({ fresh: 3 }), { directories: {} });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /baseline 0 \(\+3\)/);
});

test('a new directory with zero hatches is fine', () => {
  assert.deepEqual(check(measured({ fresh: 0 }), { directories: {} }), []);
});

test('INTENTIONALLY_UNRATCHETED suppresses a rise', () => {
  const base = { directories: { generated: { total: 0 } } };
  const unratcheted = new Map([['generated', 'emitted by a generator']]);
  assert.deepEqual(check(measured({ generated: 40 }), base, unratcheted), []);
});

test('improvements reports a drop, including a directory that went away', () => {
  const base = { directories: { parser: { total: 10 }, context: { total: 32 } } };
  const wins = improvements(measured({ parser: 7 }), base);
  assert.deepEqual(wins.sort((a, b) => a.dir.localeCompare(b.dir)), [
    { dir: 'context', before: 32, after: 0 },
    { dir: 'parser', before: 10, after: 7 },
  ]);
});

// ---------------------------------------------------------------------------
// Integration — the real tree
// ---------------------------------------------------------------------------

test('integration: the real tree measures and matches its committed baseline', () => {
  const real = measure();
  assert.ok(real.total > 0, 'expected to find escapes in packages/core/src');
  assert.ok(real.directories.parser, 'expected a parser directory');

  const baseline = require('../packages/core/baselines/type-escapes.json');
  assert.deepEqual(
    check(real, baseline),
    [],
    'the committed baseline is stale — run `npm run check:type-escapes:update`'
  );
});
