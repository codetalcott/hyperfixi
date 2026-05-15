/**
 * TDD Fix for Exponentiation Operators
 *
 * Current issue: ^ and ** operators not recognized by tokenizer
 * Expected: Should handle exponentiation with correct right-associative precedence
 */

import { describe, it, expect } from 'vitest';
import { evaluateExpressionFromSource } from './runtime';
import type { ExecutionContext } from '../types/core';

const context: ExecutionContext = {
  me: null,
  you: null,
  it: null,
  result: null,
  locals: new Map(),
  globals: new Map(),
  parent: undefined,
  halted: false,
  returned: false,
  broke: false,
  continued: false,
  async: false,
};

describe('Exponentiation Operators - TDD Fix', () => {
  describe('Basic Exponentiation', () => {
    it('should handle caret operator: 2 ^ 3 = 8', async () => {
      const result = await evaluateExpressionFromSource('2 ^ 3', context);
      expect(result).toBe(8);
    });

    it('should handle double asterisk operator: 2 ** 3 = 8', async () => {
      const result = await evaluateExpressionFromSource('2 ** 3', context);
      expect(result).toBe(8);
    });

    it('should handle decimal base: 2.5 ^ 2 = 6.25', async () => {
      const result = await evaluateExpressionFromSource('2.5 ^ 2', context);
      expect(result).toBe(6.25);
    });

    it('should handle decimal exponent: 4 ^ 0.5 = 2', async () => {
      const result = await evaluateExpressionFromSource('4 ^ 0.5', context);
      expect(result).toBe(2);
    });
  });

  describe('Exponentiation Precedence', () => {
    it('should have higher precedence than multiplication: 2 * 3 ^ 2 = 18', async () => {
      // Should evaluate as: 2 * (3 ^ 2) = 2 * 9 = 18
      const result = await evaluateExpressionFromSource('2 * 3 ^ 2', context);
      expect(result).toBe(18);
    });

    it('should have higher precedence than addition: 2 + 3 ^ 2 = 11', async () => {
      // Should evaluate as: 2 + (3 ^ 2) = 2 + 9 = 11
      const result = await evaluateExpressionFromSource('2 + 3 ^ 2', context);
      expect(result).toBe(11);
    });

    it('should be right-associative: 2 ^ 3 ^ 2 = 512', async () => {
      // Should evaluate as: 2 ^ (3 ^ 2) = 2 ^ 9 = 512
      // NOT as: (2 ^ 3) ^ 2 = 8 ^ 2 = 64
      const result = await evaluateExpressionFromSource('2 ^ 3 ^ 2', context);
      expect(result).toBe(512);
    });

    it('should work with parentheses: (2 ^ 3) ^ 2 = 64', async () => {
      // Explicit left-to-right with parentheses
      const result = await evaluateExpressionFromSource('(2 ^ 3) ^ 2', context);
      expect(result).toBe(64);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero exponent: 5 ^ 0 = 1', async () => {
      const result = await evaluateExpressionFromSource('5 ^ 0', context);
      expect(result).toBe(1);
    });

    it('should handle negative base: (-2) ^ 3 = -8', async () => {
      const result = await evaluateExpressionFromSource('(-2) ^ 3', context);
      expect(result).toBe(-8);
    });

    it('should handle negative exponent: 2 ^ (-2) = 0.25', async () => {
      const result = await evaluateExpressionFromSource('2 ^ (-2)', context);
      expect(result).toBe(0.25);
    });

    it('should handle both operators consistently: 3 ^ 2 == 3 ** 2', async () => {
      const caret = await evaluateExpressionFromSource('3 ^ 2', context);
      const asterisk = await evaluateExpressionFromSource('3 ** 2', context);
      expect(caret).toBe(asterisk);
      expect(caret).toBe(9);
    });
  });

  describe('Complex Expressions', () => {
    it('should work in complex math: (2 + 3) ^ (1 + 1) = 25', async () => {
      const result = await evaluateExpressionFromSource('(2 + 3) ^ (1 + 1)', context);
      expect(result).toBe(25);
    });

    it('should work with comparisons: 2 ^ 3 > 7', async () => {
      const result = await evaluateExpressionFromSource('2 ^ 3 > 7', context);
      expect(result).toBe(true);
    });
  });

  // Note: "Current Behavior Documentation" tests removed - exponentiation operators now work correctly
});
