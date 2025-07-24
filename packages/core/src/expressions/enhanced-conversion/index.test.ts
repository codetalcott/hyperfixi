/**
 * Enhanced Conversion Expressions Tests
 * Comprehensive test suite for enhanced type conversion expressions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  EnhancedAsExpression,
  EnhancedIsExpression,
  enhancedConversionExpressions,
  enhancedConverters
} from './index.ts';
import type { TypedExpressionContext } from '../../types/enhanced-expressions.ts';

// Mock DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as any;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.NodeList = dom.window.NodeList;
global.HTMLFormElement = dom.window.HTMLFormElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.HTMLSelectElement = dom.window.HTMLSelectElement;
global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;

describe('Enhanced Conversion Expressions', () => {
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
      it: 'test-value',
      result: { data: 'test-result' },
      locals: new Map(),
      globals: new Map(),
      event: null,
      
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

  describe('Enhanced Converters', () => {
    describe('Array Converter', () => {
      it('should convert values to arrays correctly', () => {
        const tests = [
          [[1, 2, 3], [1, 2, 3]], // Already array
          [null, []], // Null to empty array
          [undefined, []], // Undefined to empty array
          ['hello', ['hello']], // Single value to array
          [42, [42]] // Number to array
        ];

        for (const [input, expected] of tests) {
          const result = enhancedConverters.Array(input);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.value).toEqual(expected);
            expect(result.type).toBe('array');
          }
        }
      });
    });

    describe('String Converter', () => {
      it('should convert values to strings correctly', () => {
        const tests = [
          ['hello', 'hello'], // Already string
          [null, ''], // Null to empty string
          [undefined, ''], // Undefined to empty string
          [42, '42'], // Number to string
          [true, 'true'], // Boolean to string
          [{ name: 'test' }, '{"name":"test"}'] // Object to JSON string
        ];

        for (const [input, expected] of tests) {
          const result = enhancedConverters.String(input);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.value).toBe(expected);
            expect(result.type).toBe('string');
          }
        }
      });
    });

    describe('Boolean Converter', () => {
      it('should convert values to booleans correctly', () => {
        const tests = [
          [true, true], // Already boolean
          [false, false], // Already boolean
          [null, false], // Null is falsy
          [undefined, false], // Undefined is falsy
          ['', false], // Empty string is falsy
          ['false', false], // String 'false' is falsy
          ['0', false], // String '0' is falsy
          ['hello', true], // Non-empty string is truthy
          [0, false], // Number 0 is falsy
          [42, true], // Non-zero number is truthy
          [[], true], // Array is truthy
          [{}, true] // Object is truthy
        ];

        for (const [input, expected] of tests) {
          const result = enhancedConverters.Boolean(input);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.value).toBe(expected);
            expect(result.type).toBe('boolean');
          }
        }
      });
    });

    describe('Number Converter', () => {
      it('should convert valid numbers correctly', () => {
        const tests = [
          [42, 42], // Already number
          ['42', 42], // String number
          ['3.14', 3.14], // String float
          [null, 0], // Null to 0
          [undefined, 0], // Undefined to 0
          [true, 1], // Boolean true to 1
          [false, 0] // Boolean false to 0
        ];

        for (const [input, expected] of tests) {
          const result = enhancedConverters.Number(input);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.value).toBe(expected);
            expect(result.type).toBe('number');
          }
        }
      });

      it('should handle invalid number conversions', () => {
        const invalidInputs = ['hello', 'not-a-number', '123abc'];

        for (const input of invalidInputs) {
          const result = enhancedConverters.Number(input);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.name).toBe('NumberConversionError');
            expect(result.error.code).toBe('INVALID_NUMBER');
          }
        }
      });
    });

    describe('Date Converter', () => {
      it('should convert valid dates correctly', () => {
        const now = new Date();
        const result1 = enhancedConverters.Date(now);
        expect(result1.success).toBe(true);
        if (result1.success) {
          expect(result1.value).toBe(now);
        }

        // YYYY-MM-DD format
        const result2 = enhancedConverters.Date('2023-12-25');
        expect(result2.success).toBe(true);
        if (result2.success) {
          expect(result2.value.getFullYear()).toBe(2023);
          expect(result2.value.getMonth()).toBe(11); // December is month 11
          expect(result2.value.getDate()).toBe(25);
        }

        // ISO string
        const isoString = '2023-12-25T12:00:00.000Z';
        const result3 = enhancedConverters.Date(isoString);
        expect(result3.success).toBe(true);
      });

      it('should handle invalid date conversions', () => {
        const invalidInputs = ['not-a-date', 'invalid-date-format'];

        for (const input of invalidInputs) {
          const result = enhancedConverters.Date(input);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.name).toBe('DateConversionError');
            expect(result.error.code).toBe('INVALID_DATE');
          }
        }
      });
    });

    describe('JSON Converter', () => {
      it('should convert values to JSON strings correctly', () => {
        const tests = [
          [{ name: 'test' }, '{"name":"test"}'],
          [[1, 2, 3], '[1,2,3]'],
          ['hello', '"hello"'],
          [42, '42'],
          [true, 'true'],
          [null, 'null']
        ];

        for (const [input, expected] of tests) {
          const result = enhancedConverters.JSON(input);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.value).toBe(expected);
            expect(result.type).toBe('string');
          }
        }
      });
    });

    describe('Object Converter', () => {
      it('should convert values to objects correctly', () => {
        const obj = { name: 'test' };
        const result1 = enhancedConverters.Object(obj);
        expect(result1.success).toBe(true);
        if (result1.success) {
          expect(result1.value).toBe(obj);
        }

        const result2 = enhancedConverters.Object('{"name":"test"}');
        expect(result2.success).toBe(true);
        if (result2.success) {
          expect(result2.value).toEqual({ name: 'test' });
        }

        const result3 = enhancedConverters.Object(42);
        expect(result3.success).toBe(true);
        if (result3.success) {
          expect(result3.value).toEqual({});
        }
      });

      it('should handle invalid JSON strings', () => {
        const result = enhancedConverters.Object('invalid-json');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.name).toBe('ObjectConversionError');
          expect(result.error.code).toBe('JSON_PARSE_FAILED');
        }
      });
    });
  });

  describe('EnhancedAsExpression', () => {
    let asExpression: EnhancedAsExpression;

    beforeEach(() => {
      asExpression = new EnhancedAsExpression();
    });

    it('should have correct metadata', () => {
      expect(asExpression.name).toBe('as');
      expect(asExpression.category).toBe('Conversion');
      expect(asExpression.syntax).toBe('value as Type');
      expect(asExpression.outputType).toBe('Any');
      expect(asExpression.metadata.complexity).toBe('medium');
      expect(asExpression.metadata.examples).toHaveLength(4);
    });

    it('should convert basic types correctly', async () => {
      const tests = [
        [{ value: '123', type: 'Int' }, 123],
        [{ value: 'hello', type: 'String' }, 'hello'],
        [{ value: 1, type: 'Boolean' }, true],
        [{ value: '3.14', type: 'Float' }, 3.14],
        [{ value: [1, 2, 3], type: 'JSON' }, '[1,2,3]']
      ];

      for (const [input, expected] of tests) {
        const result = await asExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }
    });

    it('should handle Fixed precision conversion', async () => {
      const result = await asExpression.evaluate(mockContext, { value: 3.14159, type: 'Fixed:2' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('3.14');
        expect(result.type).toBe('string');
      }
    });

    it('should handle case-insensitive type aliases', async () => {
      const tests = [
        [{ value: '123', type: 'int' }, 123],
        [{ value: 'hello', type: 'string' }, 'hello'],
        [{ value: 1, type: 'bool' }, true]
      ];

      for (const [input, expected] of tests) {
        const result = await asExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }
    });

    it('should handle unknown conversion types', async () => {
      const result = await asExpression.evaluate(mockContext, { value: 'test', type: 'UnknownType' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('UnknownConversionTypeError');
        expect(result.error.code).toBe('UNKNOWN_CONVERSION_TYPE');
        expect(result.error.suggestions).toContain('Use supported types: String, Number, Boolean, Array, Object, Date, JSON, Values');
      }
    });

    it('should track evaluation history', async () => {
      await asExpression.evaluate(mockContext, { value: '123', type: 'Int' });
      
      expect(mockContext.evaluationHistory).toHaveLength(1);
      const evaluation = mockContext.evaluationHistory[0];
      expect(evaluation.expressionName).toBe('as');
      expect(evaluation.category).toBe('Conversion');
      expect(evaluation.success).toBe(true);
      expect(evaluation.output).toBe(123);
    });

    it('should validate input correctly', () => {
      const validResult = asExpression.validate({ value: 'test', type: 'String' });
      expect(validResult.isValid).toBe(true);

      const invalidResult1 = asExpression.validate({ value: 'test' }); // Missing type
      expect(invalidResult1.isValid).toBe(false);

      const invalidResult2 = asExpression.validate({ value: 'test', type: '' }); // Empty type
      expect(invalidResult2.isValid).toBe(false);

      const invalidResult3 = asExpression.validate('not-an-object');
      expect(invalidResult3.isValid).toBe(false);
    });

    it('should have comprehensive LLM documentation', () => {
      expect(asExpression.documentation.summary).toContain('Converts values between different types');
      expect(asExpression.documentation.parameters).toHaveLength(2);
      expect(asExpression.documentation.examples).toHaveLength(5);
      expect(asExpression.documentation.examples[0].title).toContain('String to number');
      expect(asExpression.documentation.tags).toContain('conversion');
    });
  });

  describe('EnhancedIsExpression', () => {
    let isExpression: EnhancedIsExpression;

    beforeEach(() => {
      isExpression = new EnhancedIsExpression();
    });

    it('should have correct metadata', () => {
      expect(isExpression.name).toBe('is');
      expect(isExpression.category).toBe('Conversion');
      expect(isExpression.syntax).toBe('value is Type');
      expect(isExpression.outputType).toBe('Boolean');
      expect(isExpression.metadata.complexity).toBe('simple');
    });

    it('should check basic types correctly', async () => {
      const tests = [
        [{ value: 42, type: 'number' }, true],
        [{ value: 'hello', type: 'string' }, true],
        [{ value: true, type: 'boolean' }, true],
        [{ value: [], type: 'array' }, true],
        [{ value: {}, type: 'object' }, true],
        [{ value: null, type: 'null' }, true],
        [{ value: undefined, type: 'undefined' }, true],
        [{ value: 42, type: 'string' }, false], // Wrong type
        [{ value: 'hello', type: 'number' }, false] // Wrong type
      ];

      for (const [input, expected] of tests) {
        const result = await isExpression.evaluate(mockContext, input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
          expect(result.type).toBe('boolean');
        }
      }
    });

    it('should check empty values correctly', async () => {
      const emptyTests = [
        [null, true],
        [undefined, true],
        ['', true],
        [[], true],
        [{}, true],
        ['hello', false],
        [[1, 2], false],
        [{ a: 1 }, false]
      ];

      for (const [value, expected] of emptyTests) {
        const result = await isExpression.evaluate(mockContext, { value, type: 'empty' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
        }
      }
    });

    it('should check DOM element types', async () => {
      const element = document.createElement('div');
      
      const result1 = await isExpression.evaluate(mockContext, { value: element, type: 'element' });
      expect(result1.success).toBe(true);
      if (result1.success) {
        expect(result1.value).toBe(true);
      }

      const result2 = await isExpression.evaluate(mockContext, { value: element, type: 'node' });
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.value).toBe(true);
      }

      const result3 = await isExpression.evaluate(mockContext, { value: 'not-element', type: 'element' });
      expect(result3.success).toBe(true);
      if (result3.success) {
        expect(result3.value).toBe(false);
      }
    });

    it('should check constructor-based types', async () => {
      const date = new Date();
      const result = await isExpression.evaluate(mockContext, { value: date, type: 'date' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });

    it('should track evaluation history', async () => {
      await isExpression.evaluate(mockContext, { value: 42, type: 'number' });
      
      expect(mockContext.evaluationHistory).toHaveLength(1);
      const evaluation = mockContext.evaluationHistory[0];
      expect(evaluation.expressionName).toBe('is');
      expect(evaluation.category).toBe('Conversion');
      expect(evaluation.success).toBe(true);
      expect(evaluation.output).toBe(true);
    });

    it('should validate input correctly', () => {
      const validResult = isExpression.validate({ value: 42, type: 'number' });
      expect(validResult.isValid).toBe(true);

      const invalidResult1 = isExpression.validate({ value: 42 }); // Missing type
      expect(invalidResult1.isValid).toBe(false);

      const invalidResult2 = isExpression.validate({ value: 42, type: '' }); // Empty type
      expect(invalidResult2.isValid).toBe(false);
    });

    it('should have comprehensive LLM documentation', () => {
      expect(isExpression.documentation.summary).toContain('Checks if a value is of a specific type');
      expect(isExpression.documentation.parameters).toHaveLength(2);
      expect(isExpression.documentation.examples).toHaveLength(3);
      expect(isExpression.documentation.tags).toContain('validation');
    });
  });

  describe('Form Values Conversion', () => {
    it('should extract form values correctly', async () => {
      // Create a form with various input types
      const form = document.createElement('form');
      
      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.name = 'name';
      textInput.value = 'John Doe';
      
      const numberInput = document.createElement('input');
      numberInput.type = 'number';
      numberInput.name = 'age';
      numberInput.value = '25';
      
      const checkboxInput = document.createElement('input');
      checkboxInput.type = 'checkbox';
      checkboxInput.name = 'subscribe';
      checkboxInput.checked = true;
      
      form.appendChild(textInput);
      form.appendChild(numberInput);
      form.appendChild(checkboxInput);
      document.body.appendChild(form);

      const asExpression = new EnhancedAsExpression();
      const result = await asExpression.evaluate(mockContext, { value: form, type: 'Values' });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          name: 'John Doe',
          age: 25, // Number input returns number
          subscribe: true // Checkbox returns boolean
        });
      }
    });
  });

  describe('Expression Registry', () => {
    it('should export all enhanced conversion expressions', () => {
      expect(enhancedConversionExpressions.as).toBeInstanceOf(EnhancedAsExpression);
      expect(enhancedConversionExpressions.is).toBeInstanceOf(EnhancedIsExpression);
    });

    it('should provide factory functions', async () => {
      const { 
        createEnhancedAsExpression,
        createEnhancedIsExpression
      } = await import('./index.ts');

      expect(createEnhancedAsExpression()).toBeInstanceOf(EnhancedAsExpression);
      expect(createEnhancedIsExpression()).toBeInstanceOf(EnhancedIsExpression);
    });
  });

  describe('Integration with Existing System', () => {
    it('should maintain backward compatibility with enhanced interface', () => {
      const asExpr = enhancedConversionExpressions.as;
      
      expect(asExpr.name).toBe('as');
      expect(asExpr.category).toBe('Conversion');
      expect(typeof asExpr.evaluate).toBe('function');
      expect(typeof asExpr.validate).toBe('function');
    });

    it('should provide richer metadata than legacy expressions', () => {
      const asExpr = enhancedConversionExpressions.as;
      
      expect(asExpr.metadata).toBeDefined();
      expect(asExpr.metadata.examples).toBeDefined();
      expect(asExpr.metadata.performance).toBeDefined();
      expect(asExpr.documentation).toBeDefined();
      expect(asExpr.documentation.examples).toBeDefined();
    });

    it('should handle context bridging', async () => {
      const asExpr = enhancedConversionExpressions.as;
      const result = await asExpr.evaluate(mockContext, { value: '123', type: 'Int' });
      
      expect(result.success).toBe(true);
      expect(mockContext.evaluationHistory).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle evaluation errors gracefully', async () => {
      const asExpr = enhancedConversionExpressions.as;
      
      const result = await asExpr.evaluate(mockContext, { value: 'not-a-number', type: 'Number' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('NumberConversionError');
        expect(result.error.suggestions).toBeDefined();
      }
    });

    it('should provide helpful validation messages', () => {
      const asExpr = enhancedConversionExpressions.as;
      
      const result = asExpr.validate({ invalid: 'structure' });
      expect(result.isValid).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Characteristics', () => {
    it('should complete simple conversions quickly', async () => {
      const asExpr = enhancedConversionExpressions.as;
      
      const startTime = Date.now();
      await asExpr.evaluate(mockContext, { value: '123', type: 'Int' });
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(10); // Should be very fast
    });

    it('should track evaluation metrics', async () => {
      const isExpr = enhancedConversionExpressions.is;
      
      await isExpr.evaluate(mockContext, { value: 42, type: 'number' });
      
      const evaluation = mockContext.evaluationHistory[0];
      expect(evaluation.timestamp).toBeDefined();
      expect(evaluation.duration).toBeGreaterThanOrEqual(0);
      expect(evaluation.input).toEqual({ value: 42, type: 'number' });
      expect(evaluation.output).toBe(true);
    });
  });
});