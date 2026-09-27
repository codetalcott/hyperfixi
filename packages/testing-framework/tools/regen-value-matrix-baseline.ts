#!/usr/bin/env npx tsx
/**
 * Regenerate baselines/value-matrix.json from the current tree, and print the
 * burn-down.
 *
 * The baseline lists every failing (cell, lane) pair of the value matrix (see
 * src/multilingual/value-matrix.ts). It only shrinks: this prunes the pairs
 * that pass now and REFUSES to write when a pair newly fails, unless
 * `--allow-new` is given — say why in the PR. Families are derived from the
 * failing lanes (familyOf), so nothing here is hand-labelled.
 *
 * Usage: npx tsx tools/regen-value-matrix-baseline.ts [options]
 *   --positions put,set   rerun only these positions; other entries are kept
 *   --allow-new           write even when pairs newly fail
 *   --report              print the burn-down only; write nothing
 *   --dry-run             print what would change; write nothing
 *
 * A full run takes about two minutes. Needs fresh dists of core, semantic and
 * hyperscript-adapter (`npm run check:fresh`).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LANES,
  POSITIONS,
  baselineFrom,
  diffBaseline,
  expandLanes,
  failingLanes,
  generateCells,
  orphanedEntries,
  runValueMatrix,
  type CellResult,
  type MatrixCell,
  type Position,
  type ValueMatrixBaseline,
} from '../src/multilingual/value-matrix';

const target = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../baselines/value-matrix.json'
);

const DESCRIPTION =
  'Value matrix (src/multilingual/value-matrix.ts): every failing (cell, lane) pair, per cell. ' +
  'A cell is `<position>|<expression>`; a lane is `en` (hyperfixi English), `en-rt` (semantic ' +
  'English round trip, on upstream), `<lang>` (hyperfixi direct path) or `<lang>/up` (the ' +
  'adapter, on upstream); `*direct` and `*up` stand for all 23 of each. Shrink-only: regenerate ' +
  'with tools/regen-value-matrix-baseline.ts.';

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Count failing pairs by a key, largest first. */
function table(
  title: string,
  results: readonly CellResult[],
  keyOf: (result: CellResult, lane: string) => string | undefined
): void {
  const pairs = new Map<string, number>();
  const cells = new Map<string, Set<string>>();
  for (const r of results) {
    for (const lane of failingLanes(r)) {
      const key = keyOf(r, lane);
      if (key === undefined) continue;
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
      if (!cells.has(key)) cells.set(key, new Set());
      cells.get(key)?.add(r.id);
    }
  }
  console.log(`\n${title}`);
  for (const [key, n] of [...pairs].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(6)} pairs  ${String(cells.get(key)?.size ?? 0).padStart(4)} cells  ${key}`);
  }
}

function report(results: readonly CellResult[], cells: readonly MatrixCell[]): void {
  const byId = new Map(cells.map(c => [c.id, c]));
  const doc = baselineFrom(results, DESCRIPTION);
  console.log(
    `\nvalue matrix: ${doc.cells} cells, ${doc.pairs} pairs, ${doc.failing} failing ` +
      `(${((100 * doc.failing) / Math.max(doc.pairs, 1)).toFixed(1)}%), ${Object.keys(doc.entries).length} cells with a failure`
  );
  table('by family (where the loss sits):', results, r => doc.entries[r.id]?.family);
  table('by position:', results, r => byId.get(r.id)?.position);
  table('by operand kind (cells that test one):', results, r => byId.get(r.id)?.operand);
  table('by operator (cells that test one):', results, r => byId.get(r.id)?.operator);
  table('by lane:', results, (_r, lane) => lane);
}

async function main(): Promise<void> {
  const positions = (argValue('--positions')?.split(',') ?? POSITIONS) as Position[];
  const unknown = positions.filter(p => !POSITIONS.includes(p));
  if (unknown.length) throw new Error(`unknown position(s): ${unknown.join(', ')}`);

  const allCells = generateCells();
  const cells = allCells.filter(c => positions.includes(c.position));
  console.log(`running ${cells.length} cells (${positions.join(', ')}) …`);
  const results = await runValueMatrix(cells);

  const invalid = results.filter(r => r.invalid);
  if (invalid.length) {
    for (const r of invalid) console.error(`no oracle: ${r.id}: ${r.invalid}`);
    throw new Error(`${invalid.length} cell(s) have no oracle — fix the generator`);
  }

  report(results, cells);
  if (process.argv.includes('--report')) return;

  const previous: ValueMatrixBaseline | null = existsSync(target)
    ? (JSON.parse(readFileSync(target, 'utf8')) as ValueMatrixBaseline)
    : null;
  const fresh = baselineFrom(results, DESCRIPTION);

  // Keep the entries of positions this run did not cover.
  const kept = Object.entries(previous?.entries ?? {}).filter(
    ([id]) => !positions.includes(id.split('|')[0] as Position)
  );
  // Generator order; an entry for a cell the generator dropped sorts last.
  const index = new Map(allCells.map((c, i) => [c.id, i]));
  const at = (id: string): number => index.get(id) ?? Number.MAX_SAFE_INTEGER;
  const entries = Object.fromEntries(
    [...kept, ...Object.entries(fresh.entries)].sort(([a], [b]) => at(a) - at(b))
  );
  const failing = Object.values(entries).reduce((n, e) => n + expandLanes(e.lanes).length, 0);

  const diff = previous ? diffBaseline(results, previous) : { added: [], fixed: [] };
  const orphans = previous
    ? orphanedEntries(
        {
          entries: Object.fromEntries(
            Object.entries(previous.entries).filter(([id]) =>
              positions.includes(id.split('|')[0] as Position)
            )
          ),
        },
        cells
      )
    : [];
  console.log(
    `\nvs the baseline: ${diff.fixed.length} pair(s) fixed, ${diff.added.length} new, ${orphans.length} cell(s) gone`
  );
  for (const a of diff.added.slice(0, 60)) {
    console.log(`  NEW ${a.id} [${a.lane}] want ${JSON.stringify(a.want)}, got ${JSON.stringify(a.got)}`);
  }
  if (diff.added.length > 60) console.log(`  … and ${diff.added.length - 60} more`);

  if (diff.added.length && previous && !process.argv.includes('--allow-new')) {
    console.error('\nrefusing to write: pairs newly fail. Fix them, or pass --allow-new and say why.');
    process.exitCode = 1;
    return;
  }
  if (process.argv.includes('--dry-run')) return;

  // Every cell runs every lane.
  const doc: ValueMatrixBaseline = {
    description: DESCRIPTION,
    cells: allCells.length,
    pairs: allCells.length * LANES.length,
    failing,
    entries,
  };
  writeFileSync(target, JSON.stringify(doc, null, 2) + '\n');
  console.log(`wrote ${path.relative(process.cwd(), target)}: ${Object.keys(entries).length} cells, ${failing} failing pairs`);
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  e => {
    console.error(e);
    process.exit(1);
  }
);
