/**
 * The command-shape gate (see command-shapes.ts), in shards —
 * `command-shapes.<n>.test.ts` — so vitest runs them in parallel. Each shard
 * runs every lane of every COMMAND_SHAPE_SHARDS-th case and judges it against
 * the shared baseline.
 *
 * Assertions, per shard:
 *   1. no pair is worse than the baseline lists it: a pass that is now
 *      refused or silent, or a refusal that went silent;
 *   2. no pair is better than listed: prune it with
 *      tools/regen-command-shapes-baseline.ts, so both lists only shrink (a
 *      LOUD case that passes now belongs with the rest).
 *
 * The cases file, the baseline's own consistency and the oracle are checked
 * in command-shapes.cases.test.ts and command-shapes.oracle.test.ts.
 *
 * Each shard also judges the English left in its renders (english-leaks.ts),
 * against baselines/english-leaks.shapes.json: the same renders, a second
 * question, so the gate costs no second translation pass.
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';
import {
  BASELINE_PATH,
  collapse,
  diffBaseline,
  loadCommandShapeCases,
  runCommandShapes,
  type CaseResult,
  type CommandShapesBaseline,
  type PairChange,
} from './command-shapes';
import {
  diffLeakBaseline,
  gainedLeaks,
  prunableLeaks,
  initLeakScanner,
  loadLeakBaseline,
  shapeLeaks,
  type LeakChange,
  type LeakResults,
} from './english-leaks';

export const COMMAND_SHAPE_SHARDS = 3;

export function loadCommandShapesBaseline(): CommandShapesBaseline {
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as CommandShapesBaseline;
}

/** At most `max` lines, then a count: a broad regression must not print thousands. */
function capped(lines: string[], max = 40): string[] {
  return lines.length <= max ? lines : [...lines.slice(0, max), `… and ${lines.length - max} more`];
}

export function describeCommandShapesShard(shard: number): void {
  const { cases } = loadCommandShapeCases();
  const own = cases.filter((_c, i) => i % COMMAND_SHAPE_SHARDS === shard);
  const sources = new Map(cases.map(c => [c.id, collapse(c.source)]));
  const line = (c: PairChange): string =>
    `${c.id} [${c.lane}] ${c.listed} → ${c.got}: ${sources.get(c.id)?.slice(0, 80)}` +
    (c.detail ? ` ⇒ ${JSON.stringify(collapse(c.detail).slice(0, 80))}` : '');

  const leakLine = (c: LeakChange, words: string[]): string =>
    `${c.id} [${c.language}] ${words.join(' ')}: ${sources.get(c.id)?.slice(0, 80)}`;

  describe(`command shapes [${shard + 1}/${COMMAND_SHAPE_SHARDS}]`, () => {
    let results: CaseResult[] = [];
    let leaks: LeakResults = new Map();

    beforeAll(async () => {
      results = await runCommandShapes(own);
      leaks = shapeLeaks(await initLeakScanner(), results, own);
      const pairs = results.reduce((n, r) => n + Object.keys(r.lanes).length, 0);
      const failing = results.reduce(
        (n, r) => n + Object.values(r.lanes).filter(l => l.outcome !== 'pass').length,
        0
      );
      console.log(
        `command shapes [${shard + 1}/${COMMAND_SHAPE_SHARDS}]: ${own.length} cases, ${pairs} pairs, ${failing} not passing`
      );
    }, 300_000);

    it('no pair is worse than the baseline lists it', () => {
      expect(results.length).toBeGreaterThan(300);
      const { worse } = diffBaseline(results, loadCommandShapesBaseline());
      expect(capped(worse.map(line))).toEqual([]);
    });

    it('no pair is better than listed (prune it with tools/regen-command-shapes-baseline.ts)', () => {
      const { better } = diffBaseline(results, loadCommandShapesBaseline());
      expect(capped(better.map(line))).toEqual([]);
    });

    it('no render holds English the leak baseline does not list (english-leaks.ts)', () => {
      expect(leaks.size).toBeGreaterThan(300);
      const gained = gainedLeaks(diffLeakBaseline(leaks, loadLeakBaseline('shapes')));
      expect(capped(gained.map(c => leakLine(c, c.added)))).toEqual([]);
    });

    it('no listed English is gone, nor a listed refusal rendering now (prune with tools/regen-english-leaks-baseline.ts --shapes)', () => {
      const prune = prunableLeaks(diffLeakBaseline(leaks, loadLeakBaseline('shapes')));
      expect(capped(prune.map(c => leakLine(c, c.newRender ? ['now renders'] : c.gone)))).toEqual(
        []
      );
    });
  });
}
