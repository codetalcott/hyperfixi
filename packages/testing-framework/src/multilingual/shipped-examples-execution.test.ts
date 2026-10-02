/**
 * Shipped-examples execution gate (see shipped-examples-execution.ts for the
 * why and the execution model).
 *
 * Executes every eligible `_="…"` handler shipped in `examples/**` on BOTH
 * hyperfixi and the real `hyperscript.org` engine, in jsdom, and ratchets on
 * divergence of their DOM effect signatures. Upstream is the behavioral
 * oracle — the same role R4 gives it for validity. This is the gate that would
 * have caught the #785 defect (a conditional body running unconditionally on a
 * shipped page) on BEHAVIOR: every parse-level gate stayed green while it
 * shipped.
 *
 * Assertions, matching the shipped-sources gate:
 *   1. sanity — pages walked, handlers extracted, comparisons actually ran
 *      (guards the silent-zero failure mode);
 *   2. no NEW divergence appears outside the committed allowlist;
 *   3. no allowlisted key has silently converged (stale entries must be
 *      removed so the list only ever ratchets down).
 *
 * The same three run for the ENGINE LANE: `@hyperfixi/engine`, the engine meant
 * to replace core's, against the same oracle on every handler upstream accepts
 * (`allowedEngineDivergences` in the same baseline). It is the gate for a
 * handler that parses on both engines and runs differently, which the
 * parse-level list in shipped-sources-engine.test.ts cannot see.
 *
 * To update after an intentional change: re-run and regenerate
 * `baselines/shipped-examples-execution.json` (the allowlist key embeds a
 * source hash, so FIXING a handler changes its key and assertion 3 forces the
 * entry's removal).
 *
 * Node-only (walks the repo, imports hyperscript.org off disk). The sweep
 * swaps jsdom globals per handler execution — safe because vitest isolates
 * test files per worker.
 *
 * @vitest-environment node
 * The node environment is REQUIRED, not a preference: under the suite default
 * (happy-dom) the DOM constructors already exist on globalThis, the harness's
 * globals bootstrap refuses to overwrite what it does not own, and both
 * engines then bind happy-dom's constructors — every instanceof against a
 * jsdom element fails and every hyperfixi signature comes back empty
 * (measured: 0 real matches under happy-dom vs 74 under node).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import {
  runShippedExamplesExecution,
  triggerEventOf,
  keyFor,
  type ExecutionParityResult,
} from './shipped-examples-execution';

interface AllowlistDoc {
  allowedDivergences: Array<{
    key: string;
    file: string;
    event: string;
    excerpt: string;
    reason: string;
  }>;
  /** The engine lane: `@hyperfixi/engine` against upstream. */
  allowedEngineDivergences: Array<{
    key: string;
    file: string;
    event: string;
    excerpt: string;
    reason: string;
  }>;
}

const baselinePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../baselines/shipped-examples-execution.json'
);
const allowlist = JSON.parse(readFileSync(baselinePath, 'utf8')) as AllowlistDoc;
const allowed = new Set(allowlist.allowedDivergences.map(e => e.key));
const allowedOnEngine = new Set(allowlist.allowedEngineDivergences.map(e => e.key));

/** One sweep, shared by both lanes' tests. */
let sweeping: Promise<ExecutionParityResult> | undefined;
const sweep = (): Promise<ExecutionParityResult> => (sweeping ??= runShippedExamplesExecution());

