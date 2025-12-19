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

describe('Expression Evaluator - Local Variables (:variable)', () => {
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
      locals: new Map(),
      globals: new Map(),
    };
  });

  it('should evaluate :variable from locals', async () => {
    // Set up local variable
    context.locals?.set('x', 42);

    // Create identifier node with scope: 'local'
    const node = {
      type: 'identifier',
      name: 'x',
      scope: 'local',
    };

    const result = await evaluator.evaluate(node, context);
    expect(result).toBe(42);
  });

  it('should return undefined for non-existent :variable', async () => {
    // Don't set any local variable

    const node = {
      type: 'identifier',
      name: 'notFound',
      scope: 'local',
    };

    const result = await evaluator.evaluate(node, context);
    expect(result).toBeUndefined();
  });

  it('should NOT check globals when scope is local', async () => {
    // Set global variable
    context.globals?.set('x', 100);
    // Don't set local variable

    const node = {
      type: 'identifier',
      name: 'x',
      scope: 'local',
    };

    const result = await evaluator.evaluate(node, context);
    // Should return undefined, NOT 100
    expect(result).toBeUndefined();
  });

  it('should check locals first when no scope specified', async () => {
    // Set both local and global
    context.locals?.set('x', 42);
    context.globals?.set('x', 100);

    const node = {
      type: 'identifier',
      name: 'x',
      // no scope property
    };

    const result = await evaluator.evaluate(node, context);
    // Should return local value (42), not global (100)
    expect(result).toBe(42);
  });

  it('should evaluate global when scope is global', async () => {
    // Set both
    context.locals?.set('x', 42);
    context.globals?.set('x', 100);

    const node = {
      type: 'identifier',
      name: 'x',
      scope: 'global',
    };

    const result = await evaluator.evaluate(node, context);
    // Should return global value (100)
    expect(result).toBe(100);
  });

  it('should handle string values in :variable', async () => {
    context.locals?.set('name', 'Alice');

    const node = {
      type: 'identifier',
      name: 'name',
      scope: 'local',
    };

    const result = await evaluator.evaluate(node, context);
    expect(result).toBe('Alice');
  });

  it('should handle numeric values in :variable', async () => {
    context.locals?.set('count', 123);

    const node = {
      type: 'identifier',
      name: 'count',
      scope: 'local',
    };

    const result = await evaluator.evaluate(node, context);
    expect(result).toBe(123);
  });

  it('should handle boolean values in :variable', async () => {
    context.locals?.set('isActive', true);

    const node = {
      type: 'identifier',
      name: 'isActive',
      scope: 'local',
    };

    const result = await evaluator.evaluate(node, context);
    expect(result).toBe(true);
  });

  it('should handle object values in :variable', async () => {
    const obj = { foo: 'bar', count: 42 };
    context.locals?.set('data', obj);

    const node = {
      type: 'identifier',
      name: 'data',
      scope: 'local',
    };

    const result = await evaluator.evaluate(node, context);
    expect(result).toEqual(obj);
  });

  it('should handle null values in :variable', async () => {
    context.locals?.set('empty', null);

    const node = {
      type: 'identifier',
      name: 'empty',
      scope: 'local',
    };

    const result = await evaluator.evaluate(node, context);
    expect(result).toBeNull();
  });
});
