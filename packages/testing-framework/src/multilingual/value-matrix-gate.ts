/**
 * The value matrix gate (see value-matrix.ts), one position per test file —
 * `value-matrix.<position>.test.ts`, and the operator phrases in
 * `value-matrix.phrases.test.ts` — so vitest runs the shards in parallel. Each shard judges only its own cells against the shared baseline.
 *
 * Assertions:
 *   1. every cell has an oracle: upstream runs its English source (the
 *      generator only produces upstream-valid cells);
 *   2. no failing (cell, lane) pair is missing from the baseline;
 *   3. no listed pair passes now — prune it, so the list only shrinks;
 *   4. no listed cell is gone from the generator.
 *
 * After an intentional change: `npx tsx tools/regen-value-matrix-baseline.ts`
 * (shrink-only; `--allow-new` to accept new failures, with a reason in the PR).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll } from 'vitest';
import {
  diffBaseline,
  failingLanes,
  generateCells,
  isPhraseCell,
  orphanedEntries,
  runValueMatrix,
  type CellResult,
  type Position,
  type ValueMatrixBaseline,
} from './value-matrix';

export const BASELINE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../baselines/value-matrix.json'
);

export function loadBaseline(): ValueMatrixBaseline {
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as ValueMatrixBaseline;
}

/** At most `max` lines, then a count: a broad regression must not print thousands. */
function capped(lines: string[], max = 40): string[] {
  return lines.length <= max ? lines : [...lines.slice(0, max), `… and ${lines.length - max} more`];
}

/**
 * One shard: a position's cells, without the operator phrases, or (`'phrases'`)
 * every phrase cell, whatever its position.
 */
export function describeValueMatrixShard(shard: Position | 'phrases'): void {
  const all = generateCells();
  const cells =
    shard === 'phrases'
      ? all.filter(isPhraseCell)
      : all.filter(cell => cell.position === shard && !isPhraseCell(cell));
  const baseline = loadBaseline();

  describe(`value matrix: ${shard}`, () => {
    let results: CellResult[] = [];

    beforeAll(async () => {
      results = await runValueMatrix(cells);
      const pairs = results.reduce((n, r) => n + Object.keys(r.lanes).length, 0);
      const failing = results.reduce((n, r) => n + failingLanes(r).length, 0);
      console.log(
        `value matrix [${shard}]: ${cells.length} cells, ${pairs} (cell, lane) pairs, ${failing} failing`
      );
    }, 900_000);

    it('every cell has an oracle', () => {
      expect(cells.length).toBeGreaterThan(50);
      expect(results).toHaveLength(cells.length);
      expect(results.filter(r => r.invalid).map(r => `${r.id}: ${r.invalid}`)).toEqual([]);
    });

    it('no failing pair is missing from the baseline', () => {
      const { added } = diffBaseline(results, baseline);
      expect(
        capped(
          added.map(
            a => `${a.id} [${a.lane}] want ${JSON.stringify(a.want)}, got ${JSON.stringify(a.got)}`
          )
        )
      ).toEqual([]);
    });

    it('no listed pair passes now (prune it with tools/regen-value-matrix-baseline.ts)', () => {
      const { fixed } = diffBaseline(results, baseline);
      expect(capped(fixed.map(f => `${f.id} [${f.lane}]`))).toEqual([]);
    });

    // A position shard owns its prefix's entries, phrase cells included; the
    // phrase shard owns none (its cells' positions are put, set and if).
    it('no listed cell is gone from the generator', () => {
      if (shard === 'phrases') return;
      const own = Object.fromEntries(
        Object.entries(baseline.entries).filter(([id]) => id.startsWith(`${shard}|`))
      );
      expect(orphanedEntries({ entries: own }, all)).toEqual([]);
    });
  });
}
