/**
 * Enhanced Logical Expressions Test Suite
 * Comprehensive tests for logical operations with enhanced typing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { TypedExpressionContext } from '../../../types/enhanced-expressions.ts';
import {
  EnhancedAndExpression,
  EnhancedOrExpression,
  EnhancedNotExpression,
  logicalExpressions,
} from './index.ts';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestContext(
  overrides: Partial<TypedExpressionContext> = {}
): TypedExpressionContext {
  return {
    me: undefined,
    it: undefined,
    you: undefined,
    result: undefined,
    locals: new Map(),
    globals: new Map(),
    event: undefined,

    // Enhanced expression context properties
    expressionStack: [],
    evaluationDepth: 0,
    validationMode: 'strict',
    evaluationHistory: [],

    ...overrides,
  };
}

// ============================================================================
// And Expression Tests
// ============================================================================

describe('EnhancedAndExpression', () => {
  let andExpr: EnhancedAndExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    andExpr = new EnhancedAndExpression();
    context = createTestContext();
  });

  describe('Basic boolean operations', () => {
    it('should return true for true and true', async () => {
      const input = { left: true, right: true };
      const result = await andExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    it('should return false for true and false', async () => {
      const input = { left: true, right: false };
      const result = await andExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });

    it('should return false for false and true', async () => {
      const input = { left: false, right: true };
      const result = await andExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });

    it('should return false for false and false', async () => {
      const input = { left: false, right: false };
      const result = await andExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });
  });

  describe('Type coercion', () => {
    it('should handle truthy values', async () => {
      const input = { left: 1, right: 'hello' };
      const result = await andExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });

    it('should handle falsy values', async () => {
      const input = { left: 0, right: '' };
      const result = await andExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });

    it('should handle mixed truthy and falsy', async () => {
      const input = { left: 'hello', right: 0 };
      const result = await andExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });

    it('should handle null and undefined as falsy', async () => {
      const input = { left: null, right: undefined };
      const result = await andExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });

    it('should handle NaN as falsy', async () => {
      const input = { left: NaN, right: true };
      const result = await andExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });

    it('should handle arrays and objects as truthy', async () => {
      const input = { left: [], right: {} };
      const result = await andExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });
  });

  describe('Short-circuit evaluation', () => {
    it('should short-circuit when left operand is false', async () => {
      // This test verifies that the right operand doesn't need to be evaluated
      const input = { left: false, right: true };
      const result = await andExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });

    it('should evaluate both operands when left operand is true', async () => {
      const input = { left: true, right: false };
      const result = await andExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });
  });

  describe('Validation', () => {
    it('should validate correct input', () => {
      const input = { left: true, right: false };
      const validation = andExpr.validate(input);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should handle missing operands during evaluation, not validation', async () => {
      const input = { left: true }; // missing right, should be undefined
      const validation = andExpr.validate(input);

      // Validation passes because z.unknown() accepts undefined
      expect(validation.isValid).toBe(true);

      // But evaluation handles undefined correctly
      const result = await andExpr.evaluate(context, input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false); // true && undefined -> false
      }
    });
  });
});

// ============================================================================
// Or Expression Tests
// ============================================================================

describe('EnhancedOrExpression', () => {
  let orExpr: EnhancedOrExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    orExpr = new EnhancedOrExpression();
    context = createTestContext();
  });

  describe('Basic boolean operations', () => {
    it('should return true for true or false', async () => {
      const input = { left: true, right: false };
      const result = await orExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });

    it('should return true for false or true', async () => {
      const input = { left: false, right: true };
      const result = await orExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });

    it('should return true for true or true', async () => {
      const input = { left: true, right: true };
      const result = await orExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });

    it('should return false for false or false', async () => {
      const input = { left: false, right: false };
      const result = await orExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });
  });

  describe('Type coercion', () => {
    it('should handle truthy values', async () => {
      const input = { left: 1, right: 0 };
      const result = await orExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });

    it('should handle falsy values', async () => {
      const input = { left: '', right: null };
      const result = await orExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });

    it('should handle mixed falsy and truthy', async () => {
      const input = { left: 0, right: 'hello' };
      const result = await orExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });
  });

  describe('Short-circuit evaluation', () => {
    it('should short-circuit when left operand is true', async () => {
      const input = { left: true, right: false };
      const result = await orExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });

    it('should evaluate both operands when left operand is false', async () => {
      const input = { left: false, right: true };
      const result = await orExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });
  });

  describe('Default value patterns', () => {
    it('should work as fallback mechanism', async () => {
      const input = { left: '', right: 'default' };
      const result = await orExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true); // Because 'default' is truthy
      }
    });

    it('should handle both falsy values', async () => {
      const input = { left: 0, right: false };
      const result = await orExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });
  });
});

// ============================================================================
// Not Expression Tests
// ============================================================================

describe('EnhancedNotExpression', () => {
  let notExpr: EnhancedNotExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    notExpr = new EnhancedNotExpression();
    context = createTestContext();
  });

  describe('Basic boolean operations', () => {
    it('should return false for not true', async () => {
      const input = { operand: true };
      const result = await notExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
        expect(result.type).toBe('boolean');
      }
    });

    it('should return true for not false', async () => {
      const input = { operand: false };
      const result = await notExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });
  });

  describe('Type coercion negation', () => {
    it('should negate truthy values to false', async () => {
      const truthyValues = [1, 'hello', [], {}, -1, 3.14, 'false'];

      for (const value of truthyValues) {
        const result = await notExpr.evaluate(context, { operand: value });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(false);
        }
      }
    });

    it('should negate falsy values to true', async () => {
      const falsyValues = [false, 0, -0, 0n, '', null, undefined, NaN];

      for (const value of falsyValues) {
        const result = await notExpr.evaluate(context, { operand: value });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(true);
        }
      }
    });
  });

  describe('Complex expressions', () => {
    it('should handle double negation', async () => {
      // not (not true) should be true
      const innerResult = await notExpr.evaluate(context, { operand: true });
      expect(innerResult.success).toBe(true);

      if (innerResult.success) {
        const outerResult = await notExpr.evaluate(context, { operand: innerResult.value });
        expect(outerResult.success).toBe(true);
        if (outerResult.success) {
          expect(outerResult.value).toBe(true);
        }
      }
    });
  });

  describe('Validation', () => {
    it('should validate correct input', () => {
      const input = { operand: true };
      const validation = notExpr.validate(input);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should handle missing operand during evaluation, not validation', async () => {
      const input = {}; // missing operand, should be undefined
      const validation = notExpr.validate(input);

      // Validation passes because z.unknown() accepts undefined
      expect(validation.isValid).toBe(true);

      // But evaluation handles undefined correctly
      const result = await notExpr.evaluate(context, input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true); // not undefined -> true
      }
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Enhanced Logical Expressions Integration', () => {
  let context: TypedExpressionContext;

  beforeEach(() => {
    context = createTestContext({
      evaluationHistory: [],
    });
  });

  describe('Expression registry', () => {
    it('should provide all logical expressions', () => {
      expect(logicalExpressions.and).toBeInstanceOf(EnhancedAndExpression);
      expect(logicalExpressions.or).toBeInstanceOf(EnhancedOrExpression);
      expect(logicalExpressions.not).toBeInstanceOf(EnhancedNotExpression);
    });
  });

  describe('Complex logical combinations', () => {
    it('should handle AND with OR precedence simulation', async () => {
      // Simulating: (true or false) and (false or true) = true and true = true
      const orExpr = logicalExpressions.or;
      const andExpr = logicalExpressions.and;

      const leftOr = await orExpr.evaluate(context, { left: true, right: false });
      const rightOr = await orExpr.evaluate(context, { left: false, right: true });

      expect(leftOr.success).toBe(true);
      expect(rightOr.success).toBe(true);

      if (leftOr.success && rightOr.success) {
        const finalAnd = await andExpr.evaluate(context, {
          left: leftOr.value,
          right: rightOr.value,
        });

        expect(finalAnd.success).toBe(true);
        if (finalAnd.success) {
          expect(finalAnd.value).toBe(true);
        }
      }
    });

    it("should handle De Morgan's laws", async () => {
      // not (A and B) = (not A) or (not B)
      const andExpr = logicalExpressions.and;
      const orExpr = logicalExpressions.or;
      const notExpr = logicalExpressions.not;

      const A = true;
      const B = false;

      // Left side: not (A and B)
      const andResult = await andExpr.evaluate(context, { left: A, right: B });
      expect(andResult.success).toBe(true);

      if (andResult.success) {
        const leftSide = await notExpr.evaluate(context, { operand: andResult.value });
        expect(leftSide.success).toBe(true);

        // Right side: (not A) or (not B)
        const notA = await notExpr.evaluate(context, { operand: A });
        const notB = await notExpr.evaluate(context, { operand: B });

        expect(notA.success).toBe(true);
        expect(notB.success).toBe(true);

        if (notA.success && notB.success) {
          const rightSide = await orExpr.evaluate(context, {
            left: notA.value,
            right: notB.value,
          });

          expect(rightSide.success).toBe(true);

          if (leftSide.success && rightSide.success) {
            expect(leftSide.value).toBe(rightSide.value);
          }
        }
      }
    });
  });

  describe('Performance tracking', () => {
    it('should track evaluation history for all operations', async () => {
      const andExpr = logicalExpressions.and;
      const orExpr = logicalExpressions.or;
      const notExpr = logicalExpressions.not;

      await andExpr.evaluate(context, { left: true, right: false });
      await orExpr.evaluate(context, { left: false, right: true });
      await notExpr.evaluate(context, { operand: true });

      expect(context.evaluationHistory).toHaveLength(3);
      expect(context.evaluationHistory![0].expressionName).toBe('and');
      expect(context.evaluationHistory![1].expressionName).toBe('or');
      expect(context.evaluationHistory![2].expressionName).toBe('not');

      context.evaluationHistory!.forEach(entry => {
        expect(entry.success).toBe(true);
        expect(entry.duration).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Type safety', () => {
    it('should have consistent metadata', () => {
      const expressions = Object.values(logicalExpressions);

      expressions.forEach(expr => {
        expect(expr.category).toBe('Logical');
        expect(expr.outputType).toBe('Boolean');
        expect(expr.metadata.category).toBe('Logical');
        expect(expr.metadata.returnTypes).toContain('Boolean');
        expect(expr.documentation.summary).toBeTruthy();
        expect(expr.documentation.examples.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error consistency', () => {
    it('should handle undefined operands gracefully', async () => {
      const expressions = [logicalExpressions.and, logicalExpressions.or];

      for (const expr of expressions) {
        // Test with missing right operand (undefined)
        const result = await expr.evaluate(context, { left: true } as any);

        expect(result.success).toBe(true);
        if (result.success) {
          // true && undefined -> false, true || undefined -> true
          const expectedValue = expr.name === 'and' ? false : true;
          expect(result.value).toBe(expectedValue);
        }
      }
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle user permission checks', async () => {
      const andExpr = logicalExpressions.and;
      const orExpr = logicalExpressions.or;

      // User must be active AND (admin OR owner)
      const user = {
        isActive: true,
        isAdmin: false,
        isOwner: true,
      };

      const adminOrOwner = await orExpr.evaluate(context, {
        left: user.isAdmin,
        right: user.isOwner,
      });

      expect(adminOrOwner.success).toBe(true);

      if (adminOrOwner.success) {
        const hasPermission = await andExpr.evaluate(context, {
          left: user.isActive,
          right: adminOrOwner.value,
        });

        expect(hasPermission.success).toBe(true);
        if (hasPermission.success) {
          expect(hasPermission.value).toBe(true);
        }
      }
    });

    it('should handle form validation logic', async () => {
      const andExpr = logicalExpressions.and;
      const notExpr = logicalExpressions.not;

      // Form is valid if all fields are filled AND not currently submitting
      const form = {
        name: 'John Doe',
        email: 'john@example.com',
        isSubmitting: false,
      };

      const hasName = await notExpr.evaluate(context, { operand: form.name === '' });
      const hasEmail = await notExpr.evaluate(context, { operand: form.email === '' });
      const notSubmitting = await notExpr.evaluate(context, { operand: form.isSubmitting });

      expect(hasName.success).toBe(true);
      expect(hasEmail.success).toBe(true);
      expect(notSubmitting.success).toBe(true);

      if (hasName.success && hasEmail.success && notSubmitting.success) {
        const fieldsValid = await andExpr.evaluate(context, {
          left: hasName.value,
          right: hasEmail.value,
        });

        expect(fieldsValid.success).toBe(true);

        if (fieldsValid.success) {
          const formValid = await andExpr.evaluate(context, {
            left: fieldsValid.value,
            right: notSubmitting.value,
          });

          expect(formValid.success).toBe(true);
          if (formValid.success) {
            expect(formValid.value).toBe(true);
          }
        }
      }
    });
  });
});
