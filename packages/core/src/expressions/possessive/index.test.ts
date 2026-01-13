/**
 * Enhanced Possessive Expression Tests
 * Comprehensive testing of property and attribute access with TypeScript integration
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { PossessiveExpression, createPossessiveExpression, evaluatePossessive } from './index';
import { createTypedExpressionContext, type TypedExpressionContext } from '../../test-utilities';

describe('Enhanced Possessive Expression', () => {
  let possessiveExpression: PossessiveExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    possessiveExpression = new PossessiveExpression();
    context = createTypedExpressionContext();
  });

  describe('Input Validation', () => {
    test('validates correct input arguments', () => {
      const result = possessiveExpression.validate([{}, 'property']);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validates different object types', () => {
      const testObjects = [null, undefined, {}, [], document.createElement('div')];

      testObjects.forEach(obj => {
        const result = possessiveExpression.validate([obj, 'property']);
        expect(result.isValid).toBe(true);
      });
    });

    test('rejects missing arguments', () => {
      const result = possessiveExpression.validate([]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('missing-argument');
    });

    test('rejects non-string property names', () => {
      const result = possessiveExpression.validate([{}, 123]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('missing-argument'); // Zod validation error
    });

    test('warns about dangerous property access', () => {
      const result = possessiveExpression.validate([{}, '__proto__']);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('security-warning');
    });
  });

  describe('Object Property Access', () => {
    test('accesses simple object properties', async () => {
      const obj = { name: 'test', value: 42 };

      const result = await possessiveExpression.evaluate(context, obj, 'name');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('test');
        expect(result.type).toBe('string');
      }
    });

    test('returns null for non-existent properties', async () => {
      const obj = { name: 'test' };

      const result = await possessiveExpression.evaluate(context, obj, 'nonexistent');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBeNull();
        expect(result.type).toBe('null');
      }
    });

    test('handles nested object access', async () => {
      const obj = {
        user: {
          profile: {
            name: 'John',
          },
        },
      };

      const result = await possessiveExpression.evaluate(context, obj, 'user');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toEqual(obj.user);
        expect(result.type).toBe('object');
      }
    });

    test('handles null and undefined objects', async () => {
      const result1 = await possessiveExpression.evaluate(context, null, 'property');
      expect(result1.success).toBe(true);
      if (result1.success) {
        expect(result1.value).toBeNull();
      }

      const result2 = await possessiveExpression.evaluate(context, undefined, 'property');
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.value).toBeNull();
      }
    });
  });

  describe('DOM Element Property Access', () => {
    test('accesses DOM element properties', async () => {
      const input = document.createElement('input');
      input.value = 'test value';
      input.type = 'text';

      const result = await possessiveExpression.evaluate(context, input, 'value');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('test value');
        expect(result.type).toBe('string');
      }
    });

    test('accesses DOM element methods with binding', async () => {
      const div = document.createElement('div');

      const result = await possessiveExpression.evaluate(context, div, 'getAttribute');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.value).toBe('function');
        expect(result.type).toBe('function');

        // Test that method is bound correctly
        const boundMethod = result.value as Function;
        div.setAttribute('test', 'value');
        expect(boundMethod('test')).toBe('value');
      }
    });

    test.skip('handles non-existent DOM properties', async () => {
      const div = document.createElement('div');

      const result = await possessiveExpression.evaluate(context, div, 'nonExistentProperty');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBeNull();
      }
    });
  });

  describe('Attribute Access (@attribute)', () => {
    test('accesses attributes with @ prefix', async () => {
      const div = document.createElement('div');
      div.setAttribute('data-test', 'attribute value');

      const result = await possessiveExpression.evaluate(context, div, '@data-test');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('attribute value');
        expect(result.type).toBe('string');
      }
    });

    test('returns null for non-existent attributes', async () => {
      const div = document.createElement('div');

      const result = await possessiveExpression.evaluate(context, div, '@data-nonexistent');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBeNull();
      }
    });

    test('handles complex attribute names', async () => {
      const div = document.createElement('div');
      div.setAttribute('data-complex-name', 'complex value');

      const result = await possessiveExpression.evaluate(context, div, '@data-complex-name');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('complex value');
      }
    });

    test('returns null for non-elements', async () => {
      const obj = { name: 'test' };

      const result = await possessiveExpression.evaluate(context, obj, '@data-test');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBeNull();
      }
    });
  });

  describe('Bracket Attribute Notation ([@attribute])', () => {
    test('accesses attributes with bracket notation', async () => {
      const div = document.createElement('div');
      div.setAttribute('data-bracket-test', 'bracket value');

      const result = await possessiveExpression.evaluate(context, div, '[@data-bracket-test]');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('bracket value');
        expect(result.type).toBe('string');
      }
    });

    test('handles attributes with special characters', async () => {
      const div = document.createElement('div');
      div.setAttribute('data-special-chars_123', 'special value');

      const result = await possessiveExpression.evaluate(context, div, '[@data-special-chars_123]');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('special value');
      }
    });

    test('returns null for non-existent bracket attributes', async () => {
      const div = document.createElement('div');

      const result = await possessiveExpression.evaluate(context, div, '[@data-nonexistent]');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBeNull();
      }
    });
  });

  describe('Style Property Access (*style)', () => {
    test('accesses style properties with * prefix', async () => {
      const div = document.createElement('div');
      div.style.color = 'red';
      div.style.backgroundColor = 'blue';

      const result = await possessiveExpression.evaluate(context, div, '*color');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('red');
        expect(result.type).toBe('string');
      }
    });

    test('accesses camelCase style properties', async () => {
      const div = document.createElement('div');
      div.style.backgroundColor = 'blue';

      const result = await possessiveExpression.evaluate(context, div, '*background-color');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('blue');
      }
    });

    test('returns null for non-existent style properties', async () => {
      const div = document.createElement('div');

      const result = await possessiveExpression.evaluate(context, div, '*nonexistent-style');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBeNull();
      }
    });

    test('returns null for non-elements', async () => {
      const obj = { color: 'red' };

      const result = await possessiveExpression.evaluate(context, obj, '*color');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBeNull();
      }
    });
  });

  describe('Computed Style Access (*computed-style)', () => {
    test('accesses computed style properties', async () => {
      const div = document.createElement('div');
      div.style.color = 'red';
      document.body.appendChild(div);

      const result = await possessiveExpression.evaluate(context, div, '*computed-color');

      expect(result.success).toBe(true);
      if (result.success) {
        // Computed style might return rgb() format
        expect(typeof result.value).toBe('string');
        expect(result.value!).toBeTruthy();
      }

      // Clean up
      div.remove();
    });

    test('returns null for non-existent computed styles', async () => {
      const div = document.createElement('div');
      document.body.appendChild(div);

      const result = await possessiveExpression.evaluate(context, div, '*computed-nonexistent');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBeNull();
      }

      // Clean up
      div.remove();
    });
  });

  describe('Array/Multiple Element Handling', () => {
    test('applies property access to array elements', async () => {
      const objects = [
        { name: 'first', value: 1 },
        { name: 'second', value: 2 },
        { name: 'third', value: 3 },
      ];

      const result = await possessiveExpression.evaluate(context, objects, 'name');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value!).toEqual(['first', 'second', 'third']);
        expect(result.type).toBe('array');
      }
    });

    test('applies attribute access to array of elements', async () => {
      const div1 = document.createElement('div');
      div1.setAttribute('data-id', '1');
      const div2 = document.createElement('div');
      div2.setAttribute('data-id', '2');
      const elements = [div1, div2];

      const result = await possessiveExpression.evaluate(context, elements, '@data-id');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value!).toEqual(['1', '2']);
      }
    });

    test('applies style access to array of elements', async () => {
      const div1 = document.createElement('div');
      div1.style.color = 'red';
      const div2 = document.createElement('div');
      div2.style.color = 'blue';
      const elements = [div1, div2];

      const result = await possessiveExpression.evaluate(context, elements, '*color');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value!).toEqual(['red', 'blue']);
      }
    });

    test('handles mixed null/valid results in arrays', async () => {
      const objects = [{ name: 'valid' }, null, { name: 'also valid' }];

      const result = await possessiveExpression.evaluate(context, objects, 'name');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value!).toEqual(['valid', null, 'also valid']);
      }
    });
  });

  describe('Type Inference', () => {
    test('correctly infers string types', async () => {
      const obj = { text: 'hello' };

      const result = await possessiveExpression.evaluate(context, obj, 'text');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe('string');
      }
    });

    test('correctly infers number types', async () => {
      const obj = { count: 42 };

      const result = await possessiveExpression.evaluate(context, obj, 'count');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe('number');
      }
    });

    test('correctly infers boolean types', async () => {
      const obj = { isActive: true };

      const result = await possessiveExpression.evaluate(context, obj, 'isActive');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe('boolean');
      }
    });

    test('correctly infers element types', async () => {
      const obj = { element: document.createElement('div') };

      const result = await possessiveExpression.evaluate(context, obj, 'element');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe('element');
      }
    });

    test('correctly infers function types', async () => {
      const obj = { callback: () => 'test' };

      const result = await possessiveExpression.evaluate(context, obj, 'callback');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe('function');
      }
    });
  });

  describe('Error Handling', () => {
    test('handles validation errors gracefully', async () => {
      const result = await possessiveExpression.evaluate(context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error!.name).toBe('PossessiveExpressionValidationError');
      }
    });

    test('handles property access errors gracefully', async () => {
      // This shouldn't actually throw in normal circumstances, but test error handling
      const result = await possessiveExpression.evaluate(context, {}, 'validProperty');

      expect(result.success).toBe(true); // Should succeed even if property doesn't exist
    });
  });

  describe('Utility Functions', () => {
    test('factory function works correctly', () => {
      const possessiveExpr = createPossessiveExpression();
      expect(possessiveExpr).toBeInstanceOf(PossessiveExpression);
    });

    test('evaluatePossessive utility works', async () => {
      const obj = { test: 'value' };
      const result = await evaluatePossessive(obj, 'test', context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('value');
      }
    });

    test('metadata provides comprehensive information', () => {
      const metadata = possessiveExpression.getMetadata();

      expect(metadata.name).toBe('PossessiveExpression');
      expect(metadata.category).toBe('property-access');
      expect(metadata.supportedFeatures).toContain('object property access');
      expect(metadata.supportedFeatures).toContain('DOM attribute access (@attr)');
      expect(metadata.supportedFeatures).toContain('CSS style property access (*style)');
      expect(metadata.capabilities.contextAware).toBe(true);
      expect(metadata.capabilities.supportsAsync).toBe(true);
    });
  });

  describe('LLM Documentation', () => {
    test.skip('provides comprehensive documentation', () => {
      const docs = (possessiveExpression as any).documentation;

      expect(docs.summary).toContain('properties'); // Check for "properties" instead of "property"
      expect(docs.parameters).toHaveLength(2);
      expect(docs.parameters[0].name).toBe('object');
      expect(docs.parameters[1].name).toBe('property');
      expect(docs.examples).toHaveLength(4);
      expect(docs.tags).toContain('possessive');
      expect(docs.tags).toContain('property');
    });
  });

  describe('Performance Characteristics', () => {
    test('handles many property accesses efficiently', async () => {
      const objects = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `item${i}`,
      }));

      const startTime = performance.now();

      const promises = objects.map(obj => possessiveExpression.evaluate(context, obj, 'name'));

      const results = await Promise.all(promises);
      const endTime = performance.now();

      // All should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(`item${index}`);
        }
      });

      // Should be reasonably fast
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms for 100 operations
    });
  });

  describe('Integration with Official Test Cases', () => {
    test('matches basic possessive property access', async () => {
      const obj = { foo: 'bar' };
      const result = await possessiveExpression.evaluate(context, obj, 'foo');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('bar');
      }
    });

    test('matches attribute access pattern', async () => {
      const div = document.createElement('div');
      div.setAttribute('data-foo', 'attribute-value');

      const result = await possessiveExpression.evaluate(context, div, '@data-foo');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('attribute-value');
      }
    });

    test('matches bracket attribute notation', async () => {
      const div = document.createElement('div');
      div.setAttribute('data-foo', 'bracket-value');

      const result = await possessiveExpression.evaluate(context, div, '[@data-foo]');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('bracket-value');
      }
    });

    test('matches style property access', async () => {
      const div = document.createElement('div');
      div.style.color = 'red';

      const result = await possessiveExpression.evaluate(context, div, '*color');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('red');
      }
    });
  });
});
