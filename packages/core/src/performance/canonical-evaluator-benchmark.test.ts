/**
 * Canonical evaluator throughput baseline (design-doc Q7).
 *
 * Records absolute timing for `evaluateExpressionFromSource` on representative
 * expression shapes. With legacy gone after Phase ε.4 there's no before/after
 * comparison — these are forward-looking regression checks. If any case
 * exceeds its budget on a normal dev machine, investigate the
 * `ExpressionEvaluator` wrapper class (design-doc Q5).
 */

import { describe, test, expect, beforeAll } from 'vitest';
// @ts-ignore - benchmarks.ts is excluded from tsconfig.json
import { Benchmark } from './benchmarks';
import { evaluateExpressionFromSource } from '../parser/runtime';
import { createContext } from '../core/context';

const BUDGET_MS_PER_CALL = 1.0; // soft ceiling for "simple expression"

describe('Canonical evaluator throughput (Q7 baseline)', () => {
  let benchmark: Benchmark;

  beforeAll(() => {
    benchmark = new Benchmark();
  });

  test('arithmetic: `1 + 2 * 3`', async () => {
    const ctx = createContext();
    const result = await benchmark.benchmark(
      'evaluateExpressionFromSource(1+2*3)',
      'expression',
      () => evaluateExpressionFromSource('1 + 2 * 3', ctx),
      {
        iterations: 5000,
        warmupRuns: 100,
        complexity: 'low',
        operationType: 'arithmetic',
      }
    );
    expect(result.averageTime).toBeLessThan(BUDGET_MS_PER_CALL);
    expect(result.metadata.validationPassed).toBe(true);
  });

  test('locals identifier: `x`', async () => {
    const ctx = createContext();
    ctx.locals.set('x', 42);
    const result = await benchmark.benchmark(
      'evaluateExpressionFromSource(x)',
      'expression',
      () => evaluateExpressionFromSource('x', ctx),
      {
        iterations: 5000,
        warmupRuns: 100,
        complexity: 'low',
        operationType: 'locals-lookup',
      }
    );
    expect(result.averageTime).toBeLessThan(BUDGET_MS_PER_CALL);
    expect(result.metadata.validationPassed).toBe(true);
  });

  test('member access: `obj.nested.prop`', async () => {
    const ctx = createContext();
    ctx.locals.set('obj', { nested: { prop: 'hello' } });
    const result = await benchmark.benchmark(
      'evaluateExpressionFromSource(obj.nested.prop)',
      'expression',
      () => evaluateExpressionFromSource('obj.nested.prop', ctx),
      {
        iterations: 5000,
        warmupRuns: 100,
        complexity: 'low',
        operationType: 'member-access',
      }
    );
    expect(result.averageTime).toBeLessThan(BUDGET_MS_PER_CALL);
    expect(result.metadata.validationPassed).toBe(true);
  });

  test('selector: `#id`', async () => {
    document.body.innerHTML = '<div id="bench-target"></div>';
    const ctx = createContext();
    const result = await benchmark.benchmark(
      'evaluateExpressionFromSource(#id)',
      'expression',
      () => evaluateExpressionFromSource('#bench-target', ctx),
      {
        iterations: 2000,
        warmupRuns: 50,
        complexity: 'low',
        operationType: 'selector-id',
      }
    );
    expect(result.averageTime).toBeLessThan(BUDGET_MS_PER_CALL);
    expect(result.metadata.validationPassed).toBe(true);
  });

  test('template literal: `` `hello ${1 + 1}` ``', async () => {
    const ctx = createContext();
    const result = await benchmark.benchmark(
      'evaluateExpressionFromSource(template)',
      'expression',
      () => evaluateExpressionFromSource('`hello ${1 + 1}`', ctx),
      {
        iterations: 2000,
        warmupRuns: 50,
        complexity: 'medium',
        operationType: 'template-literal',
      }
    );
    // Template literals double-parse (interpolation), so 2x the budget.
    expect(result.averageTime).toBeLessThan(BUDGET_MS_PER_CALL * 2);
    expect(result.metadata.validationPassed).toBe(true);
  });

  test('possessive: `my.textContent`', async () => {
    const el = document.createElement('div');
    el.textContent = 'baseline';
    const ctx = createContext();
    (ctx as any).me = el;
    const result = await benchmark.benchmark(
      'evaluateExpressionFromSource(my.textContent)',
      'expression',
      () => evaluateExpressionFromSource('my.textContent', ctx),
      {
        iterations: 5000,
        warmupRuns: 100,
        complexity: 'low',
        operationType: 'possessive',
      }
    );
    expect(result.averageTime).toBeLessThan(BUDGET_MS_PER_CALL);
    expect(result.metadata.validationPassed).toBe(true);
  });
});
