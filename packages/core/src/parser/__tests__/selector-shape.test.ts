/**
 * Selector shape — end-to-end through BOTH evaluator entry points
 *
 * `commands/helpers/__tests__/target-elements.test.ts` pins the rule itself.
 * This file pins the WIRING: that the sync evaluator and the async evaluator
 * both route through `resolveTargetElements`, and therefore agree.
 *
 * The two used to carry independent copies of the rule (`evaluateSelectorSync`
 * and `evaluateSelector` in `parser/runtime.ts`), which is what made drift
 * possible — so "sync and async produce the same shape" is the property worth
 * asserting, not just "the shape is right".
 *
 * The rule is upstream parity: IdRef (`#id`) → a single element, ClassRef
 * (`.cls`) and QueryRef (`<…/>`) → the collection. Do not "fix" the asymmetry.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { evaluateExpressionFromSource, evaluateExpressionFromSourceSync } from '../runtime';
import { createMockHyperscriptContext } from '../../test-setup';
import type { ExecutionContext } from '../../types/core';

describe('selector shape — sync and async agree', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="solo" class="item"></div>
      <div class="item"></div>
    `;
    context = createMockHyperscriptContext(document.body) as ExecutionContext;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  /** Evaluate one source string both ways and assert the halves agree. */
  async function bothWays(source: string): Promise<unknown> {
    const sync = evaluateExpressionFromSourceSync(source, context);
    const async_ = await evaluateExpressionFromSource(source, context);
    expect(sync, `sync and async disagree for \`${source}\``).toEqual(async_);
    return sync;
  }

  it('unwraps a matched bare `#id` to the element itself', async () => {
    const result = await bothWays('#solo');
    expect(result).toBe(document.getElementById('solo'));
  });

  it('yields null for an unmatched bare `#id` — not an empty collection', async () => {
    expect(await bothWays('#nope')).toBeNull();
  });

  it('keeps a multi-match `.cls` as the whole collection', async () => {
    const result = (await bothWays('.item')) as unknown[];
    expect(Array.from(result)).toHaveLength(2);
  });

  it('keeps a SINGLE-match `.cls` as a collection, not the element', async () => {
    // The counterpart to the `#id` case, and the one a "simplifying" change
    // breaks first: `.cls` callers assert iterability.
    document.body.innerHTML = '<div class="only"></div>';
    const result = (await bothWays('.only')) as unknown[];
    expect(Array.from(result)).toHaveLength(1);
  });

  it('keeps an unmatched `.cls` as an EMPTY collection, not null', async () => {
    const result = (await bothWays('.absent')) as unknown[];
    expect(Array.from(result)).toHaveLength(0);
  });
});
