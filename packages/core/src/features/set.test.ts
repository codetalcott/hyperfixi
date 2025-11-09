/**
 * Top-level Set Feature Tests
 * Tests the set feature for defining element-scoped variables at the top level
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SetFeature } from './set';
import { ExecutionContext } from '../types/core';

describe('Top-level Set Feature', () => {
  let feature: SetFeature;
  let context: ExecutionContext;
  let mockElement: HTMLElement;

  beforeEach(() => {
    feature = new SetFeature();

    // Create a mock element
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);

    context = {
      me: mockElement,
      you: null,
      it: null,
      locals: new Map(),
      globals: new Map(),
      result: undefined,
    };
  });

  describe('Element-scoped Variable Setting', () => {
    it('can define element-scoped variables with colon prefix', async () => {
      const result = await feature.execute(context, ':foo', 'to', 42);

      expect(result).toBe(42);
      expect(context.locals?.get(':foo')).toBe(42);
    });

    it('can set element-scoped variables without colon prefix', async () => {
      const result = await feature.execute(context, 'myVar', 'to', 'test value');

      expect(result).toBe('test value');
      expect(context.locals?.get('myVar')).toBe('test value');
    });

    it('can set multiple element-scoped variables', async () => {
      await feature.execute(context, ':foo', 'to', 42);
      await feature.execute(context, ':bar', 'to', 'hello');

      expect(context.locals?.get(':foo')).toBe(42);
      expect(context.locals?.get(':bar')).toBe('hello');
    });

    it('can overwrite existing element-scoped variables', async () => {
      await feature.execute(context, ':foo', 'to', 'initial');
      await feature.execute(context, ':foo', 'to', 'updated');

      expect(context.locals?.get(':foo')).toBe('updated');
    });
  });

  describe('Variable Access', () => {
    it('stores variables in context locals for later access', async () => {
      await feature.execute(context, ':testVar', 'to', 'stored value');

      // Variable should be accessible in context.locals
      expect(context.locals?.has(':testVar')).toBe(true);
      expect(context.locals?.get(':testVar')).toBe('stored value');
    });

    it('can handle complex data types', async () => {
      const complexObject = { name: 'test', value: 123, nested: { prop: true } };

      await feature.execute(context, ':complex', 'to', complexObject);

      expect(context.locals?.get(':complex')).toEqual(complexObject);
    });

    it('can handle arrays', async () => {
      const testArray = [1, 2, 3, 'test'];

      await feature.execute(context, ':array', 'to', testArray);

      expect(context.locals?.get(':array')).toEqual(testArray);
    });
  });

  describe('Context Integration', () => {
    it('maintains separate variable scopes per element', async () => {
      const otherElement = document.createElement('span');
      const otherContext = {
        ...context,
        me: otherElement,
        locals: new Map(),
      };

      await feature.execute(context, ':foo', 'to', 'element1');
      await feature.execute(otherContext, ':foo', 'to', 'element2');

      expect(context.locals?.get(':foo')).toBe('element1');
      expect(otherContext.locals?.get(':foo')).toBe('element2');
    });

    it('initializes locals map if not present', async () => {
      const contextWithoutLocals = {
        ...context,
        locals: undefined,
      };

      await feature.execute(contextWithoutLocals, ':test', 'to', 'value');

      expect(contextWithoutLocals.locals).toBeDefined();
      expect(contextWithoutLocals.locals?.get(':test')).toBe('value');
    });
  });

  describe('Error Handling', () => {
    it('throws error for insufficient arguments', async () => {
      await expect(feature.execute(context, ':foo')).rejects.toThrow(
        'Set feature requires at least 3 arguments'
      );
    });

    it('throws error for missing "to" keyword', async () => {
      await expect(feature.execute(context, ':foo', 'not-to', 'value')).rejects.toThrow(
        'Set feature requires "to" keyword'
      );
    });

    it('handles null/undefined values', async () => {
      await feature.execute(context, ':nullVar', 'to', null);
      await feature.execute(context, ':undefinedVar', 'to', undefined);

      expect(context.locals?.get(':nullVar')).toBe(null);
      expect(context.locals?.get(':undefinedVar')).toBe(undefined);
    });
  });

  describe('Validation', () => {
    it('validates required number of arguments', () => {
      expect(feature.validate([':foo'])).toBe('Set feature requires at least 3 arguments');
      expect(feature.validate([':foo', 'to'])).toBe('Set feature requires at least 3 arguments');
    });

    it('validates "to" keyword', () => {
      expect(feature.validate([':foo', 'not-to', 'value'])).toBe(
        'Set feature requires "to" keyword'
      );
    });

    it('passes validation for valid arguments', () => {
      expect(feature.validate([':foo', 'to', 'value'])).toBeNull();
      expect(feature.validate(['myVar', 'to', 42])).toBeNull();
    });
  });

  describe('Integration with Hyperscript Patterns', () => {
    it('supports colon-prefixed variables as per hyperscript convention', async () => {
      // Test the exact pattern from the official test: set :foo to 42
      await feature.execute(context, ':foo', 'to', 42);

      expect(context.locals?.get(':foo')).toBe(42);
    });

    it('can be used with string variable names', async () => {
      await feature.execute(context, 'elementVar', 'to', 'element value');

      expect(context.locals?.get('elementVar')).toBe('element value');
    });
  });
});
