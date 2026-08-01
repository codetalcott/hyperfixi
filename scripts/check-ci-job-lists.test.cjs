#!/usr/bin/env node
/**
 * Tests for scripts/check-ci-job-lists.cjs
 *
 * node's built-in runner, to keep the zero-runtime-deps story — no vitest, no
 * jest, no extra install. Run with:
 *     node --test scripts/check-ci-job-lists.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  check,
  checkCoverage,
  checkExportValidation,
  checkLintDomains,
  checkTypecheck,
  joinContinuedLine,
  loadAll,
  loadCiBuiltPackages,
  loadCodecovFlags,
  loadCoverageSteps,
  loadExportValidationArgs,
  loadLintDomains,
  loadTypecheckDirs,
  loadWorkspaces,
} = require('./check-ci-job-lists.cjs');

/** Build a workspaces map matching the shape the check functions expect. */
function workspaces(defs) {
  const byDir = new Map();
  for (const {
    dir,
    name = `@x/${dir}`,
    isPrivate = false,
    hasEntryPoint = true,
    hasTypecheck = false,
    hasTest = true,
    hasLintSuite = false,
  } of defs) {
    byDir.set(dir, { name, isPrivate, hasEntryPoint, hasTypecheck, hasTest, hasLintSuite });
  }
  return byDir;
}

/**
 * Synthetic fixtures must not inherit the real INTENTIONAL_OMISSIONS maps —
 * their contents change as packages are vetted, and every entry would fire the
 * stale-exemption class against a fixture workspace that has no such directory.
 */
const NONE = new Map();

/**
 * A miniature ci.yml carrying every shape that matters: the wrapped
 * `if ! … | tee` export invocation with a `\`-continued arg list, a `run: |`
 * typecheck block containing the `typecheck:scripts` near-miss, the coverage
 * job's two step spellings, and prose that must not parse as a step.
 */
const SAMPLE_CI = [
  'name: CI',
  'jobs:',
  '  build:',
  '    steps:',
  '      - name: Build alpha',
  '        run: npm run build --prefix packages/alpha',
  '      - name: Build beta',
  '        run: npm run build:browser --prefix packages/beta',
  '',
  '  export-validation:',
  '    steps:',
  '      - name: Validate all package exports',
  '        run: |',
  '          set -o pipefail',
  '          if ! node scripts/validate-exports.mjs \\',
  '            alpha \\',
  '            beta \\',
  '            --strict 2>&1 | tee /tmp/export-validation.log; then',
  '            status=1',
  '          fi',
  '',
  '  # ============================================',
  '  # Job 3: Lint & Typecheck',
  '  # ============================================',
  '  lint-typecheck:',
  '    steps:',
  '      - name: Typecheck all packages',
  '        run: |',
  '          npm run typecheck --prefix packages/alpha',
  '          npm run typecheck --prefix packages/beta',
  '      - name: Typecheck core scripts',
  '        run: npm run typecheck:scripts --prefix packages/alpha',
  '',
  '  coverage:',
  '    steps:',
  '      - name: Generate coverage - alpha',
  '        run: VITEST_TIMEOUT=300 npm run test:coverage --prefix packages/alpha',
  '      - name: Generate coverage - beta',
  '        run: npm test --prefix packages/beta -- --coverage',
  '      - name: Upload alpha coverage to Codecov',
  '        uses: codecov/codecov-action@v7',
  '        with:',
  '          files: packages/alpha/coverage/lcov.info',
  '          flags: alpha',
  '          name: alpha-coverage',
  '      - name: Upload beta coverage to Codecov',
  '        uses: codecov/codecov-action@v7',
  '        with:',
  '          files: packages/beta/coverage/lcov.info',
  '          flags: beta',
  '',
  '  unit-tests:',
  '    steps:',
  '      # NOTE: lint:domains is `npm test --prefix packages/domain-<x> -- --run lint`',
  '      - name: Test alpha',
  '        run: npm test --prefix packages/alpha',
].join('\n');

const SAMPLE_CODECOV = [
  'codecov:',
  '  require_ci_to_pass: yes',
  '',
  'flags:',
  '  alpha:',
  '    paths:',
  '      - packages/alpha/src/**',
  '    carryforward: true',
  '  beta:',
  '    paths:',
  '      - packages/beta/src/**',
  '    carryforward: true',
  '',
  'comment:',
  '  layout: header',
].join('\n');

const SAMPLE_ROOT_PKG = JSON.stringify({
  scripts: {
    'lint:domains':
      'for pkg in sql bdd; do npm test --prefix packages/domain-$pkg -- --run lint || exit 1; done',
  },
});

