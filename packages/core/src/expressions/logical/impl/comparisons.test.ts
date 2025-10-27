/**
 * Tests for Enhanced Comparison Expressions
 * Comprehensive test suite for comparison operators (==, !=, >, <, >=, <=)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTypedExecutionContext } from '../../test-setup';
import type { TypedExpressionContext } from '../../../types/expression-types';
import {
  EnhancedEqualsExpression,
  EnhancedNotEqualsExpression,
  EnhancedGreaterThanExpression,
  EnhancedLessThanExpression,
  EnhancedGreaterThanOrEqualExpression,
  EnhancedLessThanOrEqualExpression,
  comparisonExpressions
} from './comparisons';

describe('Enhanced Comparison Expressions', () => {
  let context: TypedExpressionContext;

  beforeEach(() => {
    context = createTypedExecutionContext();
  });

  describe('EnhancedEqualsExpression', () => {
    let expression: EnhancedEqualsExpression;

    beforeEach(() => {
      expression = new EnhancedEqualsExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('equals');
      expect(expression.category).toBe('Logical');
      expect(expression.syntax).toBe('left == right');
      expect(expression.outputType).toBe('Boolean');
      expect(expression.description).toContain('Equality comparison');
    });

    it('should compare equal numbers', async () => {
      const result = await expression.evaluate(context, {
        left: 5,
        operator: '==',
        right: 5
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    it('should compare different numbers', async () => {
      const result = await expression.evaluate(context, {
        left: 5,
        operator: '==',
        right: 3
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
        expect(result.type).toBe('boolean');
      }
    });

    it('should perform type coercion', async () => {
      const result = await expression.evaluate(context, {
        left: 5,
        operator: '==',
        right: '5'
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    it('should compare strings', async () => {
      const result = await expression.evaluate(context, {
        left: 'hello',
        operator: '==',
        right: 'hello'
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    it('should compare booleans', async () => {
      const result = await expression.evaluate(context, {
        left: true,
        operator: '==',
        right: true
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    it('should validate correct operator', () => {
      const validResult = expression.validate({
        left: 5,
        operator: '==',
        right: 5
      });
      
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
    });

    it('should reject invalid operator', () => {
      const invalidResult = expression.validate({
        left: 5,
        operator: '!=',
        right: 5
      });
      
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(1);
      expect(invalidResult.errors[0].message).toContain('expects == operator');
    });

    it('should track performance', async () => {
      const initialHistoryLength = context.evaluationHistory.length;
      
      await expression.evaluate(context, {
        left: 5,
        operator: '==',
        right: 5
      });
      
      expect(context.evaluationHistory.length).toBe(initialHistoryLength + 1);
      
      const evaluation = context.evaluationHistory[context.evaluationHistory.length - 1];
      expect(evaluation.expressionName).toBe('equals');
      expect(evaluation.category).toBe('Logical');
      expect(evaluation.success).toBe(true);
      expect(evaluation.duration).toBeGreaterThanOrEqual(0);
    });

    it('should have comprehensive documentation', () => {
      expect(expression.documentation.summary).toContain('equality comparison');
      expect(expression.documentation.parameters).toHaveLength(2);
      expect(expression.documentation.returns.type).toBe('boolean');
      expect(expression.documentation.examples.length).toBeGreaterThan(0);
      expect(expression.documentation.tags).toContain('comparison');
    });
  });

  describe('EnhancedNotEqualsExpression', () => {
    let expression: EnhancedNotEqualsExpression;

    beforeEach(() => {
      expression = new EnhancedNotEqualsExpression();
    });

    it('should compare different numbers', async () => {
      const result = await expression.evaluate(context, {
        left: 5,
        operator: '!=',
        right: 3
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    it('should compare equal numbers', async () => {
      const result = await expression.evaluate(context, {
        left: 5,
        operator: '!=',
        right: 5
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
        expect(result.type).toBe('boolean');
      }
    });

    it('should perform type coercion for inequality', async () => {
      const result = await expression.evaluate(context, {
        left: 5,
        operator: '!=',
        right: '3'
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });
  });

  describe('EnhancedGreaterThanExpression', () => {
    let expression: EnhancedGreaterThanExpression;

    beforeEach(() => {
      expression = new EnhancedGreaterThanExpression();
    });

    it('should compare greater numbers', async () => {
      const result = await expression.evaluate(context, {
        left: 10,
        operator: '>',
        right: 5
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    it('should compare lesser numbers', async () => {
      const result = await expression.evaluate(context, {
        left: 3,
        operator: '>',
        right: 5
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
        expect(result.type).toBe('boolean');
      }
    });

    it('should compare equal numbers', async () => {
      const result = await expression.evaluate(context, {
        left: 5,
        operator: '>',
        right: 5
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
        expect(result.type).toBe('boolean');
      }
    });

    it('should compare strings lexicographically', async () => {
      const result = await expression.evaluate(context, {
        left: 'banana',
        operator: '>',
        right: 'apple'
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    it('should perform numeric type coercion', async () => {
      const result = await expression.evaluate(context, {
        left: '10',
        operator: '>',
        right: 5
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });
  });

  describe('EnhancedLessThanExpression', () => {
    let expression: EnhancedLessThanExpression;

    beforeEach(() => {
      expression = new EnhancedLessThanExpression();
    });

    it('should compare lesser numbers', async () => {
      const result = await expression.evaluate(context, {
        left: 3,
        operator: '<',
        right: 5
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    it('should compare greater numbers', async () => {
      const result = await expression.evaluate(context, {
        left: 10,
        operator: '<',
        right: 5
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
        expect(result.type).toBe('boolean');
      }
    });
  });

  describe('EnhancedGreaterThanOrEqualExpression', () => {
    let expression: EnhancedGreaterThanOrEqualExpression;

    beforeEach(() => {
      expression = new EnhancedGreaterThanOrEqualExpression();
    });

    it('should compare greater numbers', async () => {
      const result = await expression.evaluate(context, {
        left: 10,
        operator: '>=',
        right: 5
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    it('should compare equal numbers', async () => {
      const result = await expression.evaluate(context, {
        left: 5,
        operator: '>=',
        right: 5
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    it('should compare lesser numbers', async () => {
      const result = await expression.evaluate(context, {
        left: 3,
        operator: '>=',
        right: 5
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
        expect(result.type).toBe('boolean');
      }
    });
  });

  describe('EnhancedLessThanOrEqualExpression', () => {
    let expression: EnhancedLessThanOrEqualExpression;

    beforeEach(() => {
      expression = new EnhancedLessThanOrEqualExpression();
    });

    it('should compare lesser numbers', async () => {
      const result = await expression.evaluate(context, {
        left: 3,
        operator: '<=',
        right: 5
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    it('should compare equal numbers', async () => {
      const result = await expression.evaluate(context, {
        left: 5,
        operator: '<=',
        right: 5
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    it('should compare greater numbers', async () => {
      const result = await expression.evaluate(context, {
        left: 10,
        operator: '<=',
        right: 5
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
        expect(result.type).toBe('boolean');
      }
    });
  });

  describe('Expression Registry', () => {
    it('should export all enhanced comparison expressions', () => {
      expect(comparisonExpressions.equals).toBeInstanceOf(EnhancedEqualsExpression);
      expect(comparisonExpressions.notEquals).toBeInstanceOf(EnhancedNotEqualsExpression);
      expect(comparisonExpressions.greaterThan).toBeInstanceOf(EnhancedGreaterThanExpression);
      expect(comparisonExpressions.lessThan).toBeInstanceOf(EnhancedLessThanExpression);
      expect(comparisonExpressions.greaterThanOrEqual).toBeInstanceOf(EnhancedGreaterThanOrEqualExpression);
      expect(comparisonExpressions.lessThanOrEqual).toBeInstanceOf(EnhancedLessThanOrEqualExpression);
    });

    it('should have consistent metadata across all expressions', () => {
      Object.values(comparisonExpressions).forEach(expression => {
        expect(expression.category).toBe('Logical');
        expect(expression.name).toBeTruthy();
        expect(expression.syntax).toBeTruthy();
        expect(expression.description).toBeTruthy();
        expect(expression.metadata).toBeTruthy();
        expect(expression.documentation).toBeTruthy();
        expect(expression.inputSchema).toBeTruthy();
        expect(expression.outputType).toBe('Boolean');
      });
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle mixed type comparisons gracefully', async () => {
      const expression = new EnhancedEqualsExpression();
      
      // Test various mixed type scenarios
      const testCases = [
        { left: null, right: undefined, expected: true }, // null == undefined
        { left: 0, right: false, expected: true }, // 0 == false
        { left: 1, right: true, expected: true }, // 1 == true
        { left: '', right: false, expected: true }, // '' == false
        { left: 'hello', right: false, expected: false }, // 'hello' == false
      ];

      for (const testCase of testCases) {
        const result = await expression.evaluate(context, {
          left: testCase.left,
          operator: '==',
          right: testCase.right
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(testCase.expected);
        }
      }
    });

    it('should validate input structure correctly', () => {
      const expression = new EnhancedEqualsExpression();
      
      // Valid input
      const validResult = expression.validate({
        left: 5,
        operator: '==',
        right: 5
      });
      expect(validResult.isValid).toBe(true);

      // Missing properties
      const missingResult = expression.validate({
        left: 5
        // missing operator and right
      });
      expect(missingResult.isValid).toBe(false);

      // Invalid operator
      const invalidOpResult = expression.validate({
        left: 5,
        operator: 'invalid',
        right: 5
      });
      expect(invalidOpResult.isValid).toBe(false);
    });

    it('should provide helpful error messages', async () => {
      const expression = new EnhancedEqualsExpression();
      
      // Test invalid input
      const result = await expression.evaluate(context, {
        left: 5,
        operator: '!=', // Wrong operator for equals expression
        right: 5
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.suggestions.length).toBeGreaterThan(0);
      }
    });

    it('should complete evaluations quickly', async () => {
      const expression = new EnhancedGreaterThanExpression();
      
      const startTime = Date.now();
      await expression.evaluate(context, {
        left: 100,
        operator: '>',
        right: 50
      });
      const duration = Date.now() - startTime;
      
      // Should complete very quickly (less than 10ms)
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle NaN comparisons', async () => {
      const expression = new EnhancedEqualsExpression();
      
      const result = await expression.evaluate(context, {
        left: NaN,
        operator: '==',
        right: NaN
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        // NaN == NaN is false in JavaScript
        expect(result.value).toBe(false);
      }
    });

    it('should handle infinity comparisons', async () => {
      const expression = new EnhancedGreaterThanExpression();
      
      const result = await expression.evaluate(context, {
        left: Infinity,
        operator: '>',
        right: 1000000
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });

    it('should handle object comparisons', async () => {
      const expression = new EnhancedEqualsExpression();
      
      const obj1 = { a: 1 };
      const obj2 = { a: 1 };
      
      const result = await expression.evaluate(context, {
        left: obj1,
        operator: '==',
        right: obj2
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Objects are compared by reference, not value
        expect(result.value).toBe(false);
      }
    });
  });
});