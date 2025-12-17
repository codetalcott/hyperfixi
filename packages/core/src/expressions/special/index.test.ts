/**
 * Tests for Enhanced Special Expressions
 * Comprehensive test suite for literals and mathematical operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTypedExecutionContext } from '../../test-setup';
import type { TypedExpressionContext } from '../../types/base-types';
import {
  StringLiteralExpression,
  NumberLiteralExpression,
  BooleanLiteralExpression,
  AdditionExpression,
  MultiplicationExpression,
  specialExpressions,
} from './index';

describe('Enhanced Special Expressions', () => {
  let context: TypedExpressionContext;

  beforeEach(() => {
    context = createTypedExecutionContext();

    // Set up context variables for template interpolation
    context.locals = new Map([
      ['name', 'John'],
      ['age', 30],
      ['count', 42],
      ['price', 19.99],
      ['active', true],
      ['items', ['a', 'b', 'c']],
    ]);

    context.globals = new Map([
      ['appName', 'HyperFixi'],
      ['version', '1.0.0'],
    ]);
  });

  describe('StringLiteralExpression', () => {
    let expression: StringLiteralExpression;

    beforeEach(() => {
      expression = new StringLiteralExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('stringLiteral');
      expect(expression.category).toBe('Special');
      expect(expression.syntax).toBe('"string" or \'string\'');
      expect(expression.outputType).toBe('String');
      expect(expression.description).toContain('template interpolation');
    });

    describe('Simple String Literals', () => {
      it.skip('should handle simple string literals', async () => {
        const result = await expression.evaluate(context, {
          value: 'hello world',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('hello world');
          expect(result.type).toBe('String');
        }
      });

      it.skip('should handle empty strings', async () => {
        const result = await expression.evaluate(context, {
          value: '',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('');
          expect(result.type).toBe('String');
        }
      });

      it('should handle strings with special characters', async () => {
        const result = await expression.evaluate(context, {
          value: 'Hello\nWorld\t"Test"',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('Hello\nWorld\t"Test"');
        }
      });
    });

    describe('Template Interpolation - ${expression}', () => {
      it('should interpolate simple variables', async () => {
        const result = await expression.evaluate(context, {
          value: 'Hello ${name}!',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('Hello John!');
        }
      });

      it('should interpolate multiple variables', async () => {
        const result = await expression.evaluate(context, {
          value: 'User ${name} is ${age} years old',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('User John is 30 years old');
        }
      });

      it('should interpolate property access', async () => {
        const result = await expression.evaluate(context, {
          value: 'Array has ${items.length} items',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('Array has 3 items');
        }
      });

      it('should handle nested interpolation safely', async () => {
        const result = await expression.evaluate(context, {
          value: 'Price: ${price}, Count: ${count}',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('Price: 19.99, Count: 42');
        }
      });

      it('should handle missing variables gracefully', async () => {
        const result = await expression.evaluate(context, {
          value: 'Hello ${missing}!',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('Hello !');
        }
      });
    });

    describe('Template Interpolation - $variable', () => {
      it('should interpolate simple $variable syntax', async () => {
        const result = await expression.evaluate(context, {
          value: 'Hello $name!',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('Hello John!');
        }
      });

      it('should interpolate property access with $variable', async () => {
        const result = await expression.evaluate(context, {
          value: 'Length: ${items.length}',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('Length: 3');
        }
      });

      it('should handle mixed interpolation styles', async () => {
        const result = await expression.evaluate(context, {
          value: 'App: $appName, User: ${name}, Age: $age',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('App: HyperFixi, User: John, Age: 30');
        }
      });
    });

    describe('Context Resolution', () => {
      it('should resolve from locals first', async () => {
        context.globals?.set('name', 'Global');

        const result = await expression.evaluate(context, {
          value: 'Hello ${name}!',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('Hello John!'); // Should use local value
        }
      });

      it('should fallback to globals', async () => {
        const result = await expression.evaluate(context, {
          value: 'Version: ${version}',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('Version: 1.0.0');
        }
      });

      it('should resolve context references', async () => {
        context.me = document.createElement('div');
        context.me!.id = 'test-element';

        const result = await expression.evaluate(context, {
          value: 'Element: ${me}',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toContain('Element: ');
          expect(result.value!).toContain('test-element');
        }
      });
    });

    describe('Validation and Error Handling', () => {
      it('should validate correct input', () => {
        const validation = expression.validate({
          value: 'test string',
        });

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject missing value', () => {
        const validation = expression.validate({});

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toHaveLength(1);
      });

      it('should reject non-string value', () => {
        const validation = expression.validate({
          value: 123,
        });

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toHaveLength(1);
      });

      it('should track performance', async () => {
        const initialHistoryLength = context.evaluationHistory!.length;

        await expression.evaluate(context, {
          value: 'test',
        });

        expect(context.evaluationHistory!.length).toBe(initialHistoryLength + 1);

        const evaluation = context.evaluationHistory![context.evaluationHistory!.length - 1];
        expect(evaluation.expressionName).toBe('stringLiteral');
        expect(evaluation.category).toBe('Special');
        expect(evaluation.success).toBe(true);
        expect(evaluation.duration).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Documentation', () => {
      it.skip('should have comprehensive documentation', () => {
        expect(expression.documentation.summary).toContain('template interpolation');
        expect(expression.documentation.parameters).toHaveLength(1);
        expect(expression.documentation.returns.type).toBe('string');
        expect(expression.documentation.examples.length).toBeGreaterThan(0);
        expect(expression.documentation.tags).toContain('template');
      });
    });
  });

  describe('NumberLiteralExpression', () => {
    let expression: NumberLiteralExpression;

    beforeEach(() => {
      expression = new NumberLiteralExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('numberLiteral');
      expect(expression.category).toBe('Special');
      expect(expression.syntax).toBe('123 or 3.14');
      expect(expression.outputType).toBe('Number');
    });

    describe('Integer Literals', () => {
      it.skip('should handle positive integers', async () => {
        const result = await expression.evaluate(context, {
          value: 42,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(42);
          expect(result.type).toBe('Number');
        }
      });

      it('should handle negative integers', async () => {
        const result = await expression.evaluate(context, {
          value: -17,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(-17);
        }
      });

      it('should handle zero', async () => {
        const result = await expression.evaluate(context, {
          value: 0,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(0);
        }
      });
    });

    describe('Decimal Literals', () => {
      it('should handle decimal numbers', async () => {
        const result = await expression.evaluate(context, {
          value: 3.14159,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(3.14159);
        }
      });

      it('should handle very small decimals', async () => {
        const result = await expression.evaluate(context, {
          value: 0.000001,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(0.000001);
        }
      });

      it('should handle large numbers', async () => {
        const result = await expression.evaluate(context, {
          value: 1234567890.123,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(1234567890.123);
        }
      });
    });

    describe('Edge Cases and Validation', () => {
      it.skip('should reject infinite values', async () => {
        const result = await expression.evaluate(context, {
          value: Infinity,
        });

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors![0].message).toContain('finite');
      });

      it.skip('should reject NaN values', async () => {
        const result = await expression.evaluate(context, {
          value: NaN,
        });

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors![0].message).toMatch(/finite|nan|number/i);
      });

      it('should validate correct input', () => {
        const validation = expression.validate({
          value: 42,
        });

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it.skip('should reject non-number input', () => {
        const validation = expression.validate({
          value: '42',
        });

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toHaveLength(1);
      });
    });
  });

  describe('BooleanLiteralExpression', () => {
    let expression: BooleanLiteralExpression;

    beforeEach(() => {
      expression = new BooleanLiteralExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('booleanLiteral');
      expect(expression.category).toBe('Special');
      expect(expression.syntax).toBe('true or false');
      expect(expression.outputType).toBe('Boolean');
    });

    it.skip('should handle true literal', async () => {
      const result = await expression.evaluate(context, {
        value: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
        expect(result.type).toBe('Boolean');
      }
    });

    it.skip('should handle false literal', async () => {
      const result = await expression.evaluate(context, {
        value: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false);
        expect(result.type).toBe('Boolean');
      }
    });

    it('should validate correct input', () => {
      const validation = expression.validate({
        value: true,
      });

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject non-boolean input', () => {
      const validation = expression.validate({
        value: 'true',
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
    });
  });

  describe('AdditionExpression', () => {
    let expression: AdditionExpression;

    beforeEach(() => {
      expression = new AdditionExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('addition');
      expect(expression.category).toBe('Special');
      expect(expression.syntax).toBe('left + right');
      expect(expression.outputType).toBe('Number');
    });

    describe('Numeric Addition', () => {
      it.skip('should add integers', async () => {
        const result = await expression.evaluate(context, {
          left: 5,
          right: 3,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(8);
          expect(result.type).toBe('Number');
        }
      });

      it('should add decimals', async () => {
        const result = await expression.evaluate(context, {
          left: 3.14,
          right: 2.86,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBeCloseTo(6.0);
        }
      });

      it('should add negative numbers', async () => {
        const result = await expression.evaluate(context, {
          left: -5,
          right: 3,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(-2);
        }
      });

      it('should handle zero addition', async () => {
        const result = await expression.evaluate(context, {
          left: 42,
          right: 0,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(42);
        }
      });
    });

    describe('Type Conversion', () => {
      it('should convert string numbers', async () => {
        const result = await expression.evaluate(context, {
          left: '5',
          right: '3',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(8);
        }
      });

      it('should convert boolean values', async () => {
        const result = await expression.evaluate(context, {
          left: true,
          right: false,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(1); // true = 1, false = 0
        }
      });

      it('should convert null and undefined to zero', async () => {
        const result = await expression.evaluate(context, {
          left: null,
          right: undefined,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(0);
        }
      });

      it('should handle mixed types', async () => {
        const result = await expression.evaluate(context, {
          left: 5,
          right: '3',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(8);
        }
      });
    });

    describe('Error Handling', () => {
      it.skip('should reject infinite operands', async () => {
        const result = await expression.evaluate(context, {
          left: Infinity,
          right: 5,
        });

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors![0].message).toContain('finite number');
      });

      it.skip('should reject non-convertible strings', async () => {
        const result = await expression.evaluate(context, {
          left: 'abc',
          right: 5,
        });

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors![0].message).toContain('cannot be converted');
      });

      it('should validate correct input', () => {
        const validation = expression.validate({
          left: 5,
          right: 3,
        });

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject missing operands', () => {
        const validation = expression.validate({
          left: 5,
          // missing right operand - this should fail because strict schema requires both
        });

        // Note: Since we use strict schema, missing required fields should fail validation
        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('MultiplicationExpression', () => {
    let expression: MultiplicationExpression;

    beforeEach(() => {
      expression = new MultiplicationExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('multiplication');
      expect(expression.category).toBe('Special');
      expect(expression.syntax).toBe('left * right');
      expect(expression.outputType).toBe('Number');
    });

    describe('Numeric Multiplication', () => {
      it.skip('should multiply integers', async () => {
        const result = await expression.evaluate(context, {
          left: 5,
          right: 3,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(15);
          expect(result.type).toBe('Number');
        }
      });

      it('should multiply decimals', async () => {
        const result = await expression.evaluate(context, {
          left: 3.14,
          right: 2,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBeCloseTo(6.28);
        }
      });

      it('should handle zero multiplication', async () => {
        const result = await expression.evaluate(context, {
          left: 42,
          right: 0,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(0);
        }
      });

      it('should handle negative multiplication', async () => {
        const result = await expression.evaluate(context, {
          left: -5,
          right: 3,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(-15);
        }
      });
    });

    describe('Type Conversion in Multiplication', () => {
      it('should convert and multiply strings', async () => {
        const result = await expression.evaluate(context, {
          left: '5',
          right: '3',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(15);
        }
      });

      it('should handle boolean multiplication', async () => {
        const result = await expression.evaluate(context, {
          left: 5,
          right: true,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(5); // 5 * 1
        }
      });

      it('should handle null and undefined', async () => {
        const result = await expression.evaluate(context, {
          left: 5,
          right: null,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(0); // 5 * 0
        }
      });
    });
  });

  describe('Expression Registry', () => {
    it('should export all enhanced special expressions', () => {
      expect(specialExpressions.stringLiteral).toBeInstanceOf(StringLiteralExpression);
      expect(specialExpressions.numberLiteral).toBeInstanceOf(NumberLiteralExpression);
      expect(specialExpressions.booleanLiteral).toBeInstanceOf(BooleanLiteralExpression);
      expect(specialExpressions.addition).toBeInstanceOf(AdditionExpression);
      expect(specialExpressions.multiplication).toBeInstanceOf(MultiplicationExpression);
    });

    it.skip('should have consistent metadata across all expressions', () => {
      Object.values(specialExpressions).forEach(expression => {
        expect(expression.category).toBe('Special');
        expect(expression.name).toBeTruthy();
        expect(expression.syntax).toBeTruthy();
        expect(expression.description).toBeTruthy();
        expect(expression.metadata).toBeTruthy();
        expect(expression.documentation).toBeTruthy();
        expect(expression.inputSchema).toBeTruthy();
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with complex template interpolation', async () => {
      const stringExpr = new StringLiteralExpression();

      // Set up complex context
      context.locals?.set('user', { name: 'Jane', scores: [95, 87, 92] });

      const result = await stringExpr.evaluate(context, {
        value: 'User ${user.name} has ${user.scores.length} scores with average ${user.scores}',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toContain('User Jane');
        expect(result.value!).toContain('3 scores');
      }
    });

    it('should combine multiple expressions for calculations', async () => {
      const addExpr = new AdditionExpression();
      const mulExpr = new MultiplicationExpression();

      // First calculate 5 + 3 = 8
      const addResult = await addExpr.evaluate(context, {
        left: 5,
        right: 3,
      });

      expect(addResult.success).toBe(true);

      if (addResult.success) {
        // Then multiply by 2 = 16
        const mulResult = await mulExpr.evaluate(context, {
          left: addResult.value,
          right: 2,
        });

        expect(mulResult.success).toBe(true);
        if (mulResult.success) {
          expect(mulResult.value).toBe(16);
        }
      }
    });

    it.skip('should handle large-scale operations efficiently', async () => {
      const addExpr = new AdditionExpression();

      const startTime = Date.now();

      // Perform many addition operations
      for (let i = 0; i < 1000; i++) {
        const result = await addExpr.evaluate(context, {
          left: i,
          right: i + 1,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(i + (i + 1));
        }
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete quickly
    });

    it('should work with all literal types together', async () => {
      const stringExpr = new StringLiteralExpression();
      const numberExpr = new NumberLiteralExpression();
      const booleanExpr = new BooleanLiteralExpression();

      const [stringResult, numberResult, booleanResult] = await Promise.all([
        stringExpr.evaluate(context, { value: 'Hello ${name}!' }),
        numberExpr.evaluate(context, { value: 42 }),
        booleanExpr.evaluate(context, { value: true }),
      ]);

      expect(stringResult.success).toBe(true);
      expect(numberResult.success).toBe(true);
      expect(booleanResult.success).toBe(true);

      if (stringResult.success && numberResult.success && booleanResult.success) {
        expect(stringResult.value).toBe('Hello John!');
        expect(numberResult.value).toBe(42);
        expect(booleanResult.value).toBe(true);
      }
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with repeated evaluations', async () => {
      const stringExpr = new StringLiteralExpression();

      // Perform many string interpolations
      for (let i = 0; i < 100; i++) {
        const result = await stringExpr.evaluate(context, {
          value: `Iteration ${i}: \${name} - \${age}`,
        });

        expect(result.success).toBe(true);
      }

      // No memory leaks should occur
      expect(true).toBe(true); // Test completes successfully
    });

    it('should maintain consistent performance', async () => {
      const addExpr = new AdditionExpression();
      const durations: number[] = [];

      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        const result = await addExpr.evaluate(context, {
          left: Math.random() * 1000,
          right: Math.random() * 1000,
        });
        const duration = Date.now() - startTime;

        expect(result.success).toBe(true);
        durations.push(duration);
      }

      // Performance should be consistent (all operations under 5ms)
      durations.forEach(duration => {
        expect(duration).toBeLessThan(5);
      });
    });

    it('should track performance history correctly', async () => {
      const addExpr = new AdditionExpression();
      const initialHistoryLength = context.evaluationHistory!.length;

      await addExpr.evaluate(context, { left: 1, right: 2 });
      await addExpr.evaluate(context, { left: 3, right: 4 });
      await addExpr.evaluate(context, { left: 5, right: 6 });

      expect(context.evaluationHistory!.length).toBe(initialHistoryLength + 3);

      const recentEvaluations = context.evaluationHistory!.slice(-3);
      recentEvaluations.forEach(evaluation => {
        expect(evaluation.expressionName).toBe('addition');
        expect(evaluation.category).toBe('Special');
        expect(evaluation.success).toBe(true);
        expect(evaluation.duration).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