// ---------------------------------------------------------------------------
// (1) export-validation
// ---------------------------------------------------------------------------

test('exports: passes when every qualifying package is an argument', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b' }]);
  const built = new Set(['a', 'b']);
  assert.deepEqual(checkExportValidation(ws, built, ['a', 'b'], NONE), []);
});

test('exports: flags a qualifying package that is not validated', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b', name: '@x/b' }]);
  const failures = checkExportValidation(ws, new Set(['a', 'b']), ['a'], NONE);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /@x\/b \(packages\/b\)/);
  assert.match(failures[0], /NOT passed to validate-exports\.mjs/);
  assert.match(failures[0], /Add "b" to the argument list/);
});

test('exports: flags a private package passed as an argument (the aot-compiler no-op)', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'priv', isPrivate: true }]);
  const failures = checkExportValidation(ws, new Set(['a', 'priv']), ['a', 'priv'], NONE);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /is private/);
  assert.match(failures[0], /silent no-op/);
});

test('exports: a private package is not required to be validated', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'priv', isPrivate: true }]);
  assert.deepEqual(checkExportValidation(ws, new Set(['a', 'priv']), ['a'], NONE), []);
});

test('exports: a package CI never builds is neither required nor allowed', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'unbuilt' }]);
  // not required...
  assert.deepEqual(checkExportValidation(ws, new Set(['a']), ['a'], NONE), []);
  // ...and passing it anyway is a failure, because its dist never arrives.
  const failures = checkExportValidation(ws, new Set(['a']), ['a', 'unbuilt'], NONE);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /never builds it/);
});

test('exports: flags an argument naming no workspace package', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const failures = checkExportValidation(ws, new Set(['a']), ['a', 'ghost'], NONE);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /validates NOTHING and the job still passes/);
});

test('exports: flags a package with no entry-point field', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b', hasEntryPoint: false }]);
  const failures = checkExportValidation(ws, new Set(['a', 'b']), ['a', 'b'], NONE);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /declares none of/);
});

test('exports: flags a duplicated argument', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const failures = checkExportValidation(ws, new Set(['a']), ['a', 'a'], NONE);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /twice/);
});

test('exports: an omission suppresses the missing-package failure', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b' }]);
  const omit = new Map([['b', 'ships prebuilt']]);
  assert.deepEqual(checkExportValidation(ws, new Set(['a', 'b']), ['a'], omit), []);
});

test('exports: flags a stale omission that is now validated', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const omit = new Map([['a', 'stale']]);
  const failures = checkExportValidation(ws, new Set(['a']), ['a'], omit);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /now includes it/);
});

test('exports: flags an omission for a package that no longer qualifies', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b', isPrivate: true }]);
  const omit = new Map([['b', 'stale']]);
  const failures = checkExportValidation(ws, new Set(['a', 'b']), ['a'], omit);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /the exemption is doing nothing/);
});

test('exports: flags an omission for a package that no longer exists', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const omit = new Map([['ghost', 'stale']]);
  const failures = checkExportValidation(ws, new Set(['a']), ['a'], omit);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /no such workspace package exists/);
});

// ---------------------------------------------------------------------------
// (2) typecheck
// ---------------------------------------------------------------------------

test('typecheck: passes when every package with the script is enumerated', () => {
  const ws = workspaces([
    { dir: 'a', hasTypecheck: true },
    { dir: 'b', hasTypecheck: true },
  ]);
  assert.deepEqual(checkTypecheck(ws, ['a', 'b'], NONE), []);
});

test('typecheck: flags a package with a typecheck script CI never runs', () => {
  const ws = workspaces([
    { dir: 'a', hasTypecheck: true },
    { dir: 'b', hasTypecheck: true },
  ]);
  const failures = checkTypecheck(ws, ['a'], NONE);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /stays green forever/);
  assert.match(failures[0], /npm run typecheck --prefix packages\/b/);
});

test('typecheck: a package without the script is not required', () => {
  const ws = workspaces([{ dir: 'a', hasTypecheck: true }, { dir: 'b' }]);
  assert.deepEqual(checkTypecheck(ws, ['a'], NONE), []);
});

test('typecheck: flags an enumerated package with no typecheck script', () => {
  const ws = workspaces([{ dir: 'a', hasTypecheck: true }, { dir: 'b' }]);
  const failures = checkTypecheck(ws, ['a', 'b'], NONE);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /has no "typecheck" script/);
});

test('typecheck: flags an enumerated package that does not exist', () => {
  const ws = workspaces([{ dir: 'a', hasTypecheck: true }]);
  const failures = checkTypecheck(ws, ['a', 'ghost'], NONE);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /no such workspace package exists/);
});

