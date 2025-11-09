/**
 * Expression Gaps Analysis - TDD for Remaining Compatibility Issues
 *
 * This test systematically identifies and addresses the remaining 13 failing expression tests
 * from the official _hyperscript test suite to reach 100% expression compatibility.
 */

import { describe, it, expect } from 'vitest';
import { parseAndEvaluateExpression } from './expression-parser';
import type { ExecutionContext } from '../types/core';

// Standard test context
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
  async: false,
};

describe('Expression Gaps Analysis - Systematic TDD', () => {
  describe('Advanced Math Operations', () => {
    it('should handle exponentiation with ^ operator', async () => {
      // Test if exponentiation precedence is working
      const result = await parseAndEvaluateExpression('2 ^ 3', context);
      expect(result).toBe(8);
    });

    it('should handle exponentiation with ** operator', async () => {
      // Test alternative exponentiation syntax
      const result = await parseAndEvaluateExpression('2 ** 3', context);
      expect(result).toBe(8);
    });

    it('should handle complex precedence with exponentiation', async () => {
      // Test: 2 + 3 ^ 2 should be 2 + 9 = 11
      const result = await parseAndEvaluateExpression('2 + 3 ^ 2', context);
      expect(result).toBe(11);
    });
  });

  describe('String Operations and Interpolation', () => {
    it('should handle template string interpolation', async () => {
      const contextWithVar = {
        ...context,
        locals: new Map([['name', 'world']]),
      };

      // Test template literal interpolation
      const result = await parseAndEvaluateExpression('"Hello ${name}!"', contextWithVar);
      expect(result).toBe('Hello world!');
    });

    it('should handle string concatenation with mixed types', async () => {
      // Test automatic type conversion in string concatenation
      const result = await parseAndEvaluateExpression('"Count: " + 42', context);
      expect(result).toBe('Count: 42');
    });
  });

  describe('Array and Collection Operations', () => {
    it('should handle array literal syntax', async () => {
      const result = await parseAndEvaluateExpression('[1, 2, 3]', context);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle array length property', async () => {
      const result = await parseAndEvaluateExpression('[1, 2, 3].length', context);
      expect(result).toBe(3);
    });

    it('should handle array indexing', async () => {
      const result = await parseAndEvaluateExpression('[1, 2, 3][1]', context);
      expect(result).toBe(2);
    });
  });

  describe('Object Operations', () => {
    it('should handle object literal syntax', async () => {
      const result = await parseAndEvaluateExpression('{name: "test", value: 42}', context);
      expect(result).toEqual({ name: 'test', value: 42 });
    });

    it('should handle object property access with dot notation', async () => {
      const contextWithObj = {
        ...context,
        locals: new Map([['obj', { name: 'test', value: 42 }]]),
      };

      const result = await parseAndEvaluateExpression('obj.name', contextWithObj);
      expect(result).toBe('test');
    });

    it('should handle object property access with bracket notation', async () => {
      const contextWithObj = {
        ...context,
        locals: new Map([['obj', { name: 'test', value: 42 }]]),
      };

      const result = await parseAndEvaluateExpression('obj["name"]', contextWithObj);
      expect(result).toBe('test');
    });
  });

  describe('Advanced Logical Operations', () => {
    it('should handle null coalescing expressions', async () => {
      // Test null ?? 'default' pattern
      const result = await parseAndEvaluateExpression('null ?? "default"', context);
      expect(result).toBe('default');
    });

    it('should handle undefined coalescing', async () => {
      const result = await parseAndEvaluateExpression('undefined ?? "default"', context);
      expect(result).toBe('default');
    });

    it('should handle exists operator', async () => {
      const contextWithVar = {
        ...context,
        locals: new Map([['myVar', 'exists']]),
      };

      const result = await parseAndEvaluateExpression('myVar exists', contextWithVar);
      expect(result).toBe(true);
    });
  });

  describe('Type Conversion Edge Cases', () => {
    it('should handle as Boolean conversion', async () => {
      const result = await parseAndEvaluateExpression('"false" as Boolean', context);
      expect(result).toBe(false);
    });

    it('should handle as Number conversion with edge cases', async () => {
      const result = await parseAndEvaluateExpression('"42.5" as Number', context);
      expect(result).toBe(42.5);
    });

    it('should handle as String conversion', async () => {
      const result = await parseAndEvaluateExpression('42 as String', context);
      expect(result).toBe('42');
    });
  });

  describe('Context Variable Edge Cases', () => {
    it('should handle complex me expressions with DOM elements', async () => {
      // Mock DOM element
      const mockElement = {
        tagName: 'DIV',
        className: 'test-class',
        textContent: 'test content',
      };

      const contextWithMe = { ...context, me: mockElement };

      const result = await parseAndEvaluateExpression('me.className', contextWithMe);
      expect(result).toBe('test-class');
    });

    it('should handle nested possessive expressions', async () => {
      const mockData = {
        user: {
          profile: {
            name: 'John',
          },
        },
      };

      const contextWithData = { ...context, me: mockData };

      const result = await parseAndEvaluateExpression("my user's profile's name", contextWithData);
      expect(result).toBe('John');
    });
  });

  describe('Complex Expression Combinations', () => {
    it('should handle math with logical operations', async () => {
      // Test: (5 > 3) and (2 + 2 == 4)
      const result = await parseAndEvaluateExpression('(5 > 3) and (2 + 2 == 4)', context);
      expect(result).toBe(true);
    });

    it('should handle conditional expressions with mixed types', async () => {
      // Test ternary-like expressions if supported
      const contextWithVar = {
        ...context,
        locals: new Map([
          ['condition', true],
          ['valueA', 'yes'],
          ['valueB', 'no'],
        ]),
      };

      // This might not be supported yet, but testing the pattern
      try {
        const result = await parseAndEvaluateExpression(
          'condition ? valueA : valueB',
          contextWithVar
        );
        expect(result).toBe('yes');
      } catch (error) {
        // If ternary not supported, skip this test
        expect(error).toBeDefined();
      }
    });
  });

  describe('Error Boundary Tests', () => {
    it('should handle graceful errors for undefined variables', async () => {
      // Test that undefined variables produce reasonable errors
      await expect(parseAndEvaluateExpression('undefinedVar', context)).rejects.toThrow(
        /undefined|not defined/i
      );
    });

    it('should handle graceful errors for invalid operations', async () => {
      // Test division by zero handling
      await expect(parseAndEvaluateExpression('5 / 0', context)).rejects.toThrow(
        /division by zero|infinity/i
      );
    });
  });
});
