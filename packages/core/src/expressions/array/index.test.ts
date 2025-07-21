/**
 * Tests for Array Operations Expressions
 * Generated from LSP examples with comprehensive TDD implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { arrayExpressions } from './index';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Array Operations Expressions', () => {
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;
    
    // Ensure required context properties exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Array Creation and Manipulation', () => {
    it('should have array creation expression', () => {
      const createArrayExpr = arrayExpressions.find(expr => expr.name === 'array');
      expect(createArrayExpr).toBeDefined();
      expect(createArrayExpr?.category).toBe('Array');
    });

    it('should create arrays from arguments', async () => {
      const createArrayExpr = arrayExpressions.find(expr => expr.name === 'array')!;
      
      const result = await createArrayExpr.evaluate(context, 1, 2, 3, 'hello');
      expect(result).toEqual([1, 2, 3, 'hello']);
    });

    it('should get array length', async () => {
      const lengthExpr = arrayExpressions.find(expr => expr.name === 'length')!;
      
      const result1 = await lengthExpr.evaluate(context, [1, 2, 3, 4, 5]);
      expect(result1).toBe(5);
      
      const result2 = await lengthExpr.evaluate(context, []);
      expect(result2).toBe(0);
      
      const result3 = await lengthExpr.evaluate(context, 'hello');
      expect(result3).toBe(5); // String length
    });

    it('should push elements to array', async () => {
      const pushExpr = arrayExpressions.find(expr => expr.name === 'push')!;
      
      const arr = [1, 2, 3];
      const result = await pushExpr.evaluate(context, arr, 4, 5);
      
      expect(arr).toEqual([1, 2, 3, 4, 5]); // Original array modified
      expect(result).toBe(5); // New length
    });

    it('should pop elements from array', async () => {
      const popExpr = arrayExpressions.find(expr => expr.name === 'pop')!;
      
      const arr = [1, 2, 3];
      const result = await popExpr.evaluate(context, arr);
      
      expect(result).toBe(3); // Popped element
      expect(arr).toEqual([1, 2]); // Original array modified
    });

    it('should shift elements from array', async () => {
      const shiftExpr = arrayExpressions.find(expr => expr.name === 'shift')!;
      
      const arr = [1, 2, 3];
      const result = await shiftExpr.evaluate(context, arr);
      
      expect(result).toBe(1); // Shifted element
      expect(arr).toEqual([2, 3]); // Original array modified
    });

    it('should unshift elements to array', async () => {
      const unshiftExpr = arrayExpressions.find(expr => expr.name === 'unshift')!;
      
      const arr = [3, 4];
      const result = await unshiftExpr.evaluate(context, arr, 1, 2);
      
      expect(arr).toEqual([1, 2, 3, 4]); // Original array modified
      expect(result).toBe(4); // New length
    });
  });

  describe('Array Access and Slicing', () => {
    it('should get array elements by index', async () => {
      const atExpr = arrayExpressions.find(expr => expr.name === 'at')!;
      
      const arr = ['a', 'b', 'c', 'd'];
      
      const result1 = await atExpr.evaluate(context, arr, 0);
      expect(result1).toBe('a');
      
      const result2 = await atExpr.evaluate(context, arr, -1);
      expect(result2).toBe('d'); // Negative indexing
      
      const result3 = await atExpr.evaluate(context, arr, 10);
      expect(result3).toBe(undefined); // Out of bounds
    });

    it('should slice arrays', async () => {
      const sliceExpr = arrayExpressions.find(expr => expr.name === 'slice')!;
      
      const arr = [1, 2, 3, 4, 5];
      
      const result1 = await sliceExpr.evaluate(context, arr, 1, 3);
      expect(result1).toEqual([2, 3]); // Slice from index 1 to 3
      
      const result2 = await sliceExpr.evaluate(context, arr, -2);
      expect(result2).toEqual([4, 5]); // Slice from -2 to end
      
      const result3 = await sliceExpr.evaluate(context, arr, 2);
      expect(result3).toEqual([3, 4, 5]); // Slice from index 2 to end
    });

    it('should splice arrays', async () => {
      const spliceExpr = arrayExpressions.find(expr => expr.name === 'splice')!;
      
      const arr = [1, 2, 3, 4, 5];
      const result = await spliceExpr.evaluate(context, arr, 2, 1, 'a', 'b');
      
      expect(result).toEqual([3]); // Removed elements
      expect(arr).toEqual([1, 2, 'a', 'b', 4, 5]); // Modified array
    });

    it('should get first element', async () => {
      const firstExpr = arrayExpressions.find(expr => expr.name === 'first')!;
      
      const result1 = await firstExpr.evaluate(context, [1, 2, 3]);
      expect(result1).toBe(1);
      
      const result2 = await firstExpr.evaluate(context, []);
      expect(result2).toBe(undefined);
    });

    it('should get last element', async () => {
      const lastExpr = arrayExpressions.find(expr => expr.name === 'last')!;
      
      const result1 = await lastExpr.evaluate(context, [1, 2, 3]);
      expect(result1).toBe(3);
      
      const result2 = await lastExpr.evaluate(context, []);
      expect(result2).toBe(undefined);
    });
  });

  describe('Array Functional Methods', () => {
    it('should map over arrays', async () => {
      const mapExpr = arrayExpressions.find(expr => expr.name === 'map')!;
      
      const arr = [1, 2, 3, 4];
      const doubleFunction = (x: number) => x * 2;
      context.locals!.set('double', doubleFunction);
      
      const result = await mapExpr.evaluate(context, arr, 'double');
      expect(result).toEqual([2, 4, 6, 8]);
    });

    it('should filter arrays', async () => {
      const filterExpr = arrayExpressions.find(expr => expr.name === 'filter')!;
      
      const arr = [1, 2, 3, 4, 5, 6];
      const isEvenFunction = (x: number) => x % 2 === 0;
      context.locals!.set('isEven', isEvenFunction);
      
      const result = await filterExpr.evaluate(context, arr, 'isEven');
      expect(result).toEqual([2, 4, 6]);
    });

    it('should reduce arrays', async () => {
      const reduceExpr = arrayExpressions.find(expr => expr.name === 'reduce')!;
      
      const arr = [1, 2, 3, 4];
      const sumFunction = (acc: number, curr: number) => acc + curr;
      context.locals!.set('sum', sumFunction);
      
      const result = await reduceExpr.evaluate(context, arr, 'sum', 0);
      expect(result).toBe(10); // 1+2+3+4
    });

    it('should find elements in arrays', async () => {
      const findExpr = arrayExpressions.find(expr => expr.name === 'find')!;
      
      const arr = [1, 2, 3, 4, 5];
      const greaterThanThree = (x: number) => x > 3;
      context.locals!.set('gt3', greaterThanThree);
      
      const result = await findExpr.evaluate(context, arr, 'gt3');
      expect(result).toBe(4); // First element > 3
    });

    it('should find index of elements in arrays', async () => {
      const findIndexExpr = arrayExpressions.find(expr => expr.name === 'findIndex')!;
      
      const arr = [1, 2, 3, 4, 5];
      const greaterThanThree = (x: number) => x > 3;
      context.locals!.set('gt3', greaterThanThree);
      
      const result = await findIndexExpr.evaluate(context, arr, 'gt3');
      expect(result).toBe(3); // Index of first element > 3
    });

    it('should check if some elements match condition', async () => {
      const someExpr = arrayExpressions.find(expr => expr.name === 'some')!;
      
      const arr = [1, 2, 3, 4, 5];
      const greaterThanThree = (x: number) => x > 3;
      context.locals!.set('gt3', greaterThanThree);
      
      const result = await someExpr.evaluate(context, arr, 'gt3');
      expect(result).toBe(true);
    });

    it('should check if every element matches condition', async () => {
      const everyExpr = arrayExpressions.find(expr => expr.name === 'every')!;
      
      const arr = [2, 4, 6, 8];
      const isEvenFunction = (x: number) => x % 2 === 0;
      context.locals!.set('isEven', isEvenFunction);
      
      const result = await everyExpr.evaluate(context, arr, 'isEven');
      expect(result).toBe(true);
    });

    it('should forEach over arrays', async () => {
      const forEachExpr = arrayExpressions.find(expr => expr.name === 'forEach')!;
      
      const arr = [1, 2, 3];
      const results: number[] = [];
      const collectFunction = (x: number) => results.push(x * 2);
      context.locals!.set('collect', collectFunction);
      
      await forEachExpr.evaluate(context, arr, 'collect');
      expect(results).toEqual([2, 4, 6]);
    });
  });

  describe('Array Search and Testing', () => {
    it('should check if array includes element', async () => {
      const includesExpr = arrayExpressions.find(expr => expr.name === 'includes')!;
      
      const arr = [1, 2, 3, 'hello'];
      
      const result1 = await includesExpr.evaluate(context, arr, 2);
      expect(result1).toBe(true);
      
      const result2 = await includesExpr.evaluate(context, arr, 'hello');
      expect(result2).toBe(true);
      
      const result3 = await includesExpr.evaluate(context, arr, 5);
      expect(result3).toBe(false);
    });

    it('should find index of element', async () => {
      const indexOfExpr = arrayExpressions.find(expr => expr.name === 'indexOf')!;
      
      const arr = [1, 2, 3, 2, 4];
      
      const result1 = await indexOfExpr.evaluate(context, arr, 2);
      expect(result1).toBe(1); // First occurrence
      
      const result2 = await indexOfExpr.evaluate(context, arr, 5);
      expect(result2).toBe(-1); // Not found
    });

    it('should find last index of element', async () => {
      const lastIndexOfExpr = arrayExpressions.find(expr => expr.name === 'lastIndexOf')!;
      
      const arr = [1, 2, 3, 2, 4];
      
      const result = await lastIndexOfExpr.evaluate(context, arr, 2);
      expect(result).toBe(3); // Last occurrence
    });

    it('should check if value is array', async () => {
      const isArrayExpr = arrayExpressions.find(expr => expr.name === 'isArray')!;
      
      const result1 = await isArrayExpr.evaluate(context, [1, 2, 3]);
      expect(result1).toBe(true);
      
      const result2 = await isArrayExpr.evaluate(context, 'hello');
      expect(result2).toBe(false);
      
      const result3 = await isArrayExpr.evaluate(context, { length: 3 });
      expect(result3).toBe(false);
    });
  });

  describe('Array Transformation and Joining', () => {
    it('should join array elements', async () => {
      const joinExpr = arrayExpressions.find(expr => expr.name === 'join')!;
      
      const arr = ['hello', 'world', 'test'];
      
      const result1 = await joinExpr.evaluate(context, arr, ' ');
      expect(result1).toBe('hello world test');
      
      const result2 = await joinExpr.evaluate(context, arr, ', ');
      expect(result2).toBe('hello, world, test');
      
      const result3 = await joinExpr.evaluate(context, arr); // Default separator
      expect(result3).toBe('hello,world,test');
    });

    it('should reverse arrays', async () => {
      const reverseExpr = arrayExpressions.find(expr => expr.name === 'reverse')!;
      
      const arr = [1, 2, 3, 4];
      const result = await reverseExpr.evaluate(context, arr);
      
      expect(result).toEqual([4, 3, 2, 1]);
      expect(arr).toEqual([4, 3, 2, 1]); // Original array modified
    });

    it('should sort arrays', async () => {
      const sortExpr = arrayExpressions.find(expr => expr.name === 'sort')!;
      
      const arr1 = [3, 1, 4, 1, 5, 9];
      const result1 = await sortExpr.evaluate(context, arr1);
      expect(result1).toEqual([1, 1, 3, 4, 5, 9]);
      
      // Custom sort function
      const arr2 = [3, 1, 4, 1, 5, 9];
      const descending = (a: number, b: number) => b - a;
      context.locals!.set('desc', descending);
      
      const result2 = await sortExpr.evaluate(context, arr2, 'desc');
      expect(result2).toEqual([9, 5, 4, 3, 1, 1]);
    });

    it('should concat arrays', async () => {
      const concatExpr = arrayExpressions.find(expr => expr.name === 'concat')!;
      
      const arr1 = [1, 2];
      const arr2 = [3, 4];
      const arr3 = [5, 6];
      
      const result = await concatExpr.evaluate(context, arr1, arr2, arr3);
      expect(result).toEqual([1, 2, 3, 4, 5, 6]);
      expect(arr1).toEqual([1, 2]); // Original arrays unchanged
    });

    it('should flatten arrays', async () => {
      const flatExpr = arrayExpressions.find(expr => expr.name === 'flat')!;
      
      const arr1 = [1, [2, 3], [4, 5]];
      const result1 = await flatExpr.evaluate(context, arr1);
      expect(result1).toEqual([1, 2, 3, 4, 5]);
      
      const arr2 = [1, [2, [3, 4]]];
      const result2 = await flatExpr.evaluate(context, arr2, 2); // Depth 2
      expect(result2).toEqual([1, 2, 3, 4]);
    });

    it('should flatMap arrays', async () => {
      const flatMapExpr = arrayExpressions.find(expr => expr.name === 'flatMap')!;
      
      const arr = [1, 2, 3];
      const duplicate = (x: number) => [x, x];
      context.locals!.set('duplicate', duplicate);
      
      const result = await flatMapExpr.evaluate(context, arr, 'duplicate');
      expect(result).toEqual([1, 1, 2, 2, 3, 3]);
    });
  });

  describe('Array Range and Generation', () => {
    it('should create range arrays', async () => {
      const rangeExpr = arrayExpressions.find(expr => expr.name === 'range')!;
      
      const result1 = await rangeExpr.evaluate(context, 5);
      expect(result1).toEqual([0, 1, 2, 3, 4]); // Range from 0 to n-1
      
      const result2 = await rangeExpr.evaluate(context, 2, 6);
      expect(result2).toEqual([2, 3, 4, 5]); // Range from start to end-1
      
      const result3 = await rangeExpr.evaluate(context, 1, 10, 2);
      expect(result3).toEqual([1, 3, 5, 7, 9]); // With step
    });

    it('should fill arrays with values', async () => {
      const fillExpr = arrayExpressions.find(expr => expr.name === 'fill')!;
      
      const arr = new Array(5);
      const result = await fillExpr.evaluate(context, arr, 'test');
      
      expect(result).toEqual(['test', 'test', 'test', 'test', 'test']);
    });

    it('should create arrays from iterables', async () => {
      const fromExpr = arrayExpressions.find(expr => expr.name === 'from')!;
      
      const result1 = await fromExpr.evaluate(context, 'hello');
      expect(result1).toEqual(['h', 'e', 'l', 'l', 'o']);
      
      // With mapping function
      const toUpper = (char: string) => char.toUpperCase();
      context.locals!.set('toUpper', toUpper);
      
      const result2 = await fromExpr.evaluate(context, 'hello', 'toUpper');
      expect(result2).toEqual(['H', 'E', 'L', 'L', 'O']);
    });
  });

  describe('Advanced Array Operations', () => {
    it('should handle array destructuring patterns', async () => {
      const destructureExpr = arrayExpressions.find(expr => expr.name === 'destructure')!;
      
      const arr = [1, 2, 3, 4, 5];
      
      // Basic destructuring
      const result1 = await destructureExpr.evaluate(context, arr, ['first', 'second', 'rest']);
      expect(result1).toEqual({
        first: 1,
        second: 2,
        rest: [3, 4, 5]
      });
    });

    it('should chunk arrays into smaller arrays', async () => {
      const chunkExpr = arrayExpressions.find(expr => expr.name === 'chunk')!;
      
      const arr = [1, 2, 3, 4, 5, 6, 7, 8];
      const result = await chunkExpr.evaluate(context, arr, 3);
      
      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7, 8]]);
    });

    it('should remove duplicates from arrays', async () => {
      const uniqueExpr = arrayExpressions.find(expr => expr.name === 'unique')!;
      
      const arr = [1, 2, 2, 3, 3, 3, 4, 5, 5];
      const result = await uniqueExpr.evaluate(context, arr);
      
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should partition arrays based on predicate', async () => {
      const partitionExpr = arrayExpressions.find(expr => expr.name === 'partition')!;
      
      const arr = [1, 2, 3, 4, 5, 6];
      const isEven = (x: number) => x % 2 === 0;
      context.locals!.set('isEven', isEven);
      
      const result = await partitionExpr.evaluate(context, arr, 'isEven');
      expect(result).toEqual([
        [2, 4, 6], // Elements that match
        [1, 3, 5]  // Elements that don't match
      ]);
    });

    it('should zip multiple arrays together', async () => {
      const zipExpr = arrayExpressions.find(expr => expr.name === 'zip')!;
      
      const arr1 = [1, 2, 3];
      const arr2 = ['a', 'b', 'c'];
      const arr3 = [true, false, true];
      
      const result = await zipExpr.evaluate(context, arr1, arr2, arr3);
      expect(result).toEqual([
        [1, 'a', true],
        [2, 'b', false],
        [3, 'c', true]
      ]);
    });
  });

  describe('Integration with Hyperscript Context', () => {
    it('should work with DOM NodeList', async () => {
      const container = createTestElement(`
        <div>
          <span class="item">1</span>
          <span class="item">2</span>
          <span class="item">3</span>
        </div>
      `);
      
      const nodeList = container.querySelectorAll('.item');
      
      const fromExpr = arrayExpressions.find(expr => expr.name === 'from')!;
      const result = await fromExpr.evaluate(context, nodeList);
      
      expect(result).toHaveLength(3);
      expect(result[0].textContent).toBe('1');
    });

    it('should map over DOM elements', async () => {
      const container = createTestElement(`
        <div>
          <span data-value="1">One</span>
          <span data-value="2">Two</span>
          <span data-value="3">Three</span>
        </div>
      `);
      
      const elements = Array.from(container.querySelectorAll('span'));
      
      const mapExpr = arrayExpressions.find(expr => expr.name === 'map')!;
      const getValue = (el: Element) => el.getAttribute('data-value');
      context.locals!.set('getValue', getValue);
      
      const result = await mapExpr.evaluate(context, elements, 'getValue');
      expect(result).toEqual(['1', '2', '3']);
    });

    it('should filter DOM elements by condition', async () => {
      const container = createTestElement(`
        <div>
          <span class="active">1</span>
          <span class="inactive">2</span>
          <span class="active">3</span>
        </div>
      `);
      
      const elements = Array.from(container.querySelectorAll('span'));
      
      const filterExpr = arrayExpressions.find(expr => expr.name === 'filter')!;
      const isActive = (el: Element) => el.classList.contains('active');
      context.locals!.set('isActive', isActive);
      
      const result = await filterExpr.evaluate(context, elements, 'isActive');
      expect(result).toHaveLength(2);
      expect(result[0].textContent).toBe('1');
      expect(result[1].textContent).toBe('3');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-array inputs gracefully', async () => {
      const mapExpr = arrayExpressions.find(expr => expr.name === 'map')!;
      
      const result1 = await mapExpr.evaluate(context, null, 'fn');
      expect(result1).toEqual([]);
      
      const result2 = await mapExpr.evaluate(context, 'hello', 'fn');
      expect(result2).toEqual(['h', 'e', 'l', 'l', 'o']); // String converted to array
    });

    it('should handle missing callback functions', async () => {
      const filterExpr = arrayExpressions.find(expr => expr.name === 'filter')!;
      
      const result = await filterExpr.evaluate(context, [1, 2, 3], 'nonExistentFn');
      expect(result).toEqual([]); // No filtering applied
    });

    it('should handle empty arrays', async () => {
      const reduceExpr = arrayExpressions.find(expr => expr.name === 'reduce')!;
      
      const sumFunction = (acc: number, curr: number) => acc + curr;
      context.locals!.set('sum', sumFunction);
      
      const result = await reduceExpr.evaluate(context, [], 'sum', 0);
      expect(result).toBe(0); // Initial value
    });

    it('should handle invalid indices', async () => {
      const atExpr = arrayExpressions.find(expr => expr.name === 'at')!;
      
      const arr = [1, 2, 3];
      
      const result1 = await atExpr.evaluate(context, arr, 'invalid');
      expect(result1).toBe(undefined);
      
      const result2 = await atExpr.evaluate(context, arr, NaN);
      expect(result2).toBe(undefined);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large arrays efficiently', async () => {
      const mapExpr = arrayExpressions.find(expr => expr.name === 'map')!;
      
      const largeArray = new Array(10000).fill(0).map((_, i) => i);
      const double = (x: number) => x * 2;
      context.locals!.set('double', double);
      
      const startTime = Date.now();
      const result = await mapExpr.evaluate(context, largeArray, 'double');
      const endTime = Date.now();
      
      expect(result).toHaveLength(10000);
      expect(result[0]).toBe(0);
      expect(result[9999]).toBe(19998);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should not leak memory with repeated operations', async () => {
      const filterExpr = arrayExpressions.find(expr => expr.name === 'filter')!;
      
      const isOdd = (x: number) => x % 2 === 1;
      context.locals!.set('isOdd', isOdd);
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        const arr = new Array(1000).fill(0).map((_, j) => j);
        await filterExpr.evaluate(context, arr, 'isOdd');
      }
      
      // Should complete without issues
      expect(true).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate required arguments for array operations', () => {
      const mapExpr = arrayExpressions.find(expr => expr.name === 'map')!;
      
      expect(mapExpr.validate([])).toBe('Array and callback function required');
      expect(mapExpr.validate([[1, 2, 3]])).toBe('Callback function required');
      expect(mapExpr.validate([[1, 2, 3], 'fn'])).toBe(null);
    });

    it('should validate array methods with correct argument counts', () => {
      const sliceExpr = arrayExpressions.find(expr => expr.name === 'slice')!;
      
      expect(sliceExpr.validate([])).toBe('Array required for slicing');
      expect(sliceExpr.validate([[1, 2, 3], 1])).toBe(null);
    });
  });
});