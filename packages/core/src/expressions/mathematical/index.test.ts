/**
 * Enhanced Mathematical Expressions Test Suite
 * Comprehensive tests for arithmetic operations with enhanced typing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { TypedExpressionContext } from '../../types/enhanced-expressions.ts';
import {
  AdditionExpression,
  SubtractionExpression,
  MultiplicationExpression,
  DivisionExpression,
  ModuloExpression,
  mathematicalExpressions,
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
// Addition Expression Tests
// ============================================================================

describe('AdditionExpression', () => {
  let additionExpr: AdditionExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    additionExpr = new AdditionExpression();
    context = createTestContext();
  });

  describe('Basic functionality', () => {
    it('should add two positive numbers', async () => {
      const input = { left: 5, right: 3 };
      const result = await additionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(8);
        expect(result.type).toBe('number');
      }
    });

    it('should add positive and negative numbers', async () => {
      const input = { left: 10, right: -3 };
      const result = await additionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(7);
      }
    });

    it('should add decimal numbers', async () => {
      const input = { left: 2.5, right: 1.25 };
      const result = await additionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(3.75);
      }
    });

    it('should handle zero addition', async () => {
      const input = { left: 42, right: 0 };
      const result = await additionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(42);
      }
    });
  });

  describe('String number conversion', () => {
    it('should convert string numbers and add them', async () => {
      const input = { left: '10', right: '20' };
      const result = await additionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(30);
      }
    });

    it('should convert mixed string and number', async () => {
      const input = { left: '15', right: 25 };
      const result = await additionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(40);
      }
    });

    it('should convert boolean values', async () => {
      const input = { left: true, right: false };
      const result = await additionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(1); // true=1, false=0
      }
    });
  });

  describe('Error handling', () => {
    it('should handle invalid string conversion', async () => {
      const input = { left: 'not-a-number', right: 5 };
      const result = await additionExpr.evaluate(context, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].type).toBe('runtime-error');
        expect(result.errors[0].message).toContain('cannot be converted to number');
      }
    });

    it('should handle null values', async () => {
      const input = { left: null, right: 5 };
      const result = await additionExpr.evaluate(context, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].message).toContain('null or undefined');
      }
    });

    it('should handle undefined values', async () => {
      const input = { left: 10, right: undefined };
      const result = await additionExpr.evaluate(context, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].message).toContain('null or undefined');
      }
    });

    it('should handle non-finite results', async () => {
      const input = { left: Number.MAX_VALUE, right: Number.MAX_VALUE };
      const result = await additionExpr.evaluate(context, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].message).toContain('non-finite value');
      }
    });
  });

  describe('Validation', () => {
    it('should validate correct input', () => {
      const input = { left: 5, right: 3 };
      const validation = additionExpr.validate(input);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject missing operands', () => {
      const input = { left: 5 }; // missing right
      const validation = additionExpr.validate(input);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should reject non-numeric strings', () => {
      const input = { left: 'abc', right: 5 };
      const validation = additionExpr.validate(input);

      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].message).toContain('cannot be converted to number');
    });
  });
});

// ============================================================================
// Subtraction Expression Tests
// ============================================================================

describe('SubtractionExpression', () => {
  let subtractionExpr: SubtractionExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    subtractionExpr = new SubtractionExpression();
    context = createTestContext();
  });

  describe('Basic functionality', () => {
    it('should subtract two positive numbers', async () => {
      const input = { left: 10, right: 3 };
      const result = await subtractionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(7);
      }
    });

    it('should handle negative results', async () => {
      const input = { left: 5, right: 8 };
      const result = await subtractionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(-3);
      }
    });

    it('should subtract decimal numbers', async () => {
      const input = { left: 5.75, right: 2.25 };
      const result = await subtractionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(3.5);
      }
    });

    it('should handle zero subtraction', async () => {
      const input = { left: 42, right: 0 };
      const result = await subtractionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(42);
      }
    });
  });

  describe('String conversion', () => {
    it('should convert and subtract string numbers', async () => {
      const input = { left: '100', right: '25' };
      const result = await subtractionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(75);
      }
    });
  });
});

// ============================================================================
// Multiplication Expression Tests
// ============================================================================

describe('MultiplicationExpression', () => {
  let multiplicationExpr: MultiplicationExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    multiplicationExpr = new MultiplicationExpression();
    context = createTestContext();
  });

  describe('Basic functionality', () => {
    it('should multiply two positive numbers', async () => {
      const input = { left: 6, right: 7 };
      const result = await multiplicationExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(42);
      }
    });

    it('should handle multiplication by zero', async () => {
      const input = { left: 42, right: 0 };
      const result = await multiplicationExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(0);
      }
    });

    it('should multiply negative numbers', async () => {
      const input = { left: -3, right: 4 };
      const result = await multiplicationExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(-12);
      }
    });

    it('should multiply decimal numbers', async () => {
      const input = { left: 2.5, right: 4 };
      const result = await multiplicationExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(10);
      }
    });
  });

  describe('String conversion', () => {
    it('should convert and multiply string numbers', async () => {
      const input = { left: '12', right: '5' };
      const result = await multiplicationExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(60);
      }
    });
  });
});

// ============================================================================
// Division Expression Tests
// ============================================================================

describe('DivisionExpression', () => {
  let divisionExpr: DivisionExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    divisionExpr = new DivisionExpression();
    context = createTestContext();
  });

  describe('Basic functionality', () => {
    it('should divide two numbers evenly', async () => {
      const input = { left: 15, right: 3 };
      const result = await divisionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(5);
      }
    });

    it('should divide with decimal result', async () => {
      const input = { left: 10, right: 4 };
      const result = await divisionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(2.5);
      }
    });

    it('should handle negative division', async () => {
      const input = { left: -12, right: 3 };
      const result = await divisionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(-4);
      }
    });
  });

  describe('Division by zero handling', () => {
    it('should return Infinity for division by zero (JavaScript behavior)', async () => {
      const input = { left: 10, right: 0 };
      const result = await divisionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(Infinity);
      }
    });

    it('should return Infinity for string zero division (JavaScript behavior)', async () => {
      const input = { left: 10, right: '0' };
      const result = await divisionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(Infinity);
      }
    });
  });

  describe('String conversion', () => {
    it('should convert and divide string numbers', async () => {
      const input = { left: '20', right: '4' };
      const result = await divisionExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(5);
      }
    });
  });
});

// ============================================================================
// Modulo Expression Tests
// ============================================================================

describe('ModuloExpression', () => {
  let moduloExpr: ModuloExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    moduloExpr = new ModuloExpression();
    context = createTestContext();
  });

  describe('Basic functionality', () => {
    it('should calculate remainder correctly', async () => {
      const input = { left: 10, right: 3 };
      const result = await moduloExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(1);
      }
    });

    it('should return zero for exact division', async () => {
      const input = { left: 15, right: 5 };
      const result = await moduloExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(0);
      }
    });

    it('should handle negative numbers', async () => {
      const input = { left: -10, right: 3 };
      const result = await moduloExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(-1);
      }
    });

    it('should handle decimal numbers', async () => {
      const input = { left: 5.5, right: 2 };
      const result = await moduloExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(1.5);
      }
    });
  });

  describe('Modulo by zero protection', () => {
    it('should prevent modulo by zero', async () => {
      const input = { left: 10, right: 0 };
      const result = await moduloExpr.evaluate(context, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].type).toBe('runtime-error');
        expect(result.errors[0].message).toContain('Modulo by zero');
      }
    });
  });

  describe('String conversion', () => {
    it('should convert and calculate modulo of string numbers', async () => {
      const input = { left: '17', right: '5' };
      const result = await moduloExpr.evaluate(context, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(2);
      }
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Enhanced Mathematical Expressions Integration', () => {
  let context: TypedExpressionContext;

  beforeEach(() => {
    context = createTestContext({
      evaluationHistory: [],
    });
  });

  describe('Expression registry', () => {
    it('should provide all mathematical expressions', () => {
      expect(mathematicalExpressions.addition).toBeInstanceOf(AdditionExpression);
      expect(mathematicalExpressions.subtraction).toBeInstanceOf(SubtractionExpression);
      expect(mathematicalExpressions.multiplication).toBeInstanceOf(
        MultiplicationExpression
      );
      expect(mathematicalExpressions.division).toBeInstanceOf(DivisionExpression);
      expect(mathematicalExpressions.modulo).toBeInstanceOf(ModuloExpression);
    });
  });

  describe('Complex calculations', () => {
    it('should handle sequential operations', async () => {
      // Simulating: (5 + 3) * 2 - 1 = 15
      const addition = mathematicalExpressions.addition;
      const multiplication = mathematicalExpressions.multiplication;
      const subtraction = mathematicalExpressions.subtraction;

      // Step 1: 5 + 3 = 8
      const addResult = await addition.evaluate(context, { left: 5, right: 3 });
      expect(addResult.success).toBe(true);

      if (addResult.success) {
        // Step 2: 8 * 2 = 16
        const mulResult = await multiplication.evaluate(context, {
          left: addResult.value,
          right: 2,
        });
        expect(mulResult.success).toBe(true);

        if (mulResult.success) {
          // Step 3: 16 - 1 = 15
          const subResult = await subtraction.evaluate(context, {
            left: mulResult.value,
            right: 1,
          });
          expect(subResult.success).toBe(true);

          if (subResult.success) {
            expect(subResult.value).toBe(15);
          }
        }
      }
    });
  });

  describe('Performance tracking', () => {
    it('should track evaluation history', async () => {
      const addition = mathematicalExpressions.addition;
      await addition.evaluate(context, { left: 10, right: 5 });

      expect(context.evaluationHistory).toHaveLength(1);
      expect(context.evaluationHistory![0].expressionName).toBe('addition');
      expect(context.evaluationHistory![0].success).toBe(true);
      expect(context.evaluationHistory![0].duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Type safety', () => {
    it('should have consistent metadata', () => {
      const expressions = Object.values(mathematicalExpressions);

      expressions.forEach(expr => {
        expect(expr.category).toBe('Special');
        expect(expr.outputType).toBe('Number');
        expect(expr.metadata.category).toBe('Special');
        expect(expr.metadata.returnTypes).toContain('Number');
        expect(expr.documentation.summary).toBeTruthy();
        expect(expr.documentation.parameters).toHaveLength(2);
        expect(expr.documentation.examples.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error consistency', () => {
    it('should provide consistent error structures', async () => {
      const expressions = Object.values(mathematicalExpressions);

      for (const expr of expressions) {
        const result = await expr.evaluate(context, { left: 'invalid', right: 5 });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].type).toBe('runtime-error');
          expect(result.errors[0].message).toBeTruthy();
          expect(result.suggestions).toHaveLength(0);
        }
      }
    });
  });
});
