/**
 * Enhanced Positional Bridge Tests
 * Tests for backward compatibility and migration utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  createTypedExpressionContext,
  updateExecutionContext,
  EnhancedPositionalAdapter,
  LegacyCompatibilityLayer,
  ExpressionMigrationUtility,
  PositionalUtilities,
} from './bridge.ts';
import type { ExecutionContext } from '../../../types/core.ts';

// Mock DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as any;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.NodeList = dom.window.NodeList;
global.HTMLCollection = dom.window.HTMLCollection;

describe('Enhanced Positional Bridge', () => {
  let mockContext: ExecutionContext;
  let mockElement: HTMLElement;

  beforeEach(() => {
    // Create fresh DOM elements for each test
    mockElement = document.createElement('div');
    mockElement.id = 'test-element';

    // Create mock execution context
    mockContext = {
      me: mockElement,
      you: null,
      it: [1, 2, 3, 4, 5], // Default test collection
      result: 'test-result',
      locals: new Map(),
      globals: new Map(),
      event: null,
    };

    // Clear DOM
    document.body.innerHTML = '';
    document.body.appendChild(mockElement);
  });

  describe('Context Conversion', () => {
    it('should convert ExecutionContext to TypedExpressionContext', () => {
      const typedContext = createTypedExpressionContext(mockContext);

      expect(typedContext.me).toBe(mockContext.me);
      expect(typedContext.you).toBe(mockContext.you);
      expect(typedContext.it).toBe(mockContext.it);
      expect(typedContext.result).toBe(mockContext.result);
      expect(typedContext.locals).toBe(mockContext.locals);
      expect(typedContext.globals).toBe(mockContext.globals);
      expect(typedContext.event).toBe(mockContext.event);

      // Enhanced properties
      expect(typedContext.expressionStack).toEqual([]);
      expect(typedContext.evaluationDepth).toBe(0);
      expect(typedContext.validationMode).toBe('strict');
      expect(typedContext.evaluationHistory).toEqual([]);
    });

    it('should handle missing maps in ExecutionContext', () => {
      const contextWithoutMaps = {
        ...mockContext,
        locals: undefined,
        globals: undefined,
        event: undefined,
      } as any;

      const typedContext = createTypedExpressionContext(contextWithoutMaps);

      expect(typedContext.locals).toBeInstanceOf(Map);
      expect(typedContext.globals).toBeInstanceOf(Map);
      expect(typedContext.event).toBe(null);
    });

    it('should update ExecutionContext from TypedExpressionContext', () => {
      const typedContext = createTypedExpressionContext(mockContext);

      // Modify typed context
      typedContext.result = 'updated-result';
      typedContext.it = ['modified', 'collection'];

      const updatedContext = updateExecutionContext(mockContext, typedContext);

      expect(updatedContext.result).toBe('updated-result');
      expect(updatedContext.it).toEqual(['modified', 'collection']);
      expect(updatedContext.me).toBe(mockContext.me);
    });
  });

  describe('EnhancedPositionalAdapter', () => {
    it('should evaluate enhanced first expression', async () => {
      const result = await EnhancedPositionalAdapter.evaluateFirst(mockContext, [10, 20, 30]);
      expect(result).toBe(10);
    });

    it('should evaluate enhanced last expression', async () => {
      const result = await EnhancedPositionalAdapter.evaluateLast(mockContext, [10, 20, 30]);
      expect(result).toBe(30);
    });

    it('should evaluate enhanced at expression', async () => {
      const result = await EnhancedPositionalAdapter.evaluateAt(mockContext, 1, [10, 20, 30]);
      expect(result).toBe(20);
    });

    it('should handle first expression errors gracefully', async () => {
      // Mock console.warn to avoid output during tests
      const originalWarn = console.warn;
      console.warn = () => {};

      const result = await EnhancedPositionalAdapter.evaluateFirst(mockContext, Symbol('invalid'));
      expect(result).toBe(null); // Fallback value

      console.warn = originalWarn;
    });

    it('should provide expression metadata', () => {
      const metadata = EnhancedPositionalAdapter.getExpressionMetadata('first');
      expect(metadata).toBeDefined();
      expect(metadata?.category).toBe('Positional');
      expect(metadata?.complexity).toBe('simple');
    });

    it('should provide expression documentation', () => {
      const documentation = EnhancedPositionalAdapter.getExpressionDocumentation('last');
      expect(documentation).toBeDefined();
      expect(documentation?.summary).toContain('Returns the last element');
      expect(documentation?.parameters).toHaveLength(1);
    });

    it('should validate expression input', () => {
      const validation = EnhancedPositionalAdapter.validateExpressionInput('at', {
        index: 0,
        collection: [1, 2, 3],
      });
      expect(validation).toBeDefined();
      expect(validation?.isValid).toBe(true);
    });
  });

  describe('LegacyCompatibilityLayer', () => {
    it('should provide legacy-compatible first expression', async () => {
      const expression = LegacyCompatibilityLayer.firstExpression;

      expect(expression.name).toBe('first');
      expect(expression.category).toBe('Reference');
      expect(expression.evaluatesTo).toBe('Any');

      const result = await expression.evaluate(mockContext, [100, 200, 300]);
      expect(result).toBe(100);
    });

    it('should provide legacy-compatible last expression', async () => {
      const expression = LegacyCompatibilityLayer.lastExpression;

      expect(expression.name).toBe('last');
      expect(expression.category).toBe('Reference');
      expect(expression.evaluatesTo).toBe('Any');

      const result = await expression.evaluate(mockContext, [100, 200, 300]);
      expect(result).toBe(300);
    });

    it('should provide legacy-compatible at expression', async () => {
      const expression = LegacyCompatibilityLayer.atExpression;

      expect(expression.name).toBe('at');
      expect(expression.category).toBe('Reference');
      expect(expression.evaluatesTo).toBe('Any');

      const result = await expression.evaluate(mockContext, 1, [100, 200, 300]);
      expect(result).toBe(200);
    });

    it('should validate inputs in legacy format', () => {
      const firstValidation = LegacyCompatibilityLayer.firstExpression.validate([]);
      expect(firstValidation).toBe(null); // Valid

      const firstInvalidValidation = LegacyCompatibilityLayer.firstExpression.validate([1, 2]); // Too many args
      expect(firstInvalidValidation).toContain('at most one argument');

      const atValidation = LegacyCompatibilityLayer.atExpression.validate([0]);
      expect(atValidation).toBe(null); // Valid

      const atInvalidValidation = LegacyCompatibilityLayer.atExpression.validate(['not-number']);
      expect(atInvalidValidation).toContain('index must be a number');
    });
  });

  describe('ExpressionMigrationUtility', () => {
    afterEach(() => {
      // Reset migration state after each test
      ExpressionMigrationUtility.disableAllEnhanced();
    });

    it('should manage expression migration states', () => {
      expect(ExpressionMigrationUtility.isEnhancedEnabled('first')).toBe(false);

      ExpressionMigrationUtility.enableEnhanced('first');
      expect(ExpressionMigrationUtility.isEnhancedEnabled('first')).toBe(true);

      ExpressionMigrationUtility.disableEnhanced('first');
      expect(ExpressionMigrationUtility.isEnhancedEnabled('first')).toBe(false);
    });

    it('should enable/disable all enhanced expressions', () => {
      ExpressionMigrationUtility.enableAllEnhanced();

      expect(ExpressionMigrationUtility.isEnhancedEnabled('first')).toBe(true);
      expect(ExpressionMigrationUtility.isEnhancedEnabled('last')).toBe(true);
      expect(ExpressionMigrationUtility.isEnhancedEnabled('at')).toBe(true);

      ExpressionMigrationUtility.disableAllEnhanced();

      expect(ExpressionMigrationUtility.isEnhancedEnabled('first')).toBe(false);
      expect(ExpressionMigrationUtility.isEnhancedEnabled('last')).toBe(false);
      expect(ExpressionMigrationUtility.isEnhancedEnabled('at')).toBe(false);
    });

    it('should provide migration status', () => {
      ExpressionMigrationUtility.enableEnhanced('first');
      ExpressionMigrationUtility.enableEnhanced('last');

      const status = ExpressionMigrationUtility.getMigrationStatus();
      expect(status.first).toBe(true);
      expect(status.last).toBe(true);
      expect(status.at).toBe(false);
    });
  });

  describe('PositionalUtilities', () => {
    it('should perform safe first operations', async () => {
      const result = await PositionalUtilities.safeFirst(mockContext, [1, 2, 3]);
      expect(result.success).toBe(true);
      expect(result.value).toBe(1);
    });

    it('should handle first operation failures with fallback', async () => {
      const result = await PositionalUtilities.safeFirst(
        mockContext,
        Symbol('invalid'),
        'fallback'
      );
      expect(result.success).toBe(false);
      expect(result.value).toBe('fallback');
      expect(result.error).toBeDefined();
    });

    it('should handle first operation failures without fallback', async () => {
      const result = await PositionalUtilities.safeFirst(mockContext, Symbol('invalid'));
      expect(result.success).toBe(false);
      expect(result.value).toBe(null);
      expect(result.error).toBeDefined();
    });

    it('should perform safe last operations', async () => {
      const result = await PositionalUtilities.safeLast(mockContext, [1, 2, 3]);
      expect(result.success).toBe(true);
      expect(result.value).toBe(3);
    });

    it('should perform safe at operations', async () => {
      const result = await PositionalUtilities.safeAt(mockContext, 1, [10, 20, 30]);
      expect(result.success).toBe(true);
      expect(result.value).toBe(20);
    });

    it('should perform batch positional operations', async () => {
      const operations = [
        { type: 'first' as const, collection: [1, 2, 3], key: 'first_result' },
        { type: 'last' as const, collection: [4, 5, 6], key: 'last_result' },
        { type: 'at' as const, collection: [7, 8, 9], index: 1, key: 'at_result' },
      ];

      const result = await PositionalUtilities.batchPositionalOperations(mockContext, operations);

      expect(result.success).toBe(true);
      expect(result.results.first_result).toBe(1);
      expect(result.results.last_result).toBe(6);
      expect(result.results.at_result).toBe(8);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle batch operation failures', async () => {
      const operations = [
        { type: 'first' as const, collection: [1, 2, 3], key: 'success' },
        { type: 'at' as const, collection: [4, 5, 6], key: 'missing_index' }, // Missing index
        { type: 'first' as const, collection: Symbol('invalid'), key: 'invalid_collection' },
      ];

      const result = await PositionalUtilities.batchPositionalOperations(mockContext, operations);

      expect(result.success).toBe(false);
      expect(result.results.success).toBe(1); // Should succeed
      expect(result.errors).toHaveLength(2); // Two failures
    });

    it('should provide available operations metadata', () => {
      const operations = PositionalUtilities.getAvailableOperations();

      expect(operations.first).toBeDefined();
      expect(operations.first.description).toContain('Get first element');
      expect(operations.last).toBeDefined();
      expect(operations.at).toBeDefined();
      expect(operations.at.description).toContain('negative indexing');
    });

    it('should analyze different collection types', () => {
      // Array analysis
      const arrayAnalysis = PositionalUtilities.analyzeCollection([1, 'two', 3]);
      expect(arrayAnalysis.type).toBe('array');
      expect(arrayAnalysis.length).toBe(3);
      expect(arrayAnalysis.isIndexable).toBe(true);
      expect(arrayAnalysis.supportsNegativeIndexing).toBe(true);
      expect(arrayAnalysis.metadata.elementTypes).toContain('number');
      expect(arrayAnalysis.metadata.elementTypes).toContain('string');

      // String analysis
      const stringAnalysis = PositionalUtilities.analyzeCollection('hello');
      expect(stringAnalysis.type).toBe('string');
      expect(stringAnalysis.length).toBe(5);
      expect(stringAnalysis.isIndexable).toBe(true);

      // Null analysis
      const nullAnalysis = PositionalUtilities.analyzeCollection(null);
      expect(nullAnalysis.type).toBe('null');
      expect(nullAnalysis.length).toBe(0);
      expect(nullAnalysis.isIndexable).toBe(false);

      // Unsupported type analysis
      const numberAnalysis = PositionalUtilities.analyzeCollection(42);
      expect(numberAnalysis.type).toBe('number');
      expect(numberAnalysis.isIndexable).toBe(false);
      expect(numberAnalysis.metadata.unsupported).toBe(true);
    });

    it('should analyze DOM collections', () => {
      // Create DOM elements for testing
      const container = document.createElement('div');
      const span1 = document.createElement('span');
      const span2 = document.createElement('p');
      container.appendChild(span1);
      container.appendChild(span2);
      document.body.appendChild(container);

      // Element analysis
      const elementAnalysis = PositionalUtilities.analyzeCollection(container);
      expect(elementAnalysis.type).toBe('Element');
      expect(elementAnalysis.length).toBe(2);
      expect(elementAnalysis.metadata.tagName).toBe('DIV');
      expect(elementAnalysis.metadata.childCount).toBe(2);

      // NodeList analysis
      const nodeList = container.querySelectorAll('*');
      const nodeListAnalysis = PositionalUtilities.analyzeCollection(nodeList);
      expect(nodeListAnalysis.type).toBe('NodeList');
      expect(nodeListAnalysis.length).toBe(2);
      expect(nodeListAnalysis.metadata.nodeTypes).toContain('SPAN');
      expect(nodeListAnalysis.metadata.nodeTypes).toContain('P');
    });
  });

  describe('Error Handling Integration', () => {
    it('should provide detailed error information through bridge', async () => {
      const result = await PositionalUtilities.safeAt(mockContext, 0, Symbol('invalid'));

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle unexpected errors gracefully', async () => {
      // Force an error by passing invalid arguments to internal functions
      const result = await PositionalUtilities.safeFirst(mockContext, {
        get length() {
          throw new Error('Getter error');
        },
      });

      expect(result.success).toBe(false);
      expect(result.value).toBe(null);
      expect(result.error).toBeDefined();
    });
  });

  describe('Performance and Caching', () => {
    it('should complete simple operations quickly', async () => {
      const startTime = Date.now();
      await PositionalUtilities.safeFirst(mockContext, [1, 2, 3]);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50); // Should be very fast
    });

    it('should handle multiple operations efficiently', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => ({
        type: 'at' as const,
        collection: Array.from({ length: 100 }, (_, j) => j),
        index: i * 10,
        key: `op_${i}`,
      }));

      const startTime = Date.now();
      const result = await PositionalUtilities.batchPositionalOperations(mockContext, operations);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(100); // Should handle batch operations efficiently
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing expression interfaces', () => {
      const firstExpr = LegacyCompatibilityLayer.firstExpression;

      expect(firstExpr).toHaveProperty('name');
      expect(firstExpr).toHaveProperty('category');
      expect(firstExpr).toHaveProperty('evaluatesTo');
      expect(firstExpr).toHaveProperty('evaluate');
      expect(firstExpr).toHaveProperty('validate');

      expect(typeof firstExpr.evaluate).toBe('function');
      expect(typeof firstExpr.validate).toBe('function');
    });

    it('should work with existing code patterns', async () => {
      // Simulate existing usage patterns
      const expressions = {
        first: LegacyCompatibilityLayer.firstExpression,
        last: LegacyCompatibilityLayer.lastExpression,
        at: LegacyCompatibilityLayer.atExpression,
      };

      // Test first
      const firstResult = await expressions.first.evaluate(mockContext, [10, 20, 30]);
      expect(firstResult).toBe(10);

      // Test last
      const lastResult = await expressions.last.evaluate(mockContext, [10, 20, 30]);
      expect(lastResult).toBe(30);

      // Test at
      const atResult = await expressions.at.evaluate(mockContext, 1, [10, 20, 30]);
      expect(atResult).toBe(20);
    });
  });
});