test('typecheck: flags a duplicated line', () => {
  const ws = workspaces([{ dir: 'a', hasTypecheck: true }]);
  const failures = checkTypecheck(ws, ['a', 'a'], NONE);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /twice/);
});

test('typecheck: an omission suppresses the never-run failure, and goes stale', () => {
  const ws = workspaces([
    { dir: 'a', hasTypecheck: true },
    { dir: 'b', hasTypecheck: true },
  ]);
  assert.deepEqual(checkTypecheck(ws, ['a'], new Map([['b', 'needs codegen']])), []);
  const stale = checkTypecheck(ws, ['a', 'b'], new Map([['b', 'needs codegen']]));
  assert.equal(stale.length, 1);
  assert.match(stale[0], /now includes it/);
});

// ---------------------------------------------------------------------------
// (3) coverage ⇔ codecov.yml
// ---------------------------------------------------------------------------

/** Build the {generates, uploads} shape loadCoverageSteps returns. */
function coverage(generateDirs, uploads) {
  return {
    generates: generateDirs.map(dir => ({ dir, command: `npm test --prefix packages/${dir}` })),
    uploads: uploads.map(u => (typeof u === 'string' ? { dir: u, flag: u } : u)),
  };
}

/** Build the codecov flags map with the conventional paths for each flag. */
function flags(names) {
  return new Map(names.map(n => [n, { paths: [`packages/${n}/src/**`], carryforward: true }]));
}

test('coverage: passes when generate, upload and codecov.yml all agree', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b' }]);
  assert.deepEqual(checkCoverage(ws, coverage(['a', 'b'], ['a', 'b']), flags(['a', 'b'])), []);
});

test('coverage: flags an uploaded flag codecov.yml never declares (the language-server gap)', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b' }]);
  const failures = checkCoverage(ws, coverage(['a', 'b'], ['a', 'b']), flags(['a']));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /uploads flag "b", which codecov\.yml never declares/);
  assert.match(failures[0], /packages\/b\/src/);
});

test('coverage: flags a declared flag nothing uploads (the carryforward trap)', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const failures = checkCoverage(ws, coverage(['a'], ['a']), flags(['a', 'ghost']));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /declares flag "ghost", but the coverage job never uploads it/);
  assert.match(failures[0], /carryforward: true/);
});

test('coverage: flags a generate step with no upload', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b' }]);
  const failures = checkCoverage(ws, coverage(['a', 'b'], ['a']), flags(['a']));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /generates coverage for packages\/b but never uploads it/);
});

test('coverage: flags an upload step with no generate', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b' }]);
  const failures = checkCoverage(ws, coverage(['a'], ['a', 'b']), flags(['a', 'b']));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /uploads packages\/b\/coverage\/lcov\.info but never generates it/);
});

test('coverage: flags an upload whose flag does not name its package', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b' }]);
  const cov = coverage(['a', 'b'], ['a', { dir: 'b', flag: 'a' }]);
  const failures = checkCoverage(ws, cov, flags(['a', 'b']));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /under flag "a"/);
  assert.match(failures[0], /silently attributes one package's lines to another/);
});

test('coverage: flags an upload with no flags key at all', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const cov = coverage(['a'], [{ dir: 'a', flag: null }]);
  const failures = checkCoverage(ws, cov, new Map());
  assert.equal(failures.length, 1);
  assert.match(failures[0], /no `flags:` key/);
});

test('coverage: flags a package that does not exist', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const failures = checkCoverage(ws, coverage(['ghost'], []), new Map());
  assert.equal(failures.length, 1);
  assert.match(failures[0], /packages\/ghost does not exist/);
});

test('coverage: flags a codecov flag whose paths point elsewhere', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const wrong = new Map([['a', { paths: ['packages/b/src/**'], carryforward: true }]]);
  const failures = checkCoverage(ws, coverage(['a'], ['a']), wrong);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /disagree about what it covers/);
});

// ---------------------------------------------------------------------------
// (4) lint:domains
// ---------------------------------------------------------------------------

test('lint:domains: passes when every domain with a lint suite is in the loop', () => {
  const ws = workspaces([
    { dir: 'domain-sql', hasLintSuite: true },
    { dir: 'domain-bdd', hasLintSuite: true },
  ]);
  assert.deepEqual(checkLintDomains(ws, ['sql', 'bdd'], NONE), []);
});

