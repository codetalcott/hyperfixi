/**
 * TDD Fix for 'in' Operator
 *
 * Current issue: 'in' operator not being recognized/parsed properly
 * Expected: Support for membership testing like "2 in items" and "prop in obj"
 */

import { describe, it, expect } from 'vitest';
import { parseAndEvaluateExpression } from './expression-parser';
import type { ExecutionContext } from '../types/core';

const context: ExecutionContext = {
  me: null,
  you: null,
  it: null,
  result: null,
  locals: new Map([
    ['items', [1, 2, 3, 4, 5]],
    ['obj', { name: 'test', value: 42, active: true }],
    ['emptyArray', []],
    ['emptyObj', {}],
  ]),
  globals: new Map(),
  parent: null,
  halted: false,
  returned: false,
  broke: false,
  continued: false,
  async: false,
};

describe('In Operator - TDD Fix', () => {
  describe('Array Membership Tests', () => {
    it('should handle item in array: 2 in items = true', async () => {
      const result = await parseAndEvaluateExpression('2 in items', context);
      expect(result).toBe(true);
    });

    it('should handle item not in array: 6 in items = false', async () => {
      const result = await parseAndEvaluateExpression('6 in items', context);
      expect(result).toBe(false);
    });

    it('should handle empty array: 1 in emptyArray = false', async () => {
      const result = await parseAndEvaluateExpression('1 in emptyArray', context);
      expect(result).toBe(false);
    });

    it('should handle string in array: "hello" in ["hello", "world"] = true', async () => {
      const result = await parseAndEvaluateExpression('"hello" in ["hello", "world"]', context);
      expect(result).toBe(true);
    });
  });

  describe('Object Property Tests', () => {
    it('should handle property in object: "name" in obj = true', async () => {
      const result = await parseAndEvaluateExpression('"name" in obj', context);
      expect(result).toBe(true);
    });

    it('should handle property not in object: "missing" in obj = false', async () => {
      const result = await parseAndEvaluateExpression('"missing" in obj', context);
      expect(result).toBe(false);
    });

    it('should handle undefined identifier key: name in obj = false', async () => {
      // 'name' resolves to undefined since it's not in context, so property undefined doesn't exist in obj
      const result = await parseAndEvaluateExpression('name in obj', context);
      expect(result).toBe(false);
    });

    it('should handle empty object: "prop" in emptyObj = false', async () => {
      const result = await parseAndEvaluateExpression('"prop" in emptyObj', context);
      expect(result).toBe(false);
    });
  });

  describe('Operator Precedence', () => {
    it('should have correct precedence: 1 + 2 in [3, 4] = true', async () => {
      // Should evaluate as: (1 + 2) in [3, 4] = 3 in [3, 4] = true
      const result = await parseAndEvaluateExpression('1 + 2 in [3, 4]', context);
      expect(result).toBe(true);
    });

    it('should work with parentheses: (2 in items) and true = true', async () => {
      const result = await parseAndEvaluateExpression('(2 in items) and true', context);
      expect(result).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values: null in [null, 1, 2] = true', async () => {
      const result = await parseAndEvaluateExpression('null in [null, 1, 2]', context);
      expect(result).toBe(true);
    });

    it('should handle boolean values: true in [true, false] = true', async () => {
      const result = await parseAndEvaluateExpression('true in [true, false]', context);
      expect(result).toBe(true);
    });
  });

  describe('In Operator Success Verification', () => {
    it('confirms in operator is now working correctly', async () => {
      // Fixed! Now works properly
      const result = await parseAndEvaluateExpression('2 in items', context);
      expect(result).toBe(true);
    });
  });
});
