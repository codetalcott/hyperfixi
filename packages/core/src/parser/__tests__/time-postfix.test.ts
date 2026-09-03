/**
 * Spaced time units — `over 500 ms`, `wait 2 s`
 *
 * The tokenizer joins `500ms` into one TIME token, so the UNSPACED form has
 * always worked. The spaced form had no expression to match upstream's
 * `TimeExpression` (a postfix over `s` / `seconds` / `ms` / `milliseconds`), so
 * the unit was simply discarded — and a discarded time unit is not a cosmetic
 * loss: `wait 2 s` waited 2 MILLISECONDS, a 1000× error on syntax the canonical
 * engine accepts.
 *
 * This is the same shape as the `transition left to 100px` fix one layer over
 * (#1030): the expression layer already had the mechanism
 * (`tryParseStringPostfix`, mirroring upstream's `StringPostfixExpression`) and
 * only the unit set was missing.
 *
 * ## Two deliberate divergences from upstream, both measured
 *
 * 1. **The node is a `stringPostfix`, evaluating to the STRING `"500ms"`** —
 *    upstream's TimeExpression evaluates to a NUMBER of milliseconds. Matching
 *    hyperfixi's own joined token matters more: its literal carries `"500ms"`,
 *    and every duration consumer in this repo (`parseDurationStrict` and
 *    friends) parses that string. The rows below pin the two spellings to the
 *    same value rather than to a shape.
 *
 * 2. **The postfix requires a NUMERIC root.** Upstream matches `s`/`ms` after
 *    any expression, so `log a s` yields the string `"as"` there. `s` and `ms`
 *    are ordinary variable names, and hyperfixi's generic command-argument
 *    loops parse expressions in sequence far more often than upstream's
 *    hand-written command parsers do — unrestricted, the postfix would silently
 *    fuse two arguments. Pinned below.
 *
 * `minutes`/`hours`/`days` stay UNSPACED-only, matching upstream, which rejects
 * `wait 2 minutes` and `wait 2minutes` alike (hyperfixi accepts the joined form
 * as a documented extension).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { hyperscript } from '../../api/hyperscript-api';
import { evaluateExpressionFromSource } from '../runtime';

const BOTH_PATHS: Array<[string, boolean]> = [
  ['auto', false],
  ['traditional', true],
];

/** Compile inside a handler — the only shape that reports discarded input. */
function errorsFor(source: string, traditional: boolean): string[] {
  const result = hyperscript.compileSync(`on click ${source}`, { traditional } as never) as {
    errors?: Array<{ message: string }>;
  };
  return (result.errors ?? []).map(e => e.message);
}

describe('spaced time units', () => {
  describe.each(BOTH_PATHS)('parse (%s path)', (_label, traditional) => {
    it.each([
      'wait 2 s',
      'wait 2 seconds',
      'wait 500 ms',
      'wait 500 milliseconds',
      'transition left to 100px over 500 ms',
      'transition left to 100px over 2 * delay ms',
    ])('places the unit in `%s`', source => {
      expect(errorsFor(source, traditional)).toEqual([]);
    });

    it('does NOT fuse a spaced unit onto a non-numeric root', () => {
      // `log a s` must not become the string "as". Upstream fuses it; this is
      // the one place hyperfixi deliberately does not.
      //
      // Asserted on the TREE, not on diagnostics: on the auto path the semantic
      // parser adopts this source and reports nothing either way, so a
      // diagnostic-based row would pass vacuously on half the matrix.
      const result = hyperscript.compileSync(`on click log a s`, { traditional } as never) as {
        ast?: unknown;
      };
      expect(JSON.stringify(result.ast ?? {})).not.toContain('stringPostfix');
    });

    it('leaves `minutes` unspaced-only, as upstream does', () => {
      // Measured on 0.9.93: `wait 2 minutes` AND `wait 2minutes` are both
      // rejected there. Widening the spaced set would invent syntax.
      expect(errorsFor('wait 2 minutes', traditional).length).toBeGreaterThan(0);
      expect(errorsFor('wait 2minutes', traditional)).toEqual([]);
    });
  });

  describe('value — the spaced form means what the joined form means', () => {
    it.each([
      ['500 ms', '500ms'],
      ['2 s', '2s'],
      ['2 seconds', '2seconds'],
    ])('`%s` evaluates the same as `%s`', async (spaced, joined) => {
      const context = hyperscript.createContext(document.body);
      const a = await evaluateExpressionFromSource(spaced, context as never);
      const b = await evaluateExpressionFromSource(joined, context as never);
      expect(String(a)).toBe(String(b));
    });
  });

  describe('execution — the unit reaches the runtime', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('`wait 20 s` waits twenty SECONDS, not twenty milliseconds', async () => {
      // The row the whole change is for. With the unit discarded this resolves
      // after 20ms and the first assertion fails.
      vi.useFakeTimers();
      let settled = false;
      const running = hyperscript
        .eval('wait 20 s', document.body)
        .then(() => {
          settled = true;
        })
        .catch(() => {
          settled = true;
        });

      await vi.advanceTimersByTimeAsync(500);
      expect(settled, 'resolved far too early — the `s` was dropped').toBe(false);

      await vi.advanceTimersByTimeAsync(20_000);
      await running;
      expect(settled).toBe(true);
    });
  });
});
