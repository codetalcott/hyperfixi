/**
 * TDD Fix for Boolean Type Conversion
 * 
 * Current issue: "false" as Boolean returns "false" (string) instead of false (boolean)
 * Expected: Proper type conversion for Boolean, String, Number, and other conversions
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

describe('Boolean Type Conversion - TDD Fix', () => {
  describe('String to Boolean Conversion', () => {
    it('should convert "false" as Boolean to false', async () => {
      const result = await parseAndEvaluateExpression('"false" as Boolean', context);
      expect(result).toBe(false);
      expect(typeof result).toBe('boolean');
    });

    it('should convert "true" as Boolean to true', async () => {
      const result = await parseAndEvaluateExpression('"true" as Boolean', context);
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });

    it('should convert "0" as Boolean to false', async () => {
      const result = await parseAndEvaluateExpression('"0" as Boolean', context);
      expect(result).toBe(false);
      expect(typeof result).toBe('boolean');
    });

    it('should convert "" as Boolean to false', async () => {
      const result = await parseAndEvaluateExpression('"" as Boolean', context);
      expect(result).toBe(false);
      expect(typeof result).toBe('boolean');
    });

    it('should convert "hello" as Boolean to true', async () => {
      const result = await parseAndEvaluateExpression('"hello" as Boolean', context);
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Number to Boolean Conversion', () => {
    it('should convert 0 as Boolean to false', async () => {
      const result = await parseAndEvaluateExpression('0 as Boolean', context);
      expect(result).toBe(false);
      expect(typeof result).toBe('boolean');
    });

    it('should convert 1 as Boolean to true', async () => {
      const result = await parseAndEvaluateExpression('1 as Boolean', context);
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });

    it('should convert 42 as Boolean to true', async () => {
      const result = await parseAndEvaluateExpression('42 as Boolean', context);
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Other Type Conversions (Should Still Work)', () => {
    it('should still handle String conversion correctly', async () => {
      const result = await parseAndEvaluateExpression('42 as String', context);
      expect(result).toBe('42');
      expect(typeof result).toBe('string');
    });

    it('should still handle Number conversion correctly', async () => {
      const result = await parseAndEvaluateExpression('"42.5" as Number', context);
      expect(result).toBe(42.5);
      expect(typeof result).toBe('number');
    });

    it('should still handle Int conversion correctly', async () => {
      const result = await parseAndEvaluateExpression('"42.9" as Int', context);
      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null as Boolean', async () => {
      const contextWithNull = {
        ...context,
        locals: new Map([['nullVar', null]])
      };
      
      const result = await parseAndEvaluateExpression('nullVar as Boolean', contextWithNull);
      expect(result).toBe(false);
      expect(typeof result).toBe('boolean');
    });

    it('should handle undefined as Boolean', async () => {
      const contextWithUndefined = {
        ...context,
        locals: new Map([['undefinedVar', undefined]])
      };
      
      const result = await parseAndEvaluateExpression('undefinedVar as Boolean', contextWithUndefined);
      expect(result).toBe(false);
      expect(typeof result).toBe('boolean');
    });

    it('should handle boolean literal as Boolean (passthrough)', async () => {
      const result1 = await parseAndEvaluateExpression('true as Boolean', context);
      expect(result1).toBe(true);
      
      const result2 = await parseAndEvaluateExpression('false as Boolean', context);
      expect(result2).toBe(false);
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle boolean as lowercase alias', async () => {
      const result = await parseAndEvaluateExpression('"false" as boolean', context);
      expect(result).toBe(false);
      expect(typeof result).toBe('boolean');
    });

    it('should handle Bool as alias', async () => {
      const result = await parseAndEvaluateExpression('"true" as Bool', context);
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Current Behavior Documentation', () => {
    it('documents current Boolean conversion failure', async () => {
      // Currently returns "false" (string) instead of false (boolean)
      const result = await parseAndEvaluateExpression('"false" as Boolean', context);
      expect(typeof result).toBe('string'); // Current behavior
      expect(result).toBe('false'); // Current behavior - should be false (boolean)
    });
  });
});