test('lint:domains: flags a domain with a lint suite the loop skips', () => {
  const ws = workspaces([
    { dir: 'domain-sql', hasLintSuite: true },
    { dir: 'domain-new', name: '@x/domain-new', hasLintSuite: true },
  ]);
  const failures = checkLintDomains(ws, ['sql'], NONE);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /owns a lint\.test\.ts but is not in the root "lint:domains" loop/);
  assert.match(failures[0], /Add "new"/);
});

test('lint:domains: a domain package without a lint suite is not required', () => {
  const ws = workspaces([{ dir: 'domain-sql', hasLintSuite: true }, { dir: 'domain-toolkit' }]);
  assert.deepEqual(checkLintDomains(ws, ['sql'], NONE), []);
});

test('lint:domains: flags a listed suffix with no such package', () => {
  const ws = workspaces([{ dir: 'domain-sql', hasLintSuite: true }]);
  const failures = checkLintDomains(ws, ['sql', 'ghost'], NONE);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /the loop exits 1 on a healthy tree/);
});

test('lint:domains: flags a listed package with no lint suite', () => {
  const ws = workspaces([{ dir: 'domain-sql', hasLintSuite: true }, { dir: 'domain-toolkit' }]);
  const failures = checkLintDomains(ws, ['sql', 'toolkit'], NONE);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /has no lint\.test\.ts under src\//);
});

test('lint:domains: flags a duplicated suffix', () => {
  const ws = workspaces([{ dir: 'domain-sql', hasLintSuite: true }]);
  const failures = checkLintDomains(ws, ['sql', 'sql'], NONE);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /twice/);
});

test('lint:domains: an omission suppresses the skipped-domain failure', () => {
  const ws = workspaces([
    { dir: 'domain-sql', hasLintSuite: true },
    { dir: 'domain-new', hasLintSuite: true },
  ]);
  const omit = new Map([['domain-new', 'quarantined']]);
  assert.deepEqual(checkLintDomains(ws, ['sql'], omit), []);
});

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

test('joinContinuedLine: follows backslash continuations and stops after', () => {
  // Whitespace between joined fragments is not normalised (callers split on
  // /\s+/); what matters is which tokens survive and where it stops.
  const tokens = text => joinContinuedLine(text).trim().split(/\s+/);
  assert.deepEqual(tokens(' a \\\n  b \\\n  c\n  d'), ['a', 'b', 'c']);
  assert.deepEqual(tokens(' a b\n c d'), ['a', 'b']);
});

test('loadExportValidationArgs: reads a wrapped, multi-line argument list', () => {
  assert.deepEqual(loadExportValidationArgs(SAMPLE_CI), ['alpha', 'beta']);
});

test('loadExportValidationArgs: stops at the first flag', () => {
  const args = loadExportValidationArgs(SAMPLE_CI);
  assert.ok(!args.includes('--strict'), 'flags must not be read as packages');
  assert.ok(!args.some(a => a.includes('tee')), 'shell must not be read as packages');
});

test('loadExportValidationArgs: a removed invocation is a hard error', () => {
  const gutted = SAMPLE_CI.replace('node scripts/validate-exports.mjs', 'echo skipped');
  assert.throws(() => loadExportValidationArgs(gutted), /does not invoke/);
});

test('loadExportValidationArgs: an argument-less invocation is a hard error', () => {
  // With no filter validate-exports validates EVERY package, including ones
  // CI never builds — a green-looking gate that would fail for the wrong reason.
  const unfiltered = SAMPLE_CI.replace(
    /if ! node scripts\/validate-exports\.mjs \\\n.*\\\n.*\\\n.*then/s,
    'if ! node scripts/validate-exports.mjs --strict; then'
  );
  assert.throws(() => loadExportValidationArgs(unfiltered), /invoked with no package arguments/);
});

test('loadTypecheckDirs: reads the run-block lines', () => {
  assert.deepEqual(loadTypecheckDirs(SAMPLE_CI), ['alpha', 'beta']);
});

test('loadTypecheckDirs: `typecheck:scripts` is not a 3rd package', () => {
  // The separate core-scripts step shares the prefix; requiring whitespace
  // after `typecheck` is what keeps it out.
  const dirs = loadTypecheckDirs(SAMPLE_CI);
  assert.equal(dirs.filter(d => d === 'alpha').length, 1);
});

test('loadTypecheckDirs: an emptied step is a hard error, not a silent pass', () => {
  const emptied = SAMPLE_CI.replace(
    /^ +npm run typecheck --prefix packages\/\w+$/gm,
    '          true'
  );
  assert.throws(() => loadTypecheckDirs(emptied), /has no .*npm run typecheck --prefix/);
});

test('loadCiBuiltPackages: reads the build job, ignoring other jobs', () => {
  const built = loadCiBuiltPackages(SAMPLE_CI);
  assert.deepEqual([...built].sort(), ['alpha', 'beta']);
});

