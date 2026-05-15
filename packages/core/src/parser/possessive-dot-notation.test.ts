/**
 * Tests for possessive dot notation support (my.prop, its.prop, your.prop)
 *
 * This enables JavaScript-like property access using possessive pronouns:
 * - my.textContent  → equivalent to me.textContent
 * - its.value       → equivalent to it.value
 * - your.name       → equivalent to you.name
 */

import { describe, it, expect } from 'vitest';
import { evaluateExpressionFromSource } from './runtime';
import type { ExecutionContext } from '../types/core';

describe('Possessive dot notation (my.prop, its.prop, your.prop)', () => {
  describe('my.property syntax', () => {
    const context = {
      me: {
        textContent: 'hello world',
        value: 'test value',
        className: 'btn primary',
        parentElement: { id: 'parent-id' },
      },
      you: null,
      it: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      parent: undefined,
      halted: false,
      returned: false,
      broke: false,
      continued: false,
      async: false,
    };

    it('should parse my.textContent (dot syntax)', async () => {
      const result = await evaluateExpressionFromSource(
        'my.textContent',
        context as unknown as ExecutionContext
      );
      expect(result).toBe('hello world');
    });

    it('should parse my.value (dot syntax)', async () => {
      const result = await evaluateExpressionFromSource(
        'my.value',
        context as unknown as ExecutionContext
      );
      expect(result).toBe('test value');
    });

    it('should parse my.className (dot syntax)', async () => {
      const result = await evaluateExpressionFromSource(
        'my.className',
        context as unknown as ExecutionContext
      );
      expect(result).toBe('btn primary');
    });

    it('should handle chained access: my.parentElement.id', async () => {
      const result = await evaluateExpressionFromSource(
        'my.parentElement.id',
        context as unknown as ExecutionContext
      );
      expect(result).toBe('parent-id');
    });

    it('should still work with space syntax: my textContent', async () => {
      const result = await evaluateExpressionFromSource(
        'my textContent',
        context as unknown as ExecutionContext
      );
      expect(result).toBe('hello world');
    });

    it('should be equivalent to me.textContent', async () => {
      const myResult = await evaluateExpressionFromSource(
        'my.textContent',
        context as unknown as ExecutionContext
      );
      const meResult = await evaluateExpressionFromSource(
        'me.textContent',
        context as unknown as ExecutionContext
      );
      expect(myResult).toBe(meResult);
    });
  });

  describe('its.property syntax', () => {
    const context = {
      me: null,
      you: null,
      it: { value: 'it-value', name: 'it-name' },
      result: null,
      locals: new Map(),
      globals: new Map(),
      parent: undefined,
      halted: false,
      returned: false,
      broke: false,
      continued: false,
      async: false,
    };

    it('should parse its.value (dot syntax)', async () => {
      const result = await evaluateExpressionFromSource(
        'its.value',
        context as unknown as ExecutionContext
      );
      expect(result).toBe('it-value');
    });

    it('should parse its.name (dot syntax)', async () => {
      const result = await evaluateExpressionFromSource(
        'its.name',
        context as unknown as ExecutionContext
      );
      expect(result).toBe('it-name');
    });

    it('should be equivalent to it.value', async () => {
      const itsResult = await evaluateExpressionFromSource(
        'its.value',
        context as unknown as ExecutionContext
      );
      const itResult = await evaluateExpressionFromSource(
        'it.value',
        context as unknown as ExecutionContext
      );
      expect(itsResult).toBe(itResult);
    });
  });

  describe('your.property syntax', () => {
    const context = {
      me: null,
      you: { value: 'you-value', name: 'you-name' },
      it: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      parent: undefined,
      halted: false,
      returned: false,
      broke: false,
      continued: false,
      async: false,
    };

    it('should parse your.value (dot syntax)', async () => {
      const result = await evaluateExpressionFromSource(
        'your.value',
        context as unknown as ExecutionContext
      );
      expect(result).toBe('you-value');
    });

    it('should parse your.name (dot syntax)', async () => {
      const result = await evaluateExpressionFromSource(
        'your.name',
        context as unknown as ExecutionContext
      );
      expect(result).toBe('you-name');
    });

    it('should be equivalent to you.name', async () => {
      const yourResult = await evaluateExpressionFromSource(
        'your.name',
        context as unknown as ExecutionContext
      );
      const youResult = await evaluateExpressionFromSource(
        'you.name',
        context as unknown as ExecutionContext
      );
      expect(yourResult).toBe(youResult);
    });
  });

  describe('optional chaining with possessive pronouns', () => {
    it('should support my?.value optional chaining', async () => {
      const context = {
        me: { value: 'exists' },
        you: null,
        it: null,
        result: null,
        locals: new Map(),
        globals: new Map(),
        parent: undefined,
        halted: false,
        returned: false,
        broke: false,
        continued: false,
        async: false,
      };
      const result = await evaluateExpressionFromSource(
        'my?.value',
        context as unknown as ExecutionContext
      );
      expect(result).toBe('exists');
    });

    it('should return undefined for my?.value when me is null', async () => {
      const context = {
        me: null,
        you: null,
        it: null,
        result: null,
        locals: new Map(),
        globals: new Map(),
        parent: undefined,
        halted: false,
        returned: false,
        broke: false,
        continued: false,
        async: false,
      };
      const result = await evaluateExpressionFromSource(
        'my?.value',
        context as unknown as ExecutionContext
      );
      expect(result).toBeUndefined();
    });
  });

  describe('method calls with possessive dot notation', () => {
    const mockElement = {
      getAttribute: (name: string) => (name === 'data-value' ? 'attr-value' : null),
      querySelector: (sel: string) => ({ textContent: `found: ${sel}` }),
    };

    const context = {
      me: mockElement,
      you: null,
      it: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      parent: undefined,
      halted: false,
      returned: false,
      broke: false,
      continued: false,
      async: false,
    };

    it('should support method calls: my.getAttribute("data-value")', async () => {
      const result = await evaluateExpressionFromSource(
        'my.getAttribute("data-value")',
        context as unknown as ExecutionContext
      );
      expect(result).toBe('attr-value');
    });
  });
});
