/**
 * Unit Tests for Variable Access Helpers
 *
 * Tests the shared utilities for variable manipulation used by data commands.
 * Critical helper affecting: increment, decrement, set, get, bind
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  convertToNumber,
  getVariableValue,
  setVariableValue,
  resolveElementRef,
  getElementPropertyValue,
  setElementPropertyValue,
  getCurrentNumericValue,
  setTargetValue,
} from '../variable-access';
import type { ExecutionContext } from '../../../types/base-types';

// ========== Test Utilities ==========

function createMockContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  const meElement = document.createElement('input');
  meElement.value = '42';

  return {
    me: meElement,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    globals: new Map(),
    variables: new Map(),
    target: meElement,
    detail: undefined,
    ...overrides,
  } as ExecutionContext;
}

// ========== Tests ==========

describe('Variable Access Helpers', () => {
  describe('convertToNumber', () => {
    describe('null and undefined', () => {
      it('should convert null to 0', () => {
        expect(convertToNumber(null)).toBe(0);
      });

      it('should convert undefined to 0', () => {
        expect(convertToNumber(undefined)).toBe(0);
      });
    });

    describe('numbers', () => {
      it('should return number as-is', () => {
        expect(convertToNumber(42)).toBe(42);
        expect(convertToNumber(3.14)).toBe(3.14);
        expect(convertToNumber(-10)).toBe(-10);
      });

      it('should handle zero', () => {
        expect(convertToNumber(0)).toBe(0);
      });

      it('should convert Infinity to 0', () => {
        expect(convertToNumber(Infinity)).toBe(0);
        expect(convertToNumber(-Infinity)).toBe(0);
      });
    });

    describe('strings', () => {
      it('should parse numeric strings', () => {
        expect(convertToNumber('42')).toBe(42);
        expect(convertToNumber('3.14')).toBe(3.14);
        expect(convertToNumber('-10')).toBe(-10);
      });

      it('should parse strings with leading whitespace', () => {
        expect(convertToNumber('  42')).toBe(42);
      });

      it('should return NaN for invalid strings', () => {
        expect(convertToNumber('not a number')).toBeNaN();
        expect(convertToNumber('abc')).toBeNaN();
      });

      it('should handle empty string', () => {
        expect(convertToNumber('')).toBeNaN();
      });
    });

    describe('booleans', () => {
      it('should convert true to 1', () => {
        expect(convertToNumber(true)).toBe(1);
      });

      it('should convert false to 0', () => {
        expect(convertToNumber(false)).toBe(0);
      });
    });

    describe('arrays', () => {
      it('should return array length', () => {
        expect(convertToNumber([1, 2, 3])).toBe(3);
        expect(convertToNumber(['a', 'b'])).toBe(2);
      });

      it('should return 0 for empty array', () => {
        expect(convertToNumber([])).toBe(0);
      });
    });

    describe('objects', () => {
      it('should return length property if available', () => {
        expect(convertToNumber({ length: 5 })).toBe(5);
      });

      it('should use valueOf if available', () => {
        const obj = { valueOf: () => 42 };
        expect(convertToNumber(obj)).toBe(42);
      });

      it('should return NaN for objects without length or numeric valueOf', () => {
        expect(convertToNumber({ foo: 'bar' })).toBeNaN();
      });

      it('should prefer length over valueOf', () => {
        const obj = { length: 5, valueOf: () => 10 };
        expect(convertToNumber(obj)).toBe(5);
      });
    });
  });

  describe('getVariableValue', () => {
    describe('basic variable lookup', () => {
      it('should get value from locals', () => {
        const context = createMockContext();
        context.locals.set('count', 42);

        expect(getVariableValue('count', context)).toBe(42);
      });

      it('should get value from globals', () => {
        const context = createMockContext();
        context.globals.set('total', 100);

        expect(getVariableValue('total', context)).toBe(100);
      });

      it('should get value from variables map', () => {
        const context = createMockContext();
        context.variables.set('data', 'test');

        expect(getVariableValue('data', context)).toBe('test');
      });

      it('should return undefined for non-existent variable', () => {
        const context = createMockContext();

        expect(getVariableValue('nonExistent', context)).toBeUndefined();
      });
    });

    describe('scope precedence', () => {
      it('should prefer locals over globals', () => {
        const context = createMockContext();
        context.locals.set('value', 'local');
        context.globals.set('value', 'global');

        expect(getVariableValue('value', context)).toBe('local');
      });

      it('should fall back to globals when not in locals', () => {
        const context = createMockContext();
        context.globals.set('value', 'global');

        expect(getVariableValue('value', context)).toBe('global');
      });

      it('should fall back to variables map', () => {
        const context = createMockContext();
        context.variables.set('value', 'variables');

        expect(getVariableValue('value', context)).toBe('variables');
      });
    });

    describe('preferredScope parameter', () => {
      it('should check globals first when preferredScope is "global"', () => {
        const context = createMockContext();
        context.locals.set('value', 'local');
        context.globals.set('value', 'global');

        expect(getVariableValue('value', context, 'global')).toBe('global');
      });

      it('should fall back to locals when global is preferred but not found in globals', () => {
        const context = createMockContext();
        context.locals.set('value', 'local');

        expect(getVariableValue('value', context, 'global')).toBe('local');
      });
    });

    describe('window/globalThis fallback', () => {
      it('should handle missing variables gracefully', () => {
        const context = createMockContext();

        // This tests the fallback logic without actually setting window properties
        expect(getVariableValue('nonExistent', context)).toBeUndefined();
      });
    });
  });

  describe('setVariableValue', () => {
    describe('basic variable setting', () => {
      it('should create new variable in locals by default', () => {
        const context = createMockContext();

        setVariableValue('newVar', 42, context);

        expect(context.locals.get('newVar')).toBe(42);
      });

      it('should update existing local variable', () => {
        const context = createMockContext();
        context.locals.set('count', 0);

        setVariableValue('count', 10, context);

        expect(context.locals.get('count')).toBe(10);
      });

      it('should update existing global variable', () => {
        const context = createMockContext();
        context.globals.set('total', 0);

        setVariableValue('total', 100, context);

        expect(context.globals.get('total')).toBe(100);
      });

      it('should update existing variable in variables map', () => {
        const context = createMockContext();
        context.variables.set('data', 'old');

        setVariableValue('data', 'new', context);

        expect(context.variables.get('data')).toBe('new');
      });
    });

    describe('scope precedence', () => {
      it('should update locals if variable exists there', () => {
        const context = createMockContext();
        context.locals.set('value', 'local');
        context.globals.set('value', 'global');

        setVariableValue('value', 'updated', context);

        expect(context.locals.get('value')).toBe('updated');
        expect(context.globals.get('value')).toBe('global'); // Unchanged
      });

      it('should update globals if not in locals', () => {
        const context = createMockContext();
        context.globals.set('value', 'global');

        setVariableValue('value', 'updated', context);

        expect(context.globals.get('value')).toBe('updated');
      });
    });

    describe('preferredScope parameter', () => {
      it('should force global scope when preferredScope is "global"', () => {
        const context = createMockContext();

        setVariableValue('globalVar', 42, context, 'global');

        expect(context.globals.get('globalVar')).toBe(42);
        expect(context.locals.has('globalVar')).toBe(false);
      });

      it('should update global even if local exists when preferredScope is "global"', () => {
        const context = createMockContext();
        context.locals.set('value', 'local');

        setVariableValue('value', 'global-value', context, 'global');

        expect(context.globals.get('value')).toBe('global-value');
        expect(context.locals.get('value')).toBe('local'); // Unchanged
      });
    });
  });

  describe('resolveElementRef', () => {
    describe('context references', () => {
      it('should resolve "me" to context.me', () => {
        const context = createMockContext();

        expect(resolveElementRef('me', context)).toBe(context.me);
      });

      it('should resolve "it" to context.it', () => {
        const itValue = { value: 42 };
        const context = createMockContext({ it: itValue });

        expect(resolveElementRef('it', context)).toBe(itValue);
      });

      it('should resolve "you" to context.you', () => {
        const youElement = document.createElement('div');
        const context = createMockContext({ you: youElement });

        expect(resolveElementRef('you', context)).toBe(youElement);
      });
    });

    describe('variable resolution', () => {
      it('should resolve variable name from context', () => {
        const context = createMockContext();
        context.locals.set('element', 'test-value');

        expect(resolveElementRef('element', context)).toBe('test-value');
      });

      it('should return undefined for non-existent variable', () => {
        const context = createMockContext();

        expect(resolveElementRef('nonExistent', context)).toBeUndefined();
      });
    });
  });

  describe('getElementPropertyValue', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    describe('context reference properties', () => {
      it('should get property from context.me', () => {
        const context = createMockContext();
        (context.me as any).customProp = 123;

        expect(getElementPropertyValue('me.customProp', context)).toBe(123);
      });

      it('should get value from input element', () => {
        const context = createMockContext();
        (context.me as any).value = '42';

        expect(getElementPropertyValue('me.value', context)).toBe(42);
      });

      it('should get property from context.it', () => {
        const element = document.createElement('div');
        element.setAttribute('data-count', '10');
        const context = createMockContext({ it: element });

        // Access as property, not attribute
        (element as any).scrollTop = 100;
        expect(getElementPropertyValue('it.scrollTop', context)).toBe(100);
      });

      it('should get property from context.you', () => {
        const element = document.createElement('span');
        const context = createMockContext({ you: element });
        element.textContent = '25';

        expect(getElementPropertyValue('you.textContent', context)).toBe(25);
      });
    });

    describe('variable element properties', () => {
      it('should resolve variable and get property', () => {
        const context = createMockContext();
        const element = document.createElement('input');
        element.value = '99';
        context.locals.set('myInput', element);

        expect(getElementPropertyValue('myInput.value', context)).toBe(99);
      });
    });

    describe('non-existent elements', () => {
      it('should return 0 when element reference is null', () => {
        const context = createMockContext({ me: null });

        expect(getElementPropertyValue('me.value', context)).toBe(0);
      });

      it('should return 0 when variable is not found', () => {
        const context = createMockContext();

        expect(getElementPropertyValue('nonExistent.value', context)).toBe(0);
      });
    });
  });

  describe('setElementPropertyValue', () => {
    describe('context reference properties', () => {
      it('should set property on context.me', () => {
        const context = createMockContext();

        setElementPropertyValue('me.value', '100', context);

        expect((context.me as any).value).toBe('100');
      });

      it('should set property on context.it', () => {
        const element = document.createElement('div');
        const context = createMockContext({ it: element });

        setElementPropertyValue('it.scrollTop', 50, context);

        expect((element as any).scrollTop).toBe(50);
      });

      it('should set property on context.you', () => {
        const element = document.createElement('span');
        const context = createMockContext({ you: element });

        setElementPropertyValue('you.textContent', 'Hello', context);

        expect(element.textContent).toBe('Hello');
      });
    });

    describe('variable element properties', () => {
      it('should resolve variable and set property', () => {
        const context = createMockContext();
        const element = document.createElement('input');
        context.locals.set('myInput', element);

        setElementPropertyValue('myInput.value', '200', context);

        expect(element.value).toBe('200');
      });
    });

    describe('non-existent elements', () => {
      it('should not throw when element reference is null', () => {
        const context = createMockContext({ me: null });

        expect(() => setElementPropertyValue('me.value', '100', context)).not.toThrow();
      });

      it('should not throw when variable is not found', () => {
        const context = createMockContext();

        expect(() => setElementPropertyValue('nonExistent.value', '100', context)).not.toThrow();
      });
    });
  });

  describe('getCurrentNumericValue', () => {
    describe('direct numeric values', () => {
      it('should return number as-is', () => {
        const context = createMockContext();

        expect(getCurrentNumericValue(42, undefined, undefined, context)).toBe(42);
      });
    });

    describe('HTMLElement targets', () => {
      it('should get value from input element', () => {
        const context = createMockContext();
        const input = document.createElement('input');
        input.value = '50';

        expect(getCurrentNumericValue(input, undefined, undefined, context)).toBe(50);
      });

      it('should get textContent from non-input element', () => {
        const context = createMockContext();
        const div = document.createElement('div');
        div.textContent = '75';

        expect(getCurrentNumericValue(div, undefined, undefined, context)).toBe(75);
      });

      it('should get specific property from element', () => {
        const context = createMockContext();
        const input = document.createElement('input');
        input.value = '100';

        expect(getCurrentNumericValue(input, 'value', undefined, context)).toBe(100);
      });

      it('should get data attribute from element', () => {
        const context = createMockContext();
        const div = document.createElement('div');
        div.setAttribute('data-count', '25');

        expect(getCurrentNumericValue(div, 'data-count', undefined, context)).toBe(25);
      });
    });

    describe('string targets (variables)', () => {
      it('should resolve variable and convert to number', () => {
        const context = createMockContext();
        context.locals.set('count', 42);

        expect(getCurrentNumericValue('count', undefined, undefined, context)).toBe(42);
      });

      it('should handle global scope', () => {
        const context = createMockContext();
        context.globals.set('total', 100);

        expect(getCurrentNumericValue('total', undefined, 'global', context)).toBe(100);
      });

      it('should return 0 for undefined variable', () => {
        const context = createMockContext();

        expect(getCurrentNumericValue('nonExistent', undefined, undefined, context)).toBe(0);
      });
    });

    describe('property path targets', () => {
      it('should get element property value', () => {
        const context = createMockContext();
        (context.me as any).value = '50';

        expect(getCurrentNumericValue('me.value', undefined, undefined, context)).toBe(50);
      });

      it('should handle nested property paths', () => {
        const context = createMockContext();
        const element = document.createElement('div');
        (element as any).scrollTop = 200;
        context.locals.set('myDiv', element);

        expect(getCurrentNumericValue('myDiv.scrollTop', undefined, undefined, context)).toBe(200);
      });
    });

    describe('context reference targets', () => {
      it('should get value from "me" reference', () => {
        const context = createMockContext();
        (context.me as any).value = '30';

        expect(getCurrentNumericValue('me', undefined, undefined, context)).toBe(30);
      });

      it('should get value from "it" reference', () => {
        const context = createMockContext({ it: 99 });

        expect(getCurrentNumericValue('it', undefined, undefined, context)).toBe(99);
      });

      it('should get value from "you" reference', () => {
        const youElement = document.createElement('input');
        youElement.value = '77';
        const context = createMockContext({ you: youElement });

        expect(getCurrentNumericValue('you', undefined, undefined, context)).toBe(77);
      });
    });
  });

  describe('setTargetValue', () => {
    describe('HTMLElement targets', () => {
      it('should set value on input element', () => {
        const context = createMockContext();
        const input = document.createElement('input');

        setTargetValue(input, undefined, undefined, 42, context);

        expect(input.value).toBe('42');
      });

      it('should set textContent on non-input element', () => {
        const context = createMockContext();
        const div = document.createElement('div');

        setTargetValue(div, undefined, undefined, 'Hello', context);

        expect(div.textContent).toBe('Hello');
      });

      it('should set specific property on element', () => {
        const context = createMockContext();
        const input = document.createElement('input');

        setTargetValue(input, 'value', undefined, 100, context);

        expect(input.value).toBe('100');
      });

      it('should set data attribute on element', () => {
        const context = createMockContext();
        const div = document.createElement('div');

        setTargetValue(div, 'data-count', undefined, 25, context);

        expect(div.getAttribute('data-count')).toBe('25');
      });

      it('should set standard HTML attributes', () => {
        const context = createMockContext();
        const img = document.createElement('img');

        setTargetValue(img, 'alt', undefined, 'Description', context);

        expect(img.getAttribute('alt')).toBe('Description');
      });
    });

    describe('string targets (variables)', () => {
      it('should set variable value', () => {
        const context = createMockContext();

        setTargetValue('count', undefined, undefined, 42, context);

        expect(context.locals.get('count')).toBe(42);
      });

      it('should set global variable with scope', () => {
        const context = createMockContext();

        setTargetValue('total', undefined, 'global', 100, context);

        expect(context.globals.get('total')).toBe(100);
      });
    });

    describe('property path targets', () => {
      it('should set element property value', () => {
        const context = createMockContext();

        setTargetValue('me.value', undefined, undefined, 50, context);

        // Input elements convert value to string automatically
        expect((context.me as any).value).toBe('50');
      });

      it('should handle nested property paths', () => {
        const context = createMockContext();
        const element = document.createElement('div');
        context.locals.set('myDiv', element);

        setTargetValue('myDiv.scrollTop', undefined, undefined, 200, context);

        expect((element as any).scrollTop).toBe(200);
      });
    });

    describe('context reference targets', () => {
      it('should set value on "me" reference', () => {
        const context = createMockContext();

        setTargetValue('me', undefined, undefined, 30, context);

        // Input elements convert value to string automatically
        expect((context.me as any).value).toBe('30');
      });

      it('should set value on "it" reference', () => {
        const context = createMockContext();

        setTargetValue('it', undefined, undefined, 99, context);

        expect(context.it).toBe(99);
      });

      it('should set value on "you" reference', () => {
        const youElement = document.createElement('input');
        const context = createMockContext({ you: youElement });

        setTargetValue('you', undefined, undefined, 77, context);

        // Input elements convert value to string automatically
        expect(youElement.value).toBe('77');
      });
    });

    describe('number targets', () => {
      it('should ignore number targets gracefully', () => {
        const context = createMockContext();

        // Should not throw
        expect(() => setTargetValue(42, undefined, undefined, 100, context)).not.toThrow();
      });
    });
  });
});
