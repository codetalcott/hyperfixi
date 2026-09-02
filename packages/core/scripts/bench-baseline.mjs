#!/usr/bin/env node
/**
 * Hot-path benchmark baseline — Arc 4b step 0 of
 * `docs-internal/ENGINE_MIGRATION_PLAN.md` (brief: `HANDOFF-engine-arc4b.md`).
 *
 * Arc 0 measured that the warm path pays no parse cost and that `parseInput`
 * size does not predict execution cost, so Arc 4b's justification is what it
 * DELETES, and the benchmark's job is to prove closures did not make execution
 * SLOWER. A guard needs a committed number to compare against; until this
 * script the numbers lived in a header comment and `bench:ci` (nightly,
 * `continue-on-error`) compared nothing.
 *
 * Runs `bench/hot-path.bench.ts` (vitest bench, JSON output), then compares
 * every row's throughput (`hz`) against `scripts/bench-snapshots/hot-path-baseline.json`.
 * The check is ONE-SIDED: a row slower than baseline by more than the tolerance
 * fails; a faster row is reported, never failed (a faster run is not a
 * regression, and the noise floor is ±2–4 % rme per row).
 *
 * The tolerance is wide (15 %) on purpose: it is set to catch a structural
 * slowdown (a per-execution copy, an extra async hop per command), not run-to-
 * run jitter on one machine. The baseline is measured on the owner's machine;
 * whether this runs on PRs in CI is the brief's decision 5 and is NOT wired
 * here — it is a local gate, run before pushing an Arc 4b PR, exactly like
 * `snapshot:bundle-size`.
 *
 * Usage:
 *   node scripts/bench-baseline.mjs                # check against baseline
 *   node scripts/bench-baseline.mjs --check        # same (explicit)
 *   node scripts/bench-baseline.mjs --update       # overwrite the baseline with this run
 *   node scripts/bench-baseline.mjs --skip-bench   # don't re-run; read benchmark-results/hot-path.json
 *
 * Exit codes: 0 = within tolerance, 1 = regression, 2 = missing file / config error.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, '..');
const baselinePath = resolve(__dirname, 'bench-snapshots/hot-path-baseline.json');
const resultsPath = resolve(pkgDir, 'benchmark-results/hot-path.json');
const benchFile = 'bench/hot-path.bench.ts';

const args = process.argv.slice(2);
const mode = args.includes('--update') ? 'update' : 'check';
const skipBench = args.includes('--skip-bench');

function runBench() {
  mkdirSync(dirname(resultsPath), { recursive: true });
  execSync(`npx vitest bench ${benchFile} --run --outputJson=${resultsPath}`, {
    cwd: pkgDir,
    stdio: 'pipe',
  });
}

/** Flatten vitest's JSON into `{ "<group> > <name>": { hz, rme } }`. */
function readRows() {
  if (!existsSync(resultsPath)) {
    console.error(`results missing: ${resultsPath}`);
    process.exit(2);
  }
  const json = JSON.parse(readFileSync(resultsPath, 'utf8'));
  const rows = {};
  for (const file of json.files ?? []) {
    for (const group of file.groups ?? []) {
      const groupName = String(group.fullName ?? '').replace(/^.*?> /, '');
      for (const b of group.benchmarks ?? []) {
        rows[`${groupName} > ${b.name}`] = {
          hz: Math.round(b.hz),
          rme: Math.round(b.rme * 100) / 100,
        };
      }
    }
  }
  if (Object.keys(rows).length === 0) {
    console.error(`no benchmark rows found in ${resultsPath}`);
    process.exit(2);
  }
  return rows;
}

if (!skipBench) runBench();
const rows = readRows();

if (mode === 'update') {
  const commit = execSync('git rev-parse --short HEAD', { cwd: pkgDir }).toString().trim();
  const baseline = {
    _comment:
      'Hot-path throughput (hz, higher is faster) from bench/hot-path.bench.ts. Regenerate with `npm run bench:check:update` and say why in the PR. One-sided: a row slower by more than tolerance_percent fails `npm run bench:check`.',
    measured: new Date().toISOString().slice(0, 10),
    commit,
    tolerance_percent: 15,
    rows,
  };
  mkdirSync(dirname(baselinePath), { recursive: true });
  writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`baseline written: ${Object.keys(rows).length} rows @ ${commit}`);
  process.exit(0);
}

if (!existsSync(baselinePath)) {
  console.error(`baseline missing: ${baselinePath} — run with --update once`);
  process.exit(2);
}
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const tolerance = baseline.tolerance_percent ?? 15;
console.log(
  `Hot-path bench — baseline ${baseline.measured} @ ${baseline.commit}, tolerance −${tolerance}%`
);

let regressions = 0;
for (const [name, base] of Object.entries(baseline.rows)) {
  const cur = rows[name];
  if (!cur) {
    console.error(`  MISSING  ${name} — row is in the baseline but not in this run`);
    regressions++;
    continue;
  }
  const delta = ((cur.hz - base.hz) / base.hz) * 100;
  const tag = delta < -tolerance ? 'SLOWER' : delta > tolerance ? 'faster' : 'ok';
  const line = `  ${tag.padEnd(7)} ${name}: ${cur.hz.toLocaleString()} hz vs ${base.hz.toLocaleString()} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%, rme ±${cur.rme}%)`;
  if (tag === 'SLOWER') {
    regressions++;
    console.error(line);
  } else {
    console.log(line);
  }
}
for (const name of Object.keys(rows)) {
  if (!(name in baseline.rows))
    console.log(`  new      ${name}: ${rows[name].hz.toLocaleString()} hz (not in baseline)`);
}

if (regressions > 0) {
  console.error(
    `\n${regressions} row(s) outside tolerance. If the slowdown is intended, run \`npm run bench:check:update\` and say why in the PR.`
  );
  process.exit(1);
}
console.log('\nwithin tolerance');
process.exit(0);
