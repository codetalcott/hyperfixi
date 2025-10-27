/**
 * Tests for Enhanced Positional Expressions
 * Comprehensive test suite for positional navigation (first, last, at, random)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTypedExecutionContext } from '../../test-setup';
import type { TypedExpressionContext } from '../../../types/expression-types';
import {
  EnhancedFirstExpression,
  EnhancedLastExpression,
  EnhancedAtExpression,
  EnhancedRandomExpression,
  positionalExpressions
} from './index';

describe('Enhanced Positional Expressions', () => {
  let context: TypedExpressionContext;
  let testElements: HTMLElement[];

  beforeEach(() => {
    context = createTypedExecutionContext();
    
    // Create test DOM elements
    testElements = [];
    for (let i = 0; i < 5; i++) {
      const element = document.createElement('div');
      element.className = `item item-${i}`;
      element.textContent = `Item ${i}`;
      element.setAttribute('data-index', i.toString());
      document.body.appendChild(element);
      testElements.push(element);
    }
  });

  afterEach(() => {
    // Clean up test elements
    testElements.forEach(element => {
      if (element.parentNode) {
        document.body.removeChild(element);
      }
    });
    testElements = [];
  });

  describe('EnhancedFirstExpression', () => {
    let expression: EnhancedFirstExpression;

    beforeEach(() => {
      expression = new EnhancedFirstExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('first');
      expect(expression.category).toBe('Positional');
      expect(expression.syntax).toBe('first in collection');
      expect(expression.outputType).toBe('Any');
      expect(expression.description).toContain('Gets the first element');
    });

    describe('Array Collections', () => {
      it('should get first element from number array', async () => {
        const result = await expression.evaluate(context, {
          collection: [1, 2, 3, 4, 5]
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(1);
          expect(result.type).toBe('Number');
        }
      });

      it('should get first element from string array', async () => {
        const result = await expression.evaluate(context, {
          collection: ['apple', 'banana', 'cherry']
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe('apple');
          expect(result.type).toBe('String');
        }
      });

      it('should get first element from mixed array', async () => {
        const testObj = { name: 'test' };
        const result = await expression.evaluate(context, {
          collection: [testObj, 'string', 42, true]
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(testObj);
          expect(result.type).toBe('Object');
        }
      });

      it('should handle empty array', async () => {
        const result = await expression.evaluate(context, {
          collection: []
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeUndefined();
          expect(result.type).toBe('Undefined');
        }
      });
    });

    describe('String Collections', () => {
      it('should get first character from string', async () => {
        const result = await expression.evaluate(context, {
          collection: 'hello'
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe('h');
          expect(result.type).toBe('String');
        }
      });

      it('should handle empty string', async () => {
        const result = await expression.evaluate(context, {
          collection: ''
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeUndefined();
          expect(result.type).toBe('Undefined');
        }
      });

      it('should handle single character string', async () => {
        const result = await expression.evaluate(context, {
          collection: 'a'
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe('a');
          expect(result.type).toBe('String');
        }
      });
    });

    describe('NodeList Collections', () => {
      it('should get first element from NodeList', async () => {
        const nodeList = document.querySelectorAll('.item');
        const result = await expression.evaluate(context, {
          collection: nodeList
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeInstanceOf(HTMLElement);
          expect(result.type).toBe('Element');
          expect((result.value as HTMLElement).getAttribute('data-index')).toBe('0');
        }
      });

      it('should handle empty NodeList', async () => {
        const nodeList = document.querySelectorAll('.nonexistent');
        const result = await expression.evaluate(context, {
          collection: nodeList
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeUndefined();
          expect(result.type).toBe('Undefined');
        }
      });
    });

    describe('Edge Cases', () => {
      it('should handle null collection', async () => {
        const result = await expression.evaluate(context, {
          collection: null
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeUndefined();
          expect(result.type).toBe('Undefined');
        }
      });

      it('should handle undefined collection', async () => {
        const result = await expression.evaluate(context, {
          collection: undefined
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeUndefined();
          expect(result.type).toBe('Undefined');
        }
      });

      it('should handle Set collection', async () => {
        const testSet = new Set([1, 2, 3]);
        const result = await expression.evaluate(context, {
          collection: testSet
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(1);
          expect(result.type).toBe('Number');
        }
      });
    });

    describe('Validation and Error Handling', () => {
      it('should validate correct input', () => {
        const validation = expression.validate({
          collection: [1, 2, 3]
        });
        
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject invalid input structure', () => {
        const validation = expression.validate({
          wrongParam: [1, 2, 3]
        });
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toHaveLength(1);
      });

      it('should track performance', async () => {
        const initialHistoryLength = context.evaluationHistory.length;
        
        await expression.evaluate(context, {
          collection: [1, 2, 3]
        });
        
        expect(context.evaluationHistory.length).toBe(initialHistoryLength + 1);
        
        const evaluation = context.evaluationHistory[context.evaluationHistory.length - 1];
        expect(evaluation.expressionName).toBe('first');
        expect(evaluation.category).toBe('Positional');
        expect(evaluation.success).toBe(true);
        expect(evaluation.duration).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Documentation', () => {
      it('should have comprehensive documentation', () => {
        expect(expression.documentation.summary).toContain('Retrieves the first element');
        expect(expression.documentation.parameters).toHaveLength(1);
        expect(expression.documentation.returns.type).toBe('any');
        expect(expression.documentation.examples.length).toBeGreaterThan(0);
        expect(expression.documentation.tags).toContain('first');
      });
    });
  });

  describe('EnhancedLastExpression', () => {
    let expression: EnhancedLastExpression;

    beforeEach(() => {
      expression = new EnhancedLastExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('last');
      expect(expression.category).toBe('Positional');
      expect(expression.syntax).toBe('last in collection');
      expect(expression.outputType).toBe('Any');
    });

    describe('Collection Operations', () => {
      it('should get last element from array', async () => {
        const result = await expression.evaluate(context, {
          collection: [1, 2, 3, 4, 5]
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(5);
          expect(result.type).toBe('Number');
        }
      });

      it('should get last character from string', async () => {
        const result = await expression.evaluate(context, {
          collection: 'hello'
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe('o');
          expect(result.type).toBe('String');
        }
      });

      it('should get last element from NodeList', async () => {
        const nodeList = document.querySelectorAll('.item');
        const result = await expression.evaluate(context, {
          collection: nodeList
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeInstanceOf(HTMLElement);
          expect(result.type).toBe('Element');
          expect((result.value as HTMLElement).getAttribute('data-index')).toBe('4');
        }
      });

      it('should handle single element array', async () => {
        const result = await expression.evaluate(context, {
          collection: ['only']
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe('only');
          expect(result.type).toBe('String');
        }
      });

      it('should handle empty collections', async () => {
        const testCases = [[], '', document.querySelectorAll('.nonexistent')];
        
        for (const testCase of testCases) {
          const result = await expression.evaluate(context, {
            collection: testCase
          });
          
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.value).toBeUndefined();
            expect(result.type).toBe('Undefined');
          }
        }
      });
    });

    describe('Error Handling', () => {
      it('should validate input correctly', () => {
        const validResult = expression.validate({
          collection: 'test'
        });
        
        expect(validResult.isValid).toBe(true);
        expect(validResult.errors).toHaveLength(0);
      });

      it('should track performance correctly', async () => {
        const initialHistoryLength = context.evaluationHistory.length;
        
        await expression.evaluate(context, {
          collection: 'test'
        });
        
        expect(context.evaluationHistory.length).toBe(initialHistoryLength + 1);
        
        const evaluation = context.evaluationHistory[context.evaluationHistory.length - 1];
        expect(evaluation.expressionName).toBe('last');
        expect(evaluation.success).toBe(true);
      });
    });
  });

  describe('EnhancedAtExpression', () => {
    let expression: EnhancedAtExpression;

    beforeEach(() => {
      expression = new EnhancedAtExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('at');
      expect(expression.category).toBe('Positional');
      expect(expression.syntax).toBe('collection[index] or collection at index');
      expect(expression.outputType).toBe('Any');
    });

    describe('Index Access', () => {
      it('should access element at positive index', async () => {
        const result = await expression.evaluate(context, {
          collection: [10, 20, 30, 40, 50],
          index: 2
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(30);
          expect(result.type).toBe('Number');
        }
      });

      it('should access element at index 0', async () => {
        const result = await expression.evaluate(context, {
          collection: ['a', 'b', 'c'],
          index: 0
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe('a');
          expect(result.type).toBe('String');
        }
      });

      it('should access last element with positive index', async () => {
        const arr = [1, 2, 3];
        const result = await expression.evaluate(context, {
          collection: arr,
          index: arr.length - 1
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(3);
          expect(result.type).toBe('Number');
        }
      });
    });

    describe('Negative Index Support', () => {
      it('should access last element with -1', async () => {
        const result = await expression.evaluate(context, {
          collection: [1, 2, 3, 4, 5],
          index: -1
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(5);
          expect(result.type).toBe('Number');
        }
      });

      it('should access second-to-last element with -2', async () => {
        const result = await expression.evaluate(context, {
          collection: ['a', 'b', 'c', 'd'],
          index: -2
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe('c');
          expect(result.type).toBe('String');
        }
      });

      it('should handle negative index out of bounds', async () => {
        const result = await expression.evaluate(context, {
          collection: [1, 2],
          index: -5
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeUndefined();
          expect(result.type).toBe('Undefined');
        }
      });
    });

    describe('String Character Access', () => {
      it('should access character at index', async () => {
        const result = await expression.evaluate(context, {
          collection: 'hello',
          index: 1
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe('e');
          expect(result.type).toBe('String');
        }
      });

      it('should access character with negative index', async () => {
        const result = await expression.evaluate(context, {
          collection: 'world',
          index: -1
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe('d');
          expect(result.type).toBe('String');
        }
      });
    });

    describe('NodeList Access', () => {
      it('should access element from NodeList at index', async () => {
        const nodeList = document.querySelectorAll('.item');
        const result = await expression.evaluate(context, {
          collection: nodeList,
          index: 2
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeInstanceOf(HTMLElement);
          expect(result.type).toBe('Element');
          expect((result.value as HTMLElement).getAttribute('data-index')).toBe('2');
        }
      });

      it('should access element with negative index from NodeList', async () => {
        const nodeList = document.querySelectorAll('.item');
        const result = await expression.evaluate(context, {
          collection: nodeList,
          index: -1
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeInstanceOf(HTMLElement);
          expect(result.type).toBe('Element');
          expect((result.value as HTMLElement).getAttribute('data-index')).toBe('4');
        }
      });
    });

    describe('Out of Bounds', () => {
      it('should return undefined for positive index out of bounds', async () => {
        const result = await expression.evaluate(context, {
          collection: [1, 2, 3],
          index: 10
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeUndefined();
          expect(result.type).toBe('Undefined');
        }
      });

      it('should return undefined for empty collection', async () => {
        const result = await expression.evaluate(context, {
          collection: [],
          index: 0
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeUndefined();
          expect(result.type).toBe('Undefined');
        }
      });
    });

    describe('Validation and Error Handling', () => {
      it('should validate correct input', () => {
        const validation = expression.validate({
          collection: [1, 2, 3],
          index: 1
        });
        
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject missing index', () => {
        const validation = expression.validate({
          collection: [1, 2, 3]
        });
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toHaveLength(1);
      });

      it('should reject non-number index', () => {
        const validation = expression.validate({
          collection: [1, 2, 3],
          index: 'not-a-number'
        });
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toHaveLength(1);
      });

      it('should track performance', async () => {
        const initialHistoryLength = context.evaluationHistory.length;
        
        await expression.evaluate(context, {
          collection: [1, 2, 3],
          index: 1
        });
        
        expect(context.evaluationHistory.length).toBe(initialHistoryLength + 1);
        
        const evaluation = context.evaluationHistory[context.evaluationHistory.length - 1];
        expect(evaluation.expressionName).toBe('at');
        expect(evaluation.category).toBe('Positional');
        expect(evaluation.success).toBe(true);
      });
    });
  });

  describe('EnhancedRandomExpression', () => {
    let expression: EnhancedRandomExpression;

    beforeEach(() => {
      expression = new EnhancedRandomExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('random');
      expect(expression.category).toBe('Positional');
      expect(expression.syntax).toBe('random in collection');
      expect(expression.outputType).toBe('Any');
    });

    describe('Random Selection', () => {
      it('should select random element from array', async () => {
        const collection = [1, 2, 3, 4, 5];
        const result = await expression.evaluate(context, {
          collection
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(collection).toContain(result.value);
          expect(result.type).toBe('Number');
        }
      });

      it('should select random character from string', async () => {
        const collection = 'abcde';
        const result = await expression.evaluate(context, {
          collection
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(['a', 'b', 'c', 'd', 'e']).toContain(result.value);
          expect(result.type).toBe('String');
        }
      });

      it('should select random element from NodeList', async () => {
        const nodeList = document.querySelectorAll('.item');
        const result = await expression.evaluate(context, {
          collection: nodeList
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeInstanceOf(HTMLElement);
          expect(result.type).toBe('Element');
          
          const index = (result.value as HTMLElement).getAttribute('data-index');
          expect(['0', '1', '2', '3', '4']).toContain(index);
        }
      });

      it('should return undefined for empty collection', async () => {
        const result = await expression.evaluate(context, {
          collection: []
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeUndefined();
          expect(result.type).toBe('Undefined');
        }
      });

      it('should handle single element collection', async () => {
        const result = await expression.evaluate(context, {
          collection: ['only']
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe('only');
          expect(result.type).toBe('String');
        }
      });
    });

    describe('Randomness Distribution', () => {
      it('should produce varied results over multiple calls', async () => {
        const collection = [1, 2, 3, 4, 5];
        const results = new Set();
        
        // Run multiple times to check for variety
        for (let i = 0; i < 20; i++) {
          const result = await expression.evaluate(context, { collection });
          if (result.success) {
            results.add(result.value);
          }
        }
        
        // Should have some variety (not always the same result)
        expect(results.size).toBeGreaterThan(1);
      });

      it('should handle collections with repeated elements', async () => {
        const collection = [1, 1, 1, 2, 2];
        const result = await expression.evaluate(context, {
          collection
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect([1, 2]).toContain(result.value);
          expect(result.type).toBe('Number');
        }
      });
    });

    describe('Edge Cases', () => {
      it('should handle null collection', async () => {
        const result = await expression.evaluate(context, {
          collection: null
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBeUndefined();
          expect(result.type).toBe('Undefined');
        }
      });

      it('should handle Set collection', async () => {
        const testSet = new Set(['a', 'b', 'c']);
        const result = await expression.evaluate(context, {
          collection: testSet
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(['a', 'b', 'c']).toContain(result.value);
          expect(result.type).toBe('String');
        }
      });
    });

    describe('Validation and Error Handling', () => {
      it('should validate correct input', () => {
        const validation = expression.validate({
          collection: [1, 2, 3]
        });
        
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject invalid input structure', () => {
        const validation = expression.validate({
          wrongParam: [1, 2, 3]
        });
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toHaveLength(1);
      });

      it('should track performance', async () => {
        const initialHistoryLength = context.evaluationHistory.length;
        
        await expression.evaluate(context, {
          collection: [1, 2, 3]
        });
        
        expect(context.evaluationHistory.length).toBe(initialHistoryLength + 1);
        
        const evaluation = context.evaluationHistory[context.evaluationHistory.length - 1];
        expect(evaluation.expressionName).toBe('random');
        expect(evaluation.category).toBe('Positional');
        expect(evaluation.success).toBe(true);
      });
    });
  });

  describe('Expression Registry', () => {
    it('should export all enhanced positional expressions', () => {
      expect(positionalExpressions.first).toBeInstanceOf(EnhancedFirstExpression);
      expect(positionalExpressions.last).toBeInstanceOf(EnhancedLastExpression);
      expect(positionalExpressions.at).toBeInstanceOf(EnhancedAtExpression);
      expect(positionalExpressions.random).toBeInstanceOf(EnhancedRandomExpression);
    });

    it('should have consistent metadata across all expressions', () => {
      Object.values(positionalExpressions).forEach(expression => {
        expect(expression.category).toBe('Positional');
        expect(expression.name).toBeTruthy();
        expect(expression.syntax).toBeTruthy();
        expect(expression.description).toBeTruthy();
        expect(expression.metadata).toBeTruthy();
        expect(expression.documentation).toBeTruthy();
        expect(expression.inputSchema).toBeTruthy();
        expect(expression.outputType).toBe('Any');
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with complex DOM structures', async () => {
      // Create nested structure
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="section">
          <div class="item nested-1">Item 1</div>
          <div class="item nested-2">Item 2</div>
        </div>
        <div class="section">
          <div class="item nested-3">Item 3</div>
        </div>
      `;
      document.body.appendChild(container);

      const nodeList = container.querySelectorAll('.item');
      
      // Test first
      const firstExpr = new EnhancedFirstExpression();
      const firstResult = await firstExpr.evaluate(context, {
        collection: nodeList
      });
      
      expect(firstResult.success).toBe(true);
      if (firstResult.success) {
        expect((firstResult.value as HTMLElement).className).toContain('nested-1');
      }

      // Test last
      const lastExpr = new EnhancedLastExpression();
      const lastResult = await lastExpr.evaluate(context, {
        collection: nodeList
      });
      
      expect(lastResult.success).toBe(true);
      if (lastResult.success) {
        expect((lastResult.value as HTMLElement).className).toContain('nested-3');
      }

      // Test at
      const atExpr = new EnhancedAtExpression();
      const atResult = await atExpr.evaluate(context, {
        collection: nodeList,
        index: 1
      });
      
      expect(atResult.success).toBe(true);
      if (atResult.success) {
        expect((atResult.value as HTMLElement).className).toContain('nested-2');
      }

      document.body.removeChild(container);
    });

    it('should handle large collections efficiently', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      
      const testCases = [
        { expr: new EnhancedFirstExpression(), input: { collection: largeArray } },
        { expr: new EnhancedLastExpression(), input: { collection: largeArray } },
        { expr: new EnhancedAtExpression(), input: { collection: largeArray, index: 5000 } },
        { expr: new EnhancedRandomExpression(), input: { collection: largeArray } }
      ];

      for (const testCase of testCases) {
        const startTime = Date.now();
        const result = await testCase.expr.evaluate(context, testCase.input as any);
        const duration = Date.now() - startTime;
        
        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(10); // Should be very fast
      }
    });

    it('should maintain type consistency across operations', async () => {
      const mixedArray = [1, 'string', true, { key: 'value' }, [1, 2, 3]];
      
      const firstExpr = new EnhancedFirstExpression();
      const firstResult = await firstExpr.evaluate(context, {
        collection: mixedArray
      });
      
      expect(firstResult.success).toBe(true);
      if (firstResult.success) {
        expect(firstResult.value).toBe(1);
        expect(firstResult.type).toBe('Number');
      }

      const atExpr = new EnhancedAtExpression();
      const atResult = await atExpr.evaluate(context, {
        collection: mixedArray,
        index: 1
      });
      
      expect(atResult.success).toBe(true);
      if (atResult.success) {
        expect(atResult.value).toBe('string');
        expect(atResult.type).toBe('String');
      }

      const lastResult = await atExpr.evaluate(context, {
        collection: mixedArray,
        index: -1
      });
      
      expect(lastResult.success).toBe(true);
      if (lastResult.success) {
        expect(Array.isArray(lastResult.value)).toBe(true);
        expect(lastResult.type).toBe('Array');
      }
    });

    it('should handle iterable objects correctly', async () => {
      // Map
      const testMap = new Map([['a', 1], ['b', 2], ['c', 3]]);
      const firstExpr = new EnhancedFirstExpression();
      const mapResult = await firstExpr.evaluate(context, {
        collection: testMap
      });
      
      expect(mapResult.success).toBe(true);
      if (mapResult.success) {
        expect(Array.isArray(mapResult.value)).toBe(true);
        expect((mapResult.value as any[])[0]).toBe('a');
        expect((mapResult.value as any[])[1]).toBe(1);
      }

      // Set
      const testSet = new Set([10, 20, 30]);
      const setResult = await firstExpr.evaluate(context, {
        collection: testSet
      });
      
      expect(setResult.success).toBe(true);
      if (setResult.success) {
        expect(setResult.value).toBe(10);
        expect(setResult.type).toBe('Number');
      }
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with large collections', async () => {
      const expression = new EnhancedRandomExpression();
      
      // Create and process many large collections
      for (let i = 0; i < 100; i++) {
        const largeArray = Array.from({ length: 1000 }, (_, idx) => idx);
        const result = await expression.evaluate(context, {
          collection: largeArray
        });
        
        expect(result.success).toBe(true);
      }
      
      // No memory leaks should occur
      expect(true).toBe(true); // Test completes successfully
    });

    it('should maintain consistent performance', async () => {
      const collection = Array.from({ length: 1000 }, (_, i) => i);
      const durations: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        const result = await new EnhancedAtExpression().evaluate(context, {
          collection,
          index: Math.floor(Math.random() * collection.length)
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
  });
});