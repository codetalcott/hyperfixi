#!/usr/bin/env npx tsx
/**
 * Regenerate baselines/command-shapes.json from the current tree, and print the
 * burn-down.
 *
 * The baseline lists, per case of the command-shape gate (see
 * src/multilingual/command-shapes.ts), the lanes whose translation is refused
 * and the lanes whose translation is silently lossy. Both lists only shrink:
 * this writes the improvements and REFUSES to write when a pair got worse
 * (pass → refused or silent, refused → silent), unless `--allow-new` is given —
 * say why in the PR.
 *
 * Usage: npx tsx tools/regen-command-shapes-baseline.ts [options]
 *   --allow-new        write even when pairs got worse
 *   --report           print the burn-down only; write nothing
 *   --dry-run          print what would change; write nothing
 *   --results <file>   also write every lane's raw result there, for triage
 *
 * About a minute. Needs fresh dists of semantic and engine (`npm run check:fresh`).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  BASELINE_PATH,
  LANES,
  LOUD,
  baselineFrom,
  collapse,
  diffBaseline,
  loadCommandShapeCases,
  orphanedEntries,
  runCommandShapes,
  vendoredUpstreamVersion,
  type CaseResult,
  type CommandShapeCase,
  type CommandShapesBaseline,
} from '../src/multilingual/command-shapes';

const DESCRIPTION =
  'Command-shape gate (src/multilingual/command-shapes.ts): per case, the lanes whose ' +
  'translation is refused (`refused`) and the lanes whose translation is silently lossy ' +
  '(`silent`). A lane is `en` (translate en → en) or a language (en → L → en); `*` stands for ' +
  'all 23 languages. A case in a LOUD family carries its reason (`loud`). Shrink-only: ' +
  'regenerate with tools/regen-command-shapes-baseline.ts.';

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Count non-passing pairs by a key, largest first, with the cases behind them. */
function table(
  title: string,
  results: readonly CaseResult[],
  keysOf: (result: CaseResult, lane: string) => readonly string[]
): void {
  const rows = new Map<string, { refused: number; silent: number; cases: Set<string> }>();
  for (const r of results) {
    for (const [lane, got] of Object.entries(r.lanes)) {
      if (got.outcome === 'pass') continue;
      for (const key of keysOf(r, lane)) {
        const row = rows.get(key) ?? { refused: 0, silent: 0, cases: new Set<string>() };
        row[got.outcome]++;
        row.cases.add(r.id);
        rows.set(key, row);
      }
    }
  }
  console.log(`\n${title}`);
  console.log('    silent  refused  cases');
  for (const [key, row] of [...rows].sort(
    (a, b) => b[1].silent + b[1].refused - (a[1].silent + a[1].refused)
  )) {
    console.log(
      `  ${String(row.silent).padStart(8)} ${String(row.refused).padStart(8)} ${String(row.cases.size).padStart(6)}  ${key}`
    );
  }
}

/** Per node type: the cases holding it, and the share whose `en` lane passes. */
function statementTable(results: readonly CaseResult[]): void {
  const rows = new Map<string, { n: number; en: number; all: number }>();
  for (const r of results) {
    const en = r.lanes.en?.outcome === 'pass';
    const all = Object.values(r.lanes).every(l => l.outcome === 'pass');
    for (const type of r.statements) {
      const row = rows.get(type) ?? { n: 0, en: 0, all: 0 };
      row.n++;
      if (en) row.en++;
      if (all) row.all++;
      rows.set(type, row);
    }
  }
  console.log(
    '\nby command or feature in the source (n cases; share passing `en`; share passing every lane):'
  );
  for (const [type, row] of [...rows].sort((a, b) => a[0].localeCompare(b[0]))) {
    const pct = (k: number): string => `${Math.round((100 * k) / row.n)}%`.padStart(5);
    console.log(
      `  ${type.padEnd(26)} n=${String(row.n).padStart(4)}  en ${pct(row.en)}  all ${pct(row.all)}`
    );
  }
}

