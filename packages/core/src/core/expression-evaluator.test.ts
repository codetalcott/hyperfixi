/**
 * Tests for Expression Evaluator with assignment operators
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ExpressionEvaluator } from './expression-evaluator';
import { parse } from '../parser/parser';
import type { ExecutionContext } from '../types/core';

describe('Expression Evaluator - Assignment Operators', () => {
  let evaluator: ExpressionEvaluator;
  let context: ExecutionContext;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator();
    context = {
      me: null,
      it: null,
      you: null,
      result: null,
      variables: new Map(),
      events: new Map(),
    };
  });

  it('should handle simple assignment', async () => {
    const ast = parse('x = 42').node!;
    const result = await evaluator.evaluate(ast, context);

    expect(result).toBe(42);
    expect(context.variables?.get('x')).toBe(42);
  });

  it('should handle chained assignment with right associativity', async () => {
    const ast = parse('a = b = c = 10').node!;
    const result = await evaluator.evaluate(ast, context);

    expect(result).toBe(10);
    expect(context.variables?.get('a')).toBe(10);
    expect(context.variables?.get('b')).toBe(10);
    expect(context.variables?.get('c')).toBe(10);
  });

  it('should handle assignment to context variables', async () => {
    const ast = parse('result = "success"').node!;
    await evaluator.evaluate(ast, context);

    expect(context.result).toBe('success');
  });

  it('should handle assignment with expression on right side', async () => {
    // Set up initial value
    context.variables?.set('x', 5);

    const ast = parse('y = x + 10').node!;
    const result = await evaluator.evaluate(ast, context);

    expect(result).toBe(15);
    expect(context.variables?.get('y')).toBe(15);
  });
});
