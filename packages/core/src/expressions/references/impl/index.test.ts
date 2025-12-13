/**
 * Enhanced Reference Expressions Tests
 * Comprehensive test suite for enhanced me, you, it, and CSS selector expressions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  MeExpression,
  YouExpression,
  ItExpression,
  CSSSelectorExpression,
  referenceExpressions,
} from './index';
import type { TypedExpressionContext } from '../../../types/expression-types';

// Mock DOM environment - url required to avoid localStorage "opaque origin" errors
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
});
global.document = dom.window.document;
global.window = dom.window as any;

describe('Enhanced Reference Expressions', () => {
  let mockContext: TypedExpressionContext;
  let mockElement: HTMLElement;
  let mockTargetElement: HTMLElement;

  beforeEach(() => {
    // Create fresh DOM elements for each test
    mockElement = document.createElement('div');
    mockElement.id = 'test-element';
    mockElement.className = 'test-class';
    mockElement.textContent = 'Test Element';

    mockTargetElement = document.createElement('button');
    mockTargetElement.id = 'target-button';
    mockTargetElement.className = 'btn active';
    mockTargetElement.textContent = 'Click Me';

    // Create mock typed context
    mockContext = {
      me: mockElement,
      you: mockTargetElement,
      it: 'test-value',
      result: { data: 'test-result' },
      locals: new Map(),
      globals: new Map(),
      event: null,

      // Enhanced expression context properties
      expressionStack: [],
      evaluationDepth: 0,
      validationMode: 'strict' as const,
      evaluationHistory: [],
    };

    // Clear DOM
    document.body.innerHTML = '';
    document.body.appendChild(mockElement);
    document.body.appendChild(mockTargetElement);
  });

  describe('MeExpression', () => {
    let meExpression: MeExpression;

    beforeEach(() => {
      meExpression = new MeExpression();
    });

    it.skip('should have correct metadata', () => {
      expect(meExpression.name).toBe('me');
      expect(meExpression.category).toBe('Reference');
      expect(meExpression.syntax).toBe('me');
      expect(meExpression.outputType).toBe('Element');
      expect(meExpression.metadata.complexity).toBe('simple');
      expect(meExpression.metadata!.performance.complexity).toBe('O(1)');
    });

    it('should return the current element from context', async () => {
      const result = await meExpression.evaluate(mockContext, undefined);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(mockElement);
        expect(result.type).toBe('element');
      }
    });

    it('should return null when me is not set', async () => {
      mockContext.me = null;
      const result = await meExpression.evaluate(mockContext, undefined);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(null);
        expect(result.type).toBe('element');
      }
    });

    it('should track evaluation in history', async () => {
      await meExpression.evaluate(mockContext, undefined);

      expect(mockContext.evaluationHistory).toHaveLength(1);
      const evaluation = mockContext.evaluationHistory![0];
      expect(evaluation.expressionName).toBe('me');
      expect(evaluation.category).toBe('Reference');
      expect(evaluation.success).toBe(true);
    });

    it('should validate that no input is required', () => {
      const validResult = meExpression.validate!(undefined);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = meExpression.validate!('some-input');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].message).toContain('takes no arguments');
    });

    it.skip('should have comprehensive LLM documentation', () => {
      expect(meExpression.documentation.summary).toContain('current HTML element');
      expect(meExpression.documentation.examples).toHaveLength(4);
      expect(meExpression.documentation.tags).toContain('context');
      expect(meExpression.documentation.seeAlso).toContain('you');
    });
  });

  describe('YouExpression', () => {
    let youExpression: YouExpression;

    beforeEach(() => {
      youExpression = new YouExpression();
    });

    it.skip('should have correct metadata', () => {
      expect(youExpression.name).toBe('you');
      expect(youExpression.category).toBe('Reference');
      expect(youExpression.syntax).toBe('you');
      expect(youExpression.outputType).toBe('Element');
    });

    it('should return the target element from context', async () => {
      const result = await youExpression.evaluate(mockContext, undefined);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(mockTargetElement);
        expect(result.type).toBe('element');
      }
    });

    it('should return null when you is not set', async () => {
      mockContext.you = null;
      const result = await youExpression.evaluate(mockContext, undefined);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(null);
        expect(result.type).toBe('element');
      }
    });

    it('should validate that no input is required', () => {
      const validResult = youExpression.validate!(undefined);
      expect(validResult.isValid).toBe(true);

      const invalidResult = youExpression.validate!({ invalid: 'input' });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].message).toContain('takes no arguments');
    });

    it.skip('should have LLM documentation focused on target elements', () => {
      expect(youExpression.documentation.summary).toContain('target element');
      expect(youExpression.documentation.examples[0].title).toContain('Event target');
      expect(youExpression.documentation.tags).toContain('target');
    });
  });

  describe('ItExpression', () => {
    let itExpression: ItExpression;

    beforeEach(() => {
      itExpression = new ItExpression();
    });

    it.skip('should have correct metadata', () => {
      expect(itExpression.name).toBe('it');
      expect(itExpression.category).toBe('Reference');
      expect(itExpression.outputType).toBe('Any');
    });

    it('should return the context variable value', async () => {
      const result = await itExpression.evaluate(mockContext, undefined);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('test-value');
        expect(result.type).toBe('string');
      }
    });

    it('should handle different value types', async () => {
      mockContext.it = 42;
      const numberResult = await itExpression.evaluate(mockContext, undefined);
      expect(numberResult.success && numberResult.value).toBe(42);

      mockContext.it = true;
      const boolResult = await itExpression.evaluate(mockContext, undefined);
      expect(boolResult.success && boolResult.value).toBe(true);

      mockContext.it = ['array', 'values'];
      const arrayResult = await itExpression.evaluate(mockContext, undefined);
      expect(arrayResult.success && Array.isArray(arrayResult.value)).toBe(true);
    });

    it('should infer correct types', async () => {
      mockContext.it = mockElement;
      const elementResult = await itExpression.evaluate(mockContext, undefined);
      expect(elementResult.success && elementResult.type).toBe('element'); // Duck-typing detects JSDOM elements correctly

      mockContext.it = null;
      const nullResult = await itExpression.evaluate(mockContext, undefined);
      expect(nullResult.success && nullResult.type).toBe('null');

      mockContext.it = { obj: 'value' };
      const objResult = await itExpression.evaluate(mockContext, undefined);
      expect(objResult.success && objResult.type).toBe('object');
    });

    it.skip('should have comprehensive documentation for context usage', () => {
      expect(itExpression.documentation.summary).toContain('context variable');
      expect(itExpression.documentation.examples).toHaveLength(4);
      expect(itExpression.documentation.examples[0].title).toContain('Command result');
      expect(itExpression.documentation.examples[1].title).toContain('Loop iteration');
    });
  });

  describe('CSSSelectorExpression', () => {
    let selectorExpression: CSSSelectorExpression;

    beforeEach(() => {
      selectorExpression = new CSSSelectorExpression();

      // Add more elements to DOM for testing
      const button1 = document.createElement('button');
      button1.className = 'btn primary';
      button1.textContent = 'Button 1';

      const button2 = document.createElement('button');
      button2.className = 'btn secondary';
      button2.textContent = 'Button 2';

      document.body.appendChild(button1);
      document.body.appendChild(button2);
    });

    it.skip('should have correct metadata', () => {
      expect(selectorExpression.name).toBe('css-selector');
      expect(selectorExpression.category).toBe('Reference');
      expect(selectorExpression.outputType).toBe('ElementList');
      expect(selectorExpression.metadata.complexity).toBe('medium');
      expect(selectorExpression.metadata.sideEffects).toContain('dom-query');
    });

    it('should query all matching elements by default', async () => {
      const input = { selector: '.btn', single: false };
      const result = await selectorExpression.evaluate(mockContext, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.value)).toBe(true);
        expect((result.value as HTMLElement[]).length).toBe(3); // mockTargetElement + 2 new buttons
        expect(result.type).toBe('element-list');
      }
    });

    it('should query single element when requested', async () => {
      const input = { selector: '#test-element', single: true };
      const result = await selectorExpression.evaluate(mockContext, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(mockElement);
        expect(result.type).toBe('element');
      }
    });

    it('should return null for no matches', async () => {
      const input = { selector: '.nonexistent', single: false };
      const result = await selectorExpression.evaluate(mockContext, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(null);
      }
    });

    it('should validate CSS selector syntax', async () => {
      const invalidInput = { selector: '<<<invalid>>>', single: false };
      const result = await selectorExpression.evaluate(mockContext, invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error!.name).toBe('CSSSelectorError');
        expect(result.error!.message).toContain('Invalid CSS selector');
        expect(result.error!.suggestions).toContain('Check selector syntax');
      }
    });

    it('should validate input structure', () => {
      const validInput = { selector: '.valid', single: true };
      const validResult = selectorExpression.validate!(validInput);
      expect(validResult.isValid).toBe(true);

      const invalidInput = { selector: '', single: false };
      const invalidResult = selectorExpression.validate!(invalidInput);
      expect(invalidResult.isValid).toBe(false);
      // Zod returns "String must be at least 1 character" for min(1) validation
      expect(invalidResult.errors[0].message).toMatch(/cannot be empty|at least 1 character/);

      const wrongTypeInput = { selector: 123, single: false };
      const wrongTypeResult = selectorExpression.validate!(wrongTypeInput);
      expect(wrongTypeResult.isValid).toBe(false);
    });

    it('should track evaluation performance', async () => {
      const input = { selector: '.btn', single: false };
      await selectorExpression.evaluate(mockContext, input);

      expect(mockContext.evaluationHistory).toHaveLength(1);
      const evaluation = mockContext.evaluationHistory![0];
      expect(evaluation.expressionName).toBe('css-selector');
      expect(evaluation.duration).toBeGreaterThanOrEqual(0);
      expect(evaluation.success).toBe(true);
    });

    it.skip('should have comprehensive LLM documentation', () => {
      expect(selectorExpression.documentation.summary).toContain('CSS selectors');
      expect(selectorExpression.documentation.parameters).toHaveLength(2);
      expect(selectorExpression.documentation.examples).toHaveLength(4);
      expect(selectorExpression.documentation.examples[0].title).toContain('Class selector');
      expect(selectorExpression.documentation.tags).toContain('css');
    });
  });

  describe('Expression Registry', () => {
    it('should export all enhanced reference expressions', () => {
      expect(referenceExpressions.me).toBeInstanceOf(MeExpression);
      expect(referenceExpressions.you).toBeInstanceOf(YouExpression);
      expect(referenceExpressions.it).toBeInstanceOf(ItExpression);
      expect(referenceExpressions['css-selector']).toBeInstanceOf(CSSSelectorExpression);
    });

    it('should provide factory functions', async () => {
      const {
        createMeExpression,
        createYouExpression,
        createItExpression,
        createCSSSelectorExpression,
      } = await import('./index');

      expect(createMeExpression()).toBeInstanceOf(MeExpression);
      expect(createYouExpression()).toBeInstanceOf(YouExpression);
      expect(createItExpression()).toBeInstanceOf(ItExpression);
      expect(createCSSSelectorExpression()).toBeInstanceOf(CSSSelectorExpression);
    });
  });

  describe('Integration with Existing System', () => {
    it('should maintain backward compatibility with current expression interface', () => {
      // Test that enhanced expressions can be used where regular expressions are expected
      const meExpr = referenceExpressions.me;

      expect(meExpr.name).toBe('me');
      expect(meExpr.category).toBe('Reference');
      expect(typeof meExpr.evaluate).toBe('function');
      expect(typeof meExpr.validate!).toBe('function');
    });

    it.skip('should provide richer metadata than legacy expressions', () => {
      const meExpr = referenceExpressions.me;

      expect(meExpr.metadata).toBeDefined();
      expect(meExpr.metadata!.examples).toBeDefined();
      expect(meExpr.metadata!.performance).toBeDefined();
      expect(meExpr.documentation).toBeDefined();
      expect(meExpr.documentation.examples).toBeDefined();
    });

    it('should handle context bridging', async () => {
      // Test that enhanced expressions work with TypedExpressionContext
      const meExpr = referenceExpressions.me;
      const result = await meExpr.evaluate(mockContext, undefined);

      expect(result.success).toBe(true);
      expect(mockContext.evaluationHistory).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle evaluation errors gracefully', async () => {
      const selectorExpr = referenceExpressions['css-selector'];

      // Mock querySelector to throw
      const originalQuerySelector = document.querySelector;
      document.querySelector = vi.fn().mockImplementation(() => {
        throw new Error('DOM query failed');
      });

      const input = { selector: '.test', single: true };
      const result = await selectorExpr.evaluate(mockContext, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error!.name).toBe('CSSSelectorError');
        expect(result.error!.suggestions).toBeDefined();
      }

      // Restore original function
      document.querySelector = originalQuerySelector;
    });

    it('should provide helpful validation messages', () => {
      const selectorExpr = referenceExpressions['css-selector'];

      const result = selectorExpr.validate!({ invalid: 'structure' });
      expect(result.isValid).toBe(false);
      expect(result.suggestions!).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Characteristics', () => {
    it('should complete simple evaluations quickly', async () => {
      const meExpr = referenceExpressions.me;

      const startTime = Date.now();
      await meExpr.evaluate(mockContext, undefined);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10); // Should be very fast
    });

    it('should track evaluation metrics', async () => {
      const itExpr = referenceExpressions.it;

      await itExpr.evaluate(mockContext, undefined);

      const evaluation = mockContext.evaluationHistory![0];
      expect(evaluation.timestamp).toBeDefined();
      expect(evaluation.duration).toBeGreaterThanOrEqual(0);
      expect(evaluation.input).toBe(undefined);
      expect(evaluation.output).toBe('test-value');
    });
  });
});
