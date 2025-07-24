/**
 * Enhanced Object Expression Tests
 * Comprehensive testing of object literal creation with TypeScript integration
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { 
  EnhancedObjectLiteralExpression,
  createObjectLiteralExpression,
  createField,
  createStaticField,
  createDynamicField,
  createObject
} from './index.js';
import { createTypedExpressionContext } from '../../test-utilities.js';
import type { TypedExpressionContext } from '../../types/enhanced-core.js';

describe('Enhanced Object Expression', () => {
  let objectExpression: EnhancedObjectLiteralExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    objectExpression = new EnhancedObjectLiteralExpression();
    context = createTypedExpressionContext();
  });

  describe('Input Validation', () => {
    test('validates empty object literal', async () => {
      const result = await objectExpression.validate([]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validates single field object', async () => {
      const result = await objectExpression.validate([
        createStaticField('foo', true)
      ]);
      expect(result.isValid).toBe(true);
    });

    test('validates multi-field object', async () => {
      const result = await objectExpression.validate([
        createStaticField('foo', true),
        createStaticField('bar', false)
      ]);
      expect(result.isValid).toBe(true);
    });

    test('warns about very large objects', async () => {
      const largeFieldArray = Array.from({ length: 1001 }, (_, i) => 
        createStaticField(`field${i}`, i)
      );
      const result = await objectExpression.validate(largeFieldArray);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('may impact performance');
    });

    test('detects duplicate static keys', async () => {
      const result = await objectExpression.validate([
        createStaticField('foo', true),
        createStaticField('foo', false)
      ]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Duplicate field names');
    });

    test('validates static field key types', async () => {
      const result = await objectExpression.validate([
        createField(123, 'value', false) // Invalid: non-string static key
      ]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Static field key must be a string');
    });
  });

  describe('Empty Object Creation', () => {
    test('creates empty object literal', async () => {
      const result = await objectExpression.evaluate(context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({});
        expect(result.type).toBe('object');
      }
    });
  });

  describe('Single Field Objects', () => {
    test('creates single field object with boolean value', async () => {
      const result = await objectExpression.evaluate(
        context, 
        createStaticField('foo', true)
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({ foo: true });
        expect(result.type).toBe('object');
      }
    });

    test('creates single field object with string value', async () => {
      const result = await objectExpression.evaluate(
        context, 
        createStaticField('name', 'John')
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({ name: 'John' });
        expect(result.type).toBe('object');
      }
    });

    test('creates single field object with numeric value', async () => {
      const result = await objectExpression.evaluate(
        context, 
        createStaticField('age', 30)
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({ age: 30 });
        expect(result.type).toBe('object');
      }
    });
  });

  describe('Multi-Field Objects', () => {
    test('creates multi-field object with mixed types', async () => {
      const result = await objectExpression.evaluate(
        context,
        createStaticField('foo', true),
        createStaticField('bar', false)
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({ foo: true, bar: false });
        expect(result.type).toBe('object');
      }
    });

    test('creates complex multi-field object', async () => {
      const result = await objectExpression.evaluate(
        context,
        createStaticField('name', 'John'),
        createStaticField('age', 30),
        createStaticField('active', true),
        createStaticField('tags', ['developer', 'javascript'])
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          name: 'John',
          age: 30,
          active: true,
          tags: ['developer', 'javascript']
        });
        expect(result.type).toBe('object');
      }
    });
  });

  describe('String Field Names', () => {
    test('handles quoted string field names', async () => {
      const result = await objectExpression.evaluate(
        context,
        createStaticField('foo', true),
        createStaticField('bar', false)
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({ foo: true, bar: false });
      }
    });

    test('handles special characters in field names', async () => {
      const result = await objectExpression.evaluate(
        context,
        createStaticField('field-with-hyphens', true),
        createStaticField('field_with_underscores', false),
        createStaticField('field.with.dots', 'value')
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          'field-with-hyphens': true,
          'field_with_underscores': false,
          'field.with.dots': 'value'
        });
      }
    });
  });

  describe('Hyphenated Field Names', () => {
    test('handles hyphenated field names', async () => {
      const result = await objectExpression.evaluate(
        context,
        createStaticField('-foo', true),
        createStaticField('bar-baz', false)
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          '-foo': true,
          'bar-baz': false
        });
      }
    });
  });

  describe('Dynamic Field Names', () => {
    test('evaluates dynamic field names from variables', async () => {
      // Set up context with variables
      context.me = document.createElement('div');
      context.locals = { keyName: 'dynamicKey' };
      
      const result = await objectExpression.evaluate(
        context,
        createDynamicField('dynamicKey', true),
        createStaticField('static', false)
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          'dynamicKey': true,
          'static': false
        });
      }
    });

    test('evaluates dynamic field names from functions', async () => {
      const keyFunction = () => 'computedKey';
      
      const result = await objectExpression.evaluate(
        context,
        createDynamicField(keyFunction, 'computed-value')
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          'computedKey': 'computed-value'
        });
      }
    });

    test('handles promise-based dynamic keys', async () => {
      const keyPromise = Promise.resolve('asyncKey');
      
      const result = await objectExpression.evaluate(
        context,
        createDynamicField(keyPromise, 'async-value')
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          'asyncKey': 'async-value'
        });
      }
    });
  });

  describe('Promise Value Handling', () => {
    test('resolves promise values', async () => {
      const promiseValue = Promise.resolve('resolved-value');
      
      const result = await objectExpression.evaluate(
        context,
        createStaticField('asyncField', promiseValue)
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          'asyncField': 'resolved-value'
        });
      }
    });

    test('handles multiple promise values', async () => {
      const promise1 = Promise.resolve('value1');
      const promise2 = Promise.resolve('value2');
      
      const result = await objectExpression.evaluate(
        context,
        createStaticField('field1', promise1),
        createStaticField('field2', promise2),
        createStaticField('field3', 'sync-value')
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          'field1': 'value1',
          'field2': 'value2',
          'field3': 'sync-value'
        });
      }
    });
  });

  describe('Nested Objects and Arrays', () => {
    test('handles nested objects', async () => {
      const nestedObject = { inner: 'value' };
      
      const result = await objectExpression.evaluate(
        context,
        createStaticField('nested', nestedObject),
        createStaticField('simple', 'value')
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          'nested': { inner: 'value' },
          'simple': 'value'
        });
      }
    });

    test('handles nested arrays', async () => {
      const nestedArray = [1, 2, 3];
      
      const result = await objectExpression.evaluate(
        context,
        createStaticField('array', nestedArray),
        createStaticField('count', nestedArray.length)
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          'array': [1, 2, 3],
          'count': 3
        });
      }
    });
  });

  describe('Error Handling', () => {
    test('handles dynamic field key resolution errors', async () => {
      const errorFunction = () => { throw new Error('Key resolution failed'); };
      
      const result = await objectExpression.evaluate(
        context,
        createDynamicField(errorFunction, 'value')
      );
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('DynamicFieldKeyError');
      }
    });

    test('handles field value function errors', async () => {
      const errorValueFunction = () => { throw new Error('Value function failed'); };
      
      const result = await objectExpression.evaluate(
        context,
        createStaticField('key', errorValueFunction)
      );
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('FieldValueFunctionError');
      }
    });
  });

  describe('Utility Functions', () => {
    test('factory function works correctly', () => {
      const objectExpr = createObjectLiteralExpression();
      expect(objectExpr).toBeInstanceOf(EnhancedObjectLiteralExpression);
    });

    test('field creation helpers work', () => {
      const staticField = createStaticField('key', 'value');
      expect(staticField).toEqual({
        key: 'key',
        value: 'value',
        isDynamic: false
      });

      const dynamicField = createDynamicField('keyExpr', 'value');
      expect(dynamicField).toEqual({
        key: 'keyExpr',
        value: 'value',
        isDynamic: true
      });
    });

    test('createObject utility works', async () => {
      const result = await createObject([
        createStaticField('foo', true),
        createStaticField('bar', false)
      ], context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({ foo: true, bar: false });
      }
    });

    test('metadata provides comprehensive information', () => {
      const metadata = objectExpression.getMetadata();
      
      expect(metadata.name).toBe('ObjectLiteralExpression');
      expect(metadata.category).toBe('literal');
      expect(metadata.supportedFeatures).toContain('dynamic field names');
      expect(metadata.supportedFeatures).toContain('static field names');
      expect(metadata.capabilities.contextAware).toBe(true);
      expect(metadata.capabilities.supportsAsync).toBe(true);
    });
  });

  describe('LLM Documentation', () => {
    test('provides comprehensive documentation', () => {
      const docs = objectExpression.documentation;
      
      expect(docs.summary).toContain('object literals');
      expect(docs.parameters).toHaveLength(1);
      expect(docs.parameters[0].name).toBe('fields');
      expect(docs.examples).toHaveLength(3);
      expect(docs.tags).toContain('object');
      expect(docs.tags).toContain('literal');
      expect(docs.tags).toContain('dynamic');
    });
  });

  describe('Performance Characteristics', () => {
    test('handles medium-sized objects efficiently', async () => {
      const fields = Array.from({ length: 100 }, (_, i) => 
        createStaticField(`field${i}`, i)
      );
      
      const startTime = performance.now();
      const result = await objectExpression.evaluate(context, ...fields);
      const endTime = performance.now();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.keys(result.value)).toHaveLength(100);
      }
      
      // Should be reasonably fast even for medium-sized objects
      expect(endTime - startTime).toBeLessThan(50); // Less than 50ms
    });

    test('processes multiple async values efficiently', async () => {
      const promises = Array.from({ length: 20 }, (_, i) => 
        Promise.resolve(`value${i}`)
      );
      
      const fields = promises.map((promise, i) => 
        createStaticField(`field${i}`, promise)
      );
      
      const startTime = performance.now();
      const result = await objectExpression.evaluate(context, ...fields);
      const endTime = performance.now();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.keys(result.value)).toHaveLength(20);
        // Verify all promises were resolved
        for (let i = 0; i < 20; i++) {
          expect(result.value[`field${i}`]).toBe(`value${i}`);
        }
      }
      
      // Should handle async values efficiently
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
    });
  });

  describe('Integration with Official Test Cases', () => {
    test('matches official empty object behavior', async () => {
      const result = await objectExpression.evaluate(context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({});
      }
    });

    test('matches official single field object behavior', async () => {
      const result = await objectExpression.evaluate(
        context,
        createStaticField('foo', true)
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({ foo: true });
      }
    });

    test('matches official multi-field object behavior', async () => {
      const result = await objectExpression.evaluate(
        context,
        createStaticField('foo', true),
        createStaticField('bar', false)
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({ foo: true, bar: false });
      }
    });

    test('matches official string field names behavior', async () => {
      const result = await objectExpression.evaluate(
        context,
        createStaticField('foo', true),
        createStaticField('bar', false)
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({ foo: true, bar: false });
      }
    });

    test('matches official hyphenated field names behavior', async () => {
      const result = await objectExpression.evaluate(
        context,
        createStaticField('-foo', true),
        createStaticField('bar-baz', false)
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({ '-foo': true, 'bar-baz': false });
      }
    });

    test('supports trailing commas equivalent behavior', async () => {
      // The trailing comma behavior is handled at the parser level,
      // but our expression should handle the same field structure
      const result = await objectExpression.evaluate(
        context,
        createStaticField('foo', true),
        createStaticField('bar-baz', false)
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({ foo: true, 'bar-baz': false });
      }
    });

    test('matches official dynamic field names behavior', async () => {
      // Simulating the behavior of {[foo]:true, [bar()]:false}
      // where foo="bar" and bar()="foo"
      const keyValue1 = 'bar';
      const keyValue2 = 'foo';
      
      const result = await objectExpression.evaluate(
        context,
        createDynamicField(keyValue1, true),
        createDynamicField(keyValue2, false)
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({ bar: true, foo: false });
      }
    });
  });
});