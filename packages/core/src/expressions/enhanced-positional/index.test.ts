/**
 * Enhanced Positional Expressions Tests
 * Comprehensive test suite for enhanced positional navigation expressions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  EnhancedFirstExpression,
  EnhancedLastExpression,
  EnhancedAtExpression,
  enhancedPositionalExpressions
} from './index.ts';
import type { TypedExpressionContext } from '../../types/enhanced-expressions.ts';

// Mock DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as any;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.NodeList = dom.window.NodeList;
global.HTMLCollection = dom.window.HTMLCollection;

describe('Enhanced Positional Expressions', () => {
  let mockContext: TypedExpressionContext;
  let mockElement: HTMLElement;

  beforeEach(() => {
    // Create fresh DOM elements for each test
    mockElement = document.createElement('div');
    mockElement.id = 'test-element';

    // Create mock typed context
    mockContext = {
      me: mockElement,
      you: null,
      it: [1, 2, 3], // Default test collection
      result: { data: 'test-result' },
      locals: new Map(),
      globals: new Map(),
      event: undefined,
      
      // Enhanced expression context properties
      expressionStack: [],
      evaluationDepth: 0,
      validationMode: 'strict' as const,
      evaluationHistory: []
    };

    // Clear DOM
    document.body.innerHTML = '';
    document.body.appendChild(mockElement);
  });

  describe('EnhancedFirstExpression', () => {
    let firstExpression: EnhancedFirstExpression;

    beforeEach(() => {
      firstExpression = new EnhancedFirstExpression();
    });

    it('should have correct metadata', () => {
      expect(firstExpression.name).toBe('first');
      expect(firstExpression.category).toBe('Positional');
      expect(firstExpression.syntax).toBe('first [of collection]');
      expect(firstExpression.outputType).toBe('Any');
      expect(firstExpression.metadata.complexity).toBe('simple');
      expect(firstExpression.metadata.examples).toHaveLength(4);
    });

    it('should get first element from arrays', async () => {
      const tests = [
        [{ collection: [1, 2, 3, 4, 5] }, 1],
        [{ collection: ['a', 'b', 'c'] }, 'a'],
        [{ collection: [true, false] }, true],
        [{ collection: [] }, null], // Empty array
      ];

      for (const [input, expected] of tests) {
        const result = await firstExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }
    });

    it('should get first element from context.it when no collection provided', async () => {
      mockContext.it = ['context-first', 'context-second'];
      const result = await firstExpression.evaluate(mockContext, {});
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('context-first');
      }
    });

    it('should handle NodeList collections', async () => {
      // Create DOM elements
      const container = document.createElement('div');
      const span1 = document.createElement('span');
      span1.textContent = 'First';
      const span2 = document.createElement('span');
      span2.textContent = 'Second';
      
      container.appendChild(span1);
      container.appendChild(span2);
      document.body.appendChild(container);

      const nodeList = container.querySelectorAll('span');
      const result = await firstExpression.evaluate(mockContext, { collection: nodeList });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(span1);
        expect((result.value as HTMLElement).textContent).toBe('First');
      }
    });

    it('should handle HTMLCollection from DOM element children', async () => {
      const parent = document.createElement('div');
      const child1 = document.createElement('p');
      child1.textContent = 'Child 1';
      const child2 = document.createElement('p');
      child2.textContent = 'Child 2';
      
      parent.appendChild(child1);
      parent.appendChild(child2);
      
      const result = await firstExpression.evaluate(mockContext, { collection: parent });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(child1);
        expect((result.value as HTMLElement).textContent).toBe('Child 1');
      }
    });

    it('should handle string collections', async () => {
      const tests = [
        [{ collection: 'hello' }, 'h'],
        [{ collection: 'a' }, 'a'],
        [{ collection: '' }, null], // Empty string
      ];

      for (const [input, expected] of tests) {
        const result = await firstExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }
    });

    it('should handle objects with length property', async () => {
      const lengthObj = { 0: 'zero', 1: 'one', 2: 'two', length: 3 };
      const result = await firstExpression.evaluate(mockContext, { collection: lengthObj });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('zero');
      }
    });

    it('should handle null/undefined collections', async () => {
      const tests = [
        [{ collection: null }, null],
        // When collection is undefined, it uses context.it, so we need a separate test
      ];

      for (const [input, expected] of tests) {
        const result = await firstExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }

      // Test undefined collection with null context.it
      const nullItContext = { ...mockContext, it: null };
      const result = await firstExpression.evaluate(nullItContext, { collection: undefined });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(null);
      }
    });

    it('should handle unsupported collection types', async () => {
      const tests = [42, true, Symbol('test'), {}];

      for (const collection of tests) {
        const result = await firstExpression.evaluate(mockContext, { collection });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.name).toBe('UnsupportedCollectionTypeError');
          expect(result.error.code).toBe('UNSUPPORTED_COLLECTION_TYPE');
        }
      }
    });

    it('should track evaluation history', async () => {
      await firstExpression.evaluate(mockContext, { collection: [1, 2, 3] });
      
      expect(mockContext.evaluationHistory).toHaveLength(1);
      const evaluation = mockContext.evaluationHistory[0];
      expect(evaluation.expressionName).toBe('first');
      expect(evaluation.category).toBe('Positional');
      expect(evaluation.success).toBe(true);
      expect(evaluation.output).toBe(1);
    });

    it('should validate input correctly', () => {
      const validResult = firstExpression.validate({});
      expect(validResult.isValid).toBe(true);

      const validWithCollection = firstExpression.validate({ collection: [1, 2, 3] });
      expect(validWithCollection.isValid).toBe(true);

      // Currently all inputs are valid since collection is optional and can be any type
    });

    it('should have comprehensive LLM documentation', () => {
      expect(firstExpression.documentation.summary).toContain('Returns the first element from a collection');
      expect(firstExpression.documentation.parameters).toHaveLength(1);
      expect(firstExpression.documentation.examples).toHaveLength(5);
      expect(firstExpression.documentation.examples[0].title).toBe('Array first element');
      expect(firstExpression.documentation.tags).toContain('positional');
    });
  });

  describe('EnhancedLastExpression', () => {
    let lastExpression: EnhancedLastExpression;

    beforeEach(() => {
      lastExpression = new EnhancedLastExpression();
    });

    it('should have correct metadata', () => {
      expect(lastExpression.name).toBe('last');
      expect(lastExpression.category).toBe('Positional');
      expect(lastExpression.syntax).toBe('last [of collection]');
      expect(lastExpression.outputType).toBe('Any');
      expect(lastExpression.metadata.complexity).toBe('simple');
      expect(lastExpression.metadata.examples).toHaveLength(4);
    });

    it('should get last element from arrays', async () => {
      const tests = [
        [{ collection: [1, 2, 3, 4, 5] }, 5],
        [{ collection: ['a', 'b', 'c'] }, 'c'],
        [{ collection: [true, false] }, false],
        [{ collection: [] }, null], // Empty array
      ];

      for (const [input, expected] of tests) {
        const result = await lastExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }
    });

    it('should get last element from context.it when no collection provided', async () => {
      mockContext.it = ['context-first', 'context-last'];
      const result = await lastExpression.evaluate(mockContext, {});
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('context-last');
      }
    });

    it('should handle NodeList collections', async () => {
      // Create DOM elements
      const container = document.createElement('div');
      const span1 = document.createElement('span');
      span1.textContent = 'First';
      const span2 = document.createElement('span');
      span2.textContent = 'Last';
      
      container.appendChild(span1);
      container.appendChild(span2);
      document.body.appendChild(container);

      const nodeList = container.querySelectorAll('span');
      const result = await lastExpression.evaluate(mockContext, { collection: nodeList });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(span2);
        expect((result.value as HTMLElement).textContent).toBe('Last');
      }
    });

    it('should handle string collections', async () => {
      const tests = [
        [{ collection: 'hello' }, 'o'],
        [{ collection: 'a' }, 'a'],
        [{ collection: '' }, null], // Empty string
      ];

      for (const [input, expected] of tests) {
        const result = await lastExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }
    });

    it('should track evaluation history', async () => {
      await lastExpression.evaluate(mockContext, { collection: [1, 2, 3] });
      
      expect(mockContext.evaluationHistory).toHaveLength(1);
      const evaluation = mockContext.evaluationHistory[0];
      expect(evaluation.expressionName).toBe('last');
      expect(evaluation.category).toBe('Positional');
      expect(evaluation.success).toBe(true);
      expect(evaluation.output).toBe(3);
    });
  });

  describe('EnhancedAtExpression', () => {
    let atExpression: EnhancedAtExpression;

    beforeEach(() => {
      atExpression = new EnhancedAtExpression();
    });

    it('should have correct metadata', () => {
      expect(atExpression.name).toBe('at');
      expect(atExpression.category).toBe('Positional');
      expect(atExpression.syntax).toBe('at index [of collection]');
      expect(atExpression.outputType).toBe('Any');
      expect(atExpression.metadata.complexity).toBe('simple');
      expect(atExpression.metadata.examples).toHaveLength(4);
    });

    it('should get element at positive indices from arrays', async () => {
      const collection = ['zero', 'one', 'two', 'three'];
      
      const tests = [
        [{ index: 0, collection }, 'zero'],
        [{ index: 1, collection }, 'one'],
        [{ index: 2, collection }, 'two'],
        [{ index: 3, collection }, 'three'],
        [{ index: 4, collection }, null], // Out of bounds
      ];

      for (const [input, expected] of tests) {
        const result = await atExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }
    });

    it('should get element at negative indices from arrays', async () => {
      const collection = ['zero', 'one', 'two', 'three'];
      
      const tests = [
        [{ index: -1, collection }, 'three'], // Last element
        [{ index: -2, collection }, 'two'],   // Second to last
        [{ index: -3, collection }, 'one'],   // Third to last
        [{ index: -4, collection }, 'zero'],  // First element
        [{ index: -5, collection }, null],    // Out of bounds
      ];

      for (const [input, expected] of tests) {
        const result = await atExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }
    });

    it('should get element from context.it when no collection provided', async () => {
      mockContext.it = ['context-zero', 'context-one', 'context-two'];
      
      const tests = [
        [{ index: 0 }, 'context-zero'],
        [{ index: 1 }, 'context-one'],
        [{ index: -1 }, 'context-two'],
      ];

      for (const [input, expected] of tests) {
        const result = await atExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }
    });

    it('should handle NodeList collections', async () => {
      // Create DOM elements
      const container = document.createElement('div');
      const elements = ['First', 'Second', 'Third'].map(text => {
        const span = document.createElement('span');
        span.textContent = text;
        container.appendChild(span);
        return span;
      });
      document.body.appendChild(container);

      const nodeList = container.querySelectorAll('span');
      
      const tests = [
        [{ index: 0, collection: nodeList }, elements[0]],
        [{ index: 1, collection: nodeList }, elements[1]],
        [{ index: -1, collection: nodeList }, elements[2]],
        [{ index: 5, collection: nodeList }, null], // Out of bounds
      ];

      for (const [input, expected] of tests) {
        const result = await atExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }
    });

    it('should handle DOM element children', async () => {
      const parent = document.createElement('div');
      const children = ['Child1', 'Child2', 'Child3'].map(text => {
        const child = document.createElement('p');
        child.textContent = text;
        parent.appendChild(child);
        return child;
      });
      
      const tests = [
        [{ index: 0, collection: parent }, children[0]],
        [{ index: 2, collection: parent }, children[2]],
        [{ index: -1, collection: parent }, children[2]],
        [{ index: 5, collection: parent }, null], // Out of bounds
      ];

      for (const [input, expected] of tests) {
        const result = await atExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }
    });

    it('should handle string collections', async () => {
      const collection = 'hello';
      
      const tests = [
        [{ index: 0, collection }, 'h'],
        [{ index: 1, collection }, 'e'],
        [{ index: -1, collection }, 'o'],
        [{ index: -2, collection }, 'l'],
        [{ index: 10, collection }, null], // Out of bounds
      ];

      for (const [input, expected] of tests) {
        const result = await atExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }
    });

    it('should handle objects with length property', async () => {
      const lengthObj = { 0: 'zero', 1: 'one', 2: 'two', length: 3 };
      
      const tests = [
        [{ index: 0, collection: lengthObj }, 'zero'],
        [{ index: 1, collection: lengthObj }, 'one'],
        [{ index: -1, collection: lengthObj }, 'two'],
        [{ index: 5, collection: lengthObj }, null], // Out of bounds
      ];

      for (const [input, expected] of tests) {
        const result = await atExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }
    });

    it('should handle null/undefined collections', async () => {
      const tests = [
        [{ index: 0, collection: null }, null],
        // When collection is undefined, it uses context.it, so we need a separate test
      ];

      for (const [input, expected] of tests) {
        const result = await atExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }

      // Test undefined collection with null context.it
      const nullItContext = { ...mockContext, it: null };
      const result = await atExpression.evaluate(nullItContext, { index: 0, collection: undefined });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(null);
      }
    });

    it('should handle unsupported collection types', async () => {
      const tests = [42, true, Symbol('test'), {}];

      for (const collection of tests) {
        const result = await atExpression.evaluate(mockContext, { index: 0, collection });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.name).toBe('UnsupportedCollectionTypeError');
          expect(result.error.code).toBe('UNSUPPORTED_COLLECTION_TYPE');
        }
      }
    });

    it('should validate input correctly', () => {
      const validResult = atExpression.validate({ index: 0 });
      expect(validResult.isValid).toBe(true);

      const validWithCollection = atExpression.validate({ index: 1, collection: [1, 2, 3] });
      expect(validWithCollection.isValid).toBe(true);

      const invalidResult1 = atExpression.validate({}); // Missing index
      expect(invalidResult1.isValid).toBe(false);

      const invalidResult2 = atExpression.validate({ index: '0' }); // Wrong type
      expect(invalidResult2.isValid).toBe(false);

      const invalidResult3 = atExpression.validate({ index: 1.5 }); // Not integer
      expect(invalidResult3.isValid).toBe(false);
    });

    it('should track evaluation history', async () => {
      await atExpression.evaluate(mockContext, { index: 1, collection: [1, 2, 3] });
      
      expect(mockContext.evaluationHistory).toHaveLength(1);
      const evaluation = mockContext.evaluationHistory[0];
      expect(evaluation.expressionName).toBe('at');
      expect(evaluation.category).toBe('Positional');
      expect(evaluation.success).toBe(true);
      expect(evaluation.output).toBe(2);
    });

    it('should have comprehensive LLM documentation', () => {
      expect(atExpression.documentation.summary).toContain('Returns the element at a specific index');
      expect(atExpression.documentation.parameters).toHaveLength(2);
      expect(atExpression.documentation.examples).toHaveLength(5);
      expect(atExpression.documentation.examples[1].title).toBe('Negative index access');
      expect(atExpression.documentation.tags).toContain('indexing');
    });
  });

  describe('Expression Registry', () => {
    it('should export all enhanced positional expressions', () => {
      expect(enhancedPositionalExpressions.first).toBeInstanceOf(EnhancedFirstExpression);
      expect(enhancedPositionalExpressions.last).toBeInstanceOf(EnhancedLastExpression);
      expect(enhancedPositionalExpressions.at).toBeInstanceOf(EnhancedAtExpression);
    });

    it('should provide factory functions', async () => {
      const { 
        createEnhancedFirstExpression,
        createEnhancedLastExpression,
        createEnhancedAtExpression
      } = await import('./index.ts');

      expect(createEnhancedFirstExpression()).toBeInstanceOf(EnhancedFirstExpression);
      expect(createEnhancedLastExpression()).toBeInstanceOf(EnhancedLastExpression);
      expect(createEnhancedAtExpression()).toBeInstanceOf(EnhancedAtExpression);
    });
  });

  describe('Integration with Existing System', () => {
    it('should maintain backward compatibility with enhanced interface', () => {
      const firstExpr = enhancedPositionalExpressions.first;
      
      expect(firstExpr.name).toBe('first');
      expect(firstExpr.category).toBe('Positional');
      expect(typeof firstExpr.evaluate).toBe('function');
      expect(typeof firstExpr.validate).toBe('function');
    });

    it('should provide richer metadata than legacy expressions', () => {
      const firstExpr = enhancedPositionalExpressions.first;
      
      expect(firstExpr.metadata).toBeDefined();
      expect(firstExpr.metadata.examples).toBeDefined();
      expect(firstExpr.metadata.performance).toBeDefined();
      expect(firstExpr.documentation).toBeDefined();
      expect(firstExpr.documentation.examples).toBeDefined();
    });

    it('should handle context bridging', async () => {
      const firstExpr = enhancedPositionalExpressions.first;
      const result = await firstExpr.evaluate(mockContext, { collection: [1, 2, 3] });
      
      expect(result.success).toBe(true);
      expect(mockContext.evaluationHistory).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle evaluation errors gracefully', async () => {
      const atExpr = enhancedPositionalExpressions.at;
      
      const result = await atExpr.evaluate(mockContext, { index: 0, collection: Symbol('invalid') });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('UnsupportedCollectionTypeError');
        expect(result.error.suggestions).toBeDefined();
      }
    });

    it('should provide helpful validation messages', () => {
      const atExpr = enhancedPositionalExpressions.at;
      
      const result = atExpr.validate({ invalid: 'structure' });
      expect(result.isValid).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Characteristics', () => {
    it('should complete simple operations quickly', async () => {
      const firstExpr = enhancedPositionalExpressions.first;
      
      const startTime = Date.now();
      await firstExpr.evaluate(mockContext, { collection: [1, 2, 3] });
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(10); // Should be very fast
    });

    it('should track evaluation metrics', async () => {
      const lastExpr = enhancedPositionalExpressions.last;
      
      await lastExpr.evaluate(mockContext, { collection: [1, 2, 3] });
      
      const evaluation = mockContext.evaluationHistory[0];
      expect(evaluation.timestamp).toBeDefined();
      expect(evaluation.duration).toBeGreaterThanOrEqual(0);
      expect(evaluation.input).toEqual({ collection: [1, 2, 3] });
      expect(evaluation.output).toBe(3);
    });

    it('should handle large collections efficiently', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const atExpr = enhancedPositionalExpressions.at;
      
      const startTime = Date.now();
      const result = await atExpr.evaluate(mockContext, { index: 5000, collection: largeArray });
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(5000);
      }
      expect(duration).toBeLessThan(50); // Should still be fast
    });
  });
});