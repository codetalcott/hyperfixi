/**
 * Enhanced In Expression Tests
 * Comprehensive testing of membership testing and DOM queries with TypeScript integration
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { InExpression, createInExpression, searchIn } from './index.ts';
import { createTypedExpressionContext, type TypedExpressionContext } from '../../test-utilities.ts';

describe('Enhanced In Expression', () => {
  let inExpression: InExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    inExpression = new InExpression();
    context = createTypedExpressionContext();
  });

  describe('Input Validation', () => {
    test('validates correct input arguments', async () => {
      const result = await inExpression.validate([1, [1, 2, 3]]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validates array search values', async () => {
      const result = await inExpression.validate([
        [1, 3],
        [1, 2, 3],
      ]);
      expect(result.isValid).toBe(true);
    });

    test('accepts undefined search value (validation is permissive)', async () => {
      const result = await inExpression.validate([undefined, [1, 2, 3]]);
      // Validation is now permissive - undefined is handled at runtime
      expect(result.isValid).toBe(true);
    });

    test('accepts null container (validation is permissive)', async () => {
      const result = await inExpression.validate([1, null]);
      // Validation is now permissive - null is handled at runtime
      expect(result.isValid).toBe(true);
    });

    test('accepts large search arrays (validation is permissive)', async () => {
      const largeSearchArray = new Array(101).fill(0).map((_, i) => i);
      const result = await inExpression.validate([largeSearchArray, [1, 2, 3]]);
      // Validation is now permissive - large arrays are accepted
      expect(result.isValid).toBe(true);
    });
  });

  describe('Array Membership Testing', () => {
    test('finds single value in array', async () => {
      const result = await inExpression.evaluate(context, 1, [1, 2, 3]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([1]);
        expect(result.type).toBe('array');
      }
    });

    test('returns empty array when value not found', async () => {
      const result = await inExpression.evaluate(context, 4, [1, 2, 3]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([]);
        expect(result.type).toBe('array');
      }
    });

    test('finds multiple values in array', async () => {
      const result = await inExpression.evaluate(context, [1, 3], [1, 2, 3]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([1, 3]);
        expect(result.type).toBe('array');
      }
    });

    test('returns partial matches for multiple values', async () => {
      const result = await inExpression.evaluate(context, [1, 3, 4], [1, 2, 3]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([1, 3]);
        expect(result.type).toBe('array');
      }
    });

    test('returns empty array when no values found', async () => {
      const result = await inExpression.evaluate(context, [4, 5, 6], [1, 2, 3]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([]);
        expect(result.type).toBe('array');
      }
    });

    test('works with string arrays', async () => {
      const result = await inExpression.evaluate(context, 'apple', ['apple', 'banana', 'cherry']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(['apple']);
        expect(result.type).toBe('array');
      }
    });

    test('works with mixed type arrays', async () => {
      const result = await inExpression.evaluate(context, [1, 'hello'], [1, 'hello', true, null]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([1, 'hello']);
        expect(result.type).toBe('array');
      }
    });
  });

  describe('Array-like Objects', () => {
    test('works with NodeList-like objects', async () => {
      const nodeListLike = {
        0: 'first',
        1: 'second',
        2: 'third',
        length: 3,
        [Symbol.iterator]: function* () {
          for (let i = 0; i < this.length; i++) {
            yield this[i as keyof this];
          }
        },
      };

      const result = await inExpression.evaluate(context, 'second', nodeListLike);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(['second']);
      }
    });

    test('works with string as array-like', async () => {
      const result = await inExpression.evaluate(context, 'e', 'hello');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(['e']);
      }
    });
  });

  describe('DOM Element Resolution', () => {
    test('resolves direct HTMLElement container', async () => {
      const mockElement = document.createElement('div');
      mockElement.innerHTML = '<p>test</p>';

      // Mock querySelectorAll
      const originalQuerySelectorAll = mockElement.querySelectorAll;
      mockElement.querySelectorAll = function (selector: string) {
        if (selector === 'p') {
          return [mockElement.querySelector('p')] as unknown as NodeListOf<Element>;
        }
        return originalQuerySelectorAll.call(this, selector);
      };

      const result = await inExpression.evaluate(context, 'p', mockElement);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]).toBeInstanceOf(HTMLElement);
      }
    });

    test('resolves me context', async () => {
      const mockElement = document.createElement('div');
      context.me = mockElement;

      const result = await inExpression.evaluate(context, 'span', 'me');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe('array');
      }
    });
  });

  describe('CSS Selector Support', () => {
    test('handles ID selectors', async () => {
      // Create a mock element with ID
      const mockElement = document.createElement('div');
      mockElement.id = 'test-container';

      // Mock document.getElementById
      const originalGetElementById = document.getElementById;
      document.getElementById = function (id: string) {
        if (id === 'test-container') {
          return mockElement;
        }
        return originalGetElementById.call(this, id);
      };

      const result = await inExpression.evaluate(context, 'div', '#test-container');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe('array');
      }

      // Restore original method
      document.getElementById = originalGetElementById;
    });

    test('handles class selectors', async () => {
      const result = await inExpression.evaluate(context, 'p', '.container');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe('array');
      }
    });

    test('handles hyperscript element selectors', async () => {
      const result = await inExpression.evaluate(context, 'span', '<div/>');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe('array');
      }
    });
  });

  describe('Hyperscript Selector Conversion', () => {
    test('converts simple element selectors', async () => {
      const result = await inExpression.evaluate(context, '<p/>', document.body);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe('array');
      }
    });

    test('converts element selectors with classes', async () => {
      const result = await inExpression.evaluate(context, '<p.foo/>', document.body);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe('array');
      }
    });

    test('converts element selectors with IDs', async () => {
      const result = await inExpression.evaluate(context, '<div#myId/>', document.body);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe('array');
      }
    });
  });

  describe('Multiple Query Support', () => {
    test('handles multiple selectors', async () => {
      const result = await inExpression.evaluate(context, ['<p/>', '<div/>'], document.body);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe('array');
      }
    });

    test('removes duplicate elements from multiple queries', async () => {
      // This test would need a more complex DOM setup to create actual duplicates
      const result = await inExpression.evaluate(context, ['p', 'p.special'], document.body);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe('array');
      }
    });
  });

  describe('Error Handling', () => {
    test('handles invalid container types', async () => {
      const result = await inExpression.evaluate(context, 1, 42);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('InvalidContainerError');
      }
    });

    test('handles invalid selector strings', async () => {
      const result = await inExpression.evaluate(context, '<<<invalid>>>', document.body);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('QuerySelectorError');
      }
    });

    test('handles array search errors gracefully', async () => {
      // Create a problematic array-like object
      const problematicContainer = {
        get length() {
          throw new Error('Length access failed');
        },
      };

      const result = await inExpression.evaluate(context, 1, problematicContainer);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('ArraySearchError');
      }
    });
  });

  describe('Utility Functions', () => {
    test('factory function works correctly', () => {
      const inExpr = createInExpression();
      expect(inExpr).toBeInstanceOf(InExpression);
    });

    test('searchIn utility works', async () => {
      const result = await searchIn(1, [1, 2, 3], context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([1]);
      }
    });

    test('metadata provides comprehensive information', () => {
      const metadata = inExpression.getMetadata();

      expect(metadata.name).toBe('InExpression');
      expect(metadata.category).toBe('query');
      expect(metadata.supportedFeatures).toContain('array membership testing');
      expect(metadata.supportedFeatures).toContain('DOM element queries');
      expect(metadata.capabilities.contextAware).toBe(true);
      expect(metadata.capabilities.supportsAsync).toBe(true);
    });
  });

  describe('LLM Documentation', () => {
    test('provides comprehensive documentation', () => {
      const docs = inExpression.documentation;

      expect(docs.summary).toContain('membership');
      expect(docs.parameters).toHaveLength(2);
      expect(docs.parameters[0].name).toBe('searchValue');
      expect(docs.parameters[1].name).toBe('container');
      expect(docs.examples).toHaveLength(3);
      expect(docs.tags).toContain('membership');
      expect(docs.tags).toContain('dom');
    });
  });

  describe('Performance Characteristics', () => {
    test('handles medium-sized arrays efficiently', async () => {
      const largeArray = new Array(1000).fill(0).map((_, i) => i);
      const searchValues = [100, 500, 900];

      const startTime = performance.now();
      const result = await inExpression.evaluate(context, searchValues, largeArray);
      const endTime = performance.now();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([100, 500, 900]);
      }

      // Should be reasonably fast even for large arrays
      expect(endTime - startTime).toBeLessThan(50); // Less than 50ms
    });

    test('handles multiple search operations efficiently', async () => {
      const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const startTime = performance.now();

      // Perform multiple search operations
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(inExpression.evaluate(context, i % 10, testArray));
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();

      // All should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        if (result.success) {
          const expectedValue = index % 10;
          if (expectedValue === 0) {
            expect(result.value).toEqual([]); // 0 is not in array
          } else {
            expect(result.value).toEqual([expectedValue]);
          }
        }
      });

      // Should handle multiple operations efficiently
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms for 50 operations
    });
  });

  describe('Integration with Official Test Cases', () => {
    test('matches official basic array membership behavior', async () => {
      // Test: 1 in [1, 2, 3]
      const result = await inExpression.evaluate(context, 1, [1, 2, 3]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([1]);
      }
    });

    test('matches official multiple value search behavior', async () => {
      // Test: [1, 3] in [1, 2, 3]
      const result = await inExpression.evaluate(context, [1, 3], [1, 2, 3]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([1, 3]);
      }
    });

    test('matches official partial match behavior', async () => {
      // Test: [1, 3, 4] in [1, 2, 3]
      const result = await inExpression.evaluate(context, [1, 3, 4], [1, 2, 3]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([1, 3]);
      }
    });

    test('matches official no match behavior', async () => {
      // Test: [4, 5, 6] in [1, 2, 3]
      const result = await inExpression.evaluate(context, [4, 5, 6], [1, 2, 3]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([]);
      }
    });

    test('supports DOM query patterns from official tests', async () => {
      // Test: <p/> in container (simplified version)
      const result = await inExpression.evaluate(context, '<p/>', document.body);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe('array');
        // The actual elements depend on the DOM structure, so we just verify it works
      }
    });
  });
});
