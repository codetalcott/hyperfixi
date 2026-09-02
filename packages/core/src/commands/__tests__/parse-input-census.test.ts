/**
 * The parseInput census — Arc 3 step 1's audit-as-gate
 *
 * Arc 3 moves each command's syntax decisions out of `parseInput` and into
 * its parser, leaving `parseInput` to evaluate slots. The plan's step 1 asks
 * for the audit that makes that measurable: every `parseInput` body sized,
 * its branches counted, and its syntax-discrimination sites (positional
 * `args[i]` reads, keyword-name compares — the grammar re-derived at runtime)
 * told apart from its value-evaluation sites (evaluator calls, modifier reads
 * — the work that stays). `baselines/parse-input-census.json` is the record,
 * `scripts/generate-parse-input-census.ts` regenerates it, and this test is
 * the ratchet: any number going UP in any command fails, a body the baseline
 * does not know fails, and a baseline row with no body behind it fails. The
 * arc is done for a command when its row reads zero syntax sites, and done
 * altogether when the file is empty.
 *
 * Measured at the start (2026-09-02): 51 bodies, 2,434 lines, 361 branches,
 * 128 syntax sites, 215 value sites.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { census, BASELINE, type Census, type CensusRow } from './parse-input-census';

const METRICS = ['lines', 'branches', 'syntaxSites', 'valueSites'] as const;

describe('parseInput census ratchet', () => {
  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')) as Census;
  const current = census();

  it('no parseInput grew on any metric', () => {
    const grew: string[] = [];
    for (const [name, row] of Object.entries(current.commands)) {
      const was = baseline.commands[name];
      if (!was) continue; // reported below
      for (const m of METRICS) {
        if (row[m] > was[m]) grew.push(`${name}.${m}: ${was[m]} → ${row[m]}`);
      }
    }
    expect(
      grew,
      'a parseInput grew — move the syntax into its parser, or regenerate the baseline WITH a reason in the PR'
    ).toEqual([]);
  });

  it('every body is in the baseline, and every baseline row still has a body', () => {
    const unknown = Object.keys(current.commands).filter(n => !(n in baseline.commands));
    const stale = Object.keys(baseline.commands).filter(n => !(n in current.commands));
    expect(
      { unknown, stale },
      'regenerate: npx tsx scripts/generate-parse-input-census.ts --update'
    ).toEqual({
      unknown: [],
      stale: [],
    });
  });

  it('the totals in the baseline are the sum of its rows', () => {
    // A hand-edited baseline that lowered a row without its total (or the
    // reverse) would let the next regeneration look like a change.
    const rows = Object.values(baseline.commands) as CensusRow[];
    for (const m of METRICS) {
      expect(baseline.totals[m]).toBe(rows.reduce((n, r) => n + r[m], 0));
    }
    expect(baseline.totals.bodies).toBe(rows.length);
  });
});
