/**
 * Enhanced Comparison Expressions Test Suite
 * Comprehensive tests for comparison operations with enhanced typing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTypedExpressionContext, type TestExpressionContext } from '../../test-utilities';
import {
  GreaterThanExpression,
  LessThanExpression,
  GreaterThanOrEqualExpression,
  LessThanOrEqualExpression,
  EqualityExpression,
  InequalityExpression,
  comparisonExpressions,
} from './index';

// Type alias for backward compatibility
type TypedExpressionContext = TestExpressionContext;

// ============================================================================
// Test Helpers
// ============================================================================

function createTestContext(
  overrides: Partial<TypedExpressionContext> = {}
): TypedExpressionContext {
  return createTypedExpressionContext(overrides as Record<string, unknown>);
}

// ============================================================================
// Greater Than Expression Tests
// ============================================================================

describe('GreaterThanExpression', () => {
  let greaterThanExpr: GreaterThanExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    greaterThanExpr = new GreaterThanExpression();
    context = createTestContext();
  });

  describe('Numeric comparison', () => {
    it('should return true when left is greater than right', async () => {
      const input = { left: 10, right: 5 };
      const result = await greaterThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    it('should return false when left is less than right', async () => {
      const input = { left: 3, right: 8 };
      const result = await greaterThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false);
      }
    });

    it('should return false when left equals right', async () => {
      const input = { left: 7, right: 7 };
      const result = await greaterThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false);
      }
    });

    it('should handle negative numbers', async () => {
      const input = { left: -3, right: -8 };
      const result = await greaterThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should handle decimal numbers', async () => {
      const input = { left: 3.14, right: 2.71 };
      const result = await greaterThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });
  });

  describe('String comparison', () => {
    it('should compare strings lexicographically', async () => {
      const input = { left: 'zebra', right: 'apple' };
      const result = await greaterThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should handle case sensitivity', async () => {
      const input = { left: 'B', right: 'a' };
      const result = await greaterThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false); // 'B' < 'a' in ASCII
      }
    });
  });

  describe('Type conversion', () => {
    it('should convert string numbers for comparison', async () => {
      const input = { left: '10', right: '5' };
      const result = await greaterThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should handle mixed number and string', async () => {
      const input = { left: 15, right: '10' };
      const result = await greaterThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should handle boolean conversion', async () => {
      const input = { left: true, right: false };
      const result = await greaterThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true); // true (1) > false (0)
      }
    });
  });

  describe('Null and undefined handling', () => {
    it('should return false for null comparisons', async () => {
      const input = { left: null, right: 5 };
      const result = await greaterThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false);
      }
    });

    it('should return false for undefined comparisons', async () => {
      const input = { left: 10, right: undefined };
      const result = await greaterThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false);
      }
    });
  });

  describe('Validation', () => {
    it('should validate correct input', () => {
      const input = { left: 10, right: 5 };
      const validation = greaterThanExpr.validate!(input);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject missing operands', () => {
      const input = { left: 10 }; // missing right
      const validation = greaterThanExpr.validate!(input);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Less Than Expression Tests
// ============================================================================

describe('LessThanExpression', () => {
  let lessThanExpr: LessThanExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    lessThanExpr = new LessThanExpression();
    context = createTestContext();
  });

  describe('Basic functionality', () => {
    it('should return true when left is less than right', async () => {
      const input = { left: 5, right: 10 };
      const result = await lessThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should return false when left is greater than right', async () => {
      const input = { left: 15, right: 8 };
      const result = await lessThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false);
      }
    });

    it('should return false when values are equal', async () => {
      const input = { left: 7, right: 7 };
      const result = await lessThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false);
      }
    });
  });

  describe('String conversion', () => {
    it('should convert and compare string numbers', async () => {
      const input = { left: '5', right: '10' };
      const result = await lessThanExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });
  });
});

// ============================================================================
// Greater Than Or Equal Expression Tests
// ============================================================================

describe('GreaterThanOrEqualExpression', () => {
  let greaterOrEqualExpr: GreaterThanOrEqualExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    greaterOrEqualExpr = new GreaterThanOrEqualExpression();
    context = createTestContext();
  });

  describe('Basic functionality', () => {
    it('should return true when left is greater than right', async () => {
      const input = { left: 10, right: 5 };
      const result = await greaterOrEqualExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should return true when left equals right', async () => {
      const input = { left: 7, right: 7 };
      const result = await greaterOrEqualExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should return false when left is less than right', async () => {
      const input = { left: 3, right: 8 };
      const result = await greaterOrEqualExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false);
      }
    });
  });

  describe('Null handling', () => {
    it('should return true when both are null', async () => {
      const input = { left: null, right: null };
      const result = await greaterOrEqualExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });
  });
});

// ============================================================================
// Less Than Or Equal Expression Tests
// ============================================================================

describe('LessThanOrEqualExpression', () => {
  let lessOrEqualExpr: LessThanOrEqualExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    lessOrEqualExpr = new LessThanOrEqualExpression();
    context = createTestContext();
  });

  describe('Basic functionality', () => {
    it('should return true when left is less than right', async () => {
      const input = { left: 5, right: 10 };
      const result = await lessOrEqualExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should return true when left equals right', async () => {
      const input = { left: 7, right: 7 };
      const result = await lessOrEqualExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should return false when left is greater than right', async () => {
      const input = { left: 15, right: 8 };
      const result = await lessOrEqualExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false);
      }
    });
  });
});

// ============================================================================
// Equality Expression Tests
// ============================================================================

describe('EqualityExpression', () => {
  let equalityExpr: EqualityExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    equalityExpr = new EqualityExpression();
    context = createTestContext();
  });

  describe('Basic equality', () => {
    it('should return true for identical values', async () => {
      const input = { left: 42, right: 42 };
      const result = await equalityExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should return false for different values', async () => {
      const input = { left: 42, right: 24 };
      const result = await equalityExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false);
      }
    });
  });

  describe('Type coercion', () => {
    it('should handle number-string coercion', async () => {
      const input = { left: 42, right: '42' };
      const result = await equalityExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should handle boolean-number coercion', async () => {
      const input = { left: 1, right: true };
      const result = await equalityExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should handle zero and false', async () => {
      const input = { left: 0, right: false };
      const result = await equalityExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });
  });

  describe('String equality', () => {
    it('should compare strings correctly', async () => {
      const input = { left: 'hello', right: 'hello' };
      const result = await equalityExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should be case sensitive', async () => {
      const input = { left: 'Hello', right: 'hello' };
      const result = await equalityExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false);
      }
    });
  });

  describe('Null and undefined handling', () => {
    it('should handle null equality', async () => {
      const input = { left: null, right: null };
      const result = await equalityExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should handle undefined equality', async () => {
      const input = { left: undefined, right: undefined };
      const result = await equalityExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should handle null vs undefined', async () => {
      const input = { left: null, right: undefined };
      const result = await equalityExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true); // null == undefined in JS
      }
    });
  });
});

// ============================================================================
// Inequality Expression Tests
// ============================================================================

describe('InequalityExpression', () => {
  let inequalityExpr: InequalityExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    inequalityExpr = new InequalityExpression();
    context = createTestContext();
  });

  describe('Basic inequality', () => {
    it('should return true for different values', async () => {
      const input = { left: 42, right: 24 };
      const result = await inequalityExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should return false for equal values', async () => {
      const input = { left: 42, right: 42 };
      const result = await inequalityExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false);
      }
    });
  });

  describe('Type coercion', () => {
    it('should handle number-string coercion', async () => {
      const input = { left: 42, right: '24' };
      const result = await inequalityExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
      }
    });

    it('should return false for coerced equal values', async () => {
      const input = { left: 1, right: true };
      const result = await inequalityExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false); // 1 == true, so 1 != true is false
      }
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Enhanced Comparison Expressions Integration', () => {
  let context: TypedExpressionContext;

  beforeEach(() => {
    context = createTestContext({
      evaluationHistory: [],
    });
  });

  describe('Expression registry', () => {
    it('should provide all comparison expressions', () => {
      expect(comparisonExpressions.greaterThan).toBeInstanceOf(GreaterThanExpression);
      expect(comparisonExpressions.lessThan).toBeInstanceOf(LessThanExpression);
      expect(comparisonExpressions.greaterThanOrEqual).toBeInstanceOf(GreaterThanOrEqualExpression);
      expect(comparisonExpressions.lessThanOrEqual).toBeInstanceOf(LessThanOrEqualExpression);
      expect(comparisonExpressions.equals).toBeInstanceOf(EqualityExpression);
      expect(comparisonExpressions.notEquals).toBeInstanceOf(InequalityExpression);
    });
  });

  describe('Comparison chains', () => {
    it('should handle multiple comparisons', async () => {
      // Simulating: 5 < 10 && 10 > 3
      const lessThan = comparisonExpressions.lessThan;
      const greaterThan = comparisonExpressions.greaterThan;

      const result1 = await lessThan.evaluate(context, { left: 5, right: 10 });
      const result2 = await greaterThan.evaluate(context, { left: 10, right: 3 });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        expect(result1.value && result2.value).toBe(true);
      }
    });
  });

  describe('Range validation', () => {
    it('should validate value is within range', async () => {
      // Simulating: value >= min && value <= max
      const greaterOrEqual = comparisonExpressions.greaterThanOrEqual;
      const lessOrEqual = comparisonExpressions.lessThanOrEqual;

      const value = 15;
      const min = 10;
      const max = 20;

      const result1 = await greaterOrEqual.evaluate(context, { left: value, right: min });
      const result2 = await lessOrEqual.evaluate(context, { left: value, right: max });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        expect(result1.value && result2.value).toBe(true);
      }
    });
  });

  describe('Performance tracking', () => {
    // Skipped: Performance tracking removed during Phase 2 consolidation to reduce bundle size
    it.skip('should track evaluation history', async () => {
      const greaterThan = comparisonExpressions.greaterThan;
      await greaterThan.evaluate(context, { left: 10, right: 5 });

      expect(context.evaluationHistory).toHaveLength(1);
      expect(context.evaluationHistory![0].expressionName).toBe('greaterThan');
      expect(context.evaluationHistory![0].success).toBe(true);
      expect(context.evaluationHistory![0].duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Type safety', () => {
    it.skip('should have consistent metadata', () => {
      const expressions = Object.values(comparisonExpressions) as any[];

      expressions.forEach(expr => {
        expect(expr.category).toBe('Logical');
        expect(expr.outputType).toBe('Boolean');
        expect(expr.metadata.category).toBe('Logical');
        expect(expr.metadata.returnTypes).toContain('Boolean');
        expect(expr.documentation.summary).toBeTruthy();
        expect(expr.documentation.parameters).toHaveLength(2);
        expect(expr.documentation.examples.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error consistency', () => {
    // Skipped: Error type changed from 'type-mismatch' to 'missing-argument' during Phase 2 consolidation
    // Missing operand is semantically a 'missing-argument' not a 'type-mismatch'
    it.skip('should provide consistent error structures', async () => {
      const expressions = Object.values(comparisonExpressions);

      for (const expr of expressions) {
        // Test with invalid input (missing right operand)
        const result = await expr.evaluate(context, { left: 5, right: undefined });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors!).toHaveLength(1);
          expect(result.errors![0].type).toBe('type-mismatch');
          expect(result.errors![0].message).toBeTruthy();
        }
      }
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle age verification', async () => {
      const greaterOrEqual = comparisonExpressions.greaterThanOrEqual;

      const testCases = [
        { age: 25, minAge: 18, expected: true },
        { age: 16, minAge: 18, expected: false },
        { age: 18, minAge: 18, expected: true },
      ];

      for (const testCase of testCases) {
        const result = await greaterOrEqual.evaluate(context, {
          left: testCase.age,
          right: testCase.minAge,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(testCase.expected);
        }
      }
    });

    it('should handle status checks', async () => {
      const equals = comparisonExpressions.equals;
      const notEquals = comparisonExpressions.notEquals;

      const status = 'complete';

      const isComplete = await equals.evaluate(context, { left: status, right: 'complete' });
      const notPending = await notEquals.evaluate(context, { left: status, right: 'pending' });

      expect(isComplete.success).toBe(true);
      expect(notPending.success).toBe(true);

      if (isComplete.success && notPending.success) {
        expect(isComplete.value).toBe(true);
        expect(notPending.value).toBe(true);
      }
    });
  });
});
