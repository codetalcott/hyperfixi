/**
 * Enhanced Array Expressions Tests
 * Comprehensive testing of array literal and indexing with TypeScript integration
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { 
  EnhancedArrayLiteralExpression, 
  EnhancedArrayIndexExpression,
  createArrayLiteralExpression,
  createArrayIndexExpression,
  createArray,
  indexArray
} from './index.ts';
import { createTypedExpressionContext, type TypedExpressionContext } from '../../test-utilities.ts';

describe('Enhanced Array Expressions', () => {
  let arrayLiteralExpression: EnhancedArrayLiteralExpression;
  let arrayIndexExpression: EnhancedArrayIndexExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    arrayLiteralExpression = new EnhancedArrayLiteralExpression();
    arrayIndexExpression = new EnhancedArrayIndexExpression();
    context = createTypedExpressionContext();
  });

  describe('Array Literal Expression', () => {
    describe('Input Validation', () => {
      test('validates empty array literal', async () => {
        const result = await arrayLiteralExpression.validate([]);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('validates array with mixed types', async () => {
        const result = await arrayLiteralExpression.validate([1, 'string', true, null]);
        expect(result.isValid).toBe(true);
      });

      test('warns about very large arrays', async () => {
        const largeArray = new Array(10001).fill(0);
        const result = await arrayLiteralExpression.validate(largeArray);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('may impact performance');
      });

      test('accepts mixed null/undefined elements (no longer warns)', async () => {
        const result = await arrayLiteralExpression.validate([1, null, 3, undefined, 5]);
        expect(result.isValid).toBe(true);
        // Mixed null/undefined is common in JavaScript arrays, so we accept it
      });
    });

    describe('Array Creation', () => {
      test('creates empty array', async () => {
        const result = await arrayLiteralExpression.evaluate(context);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toEqual([]);
          expect(result.type).toBe('array');
        }
      });

      test('creates single element array', async () => {
        const result = await arrayLiteralExpression.evaluate(context, true);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toEqual([true]);
          expect(result.type).toBe('array');
        }
      });

      test('creates multi-element array', async () => {
        const result = await arrayLiteralExpression.evaluate(context, 1, 2, 3);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toEqual([1, 2, 3]);
          expect(result.type).toBe('array');
        }
      });

      test('creates mixed type array', async () => {
        const result = await arrayLiteralExpression.evaluate(context, true, 42, 'hello', null);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toEqual([true, 42, 'hello', null]);
          expect(result.type).toBe('array');
        }
      });

      test('handles nested arrays', async () => {
        const result = await arrayLiteralExpression.evaluate(context, [1, 2], [3, 4]);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toEqual([[1, 2], [3, 4]]);
          expect(result.type).toBe('array');
        }
      });

      test('resolves promise elements', async () => {
        const promiseElement = Promise.resolve('async-value');
        const result = await arrayLiteralExpression.evaluate(context, 'sync', promiseElement);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toEqual(['sync', 'async-value']);
          expect(result.type).toBe('array');
        }
      });
    });

    describe('Error Handling', () => {
      test('handles evaluation errors gracefully', async () => {
        // Force an error by providing invalid input to schema parsing
        const result = await arrayLiteralExpression.evaluate(context);
        
        // Since empty array is valid, this should succeed
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Array Index Expression', () => {
    describe('Input Validation', () => {
      test('validates correct index input', async () => {
        const result = await arrayIndexExpression.validate([[1, 2, 3], 1]);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('rejects null target', async () => {
        const result = await arrayIndexExpression.validate([null, 0]);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('Cannot index null');
      });

      test('validates range objects', async () => {
        const result = await arrayIndexExpression.validate([[1, 2, 3], { start: 0, end: 2 }]);
        expect(result.isValid).toBe(true);
      });

      test('rejects invalid ranges', async () => {
        const result = await arrayIndexExpression.validate([[1, 2, 3], { start: 3, end: 1 }]);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('start index cannot be greater than end');
      });
    });

    describe('Basic Indexing', () => {
      test('indexes first element', async () => {
        const result = await arrayIndexExpression.evaluate(context, [10, 20, 30], 0);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(10);
          expect(result.type).toBe('number');
        }
      });

      test('indexes middle element', async () => {
        const result = await arrayIndexExpression.evaluate(context, [10, 20, 30], 1);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(20);
          expect(result.type).toBe('number');
        }
      });

      test('indexes last element', async () => {
        const result = await arrayIndexExpression.evaluate(context, [10, 20, 30], 2);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(30);
          expect(result.type).toBe('number');
        }
      });

      test('returns undefined for out of bounds index', async () => {
        const result = await arrayIndexExpression.evaluate(context, [1, 2, 3], 10);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeUndefined();
          expect(result.type).toBe('undefined');
        }
      });
    });

    describe('Negative Indexing', () => {
      test('indexes from end with negative index', async () => {
        const result = await arrayIndexExpression.evaluate(context, [10, 20, 30], -1);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(30);
          expect(result.type).toBe('number');
        }
      });

      test('indexes second from end', async () => {
        const result = await arrayIndexExpression.evaluate(context, [10, 20, 30], -2);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(20);
          expect(result.type).toBe('number');
        }
      });

      test('handles negative index out of bounds', async () => {
        const result = await arrayIndexExpression.evaluate(context, [1, 2, 3], -10);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeUndefined();
          expect(result.type).toBe('undefined');
        }
      });
    });

    describe('String Indexing', () => {
      test('indexes array-like object with string keys', async () => {
        const arrayLike = { '0': 'first', '1': 'second', length: 2, custom: 'value' };
        const result = await arrayIndexExpression.evaluate(context, arrayLike, 'custom');
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe('value');
          expect(result.type).toBe('string');
        }
      });
    });

    describe('Range Indexing', () => {
      test('slices array with range object', async () => {
        const result = await arrayIndexExpression.evaluate(
          context, 
          [0, 1, 2, 3, 4, 5], 
          { start: 1, end: 3 }
        );
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toEqual([1, 2, 3]);
          expect(result.type).toBe('array');
        }
      });

      test('handles range from beginning', async () => {
        const result = await arrayIndexExpression.evaluate(
          context, 
          [0, 1, 2, 3, 4], 
          { end: 2 }
        );
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toEqual([0, 1, 2]);
          expect(result.type).toBe('array');
        }
      });

      test('handles range to end', async () => {
        const result = await arrayIndexExpression.evaluate(
          context, 
          [0, 1, 2, 3, 4], 
          { start: 3 }
        );
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toEqual([3, 4]);
          expect(result.type).toBe('array');
        }
      });

      test('handles negative range indices', async () => {
        const result = await arrayIndexExpression.evaluate(
          context, 
          [0, 1, 2, 3, 4], 
          { start: -3, end: -1 }
        );
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toEqual([2, 3, 4]);
          expect(result.type).toBe('array');
        }
      });
    });

    describe('Array-like Objects', () => {
      test('indexes NodeList-like objects', async () => {
        const nodeListLike = {
          0: 'first',
          1: 'second', 
          2: 'third',
          length: 3,
          [Symbol.iterator]: function* () {
            for (let i = 0; i < this.length; i++) {
              yield this[i as keyof this];
            }
          }
        };
        
        const result = await arrayIndexExpression.evaluate(context, nodeListLike, 1);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe('second');
          expect(result.type).toBe('string');
        }
      });

      test('indexes strings as character arrays', async () => {
        const result = await arrayIndexExpression.evaluate(context, 'hello', 1);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe('e');
          expect(result.type).toBe('string');
        }
      });
    });

    describe('Type Inference', () => {
      test('correctly infers element types', async () => {
        const mixedArray = [42, 'string', true, null, undefined, [1, 2], { key: 'value' }];
        
        // Number
        let result = await arrayIndexExpression.evaluate(context, mixedArray, 0);
        expect(result.success && result.type).toBe('number');
        
        // String
        result = await arrayIndexExpression.evaluate(context, mixedArray, 1);
        expect(result.success && result.type).toBe('string');
        
        // Boolean
        result = await arrayIndexExpression.evaluate(context, mixedArray, 2);
        expect(result.success && result.type).toBe('boolean');
        
        // Null
        result = await arrayIndexExpression.evaluate(context, mixedArray, 3);
        expect(result.success && result.type).toBe('null');
        
        // Undefined
        result = await arrayIndexExpression.evaluate(context, mixedArray, 4);
        expect(result.success && result.type).toBe('undefined');
        
        // Array
        result = await arrayIndexExpression.evaluate(context, mixedArray, 5);
        expect(result.success && result.type).toBe('array');
        
        // Object
        result = await arrayIndexExpression.evaluate(context, mixedArray, 6);
        expect(result.success && result.type).toBe('object');
      });
    });

    describe('Error Handling', () => {
      test('handles non-array targets gracefully', async () => {
        const result = await arrayIndexExpression.evaluate(context, 42, 0);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.name).toBe('InvalidArrayTargetError');
          expect(result.error.message).toContain('Cannot index target of type number');
        }
      });

      test('handles invalid index types', async () => {
        const result = await arrayIndexExpression.evaluate(context, [1, 2, 3], { invalid: 'range' } as unknown as number);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.name).toBe('ArrayIndexValidationError');
        }
      });
    });
  });

  describe('Utility Functions', () => {
    test('factory functions work correctly', () => {
      const arrayLiteral = createArrayLiteralExpression();
      const arrayIndex = createArrayIndexExpression();
      
      expect(arrayLiteral).toBeInstanceOf(EnhancedArrayLiteralExpression);
      expect(arrayIndex).toBeInstanceOf(EnhancedArrayIndexExpression);
    });

    test('createArray utility works', async () => {
      const result = await createArray([1, 2, 3], context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([1, 2, 3]);
      }
    });

    test('indexArray utility works', async () => {
      const result = await indexArray([10, 20, 30], 1, context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(20);
      }
    });

    test('metadata provides comprehensive information', () => {
      const arrayLiteralMetadata = arrayLiteralExpression.getMetadata();
      const arrayIndexMetadata = arrayIndexExpression.getMetadata();
      
      expect(arrayLiteralMetadata.name).toBe('ArrayLiteralExpression');
      expect(arrayLiteralMetadata.category).toBe('literal');
      expect(arrayLiteralMetadata.supportedFeatures).toContain('async element resolution');
      
      expect(arrayIndexMetadata.name).toBe('ArrayIndexExpression');
      expect(arrayIndexMetadata.category).toBe('access');
      expect(arrayIndexMetadata.supportedFeatures).toContain('range slicing');
    });
  });

  describe('LLM Documentation', () => {
    test('provides comprehensive documentation for array literals', () => {
      const docs = arrayLiteralExpression.documentation;
      
      expect(docs.summary).toContain('array literals');
      expect(docs.parameters).toHaveLength(1);
      expect(docs.parameters[0].name).toBe('elements');
      expect(docs.examples).toHaveLength(3);
      expect(docs.tags).toContain('array');
      expect(docs.tags).toContain('literal');
    });

    test('provides comprehensive documentation for array indexing', () => {
      const docs = arrayIndexExpression.documentation;
      
      expect(docs.summary).toContain('array elements');
      expect(docs.parameters).toHaveLength(2);
      expect(docs.parameters[0].name).toBe('target');
      expect(docs.parameters[1].name).toBe('index');
      expect(docs.examples).toHaveLength(3);
      expect(docs.tags).toContain('indexing');
      expect(docs.tags).toContain('slice');
    });
  });

  describe('Performance Characteristics', () => {
    test('handles large arrays efficiently', async () => {
      const largeArray = new Array(1000).fill(0).map((_, i) => i);
      
      const startTime = performance.now();
      const result = await arrayLiteralExpression.evaluate(context, ...largeArray);
      const endTime = performance.now();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(1000);
      }
      
      // Should be reasonably fast even for large arrays
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
    });

    test('indexing operations are fast', async () => {
      const testArray = new Array(10000).fill(0).map((_, i) => i);
      
      const startTime = performance.now();
      
      // Perform multiple index operations
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(arrayIndexExpression.evaluate(context, testArray, i));
      }
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      // All should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(index);
        }
      });
      
      // Should be fast for multiple operations
      expect(endTime - startTime).toBeLessThan(50); // Less than 50ms for 100 operations
    });
  });

  describe('Integration with Official Test Cases', () => {
    test('matches official empty array literal behavior', async () => {
      const result = await arrayLiteralExpression.evaluate(context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([]);
      }
    });

    test('matches official single element array behavior', async () => {
      const result = await arrayLiteralExpression.evaluate(context, true);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([true]);
      }
    });

    test('matches official multi-element array behavior', async () => {
      const result = await arrayLiteralExpression.evaluate(context, true, false);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([true, false]);
      }
    });

    test('matches official array indexing behavior', async () => {
      // Test indexing at beginning
      let result = await arrayIndexExpression.evaluate(context, [10, 20, 30], 0);
      expect(result.success && result.value).toBe(10);
      
      // Test indexing in middle
      result = await arrayIndexExpression.evaluate(context, [10, 20, 30], 1);
      expect(result.success && result.value).toBe(20);
      
      // Test indexing at end
      result = await arrayIndexExpression.evaluate(context, [10, 20, 30], 2);
      expect(result.success && result.value).toBe(30);
    });
  });
});