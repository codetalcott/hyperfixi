/**
 * Enhanced Not Expression Tests
 * Comprehensive testing of logical negation with TypeScript integration
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { NotExpression, createNotExpression, evaluateNot } from './index.ts';
import { createTypedExpressionContext, type TypedExpressionContext } from '../../test-utilities.ts';

describe('Enhanced Not Expression', () => {
  let notExpression: NotExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    notExpression = new NotExpression();
    context = createTypedExpressionContext();
  });

  describe('Input Validation', () => {
    test('validates correct input arguments', () => {
      const result = notExpression.validate([true]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validates any value type', () => {
      const testValues = [false, 0, '', null, undefined, [], {}, 'hello', 42];

      testValues.forEach(value => {
        const result = notExpression.validate([value]);
        expect(result.isValid).toBe(true);
      });
    });

    test('rejects missing arguments', () => {
      const result = notExpression.validate([]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('missing-argument');
    });
  });

  describe('Boolean Negation', () => {
    test('negates true to false', async () => {
      const result = await notExpression.evaluate(context, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
        expect(result.type).toBe('boolean');
      }
    });

    test('negates false to true', async () => {
      const result = await notExpression.evaluate(context, false);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });
  });

  describe('Truthiness Evaluation', () => {
    test('handles falsy values correctly', async () => {
      const falsyValues = [false, 0, -0, '', null, undefined];

      for (const value of falsyValues) {
        const result = await notExpression.evaluate(context, value);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(true); // not falsy = true
          expect(result.type).toBe('boolean');
        }
      }
    });

    test('handles truthy values correctly', async () => {
      const truthyValues = [true, 1, -1, 'hello', 'false', [], {}, [1, 2, 3], { key: 'value' }];

      for (const value of truthyValues) {
        const result = await notExpression.evaluate(context, value);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(false); // not truthy = false
          expect(result.type).toBe('boolean');
        }
      }
    });

    test('handles NaN correctly', async () => {
      const result = await notExpression.evaluate(context, NaN);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true); // not NaN = true (NaN is falsy)
        expect(result.type).toBe('boolean');
      }
    });

    test('handles BigInt values correctly', async () => {
      // 0n is falsy
      const result1 = await notExpression.evaluate(context, 0n);
      expect(result1.success).toBe(true);
      if (result1.success) {
        expect(result1.value).toBe(true);
      }

      // Other BigInt values are truthy
      const result2 = await notExpression.evaluate(context, 1n);
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.value).toBe(false);
      }
    });
  });

  describe('Array and Object Handling', () => {
    test('treats empty arrays as truthy', async () => {
      const result = await notExpression.evaluate(context, []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false); // not [] = false (arrays are truthy)
      }
    });

    test('treats non-empty arrays as truthy', async () => {
      const result = await notExpression.evaluate(context, [1, 2, 3]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false); // not [1,2,3] = false
      }
    });

    test('treats empty objects as truthy', async () => {
      const result = await notExpression.evaluate(context, {});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false); // not {} = false (objects are truthy)
      }
    });

    test('treats non-empty objects as truthy', async () => {
      const result = await notExpression.evaluate(context, { key: 'value' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false); // not {key: 'value'} = false
      }
    });
  });

  describe('Double Negation', () => {
    test('double negation returns original truthiness', async () => {
      // Test with truthy value
      const result1 = await notExpression.evaluate(context, 'hello');
      expect(result1.success).toBe(true);
      if (result1.success) {
        expect(result1.value).toBe(false); // not 'hello' = false
      }

      // Now negate the result (simulate "not not 'hello'")
      const result2 = await notExpression.evaluate(
        context,
        result1.success ? result1.value : false
      );
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.value).toBe(true); // not false = true
      }
    });

    test('double negation with falsy value', async () => {
      // Test with falsy value
      const result1 = await notExpression.evaluate(context, 0);
      expect(result1.success).toBe(true);
      if (result1.success) {
        expect(result1.value).toBe(true); // not 0 = true
      }

      // Now negate the result (simulate "not not 0")
      const result2 = await notExpression.evaluate(context, result1.success ? result1.value : true);
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.value).toBe(false); // not true = false
      }
    });
  });

  describe('String Handling', () => {
    test('handles non-empty strings as truthy', async () => {
      const result = await notExpression.evaluate(context, 'hello');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false); // not 'hello' = false
      }
    });

    test('handles empty string as falsy', async () => {
      const result = await notExpression.evaluate(context, '');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true); // not '' = true
      }
    });

    test('handles string "false" as truthy', async () => {
      const result = await notExpression.evaluate(context, 'false');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false); // not 'false' = false (string is truthy)
      }
    });

    test('handles string "0" as truthy', async () => {
      const result = await notExpression.evaluate(context, '0');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false); // not '0' = false (string is truthy)
      }
    });
  });

  describe('Number Handling', () => {
    test('handles positive numbers as truthy', async () => {
      const result = await notExpression.evaluate(context, 42);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false); // not 42 = false
      }
    });

    test('handles negative numbers as truthy', async () => {
      const result = await notExpression.evaluate(context, -42);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false); // not -42 = false
      }
    });

    test('handles zero as falsy', async () => {
      const result = await notExpression.evaluate(context, 0);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true); // not 0 = true
      }
    });

    test('handles negative zero as falsy', async () => {
      const result = await notExpression.evaluate(context, -0);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true); // not -0 = true
      }
    });
  });

  describe('Error Handling', () => {
    test('handles validation errors gracefully', async () => {
      const result = await notExpression.evaluate(context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('NotExpressionValidationError');
      }
    });
  });

  describe('Utility Functions', () => {
    test('factory function works correctly', () => {
      const notExpr = createNotExpression();
      expect(notExpr).toBeInstanceOf(NotExpression);
    });

    test('evaluateNot utility works', async () => {
      const result = await evaluateNot(true, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });

    test('metadata provides comprehensive information', () => {
      const metadata = notExpression.getMetadata();

      expect(metadata.name).toBe('NotExpression');
      expect(metadata.category).toBe('logical');
      expect(metadata.supportedFeatures).toContain('boolean negation');
      expect(metadata.supportedFeatures).toContain('truthiness evaluation');
      expect(metadata.capabilities.contextAware).toBe(false);
      expect(metadata.capabilities.supportsAsync).toBe(false);
    });
  });

  describe('LLM Documentation', () => {
    test('provides comprehensive documentation', () => {
      const docs = notExpression.documentation;

      expect(docs.summary).toContain('logical negation');
      expect(docs.parameters).toHaveLength(1);
      expect(docs.parameters[0].name).toBe('value');
      expect(docs.examples).toHaveLength(3);
      expect(docs.tags).toContain('logical');
      expect(docs.tags).toContain('negation');
    });
  });

  describe('Performance Characteristics', () => {
    test('handles many negations efficiently', async () => {
      const testValues = Array.from({ length: 1000 }, (_, i) => i % 2 === 0);

      const startTime = performance.now();

      const promises = testValues.map(value => notExpression.evaluate(context, value));

      const results = await Promise.all(promises);
      const endTime = performance.now();

      // All should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(!testValues[index]);
        }
      });

      // Should be very fast for many operations
      expect(endTime - startTime).toBeLessThan(50); // Less than 50ms for 1000 operations
    });
  });

  describe('Integration with Official Test Cases', () => {
    test('matches official "not true" behavior', async () => {
      const result = await notExpression.evaluate(context, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });

    test('matches official "not false" behavior', async () => {
      const result = await notExpression.evaluate(context, false);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });

    test('matches official double negation behavior', async () => {
      // Simulate "not not true"
      const result1 = await notExpression.evaluate(context, true);
      expect(result1.success).toBe(true);

      if (result1.success) {
        const result2 = await notExpression.evaluate(context, result1.value);
        expect(result2.success).toBe(true);

        if (result2.success) {
          expect(result2.value).toBe(true); // not not true = true
        }
      }
    });
  });
});
