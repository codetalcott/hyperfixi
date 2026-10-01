#!/usr/bin/env node
// Runs upstream _hyperscript's own Playwright suite against an engine bundle and prints
// per-file pass counts.
//
//   node experiments/small-engine/upstream-suite/run.mjs --bundle <file.js> [options]
//
//   --bundle <path>   IIFE bundle that defines `window._hyperscript` (callable, with
//                     `.processNode`). Required.
//   --set <name>      `spike` (the spike's 14 files), `all` (default: commands, core,
//                     expressions, features).
//   --files a,b       Explicit list relative to upstream's test dir, e.g. `commands/add.js`.
//   --fails           Also print the title of every failing test.
//   --json <path>     Write the per-file summary as JSON.
//
// Upstream's tests are read from HYPERSCRIPT_TEST_ROOT (default: a `_hyperscript` checkout
// beside this repo) and copied into a gitignored work dir; nothing upstream is modified.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const testRoot =
  process.env.HYPERSCRIPT_TEST_ROOT || resolve(repoRoot, '../_hyperscript/test');

const SPIKE_FILES = [
  'features/on.js',
  ...['add', 'remove', 'toggle', 'set', 'put', 'if', 'increment', 'send', 'trigger', 'wait', 'log', 'call', 'halt'].map(
    c => `commands/${c}.js`
  ),
];
const ALL_DIRS = ['commands', 'core', 'expressions', 'features'];

const args = process.argv.slice(2);
const opt = name => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const bundle = opt('bundle');
if (!bundle || !existsSync(bundle)) {
  console.error('run.mjs: --bundle <file.js> is required and must exist');
  process.exit(2);
}
if (!existsSync(testRoot)) {
  console.error(`run.mjs: upstream tests not found at ${testRoot} (set HYPERSCRIPT_TEST_ROOT)`);
  process.exit(2);
}

const files = opt('files')
  ? opt('files').split(',')
  : (opt('set') || 'all') === 'spike'
    ? SPIKE_FILES
    : null;

const work = join(here, '.work');
rmSync(work, { recursive: true, force: true });
mkdirSync(join(work, 'test'), { recursive: true });
writeFileSync(join(work, 'package.json'), '{"type":"module","private":true}\n');
if (files) {
  for (const f of files) {
    mkdirSync(dirname(join(work, 'test', f)), { recursive: true });
    cpSync(join(testRoot, f), join(work, 'test', f));
  }
} else {
  for (const d of ALL_DIRS) cpSync(join(testRoot, d), join(work, 'test', d), { recursive: true });
}
cpSync(join(here, 'fixtures.js'), join(work, 'test', 'fixtures.js'));

const report = join(work, 'report.json');
const run = spawnSync('npx', ['playwright', 'test', '--config', join(here, 'playwright.config.js')], {
  cwd: here,
  env: { ...process.env, HS_BUNDLE: resolve(bundle), HS_REPORT: report },
  encoding: 'utf8',
});
if (!existsSync(report)) {
  console.error(run.stdout, run.stderr);
  console.error('run.mjs: Playwright produced no report');
  process.exit(2);
}

const json = JSON.parse(readFileSync(report, 'utf8'));
const perFile = {};
const fails = [];
(function walk(suite) {
  for (const spec of suite.specs || []) {
    const result = spec.tests[0]?.results?.at(-1);
    const status = result?.status;
    const row = (perFile[spec.file] ??= { passed: 0, failed: 0, skipped: 0 });
    if (status === 'passed') row.passed++;
    else if (!status || status === 'skipped') row.skipped++;
    else {
      row.failed++;
      const message = (result.error?.message || '').replace(/\x1b\[[0-9;]*m/g, '').split('\n')[0];
      fails.push(`${spec.file} › ${spec.title}  [${message.slice(0, 110)}]`);
    }
  }
  for (const child of suite.suites || []) walk(child);
})({ suites: json.suites });

let passed = 0;
let failed = 0;
for (const [file, row] of Object.entries(perFile).sort()) {
  passed += row.passed;
  failed += row.failed;
  console.log(`${file.padEnd(40)} ${String(row.passed).padStart(4)} / ${row.passed + row.failed}`);
}
const rate = ((100 * passed) / (passed + failed || 1)).toFixed(1);
console.log(`${'TOTAL'.padEnd(40)} ${String(passed).padStart(4)} / ${passed + failed}  (${rate}%)  ${Math.round(json.stats.duration / 1000)}s`);
if (args.includes('--fails')) console.log('\n' + fails.join('\n'));
if (opt('json')) writeFileSync(opt('json'), JSON.stringify({ passed, failed, perFile }, null, 2) + '\n');
process.exit(0);
