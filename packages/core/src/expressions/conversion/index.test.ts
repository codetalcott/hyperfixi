/**
 * Tests for conversion expressions
 * Covering type conversions, 'as' keyword, and built-in conversion types
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestElement, createMockHyperscriptContext } from '../../test-setup';
import {
  conversionExpressions,
  defaultConversions,
  getFormValues,
  getInputValue,
  parseFixedPrecision,
} from './index';
import type { ExecutionContext } from '../../types/core';

describe('Conversion Expressions', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = createMockHyperscriptContext();
  });

  describe('as expression', () => {
    describe('Basic type conversions', () => {
      it('should convert to Array', async () => {
        expect(await conversionExpressions.as.evaluate(context, 'hello', 'Array')).toEqual([
          'hello',
        ]);
        expect(await conversionExpressions.as.evaluate(context, [1, 2, 3], 'Array')).toEqual([
          1, 2, 3,
        ]);
        expect(await conversionExpressions.as.evaluate(context, null, 'Array')).toEqual([]);
      });

      it('should convert to String', async () => {
        expect(await conversionExpressions.as.evaluate(context, 123, 'String')).toBe('123');
        expect(await conversionExpressions.as.evaluate(context, true, 'String')).toBe('true');
        expect(await conversionExpressions.as.evaluate(context, null, 'String')).toBe('');
        expect(await conversionExpressions.as.evaluate(context, { key: 'value' }, 'String')).toBe(
          '{"key":"value"}'
        );
      });

      it('should convert to Number', async () => {
        expect(await conversionExpressions.as.evaluate(context, '123', 'Number')).toBe(123);
        expect(await conversionExpressions.as.evaluate(context, '123.45', 'Number')).toBe(123.45);
        expect(await conversionExpressions.as.evaluate(context, true, 'Number')).toBe(1);
        expect(await conversionExpressions.as.evaluate(context, false, 'Number')).toBe(0);
        expect(await conversionExpressions.as.evaluate(context, 'invalid', 'Number')).toBe(0);
        expect(await conversionExpressions.as.evaluate(context, null, 'Number')).toBe(0);
      });

      it('should convert to Int', async () => {
        expect(await conversionExpressions.as.evaluate(context, '123.99', 'Int')).toBe(123);
        expect(await conversionExpressions.as.evaluate(context, 123.99, 'Int')).toBe(123);
        expect(await conversionExpressions.as.evaluate(context, -123.99, 'Int')).toBe(-123);
      });

      it('should convert to Float', async () => {
        expect(await conversionExpressions.as.evaluate(context, '123.456', 'Float')).toBe(123.456);
        expect(await conversionExpressions.as.evaluate(context, 123, 'Float')).toBe(123);
      });

      it('should convert to Date', async () => {
        const dateStr = '2023-01-01T00:00:00.000Z';
        const result = await conversionExpressions.as.evaluate(context, dateStr, 'Date');
        expect(result).toBeInstanceOf(Date);
        expect(result.getUTCFullYear()).toBe(2023);

        const existingDate = new Date('2022-12-31');
        const result2 = await conversionExpressions.as.evaluate(context, existingDate, 'Date');
        expect(result2).toBe(existingDate);

        const invalidResult = await conversionExpressions.as.evaluate(context, 'invalid', 'Date');
        expect(invalidResult).toBeInstanceOf(Date);
      });
    });

    describe('JSON conversions', () => {
      it('should convert to JSON string', async () => {
        const obj = { key: 'value', num: 123 };
        const result = await conversionExpressions.as.evaluate(context, obj, 'JSON');
        expect(result).toBe('{"key":"value","num":123}');

        const arr = [1, 2, 3];
        const result2 = await conversionExpressions.as.evaluate(context, arr, 'JSON');
        expect(result2).toBe('[1,2,3]');
      });

      it('should convert to Object from JSON', async () => {
        const jsonStr = '{"key":"value","num":123}';
        const result = await conversionExpressions.as.evaluate(context, jsonStr, 'Object');
        expect(result).toEqual({ key: 'value', num: 123 });

        const nonJsonStr = 'not json';
        const result2 = await conversionExpressions.as.evaluate(context, nonJsonStr, 'Object');
        expect(result2).toEqual({});

        const existingObj = { existing: true };
        const result3 = await conversionExpressions.as.evaluate(context, existingObj, 'Object');
        expect(result3).toBe(existingObj);
      });
    });

    describe('HTML/DOM conversions', () => {
      it('should convert to Fragment', async () => {
        const html = '<div>Hello</div><p>World</p>';
        const result = await conversionExpressions.as.evaluate(context, html, 'Fragment');
        expect(result.constructor.name).toBe('DocumentFragment');
        expect(result.children).toHaveLength(2);
        expect(result.children[0].tagName).toBe('DIV');
        expect(result.children[1].tagName).toBe('P');
      });

      it('should convert to HTML string', async () => {
        const div = document.createElement('div');
        div.textContent = 'Hello';
        div.id = 'test';

        const result = await conversionExpressions.as.evaluate(context, div, 'HTML');
        expect(result).toBe('<div id="test">Hello</div>');

        const array = [div, 'text'];
        const result2 = await conversionExpressions.as.evaluate(context, array, 'HTML');
        expect(result2).toBe('<div id="test">Hello</div>text');
      });
    });

    describe('Form value conversions', () => {
      it('should convert form to Values object', async () => {
        const form = createTestElement(`
          <form>
            <input name="text" value="hello" />
            <input name="number" type="number" value="123" />
            <input name="checkbox" type="checkbox" checked />
            <select name="select">
              <option value="option1" selected>Option 1</option>
            </select>
          </form>
        `) as HTMLFormElement;

        const result = await conversionExpressions.as.evaluate(context, form, 'Values');
        expect(result).toEqual({
          text: 'hello',
          number: 123,
          checkbox: true,
          select: 'option1',
        });
      });

      it('should convert to Values:Form encoded string', async () => {
        const mockValues = { name: 'John Doe', age: '30' };

        // Mock the Values conversion to return our test data
        const originalValues = defaultConversions.Values;
        defaultConversions.Values = () => mockValues;

        const result = await conversionExpressions.as.evaluate(context, {}, 'Values:Form');
        expect(result).toBe('name=John+Doe&age=30');

        // Restore original
        defaultConversions.Values = originalValues;
      });

      it('should convert to Values:JSON string', async () => {
        const mockValues = { name: 'John Doe', age: 30 };

        // Mock the Values conversion to return our test data
        const originalValues = defaultConversions.Values;
        defaultConversions.Values = () => mockValues;

        const result = await conversionExpressions.as.evaluate(context, {}, 'Values:JSON');
        expect(result).toBe('{"name":"John Doe","age":30}');

        // Restore original
        defaultConversions.Values = originalValues;
      });
    });

    describe('Fixed precision conversion', () => {
      it('should convert to fixed precision string', async () => {
        expect(await conversionExpressions.as.evaluate(context, 123.456789, 'Fixed')).toBe(
          '123.46'
        );
        expect(await conversionExpressions.as.evaluate(context, 123.456789, 'Fixed:4')).toBe(
          '123.4568'
        );
        expect(await conversionExpressions.as.evaluate(context, 123.1, 'Fixed:3')).toBe('123.100');
      });
    });

    describe('Error handling', () => {
      it('should warn for unknown conversion types', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await conversionExpressions.as.evaluate(context, 'test', 'UnknownType');
        expect(result).toBe('test'); // Returns original value
        expect(consoleSpy).toHaveBeenCalledWith('Unknown conversion type: UnknownType');

        consoleSpy.mockRestore();
      });

      it('should throw error for non-string type', async () => {
        await expect(
          conversionExpressions.as.evaluate(context, 'test', 123 as any)
        ).rejects.toThrow('Conversion type must be a string');
      });

      it('should validate arguments', () => {
        expect(conversionExpressions.as.validate!(['value', 'String'])).toBeNull();
        expect(conversionExpressions.as.validate!(['value'])).toContain('exactly two arguments');
        expect(conversionExpressions.as.validate!(['value', 'String', 'extra'])).toContain(
          'exactly two arguments'
        );
        expect(conversionExpressions.as.validate!(['value', 123])).toContain('must be a string');
      });
    });

    describe('Expression metadata', () => {
      it('should have correct properties', () => {
        expect(conversionExpressions.as.category).toBe('Conversion');
        expect(conversionExpressions.as.evaluatesTo).toBe('Any');
        expect(conversionExpressions.as.precedence).toBe(20);
        expect(conversionExpressions.as.associativity).toBe('Left');
        expect(conversionExpressions.as.operators).toContain('as');
      });
    });
  });

  describe('is expression', () => {
    describe('Basic type checking', () => {
      it('should check null/undefined', async () => {
        expect(await conversionExpressions.is.evaluate(context, null, 'null')).toBe(true);
        expect(await conversionExpressions.is.evaluate(context, undefined, 'undefined')).toBe(true);
        expect(await conversionExpressions.is.evaluate(context, 'test', 'null')).toBe(false);
        expect(await conversionExpressions.is.evaluate(context, 'test', 'undefined')).toBe(false);
      });

      it('should check primitive types', async () => {
        expect(await conversionExpressions.is.evaluate(context, 'hello', 'string')).toBe(true);
        expect(await conversionExpressions.is.evaluate(context, 123, 'number')).toBe(true);
        expect(await conversionExpressions.is.evaluate(context, true, 'boolean')).toBe(true);
        expect(await conversionExpressions.is.evaluate(context, () => {}, 'function')).toBe(true);

        expect(await conversionExpressions.is.evaluate(context, 123, 'string')).toBe(false);
        expect(await conversionExpressions.is.evaluate(context, 'hello', 'number')).toBe(false);
      });

      it('should check object types', async () => {
        expect(await conversionExpressions.is.evaluate(context, {}, 'object')).toBe(true);
        expect(await conversionExpressions.is.evaluate(context, [], 'array')).toBe(true);
        expect(await conversionExpressions.is.evaluate(context, new Date(), 'date')).toBe(true);

        expect(await conversionExpressions.is.evaluate(context, null, 'object')).toBe(false);
        expect(await conversionExpressions.is.evaluate(context, {}, 'array')).toBe(false);
      });

      it('should check DOM types', async () => {
        const div = document.createElement('div');
        const text = document.createTextNode('text');

        expect(await conversionExpressions.is.evaluate(context, div, 'element')).toBe(true);
        expect(await conversionExpressions.is.evaluate(context, div, 'node')).toBe(true);
        expect(await conversionExpressions.is.evaluate(context, text, 'node')).toBe(true);
        expect(await conversionExpressions.is.evaluate(context, text, 'element')).toBe(false);
      });

      it('should check empty values', async () => {
        expect(await conversionExpressions.is.evaluate(context, null, 'empty')).toBe(true);
        expect(await conversionExpressions.is.evaluate(context, undefined, 'empty')).toBe(true);
        expect(await conversionExpressions.is.evaluate(context, '', 'empty')).toBe(true);
        expect(await conversionExpressions.is.evaluate(context, [], 'empty')).toBe(true);
        expect(await conversionExpressions.is.evaluate(context, {}, 'empty')).toBe(true);

        expect(await conversionExpressions.is.evaluate(context, 'hello', 'empty')).toBe(false);
        expect(await conversionExpressions.is.evaluate(context, [1], 'empty')).toBe(false);
        expect(await conversionExpressions.is.evaluate(context, { key: 'value' }, 'empty')).toBe(
          false
        );
      });

      it('should handle NaN for number type', async () => {
        expect(await conversionExpressions.is.evaluate(context, NaN, 'number')).toBe(false);
        expect(await conversionExpressions.is.evaluate(context, 123, 'number')).toBe(true);
      });
    });

    describe('Custom type checking', () => {
      it('should check constructor names', async () => {
        class CustomClass {}
        const instance = new CustomClass();

        expect(await conversionExpressions.is.evaluate(context, instance, 'customclass')).toBe(
          true
        );
        expect(await conversionExpressions.is.evaluate(context, {}, 'customclass')).toBe(false);
      });
    });

    describe('Error handling', () => {
      it('should throw error for non-string type', async () => {
        await expect(
          conversionExpressions.is.evaluate(context, 'test', 123 as any)
        ).rejects.toThrow('Type check requires a string type');
      });

      it('should validate arguments', () => {
        expect(conversionExpressions.is.validate!(['value', 'string'])).toBeNull();
        expect(conversionExpressions.is.validate!(['value'])).toContain('exactly two arguments');
        expect(conversionExpressions.is.validate!(['value', 'string', 'extra'])).toContain(
          'exactly two arguments'
        );
        expect(conversionExpressions.is.validate!(['value', 123])).toContain('must be a string');
      });
    });

    describe('Expression metadata', () => {
      it('should have correct properties', () => {
        expect(conversionExpressions.is.category).toBe('Conversion');
        expect(conversionExpressions.is.evaluatesTo).toBe('Boolean');
        expect(conversionExpressions.is.precedence).toBe(10);
        expect(conversionExpressions.is.operators).toContain('is a');
      });
    });
  });

  describe('async expression', () => {
    it('should return value as identity function', async () => {
      // The async expression acts as an identity function in our implementation
      // It returns whatever is passed to it unchanged
      const testValue = 'test';
      const result = await conversionExpressions.async.evaluate(context, testValue);
      expect(result).toBe(testValue);

      // Test with object
      const testObj = { key: 'value' };
      const result2 = await conversionExpressions.async.evaluate(context, testObj);
      expect(result2).toBe(testObj);

      // Test that it doesn't modify the input
      const testArray = [1, 2, 3];
      const result3 = await conversionExpressions.async.evaluate(context, testArray);
      expect(result3).toBe(testArray);
    });

    it('should work with non-promise values', async () => {
      const value = 'test';
      const result = await conversionExpressions.async.evaluate(context, value);
      expect(result).toBe(value);
    });

    it('should validate arguments', () => {
      expect(conversionExpressions.async.validate!(['expression'])).toBeNull();
      expect(conversionExpressions.async.validate!([])).toContain('exactly one argument');
      expect(conversionExpressions.async.validate!(['expr1', 'expr2'])).toContain(
        'exactly one argument'
      );
    });

    it('should have correct metadata', () => {
      expect(conversionExpressions.async.category).toBe('Conversion');
      expect(conversionExpressions.async.evaluatesTo).toBe('Any');
      expect(conversionExpressions.async.precedence).toBe(25);
      expect(conversionExpressions.async.associativity).toBe('Right');
    });
  });

  describe('Helper functions', () => {
    describe('getFormValues', () => {
      it('should extract values from form', () => {
        const form = createTestElement(`
          <form>
            <input name="text" value="hello" />
            <input name="number" type="number" value="123" />
            <input name="multiple" value="first" />
            <input name="multiple" value="second" />
          </form>
        `) as HTMLFormElement;

        const result = getFormValues(form);
        expect(result.text).toBe('hello');
        expect(result.number).toBe('123');
        expect(result.multiple).toEqual(['first', 'second']);
      });
    });

    describe('getInputValue', () => {
      it('should get checkbox value', () => {
        const checkbox = createTestElement('<input type="checkbox" checked />') as HTMLInputElement;
        expect(getInputValue(checkbox)).toBe(true);

        checkbox.checked = false;
        expect(getInputValue(checkbox)).toBe(false);
      });

      it('should get number input value', () => {
        const number = createTestElement('<input type="number" value="123" />') as HTMLInputElement;
        expect(getInputValue(number)).toBe(123);
      });

      it('should get select value', () => {
        const select = createTestElement(`
          <select>
            <option value="1">One</option>
            <option value="2" selected>Two</option>
          </select>
        `) as HTMLSelectElement;
        expect(getInputValue(select)).toBe('2');
      });
    });

    describe('parseFixedPrecision', () => {
      it('should parse Fixed precision', () => {
        expect(parseFixedPrecision('Fixed')).toEqual({ precision: 2 });
        expect(parseFixedPrecision('Fixed:4')).toEqual({ precision: 4 });
        expect(parseFixedPrecision('Fixed:0')).toEqual({ precision: 0 });
        expect(parseFixedPrecision('NotFixed')).toEqual({});
      });
    });
  });

  describe('Expression metadata', () => {
    it('should have correct categories', () => {
      Object.values(conversionExpressions).forEach(expr => {
        expect(expr.category).toBe('Conversion');
      });
    });

    it('should have different return types', () => {
      expect(conversionExpressions.as.evaluatesTo).toBe('Any');
      expect(conversionExpressions.is.evaluatesTo).toBe('Boolean');
      expect(conversionExpressions.async.evaluatesTo).toBe('Any');
    });

    it('should have appropriate precedence', () => {
      // async should have highest precedence (evaluated first)
      expect(conversionExpressions.async.precedence).toBeGreaterThan(
        conversionExpressions.as.precedence!
      );
      expect(conversionExpressions.as.precedence).toBeGreaterThan(
        conversionExpressions.is.precedence!
      );
    });
  });
});
