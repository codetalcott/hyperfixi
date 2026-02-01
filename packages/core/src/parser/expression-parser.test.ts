/**
 * Expression Parser Integration Tests
 * TDD implementation of string-to-expression parsing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseAndEvaluateExpression } from './expression-parser';
import type { ExecutionContext } from '../types/core';

describe('Expression Parser Integration', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = {
      me: null,
      you: null,
      it: undefined,
      result: undefined,
      locals: new Map(),
      globals: new Map(),
      parent: undefined,
      halted: false,
      returned: false,
      broke: false,
      continued: false,
      async: false,
    };
  });

  describe('Basic Literal Expressions', () => {
    it('should parse and evaluate string literals', async () => {
      const result = await parseAndEvaluateExpression('"hello"', context);
      expect(result).toBe('hello');
    });

    it('should parse and evaluate number literals', async () => {
      const result = await parseAndEvaluateExpression('42', context);
      expect(result).toBe(42);
    });

    it('should parse and evaluate boolean literals', async () => {
      const trueResult = await parseAndEvaluateExpression('true', context);
      expect(trueResult).toBe(true);

      const falseResult = await parseAndEvaluateExpression('false', context);
      expect(falseResult).toBe(false);
    });
  });

  describe('Variable References', () => {
    it('should parse and evaluate local variables', async () => {
      context.locals.set('testVar', 'local value');

      const result = await parseAndEvaluateExpression('testVar', context);
      expect(result).toBe('local value');
    });

    it('should parse and evaluate context references', async () => {
      context.it = 'context value';

      const result = await parseAndEvaluateExpression('it', context);
      expect(result).toBe('context value');
    });
  });

  describe('Simple Property Access', () => {
    // Possessive expression evaluation uses isElement() which requires browser DOM (Element class).
    // In Node.js test environment, this returns an error object instead of the property value.
    it.skip('should parse and evaluate possessive expressions (requires DOM)', async () => {
      const obj = { name: 'test', value: 42 };
      context.locals.set('obj', obj);

      const result = await parseAndEvaluateExpression("obj's name", context);
      expect(result).toBe('test');
    });

    it('should handle null safety in property access', async () => {
      context.locals.set('nullObj', null);

      const result = await parseAndEvaluateExpression("nullObj's property", context);
      expect(result).toBeUndefined();
    });
  });

  describe('Basic Type Conversion', () => {
    it('should parse and evaluate as expressions', async () => {
      const result = await parseAndEvaluateExpression('"123" as Int', context);
      expect(result).toBe(123);
    });

    it('should handle complex as expressions', async () => {
      const obj = { foo: 'bar' };
      context.locals.set('obj', obj);

      const result = await parseAndEvaluateExpression('obj as JSON', context);
      expect(result).toBe('{"foo":"bar"}');
    });
  });

  describe('Logical Operations', () => {
    it('should parse and evaluate logical and', async () => {
      expect(await parseAndEvaluateExpression('true and false', context)).toBe(false);
      expect(await parseAndEvaluateExpression('true and true', context)).toBe(true);
    });

    it('should parse and evaluate logical or', async () => {
      expect(await parseAndEvaluateExpression('false or true', context)).toBe(true);
      expect(await parseAndEvaluateExpression('false or false', context)).toBe(false);
    });

    it('should parse and evaluate not', async () => {
      expect(await parseAndEvaluateExpression('not true', context)).toBe(false);
      expect(await parseAndEvaluateExpression('not false', context)).toBe(true);
    });

    it('should respect logical operator precedence (and binds tighter than or)', async () => {
      // true or false and false → true or (false and false) → true or false → true
      expect(await parseAndEvaluateExpression('true or false and false', context)).toBe(true);
    });

    it('should chain logical operators', async () => {
      expect(await parseAndEvaluateExpression('true and true and true', context)).toBe(true);
      expect(await parseAndEvaluateExpression('true and true and false', context)).toBe(false);
      expect(await parseAndEvaluateExpression('false or false or true', context)).toBe(true);
    });
  });

  describe('Comparison Operations', () => {
    it('should handle greater than', async () => {
      expect(await parseAndEvaluateExpression('5 > 3', context)).toBe(true);
      expect(await parseAndEvaluateExpression('3 > 5', context)).toBe(false);
    });

    it('should handle less than', async () => {
      expect(await parseAndEvaluateExpression('3 < 5', context)).toBe(true);
      expect(await parseAndEvaluateExpression('5 < 3', context)).toBe(false);
    });

    it('should handle greater than or equal', async () => {
      expect(await parseAndEvaluateExpression('5 >= 5', context)).toBe(true);
      expect(await parseAndEvaluateExpression('5 >= 3', context)).toBe(true);
      expect(await parseAndEvaluateExpression('3 >= 5', context)).toBe(false);
    });

    it('should handle less than or equal', async () => {
      expect(await parseAndEvaluateExpression('5 <= 5', context)).toBe(true);
      expect(await parseAndEvaluateExpression('3 <= 5', context)).toBe(true);
      expect(await parseAndEvaluateExpression('5 <= 3', context)).toBe(false);
    });

    it('should handle is (equality)', async () => {
      expect(await parseAndEvaluateExpression('5 is 5', context)).toBe(true);
      expect(await parseAndEvaluateExpression('5 is 3', context)).toBe(false);
    });

    it('should handle is not (inequality)', async () => {
      expect(await parseAndEvaluateExpression('5 is not 3', context)).toBe(true);
      expect(await parseAndEvaluateExpression('5 is not 5', context)).toBe(false);
    });

    it('should compare variables', async () => {
      context.locals.set('x', 10);
      context.locals.set('y', 20);
      expect(await parseAndEvaluateExpression('x < y', context)).toBe(true);
      expect(await parseAndEvaluateExpression('x > y', context)).toBe(false);
      expect(await parseAndEvaluateExpression('x is not y', context)).toBe(true);
    });

    it('should handle string equality', async () => {
      expect(await parseAndEvaluateExpression('"hello" is "hello"', context)).toBe(true);
      expect(await parseAndEvaluateExpression('"hello" is "world"', context)).toBe(false);
    });
  });

  describe('Arithmetic Operations', () => {
    it('should parse and evaluate addition', async () => {
      expect(await parseAndEvaluateExpression('5 + 3', context)).toBe(8);
    });

    it('should parse and evaluate subtraction', async () => {
      expect(await parseAndEvaluateExpression('10 - 4', context)).toBe(6);
    });

    it('should parse and evaluate multiplication', async () => {
      expect(await parseAndEvaluateExpression('6 * 7', context)).toBe(42);
    });

    it('should parse and evaluate division', async () => {
      expect(await parseAndEvaluateExpression('15 / 3', context)).toBe(5);
    });

    it('should parse and evaluate modulo', async () => {
      expect(await parseAndEvaluateExpression('17 % 5', context)).toBe(2);
    });

    it('should parse and evaluate exponentiation', async () => {
      expect(await parseAndEvaluateExpression('2 ** 3', context)).toBe(8);
    });

    it('should respect operator precedence (* before +)', async () => {
      // 2 + 3 * 4 → 2 + 12 → 14
      expect(await parseAndEvaluateExpression('2 + 3 * 4', context)).toBe(14);
    });

    it('should respect operator precedence (/ before -)', async () => {
      // 20 - 12 / 3 → 20 - 4 → 16
      expect(await parseAndEvaluateExpression('20 - 12 / 3', context)).toBe(16);
    });

    it('should handle parenthesized expressions', async () => {
      expect(await parseAndEvaluateExpression('(5 + 3) * 2', context)).toBe(16);
      expect(await parseAndEvaluateExpression('(10 - 4) / 2', context)).toBe(3);
    });

    it('should chain arithmetic operations left-to-right', async () => {
      // 10 - 3 - 2 → (10 - 3) - 2 → 5
      expect(await parseAndEvaluateExpression('10 - 3 - 2', context)).toBe(5);
    });

    it('should handle arithmetic with variables', async () => {
      context.locals.set('x', 10);
      context.locals.set('y', 3);
      expect(await parseAndEvaluateExpression('x * y + 2', context)).toBe(32);
    });

    it('should handle string concatenation via +', async () => {
      expect(await parseAndEvaluateExpression('"hello" + " world"', context)).toBe('hello world');
    });

    it('should handle mixed number/string concatenation', async () => {
      expect(await parseAndEvaluateExpression('"count: " + 42', context)).toBe('count: 42');
    });
  });

  describe('Type Conversion (as expressions)', () => {
    it('should convert string to Int', async () => {
      expect(await parseAndEvaluateExpression('"123" as Int', context)).toBe(123);
    });

    it('should convert string to Float', async () => {
      expect(await parseAndEvaluateExpression('"3.14" as Float', context)).toBe(3.14);
    });

    it('should convert number to String', async () => {
      expect(await parseAndEvaluateExpression('42 as String', context)).toBe('42');
    });

    it('should convert object to JSON', async () => {
      context.locals.set('obj', { key: 'value' });
      expect(await parseAndEvaluateExpression('obj as JSON', context)).toBe('{"key":"value"}');
    });

    it('should chain as with arithmetic', async () => {
      // (5 + 3) then convert to string
      expect(await parseAndEvaluateExpression('(5 + 3) as String', context)).toBe('8');
    });
  });

  // Possessive expression evaluation uses isElement() which references browser DOM's Element class.
  // In Node.js test environment, these fail with "Element is not defined".
  // These tests validate parse structure but would need a browser environment (Playwright) to pass.
  describe('Possessive Expressions', () => {
    it.skip('should access object properties (requires DOM)', async () => {
      context.locals.set('obj', { name: 'test', value: 42 });
      expect(await parseAndEvaluateExpression("obj's name", context)).toBe('test');
      expect(await parseAndEvaluateExpression("obj's value", context)).toBe(42);
    });

    it.skip('should handle nested possessive (requires DOM)', async () => {
      const nested = { level1: { level2: { value: 'deep' } } };
      context.locals.set('nested', nested);
      expect(await parseAndEvaluateExpression("nested's level1's level2's value", context)).toBe(
        'deep'
      );
    });

    it('should handle null safety in possessive chain', async () => {
      context.locals.set('nullObj', null);
      expect(await parseAndEvaluateExpression("nullObj's property", context)).toBeUndefined();
    });

    it.skip('should access array length (requires DOM)', async () => {
      context.locals.set('arr', [1, 2, 3, 4, 5]);
      expect(await parseAndEvaluateExpression("arr's length", context)).toBe(5);
    });

    it.skip('should access string length (requires DOM)', async () => {
      context.locals.set('str', 'hello');
      expect(await parseAndEvaluateExpression("str's length", context)).toBe(5);
    });
  });

  describe('String Operations', () => {
    it('should handle contains operator', async () => {
      expect(await parseAndEvaluateExpression('"hello world" contains "world"', context)).toBe(
        true
      );
      expect(await parseAndEvaluateExpression('"hello world" contains "xyz"', context)).toBe(false);
    });

    it('should handle does not contain operator', async () => {
      expect(
        await parseAndEvaluateExpression('"hello world" does not contain "xyz"', context)
      ).toBe(true);
      expect(
        await parseAndEvaluateExpression('"hello world" does not contain "world"', context)
      ).toBe(false);
    });
  });

  describe('Context References', () => {
    it('should resolve it reference', async () => {
      context.it = 42;
      expect(await parseAndEvaluateExpression('it', context)).toBe(42);
    });

    it('should resolve result reference', async () => {
      (context as any).result = 'last result';
      expect(await parseAndEvaluateExpression('result', context)).toBe('last result');
    });

    it('should use context variables in expressions', async () => {
      context.it = 10;
      expect(await parseAndEvaluateExpression('it + 5', context)).toBe(15);
    });
  });

  describe('Global Variables', () => {
    it('should resolve global variables', async () => {
      context.globals.set('globalVar', 'global value');
      expect(await parseAndEvaluateExpression('globalVar', context)).toBe('global value');
    });

    it('should prefer locals over globals', async () => {
      context.locals.set('x', 'local');
      context.globals.set('x', 'global');
      expect(await parseAndEvaluateExpression('x', context)).toBe('local');
    });
  });

  describe('No/Nothing/Null Literals', () => {
    it('should handle null literal', async () => {
      expect(await parseAndEvaluateExpression('null', context)).toBeNull();
    });

    it('should handle nothing literal', async () => {
      expect(await parseAndEvaluateExpression('nothing', context)).toBeUndefined();
    });
  });

  describe('Negative Numbers', () => {
    it('should handle negative number literals', async () => {
      context.locals.set('x', 5);
      // Subtraction from zero as negation
      expect(await parseAndEvaluateExpression('0 - 5', context)).toBe(-5);
    });

    it('should handle negative in arithmetic', async () => {
      expect(await parseAndEvaluateExpression('10 + (0 - 3)', context)).toBe(7);
    });
  });

  describe('Complex Combined Expressions', () => {
    it('should handle comparison with arithmetic', async () => {
      expect(await parseAndEvaluateExpression('5 + 3 > 7', context)).toBe(true);
      expect(await parseAndEvaluateExpression('5 + 3 < 7', context)).toBe(false);
    });

    it('should handle comparison combined with logical', async () => {
      expect(await parseAndEvaluateExpression('5 > 3 and 10 > 7', context)).toBe(true);
      expect(await parseAndEvaluateExpression('5 > 3 and 10 < 7', context)).toBe(false);
      expect(await parseAndEvaluateExpression('5 > 3 or 10 < 7', context)).toBe(true);
    });

    it('should handle complex variable expressions', async () => {
      context.locals.set('price', 25);
      context.locals.set('tax', 0.1);
      const result = await parseAndEvaluateExpression('price + (price * tax)', context);
      expect(result).toBeCloseTo(27.5);
    });

    it.skip('should handle possessive with arithmetic (requires DOM)', async () => {
      context.locals.set('obj', { value: 10 });
      expect(await parseAndEvaluateExpression("obj's value + 5", context)).toBe(15);
    });

    it('should handle mixed expression types', async () => {
      context.locals.set('num', 10);
      context.locals.set('str', 'value: ');
      expect(await parseAndEvaluateExpression('str + (num as String)', context)).toBe('value: 10');
    });
  });

  describe('Error Handling', () => {
    it.skip('should throw meaningful errors for invalid syntax', async () => {
      await expect(parseAndEvaluateExpression('invalid + + syntax', context)).rejects.toThrow();
    });

    it('should handle undefined variables gracefully', async () => {
      expect(await parseAndEvaluateExpression('undefinedVar', context)).toBeUndefined();
    });

    it('should handle empty string input', async () => {
      await expect(parseAndEvaluateExpression('', context)).rejects.toThrow();
    });
  });
});
