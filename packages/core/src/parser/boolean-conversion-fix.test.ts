/**
 * TDD Fix for Boolean Type Conversion
 *
 * Current issue: "false" as Boolean returns "false" (string) instead of false (boolean)
 * Expected: Proper type conversion for Boolean, String, Number, and other conversions
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

describe('Boolean Type Conversion - TDD Fix', () => {
  describe('String to Boolean Conversion', () => {
    it('should convert "false" as Boolean to false', async () => {
      const result = await evaluateExpressionFromSource('"false" as Boolean', context);
      expect(result).toBe(false);
      expect(typeof result).toBe('boolean');
    });

    it('should convert "true" as Boolean to true', async () => {
      const result = await evaluateExpressionFromSource('"true" as Boolean', context);
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });

    it('should convert "0" as Boolean to false', async () => {
      const result = await evaluateExpressionFromSource('"0" as Boolean', context);
      expect(result).toBe(false);
      expect(typeof result).toBe('boolean');
    });

    it('should convert "" as Boolean to false', async () => {
      const result = await evaluateExpressionFromSource('"" as Boolean', context);
      expect(result).toBe(false);
      expect(typeof result).toBe('boolean');
    });

    it('should convert "hello" as Boolean to true', async () => {
      const result = await evaluateExpressionFromSource('"hello" as Boolean', context);
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Number to Boolean Conversion', () => {
    it('should convert 0 as Boolean to false', async () => {
      const result = await evaluateExpressionFromSource('0 as Boolean', context);
      expect(result).toBe(false);
      expect(typeof result).toBe('boolean');
    });

    it('should convert 1 as Boolean to true', async () => {
      const result = await evaluateExpressionFromSource('1 as Boolean', context);
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });

    it('should convert 42 as Boolean to true', async () => {
      const result = await evaluateExpressionFromSource('42 as Boolean', context);
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Other Type Conversions (Should Still Work)', () => {
    it('should still handle String conversion correctly', async () => {
      const result = await evaluateExpressionFromSource('42 as String', context);
      expect(result).toBe('42');
      expect(typeof result).toBe('string');
    });

    it('should still handle Number conversion correctly', async () => {
      const result = await evaluateExpressionFromSource('"42.5" as Number', context);
      expect(result).toBe(42.5);
      expect(typeof result).toBe('number');
    });

    it('should still handle Int conversion correctly', async () => {
      const result = await evaluateExpressionFromSource('"42.9" as Int', context);
      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null as Boolean', async () => {
      const contextWithNull = {
        ...context,
        locals: new Map([['nullVar', null]]),
      };

      const result = await evaluateExpressionFromSource('nullVar as Boolean', contextWithNull);
      // Upstream `convertValue` short-circuits null/undefined for every static
      // converter: `null as Boolean` is null (still falsy in a boolean context),
      // not coerced to false. Matches `null as String` → null.
      expect(result).toBeNull();
    });

    it('should handle undefined as Boolean', async () => {
      const contextWithUndefined = {
        ...context,
        locals: new Map([['undefinedVar', undefined]]),
      };

      const result = await evaluateExpressionFromSource(
        'undefinedVar as Boolean',
        contextWithUndefined
      );
      // Upstream parity: null/undefined pass through unchanged (still falsy).
      expect(result).toBeUndefined();
    });

    it('should handle boolean literal as Boolean (passthrough)', async () => {
      const result1 = await evaluateExpressionFromSource('true as Boolean', context);
      expect(result1).toBe(true);

      const result2 = await evaluateExpressionFromSource('false as Boolean', context);
      expect(result2).toBe(false);
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle boolean as lowercase alias', async () => {
      const result = await evaluateExpressionFromSource('"false" as boolean', context);
      expect(result).toBe(false);
      expect(typeof result).toBe('boolean');
    });

    it('should handle Bool as alias', async () => {
      const result = await evaluateExpressionFromSource('"true" as Bool', context);
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Current Behavior Documentation', () => {
    it('documents Boolean conversion now working correctly', async () => {
      // Fixed: now correctly returns false (boolean) instead of "false" (string)
      const result = await evaluateExpressionFromSource('"false" as Boolean', context);
      expect(typeof result).toBe('boolean'); // Fixed behavior
      expect(result).toBe(false); // Fixed behavior - correctly boolean false
    });
  });
});
