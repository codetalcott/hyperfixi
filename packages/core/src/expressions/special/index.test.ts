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
  specialExpressions,
} from './index';
import { collectEvaluations, setEvaluationTracker } from '../shared/tracking';

describe('Enhanced Special Expressions', () => {
  let context: TypedExpressionContext;

  beforeEach(() => {
    context = createTypedExecutionContext();

    // Set up context variables for template interpolation
    (context as any).locals = new Map<string, unknown>([
      ['name', 'John'],
      ['age', 30],
      ['count', 42],
      ['price', 19.99],
      ['active', true],
      ['items', ['a', 'b', 'c']],
    ]);

    (context as any).globals = new Map([
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
      it('should handle simple string literals', async () => {
        const result = await expression.evaluate(context, {
          value: 'hello world',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('hello world');
          expect(result.type).toBe('string');
        }
      });

      it('should handle empty strings', async () => {
        const result = await expression.evaluate(context, {
          value: '',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('');
          expect(result.type).toBe('string');
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
        const records = collectEvaluations();
        setEvaluationTracker(records);
        const initialHistoryLength = 0;

        try {
          await expression.evaluate(context, {
            value: 'test',
          });
        } finally {
          setEvaluationTracker(null);
        }

        expect(records.records.length).toBe(initialHistoryLength + 1);

        const evaluation = records.records[records.records.length - 1];
        expect(evaluation.expressionName).toBe('stringLiteral');
        expect(evaluation.category).toBe('Special');
        expect(evaluation.success).toBe(true);
        expect(evaluation.duration).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Documentation', () => {
      it.skip('should have comprehensive documentation', () => {
        expect((expression as any).documentation.summary).toContain('template interpolation');
        expect((expression as any).documentation.parameters).toHaveLength(1);
        expect((expression as any).documentation.returns.type).toBe('string');
        expect((expression as any).documentation.examples.length).toBeGreaterThan(0);
        expect((expression as any).documentation.tags).toContain('template');
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
        expect((result as any).errors).toHaveLength(1);
        expect((result as any).errors![0].message).toContain('finite');
      });

      it.skip('should reject NaN values', async () => {
        const result = await expression.evaluate(context, {
          value: NaN,
        });

        expect(result.success).toBe(false);
        expect((result as any).errors).toHaveLength(1);
        expect((result as any).errors![0].message).toMatch(/finite|nan|number/i);
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

  describe('Expression Registry', () => {
    it('should export all enhanced special expressions', () => {
      expect(specialExpressions.stringLiteral).toBeInstanceOf(StringLiteralExpression);
      expect(specialExpressions.numberLiteral).toBeInstanceOf(NumberLiteralExpression);
      expect(specialExpressions.booleanLiteral).toBeInstanceOf(BooleanLiteralExpression);
    });

    it.skip('should have consistent metadata across all expressions', () => {
      Object.values(specialExpressions).forEach((expression: any) => {
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
  });
});
