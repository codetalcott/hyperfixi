/**
 * TDD Fix for 'mod' Operator
 * 
 * Current issue: 'mod' operator not being recognized/parsed properly
 * Expected: 5 mod 3 = 2, following _hyperscript's modulo behavior
 */

import { describe, it, expect } from 'vitest';
import { parseAndEvaluateExpression } from './expression-parser.js';
import type { ExecutionContext } from '../types/core.js';

const context: ExecutionContext = {
  me: null,
  you: null,
  it: null,
  result: null,
  locals: new Map(),
  globals: new Map(),
  parent: null,
  halted: false,
  returned: false,
  broke: false,
  continued: false,
  async: false
};

describe('Mod Operator - TDD Fix', () => {
  describe('Basic Mod Operations', () => {
    it('should handle basic modulo: 5 mod 3 = 2', async () => {
      const result = await parseAndEvaluateExpression('5 mod 3', context);
      expect(result).toBe(2);
    });

    it('should handle modulo with zero remainder: 6 mod 3 = 0', async () => {
      const result = await parseAndEvaluateExpression('6 mod 3', context);
      expect(result).toBe(0);
    });

    it('should handle modulo larger dividend: 17 mod 5 = 2', async () => {
      const result = await parseAndEvaluateExpression('17 mod 5', context);
      expect(result).toBe(2);
    });

    it('should handle modulo with decimals: 10.5 mod 3 ≈ 1.5', async () => {
      const result = await parseAndEvaluateExpression('10.5 mod 3', context);
      expect(result).toBeCloseTo(1.5, 5);
    });
  });

  describe('Mod Operator Precedence', () => {
    it('should have same precedence as multiplication: 2 + 5 mod 3 = 4', async () => {
      // Should evaluate as: 2 + (5 mod 3) = 2 + 2 = 4
      const result = await parseAndEvaluateExpression('2 + 5 mod 3', context);
      expect(result).toBe(4);
    });

    it('should be left-associative: 10 mod 4 mod 3 = 2', async () => {
      // Should evaluate as: (10 mod 4) mod 3 = 2 mod 3 = 2
      const result = await parseAndEvaluateExpression('10 mod 4 mod 3', context);
      expect(result).toBe(2);
    });

    it('should work with parentheses: (2 + 5) mod 3 = 1', async () => {
      // Should evaluate as: 7 mod 3 = 1
      const result = await parseAndEvaluateExpression('(2 + 5) mod 3', context);
      expect(result).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle mod by 1: 5 mod 1 = 0', async () => {
      const result = await parseAndEvaluateExpression('5 mod 1', context);
      expect(result).toBe(0);
    });

    it('should handle negative numbers: -7 mod 3 = -1', async () => {
      const result = await parseAndEvaluateExpression('-7 mod 3', context);
      expect(result).toBe(-1); // JavaScript behavior
    });
  });

  describe('Mod Operator Success Verification', () => {
    it('confirms mod operator is now working correctly', async () => {
      // Fixed! Now works properly
      const result = await parseAndEvaluateExpression('5 mod 3', context);
      expect(result).toBe(2);
    });
  });
});