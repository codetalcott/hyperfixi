/**
 * The direct-path shapes gate (see direct-path-shapes.ts), in shards —
 * `direct-path-shapes.<n>.test.ts` — so vitest runs them in parallel.
 *
 * Assertions, per shard:
 *   1. every case not in KNOWN holds on the text path: upstream runs its
 *      English, the engine runs that English the same way, and every
 *      language's translation runs on the engine as upstream runs the English;
 *   2. every KNOWN case still fails — prune one that passes, so the list only
 *      shrinks;
 *   3. (shard 0) every KNOWN id names a case.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  KNOWN,
  caseFails,
  describeFailure,
  loadDirectPathCases,
  runDirectPathShard,
  type DirectPathResult,
} from './direct-path-shapes';

export const DIRECT_PATH_SHARDS = 3;

export function describeDirectPathShard(shard: number): void {
  describe(`direct-path shapes on the text path [${shard + 1}/${DIRECT_PATH_SHARDS}]`, () => {
    let results: DirectPathResult[] = [];

    beforeAll(async () => {
      results = await runDirectPathShard(shard, DIRECT_PATH_SHARDS);
      const pairs = results.reduce((n, r) => n + r.pairs.length, 0);
      const failing = results.filter(caseFails).length;
      console.log(
        `direct-path shapes [${shard + 1}/${DIRECT_PATH_SHARDS}]: ${results.length} cases, ${pairs} translations, ${failing} failing case(s)`
      );
    }, 600_000);

    it('every case not in KNOWN holds on the text path', () => {
      expect(results.length).toBeGreaterThan(50);
      const failing = results.filter(r => caseFails(r) && !(r.id in KNOWN));
      expect(failing.map(describeFailure)).toEqual([]);
    });

    it('every KNOWN case still fails (prune one that passes)', () => {
      const fixed = results.filter(r => r.id in KNOWN && !caseFails(r)).map(r => r.id);
      expect(fixed).toEqual([]);
    });

    it('every KNOWN id names a case', () => {
      if (shard !== 0) return;
      const ids = new Set(loadDirectPathCases().map(c => c.id));
      expect(Object.keys(KNOWN).filter(id => !ids.has(id))).toEqual([]);
    });
  });
}