describe('shipped-examples execution gate', () => {
  let result: ExecutionParityResult;

  beforeAll(async () => {
    result = await sweep();

    // Visibility, not assertions: what the sweep could not compare, and why.
    // A silently shrinking denominator is this gate's own blind spot.
    const reasons = new Map<string, number>();
    for (const s of result.skipped) {
      const r = s.reason.split(':')[0] ?? s.reason;
      reasons.set(r, (reasons.get(r) ?? 0) + 1);
    }
    const vacuous = result.compared.filter(c => c.vacuous).length;
    console.log(
      `[shipped-examples-execution] pages=${result.pages} handlers=${result.handlers} ` +
        `compared=${result.compared.length} (vacuous=${vacuous}) skipped=${result.skipped.length}`
    );
    for (const [r, n] of [...reasons].sort((a, b) => b[1] - a[1])) {
      console.log(`[shipped-examples-execution]   skip ×${n}: ${r}`);
    }
    const onEngine = result.engineCompared;
    console.log(
      `[shipped-examples-execution] engine lane: compared=${onEngine.length} ` +
        `(vacuous=${onEngine.filter(c => c.vacuous).length}) ` +
        `diverging=${onEngine.filter(c => !c.match).length}`
    );
  }, 240_000);

  it('walks pages and compares handlers (sanity: extraction and both engines working)', () => {
    // Floors well below current values (48 / 261 / 122 / 52) but far above
    // zero: a broken walk, extractor, or engine bootstrap fails loudly here
    // instead of making assertions 2-3 vacuously pass.
    //
    // Calibrated against the git-TRACKED corpus — the sweep ignores untracked
    // examples/ dirs, so these numbers are the same on every machine and in
    // CI. (The original floors were measured on a working tree with four
    // gitignored dirs present and failed every clean checkout — #862.)
    expect(result.pages).toBeGreaterThan(35);
    expect(result.handlers).toBeGreaterThan(200);
    expect(result.compared.length).toBeGreaterThan(90);
    // Vacuous (empty-vs-empty) pairs are NOT parity evidence — the floor is on
    // real, non-empty signature matches.
    const realMatches = result.compared.filter(c => c.match && !c.vacuous).length;
    expect(realMatches).toBeGreaterThan(40);
  });

  it('has no NEW divergence from upstream outside the allowlist', () => {
    const unexpected = result.compared.filter(c => !c.match && !allowed.has(c.key));
    expect(
      unexpected,
      unexpected.length
        ? `\nShipped handlers whose DOM effect DIVERGES from the hyperscript.org engine ` +
            `(fix the behavior, or allowlist with a family reason):\n` +
            unexpected
              .map(
                f =>
                  `  [${f.key}]\n` +
                  `      "${f.excerpt}"\n` +
                  `      hyperfixi: ${JSON.stringify(f.hyperfixiEffects).slice(0, 300)}\n` +
                  `      upstream : ${JSON.stringify(f.upstreamEffects).slice(0, 300)}`
              )
              .join('\n') +
            `\n\nTriage guidance: an EMPTY hyperfixi signature with a non-empty upstream one usually\n` +
            `means hyperfixi silently dropped behavior (the #785 class). The reverse often means a\n` +
            `deliberate hyperfixi extension or a jsdom limitation on the upstream side — check the\n` +
            `existing family reasons in baselines/shipped-examples-execution.json before adding a new one.`
        : ''
    ).toEqual([]);
  });

  it('has no stale allowlist entries (a now-converged handler must be removed so the list ratchets down)', () => {
    const stillDiverging = new Set(result.compared.filter(c => !c.match).map(c => c.key));
    const stale = allowlist.allowedDivergences.map(e => e.key).filter(k => !stillDiverging.has(k));
    expect(
      stale,
      stale.length
        ? `\nThese allowlisted handlers no longer diverge (fixed, or edited — the key embeds a\n` +
            `source hash; or no longer eligible, in which case the coverage loss should be deliberate).\n` +
            `Remove them from baselines/shipped-examples-execution.json:\n  ${stale.join('\n  ')}`
        : ''
    ).toEqual([]);
  });
});

describe('shipped-examples execution gate: @hyperfixi/engine against upstream', () => {
  let result: ExecutionParityResult;
  beforeAll(async () => {
    result = await sweep();
  }, 240_000);

  it('compares handlers on the engine (sanity: the lane ran and mostly agrees)', () => {
    expect(result.engineCompared.length).toBeGreaterThan(90);
    const realMatches = result.engineCompared.filter(c => c.match && !c.vacuous).length;
    expect(realMatches).toBeGreaterThan(60);
  });

  it('has no NEW divergence from upstream outside the allowlist', () => {
    const unexpected = result.engineCompared.filter(c => !c.match && !allowedOnEngine.has(c.key));
    expect(
      unexpected,
      unexpected.length
        ? `\nShipped handlers whose DOM effect on @hyperfixi/engine DIVERGES from the hyperscript.org ` +
            `engine\n(the engine follows upstream's source: fix the engine, or allowlist with a reason ` +
            `under allowedEngineDivergences):\n` +
            unexpected
              .map(
                f =>
                  `  [${f.key}]\n` +
                  `      "${f.excerpt}"\n` +
                  `      engine  : ${JSON.stringify(f.engineEffects).slice(0, 300)}\n` +
                  `      upstream: ${JSON.stringify(f.upstreamEffects).slice(0, 300)}`
              )
              .join('\n') +
            `\n\nOne source on both, on one page: npx tsx packages/engine/tools/probe.mts '<source>'`
        : ''
    ).toEqual([]);
  });

  it('has no stale allowlist entries', () => {
    const stillDiverging = new Set(result.engineCompared.filter(c => !c.match).map(c => c.key));
    const stale = allowlist.allowedEngineDivergences
      .map(e => e.key)
      .filter(k => !stillDiverging.has(k));
    expect(
      stale,
      stale.length
        ? `\nThese handlers no longer diverge on the engine (or were edited: the key embeds a\n` +
            `source hash). Remove them from allowedEngineDivergences in\n` +
            `baselines/shipped-examples-execution.json:\n  ${stale.join('\n  ')}`
        : ''
    ).toEqual([]);
  });
});

describe('harness pieces', () => {
  it('extracts the trigger event from the leading on-clause', () => {
    expect(triggerEventOf('on click add .a to me')).toBe('click');
    expect(triggerEventOf('  on  every  click log me')).toBe('click');
    expect(triggerEventOf("on keydown[key=='Escape'] from window hide .x")).toBe('keydown');
    expect(triggerEventOf('on draggable:start add .drag')).toBe('draggable:start');
    expect(triggerEventOf('on click or keyup toggle .a')).toBe('click');
    expect(triggerEventOf('install Draggable')).toBeNull();
    expect(triggerEventOf('init set x to 1')).toBeNull();
  });

  it('keys embed the source hash, so an edited handler changes key', () => {
    const a = keyFor({ file: 'f.html', source: 'on click add .a', event: 'click' });
    const b = keyFor({ file: 'f.html', source: 'on click add .b', event: 'click' });
    expect(a).not.toBe(b);
    expect(a).toMatch(/^f\.html::[0-9a-f]{10}::click$/);
  });
});
