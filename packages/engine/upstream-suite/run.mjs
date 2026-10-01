#!/usr/bin/env node
// Runs upstream _hyperscript's own Playwright suite against an engine bundle.
//
//   node upstream-suite/run.mjs --bundle <file.js> [options]
//
//   --bundle <path>   IIFE bundle that defines `window._hyperscript` (callable, with
//                     `.processNode`). Required. Any engine can be measured this way.
//   --files a,b       Only these files, relative to upstream's test dir (`commands/add.js`).
//   --fails           Print the title of every failing test.
//   --json <path>     Write the per-file summary as JSON.
//   --check           The gate: compare the failing tests with `known-failures.json`. Exits 1
//                     on a test that fails and is not listed, AND on a listed test that passes
//                     (prune it, so the list stays what does not pass). Whole suite only.
//   --update          Rewrite `known-failures.json` from this run.
//
// The oracle is PINNED: the tests are the vendored copy of upstream's, at the release named in
// VENDORED (see vendor/README.md). To try another upstream version, set HYPERSCRIPT_REPO (a
// clone) and HYPERSCRIPT_REF (a tag or commit): the tests are then read with `git archive`.
// HYPERSCRIPT_TEST_ROOT reads a test directory from disk. The tests are copied into a
// gitignored work dir either way; nothing is modified in place.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const VENDORED = '0.9.93';
const DIRS = ['commands', 'core', 'expressions', 'features', 'templates'];
const KNOWN = join(here, 'known-failures.json');

const args = process.argv.slice(2);
const opt = name => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const flag = name => args.includes(`--${name}`);
const fail = message => {
  console.error(`run.mjs: ${message}`);
  process.exit(2);
};

const bundle = opt('bundle');
if (!bundle || !existsSync(bundle)) fail('--bundle <file.js> is required and must exist');
const files = opt('files')?.split(',');
if (files && (flag('check') || flag('update'))) fail('--check and --update need the whole suite');

const work = join(here, '.work');
rmSync(work, { recursive: true, force: true });
mkdirSync(join(work, 'test'), { recursive: true });
writeFileSync(join(work, 'package.json'), '{"type":"module","private":true}\n');

let testRoot = process.env.HYPERSCRIPT_TEST_ROOT;
let origin = testRoot;
if (!testRoot && process.env.HYPERSCRIPT_REF) {
  const repo = process.env.HYPERSCRIPT_REPO || resolve(here, '../../../../_hyperscript');
  const ref = process.env.HYPERSCRIPT_REF;
  mkdirSync(join(work, 'upstream'));
  const archive = spawnSync('git', ['-C', repo, 'archive', ref, 'test'], { maxBuffer: 1 << 28 });
  const untar =
    archive.status === 0 &&
    spawnSync('tar', ['-x', '-C', join(work, 'upstream')], { input: archive.stdout });
  if (!untar || untar.status !== 0) {
    console.error(String(archive.stderr || (untar && untar.stderr) || ''));
    fail(`could not read test/ at ${ref} from ${repo}`);
  }
  testRoot = join(work, 'upstream', 'test');
  origin = `${ref} (${repo})`;
} else if (!testRoot) {
  testRoot = join(here, 'vendor', VENDORED, 'test');
  origin = `${VENDORED} (vendored)`;
}
if (!existsSync(testRoot)) fail(`upstream tests not found at ${testRoot}`);
console.log(`upstream tests: ${origin}`);

if (files) {
  for (const f of files) {
    mkdirSync(dirname(join(work, 'test', f)), { recursive: true });
    cpSync(join(testRoot, f), join(work, 'test', f));
  }
} else {
  for (const d of DIRS) cpSync(join(testRoot, d), join(work, 'test', d), { recursive: true });
}
cpSync(join(here, 'fixtures.js'), join(work, 'test', 'fixtures.js'));
// A few tests load the engine themselves, from where upstream's build puts it.
mkdirSync(join(work, 'test', '.bundle'));
cpSync(resolve(bundle), join(work, 'test', '.bundle', '_hyperscript.js'));
// `templates/templates.js` imports upstream's source and never uses it.
mkdirSync(join(work, 'src'));
writeFileSync(join(work, 'src', '_hyperscript.js'), 'export default {};\n');

const report = join(work, 'report.json');
const run = spawnSync(
  'npx',
  ['playwright', 'test', '--config', join(here, 'playwright.config.js')],
  {
    cwd: here,
    env: { ...process.env, HS_BUNDLE: resolve(bundle), HS_REPORT: report },
    encoding: 'utf8',
    // A failing engine can print megabytes; the default 1 MB limit would kill the run.
    maxBuffer: 1 << 28,
  }
);
if (!existsSync(report)) {
  console.error(run.stdout, run.stderr);
  fail('Playwright produced no report');
}

const json = JSON.parse(readFileSync(report, 'utf8'));
const perFile = {};
const failing = [];
const messages = new Map();
(function walk(suite, titles) {
  for (const spec of suite.specs || []) {
    const result = spec.tests[0]?.results?.at(-1);
    const status = result?.status;
    const row = (perFile[spec.file] ??= { passed: 0, failed: 0, skipped: 0 });
    if (status === 'passed') row.passed++;
    else if (!status || status === 'skipped') row.skipped++;
    else {
      row.failed++;
      const id = [spec.file, ...titles, spec.title].join(' › ');
      failing.push(id);
      messages.set(
        id,
        (result.error?.message || '')
          .replace(/\x1b\[[0-9;]*m/g, '')
          .split('\n')[0]
          .slice(0, 110)
      );
    }
  }
  // A suite that is a file carries the file's name as its title; only `describe` titles count.
  for (const child of suite.suites || []) {
    walk(child, child.file === child.title ? titles : [...titles, child.title]);
  }
})({ suites: json.suites }, []);
failing.sort();

let passed = 0;
let failed = 0;
for (const [file, row] of Object.entries(perFile).sort()) {
  passed += row.passed;
  failed += row.failed;
  console.log(`${file.padEnd(40)} ${String(row.passed).padStart(4)} / ${row.passed + row.failed}`);
}
const rate = ((100 * passed) / (passed + failed || 1)).toFixed(1);
console.log(
  `${'TOTAL'.padEnd(40)} ${String(passed).padStart(4)} / ${passed + failed}  (${rate}%)  ${Math.round(json.stats.duration / 1000)}s`
);
if (flag('fails')) console.log('\n' + failing.map(id => `${id}  [${messages.get(id)}]`).join('\n'));
if (opt('json'))
  writeFileSync(opt('json'), JSON.stringify({ passed, failed, perFile }, null, 2) + '\n');

if (flag('update')) {
  const known = { upstream: VENDORED, passed, total: passed + failed, failing };
  writeFileSync(KNOWN, JSON.stringify(known, null, 2) + '\n');
  console.log(`\nwrote ${failing.length} known failures to known-failures.json`);
}
if (flag('check')) {
  const known = new Set(JSON.parse(readFileSync(KNOWN, 'utf8')).failing);
  const now = new Set(failing);
  const regressed = failing.filter(id => !known.has(id));
  const fixed = [...known].filter(id => !now.has(id));
  for (const id of regressed)
    console.error(`\nNEW FAILURE  ${id}\n             ${messages.get(id)}`);
  for (const id of fixed) console.error(`\nNOW PASSES   ${id}`);
  if (fixed.length) {
    console.error(
      '\nA listed test passes: prune it (`npm run test:upstream:update`) in this change.'
    );
  }
  if (regressed.length || fixed.length) process.exit(1);
  console.log(`\nmatches known-failures.json (${known.size} known failures)`);
}
process.exit(0);
