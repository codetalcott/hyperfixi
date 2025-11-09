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
      parent: null,
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
    it('should parse and evaluate possessive expressions', async () => {
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
    it('should parse and evaluate logical expressions', async () => {
      const result = await parseAndEvaluateExpression('true and false', context);
      expect(result).toBe(false);
    });

    it('should handle comparison operations', async () => {
      const result = await parseAndEvaluateExpression('5 > 3', context);
      expect(result).toBe(true);
    });
  });

  describe('Mathematical Operations', () => {
    it('should parse and evaluate arithmetic', async () => {
      const result = await parseAndEvaluateExpression('5 + 3', context);
      expect(result).toBe(8);
    });

    it('should handle parenthesized expressions', async () => {
      const result = await parseAndEvaluateExpression('(5 + 3) * 2', context);
      expect(result).toBe(16);
    });
  });

  describe('Error Handling', () => {
    it('should throw meaningful errors for invalid syntax', async () => {
      await expect(parseAndEvaluateExpression('invalid + + syntax', context)).rejects.toThrow();
    });

    it('should handle undefined variables gracefully', async () => {
      const result = await parseAndEvaluateExpression('undefinedVar', context);
      expect(result).toBeUndefined();
    });
  });

  describe('Complex Expressions', () => {
    it('should handle nested property access', async () => {
      const nested = {
        level1: {
          level2: {
            value: 'deep',
          },
        },
      };
      context.locals.set('nested', nested);

      const result = await parseAndEvaluateExpression("nested's level1's level2's value", context);
      expect(result).toBe('deep');
    });

    it('should handle mixed expression types', async () => {
      context.locals.set('num', 10);
      context.locals.set('str', 'value: ');

      const result = await parseAndEvaluateExpression('str + (num as String)', context);
      expect(result).toBe('value: 10');
    });
  });
});
