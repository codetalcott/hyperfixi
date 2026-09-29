/**
 * The value matrix gate (see value-matrix.ts), one position per test file —
 * `value-matrix.<position>.test.ts`, and a position's operator-phrase cells in
 * `value-matrix.<position>-phrases.test.ts` — so vitest runs the shards in
 * parallel. Each shard judges only its own cells against the shared baseline.
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

import { existsSync, readFileSync } from 'node:fs';
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
 * One shard: a position's cells without the operator phrases (`values`), or
 * its phrase cells (`phrases`), which add half again to the matrix and would
 * double a position's shard.
 */
export function describeValueMatrixShard(
  position: Position,
  part: 'values' | 'phrases' = 'values'
): void {
  const all = generateCells();
  const cells = all.filter(
    cell => cell.position === position && isPhraseCell(cell) === (part === 'phrases')
  );
  const shard = part === 'phrases' ? `${position}-phrases` : position;
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

    // The values shard owns its position's entries, phrase cells included.
    it('no listed cell is gone from the generator', () => {
      if (part === 'phrases') return;
      const own = Object.fromEntries(
        Object.entries(baseline.entries).filter(([id]) => id.startsWith(`${position}|`))
      );
      expect(orphanedEntries({ entries: own }, all)).toEqual([]);
    });

    // A phrase added to a position with no phrases shard would run nowhere.
    it('every phrase cell of the position has its shard', () => {
      if (part === 'phrases') return;
      const phrases = all.filter(cell => cell.position === position && isPhraseCell(cell));
      const file = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        `value-matrix.${position}-phrases.test.ts`
      );
      expect(phrases.length === 0 || existsSync(file), file).toBe(true);
    });
  });
}
