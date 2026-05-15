/**
 * Test-Driven Development for Operator Precedence Fix
 *
 * Based on compatibility test failures, _hyperscript handles standard operator precedence:
 * - 2 + 3 * 4 should equal 14 (not error)
 * - 10 - 2 * 3 should equal 4 (not error)
 * - true and false or true should equal true (not error)
 */

import { describe, it, expect } from 'vitest';
import { evaluateExpressionFromSource } from './runtime';
import type { ExecutionContext } from '../types/core';

// Standard test context
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

describe('Operator Precedence Fix - TDD', () => {
  describe('Mathematical Operator Precedence', () => {
    it('should evaluate 2 + 3 * 4 as 14 (multiplication first)', async () => {
      // This currently fails with "You must parenthesize math operations"
      // Should evaluate as: 2 + (3 * 4) = 2 + 12 = 14
      const result = await evaluateExpressionFromSource('2 + 3 * 4', context);
      expect(result).toBe(14);
    });

    it('should evaluate 10 - 2 * 3 as 4 (multiplication first)', async () => {
      // Should evaluate as: 10 - (2 * 3) = 10 - 6 = 4
      const result = await evaluateExpressionFromSource('10 - 2 * 3', context);
      expect(result).toBe(4);
    });

    it('should evaluate 2 * 3 + 4 as 10 (multiplication first)', async () => {
      // Should evaluate as: (2 * 3) + 4 = 6 + 4 = 10
      const result = await evaluateExpressionFromSource('2 * 3 + 4', context);
      expect(result).toBe(10);
    });

    it('should evaluate 8 / 2 + 3 as 7 (division first)', async () => {
      // Should evaluate as: (8 / 2) + 3 = 4 + 3 = 7
      const result = await evaluateExpressionFromSource('8 / 2 + 3', context);
      expect(result).toBe(7);
    });

    it('should handle same precedence left-to-right: 2 + 3 + 4 as 9', async () => {
      // Should evaluate left-to-right: (2 + 3) + 4 = 5 + 4 = 9
      const result = await evaluateExpressionFromSource('2 + 3 + 4', context);
      expect(result).toBe(9);
    });

    it('should still respect explicit parentheses: (2 + 3) * 4 as 20', async () => {
      // Should evaluate as: (2 + 3) * 4 = 5 * 4 = 20
      const result = await evaluateExpressionFromSource('(2 + 3) * 4', context);
      expect(result).toBe(20);
    });
  });

  describe('Logical Operator Precedence', () => {
    it('should evaluate true and false or true as true (and before or)', async () => {
      // This currently fails with "You must parenthesize logical operations"
      // Should evaluate as: (true and false) or true = false or true = true
      const result = await evaluateExpressionFromSource('true and false or true', context);
      expect(result).toBe(true);
    });

    it('should evaluate false or true and false as false (and before or)', async () => {
      // Should evaluate as: false or (true and false) = false or false = false
      const result = await evaluateExpressionFromSource('false or true and false', context);
      expect(result).toBe(false);
    });

    it('should handle same precedence left-to-right: true or false or true as true', async () => {
      // Should evaluate left-to-right: (true or false) or true = true or true = true
      const result = await evaluateExpressionFromSource('true or false or true', context);
      expect(result).toBe(true);
    });
  });

  describe('Combined Precedence', () => {
    it('should handle mixed math and comparison: 2 + 3 > 4', async () => {
      // Should evaluate as: (2 + 3) > 4 = 5 > 4 = true
      const result = await evaluateExpressionFromSource('2 + 3 > 4', context);
      expect(result).toBe(true);
    });

    it('should handle complex precedence: 2 + 3 * 4 > 10', async () => {
      // Should evaluate as: (2 + (3 * 4)) > 10 = (2 + 12) > 10 = 14 > 10 = true
      const result = await evaluateExpressionFromSource('2 + 3 * 4 > 10', context);
      expect(result).toBe(true);
    });
  });

  describe('JavaScript-Standard Precedence Behavior ✅', () => {
    it('now correctly evaluates math mixed operators (was: error, now: JavaScript standard)', async () => {
      // ✅ FIXED: Now correctly evaluates using JavaScript standard precedence
      // 2 + 3 * 4 = 2 + 12 = 14 (multiplication before addition)
      const result = await evaluateExpressionFromSource('2 + 3 * 4', context);
      expect(result).toBe(14);
    });

    it('now correctly evaluates logical mixed operators (was: error, now: JavaScript standard)', async () => {
      // ✅ FIXED: Now correctly evaluates using JavaScript standard precedence
      // true and false or true = (true and false) or true = false or true = true
      const result = await evaluateExpressionFromSource('true and false or true', context);
      expect(result).toBe(true);
    });

    it('confirms we follow JavaScript precedence standards', async () => {
      // These should all work correctly with standard precedence rules
      expect(await evaluateExpressionFromSource('2 + 3 * 4', context)).toBe(14); // * before +
      expect(await evaluateExpressionFromSource('10 - 2 * 3', context)).toBe(4); // * before -
      expect(await evaluateExpressionFromSource('8 / 2 + 3', context)).toBe(7); // / before +
      expect(await evaluateExpressionFromSource('true and false or true', context)).toBe(true); // and before or
      expect(await evaluateExpressionFromSource('false or true and false', context)).toBe(false); // and before or
    });
  });
});
