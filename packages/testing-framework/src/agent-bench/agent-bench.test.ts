/**
 * Guards for the agent-loop benchmark.
 *
 * Two things rot silently and would make the benchmark lie:
 *
 *   1. **A reference that stops working.** Behavior correctness is defined as
 *      "same effect signature as the reference", so a reference that stops
 *      parsing — or starts producing NO effects — makes every candidate for
 *      that task score wrong (or, worse, makes an empty-effect candidate score
 *      right). Same eligibility bar as R2's execution subset.
 *
 *   2. **The silent band drifting.** `baselines/agent-bench-phrasings.json`
 *      records, per plausible phrasing, whether it is correct / rejected /
 *      silently wrong. This ratchets BOTH directions at tolerance 0: a
 *      regression (correct → silent) fails, and so does an improvement that
 *      wasn't re-baselined. The improvement direction matters as much here as
 *      in the R4 allowlist — a fixed parser gap that nobody re-records leaves
 *      the docs quoting a stale number, and the "half of plausible phrasings
 *      misbehave" claim is load-bearing for the roadmap.
 *
 * Deterministic and generator-free: no LLM runs here, so this IS a legitimate
 * CI gate (the A/B run in README.md, which needs a generator, deliberately is
 * not). Full sweep measures ~6s.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TASKS, taskById } from './tasks.js';
import { VARIANTS } from './variants.js';
import {
  bandOf,
  executeCandidate,
  initialize,
  scoreCandidate,
  validateCandidate,
} from './harness.js';

const BASELINE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../baselines/agent-bench-phrasings.json'
);

interface Baseline {
  totals: Record<string, number>;
  phrasings: Array<{ taskId: string; code: string; band: string }>;
}

describe('agent-bench: task references', () => {
  beforeAll(async () => {
    await initialize();
  }, 60_000);

  it('every task has a unique id', () => {
    const ids = TASKS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no prompt leaks hyperscript syntax to the generator', () => {
    // A prompt containing the answer measures nothing. Selector/sigil
    // characters and command keywords in the imperative position are the tells.
    const leaks = TASKS.filter(t => /\bon click\b|=>|\s_=|@[a-z-]+\s|\*[a-z-]+\s/i.test(t.prompt));
    expect(leaks.map(t => t.id)).toEqual([]);
  });

  it.each(TASKS.map(t => [t.id, t] as const))(
    'reference for %s parses and produces a usable effect signature',
    async (_id, task) => {
      const validation = await validateCandidate(task.reference);
      expect(validation.ok, `reference does not parse: ${task.reference}`).toBe(true);
      const { effects, error } = await executeCandidate(task, task.reference);
      expect(error, `reference errored: ${error}`).toBeUndefined();
      expect(effects.length, `reference has no DOM effect: ${task.reference}`).toBeGreaterThan(0);
    },
    30_000
  );
});

describe('agent-bench: plausible-phrasing ratchet', () => {
  let baseline: Baseline;

  beforeAll(async () => {
    await initialize();
    baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;
  }, 60_000);

  it('baseline covers exactly the current variant set', () => {
    const recorded = baseline.phrasings.map(p => p.code).sort();
    const current = VARIANTS.map(v => v.code).sort();
    expect(
      recorded,
      'variants changed without regenerating: tsx src/agent-bench/cli.ts probe-variants --json > baselines/agent-bench-phrasings.json'
    ).toEqual(current);
  });

  it('every phrasing still lands in its recorded band (both directions, tolerance 0)', async () => {
    const drift: string[] = [];
    for (const entry of baseline.phrasings) {
      const task = taskById(entry.taskId);
      expect(task, `baseline names unknown task ${entry.taskId}`).toBeDefined();
      const s = await scoreCandidate(task!, entry.code);
      const band = bandOf(s);
      if (band !== entry.band) drift.push(`${entry.code}\n    ${entry.band} → ${band}`);
    }
    expect(
      drift,
      'phrasing behavior drifted. If this is an intentional improvement, regenerate:\n' +
        '  tsx src/agent-bench/cli.ts probe-variants --json > baselines/agent-bench-phrasings.json'
    ).toEqual([]);
  }, 120_000);
});
