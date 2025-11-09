/**
 * Enhanced Conversion Expressions Bridge Tests
 * Tests for integration between enhanced conversion expressions and legacy systems
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  createTypedExpressionContext,
  updateExecutionContext,
  EnhancedConversionAdapter,
  LegacyCompatibilityLayer,
  ExpressionMigrationUtility,
  ConversionUtilities,
} from './bridge.ts';
import type { ExecutionContext } from '../../../types/core.ts';
import type { TypedExpressionContext } from '../../../types/enhanced-expressions.ts';

// Mock DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as any;
global.Element = dom.window.Element;
global.HTMLFormElement = dom.window.HTMLFormElement;
global.HTMLInputElement = dom.window.HTMLInputElement;

describe('Enhanced Conversion Bridge', () => {
  let mockExecutionContext: ExecutionContext;
  let mockElement: HTMLElement;

  beforeEach(() => {
    // Create fresh DOM elements for each test
    mockElement = document.createElement('div');
    mockElement.id = 'test-element';

    // Create mock execution context (legacy format)
    mockExecutionContext = {
      me: mockElement,
      you: null,
      it: 'test-value',
      result: { data: 'test-result' },
      locals: new Map(),
      globals: new Map(),
      event: null,
    };

    // Clear DOM
    document.body.innerHTML = '';
    document.body.appendChild(mockElement);

    // Reset migration utility
    ExpressionMigrationUtility.disableAllEnhanced();
  });

  describe('Context Conversion', () => {
    it('should convert ExecutionContext to TypedExpressionContext', () => {
      const typedContext = createTypedExpressionContext(mockExecutionContext);

      // Check that core properties are preserved
      expect(typedContext.me).toBe(mockExecutionContext.me);
      expect(typedContext.you).toBe(mockExecutionContext.you);
      expect(typedContext.it).toBe(mockExecutionContext.it);
      expect(typedContext.result).toBe(mockExecutionContext.result);
      expect(typedContext.locals).toBe(mockExecutionContext.locals);
      expect(typedContext.globals).toBe(mockExecutionContext.globals);
      expect(typedContext.event).toBe(mockExecutionContext.event);

      // Check that enhanced properties are added
      expect(typedContext.expressionStack).toEqual([]);
      expect(typedContext.evaluationDepth).toBe(0);
      expect(typedContext.validationMode).toBe('strict');
      expect(typedContext.evaluationHistory).toEqual([]);
    });

    it('should handle missing maps in ExecutionContext', () => {
      const contextWithNulls = {
        ...mockExecutionContext,
        locals: undefined,
        globals: undefined,
        event: undefined,
      };

      const typedContext = createTypedExpressionContext(contextWithNulls as any);

      expect(typedContext.locals).toBeInstanceOf(Map);
      expect(typedContext.globals).toBeInstanceOf(Map);
      expect(typedContext.event).toBe(null);
    });

    it('should update ExecutionContext from TypedExpressionContext', () => {
      const typedContext: TypedExpressionContext = {
        me: mockElement,
        you: mockElement,
        it: 'modified-value',
        result: { modified: true },
        locals: new Map([['key', 'value']]),
        globals: new Map([['global', 'data']]),
        event: null,
        expressionStack: [],
        evaluationDepth: 1,
        validationMode: 'strict',
        evaluationHistory: [],
      };

      const updatedContext = updateExecutionContext(mockExecutionContext, typedContext);

      expect(updatedContext.me).toBe(typedContext.me);
      expect(updatedContext.you).toBe(typedContext.you);
      expect(updatedContext.it).toBe(typedContext.it);
      expect(updatedContext.result).toBe(typedContext.result);
      expect(updatedContext.locals).toBe(typedContext.locals);
      expect(updatedContext.globals).toBe(typedContext.globals);
      expect(updatedContext.event).toBe(typedContext.event);
    });
  });

  describe('EnhancedConversionAdapter', () => {
    it('should evaluate enhanced as expression', async () => {
      const result = await EnhancedConversionAdapter.evaluateAs(mockExecutionContext, '123', 'Int');
      expect(result).toBe(123);
    });

    it('should evaluate enhanced is expression', async () => {
      const result = await EnhancedConversionAdapter.evaluateIs(mockExecutionContext, 42, 'number');
      expect(result).toBe(true);

      const result2 = await EnhancedConversionAdapter.evaluateIs(
        mockExecutionContext,
        'hello',
        'number'
      );
      expect(result2).toBe(false);
    });

    it('should handle conversion errors gracefully', async () => {
      // Mock console.warn to avoid test output
      const originalWarn = console.warn;
      console.warn = () => {};

      try {
        const result = await EnhancedConversionAdapter.evaluateAs(
          mockExecutionContext,
          'invalid',
          'Number'
        );
        // Should fallback to original value when conversion fails
        expect(result).toBe('invalid');
      } finally {
        console.warn = originalWarn;
      }
    });

    it('should provide expression metadata', () => {
      const metadata = EnhancedConversionAdapter.getExpressionMetadata('as');
      expect(metadata).toBeDefined();
      expect(metadata?.category).toBe('Conversion');
      expect(metadata?.complexity).toBe('medium');
    });

    it('should provide expression documentation', () => {
      const documentation = EnhancedConversionAdapter.getExpressionDocumentation('as');
      expect(documentation).toBeDefined();
      expect(documentation?.summary).toContain('Converts values between different types');
      expect(documentation?.parameters).toHaveLength(2);
    });

    it('should validate expression input', () => {
      const validation = EnhancedConversionAdapter.validateExpressionInput('as', {
        value: 'test',
        type: 'String',
      });
      expect(validation?.isValid).toBe(true);

      const invalidValidation = EnhancedConversionAdapter.validateExpressionInput('as', {
        value: 'test',
      });
      expect(invalidValidation?.isValid).toBe(false);
    });
  });

  describe('LegacyCompatibilityLayer', () => {
    it('should provide legacy-compatible as expression', async () => {
      const expr = LegacyCompatibilityLayer.asExpression;
      expect(expr.name).toBe('as');
      expect(expr.category).toBe('Conversion');
      expect(expr.evaluatesTo).toBe('Any');

      const result = await expr.evaluate(mockExecutionContext, '123', 'Int');
      expect(result).toBe(123);
    });

    it('should provide legacy-compatible is expression', async () => {
      const expr = LegacyCompatibilityLayer.isExpression;
      expect(expr.name).toBe('is');
      expect(expr.category).toBe('Conversion');
      expect(expr.evaluatesTo).toBe('Boolean');

      const result = await expr.evaluate(mockExecutionContext, 42, 'number');
      expect(result).toBe(true);
    });

    it('should validate inputs in legacy format', () => {
      const asExpr = LegacyCompatibilityLayer.asExpression;

      expect(asExpr.validate(['value', 'String'])).toBe(null);
      expect(asExpr.validate(['value'])).toContain('exactly two arguments');
      expect(asExpr.validate(['value', 123])).toContain('must be a string');

      const isExpr = LegacyCompatibilityLayer.isExpression;

      expect(isExpr.validate(['value', 'string'])).toBe(null);
      expect(isExpr.validate(['value'])).toContain('exactly two arguments');
    });
  });

  describe('ExpressionMigrationUtility', () => {
    it('should manage expression migration states', () => {
      expect(ExpressionMigrationUtility.isEnhancedEnabled('as')).toBe(false);

      ExpressionMigrationUtility.enableEnhanced('as');
      expect(ExpressionMigrationUtility.isEnhancedEnabled('as')).toBe(true);

      ExpressionMigrationUtility.disableEnhanced('as');
      expect(ExpressionMigrationUtility.isEnhancedEnabled('as')).toBe(false);
    });

    it('should enable/disable all enhanced expressions', () => {
      ExpressionMigrationUtility.enableAllEnhanced();
      expect(ExpressionMigrationUtility.isEnhancedEnabled('as')).toBe(true);
      expect(ExpressionMigrationUtility.isEnhancedEnabled('is')).toBe(true);

      ExpressionMigrationUtility.disableAllEnhanced();
      expect(ExpressionMigrationUtility.isEnhancedEnabled('as')).toBe(false);
      expect(ExpressionMigrationUtility.isEnhancedEnabled('is')).toBe(false);
    });

    it('should provide migration status', () => {
      ExpressionMigrationUtility.enableEnhanced('as');
      ExpressionMigrationUtility.disableEnhanced('is');

      const status = ExpressionMigrationUtility.getMigrationStatus();
      expect(status['as']).toBe(true);
      expect(status['is']).toBe(false);
    });
  });

  describe('ConversionUtilities', () => {
    it('should perform safe conversions', async () => {
      const result = await ConversionUtilities.safeConvert(mockExecutionContext, '123', 'Int');
      expect(result.success).toBe(true);
      expect(result.value).toBe(123);
      expect(result.error).toBeUndefined();
    });

    it('should handle conversion failures with fallback', async () => {
      const result = await ConversionUtilities.safeConvert(
        mockExecutionContext,
        'invalid',
        'Number',
        0
      );
      expect(result.success).toBe(false);
      expect(result.value).toBe(0); // Fallback value
      expect(result.error).toBeDefined();
    });

    it('should handle conversion failures without fallback', async () => {
      const result = await ConversionUtilities.safeConvert(
        mockExecutionContext,
        'invalid',
        'Number'
      );
      expect(result.success).toBe(false);
      expect(result.value).toBe('invalid'); // Original value
      expect(result.error).toBeDefined();
    });

    it('should perform batch conversions', async () => {
      const conversions = [
        { value: '123', type: 'Int', key: 'number' },
        { value: 'hello', type: 'String', key: 'text' },
        { value: 'true', type: 'Boolean', key: 'flag' },
      ];

      const result = await ConversionUtilities.batchConvert(mockExecutionContext, conversions);

      expect(result.success).toBe(true);
      expect(result.results.number).toBe(123);
      expect(result.results.text).toBe('hello');
      expect(result.results.flag).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle batch conversion failures', async () => {
      const conversions = [
        { value: '123', type: 'Int', key: 'valid' },
        { value: 'invalid', type: 'Number', key: 'invalid' },
      ];

      const result = await ConversionUtilities.batchConvert(mockExecutionContext, conversions);

      expect(result.success).toBe(false);
      expect(result.results.valid).toBe(123);
      expect(result.results.invalid).toBe('invalid'); // Original value on failure
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].key).toBe('invalid');
    });

    it('should provide available conversion types', () => {
      const conversions = ConversionUtilities.getAvailableConversions();

      expect(conversions).toHaveProperty('String');
      expect(conversions).toHaveProperty('Number');
      expect(conversions).toHaveProperty('Boolean');
      expect(conversions).toHaveProperty('Array');
      expect(conversions).toHaveProperty('Object');
      expect(conversions).toHaveProperty('Date');
      expect(conversions).toHaveProperty('JSON');
      expect(conversions).toHaveProperty('Values');

      expect(conversions.String.description).toContain('Convert to string');
      expect(conversions.Number.complexity).toBe('simple');
      expect(conversions.Object.complexity).toBe('medium');
    });
  });

  describe('Form Processing Integration', () => {
    it('should extract form values through bridge', async () => {
      // Create a form with inputs
      const form = document.createElement('form');

      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.name = 'name';
      textInput.value = 'John Doe';

      const numberInput = document.createElement('input');
      numberInput.type = 'number';
      numberInput.name = 'age';
      numberInput.value = '25';

      form.appendChild(textInput);
      form.appendChild(numberInput);
      document.body.appendChild(form);

      const result = await EnhancedConversionAdapter.evaluateAs(
        mockExecutionContext,
        form,
        'Values'
      );

      expect(result).toEqual({
        name: 'John Doe',
        age: 25,
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should provide detailed error information through bridge', async () => {
      const result = await ConversionUtilities.safeConvert(
        mockExecutionContext,
        'not-a-date',
        'Date'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.name).toBe('DateConversionError');
      expect(result.error.code).toBe('INVALID_DATE');
      expect(result.error.suggestions).toBeDefined();
      expect(result.error.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle unexpected errors gracefully', async () => {
      // Mock a context that might cause issues
      const badContext = null as any;

      const result = await ConversionUtilities.safeConvert(badContext, 'test', 'String');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Performance and Caching', () => {
    it('should complete simple conversions quickly', async () => {
      const startTime = Date.now();
      await EnhancedConversionAdapter.evaluateAs(mockExecutionContext, '123', 'Int');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10); // Should be very fast
    });

    it('should handle multiple conversions efficiently', async () => {
      const conversions = Array.from({ length: 100 }, (_, i) => ({
        value: String(i),
        type: 'Int',
        key: `num_${i}`,
      }));

      const startTime = Date.now();
      const result = await ConversionUtilities.batchConvert(mockExecutionContext, conversions);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(Object.keys(result.results)).toHaveLength(100);
      expect(duration).toBeLessThan(100); // Should handle batch efficiently
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing expression interfaces', () => {
      const asExpr = LegacyCompatibilityLayer.asExpression;
      const isExpr = LegacyCompatibilityLayer.isExpression;

      // Check that they have all required properties
      expect(asExpr).toHaveProperty('name');
      expect(asExpr).toHaveProperty('category');
      expect(asExpr).toHaveProperty('evaluatesTo');
      expect(asExpr).toHaveProperty('evaluate');
      expect(asExpr).toHaveProperty('validate');

      expect(isExpr).toHaveProperty('name');
      expect(isExpr).toHaveProperty('category');
      expect(isExpr).toHaveProperty('evaluatesTo');
      expect(isExpr).toHaveProperty('evaluate');
      expect(isExpr).toHaveProperty('validate');
    });

    it('should work with existing code patterns', async () => {
      // Simulate how existing code might use expressions
      const expressions = {
        as: LegacyCompatibilityLayer.asExpression,
        is: LegacyCompatibilityLayer.isExpression,
      };

      // Use them like regular expressions
      const asResult = await expressions.as.evaluate(mockExecutionContext, '123', 'Int');
      expect(asResult).toBe(123);

      const isResult = await expressions.is.evaluate(mockExecutionContext, 42, 'number');
      expect(isResult).toBe(true);

      // Validate like regular expressions
      expect(expressions.as.validate(['value', 'String'])).toBe(null);
      expect(expressions.is.validate(['value', 'string'])).toBe(null);
    });
  });
});