test('loadCoverageSteps: reads both generate spellings and pairs uploads to flags', () => {
  const { generates, uploads } = loadCoverageSteps(SAMPLE_CI);
  assert.deepEqual(
    generates.map(g => g.dir),
    ['alpha', 'beta']
  );
  assert.deepEqual(uploads, [
    { dir: 'alpha', flag: 'alpha' },
    { dir: 'beta', flag: 'beta' },
  ]);
});

test('loadCoverageSteps: does not read the unit-tests job', () => {
  // `npm test --prefix packages/alpha` there has no `coverage` in it, and the
  // job slice stops before it anyway; both belts are worth pinning.
  const { generates } = loadCoverageSteps(SAMPLE_CI);
  assert.equal(generates.length, 2);
});

test('loadCodecovFlags: parses flag names, paths and carryforward', () => {
  const parsed = loadCodecovFlags(SAMPLE_CODECOV);
  assert.deepEqual([...parsed.keys()], ['alpha', 'beta']);
  assert.deepEqual(parsed.get('alpha').paths, ['packages/alpha/src/**']);
  assert.equal(parsed.get('beta').carryforward, true);
});

test('loadCodecovFlags: the block stops at the next top-level key', () => {
  const parsed = loadCodecovFlags(SAMPLE_CODECOV);
  assert.ok(!parsed.has('layout'), 'the comment: block must not leak in');
});

test('loadCodecovFlags: a missing flags block is a hard error', () => {
  assert.throws(() => loadCodecovFlags('codecov:\n  require_ci_to_pass: yes\n'), /no top-level/);
});

test('loadLintDomains: reads the shell loop suffixes', () => {
  assert.deepEqual(loadLintDomains(SAMPLE_ROOT_PKG), ['sql', 'bdd']);
});

test('loadLintDomains: a reshaped script is a hard error, not an empty list', () => {
  const reshaped = JSON.stringify({ scripts: { 'lint:domains': 'npm run lint --workspaces' } });
  assert.throws(() => loadLintDomains(reshaped), /cannot parse "lint:domains"/);
});

test('loadLintDomains: a removed script is a hard error', () => {
  assert.throws(() => loadLintDomains(JSON.stringify({ scripts: {} })), /no "lint:domains" script/);
});

// ---------------------------------------------------------------------------
// Integration — the real repository
// ---------------------------------------------------------------------------

test('integration: real repository state passes all four checks', () => {
  const byList = check(loadAll());
  for (const [listName, failures] of byList) {
    assert.deepEqual(failures, [], `${listName} reported failures`);
  }
});

test('integration: the loaders return non-trivial real lists', () => {
  const input = loadAll();
  assert.ok(input.byDir.size > 20, `expected >20 packages, got ${input.byDir.size}`);
  assert.ok(input.builtInCi.size > 20, `expected >20 built packages, got ${input.builtInCi.size}`);
  assert.ok(
    input.exportArgs.length > 20,
    `expected >20 export args, got ${input.exportArgs.length}`
  );
  assert.ok(
    input.typecheckDirs.length > 20,
    `expected >20 typechecks, got ${input.typecheckDirs.length}`
  );
  assert.ok(
    input.codecovFlags.size >= 4,
    `expected >=4 codecov flags, got ${input.codecovFlags.size}`
  );
  assert.equal(input.lintDomains.length, 9, 'the nine-domain loop');
  assert.ok(input.coverage.generates.length >= 4);
  assert.ok(input.coverage.uploads.length >= 4);
});

test('integration: no real list names a package twice or a phantom package', () => {
  const input = loadAll();
  for (const [label, dirs] of [
    ['export-validation', input.exportArgs],
    ['typecheck', input.typecheckDirs],
    ['coverage-generate', input.coverage.generates.map(g => g.dir)],
  ]) {
    assert.equal(new Set(dirs).size, dirs.length, `${label} names a package twice`);
    for (const dir of dirs) {
      assert.ok(input.byDir.has(dir), `${label} names packages/${dir}, which does not exist`);
    }
  }
});

test('integration: loadWorkspaces sees the domain lint suites on disk', () => {
  // hasLintSuite is the one fact derived from the filesystem rather than
  // package.json; a broken walk would silently make class (4) vacuous.
  const byDir = loadWorkspaces();
  const withSuites = [...byDir].filter(([, pkg]) => pkg.hasLintSuite).map(([dir]) => dir);
  assert.equal(withSuites.length, 9, `expected 9 domain lint suites, got ${withSuites.join(', ')}`);
});
