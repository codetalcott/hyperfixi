/**
 * TDD Tests for _hyperscript API Compatibility Layer
 * These tests ensure our evalHyperScript() function matches the original _hyperscript API
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { evalHyperScript } from './eval-hyperscript';

describe('evalHyperScript API Compatibility', () => {
  describe('Basic Expression Evaluation', () => {
    it('should evaluate simple arithmetic expressions', async () => {
      const result = await evalHyperScript('5 + 3');
      expect(result).toBe(8);
    });

    it('should evaluate string expressions', async () => {
      const result = await evalHyperScript('"hello world"');
      expect(result).toBe('hello world');
    });

    it('should evaluate boolean expressions', async () => {
      const result = await evalHyperScript('true and false');
      expect(result).toBe(false);
    });

    it('should evaluate comparison expressions', async () => {
      const result = await evalHyperScript('5 > 3');
      expect(result).toBe(true);
    });
  });

  describe('Context Handling', () => {
    it('should handle locals context like _hyperscript', async () => {
      const result = await evalHyperScript('foo', { locals: { foo: 'bar' } });
      expect(result).toBe('bar');
    });

    it('should handle me context like _hyperscript', async () => {
      const mockElement = { value: 42, tagName: 'INPUT' };
      const result = await evalHyperScript('my value', { me: mockElement });
      expect(result).toBe(42);
    });

    it('should handle result context like _hyperscript', async () => {
      const result = await evalHyperScript('it', { result: 'test result' });
      expect(result).toBe('test result');
    });

    it('should handle possessive expressions with locals', async () => {
      const result = await evalHyperScript("foo's bar", {
        locals: { foo: { bar: 'baz' } },
      });
      expect(result).toBe('baz');
    });

    it('shares globals across calls when no globals are provided', async () => {
      // Regression for item 5 in htmx-v4-reactive-streaming.md follow-ups.
      // evalHyperScript used to construct a fresh globals Map per call, so
      // cross-call $writes were invisible.
      const key = `__shared_test_${Date.now()}`;
      await evalHyperScript(`set $${key} to 42`);
      const result = await evalHyperScript(`$${key}`);
      expect(result).toBe(42);
    });

    it('respects an explicit globals Map (no implicit shared override)', async () => {
      const isolated = new Map<string, unknown>([['x', 99]]);
      const result = await evalHyperScript('$x', { globals: isolated });
      expect(result).toBe(99);
      // The isolated Map should remain detached from the shared singleton.
      expect(isolated.has('x')).toBe(true);
    });
  });

  describe('Original _hyperscript Test Cases', () => {
    // These are direct copies from _hyperscript/test/expressions/possessiveExpression.js

    it('can access basic properties', async () => {
      const result = await evalHyperScript("foo's foo", { locals: { foo: { foo: 'foo' } } });
      expect(result).toBe('foo');
    });

    it('is null safe', async () => {
      const result = await evalHyperScript("foo's foo");
      expect(result).toBeUndefined();
    });

    it('can access my properties', async () => {
      // Create a more complete mock element with DOM methods
      const mockElement = {
        foo: 'foo',
        hasAttribute: () => false,
        getAttribute: () => null,
        setAttribute: () => {},
        tagName: 'DIV',
      };
      const result = await evalHyperScript('my foo', { me: mockElement });
      expect(result).toBe('foo');
    });

    it.skip('my property is null safe', async () => {
      const result = await evalHyperScript('my foo');
      expect(result).toBeUndefined();
    });

    it('can access its properties', async () => {
      const result = await evalHyperScript('its foo', { result: { foo: 'foo' } });
      expect(result).toBe('foo');
    });

    it('its property is null safe', async () => {
      const result = await evalHyperScript('its foo');
      expect(result).toBeUndefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined expressions gracefully', async () => {
      const result = await evalHyperScript('nonexistentVar');
      expect(result).toBeUndefined();
    });

    it('should handle empty expressions', async () => {
      await expect(() => evalHyperScript('')).rejects.toThrow();
    });

    it('should handle complex nested property access', async () => {
      const result = await evalHyperScript("obj's nested's value", {
        locals: {
          obj: {
            nested: {
              value: 'deep',
            },
          },
        },
      });
      expect(result).toBe('deep');
    });
  });

  describe('Type Conversion Compatibility', () => {
    it('should handle as expressions like _hyperscript', async () => {
      const result = await evalHyperScript('"123" as Int');
      expect(result).toBe(123);
    });

    it('should handle mathematical operations', async () => {
      const result = await evalHyperScript('(5 + 3) * 2');
      expect(result).toBe(16);
    });
  });
});