function report(
  results: readonly CaseResult[],
  cases: readonly CommandShapeCase[],
  doc: CommandShapesBaseline
): void {
  const byId = new Map(cases.map(c => [c.id, c]));
  const en = results.reduce<Record<string, number>>((m, r) => {
    const lane = r.lanes.en;
    const key = lane ? (lane.kind ? `${lane.outcome}:${lane.kind}` : lane.outcome) : 'missing';
    m[key] = (m[key] ?? 0) + 1;
    return m;
  }, {});
  console.log(
    `\ncommand shapes: ${doc.cases} cases, ${doc.pairs} pairs: ${doc.pass} pass, ` +
      `${doc.refused} refused, ${doc.silent} silent; ${Object.keys(doc.entries).length} cases with a failure`
  );
  console.log(`  en lane: ${JSON.stringify(en)}`);
  table('by family (the origin file or documented keyword):', results, r => [
    byId.get(r.id)?.family ?? '?',
  ]);
  table('by LOUD family:', results, r => (r.loud ? [r.loud] : []));
  table('by lane:', results, (_r, lane) => [lane]);
  table('by kind of silent lane:', results, (r, lane) => {
    const got = r.lanes[lane];
    return got?.outcome === 'silent' ? [got.kind ?? '?'] : ['refused'];
  });
  statementTable(results);
}

async function main(): Promise<void> {
  const { cases, upstream } = loadCommandShapeCases();
  const vendored = vendoredUpstreamVersion();
  if (upstream !== vendored) {
    throw new Error(
      `cases were harvested from upstream ${upstream}; the suite vendors ${vendored}: ` +
        're-run tools/harvest-command-shapes.ts first'
    );
  }
  console.log(`running ${cases.length} cases × ${LANES.length} lanes …`);
  const results = await runCommandShapes(cases);

  const resultsFile = argValue('--results');
  if (resultsFile) {
    const byId = new Map(cases.map(c => [c.id, c]));
    writeFileSync(
      resultsFile,
      JSON.stringify(results.map(r => ({ ...r, source: byId.get(r.id)?.source })))
    );
  }

  const fresh = baselineFrom(results, cases, DESCRIPTION, upstream);
  report(results, cases, fresh);
  if (process.argv.includes('--report')) return;

  const previous: CommandShapesBaseline | null = existsSync(BASELINE_PATH)
    ? (JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as CommandShapesBaseline)
    : null;
  const diff = previous ? diffBaseline(results, previous) : { worse: [], better: [] };
  const orphans = previous ? orphanedEntries(previous, cases) : [];
  console.log(
    `\nvs the baseline: ${diff.better.length} pair(s) better, ${diff.worse.length} worse, ` +
      `${orphans.length} case(s) gone`
  );
  const byId = new Map(cases.map(c => [c.id, c]));
  for (const w of diff.worse.slice(0, 60)) {
    console.log(
      `  WORSE ${w.id} [${w.lane}] ${w.listed} → ${w.got}: ${collapse(byId.get(w.id)?.source ?? '').slice(0, 80)}` +
        (w.detail ? `\n        got ${JSON.stringify(collapse(w.detail).slice(0, 100))}` : '')
    );
  }
  if (diff.worse.length > 60) console.log(`  … and ${diff.worse.length - 60} more`);

  if (diff.worse.length && previous && !process.argv.includes('--allow-new')) {
    console.error(
      '\nrefusing to write: pairs got worse. Fix them, or pass --allow-new and say why.'
    );
    process.exitCode = 1;
    return;
  }
  if (process.argv.includes('--dry-run')) return;
  writeFileSync(BASELINE_PATH, JSON.stringify(fresh, null, 2) + '\n');
  console.log(
    `wrote ${path.relative(process.cwd(), BASELINE_PATH)}: ${Object.keys(fresh.entries).length} cases, ` +
      `${fresh.refused} refused and ${fresh.silent} silent pairs (LOUD families: ${LOUD.map(f => f.name).join(', ')})`
  );
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  e => {
    console.error(e);
    process.exit(1);
  }
);
