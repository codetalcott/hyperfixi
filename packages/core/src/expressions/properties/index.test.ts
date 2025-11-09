/**
 * Tests for property expressions
 * Covering possessive syntax, attribute access, and property references
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestElement, createMockHyperscriptContext } from '../../test-setup';
import {
  propertiesExpressions,
  getElementProperty,
  isDataAttribute,
  isAriaAttribute,
} from './index';
import type { ExecutionContext } from '../../types/core';

describe('Property Expressions', () => {
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    context = createMockHyperscriptContext();

    // Create a test element with various properties and attributes
    testElement = createTestElement(`
      <div 
        id="test-element" 
        class="test-class another-class"
        data-value="test-data"
        aria-label="Test Label"
        title="Test Title"
        style="color: red; font-size: 14px;"
      >
        Test Content
      </div>
    `);

    context.me = testElement;
    context.it = { name: 'test', count: 42 };
    context.you = testElement;
  });

  describe('Possessive Expressions', () => {
    describe('possessive expression', () => {
      it('should get element properties', async () => {
        const result = await propertiesExpressions.possessive.evaluate(context, testElement, 'id');
        expect(result).toBe('test-element');
      });

      it('should get object properties', async () => {
        const obj = { name: 'test', value: 123 };
        expect(await propertiesExpressions.possessive.evaluate(context, obj, 'name')).toBe('test');
        expect(await propertiesExpressions.possessive.evaluate(context, obj, 'value')).toBe(123);
      });

      it('should handle DOM element attributes', async () => {
        const result = await propertiesExpressions.possessive.evaluate(
          context,
          testElement,
          'data-value'
        );
        expect(result).toBe('test-data');
      });

      it('should handle special DOM properties', async () => {
        expect(
          await propertiesExpressions.possessive.evaluate(context, testElement, 'className')
        ).toBe('test-class another-class');
        expect(
          await propertiesExpressions.possessive.evaluate(context, testElement, 'tagName')
        ).toBe('div');
        expect(
          await propertiesExpressions.possessive.evaluate(context, testElement, 'innerText')
        ).toBe('Test Content');
      });

      it('should handle null/undefined element', async () => {
        const result = await propertiesExpressions.possessive.evaluate(context, null, 'property');
        expect(result).toBeUndefined();
      });

      it('should throw error for non-string property', async () => {
        await expect(
          propertiesExpressions.possessive.evaluate(context, testElement, 123 as any)
        ).rejects.toThrow('Property name must be a string');
      });

      it('should validate arguments', () => {
        expect(propertiesExpressions.possessive.validate!([testElement, 'property'])).toBeNull();
        expect(propertiesExpressions.possessive.validate!([testElement])).toContain(
          'exactly two arguments'
        );
        expect(
          propertiesExpressions.possessive.validate!([testElement, 'property', 'extra'])
        ).toContain('exactly two arguments');
        expect(propertiesExpressions.possessive.validate!([testElement, 123])).toContain(
          'must be a string'
        );
      });
    });

    describe('my expression', () => {
      it('should get properties from context.me', async () => {
        const result = await propertiesExpressions.my.evaluate(context, 'id');
        expect(result).toBe('test-element');
      });

      it('should get attributes from context.me', async () => {
        const result = await propertiesExpressions.my.evaluate(context, 'data-value');
        expect(result).toBe('test-data');
      });

      it('should return undefined when context.me is null', async () => {
        context.me = null;
        const result = await propertiesExpressions.my.evaluate(context, 'id');
        expect(result).toBeUndefined();
      });

      it('should throw error for non-string property', async () => {
        await expect(propertiesExpressions.my.evaluate(context, 123 as any)).rejects.toThrow(
          'Property name must be a string'
        );
      });

      it('should validate arguments', () => {
        expect(propertiesExpressions.my.validate!(['property'])).toBeNull();
        expect(propertiesExpressions.my.validate!([])).toContain('exactly one argument');
        expect(propertiesExpressions.my.validate!(['property', 'extra'])).toContain(
          'exactly one argument'
        );
        expect(propertiesExpressions.my.validate!([123])).toContain('must be a string');
      });
    });

    describe('its expression', () => {
      it('should get properties from context.it object', async () => {
        expect(await propertiesExpressions.its.evaluate(context, 'name')).toBe('test');
        expect(await propertiesExpressions.its.evaluate(context, 'count')).toBe(42);
      });

      it('should handle context.it as DOM element', async () => {
        context.it = testElement;
        const result = await propertiesExpressions.its.evaluate(context, 'id');
        expect(result).toBe('test-element');
      });

      it('should return undefined when context.it is null', async () => {
        context.it = null;
        const result = await propertiesExpressions.its.evaluate(context, 'name');
        expect(result).toBeUndefined();
      });

      it('should handle primitive values', async () => {
        context.it = 'hello';
        const result = await propertiesExpressions.its.evaluate(context, 'length');
        expect(result).toBe(5);
      });

      it('should throw error for non-string property', async () => {
        await expect(propertiesExpressions.its.evaluate(context, 123 as any)).rejects.toThrow(
          'Property name must be a string'
        );
      });

      it('should validate arguments', () => {
        expect(propertiesExpressions.its.validate!(['property'])).toBeNull();
        expect(propertiesExpressions.its.validate!([])).toContain('exactly one argument');
        expect(propertiesExpressions.its.validate!(['property', 'extra'])).toContain(
          'exactly one argument'
        );
        expect(propertiesExpressions.its.validate!([123])).toContain('must be a string');
      });
    });

    describe('your expression', () => {
      it('should get properties from context.you', async () => {
        const result = await propertiesExpressions.your.evaluate(context, 'id');
        expect(result).toBe('test-element');
      });

      it('should return undefined when context.you is null', async () => {
        context.you = null;
        const result = await propertiesExpressions.your.evaluate(context, 'id');
        expect(result).toBeUndefined();
      });

      it('should throw error for non-string property', async () => {
        await expect(propertiesExpressions.your.evaluate(context, 123 as any)).rejects.toThrow(
          'Property name must be a string'
        );
      });

      it('should validate arguments', () => {
        expect(propertiesExpressions.your.validate!(['property'])).toBeNull();
        expect(propertiesExpressions.your.validate!([])).toContain('exactly one argument');
        expect(propertiesExpressions.your.validate!(['property', 'extra'])).toContain(
          'exactly one argument'
        );
        expect(propertiesExpressions.your.validate!([123])).toContain('must be a string');
      });
    });
  });

  describe('Of Expression', () => {
    it('should work as reverse property access', async () => {
      const obj = { location: { href: 'https://example.com' } };
      const result = await propertiesExpressions.of.evaluate(context, 'location', obj);
      expect(result).toEqual({ href: 'https://example.com' });
    });

    it('should work with DOM elements', async () => {
      const result = await propertiesExpressions.of.evaluate(context, 'id', testElement);
      expect(result).toBe('test-element');
    });

    it('should handle null object', async () => {
      const result = await propertiesExpressions.of.evaluate(context, 'property', null);
      expect(result).toBeUndefined();
    });

    it('should throw error for non-string property', async () => {
      await expect(propertiesExpressions.of.evaluate(context, 123 as any, {})).rejects.toThrow(
        'Property name must be a string'
      );
    });

    it('should validate arguments', () => {
      expect(propertiesExpressions.of.validate!(['property', {}])).toBeNull();
      expect(propertiesExpressions.of.validate!(['property'])).toContain('exactly two arguments');
      expect(propertiesExpressions.of.validate!(['property', {}, 'extra'])).toContain(
        'exactly two arguments'
      );
      expect(propertiesExpressions.of.validate!([123, {}])).toContain('must be a string');
    });
  });

  describe('Attribute Expressions', () => {
    describe('attribute expression', () => {
      it('should get attribute from context.me', async () => {
        const result = await propertiesExpressions.attribute.evaluate(context, 'data-value');
        expect(result).toBe('test-data');
      });

      it('should get attribute from specified element', async () => {
        const otherElement = createTestElement('<span custom-attr="custom-value">Test</span>');
        const result = await propertiesExpressions.attribute.evaluate(
          context,
          'custom-attr',
          otherElement
        );
        expect(result).toBe('custom-value');
      });

      it('should return null for non-existent attribute', async () => {
        const result = await propertiesExpressions.attribute.evaluate(context, 'non-existent');
        expect(result).toBeNull();
      });

      it('should return null when element is null', async () => {
        context.me = null;
        const result = await propertiesExpressions.attribute.evaluate(context, 'data-value');
        expect(result).toBeNull();
      });

      it('should throw error for non-string attribute name', async () => {
        await expect(propertiesExpressions.attribute.evaluate(context, 123 as any)).rejects.toThrow(
          'Attribute name must be a string'
        );
      });

      it('should validate arguments', () => {
        expect(propertiesExpressions.attribute.validate!(['attr'])).toBeNull();
        expect(propertiesExpressions.attribute.validate!(['attr', testElement])).toBeNull();
        expect(propertiesExpressions.attribute.validate!([])).toContain('1-2 arguments');
        expect(propertiesExpressions.attribute.validate!(['attr', testElement, 'extra'])).toContain(
          '1-2 arguments'
        );
        expect(propertiesExpressions.attribute.validate!([123])).toContain('must be a string');
        expect(propertiesExpressions.attribute.validate!(['attr', 'not-element'])).toContain(
          'must be an Element'
        );
      });
    });

    describe('attributeWithValue expression', () => {
      it('should check if attribute has expected value', async () => {
        expect(
          await propertiesExpressions.attributeWithValue.evaluate(
            context,
            'data-value',
            'test-data'
          )
        ).toBe(true);
        expect(
          await propertiesExpressions.attributeWithValue.evaluate(
            context,
            'data-value',
            'wrong-value'
          )
        ).toBe(false);
      });

      it('should work with specified element', async () => {
        const otherElement = createTestElement('<span test-attr="expected">Test</span>');
        const result = await propertiesExpressions.attributeWithValue.evaluate(
          context,
          'test-attr',
          'expected',
          otherElement
        );
        expect(result).toBe(true);
      });

      it('should return false for non-existent attribute', async () => {
        const result = await propertiesExpressions.attributeWithValue.evaluate(
          context,
          'non-existent',
          'value'
        );
        expect(result).toBe(false);
      });

      it('should return false when element is null', async () => {
        context.me = null;
        const result = await propertiesExpressions.attributeWithValue.evaluate(
          context,
          'data-value',
          'test-data'
        );
        expect(result).toBe(false);
      });

      it('should throw error for non-string parameters', async () => {
        await expect(
          propertiesExpressions.attributeWithValue.evaluate(context, 123 as any, 'value')
        ).rejects.toThrow('Attribute name must be a string');
        await expect(
          propertiesExpressions.attributeWithValue.evaluate(context, 'attr', 123 as any)
        ).rejects.toThrow('Expected value must be a string');
      });

      it('should validate arguments', () => {
        expect(propertiesExpressions.attributeWithValue.validate!(['attr', 'value'])).toBeNull();
        expect(
          propertiesExpressions.attributeWithValue.validate!(['attr', 'value', testElement])
        ).toBeNull();
        expect(propertiesExpressions.attributeWithValue.validate!(['attr'])).toContain(
          '2-3 arguments'
        );
        expect(
          propertiesExpressions.attributeWithValue.validate!([
            'attr',
            'value',
            testElement,
            'extra',
          ])
        ).toContain('2-3 arguments');
        expect(propertiesExpressions.attributeWithValue.validate!([123, 'value'])).toContain(
          'attribute name must be a string'
        );
        expect(propertiesExpressions.attributeWithValue.validate!(['attr', 123])).toContain(
          'expected value must be a string'
        );
        expect(
          propertiesExpressions.attributeWithValue.validate!(['attr', 'value', 'not-element'])
        ).toContain('must be an Element');
      });
    });
  });

  describe('Reference Expressions', () => {
    beforeEach(() => {
      // Create test DOM structure
      document.body.innerHTML = `
        <div class="test-class">Item 1</div>
        <div class="test-class">Item 2</div>
        <div id="unique-id">Unique Item</div>
        <span class="other-class">Other</span>
      `;
    });

    describe('classReference expression', () => {
      it('should get all elements with class', async () => {
        const result = await propertiesExpressions.classReference.evaluate(context, 'test-class');
        expect(result).toHaveLength(2);
        expect(result[0].textContent).toBe('Item 1');
        expect(result[1].textContent).toBe('Item 2');
      });

      it('should handle class with leading dot', async () => {
        const result = await propertiesExpressions.classReference.evaluate(context, '.test-class');
        expect(result).toHaveLength(2);
      });

      it('should return empty array for non-existent class', async () => {
        const result = await propertiesExpressions.classReference.evaluate(context, 'non-existent');
        expect(result).toEqual([]);
      });

      it('should throw error for non-string class name', async () => {
        await expect(
          propertiesExpressions.classReference.evaluate(context, 123 as any)
        ).rejects.toThrow('Class name must be a string');
      });

      it('should validate arguments', () => {
        expect(propertiesExpressions.classReference.validate!(['class-name'])).toBeNull();
        expect(propertiesExpressions.classReference.validate!([])).toContain(
          'exactly one argument'
        );
        expect(propertiesExpressions.classReference.validate!(['class', 'extra'])).toContain(
          'exactly one argument'
        );
        expect(propertiesExpressions.classReference.validate!([123])).toContain('must be a string');
      });
    });

    describe('idReference expression', () => {
      it('should get element by ID', async () => {
        const result = await propertiesExpressions.idReference.evaluate(context, 'unique-id');
        expect(result?.textContent).toBe('Unique Item');
        expect(result?.id).toBe('unique-id');
      });

      it('should handle ID with leading hash', async () => {
        const result = await propertiesExpressions.idReference.evaluate(context, '#unique-id');
        expect(result?.id).toBe('unique-id');
      });

      it('should return null for non-existent ID', async () => {
        const result = await propertiesExpressions.idReference.evaluate(context, 'non-existent');
        expect(result).toBeNull();
      });

      it('should throw error for non-string ID', async () => {
        await expect(
          propertiesExpressions.idReference.evaluate(context, 123 as any)
        ).rejects.toThrow('ID value must be a string');
      });

      it('should validate arguments', () => {
        expect(propertiesExpressions.idReference.validate!(['id-value'])).toBeNull();
        expect(propertiesExpressions.idReference.validate!([])).toContain('exactly one argument');
        expect(propertiesExpressions.idReference.validate!(['id', 'extra'])).toContain(
          'exactly one argument'
        );
        expect(propertiesExpressions.idReference.validate!([123])).toContain('must be a string');
      });
    });
  });

  describe('Helper Functions', () => {
    describe('getElementProperty', () => {
      it('should get standard DOM properties', () => {
        expect(getElementProperty(testElement, 'id')).toBe('test-element');
        expect(getElementProperty(testElement, 'className')).toBe('test-class another-class');
        expect(getElementProperty(testElement, 'tagName')).toBe('div');
        expect(getElementProperty(testElement, 'innerText')).toBe('Test Content');
      });

      it('should get attributes', () => {
        expect(getElementProperty(testElement, 'data-value')).toBe('test-data');
        expect(getElementProperty(testElement, 'aria-label')).toBe('Test Label');
        expect(getElementProperty(testElement, 'title')).toBe('Test Title');
      });

      it('should get computed style', () => {
        const style = getElementProperty(testElement, 'style');
        expect(style).toBeInstanceOf(CSSStyleDeclaration);
      });

      it('should get DOM tree navigation properties', () => {
        const children = getElementProperty(testElement, 'children');
        expect(Array.isArray(children)).toBe(true);

        const parent = getElementProperty(testElement, 'parent');
        expect(parent).toBeInstanceOf(Element);
      });

      it('should fallback to regular property access', () => {
        // Add a custom property
        (testElement as any).customProperty = 'custom-value';
        expect(getElementProperty(testElement, 'customProperty')).toBe('custom-value');
      });
    });

    describe('isDataAttribute', () => {
      it('should identify data attributes', () => {
        expect(isDataAttribute('data-value')).toBe(true);
        expect(isDataAttribute('data')).toBe(true);
        expect(isDataAttribute('dataValue')).toBe(false);
        expect(isDataAttribute('value')).toBe(false);
      });
    });

    describe('isAriaAttribute', () => {
      it('should identify aria attributes', () => {
        expect(isAriaAttribute('aria-label')).toBe(true);
        expect(isAriaAttribute('aria')).toBe(true);
        expect(isAriaAttribute('ariaLabel')).toBe(false);
        expect(isAriaAttribute('label')).toBe(false);
      });
    });
  });

  describe('Expression Metadata', () => {
    it('should have correct categories', () => {
      Object.values(propertiesExpressions).forEach(expr => {
        expect(expr.category).toBe('Reference');
      });
    });

    it('should have appropriate evaluation types', () => {
      expect(propertiesExpressions.possessive.evaluatesTo).toBe('Any');
      expect(propertiesExpressions.my.evaluatesTo).toBe('Any');
      expect(propertiesExpressions.its.evaluatesTo).toBe('Any');
      expect(propertiesExpressions.your.evaluatesTo).toBe('Any');
      expect(propertiesExpressions.of.evaluatesTo).toBe('Any');
      expect(propertiesExpressions.attribute.evaluatesTo).toBe('String');
      expect(propertiesExpressions.attributeWithValue.evaluatesTo).toBe('Boolean');
      expect(propertiesExpressions.classReference.evaluatesTo).toBe('Array');
      expect(propertiesExpressions.idReference.evaluatesTo).toBe('Element');
    });

    it('should have correct operator definitions', () => {
      expect(propertiesExpressions.possessive.operators).toContain("'s");
      expect(propertiesExpressions.my.operators).toContain('my');
      expect(propertiesExpressions.its.operators).toContain('its');
      expect(propertiesExpressions.your.operators).toContain('your');
      expect(propertiesExpressions.of.operators).toContain('of');
      expect(propertiesExpressions.attribute.operators).toContain('@');
      expect(propertiesExpressions.attributeWithValue.operators).toContain('@=');
      expect(propertiesExpressions.classReference.operators).toContain('.');
      expect(propertiesExpressions.idReference.operators).toContain('#');
    });
  });
});
