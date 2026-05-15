/**
 * Method Chaining Implementation Tests
 * TDD approach for implementing method chaining support in hyperscript parser
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { tokenize } from './tokenizer';
import { evaluateExpressionFromSource } from './runtime';
import { createMockHyperscriptContext } from '../test-setup';
import type { ExecutionContext } from '../types/core';

describe('Method Chaining', () => {
  let context: ExecutionContext;

  it('should debug tokenization', () => {
    const tokens = tokenize('str.toUpperCase().toLowerCase()');
    // After fix, should have 9 tokens
    // Phase 8: Tokens now use 'kind' instead of 'type'
    expect(tokens).toHaveLength(9);
    expect(tokens[0]).toMatchObject({ kind: 'identifier', value: 'str' });
    expect(tokens[1]).toMatchObject({ kind: 'operator', value: '.' });
    expect(tokens[2]).toMatchObject({ kind: 'identifier', value: 'toUpperCase' });
    expect(tokens[3]).toMatchObject({ kind: 'operator', value: '(' });
    expect(tokens[4]).toMatchObject({ kind: 'operator', value: ')' });
    expect(tokens[5]).toMatchObject({ kind: 'operator', value: '.' });
    expect(tokens[6]).toMatchObject({ kind: 'identifier', value: 'toLowerCase' });
    expect(tokens[7]).toMatchObject({ kind: 'operator', value: '(' });
    expect(tokens[8]).toMatchObject({ kind: 'operator', value: ')' });
  });

  beforeEach(() => {
    context = createMockHyperscriptContext();
    (context as { locals: Map<string, unknown> }).locals = new Map<string, unknown>([
      ['arr', [1, 2, 3, 4, 5]],
      ['str', 'hello world'],
      [
        'users',
        [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
          { name: 'Charlie', age: 35 },
        ],
      ],
      ['text', '  hello world  '],
    ]);
  });

  describe('Basic Method Calls', () => {
    it('should parse simple method call', async () => {
      const result = await evaluateExpressionFromSource('arr.length', context);
      expect(result).toBe(5);
    });

    it('should parse method call with parentheses', async () => {
      const result = await evaluateExpressionFromSource('str.toUpperCase()', context);
      expect(result).toBe('HELLO WORLD');
    });

    it('should parse method call with arguments', async () => {
      const result = await evaluateExpressionFromSource('arr.slice(1, 3)', context);
      expect(result).toEqual([2, 3]);
    });

    it('should parse method call with single argument', async () => {
      const result = await evaluateExpressionFromSource('str.charAt(6)', context);
      expect(result).toBe('w');
    });
  });

  describe('Chained Method Calls', () => {
    it('should handle two chained methods', async () => {
      const result = await evaluateExpressionFromSource('str.toUpperCase().toLowerCase()', context);
      expect(result).toBe('hello world');
    });

    it('should handle array method chaining', async () => {
      const result = await evaluateExpressionFromSource('arr.slice(1).reverse()', context);
      expect(result).toEqual([5, 4, 3, 2]);
    });

    it('should handle string method chaining with arguments', async () => {
      const result = await evaluateExpressionFromSource('text.trim().toUpperCase()', context);
      expect(result).toBe('HELLO WORLD');
    });

    it('should handle complex method chaining', async () => {
      const result = await evaluateExpressionFromSource(
        'arr.slice(1, 4).reverse().join("-")',
        context
      );
      expect(result).toBe('4-3-2');
    });
  });

  describe('Method Calls with Variables', () => {
    it('should handle method calls with variable arguments', async () => {
      context.locals?.set('start', 2);
      const result = await evaluateExpressionFromSource('arr.slice(start)', context);
      expect(result).toEqual([3, 4, 5]);
    });

    it('should handle chained methods with variable arguments', async () => {
      context.locals?.set('separator', ' | ');
      const result = await evaluateExpressionFromSource('arr.slice(1, 3).join(separator)', context);
      expect(result).toBe('2 | 3');
    });
  });

  describe('Method Calls on Literals', () => {
    it('should handle method calls on string literals', async () => {
      const result = await evaluateExpressionFromSource('"hello".toUpperCase()', context);
      expect(result).toBe('HELLO');
    });

    it('should handle method calls on array literals', async () => {
      const result = await evaluateExpressionFromSource('[1, 2, 3].length', context);
      expect(result).toBe(3);
    });

    it('should handle chained methods on array literals', async () => {
      const result = await evaluateExpressionFromSource('[1, 2, 3].reverse().join("")', context);
      expect(result).toBe('321');
    });
  });

  describe('Nested Object Method Calls', () => {
    it('should handle nested property access with methods', async () => {
      const result = await evaluateExpressionFromSource('users[0].name.toUpperCase()', context);
      expect(result).toBe('ALICE');
    });

    it.skip('should handle complex nested method chaining', async () => {
      // This tests more advanced cases - skip for now
      const result = await evaluateExpressionFromSource(
        'users.map(u => u.name).join(", ")',
        context
      );
      expect(result).toBe('Alice, Bob, Charlie');
    });
  });

  describe('Error Handling', () => {
    it('should handle method calls on undefined', async () => {
      context.locals?.set('notDefined', undefined);
      await expect(
        evaluateExpressionFromSource('notDefined.someMethod()', context)
      ).rejects.toThrow();
    });

    it('should handle non-existent methods', async () => {
      await expect(
        evaluateExpressionFromSource('str.nonExistentMethod()', context)
      ).rejects.toThrow();
    });

    it('should handle method calls with wrong arguments', async () => {
      // slice expects numbers but we pass strings - should handle gracefully
      const result = await evaluateExpressionFromSource('arr.slice("a", "b")', context);
      expect(Array.isArray(result)).toBe(true); // Should still return an array
    });
  });
});
